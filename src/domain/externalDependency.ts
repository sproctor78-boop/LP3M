// =============================================================================
// External Dependencies domain types
// =============================================================================
// An external dependency is something outside the programme that the programme
// depends on (facility access, third-party certification, supplier delivery).
// Distinct from internal task-to-task dependencies, which live in the Gantt.
// =============================================================================

export type DepStatus = 'OnTrack' | 'AtRisk' | 'Late' | 'Received';

export interface ExternalDependency {
  id: string;
  title: string;
  description: string;
  /** The third party / organisation we depend on. Free text. */
  externalOwner: string;
  /** The person on our side who manages this dependency. Person ID or name. */
  internalOwner: string;
  /** ISO date 'YYYY-MM-DD' — when we need this by. */
  targetDate: string;
  status: DepStatus;
  /** IDs of project tasks that are blocked or constrained by this dependency. */
  linkedTaskIds: string[];
  notes: string;
  /** ISO timestamp of last review. */
  lastReviewedAt: string;
  /** ISO timestamp of record creation. */
  createdAt: string;
}

/**
 * Suggests a status based on target date alone.
 * Past target date and not Received → suggests 'Late'.
 * Within 14 days and not Received → suggests 'AtRisk'.
 * Otherwise suggests 'OnTrack' (or preserves 'Received').
 * The PM always owns the actual status — this only suggests.
 */
export function getSuggestedStatus(targetDate: string, today: string, currentStatus: DepStatus): DepStatus {
  if (currentStatus === 'Received') return 'Received';
  if (targetDate < today) return 'Late';
  const diff = Math.floor(
    (new Date(targetDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff <= 14) return 'AtRisk';
  return 'OnTrack';
}

/** True if past target date and status is not 'Received'. */
export function isOverdue(dep: ExternalDependency, today: string): boolean {
  return dep.targetDate < today && dep.status !== 'Received';
}
