// =============================================================================
// RAID — Risk domain types
// =============================================================================

export type Proximity = 'Imminent' | 'NearTerm' | 'MediumTerm' | 'LongTerm';

export const PROXIMITY_BANDS: Record<Proximity, { label: string; months: string }> = {
  Imminent:   { label: 'Imminent',    months: '≤ 1 month'   },
  NearTerm:   { label: 'Near-term',   months: '1–3 months'  },
  MediumTerm: { label: 'Medium-term', months: '3–12 months' },
  LongTerm:   { label: 'Long-term',   months: '> 12 months' },
};

/** Derives proximity from a review/trigger date relative to today.
 *  ≤ 30 days → Imminent · 31–91 → NearTerm · 92–365 → MediumTerm · > 365 → LongTerm.
 *  Past dates (negative diff) are treated as Imminent. */
export function getProximityFromDate(date: Date, today: Date): Proximity {
  const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) return 'Imminent';
  if (diffDays <= 91) return 'NearTerm';
  if (diffDays <= 365) return 'MediumTerm';
  return 'LongTerm';
}

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
  /** How soon the risk is likely to materialise, derived from reviewDate. */
  proximity: Proximity;
}
