// =============================================================================
// Schedule engine
// =============================================================================
// CPM-style forward pass and backward pass extended with parent-task semantics:
//
//   • A parent task participates in the dep graph using its own deps; its
//     endDate is rolled up from its children as they are scheduled.
//   • A child task inherits its parent's startDate as an earliest-start floor.
//   • A directly-changed task (during a drag) is not pulled back by its
//     predecessor — the user's drag wins.
//
// `recomputeSchedule` is the entry point: forward pass, then backward pass.
// It returns the same array it was given (mutated) for convenience, but always
// pass a deep copy in if the caller needs the original preserved.
// =============================================================================

import { ConstraintIssue, WorkItem } from '../domain/types';
import { addDays, diffDays } from './dateUtils';
import { topoSort } from './dependencyEngine';

interface InternalTask extends WorkItem {
  /** Set during a forecast: this task's user-chosen dates should not be moved. */
  _directlyChanged?: boolean;
  /** Backward-pass scratch fields. */
  _LS?: string;
  _LF?: string;
  /** Used during forward pass to seed parent rollup on first child. */
  _rollupInit?: boolean;
}

/**
 * Grow a parent's running rollup as children are scheduled. First child seeds
 * the window; later children extend it.
 */
function bumpParent(parent: InternalTask | undefined, child: InternalTask): void {
  if (!parent) return;
  if (!parent._rollupInit) {
    parent.startDate = child.startDate;
    parent.endDate = child.endDate;
    parent._rollupInit = true;
    return;
  }
  if (child.startDate < parent.startDate) parent.startDate = child.startDate;
  if (child.endDate > parent.endDate) parent.endDate = child.endDate;
}

export function forwardPass(tasks: WorkItem[]): void {
  const internal = tasks as InternalTask[];
  const map = new Map(internal.map((t) => [t.id, t]));
  const { sorted } = topoSort(internal);

  // Mark every parent as "rollup uninitialised" so its dates rebuild from children.
  internal.forEach((t) => {
    if (t.isParent) t._rollupInit = false;
  });

  (sorted as InternalTask[]).forEach((task) => {
    if (task.locked) {
      if (task.parentId) bumpParent(map.get(task.parentId), task);
      return;
    }
    if (task._directlyChanged) {
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
    for (const dep of task.dependencies) {
      const pred = map.get(dep.taskId);
      if (!pred) continue;
      const candidate =
        dep.type === 'start_to_start'
          ? addDays(pred.startDate, dep.lagDays)
          : addDays(pred.endDate, dep.lagDays + 1);
      if (earliest === null || candidate > earliest) earliest = candidate;
    }

    // Children are bounded below by their parent's startDate.
    if (task.parentId) {
      const parent = map.get(task.parentId);
      if (parent && (earliest === null || parent.startDate > earliest)) {
        earliest = parent.startDate;
      }
    }

    if (task.constraint?.type === 'start_no_earlier_than') {
      if (earliest === null || task.constraint.date > earliest) {
        earliest = task.constraint.date;
      }
    }

    if (task.isParent) {
      // Parent: take earliest from its own deps; endDate rebuilds from children.
      if (earliest !== null && earliest > task.startDate) task.startDate = earliest;
      task.endDate = task.startDate;
      task._rollupInit = false;
    } else {
      if (earliest !== null && earliest > task.startDate) {
        task.startDate = earliest;
        task.endDate = task.isMilestone
          ? earliest
          : addDays(earliest, Math.max(0, task.durationDays - 1));
      }
      if (task.parentId) bumpParent(map.get(task.parentId), task);
    }
  });

  // Final tidy: parents with children get a clean durationDays.
  internal.forEach((t) => {
    if (!t.isParent) return;
    delete t._rollupInit;
    if (t.startDate && t.endDate) {
      t.durationDays = Math.max(0, diffDays(t.startDate, t.endDate) + 1);
    }
  });
}

export function computeCriticalPathAndFloat(tasks: WorkItem[]): string {
  const internal = tasks as InternalTask[];
  const map = new Map(internal.map((t) => [t.id, t]));
  const { sorted } = topoSort(internal);
  const projectEnd = internal.reduce(
    (max, t) => (t.endDate > max ? t.endDate : max),
    '0000-00-00',
  );

  // Build successors (dependency edges only — parent edges are handled separately below).
  const succ = new Map<string, { id: string; type: string; lag: number }[]>(
    internal.map((t) => [t.id, []]),
  );
  internal.forEach((t) => {
    t.dependencies.forEach((dep) => {
      succ.get(dep.taskId)?.push({ id: t.id, type: dep.type, lag: dep.lagDays });
    });
  });

  // Backward pass
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const t = sorted[i] as InternalTask;
    const ss = succ.get(t.id) ?? [];
    let LF: string | null = null;
    if (ss.length === 0) {
      LF = projectEnd;
    } else {
      ss.forEach((s) => {
        const sTask = map.get(s.id);
        if (!sTask?._LS) return;
        const candidate =
          s.type === 'start_to_start'
            ? addDays(sTask._LS, -s.lag + Math.max(0, t.durationDays - 1))
            : addDays(sTask._LS, -s.lag - 1);
        if (LF === null || candidate < LF) LF = candidate;
      });
    }
    t._LF = LF ?? projectEnd;
    t._LS = addDays(t._LF, -Math.max(0, t.durationDays - 1));
    t.floatDays = diffDays(t.startDate, t._LS);
    t.criticalPath = t.floatDays <= 0;
  }

  // Children of critical parents are critical too — a delay in any child
  // shifts the parent's rolled-up endDate, which propagates downstream.
  internal.forEach((t) => {
    if (!t.parentId) return;
    const parent = map.get(t.parentId);
    if (!parent) return;
    if ((parent.floatDays ?? 0) < (t.floatDays ?? 0)) {
      t.floatDays = parent.floatDays;
      t.criticalPath = (t.floatDays ?? 0) <= 0;
    }
  });

  return projectEnd;
}

/**
 * Run forward pass + backward pass on the given task array (mutates).
 * Pass a deep copy in if you need the original preserved.
 */
export function recomputeSchedule(tasks: WorkItem[]): WorkItem[] {
  forwardPass(tasks);
  computeCriticalPathAndFloat(tasks);
  return tasks;
}

// =============================================================================
// Constraint detection
// =============================================================================

export function detectConstraintIssues(tasks: WorkItem[]): {
  breaches: ConstraintIssue[];
  risks: ConstraintIssue[];
} {
  const map = new Map(tasks.map((t) => [t.id, t]));
  const breaches: ConstraintIssue[] = [];
  const risks: ConstraintIssue[] = [];

  // 1) Standard constraints
  tasks.forEach((t) => {
    const c = t.constraint;
    if (!c) return;

    if (c.type === 'finish_no_later_than') {
      if (t.endDate > c.date && c.hard) {
        breaches.push({
          taskId: t.id,
          constraintType: c.type,
          constraintDate: c.date,
          forecastEndDate: t.endDate,
          breachDays: diffDays(c.date, t.endDate),
        });
      } else if (t.endDate <= c.date && diffDays(t.endDate, c.date) <= 2) {
        risks.push({
          taskId: t.id,
          constraintType: c.type,
          constraintDate: c.date,
          forecastEndDate: t.endDate,
        });
      } else if (t.endDate > c.date) {
        risks.push({
          taskId: t.id,
          constraintType: c.type,
          constraintDate: c.date,
          forecastEndDate: t.endDate,
        });
      }
    } else if (c.type === 'must_finish_on') {
      if (t.endDate !== c.date) {
        breaches.push({
          taskId: t.id,
          constraintType: c.type,
          constraintDate: c.date,
          forecastEndDate: t.endDate,
          breachDays: diffDays(c.date, t.endDate),
        });
      }
    } else if (c.type === 'must_start_on') {
      if (t.startDate !== c.date) {
        breaches.push({
          taskId: t.id,
          constraintType: c.type,
          constraintDate: c.date,
          forecastStartDate: t.startDate,
          breachDays: diffDays(c.date, t.startDate),
        });
      }
    } else if (c.type === 'start_no_earlier_than') {
      if (t.startDate < c.date) {
        breaches.push({
          taskId: t.id,
          constraintType: c.type,
          constraintDate: c.date,
          forecastStartDate: t.startDate,
          breachDays: diffDays(t.startDate, c.date),
        });
      }
    }
  });

  // 2) Dependency conflicts: a locked or hard-constrained task whose predecessor
  //    would now finish after its fixed start.
  tasks.forEach((t) => {
    const isFixed = t.locked || t.constraint?.hard;
    if (!isFixed) return;
    t.dependencies.forEach((dep) => {
      const pred = map.get(dep.taskId);
      if (!pred) return;
      const required =
        dep.type === 'start_to_start'
          ? addDays(pred.startDate, dep.lagDays)
          : addDays(pred.endDate, dep.lagDays + 1);
      if (required > t.startDate) {
        breaches.push({
          taskId: t.id,
          predecessorId: pred.id,
          constraintType: 'dependency_conflict',
          requiredStartDate: required,
          actualStartDate: t.startDate,
          breachDays: diffDays(t.startDate, required),
        });
      }
    });
  });

  return { breaches, risks };
}
