import { describe, expect, it } from 'vitest';
import { AppDomainState } from '../domain/types';
import { WorkItem } from '../domain/types';
import { Risk } from '../domain/risk';
import { ExternalDependency } from '../domain/externalDependency';
import { Deliverable, AcceptanceCriterion } from '../domain/deliverable';
import {
  getTaskRiskBadge,
  getTaskDepBadge,
  getTaskGateBadge,
} from '../state/selectors';
import { deriveSignals } from '../engine/signalsEngine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(id: string, extra: Partial<WorkItem> = {}): WorkItem {
  return {
    id,
    title: id,
    status: 'todo',
    startDate: '2026-06-01',
    endDate: '2026-06-10',
    durationDays: 10,
    isMilestone: false,
    locked: false,
    swimlane: 'default',
    percentComplete: 0,
    parentId: null,
    isParent: false,
    assignees: [],
    dependencies: [],
    constraint: null,
    ...extra,
  };
}

function makeRiskWithScore(
  id: string,
  linkedTaskIds: string[],
  residualScore: number,
  status: Risk['status'] = 'Open',
  reviewDate = '2026-12-31',
): Risk {
  const band = residualScore <= 5 ? 'green' : residualScore <= 12 ? 'amber' : 'red';
  const s = {
    probabilityPct: 50,
    probabilityBand: 3 as const,
    costImpact: 3 as const,
    timeImpact: 3 as const,
    score: residualScore,
    rag: band as Risk['scores']['residual']['rag'],
  };
  return {
    id,
    title: id,
    description: '',
    category: 'Technical',
    owner: 'alice',
    status,
    scores: { inherent: s, residual: s, target: s },
    proposedResidualScore: null,
    controls: [],
    mitigations: [],
    raisedDate: '2026-01-01',
    reviewDate,
    lastModifiedAt: new Date().toISOString(),
    proximity: 'MediumTerm',
    linkedTaskIds,
    linkedDeliverableIds: [],
    linkedDependencyIds: [],
  };
}

function makeExtDep(
  id: string,
  linkedTaskIds: string[],
  status: ExternalDependency['status'],
  targetDate = '2026-12-31',
): ExternalDependency {
  return {
    id,
    title: id,
    description: '',
    externalOwner: 'Acme',
    internalOwner: 'bob',
    targetDate,
    status,
    linkedTaskIds,
    notes: '',
    lastReviewedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function makeCriterion(id: string, met: boolean): AcceptanceCriterion {
  return { id, description: id, met, metAt: met ? '2026-01-01T00:00:00Z' : null, metBy: met ? 'system' : null };
}

function makeDeliverable(
  id: string,
  linkedTaskIds: string[],
  criteria: AcceptanceCriterion[],
  status: Deliverable['status'] = 'InReview',
): Deliverable {
  return {
    id,
    title: id,
    description: '',
    owner: 'carol',
    targetDate: '2026-12-31',
    status,
    acceptanceCriteria: criteria,
    linkedTaskIds,
    notes: '',
    acceptedAt: null,
    acceptedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    lastReviewedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function emptyDomain(overrides: Partial<AppDomainState> = {}): AppDomainState {
  return {
    tasks: [],
    columns: [{ key: 'todo', label: 'To do' }],
    swimlanes: [{ key: 'default', label: 'Default' }],
    workingCalendar: { highlightWeekends: false, holidays: [] },
    people: [],
    risks: [],
    raidActions: [],
    externalDependencies: [],
    deliverables: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// WP1 — Selector: getTaskRiskBadge
// ---------------------------------------------------------------------------

describe('getTaskRiskBadge', () => {
  it('returns null when no risks link to task', () => {
    const domain = emptyDomain({ tasks: [makeTask('T1')] });
    expect(getTaskRiskBadge('T1', domain)).toBeNull();
  });

  it('returns null when all linked risks are Closed', () => {
    const domain = emptyDomain({
      tasks: [makeTask('T1')],
      risks: [makeRiskWithScore('R1', ['T1'], 15, 'Closed')],
    });
    expect(getTaskRiskBadge('T1', domain)).toBeNull();
  });

  it('returns the highest residual score among open risks', () => {
    const domain = emptyDomain({
      tasks: [makeTask('T1')],
      risks: [
        makeRiskWithScore('R1', ['T1'], 6),   // amber
        makeRiskWithScore('R2', ['T1'], 15),  // red  ← highest
        makeRiskWithScore('R3', ['T1'], 3),   // green
      ],
    });
    const badge = getTaskRiskBadge('T1', domain);
    expect(badge).not.toBeNull();
    expect(badge!.score).toBe(15);
    expect(badge!.band).toBe('red');
    expect(badge!.riskIds.sort()).toEqual(['R1', 'R2', 'R3']);
  });

  it('excludes closed risks from riskIds', () => {
    const domain = emptyDomain({
      tasks: [makeTask('T1')],
      risks: [
        makeRiskWithScore('R1', ['T1'], 9, 'Open'),
        makeRiskWithScore('R2', ['T1'], 6, 'Closed'),
      ],
    });
    const badge = getTaskRiskBadge('T1', domain);
    expect(badge!.riskIds).toEqual(['R1']);
  });

  it('ignores risks not linked to this task', () => {
    const domain = emptyDomain({
      tasks: [makeTask('T1'), makeTask('T2')],
      risks: [makeRiskWithScore('R1', ['T2'], 20)],
    });
    expect(getTaskRiskBadge('T1', domain)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// WP1 — Selector: getTaskDepBadge
// ---------------------------------------------------------------------------

describe('getTaskDepBadge', () => {
  it('returns null when no dependencies link to task', () => {
    const domain = emptyDomain({ tasks: [makeTask('T1')] });
    expect(getTaskDepBadge('T1', domain)).toBeNull();
  });

  it('worst-status ordering: Late > AtRisk > OnTrack > Received', () => {
    // Only AtRisk and OnTrack
    const domain1 = emptyDomain({
      tasks: [makeTask('T1')],
      externalDependencies: [
        makeExtDep('D1', ['T1'], 'OnTrack'),
        makeExtDep('D2', ['T1'], 'AtRisk'),
      ],
    });
    expect(getTaskDepBadge('T1', domain1)!.worstStatus).toBe('AtRisk');

    // Late present → Late wins
    const domain2 = emptyDomain({
      tasks: [makeTask('T1')],
      externalDependencies: [
        makeExtDep('D1', ['T1'], 'AtRisk'),
        makeExtDep('D2', ['T1'], 'Late'),
        makeExtDep('D3', ['T1'], 'Received'),
      ],
    });
    expect(getTaskDepBadge('T1', domain2)!.worstStatus).toBe('Late');

    // All Received
    const domain3 = emptyDomain({
      tasks: [makeTask('T1')],
      externalDependencies: [makeExtDep('D1', ['T1'], 'Received')],
    });
    expect(getTaskDepBadge('T1', domain3)!.worstStatus).toBe('Received');
  });

  it('returns all dep IDs regardless of status', () => {
    const domain = emptyDomain({
      tasks: [makeTask('T1')],
      externalDependencies: [
        makeExtDep('D1', ['T1'], 'OnTrack'),
        makeExtDep('D2', ['T1'], 'Late'),
      ],
    });
    expect(getTaskDepBadge('T1', domain)!.depIds.sort()).toEqual(['D1', 'D2']);
  });
});

// ---------------------------------------------------------------------------
// WP1 — Selector: getTaskGateBadge
// ---------------------------------------------------------------------------

describe('getTaskGateBadge', () => {
  it('returns null for a non-milestone task', () => {
    const domain = emptyDomain({
      tasks: [makeTask('T1', { isMilestone: false })],
      deliverables: [makeDeliverable('DEL1', ['T1'], [makeCriterion('C1', true)])],
    });
    expect(getTaskGateBadge('T1', domain)).toBeNull();
  });

  it('returns null when no deliverables link to milestone', () => {
    const domain = emptyDomain({
      tasks: [makeTask('M1', { isMilestone: true })],
    });
    expect(getTaskGateBadge('M1', domain)).toBeNull();
  });

  it('counts criteria correctly across multiple linked deliverables', () => {
    const domain = emptyDomain({
      tasks: [makeTask('M1', { isMilestone: true })],
      deliverables: [
        makeDeliverable('DEL1', ['M1'], [makeCriterion('C1', true), makeCriterion('C2', false)]),
        makeDeliverable('DEL2', ['M1'], [makeCriterion('C3', true), makeCriterion('C4', true), makeCriterion('C5', false)]),
      ],
    });
    const badge = getTaskGateBadge('M1', domain);
    expect(badge).not.toBeNull();
    expect(badge!.criteriaMet).toBe(3);   // C1 + C3 + C4
    expect(badge!.criteriaTotal).toBe(5); // C1..C5
    expect(badge!.deliverableIds.sort()).toEqual(['DEL1', 'DEL2']);
  });

  it('reports 0/0 for deliverables with no criteria', () => {
    const domain = emptyDomain({
      tasks: [makeTask('M1', { isMilestone: true })],
      deliverables: [makeDeliverable('DEL1', ['M1'], [])],
    });
    const badge = getTaskGateBadge('M1', domain);
    expect(badge!.criteriaMet).toBe(0);
    expect(badge!.criteriaTotal).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// WP2 — Signals engine: deriveSignals
// ---------------------------------------------------------------------------

describe('deriveSignals', () => {
  it('returns empty array for an empty domain', () => {
    const domain = emptyDomain();
    expect(deriveSignals(domain, '2026-06-01')).toEqual([]);
  });

  it('emits a risk signal when review date is on or before today', () => {
    const domain = emptyDomain({
      tasks: [makeTask('T1')],
      risks: [makeRiskWithScore('R1', ['T1'], 9, 'Open', '2026-06-01')],
    });
    // today equals reviewDate → should trigger
    const signals = deriveSignals(domain, '2026-06-01');
    expect(signals.some((s) => s.category === 'risk' && s.entityId === 'R1')).toBe(true);
  });

  it('does not emit a risk signal when review date is in the future', () => {
    const domain = emptyDomain({
      tasks: [makeTask('T1')],
      risks: [makeRiskWithScore('R1', ['T1'], 9, 'Open', '2026-06-10')],
    });
    const signals = deriveSignals(domain, '2026-06-01');
    expect(signals.some((s) => s.category === 'risk' && s.entityId === 'R1')).toBe(false);
  });

  it('risk review date flips in/out of signal set as today crosses it', () => {
    const domain = emptyDomain({
      tasks: [makeTask('T1')],
      risks: [makeRiskWithScore('R1', ['T1'], 9, 'Open', '2026-06-05')],
    });
    // Before review date
    const before = deriveSignals(domain, '2026-06-04');
    expect(before.some((s) => s.entityId === 'R1')).toBe(false);
    // On review date
    const on = deriveSignals(domain, '2026-06-05');
    expect(on.some((s) => s.entityId === 'R1')).toBe(true);
    // After review date
    const after = deriveSignals(domain, '2026-06-10');
    expect(after.some((s) => s.entityId === 'R1')).toBe(true);
  });

  it('emits dep signals only for Late or AtRisk deps', () => {
    const domain = emptyDomain({
      tasks: [makeTask('T1')],
      externalDependencies: [
        makeExtDep('D_ON', ['T1'], 'OnTrack'),
        makeExtDep('D_REC', ['T1'], 'Received'),
        makeExtDep('D_AT', ['T1'], 'AtRisk'),
        makeExtDep('D_LATE', ['T1'], 'Late'),
      ],
    });
    const signals = deriveSignals(domain, '2026-06-01');
    const depIds = signals.filter((s) => s.category === 'dep').map((s) => s.entityId);
    expect(depIds).toContain('D_AT');
    expect(depIds).toContain('D_LATE');
    expect(depIds).not.toContain('D_ON');
    expect(depIds).not.toContain('D_REC');
  });

  it('emits gate signal (ready for acceptance) only when all criteria met and not Accepted', () => {
    // All met, InReview → should signal
    const delReady = makeDeliverable(
      'DEL_READY', ['T1'],
      [makeCriterion('C1', true), makeCriterion('C2', true)],
      'InReview',
    );
    // Not all met → should not signal
    const delNotReady = makeDeliverable(
      'DEL_NOT', ['T1'],
      [makeCriterion('C1', true), makeCriterion('C2', false)],
      'InReview',
    );
    // All met but Accepted → should not signal
    const delAccepted = makeDeliverable(
      'DEL_DONE', ['T1'],
      [makeCriterion('C1', true)],
      'Accepted',
    );
    const domain = emptyDomain({
      tasks: [makeTask('T1')],
      deliverables: [delReady, delNotReady, delAccepted],
    });
    const signals = deriveSignals(domain, '2026-06-01');
    const gateIds = signals.filter((s) => s.category === 'gate').map((s) => s.entityId);
    expect(gateIds).toContain('DEL_READY');
    expect(gateIds).not.toContain('DEL_NOT');
    expect(gateIds).not.toContain('DEL_DONE');
  });

  it('emits forecast signals for tasks with forecastWarning or deliverableWarning', () => {
    const domain = emptyDomain({
      tasks: [
        makeTask('T1', { forecastWarning: true }),
        makeTask('T2', { deliverableWarning: true }),
        makeTask('T3'),
      ],
    });
    const signals = deriveSignals(domain, '2026-06-01');
    const taskIds = signals.filter((s) => s.category === 'forecast').map((s) => s.taskId);
    expect(taskIds).toContain('T1');
    expect(taskIds).toContain('T2');
    expect(taskIds).not.toContain('T3');
  });

  it('sorts signals by severity descending', () => {
    const domain = emptyDomain({
      tasks: [makeTask('T1')],
      risks: [makeRiskWithScore('R1', ['T1'], 9, 'Open', '2026-06-01')],
      externalDependencies: [makeExtDep('D1', ['T1'], 'Late')],
    });
    const signals = deriveSignals(domain, '2026-06-01');
    for (let i = 1; i < signals.length; i++) {
      expect(signals[i].severity).toBeLessThanOrEqual(signals[i - 1].severity);
    }
  });

  it('does not emit risk signals for Closed risks even if review date passed', () => {
    const domain = emptyDomain({
      tasks: [makeTask('T1')],
      risks: [makeRiskWithScore('R1', ['T1'], 9, 'Closed', '2026-01-01')],
    });
    const signals = deriveSignals(domain, '2026-06-01');
    expect(signals.some((s) => s.entityId === 'R1')).toBe(false);
  });

  it('injects correct today — does not construct Date internally', () => {
    // Two risks: one reviews today (2026-06-01), one on 2026-06-10
    const domain = emptyDomain({
      tasks: [makeTask('T1')],
      risks: [
        makeRiskWithScore('R_TODAY', ['T1'], 9, 'Open', '2026-06-01'),
        makeRiskWithScore('R_FUTURE', ['T1'], 9, 'Open', '2026-06-10'),
      ],
    });
    const at0601 = deriveSignals(domain, '2026-06-01');
    expect(at0601.some((s) => s.entityId === 'R_TODAY')).toBe(true);
    expect(at0601.some((s) => s.entityId === 'R_FUTURE')).toBe(false);

    const at0610 = deriveSignals(domain, '2026-06-10');
    expect(at0610.some((s) => s.entityId === 'R_TODAY')).toBe(true);
    expect(at0610.some((s) => s.entityId === 'R_FUTURE')).toBe(true);
  });

  it('breach signals have highest severity (100)', () => {
    // A task with a hard finish_no_later_than constraint it violates
    const task = makeTask('T1', {
      startDate: '2026-06-01',
      endDate: '2026-06-20',
      constraint: { type: 'finish_no_later_than', date: '2026-06-10', hard: true },
    });
    const domain = emptyDomain({ tasks: [task] });
    const signals = deriveSignals(domain, '2026-06-01');
    const breachSig = signals.find((s) => s.category === 'breach');
    expect(breachSig).toBeDefined();
    expect(breachSig!.severity).toBe(100);
    // Breach should be first (highest severity)
    if (signals.length > 0) {
      expect(signals[0].severity).toBeGreaterThanOrEqual(breachSig!.severity);
    }
  });
});
