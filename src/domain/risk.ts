// =============================================================================
// RAID — Risk domain types
// =============================================================================

export type RiskStatus = 'Open' | 'Mitigated' | 'Closed' | 'PendingApproval';

export type RiskCategory =
  | 'Technical'
  | 'Resource'
  | 'Schedule'
  | 'Commercial'
  | 'Supply Chain'
  | 'Regulatory'
  | 'External';

export type RagColour = 'green' | 'amber' | 'red';

/** 1 = Very Low … 5 = Very High */
export type ImpactBand = 1 | 2 | 3 | 4 | 5;
export type ProbabilityBand = 1 | 2 | 3 | 4 | 5;

export interface RiskScore {
  /** Raw percentage, 0–100. */
  probabilityPct: number;
  /** Derived from probabilityPct via probabilityToBand(). */
  probabilityBand: ProbabilityBand;
  costImpact: ImpactBand;
  timeImpact: ImpactBand;
  /** probabilityBand × max(costImpact, timeImpact), range 1–25. */
  score: number;
  /** Derived from score via ragForScore(). */
  rag: RagColour;
}

export interface RiskScores {
  /** Before any controls or mitigations. */
  inherent: RiskScore;
  /** Current assessed score with controls applied. */
  residual: RiskScore;
  /** Desired end-state once all mitigations close. */
  target: RiskScore;
}

export interface ResponseItem {
  id: string;
  type: 'control' | 'mitigation';
  description: string;
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  /** Person ID (references AppDomainState.people) or free-text name. */
  owner: string;
  status: RiskStatus;
  scores: RiskScores;
  /**
   * Non-null only when status === 'PendingApproval'.
   * Populated by the approver via approveResidualScore; the previous residual
   * is shown alongside for reference in the approval UI.
   */
  proposedResidualScore: RiskScore | null;
  controls: ResponseItem[];
  mitigations: ResponseItem[];
  /** ISO date 'YYYY-MM-DD'. */
  raisedDate: string;
  /** ISO date 'YYYY-MM-DD'. */
  reviewDate: string;
  /** ISO timestamp — set on every mutation. */
  lastModifiedAt: string;
}
