import { describe, expect, it } from 'vitest';
import {
  buildRiskScore,
  calcScore,
  probabilityToBand,
  ragForScore,
} from '../domain/raidScoring';

describe('probabilityToBand', () => {
  it.each([
    // Band 1 Very Low: 0–10%
    [0, 1],
    [10, 1],
    // Band 2 Low: 11–30%
    [11, 2],
    [30, 2],
    // Band 3 Medium: 31–50%
    [31, 3],
    [50, 3],
    // Band 4 High: 51–70%
    [51, 4],
    [70, 4],
    // Band 5 Very High: 71–100%
    [71, 5],
    [100, 5],
  ] as [number, number][])('%i%% → band %i', (pct, expected) => {
    expect(probabilityToBand(pct)).toBe(expected);
  });

  it('treats boundary values as the lower band', () => {
    expect(probabilityToBand(10)).toBe(1);
    expect(probabilityToBand(30)).toBe(2);
    expect(probabilityToBand(50)).toBe(3);
    expect(probabilityToBand(70)).toBe(4);
  });
});

describe('calcScore', () => {
  it('uses max of cost and time impact', () => {
    expect(calcScore(3, 4, 2)).toBe(12); // 3 × max(4, 2)
    expect(calcScore(3, 2, 4)).toBe(12); // 3 × max(2, 4)
  });

  it('handles equal impacts', () => {
    expect(calcScore(2, 3, 3)).toBe(6);
  });

  it('minimum score is 1', () => {
    expect(calcScore(1, 1, 1)).toBe(1);
  });

  it('maximum score is 25', () => {
    expect(calcScore(5, 5, 5)).toBe(25);
  });

  it('example from seed data: R03 inherent (band 4, cost 4, time 4)', () => {
    expect(calcScore(4, 4, 4)).toBe(16);
  });
});

describe('ragForScore', () => {
  it.each([
    // Green: 1–5
    [1, 'green'],
    [5, 'green'],
    // Amber: 6–12
    [6, 'amber'],
    [12, 'amber'],
    // Red: 13–25
    [13, 'red'],
    [25, 'red'],
  ] as [number, string][])('score %i → %s', (score, expected) => {
    expect(ragForScore(score)).toBe(expected);
  });

  it('boundary between green and amber is at 6', () => {
    expect(ragForScore(5)).toBe('green');
    expect(ragForScore(6)).toBe('amber');
  });

  it('boundary between amber and red is at 13', () => {
    expect(ragForScore(12)).toBe('amber');
    expect(ragForScore(13)).toBe('red');
  });
});

describe('buildRiskScore', () => {
  it('derives all fields from raw inputs', () => {
    const result = buildRiskScore(65, 4, 4);
    expect(result.probabilityPct).toBe(65);
    expect(result.probabilityBand).toBe(4); // 65% → High (51–70%)
    expect(result.costImpact).toBe(4);
    expect(result.timeImpact).toBe(4);
    expect(result.score).toBe(16); // 4 × max(4, 4)
    expect(result.rag).toBe('red'); // 16 ≥ 13
  });

  it('green result for very low probability and negligible impact', () => {
    const result = buildRiskScore(5, 1, 1);
    expect(result.probabilityBand).toBe(1);
    expect(result.score).toBe(1);
    expect(result.rag).toBe('green');
  });

  it('amber result at the green/amber boundary', () => {
    // Band 2 × cost 3 = 6 (just into amber)
    const result = buildRiskScore(15, 3, 1);
    expect(result.probabilityBand).toBe(2);
    expect(result.score).toBe(6);
    expect(result.rag).toBe('amber');
  });

  it('uses the higher of cost and time impact for score', () => {
    const highCost = buildRiskScore(40, 5, 1);
    const highTime = buildRiskScore(40, 1, 5);
    expect(highCost.score).toBe(highTime.score);
    expect(highCost.score).toBe(15); // band 3 × 5
  });
});
