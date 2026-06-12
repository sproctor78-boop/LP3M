// =============================================================================
// Forecast engine
// =============================================================================
// Apply a proposed change to a single task, propagate downstream, and diff
// against the original snapshot to produce a complete impact report.
// =============================================================================

import {
  ForecastResult,
  ImpactCategory,
  ProposedChange,
  TaskMovement,
  WorkItem,
} from '../domain/types';
import { addDays, diffDays } from './dateUtils';
import { computeLinkedTasks, deepCopyTasks } from './dependencyEngine';
import { ExternalDependency } from '../domain/externalDependency';
import { Deliverable } from '../domain/deliverable';
import {
  computeCriticalPathAndFloat,
  detectConstraintIssues,
  forwardPass,
  recomputeSchedule,
} from './scheduleEngine';

interface InternalTask extends WorkItem {
  _directlyChanged?: boolean;
}

export interface ForecastContext {
  externalDeps?: ExternalDependency[];
  deliverables?: Deliverable[];
  today?: string;
}

export function forecast(
  originalTasks: WorkItem[],
  change: ProposedChange,
  context?: ForecastContext,
): ForecastResult | null {
  const proposed = deepCopyTasks(originalTasks) as InternalTask[];
  const target = proposed.find((t) => t.id === change.taskId);
  if (!target) return null;

  // Capture pre-state
  const before = new Map(
    originalTasks.map((t) => [
      t.id,
      { startDate: t.startDate, endDate: t.endDate, criticalPath: !!t.criticalPath },
    ]),
  );

  const oldStartDate = target.startDate;
  const oldEndDate = target.endDate;

  target.startDate = change.newStartDate;
  target.endDate = change.newEndDate;
  if (!target.isMilestone && !target.isParent) {
    target.durationDays = diffDays(change.newStartDate, change.newEndDate) + 1;
  }
  target._directlyChanged = true;

  // Propagate — use full recompute when context is supplied so register-derived
  // constraints and warning flags are preserved in the preview.
  if (context?.externalDeps || context?.deliverables) {
    recomputeSchedule(proposed, context.externalDeps, context.deliverables, context.today);
  } else {
    forwardPass(proposed);
  }
  const newProjectFinish = computeCriticalPathAndFloat(proposed);
  const { breaches, risks } = detectConstraintIssues(proposed);
  const linkedSet = computeLinkedTasks(proposed, change.taskId);

  // Diff: which linked tasks actually moved?
  const affectedTasks: TaskMovement[] = [];
  const linkedButUnaffected: string[] = [];
  linkedSet.forEach((id) => {
    const t = proposed.find((x) => x.id === id);
    const orig = before.get(id);
    if (!t || !orig) return;
    if (t.startDate !== orig.startDate || t.endDate !== orig.endDate) {
      affectedTasks.push({
        taskId: id,
        oldStartDate: orig.startDate,
        oldEndDate: orig.endDate,
        newStartDate: t.startDate,
        newEndDate: t.endDate,
        shiftDays: diffDays(orig.endDate, t.endDate),
      });
    } else {
      linkedButUnaffected.push(id);
    }
  });

  const oldProjectFinish = originalTasks.reduce(
    (max, t) => (t.endDate > max ? t.endDate : max),
    '0000-00-00',
  );

  const criticalPathChanged = proposed.some(
    (t) => !!t.criticalPath !== !!before.get(t.id)?.criticalPath,
  );
  const changedNow = proposed.find((t) => t.id === change.taskId);
  const criticalPathAffected =
    !!changedNow?.criticalPath ||
    affectedTasks.some((a) => !!proposed.find((t) => t.id === a.taskId)?.criticalPath);

  const impactCategories: ImpactCategory[] = [];
  if (affectedTasks.length) impactCategories.push('dependency_impact');
  if (risks.length) impactCategories.push('constraint_risk');
  if (breaches.length) impactCategories.push('constraint_breach');
  if (criticalPathAffected) impactCategories.push('critical_path_impact');
  if (newProjectFinish !== oldProjectFinish) impactCategories.push('end_date_impact');
  if (impactCategories.length === 0) impactCategories.push('local_impact');

  // Strip internal flag before exposing
  proposed.forEach((t) => {
    delete (t as InternalTask)._directlyChanged;
  });

  return {
    changedTaskId: change.taskId,
    oldStartDate,
    oldEndDate,
    newStartDate: change.newStartDate,
    newEndDate: change.newEndDate,
    proposedTasks: proposed,
    linkedTasks: Array.from(linkedSet),
    affectedTasks,
    linkedButUnaffected,
    constraintBreaches: breaches,
    constraintRisks: risks,
    criticalPathAffected,
    criticalPathChanged,
    oldProjectFinish,
    newProjectFinish,
    forecastShiftDays: diffDays(oldProjectFinish, newProjectFinish),
    impactCategories,
  };
}

/**
 * Convenience: forecast moving a task by N days (positive = later).
 * Returns null if the task is locked or missing.
 */
export function moveTaskByDays(
  tasks: WorkItem[],
  taskId: string,
  days: number,
): ForecastResult | null {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.locked) return null;
  return forecast(tasks, {
    taskId,
    newStartDate: addDays(task.startDate, days),
    newEndDate: addDays(task.endDate, days),
  });
}
