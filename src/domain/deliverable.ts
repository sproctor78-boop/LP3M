// =============================================================================
// Deliverable domain type
// =============================================================================
// A Deliverable is a formal programme output that requires acceptance sign-off.
// Distinct from WorkItems (tasks) — a Deliverable is the artefact produced,
// not the work to produce it. Acceptance is gated by AcceptanceCriteria.
// =============================================================================

export type DeliverableStatus = 'Planned' | 'InProduction' | 'InReview' | 'Accepted' | 'Rejected';

export interface AcceptanceCriterion {
  id: string;
  description: string;
  met: boolean;
  /** ISO timestamp when this criterion was marked met. Null if not met. */
  metAt: string | null;
  /** 'system' for now — will be a Person ID once auth is wired. */
  metBy: string | null;
}

export interface Deliverable {
  id: string;
  title: string;
  description: string;
  /** Internal person reference — Person ID or free-text name. */
  owner: string;
  /** ISO date 'YYYY-MM-DD' — when acceptance is due. */
  targetDate: string;
  status: DeliverableStatus;
  acceptanceCriteria: AcceptanceCriterion[];
  /** IDs of WorkItems that produce this deliverable. */
  linkedTaskIds: string[];
  notes: string;
  /** ISO timestamp when status moved to Accepted. */
  acceptedAt: string | null;
  acceptedBy: string | null;
  /** ISO timestamp when status moved to Rejected. */
  rejectedAt: string | null;
  rejectionReason: string | null;
  /** ISO timestamp of last PM review. */
  lastReviewedAt: string;
  /** ISO timestamp of record creation. */
  createdAt: string;
}

/** Proportion of acceptance criteria marked met, as a 0–100 integer. */
export function getCompletionPercentage(d: Deliverable): number {
  if (d.acceptanceCriteria.length === 0) return 0;
  const met = d.acceptanceCriteria.filter((c) => c.met).length;
  return Math.round((met / d.acceptanceCriteria.length) * 100);
}

/**
 * True only if there is at least one criterion AND every criterion is met.
 * An empty criteria list deliberately returns false — a PM must confirm
 * acceptance is meaningful before the gate can be cleared.
 */
export function canBeAccepted(d: Deliverable): boolean {
  return d.acceptanceCriteria.length > 0 && d.acceptanceCriteria.every((c) => c.met);
}

/** True if past target date and status is not Accepted. */
export function isOverdue(d: Deliverable, today: string): boolean {
  return d.targetDate < today && d.status !== 'Accepted';
}

/** Returns deliverables that are InReview with all criteria met. */
export function getDeliverablesReadyForAcceptance(deliverables: Deliverable[]): Deliverable[] {
  return deliverables.filter((d) => d.status === 'InReview' && canBeAccepted(d));
}
