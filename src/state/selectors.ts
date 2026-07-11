// =============================================================================
// Surface selectors — pure derivation, no caching (memoize with useMemo at
// call sites). No React/DOM imports; safe for test and engine use.
// =============================================================================

import { AppDomainState, Deliverable, ExternalDependency } from '../domain/types';
import { DepStatus } from '../domain/externalDependency';
import { RagColour, Risk } from '../domain/risk';

// ── Risk badge ────────────────────────────────────────────────────────────────

export interface RiskBadge {
  score: number;
  band: RagColour;
  riskIds: string[];
}

/**
 * Highest residual score among open/linked risks for the given task.
 * Excludes risks whose status is 'Closed'. Returns null when no risks link to
 * this task, or all linked risks are closed.
 */
export function getTaskRiskBadge(taskId: string, domain: AppDomainState): RiskBadge | null {
  const linked = domain.risks.filter(
    (r) => (r.linkedTaskIds ?? []).includes(taskId) && r.status !== 'Closed',
  );
  if (linked.length === 0) return null;
  const highest = linked.reduce((best, r) =>
    r.scores.residual.score > best.scores.residual.score ? r : best,
  );
  return {
    score: highest.scores.residual.score,
    band: highest.scores.residual.rag,
    riskIds: linked.map((r) => r.id),
  };
}

// ── Dep badge ─────────────────────────────────────────────────────────────────

// Severity order worst → best: Late > AtRisk > OnTrack > Received
const DEP_SEVERITY: DepStatus[] = ['Late', 'AtRisk', 'OnTrack', 'Received'];

export interface DepBadge {
  worstStatus: DepStatus;
  depIds: string[];
}

/**
 * Linked external dependencies with the worst status (Late worst, Received
 * best). Returns null if none link to this task.
 */
export function getTaskDepBadge(taskId: string, domain: AppDomainState): DepBadge | null {
  const linked = domain.externalDependencies.filter((d) => (d.linkedTaskIds ?? []).includes(taskId));
  if (linked.length === 0) return null;
  let worstIdx = DEP_SEVERITY.length - 1;
  for (const d of linked) {
    const idx = DEP_SEVERITY.indexOf(d.status);
    if (idx < worstIdx) worstIdx = idx;
  }
  return {
    worstStatus: DEP_SEVERITY[worstIdx],
    depIds: linked.map((d) => d.id),
  };
}

// ── Gate badge ────────────────────────────────────────────────────────────────

export interface GateBadge {
  deliverableIds: string[];
  criteriaMet: number;
  criteriaTotal: number;
}

/**
 * Deliverables linked to this task where the task is a milestone.
 * Returns null when the task is not a milestone or no deliverables link to it.
 */
export function getTaskGateBadge(taskId: string, domain: AppDomainState): GateBadge | null {
  const task = domain.tasks.find((t) => t.id === taskId);
  if (!task?.isMilestone) return null;
  const linked = domain.deliverables.filter((d) => (d.linkedTaskIds ?? []).includes(taskId));
  if (linked.length === 0) return null;
  let criteriaMet = 0;
  let criteriaTotal = 0;
  for (const d of linked) {
    criteriaMet += d.acceptanceCriteria.filter((c) => c.met).length;
    criteriaTotal += d.acceptanceCriteria.length;
  }
  return {
    deliverableIds: linked.map((d) => d.id),
    criteriaMet,
    criteriaTotal,
  };
}

// ── Combined badge set (convenience) ─────────────────────────────────────────

export interface TaskBadges {
  risk: RiskBadge | null;
  dep: DepBadge | null;
  gate: GateBadge | null;
}

export function getTaskBadges(taskId: string, domain: AppDomainState): TaskBadges {
  return {
    risk: getTaskRiskBadge(taskId, domain),
    dep: getTaskDepBadge(taskId, domain),
    gate: getTaskGateBadge(taskId, domain),
  };
}

// ── Register cross-links (Risk ↔ Deliverable / ExternalDependency) ────────────

/** Non-closed risks whose linkedDeliverableIds includes this deliverable. */
export function getDeliverableLinkedRisks(deliverableId: string, domain: AppDomainState): Risk[] {
  return domain.risks.filter(
    (r) => (r.linkedDeliverableIds ?? []).includes(deliverableId) && r.status !== 'Closed',
  );
}

/** Non-closed risks whose linkedDependencyIds includes this external dependency. */
export function getDependencyLinkedRisks(depId: string, domain: AppDomainState): Risk[] {
  return domain.risks.filter(
    (r) => (r.linkedDependencyIds ?? []).includes(depId) && r.status !== 'Closed',
  );
}

/** Deliverables resolved from a risk's linkedDeliverableIds. Dangling ids are dropped. */
export function getRiskLinkedDeliverables(riskId: string, domain: AppDomainState): Deliverable[] {
  const risk = domain.risks.find((r) => r.id === riskId);
  if (!risk) return [];
  return risk.linkedDeliverableIds
    .map((id) => domain.deliverables.find((d) => d.id === id))
    .filter((d): d is Deliverable => d !== undefined);
}

/** External dependencies resolved from a risk's linkedDependencyIds. Dangling ids are dropped. */
export function getRiskLinkedDependencies(riskId: string, domain: AppDomainState): ExternalDependency[] {
  const risk = domain.risks.find((r) => r.id === riskId);
  if (!risk) return [];
  return risk.linkedDependencyIds
    .map((id) => domain.externalDependencies.find((d) => d.id === id))
    .filter((d): d is ExternalDependency => d !== undefined);
}
