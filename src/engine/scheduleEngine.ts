import { ConstraintIssue, WorkItem } from '../domain/types';
import { addDays, diffDays } from './dateUtils';

function isAfterOrUnset(candidate: string, current: string | null): boolean {
  return current === null || candidate > current;
}

import { topoSort } from './dependencyEngine';

interface InternalTask extends WorkItem {
  latestFinish?: string;
  latestStart?: string;
  rollupInitialised?: boolean;
  directlyChanged?: boolean;
}

function bumpParent(parent: InternalTask | undefined, child: InternalTask): void {
  if (!parent) return;
  if (!parent.rollupInitialised) {
    parent.startDate = child.startDate;
    parent.endDate = child.endDate;
    parent.rollupInitialised = true;
    return;
  }
  if (child.startDate < parent.startDate) parent.startDate = child.startDate;
  if (child.endDate > parent.endDate) parent.endDate = child.endDate;
}

export function forwardPass(tasks: WorkItem[]): WorkItem[] {
  const internal = tasks as InternalTask[];
  const map = new Map(internal.map((task) => [task.id, task]));
  const sorted = topoSort(internal) as InternalTask[];

  internal.forEach((task) => {
    if (task.isParent) task.rollupInitialised = false;
  });

  sorted.forEach((task) => {
    if (task.locked || task.directlyChanged) {
      if (task.parentId) bumpParent(map.get(task.parentId), task);
      return;
    }

    if (task.constraint?.type === 'must_start_on' && task.constraint.hard) {
      task.startDate = task.constraint.date;
      task.endDate = addDays(task.startDate, Math.max(0, task.durationDays - 1));
      if (task.parentId) bumpParent(map.get(task.parentId), task);
      return;
    }

    let earliest: string | null = null;
    task.dependencies.forEach((dependency) => {
      const predecessor = map.get(dependency.taskId);
      if (!predecessor) return;
      const candidate = dependency.type === 'start_to_start'
        ? addDays(predecessor.startDate, dependency.lagDays)
        : addDays(predecessor.endDate, dependency.lagDays + 1);
      if (isAfterOrUnset(candidate, earliest)) earliest = candidate;
    });

    if (task.parentId) {
      const parent = map.get(task.parentId);
      if (parent && isAfterOrUnset(parent.startDate, earliest)) earliest = parent.startDate;
    }

    if (task.constraint?.type === 'start_no_earlier_than' && isAfterOrUnset(task.constraint.date, earliest)) {
      earliest = task.constraint.date;
    }

    if (task.isParent) {
      if (earliest !== null && earliest > task.startDate) task.startDate = earliest;
      task.endDate = task.startDate;
      task.rollupInitialised = false;
    } else {
      if (earliest !== null && earliest > task.startDate) {
        task.startDate = earliest;
        task.endDate = task.isMilestone ? earliest : addDays(earliest, Math.max(0, task.durationDays - 1));
      }
      if (task.parentId) bumpParent(map.get(task.parentId), task);
    }
  });

  internal.forEach((task) => {
    if (task.isParent) {
      task.durationDays = Math.max(0, diffDays(task.startDate, task.endDate) + 1);
      delete task.rollupInitialised;
    }
  });

  return tasks;
}

export function computeCriticalPathAndFloat(tasks: WorkItem[]): string {
  const internal = tasks as InternalTask[];
  const map = new Map(internal.map((task) => [task.id, task]));
  const sorted = topoSort(internal) as InternalTask[];
  const projectEnd = internal.reduce((max, task) => (task.endDate > max ? task.endDate : max), '0000-00-00');
  const successors = new Map(internal.map((task) => [task.id, [] as { id: string; type: string; lag: number }[]]));

  internal.forEach((task) => {
    task.dependencies.forEach((dependency) => {
      successors.get(dependency.taskId)?.push({ id: task.id, type: dependency.type, lag: dependency.lagDays });
    });
  });

  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const task = sorted[index];
    const taskSuccessors = successors.get(task.id) ?? [];
    let latestFinish: string | null = null;

    if (taskSuccessors.length === 0) {
      latestFinish = projectEnd;
    } else {
      taskSuccessors.forEach((successor) => {
        const successorTask = map.get(successor.id);
        if (!successorTask?.latestStart) return;
        const candidate = successor.type === 'start_to_start'
          ? addDays(successorTask.latestStart, -successor.lag + Math.max(0, task.durationDays - 1))
          : addDays(successorTask.latestStart, -successor.lag - 1);
        if (!latestFinish || candidate < latestFinish) latestFinish = candidate;
      });
    }

    task.latestFinish = latestFinish ?? projectEnd;
    task.latestStart = addDays(task.latestFinish, -Math.max(0, task.durationDays - 1));
    task.floatDays = diffDays(task.startDate, task.latestStart);
    task.criticalPath = task.floatDays <= 0;
  }

  internal.forEach((task) => {
    if (!task.parentId) return;
    const parent = map.get(task.parentId);
    if (!parent) return;
    if ((parent.floatDays ?? 0) < (task.floatDays ?? 0)) {
      task.floatDays = parent.floatDays;
      task.criticalPath = (task.floatDays ?? 0) <= 0;
    }
  });

  return projectEnd;
}

export function detectConstraintIssues(tasks: WorkItem[]): { breaches: ConstraintIssue[]; risks: ConstraintIssue[] } {
  const map = new Map(tasks.map((task) => [task.id, task]));
  const breaches: ConstraintIssue[] = [];
  const risks: ConstraintIssue[] = [];

  tasks.forEach((task) => {
    const constraint = task.constraint;
    if (!constraint) return;

    if (constraint.type === 'finish_no_later_than') {
      if (task.endDate > constraint.date && constraint.hard) {
        breaches.push({ taskId: task.id, constraintType: constraint.type, constraintDate: constraint.date, breachDays: diffDays(constraint.date, task.endDate) });
      } else if (diffDays(task.endDate, constraint.date) <= 2) {
        risks.push({ taskId: task.id, constraintType: constraint.type, constraintDate: constraint.date });
      }
    }

    if (constraint.type === 'must_finish_on' && task.endDate !== constraint.date) {
      breaches.push({ taskId: task.id, constraintType: constraint.type, constraintDate: constraint.date, breachDays: diffDays(constraint.date, task.endDate) });
    }

    if (constraint.type === 'must_start_on' && task.startDate !== constraint.date) {
      breaches.push({ taskId: task.id, constraintType: constraint.type, constraintDate: constraint.date, breachDays: diffDays(constraint.date, task.startDate) });
    }
  });

  tasks.forEach((task) => {
    const fixed = task.locked || task.constraint?.hard;
    if (!fixed) return;
    task.dependencies.forEach((dependency) => {
      const predecessor = map.get(dependency.taskId);
      if (!predecessor) return;
      const requiredStartDate = dependency.type === 'start_to_start'
        ? addDays(predecessor.startDate, dependency.lagDays)
        : addDays(predecessor.endDate, dependency.lagDays + 1);
      if (requiredStartDate > task.startDate) {
        breaches.push({
          taskId: task.id,
          predecessorId: predecessor.id,
          constraintType: 'dependency_conflict',
          requiredStartDate,
          actualStartDate: task.startDate,
          breachDays: diffDays(task.startDate, requiredStartDate)
        });
      }
    });
  });

  return { breaches, risks };
}

export function recomputeSchedule(tasks: WorkItem[]): WorkItem[] {
  forwardPass(tasks);
  computeCriticalPathAndFloat(tasks);
  return tasks;
}
