import { ForecastResult, WorkItem } from '../domain/types';
import { addDays, diffDays } from './dateUtils';
import { computeLinkedTasks, deepCopyTasks } from './dependencyEngine';
import { detectConstraintIssues, recomputeSchedule } from './scheduleEngine';

interface InternalTask extends WorkItem {
  directlyChanged?: boolean;
}

export function forecast(tasks: WorkItem[], change: { taskId: string; newStartDate: string; newEndDate: string }): ForecastResult | null {
  const proposedTasks = deepCopyTasks(tasks) as InternalTask[];
  const target = proposedTasks.find((task) => task.id === change.taskId);
  if (!target) return null;

  const original = new Map(tasks.map((task) => [task.id, { startDate: task.startDate, endDate: task.endDate, criticalPath: !!task.criticalPath }]));
  const oldStartDate = target.startDate;
  const oldEndDate = target.endDate;

  target.startDate = change.newStartDate;
  target.endDate = change.newEndDate;
  if (!target.isMilestone && !target.isParent) {
    target.durationDays = Math.max(1, diffDays(change.newStartDate, change.newEndDate) + 1);
  }
  target.directlyChanged = true;

  recomputeSchedule(proposedTasks);
  proposedTasks.forEach((task) => delete task.directlyChanged);

  const { breaches, risks } = detectConstraintIssues(proposedTasks);
  const linkedSet = computeLinkedTasks(proposedTasks, change.taskId);
  const affectedTasks = [...linkedSet]
    .map((id) => {
      const proposed = proposedTasks.find((task) => task.id === id);
      const before = original.get(id);
      if (!proposed || !before) return null;
      if (proposed.startDate === before.startDate && proposed.endDate === before.endDate) return null;
      return {
        taskId: id,
        oldStartDate: before.startDate,
        oldEndDate: before.endDate,
        newStartDate: proposed.startDate,
        newEndDate: proposed.endDate,
        shiftDays: diffDays(before.endDate, proposed.endDate)
      };
    })
    .filter((movement): movement is NonNullable<typeof movement> => movement !== null);

  const linkedButUnaffected = [...linkedSet].filter((id) => !affectedTasks.some((movement) => movement.taskId === id));
  const oldProjectFinish = tasks.reduce((max, task) => (task.endDate > max ? task.endDate : max), '0000-00-00');
  const newProjectFinish = proposedTasks.reduce((max, task) => (task.endDate > max ? task.endDate : max), '0000-00-00');
  const criticalPathChanged = proposedTasks.some((task) => original.get(task.id)?.criticalPath !== !!task.criticalPath);
  const criticalPathAffected = !!proposedTasks.find((task) => task.id === change.taskId)?.criticalPath || affectedTasks.some((movement) => proposedTasks.find((task) => task.id === movement.taskId)?.criticalPath);

  const categories: string[] = [];
  if (affectedTasks.length > 0) categories.push('dependency_impact');
  if (breaches.length > 0) categories.push('constraint_breach');
  if (risks.length > 0) categories.push('constraint_risk');
  if (criticalPathAffected) categories.push('critical_path_impact');
  if (oldProjectFinish !== newProjectFinish) categories.push('end_date_impact');
  if (categories.length === 0) categories.push('local_impact');

  return {
    changedTaskId: change.taskId,
    oldStartDate,
    oldEndDate,
    newStartDate: change.newStartDate,
    newEndDate: change.newEndDate,
    proposedTasks,
    affectedTasks,
    linkedTasks: [...linkedSet],
    linkedButUnaffected,
    constraintBreaches: breaches,
    constraintRisks: risks,
    criticalPathAffected,
    criticalPathChanged,
    oldProjectFinish,
    newProjectFinish,
    forecastShiftDays: diffDays(oldProjectFinish, newProjectFinish),
    impactCategories: categories
  };
}

export function moveTaskByDays(tasks: WorkItem[], taskId: string, days: number): ForecastResult | null {
  const task = tasks.find((candidate) => candidate.id === taskId);
  if (!task || task.locked) return null;
  return forecast(tasks, {
    taskId,
    newStartDate: addDays(task.startDate, days),
    newEndDate: addDays(task.endDate, days)
  });
}
