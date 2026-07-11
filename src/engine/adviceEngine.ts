// =============================================================================
// Advice engine — derives actionable suggestions from domain state.
// Pure TypeScript: no React, no DOM, no Date construction (today is a param).
// =============================================================================

import { AppDomainState, WorkItem } from '../domain/types';
import { AppAction } from '../state/appState';

export type SuggestionKind = 'missing-milestone' | 'breach-from-birth' | 'stale-risk' | 'floating-milestone' | 'received-constraining' | 'milestone-drift';

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  title: string;
  detail: string;
  taskId?: string;
  entityId?: string;
  actions: AppAction[];
}

// Severity order for sorting (lower = higher priority)
const KIND_SEVERITY: Record<SuggestionKind, number> = {
  'breach-from-birth':      10,
  'stale-risk':             20,
  'floating-milestone':     30,
  'milestone-drift':        35,
  'missing-milestone':      40,
  'received-constraining':  50,
};

/**
 * Derives a deterministic short ID by hashing a seed string.
 * Uses a simple djb2-style numeric hash, then base-36 encodes it.
 * This never calls Date or crypto — fully deterministic given the same input.
 */
function deterministicId(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) ^ seed.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h.toString(36).toUpperCase().padStart(7, '0').slice(0, 7);
}

export function deriveSuggestions(domain: AppDomainState, today: string): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // ── Rule 1: Deliverable has no acceptance milestone ───────────────────────
  for (const del of domain.deliverables) {
    if (del.status === 'Accepted') continue;
    const linkedTasks = del.linkedTaskIds
      .map((id) => domain.tasks.find((t) => t.id === id))
      .filter((t): t is WorkItem => t !== undefined);
    const hasMilestone = linkedTasks.some((t) => t.isMilestone);
    if (hasMilestone) continue;

    const milestoneId = `MA${deterministicId(`accept-${del.id}`)}`;
    const milestoneTitle = `Accept: ${del.title}`;
    const milestoneDate = del.targetDate;

    // Build the WorkItem for the milestone
    const firstTaskSwimlane = linkedTasks[0]?.swimlane ?? domain.swimlanes[0]?.key ?? 'default';
    const firstTaskStatus = linkedTasks[0]?.status ?? domain.columns[0]?.key ?? 'todo';
    const milestone: WorkItem = {
      id: milestoneId,
      title: milestoneTitle,
      description: '',
      status: firstTaskStatus,
      startDate: milestoneDate,
      endDate: milestoneDate,
      durationDays: 0,
      isMilestone: true,
      locked: false,
      swimlane: firstTaskSwimlane,
      percentComplete: 0,
      parentId: null,
      isParent: false,
      color: null,
      assignees: [],
      dependencies: linkedTasks
        .filter((t) => !t.isMilestone)
        .map((t) => ({ taskId: t.id, type: 'finish_to_start' as const, lagDays: 0 })),
      constraint: null,
    };

    const batchActions: AppAction[] = [
      { type: 'createTask', task: milestone },
      { type: 'updateDeliverable', deliverableId: del.id, patch: { linkedTaskIds: [...del.linkedTaskIds, milestoneId] } },
    ];

    suggestions.push({
      id: `missing-milestone-${del.id}`,
      kind: 'missing-milestone',
      title: `No acceptance milestone for "${del.title}"`,
      detail: `Create milestone "${milestoneTitle}" on ${milestoneDate}`,
      entityId: del.id,
      actions: batchActions,
    });
  }

  // ── Rule 2: Breach from birth — ext dep target >= linked task start ───────
  for (const dep of domain.externalDependencies) {
    if (dep.status === 'Received') continue;
    for (const taskId of dep.linkedTaskIds) {
      const task = domain.tasks.find((t) => t.id === taskId);
      if (!task) continue;
      // dep.targetDate on or after task.startDate means it could breach
      if (dep.targetDate >= task.startDate) {
        suggestions.push({
          id: `breach-from-birth-${dep.id}-${taskId}`,
          kind: 'breach-from-birth',
          title: `Dependency "${dep.title}" arrives after task starts`,
          detail: `${dep.title} due ${dep.targetDate}, task "${task.title}" starts ${task.startDate}`,
          taskId,
          entityId: dep.id,
          actions: [],
        });
      }
    }
  }

  // ── Rule 3: Stale risk — open risk with review date on/before today ───────
  for (const risk of domain.risks) {
    if (risk.status === 'Closed') continue;
    if (risk.reviewDate > today) continue;

    // Bump review date: use existing interval heuristic or +28 days
    const newDate = addDays(today, 28);

    suggestions.push({
      id: `stale-risk-${risk.id}`,
      kind: 'stale-risk',
      title: `Risk review overdue: "${risk.title}"`,
      detail: `Review was due ${risk.reviewDate}. Propose new date: ${newDate}`,
      entityId: risk.id,
      taskId: (risk.linkedTaskIds ?? [])[0],
      actions: [{ type: 'updateRisk', riskId: risk.id, patch: { reviewDate: newDate } }],
    });
  }

  // ── Rule 4: Floating milestone — milestone with no predecessor deps ────────
  for (const task of domain.tasks) {
    if (!task.isMilestone) continue;
    if (task.dependencies.length === 0) {
      suggestions.push({
        id: `floating-milestone-${task.id}`,
        kind: 'floating-milestone',
        title: `Floating milestone: "${task.title}"`,
        detail: 'This milestone has no predecessor dependencies',
        taskId: task.id,
        actions: [],
      });
    }
  }

  // ── Rule 5: Received, still constraining ─────────────────────────────────
  for (const dep of domain.externalDependencies) {
    if (dep.status !== 'Received') continue;
    for (const taskId of dep.linkedTaskIds) {
      const task = domain.tasks.find((t) => t.id === taskId);
      if (!task) continue;
      // Check if task sits exactly on dep's constraint date with no other binding predecessor
      const depConstraintDate = dep.targetDate;
      const taskIsOnConstraint = task.startDate === depConstraintDate;
      if (!taskIsOnConstraint) continue;
      // Check that the task has no finish-to-start predecessor that would explain the date
      const hasBindingPredecessor = task.dependencies.some((d) => {
        const pred = domain.tasks.find((t) => t.id === d.taskId);
        if (!pred) return false;
        return pred.endDate >= task.startDate;
      });
      if (!hasBindingPredecessor) {
        suggestions.push({
          id: `received-constraining-${dep.id}-${taskId}`,
          kind: 'received-constraining',
          title: `Received dependency may still be constraining "${task.title}"`,
          detail: `"${dep.title}" was received — task start may now have slack`,
          taskId,
          entityId: dep.id,
          actions: [],
        });
      }
    }
  }

  // ── Rule 6: Acceptance-milestone drift ─────────────────────────────────
  for (const del of domain.deliverables) {
    if (del.status === 'Accepted') continue;
    for (const taskId of del.linkedTaskIds) {
      const task = domain.tasks.find((t) => t.id === taskId);
      if (!task || !task.isMilestone) continue;
      if (task.startDate === del.targetDate) continue;

      suggestions.push({
        id: `milestone-drift-${del.id}-${task.id}`,
        kind: 'milestone-drift',
        title: `Acceptance milestone drifted for "${del.title}"`,
        detail: `Milestone "${task.title}" is dated ${task.startDate}; deliverable target is ${del.targetDate}`,
        taskId: task.id,
        entityId: del.id,
        actions: [
          {
            type: 'updateTask',
            taskId: task.id,
            patch: { startDate: del.targetDate, endDate: del.targetDate },
          },
        ],
      });
    }
  }

  // Sort by kind severity, then by id for stability within tier
  return suggestions.sort((a, b) => {
    const ds = KIND_SEVERITY[a.kind] - KIND_SEVERITY[b.kind];
    if (ds !== 0) return ds;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Add `days` calendar days to an ISO date string, without constructing Date. */
function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  // Days in each month (non-leap year). We'll adjust for leap years inline.
  let yr = y;
  let mo = m;
  let dy = d + days;
  while (dy > daysInMonth(yr, mo)) {
    dy -= daysInMonth(yr, mo);
    mo++;
    if (mo > 12) { mo = 1; yr++; }
  }
  while (dy < 1) {
    mo--;
    if (mo < 1) { mo = 12; yr--; }
    dy += daysInMonth(yr, mo);
  }
  return `${yr}-${String(mo).padStart(2, '0')}-${String(dy).padStart(2, '0')}`;
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number): number {
  const days = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (m === 2 && isLeapYear(y)) return 29;
  return days[m];
}
