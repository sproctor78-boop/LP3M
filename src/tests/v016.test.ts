// =============================================================================
// v0.16 "Weight" — test suite
// =============================================================================

import { describe, expect, it } from 'vitest';
import { AppDomainState } from '../domain/types';
import { Risk } from '../domain/risk';
import { ExternalDependency } from '../domain/externalDependency';
import { Deliverable } from '../domain/deliverable';
import { AppState } from '../domain/types';
import { appReducer } from '../state/appState';
import { migrateDomainForTest } from '../state/persistenceAdapter';
import { deriveSuggestions } from '../engine/adviceEngine';
import { ragForScore } from '../domain/raidScoring';
import {
  getDeliverableLinkedRisks,
  getDependencyLinkedRisks,
  getRiskLinkedDeliverables,
  getRiskLinkedDependencies,
} from '../state/selectors';

// ---------------------------------------------------------------------------
// Helpers (mirrors src/tests/v015.test.ts)
// ---------------------------------------------------------------------------

function makeRisk(id: string, extra: Partial<Risk> = {}): Risk {
  const s = { probabilityPct: 50, probabilityBand: 3 as const, costImpact: 3 as const, timeImpact: 3 as const, score: 9, rag: 'amber' as const };
  return {
    id,
    title: id,
    description: '',
    category: 'Technical',
    owner: 'alice',
    status: 'Open',
    scores: { inherent: s, residual: s, target: s },
    proposedResidualScore: null,
    controls: [],
    mitigations: [],
    raisedDate: '2026-01-01',
    reviewDate: '2026-12-31',
    lastModifiedAt: new Date().toISOString(),
    proximity: 'MediumTerm',
    linkedTaskIds: [],
    linkedDeliverableIds: [],
    linkedDependencyIds: [],
    ...extra,
  };
}

function makeExtDep(id: string, extra: Partial<ExternalDependency> = {}): ExternalDependency {
  return {
    id,
    title: id,
    description: '',
    externalOwner: 'Acme',
    internalOwner: 'bob',
    targetDate: '2026-12-31',
    status: 'OnTrack',
    linkedTaskIds: [],
    notes: '',
    lastReviewedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

function makeDeliverable(id: string, extra: Partial<Deliverable> = {}): Deliverable {
  return {
    id,
    title: id,
    description: '',
    owner: 'carol',
    targetDate: '2026-12-31',
    status: 'Planned',
    acceptanceCriteria: [],
    linkedTaskIds: [],
    notes: '',
    acceptedAt: null,
    acceptedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    lastReviewedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...extra,
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

function makeState(domain: AppDomainState): AppState {
  return {
    domain,
    view: {
      mode: 'timeline',
      zoom: 40,
      groupBy: 'swimlane',
      showCritical: true,
      selectedTaskId: null,
      drawerOpen: false,
      expandedParents: {},
      collapsedGroups: {},
      selectedDep: null,
      taskListWidth: 240,
      scrollToTaskId: null,
      milestonesOnly: false,
      raidActionsVisibleInTimeline: false,
      selectedRiskId: null,
      selectedActionId: null,
      riskRegisterCollapseState: { inherentCollapsed: true, residualCollapsed: false },
      externalDependenciesVisibleInTimeline: false,
      selectedExtDepId: null,
      deliverablesVisibleInTimeline: false,
      selectedDeliverableId: null,
      signalsRailOpen: true,
      riskSummaryCollapsed: false,
    },
    pendingForecast: null,
    pendingChange: null,
    _past: [],
    _future: [],
  };
}

// ---------------------------------------------------------------------------
// 1. Persistence: legacy risk missing linkedDependencyIds hydrates to []
// ---------------------------------------------------------------------------

describe('WP1 — persistence: linkedDependencyIds guard', () => {
  it('legacy risk record missing linkedDependencyIds hydrates to []', () => {
    const legacyRisk = { id: 'R1', title: 'R1', status: 'Open', proximity: 'MediumTerm' };
    const result = migrateDomainForTest({ risks: [legacyRisk] });
    expect(result.risks[0].linkedDependencyIds).toEqual([]);
  });

  it('preserves existing linkedDependencyIds', () => {
    const risk = { id: 'R1', linkedDependencyIds: ['ED01', 'ED02'] };
    const result = migrateDomainForTest({ risks: [risk] });
    expect(result.risks[0].linkedDependencyIds).toEqual(['ED01', 'ED02']);
  });

  it('does not crash when linkedDependencyIds is a non-array value', () => {
    const risk = { id: 'R1', linkedDependencyIds: 'not-an-array' };
    expect(() => migrateDomainForTest({ risks: [risk] })).not.toThrow();
    const result = migrateDomainForTest({ risks: [risk] });
    expect(result.risks[0].linkedDependencyIds).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. Cascade: removeExternalDependency filters linkedDependencyIds
// ---------------------------------------------------------------------------

describe('WP1 — cascade: removeExternalDependency cleans up risk links', () => {
  it('filters the removed depId from every linked risk, leaves unrelated risks untouched', () => {
    const SENTINEL = '2020-01-01T00:00:00.000Z';
    const r1 = makeRisk('R1', { linkedDependencyIds: ['D1', 'D2'], lastModifiedAt: SENTINEL });
    const r2 = makeRisk('R2', { linkedDependencyIds: ['D2'], lastModifiedAt: SENTINEL });
    const d1 = makeExtDep('D1');
    const d2 = makeExtDep('D2');
    const domain = emptyDomain({ risks: [r1, r2], externalDependencies: [d1, d2] });
    const state0 = makeState(domain);

    const state1 = appReducer(state0, { type: 'removeExternalDependency', depId: 'D1' });

    const updatedR1 = state1.domain.risks.find((r) => r.id === 'R1')!;
    const updatedR2 = state1.domain.risks.find((r) => r.id === 'R2')!;

    expect(updatedR1.linkedDependencyIds).toEqual(['D2']);
    expect(updatedR1.lastModifiedAt).not.toBe(SENTINEL);

    // R2 never referenced D1 — untouched, including lastModifiedAt.
    expect(updatedR2.linkedDependencyIds).toEqual(['D2']);
    expect(updatedR2.lastModifiedAt).toBe(SENTINEL);

    // The dependency itself is gone.
    expect(state1.domain.externalDependencies.find((d) => d.id === 'D1')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Reverse selectors
// ---------------------------------------------------------------------------

describe('WP2 — reverse selectors', () => {
  it('getDeliverableLinkedRisks returns linking risks, excludes closed risks', () => {
    const open = makeRisk('R1', { linkedDeliverableIds: ['DL1'], status: 'Open' });
    const closed = makeRisk('R2', { linkedDeliverableIds: ['DL1'], status: 'Closed' });
    const unrelated = makeRisk('R3', { linkedDeliverableIds: [] });
    const domain = emptyDomain({ risks: [open, closed, unrelated] });

    const result = getDeliverableLinkedRisks('DL1', domain);
    expect(result.map((r) => r.id)).toEqual(['R1']);
  });

  it('getDependencyLinkedRisks returns linking risks, excludes closed risks', () => {
    const open = makeRisk('R1', { linkedDependencyIds: ['ED1'], status: 'Open' });
    const closed = makeRisk('R2', { linkedDependencyIds: ['ED1'], status: 'Closed' });
    const domain = emptyDomain({ risks: [open, closed] });

    const result = getDependencyLinkedRisks('ED1', domain);
    expect(result.map((r) => r.id)).toEqual(['R1']);
  });
});

// ---------------------------------------------------------------------------
// 4. Forward selectors — dangling ids dropped, not crash
// ---------------------------------------------------------------------------

describe('WP2 — forward selectors', () => {
  it('getRiskLinkedDeliverables resolves existing records and drops dangling ids', () => {
    const del = makeDeliverable('DL1');
    const risk = makeRisk('R1', { linkedDeliverableIds: ['DL1', 'DL-GHOST'] });
    const domain = emptyDomain({ risks: [risk], deliverables: [del] });

    const result = getRiskLinkedDeliverables('R1', domain);
    expect(result.map((d) => d.id)).toEqual(['DL1']);
  });

  it('getRiskLinkedDependencies resolves existing records and drops dangling ids', () => {
    const dep = makeExtDep('ED1');
    const risk = makeRisk('R1', { linkedDependencyIds: ['ED1', 'ED-GHOST'] });
    const domain = emptyDomain({ risks: [risk], externalDependencies: [dep] });

    const result = getRiskLinkedDependencies('R1', domain);
    expect(result.map((d) => d.id)).toEqual(['ED1']);
  });

  it('returns empty array (not throw) for an unknown riskId', () => {
    const domain = emptyDomain();
    expect(() => getRiskLinkedDeliverables('GHOST', domain)).not.toThrow();
    expect(getRiskLinkedDeliverables('GHOST', domain)).toEqual([]);
    expect(getRiskLinkedDependencies('GHOST', domain)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 5. Rule 7 detection matrix
// ---------------------------------------------------------------------------

describe('WP3 — adviceEngine Rule 7: raise-risk-from-dep detection', () => {
  it('Late, no linked risk -> 1 suggestion', () => {
    const dep = makeExtDep('D1', { status: 'Late' });
    const domain = emptyDomain({ externalDependencies: [dep] });
    const suggestions = deriveSuggestions(domain, '2026-06-01');
    expect(suggestions.filter((s) => s.kind === 'raise-risk-from-dep' && s.entityId === 'D1').length).toBe(1);
  });

  it('AtRisk, no linked risk -> 1 suggestion', () => {
    const dep = makeExtDep('D1', { status: 'AtRisk' });
    const domain = emptyDomain({ externalDependencies: [dep] });
    const suggestions = deriveSuggestions(domain, '2026-06-01');
    expect(suggestions.filter((s) => s.kind === 'raise-risk-from-dep' && s.entityId === 'D1').length).toBe(1);
  });

  it('OnTrack -> 0 suggestions', () => {
    const dep = makeExtDep('D1', { status: 'OnTrack' });
    const domain = emptyDomain({ externalDependencies: [dep] });
    const suggestions = deriveSuggestions(domain, '2026-06-01');
    expect(suggestions.some((s) => s.kind === 'raise-risk-from-dep')).toBe(false);
  });

  it('Received -> 0 suggestions', () => {
    const dep = makeExtDep('D1', { status: 'Received' });
    const domain = emptyDomain({ externalDependencies: [dep] });
    const suggestions = deriveSuggestions(domain, '2026-06-01');
    expect(suggestions.some((s) => s.kind === 'raise-risk-from-dep')).toBe(false);
  });

  it('Late but already linked to a risk -> 0 suggestions', () => {
    const dep = makeExtDep('D1', { status: 'Late' });
    const risk = makeRisk('R1', { linkedDependencyIds: ['D1'] });
    const domain = emptyDomain({ externalDependencies: [dep], risks: [risk] });
    const suggestions = deriveSuggestions(domain, '2026-06-01');
    expect(suggestions.some((s) => s.kind === 'raise-risk-from-dep')).toBe(false);
  });

  it('is per-dependency, not per-linked-task', () => {
    const dep = makeExtDep('D1', { status: 'Late', linkedTaskIds: ['T1', 'T2', 'T3'] });
    const domain = emptyDomain({ externalDependencies: [dep] });
    const suggestions = deriveSuggestions(domain, '2026-06-01').filter((s) => s.kind === 'raise-risk-from-dep');
    expect(suggestions.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 6. Rule 7 Apply
// ---------------------------------------------------------------------------

describe('WP3 — adviceEngine Rule 7: Apply', () => {
  it('creates a valid Risk with category External, linkedDependencyIds/linkedTaskIds set, and a consistent score', () => {
    const dep = makeExtDep('D1', {
      title: 'Cert from CA',
      description: 'Formal certification',
      status: 'Late',
      internalOwner: 'P05',
      targetDate: '2026-05-10',
      linkedTaskIds: ['T07', 'T08'],
    });
    const domain = emptyDomain({ externalDependencies: [dep] });
    const state0 = makeState(domain);

    const suggestions = deriveSuggestions(domain, '2026-06-01');
    const s = suggestions.find((s) => s.kind === 'raise-risk-from-dep' && s.entityId === 'D1');
    expect(s).toBeDefined();
    expect(s!.actions.length).toBe(1);
    expect(s!.actions[0].type).toBe('createRisk');

    const state1 = appReducer(state0, { type: 'batch', actions: s!.actions });
    const created = state1.domain.risks.find((r) => r.owner === 'P05');
    expect(created).toBeDefined();
    expect(created!.category).toBe('External');
    expect(created!.linkedDependencyIds).toContain('D1');
    expect(created!.linkedTaskIds).toEqual(['T07', 'T08']);
    expect(created!.scores.residual.score).toBeGreaterThanOrEqual(1);
    expect(created!.scores.residual.score).toBeLessThanOrEqual(25);
    expect(created!.scores.residual.rag).toBe(ragForScore(created!.scores.residual.score));
  });

  it('falls back reviewDate to today when dep.targetDate is empty', () => {
    const dep = makeExtDep('D1', { status: 'AtRisk', targetDate: '' });
    const domain = emptyDomain({ externalDependencies: [dep] });
    const suggestions = deriveSuggestions(domain, '2026-06-01');
    const s = suggestions.find((s) => s.kind === 'raise-risk-from-dep' && s.entityId === 'D1');
    const action = s!.actions[0] as { type: string; risk: Risk };
    expect(action.risk.reviewDate).toBe('2026-06-01');
  });
});

// ---------------------------------------------------------------------------
// 7. Idempotence
// ---------------------------------------------------------------------------

describe('WP3 — adviceEngine Rule 7: idempotence', () => {
  it('applying the suggestion makes it disappear on next derivation', () => {
    const dep = makeExtDep('D1', { status: 'Late' });
    const domain = emptyDomain({ externalDependencies: [dep] });
    const state0 = makeState(domain);

    const suggestions = deriveSuggestions(domain, '2026-06-01');
    const s = suggestions.find((s) => s.kind === 'raise-risk-from-dep' && s.entityId === 'D1');
    expect(s).toBeDefined();

    const state1 = appReducer(state0, { type: 'batch', actions: s!.actions });

    const afterSuggestions = deriveSuggestions(state1.domain, '2026-06-01');
    expect(afterSuggestions.some((sg) => sg.kind === 'raise-risk-from-dep' && sg.entityId === 'D1')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. Rule purity — no wall-clock read leaks
// ---------------------------------------------------------------------------

describe('WP3 — adviceEngine Rule 7: purity', () => {
  it('deriveSuggestions is deterministic across repeated calls with identical inputs', () => {
    const dep1 = makeExtDep('D1', { status: 'Late', targetDate: '2026-05-10', linkedTaskIds: ['T07'] });
    const dep2 = makeExtDep('D2', { status: 'AtRisk', targetDate: '' });
    const risk = makeRisk('R1', { linkedDependencyIds: [] });
    const domain = emptyDomain({ externalDependencies: [dep1, dep2], risks: [risk] });

    const first = deriveSuggestions(domain, '2026-06-01');
    const second = deriveSuggestions(domain, '2026-06-01');

    expect(second).toEqual(first);
  });
});
