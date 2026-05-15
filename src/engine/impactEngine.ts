// =============================================================================
// Impact engine
// =============================================================================
// Turns a ForecastResult into human-readable narrative and structured rows for
// the impact panel and impact strip. Kept separate from the forecast engine so
// the wording can evolve without disturbing the scheduling logic.
// =============================================================================

import { ForecastResult, WorkItem } from '../domain/types';
import { diffDays, formatNice } from './dateUtils';

export type ImpactRowKind = 'chain' | 'breach' | 'risk' | 'cp' | 'finish' | 'check';

export interface ImpactRow {
  kind: ImpactRowKind;
  severity: 'neutral' | 'critical' | 'breach' | 'risk';
  text: string;
}

function describeBreach(
  breach: ForecastResult['constraintBreaches'][number],
  proposed: WorkItem[],
): string {
  const target = proposed.find((t) => t.id === breach.taskId);
  if (!target) return 'Constraint breach.';
  const days = Math.abs(breach.breachDays ?? 0);
  const dayText = `${days} day${days === 1 ? '' : 's'}`;

  if (breach.constraintType === 'dependency_conflict') {
    const pred = proposed.find((t) => t.id === breach.predecessorId);
    return `Dependency conflict: ${pred?.title ?? 'predecessor'} now finishes ${dayText} after the fixed date for ${target.title}.`;
  }
  if (breach.constraintType === 'must_finish_on') {
    return `Must-finish-on constraint breached on ${target.title} by ${dayText}.`;
  }
  if (breach.constraintType === 'must_start_on') {
    return `Must-start-on constraint breached on ${target.title}.`;
  }
  if (breach.constraintType === 'finish_no_later_than') {
    return `Finish-no-later-than deadline breached on ${target.title}.`;
  }
  if (breach.constraintType === 'start_no_earlier_than') {
    return `Start-no-earlier-than breached on ${target.title}.`;
  }
  return `Constraint breach on ${target.title}.`;
}

export function buildImpactRows(result: ForecastResult, _tasks: WorkItem[]): ImpactRow[] {
  const rows: ImpactRow[] = [];
  const linkedCount = result.linkedTasks.length;
  const movedCount = result.affectedTasks.length;

  if (linkedCount === 0) {
    rows.push({ kind: 'check', severity: 'neutral', text: 'No linked tasks.' });
  } else if (movedCount === 0) {
    rows.push({
      kind: 'check',
      severity: 'neutral',
      text: `${linkedCount} linked task${linkedCount === 1 ? '' : 's'} checked. No downstream movement required.`,
    });
  } else if (movedCount < linkedCount) {
    rows.push({
      kind: 'chain',
      severity: 'neutral',
      text: `${movedCount} of ${linkedCount} linked task${linkedCount === 1 ? '' : 's'} forecast to move.`,
    });
  } else {
    rows.push({
      kind: 'chain',
      severity: 'neutral',
      text: `${movedCount} downstream task${movedCount === 1 ? '' : 's'} forecast to move.`,
    });
  }

  result.constraintBreaches.forEach((breach) => {
    rows.push({ kind: 'breach', severity: 'breach', text: describeBreach(breach, result.proposedTasks) });
  });

  result.constraintRisks.forEach((risk) => {
    const target = result.proposedTasks.find((t) => t.id === risk.taskId);
    rows.push({
      kind: 'risk',
      severity: 'risk',
      text: `Constraint risk on ${target?.title ?? risk.taskId} — close to ${risk.constraintType.replace(/_/g, ' ')}.`,
    });
  });

  if (result.criticalPathAffected) {
    rows.push({ kind: 'cp', severity: 'critical', text: 'Critical path is affected.' });
  } else {
    rows.push({ kind: 'cp', severity: 'neutral', text: 'Critical path is not affected.' });
  }
  if (result.criticalPathChanged) {
    rows.push({
      kind: 'cp',
      severity: 'critical',
      text: 'The critical path has shifted to a different chain.',
    });
  }

  const shift = result.forecastShiftDays;
  if (shift === 0) {
    rows.push({
      kind: 'finish',
      severity: 'neutral',
      text: `Forecast finish unchanged (${formatNice(result.newProjectFinish)}).`,
    });
  } else {
    const days = Math.abs(shift);
    const direction = shift > 0 ? 'later' : 'earlier';
    rows.push({
      kind: 'finish',
      severity: shift > 0 ? 'breach' : 'neutral',
      text: `Forecast finish moves from ${formatNice(result.oldProjectFinish)} to ${formatNice(result.newProjectFinish)} (${days} day${days === 1 ? '' : 's'} ${direction}).`,
    });
  }

  return rows;
}

/** One-line summary used by the impact strip at the bottom of the timeline. */
export function buildImpactSummary(result: ForecastResult, tasks: WorkItem[]): string {
  const task = tasks.find((t) => t.id === result.changedTaskId);
  const shift = result.forecastShiftDays;
  const movedCount = result.affectedTasks.length;
  const breaches = result.constraintBreaches.length;

  const parts: string[] = [];
  if (task) {
    const taskShiftDays = diffDays(result.oldEndDate, result.newEndDate);
    const days = Math.abs(taskShiftDays);
    if (days > 0) {
      const direction = taskShiftDays > 0 ? 'later' : 'earlier';
      parts.push(`${task.title} moved ${days} day${days === 1 ? '' : 's'} ${direction}.`);
    } else {
      parts.push(`${task.title} updated.`);
    }
  }

  if (movedCount === 0 && result.linkedTasks.length > 0) {
    parts.push(`${result.linkedTasks.length} linked task${result.linkedTasks.length === 1 ? '' : 's'} checked — no downstream movement.`);
  } else if (movedCount > 0) {
    parts.push(`${movedCount} downstream task${movedCount === 1 ? '' : 's'} forecast to move.`);
  }

  if (breaches > 0) {
    parts.push(`${breaches} constraint breach${breaches === 1 ? '' : 'es'}.`);
  }

  if (shift === 0) {
    parts.push('Forecast finish unchanged.');
  } else {
    const days = Math.abs(shift);
    const direction = shift > 0 ? 'later' : 'earlier';
    parts.push(`Forecast finish ${days} day${days === 1 ? '' : 's'} ${direction}.`);
  }

  return parts.join(' ');
}
