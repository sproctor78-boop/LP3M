import { describe, expect, it } from 'vitest';
import { seedRisks, seedRaidActions } from '../domain/raidSeedData';
import { Proximity } from '../domain/risk';

describe('seedRisks', () => {
  const risks = seedRisks();

  it('produces exactly 12 risks', () => {
    expect(risks).toHaveLength(12);
  });

  it('IDs are unique and in expected format', () => {
    const ids = risks.map((r) => r.id);
    expect(new Set(ids).size).toBe(12);
    ids.forEach((id) => expect(id).toMatch(/^R\d{2}$/));
  });

  it('covers all 7 risk categories', () => {
    const categories = new Set(risks.map((r) => r.category));
    expect(categories).toContain('Technical');
    expect(categories).toContain('Resource');
    expect(categories).toContain('Commercial');
    expect(categories).toContain('Regulatory');
    expect(categories).toContain('Schedule');
    expect(categories).toContain('Supply Chain');
    expect(categories).toContain('External');
  });

  it('includes all status variants', () => {
    const statuses = new Set(risks.map((r) => r.status));
    expect(statuses).toContain('Open');
    expect(statuses).toContain('Mitigated');
    expect(statuses).toContain('PendingApproval');
  });

  it('all three RAG colours appear in inherent scores', () => {
    const rags = new Set(risks.map((r) => r.scores.inherent.rag));
    expect(rags).toContain('green');
    expect(rags).toContain('amber');
    expect(rags).toContain('red');
  });

  it('scores are internally consistent (score = band × max(cost, time))', () => {
    risks.forEach((r) => {
      for (const s of [r.scores.inherent, r.scores.residual, r.scores.target]) {
        const expected = s.probabilityBand * Math.max(s.costImpact, s.timeImpact);
        expect(s.score).toBe(expected);
      }
    });
  });

  it('all score values are in range 1–25', () => {
    risks.forEach((r) => {
      for (const s of [r.scores.inherent, r.scores.residual, r.scores.target]) {
        expect(s.score).toBeGreaterThanOrEqual(1);
        expect(s.score).toBeLessThanOrEqual(25);
      }
    });
  });

  it('PendingApproval risk (R03) has proposedResidualScore set', () => {
    const r03 = risks.find((r) => r.id === 'R03');
    expect(r03).toBeDefined();
    expect(r03!.status).toBe('PendingApproval');
    expect(r03!.proposedResidualScore).not.toBeNull();
  });

  it('non-PendingApproval risks have null proposedResidualScore', () => {
    risks
      .filter((r) => r.status !== 'PendingApproval')
      .forEach((r) => {
        expect(r.proposedResidualScore).toBeNull();
      });
  });

  it('residual score is always ≤ inherent score for all risks', () => {
    risks.forEach((r) => {
      expect(r.scores.residual.score).toBeLessThanOrEqual(r.scores.inherent.score);
    });
  });

  it('target score is always ≤ residual score for all risks', () => {
    risks.forEach((r) => {
      expect(r.scores.target.score).toBeLessThanOrEqual(r.scores.residual.score);
    });
  });

  it('all risks have at least one control or mitigation', () => {
    risks.forEach((r) => {
      expect(r.controls.length + r.mitigations.length).toBeGreaterThan(0);
    });
  });

  it('all risks have valid ISO raisedDate and reviewDate', () => {
    const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;
    risks.forEach((r) => {
      expect(r.raisedDate).toMatch(isoDateRe);
      expect(r.reviewDate).toMatch(isoDateRe);
    });
  });

  it('all 12 risks have a valid proximity value', () => {
    const validProximities: Proximity[] = ['Imminent', 'NearTerm', 'MediumTerm', 'LongTerm'];
    risks.forEach((r) => {
      expect(validProximities).toContain(r.proximity);
    });
  });
});

describe('seedRaidActions', () => {
  const actions = seedRaidActions();

  it('produces exactly 19 actions', () => {
    expect(actions).toHaveLength(19);
  });

  it('IDs are unique and in expected format', () => {
    const ids = actions.map((a) => a.id);
    expect(new Set(ids).size).toBe(19);
    ids.forEach((id) => expect(id).toMatch(/^RA\d{2}$/));
  });

  it('covers all 4 action statuses', () => {
    const statuses = new Set(actions.map((a) => a.status));
    expect(statuses).toContain('Todo');
    expect(statuses).toContain('InProgress');
    expect(statuses).toContain('Done');
    expect(statuses).toContain('Overdue');
  });

  it('exactly one Overdue action (RA19)', () => {
    const overdue = actions.filter((a) => a.status === 'Overdue');
    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).toBe('RA19');
  });

  it('Done actions have completionEffectiveness set', () => {
    actions
      .filter((a) => a.status === 'Done')
      .forEach((a) => {
        expect(a.completionEffectiveness).not.toBeNull();
        expect(a.completionEffectiveness).toBeGreaterThanOrEqual(1);
        expect(a.completionEffectiveness).toBeLessThanOrEqual(5);
      });
  });

  it('non-Done actions have null completionEffectiveness', () => {
    actions
      .filter((a) => a.status !== 'Done')
      .forEach((a) => {
        expect(a.completionEffectiveness).toBeNull();
      });
  });

  it('all actions reference a valid riskId (R01–R12)', () => {
    const validRiskIds = new Set(seedRisks().map((r) => r.id));
    actions.forEach((a) => {
      expect(validRiskIds.has(a.riskId)).toBe(true);
    });
  });

  it('all actions have valid ISO dueDate', () => {
    const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;
    actions.forEach((a) => {
      expect(a.dueDate).toMatch(isoDateRe);
    });
  });

  it('RA06 (R03 trigger) is Done with effectiveness 4', () => {
    const ra06 = actions.find((a) => a.id === 'RA06');
    expect(ra06).toBeDefined();
    expect(ra06!.status).toBe('Done');
    expect(ra06!.completionEffectiveness).toBe(4);
    expect(ra06!.riskId).toBe('R03');
  });

  it('RA16 has a future dueDate that exercises window-extension logic', () => {
    const ra16 = actions.find((a) => a.id === 'RA16');
    expect(ra16).toBeDefined();
    // RA16 is due 2026-07-18, beyond the main programme finish 2026-06-24
    expect(ra16!.dueDate > '2026-06-24').toBe(true);
  });
});

describe('cross-reference integrity', () => {
  const risks = seedRisks();
  const actions = seedRaidActions();

  it('every action responseItemId exists on its parent risk', () => {
    actions.forEach((a) => {
      const risk = risks.find((r) => r.id === a.riskId);
      expect(risk).toBeDefined();
      const allItems = [...risk!.controls, ...risk!.mitigations];
      const match = allItems.find((item) => item.id === a.responseItemId);
      expect(match).toBeDefined();
    });
  });

  it('responseItemType on action matches item.type on the risk', () => {
    actions.forEach((a) => {
      const risk = risks.find((r) => r.id === a.riskId);
      const allItems = [...risk!.controls, ...risk!.mitigations];
      const item = allItems.find((i) => i.id === a.responseItemId);
      expect(item!.type).toBe(a.responseItemType);
    });
  });
});
