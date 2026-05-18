// =============================================================================
// RAID — Pure scoring helpers
// =============================================================================
// No React, no DOM, no browser APIs. Safe to import in tests and engine code.
// =============================================================================

import { ImpactBand, ProbabilityBand, RagColour, RiskScore } from './risk';

/**
 * Maps a raw probability percentage to a 1–5 band using MOD / Orange Book
 * symmetric quintiles:
 *   1 Very Low  0–10%
 *   2 Low      11–30%
 *   3 Medium   31–50%
 *   4 High     51–70%
 *   5 Very High 71–100%
 */
export function probabilityToBand(pct: number): ProbabilityBand {
  if (pct <= 10) return 1;
  if (pct <= 30) return 2;
  if (pct <= 50) return 3;
  if (pct <= 70) return 4;
  return 5;
}

/**
 * Score = probabilityBand × max(costImpact, timeImpact).
 * Range 1–25.
 */
export function calcScore(
  probabilityBand: ProbabilityBand,
  costImpact: ImpactBand,
  timeImpact: ImpactBand,
): number {
  return probabilityBand * Math.max(costImpact, timeImpact);
}

/**
 * RAG classification:
 *   Green  1–5   acceptable, monitor
 *   Amber  6–12  tolerable, active management
 *   Red   13–25  intolerable, escalate
 */
export function ragForScore(score: number): RagColour {
  if (score <= 5) return 'green';
  if (score <= 12) return 'amber';
  return 'red';
}

/** Convenience: build a complete RiskScore from raw inputs. */
export function buildRiskScore(
  probabilityPct: number,
  costImpact: ImpactBand,
  timeImpact: ImpactBand,
): RiskScore {
  const probabilityBand = probabilityToBand(probabilityPct);
  const score = calcScore(probabilityBand, costImpact, timeImpact);
  return { probabilityPct, probabilityBand, costImpact, timeImpact, score, rag: ragForScore(score) };
}
