// =============================================================================
// v0.15 "Reflex" — test suite
// =============================================================================

import { describe, expect, it, beforeEach } from 'vitest';
import { AppDomainState, Person, WorkItem } from '../domain/types';
import { Risk } from '../domain/risk';
import { ExternalDependency } from '../domain/externalDependency';
import { Deliverable } from '../domain/deliverable';
import { AppState } from '../domain/types';
import { appReducer } from '../state/appState';
import { loadAppState, saveAppState } from '../state/persistenceAdapter';
import { deriveSuggestions } from '../engine/adviceEngine';

// ---------------------------------------------------------------------------
// Helpers (mirrors src/tests/v013.test.ts)
// ---------------------------------------------------------------------------

function makeTask(id: string, extra: Partial<WorkItem> = {}): WorkItem {
  return {
    id,
    title: `Task ${id}`,
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

function makePerson(id: string, extra: Partial<Person> = {}): Person {
  return {
    id,
    displayName: `Person ${id}`,
    source: 'local',
    ...extra,
  };
}

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
// 1. Ext dep -> Late sets forecastWarning with no task action
// ---------------------------------------------------------------------------

describe('WP1 — cross-register recompute: external dependency status', () => {
  it('setting a linked ext dep to Late immediately sets forecastWarning', () => {
    const task = makeTask('T1', { startDate: '2026-06-01', endDate: '2026-06-10' });
    const dep = makeExtDep('D1', { linkedTaskIds: ['T1'], status: 'OnTrack', targetDate: '2026-05-01' });
    const domain = emptyDomain({ tasks: [task], externalDependencies: [dep] });
    const state0 = makeState(domain);

    expect(state0.domain.tasks[0].forecastWarning).toBeFalsy();

    const state1 = appReducer(state0, {
      type: 'setExternalDependencyStatus',
      depId: 'D1',
      status: 'Late',
    });

    expect(state1.domain.tasks.find((t) => t.id === 'T1')?.forecastWarning).toBe(true);
  });

  it('does not set forecastWarning for an unlinked task', () => {
    const linked = makeTask('T1');
    const unlinked = makeTask('T2');
    const dep = makeExtDep('D1', { linkedTaskIds: ['T1'], status: 'OnTrack' });
    const domain = emptyDomain({ tasks: [linked, unlinked], externalDependencies: [dep] });
    const state0 = makeState(domain);

    const state1 = appReducer(state0, { type: 'setExternalDependencyStatus', depId: 'D1', status: 'Late' });

    expect(state1.domain.tasks.find((t) => t.id === 'T2')?.forecastWarning).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// 2. Ext dep targetDate slip pushes a linked task; hard-constrained task is not pushed
// ---------------------------------------------------------------------------

describe('WP1 — cross-register recompute: external dependency target-date slip', () => {
  it('pushes a soft-constrained linked task and leaves a hard-constrained one alone', () => {
    const soft = makeTask('T1', { startDate: '2026-06-01', endDate: '2026-06-10' });
    const hard = makeTask('T2', {
      startDate: '2026-06-01',
      endDate: '2026-06-10',
      constraint: { type: 'must_start_on', date: '2026-06-01', hard: true },
    });
    const dep = makeExtDep('D1', {
      linkedTaskIds: ['T1', 'T2'],
      status: 'AtRisk',
      targetDate: '2026-06-05',
    });
    const domain = emptyDomain({ tasks: [soft, hard], externalDependencies: [dep] });
    const state0 = makeState(domain);

    const state1 = appReducer(state0, {
      type: 'updateExternalDependency',
      depId: 'D1',
      patch: { targetDate: '2026-06-20' },
    });

    expect(state1.domain.tasks.find((t) => t.id === 'T1')?.startDate).toBe('2026-06-20');
    expect(state1.domain.tasks.find((t) => t.id === 'T2')?.startDate).toBe('2026-06-01');
  });
});

// ---------------------------------------------------------------------------
// 3. Deliverable -> Rejected sets deliverableWarning immediately
// ---------------------------------------------------------------------------

describe('WP1 — cross-register recompute: deliverable status', () => {
  it('rejecting a linked deliverable immediately sets deliverableWarning', () => {
    const task = makeTask('T1');
    const del = makeDeliverable('DL1', { linkedTaskIds: ['T1'], status: 'InReview' });
    const domain = emptyDomain({ tasks: [task], deliverables: [del] });
    const state0 = makeState(domain);

    expect(state0.domain.tasks[0].deliverableWarning).toBeFalsy();

    const state1 = appReducer(state0, {
      type: 'setDeliverableStatus',
      deliverableId: 'DL1',
      status: 'Rejected',
      rejectionReason: 'not fit for purpose',
    });

    expect(state1.domain.tasks.find((t) => t.id === 'T1')?.deliverableWarning).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Undo after a cross-register mutation restores exact prior task dates
// ---------------------------------------------------------------------------

describe('WP1 — undo safety', () => {
  it('recompute does not mutate the pre-mutation domain snapshot in place', () => {
    const task = makeTask('T1', { startDate: '2026-06-01', endDate: '2026-06-10' });
    const dep = makeExtDep('D1', { linkedTaskIds: ['T1'], targetDate: '2026-06-05' });
    const domain = emptyDomain({ tasks: [task], externalDependencies: [dep] });
    const state0 = makeState(domain);

    const preMutationSnapshot = JSON.parse(JSON.stringify(state0.domain.tasks));

    const state1 = appReducer(state0, {
      type: 'updateExternalDependency',
      depId: 'D1',
      patch: { targetDate: '2026-06-20' },
    });

    // The mutation did take effect on the new state...
    expect(state1.domain.tasks.find((t) => t.id === 'T1')?.startDate).toBe('2026-06-20');
    // ...but the object graph referenced by state0 (now sitting in _past) is untouched.
    expect(state0.domain.tasks).toEqual(preMutationSnapshot);
  });

  it('undo restores the exact prior domain after a cross-register mutation', () => {
    const task = makeTask('T1', { startDate: '2026-06-01', endDate: '2026-06-10' });
    const dep = makeExtDep('D1', { linkedTaskIds: ['T1'], targetDate: '2026-06-05' });
    const domain = emptyDomain({ tasks: [task], externalDependencies: [dep] });
    const state0 = makeState(domain);
    const preMutationSnapshot = JSON.parse(JSON.stringify(state0.domain.tasks));

    const state1 = appReducer(state0, {
      type: 'updateExternalDependency',
      depId: 'D1',
      patch: { targetDate: '2026-06-20' },
    });
    const state2 = appReducer(state1, { type: 'undo' });

    expect(state2.domain.tasks).toEqual(preMutationSnapshot);
  });
});

// ---------------------------------------------------------------------------
// 5. Persistence round-trip: derived fields absent from serialized output
// ---------------------------------------------------------------------------

describe('WP2 — persistence: derived-field hygiene', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('save strips derived fields; load recomputes them', () => {
    const task = makeTask('T1', {
      startDate: '2026-06-01',
      endDate: '2026-06-10',
      criticalPath: true,
      floatDays: 0,
      forecastWarning: true,
      deliverableWarning: true,
    });
    const dep = makeExtDep('D1', { linkedTaskIds: ['T1'], status: 'Late', targetDate: '2026-05-01' });
    const domain = emptyDomain({ tasks: [task], externalDependencies: [dep] });
    const state = makeState(domain);

    saveAppState(state);

    // Inspect the raw persisted payload directly.
    let rawFound: string | null = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('ripple_state')) continue;
      rawFound = localStorage.getItem(key);
    }
    expect(rawFound).not.toBeNull();
    const parsed = JSON.parse(rawFound!);
    const persistedTask = parsed.state.domain.tasks[0];
    expect(persistedTask).not.toHaveProperty('criticalPath');
    expect(persistedTask).not.toHaveProperty('floatDays');
    expect(persistedTask).not.toHaveProperty('forecastWarning');
    expect(persistedTask).not.toHaveProperty('deliverableWarning');

    const loaded = loadAppState();
    const loadedTask = loaded.domain.tasks.find((t) => t.id === 'T1');
    expect(loadedTask?.forecastWarning).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. removePerson owner degradation across all three registers
// ---------------------------------------------------------------------------

describe('WP3 — people referential integrity', () => {
  it('degrades matching owner IDs to the display name across risks, deliverables, and ext deps', () => {
    const person = makePerson('P1', { displayName: 'Priya Shah' });
    const task = makeTask('T1', { assignees: ['P1', 'P2'] });
    const risk = makeRisk('R1', { owner: 'P1' });
    const del = makeDeliverable('DL1', { owner: 'P1' });
    const dep = makeExtDep('D1', { internalOwner: 'P1' });
    const domain = emptyDomain({
      tasks: [task],
      people: [person],
      risks: [risk],
      deliverables: [del],
      externalDependencies: [dep],
    });
    const state0 = makeState(domain);

    const state1 = appReducer(state0, { type: 'removePerson', personId: 'P1' });

    expect(state1.domain.people.find((p) => p.id === 'P1')).toBeUndefined();
    expect(state1.domain.risks[0].owner).toBe('Priya Shah');
    expect(state1.domain.deliverables[0].owner).toBe('Priya Shah');
    expect(state1.domain.externalDependencies[0].internalOwner).toBe('Priya Shah');
    // Assignee cleanup still works — P1 removed, free-text/other IDs untouched.
    expect(state1.domain.tasks[0].assignees).not.toContain('P1');
    expect(state1.domain.tasks[0].assignees).toContain('P2');
  });

  it('leaves free-text owners untouched', () => {
    const person = makePerson('P1', { displayName: 'Priya Shah' });
    const risk = makeRisk('R1', { owner: 'External Consultant' });
    const del = makeDeliverable('DL1', { owner: 'External Consultant' });
    const dep = makeExtDep('D1', { internalOwner: 'External Consultant' });
    const domain = emptyDomain({
      people: [person],
      risks: [risk],
      deliverables: [del],
      externalDependencies: [dep],
    });
    const state0 = makeState(domain);

    const state1 = appReducer(state0, { type: 'removePerson', personId: 'P1' });

    expect(state1.domain.risks[0].owner).toBe('External Consultant');
    expect(state1.domain.deliverables[0].owner).toBe('External Consultant');
    expect(state1.domain.externalDependencies[0].internalOwner).toBe('External Consultant');
  });
});

// ---------------------------------------------------------------------------
// 7. Rule 6 — milestone-drift
// ---------------------------------------------------------------------------

describe('WP4 — adviceEngine Rule 6: milestone-drift', () => {
  it('fires when a linked milestone date differs from the deliverable targetDate', () => {
    const milestone = makeTask('M1', { isMilestone: true, startDate: '2026-06-15', endDate: '2026-06-15' });
    const del = makeDeliverable('DL1', { linkedTaskIds: ['M1'], targetDate: '2026-06-30', status: 'InProduction' });
    const domain = emptyDomain({ tasks: [milestone], deliverables: [del] });

    const suggestions = deriveSuggestions(domain, '2026-06-01');
    const s = suggestions.find((s) => s.kind === 'milestone-drift' && s.entityId === 'DL1');
    expect(s).toBeDefined();
    expect(s!.title).toContain('DL1');
  });

  it('does not fire when the milestone date matches the deliverable targetDate', () => {
    const milestone = makeTask('M1', { isMilestone: true, startDate: '2026-06-30', endDate: '2026-06-30' });
    const del = makeDeliverable('DL1', { linkedTaskIds: ['M1'], targetDate: '2026-06-30', status: 'InProduction' });
    const domain = emptyDomain({ tasks: [milestone], deliverables: [del] });

    const suggestions = deriveSuggestions(domain, '2026-06-01');
    expect(suggestions.some((s) => s.kind === 'milestone-drift')).toBe(false);
  });

  it('does not fire for Accepted deliverables', () => {
    const milestone = makeTask('M1', { isMilestone: true, startDate: '2026-06-15', endDate: '2026-06-15' });
    const del = makeDeliverable('DL1', { linkedTaskIds: ['M1'], targetDate: '2026-06-30', status: 'Accepted' });
    const domain = emptyDomain({ tasks: [milestone], deliverables: [del] });

    const suggestions = deriveSuggestions(domain, '2026-06-01');
    expect(suggestions.some((s) => s.kind === 'milestone-drift')).toBe(false);
  });

  it('does not fire for non-milestone linked tasks', () => {
    const task = makeTask('T1', { isMilestone: false, startDate: '2026-06-15', endDate: '2026-06-20' });
    const del = makeDeliverable('DL1', { linkedTaskIds: ['T1'], targetDate: '2026-06-30', status: 'InProduction' });
    const domain = emptyDomain({ tasks: [task], deliverables: [del] });

    const suggestions = deriveSuggestions(domain, '2026-06-01');
    expect(suggestions.some((s) => s.kind === 'milestone-drift')).toBe(false);
  });

  it('Apply action patches the milestone to the deliverable targetDate, and undo restores it', () => {
    const milestone = makeTask('M1', { isMilestone: true, startDate: '2026-06-15', endDate: '2026-06-15', durationDays: 0 });
    const del = makeDeliverable('DL1', { linkedTaskIds: ['M1'], targetDate: '2026-06-30', status: 'InProduction' });
    const domain = emptyDomain({ tasks: [milestone], deliverables: [del] });
    const state0 = makeState(domain);

    const suggestions = deriveSuggestions(domain, '2026-06-01');
    const s = suggestions.find((s) => s.kind === 'milestone-drift' && s.entityId === 'DL1');
    expect(s).toBeDefined();
    expect(s!.actions.length).toBe(1);
    const action = s!.actions[0] as { type: string; taskId?: string; patch?: Partial<WorkItem> };
    expect(action.type).toBe('updateTask');
    expect(action.taskId).toBe('M1');
    expect(action.patch?.startDate).toBe('2026-06-30');
    expect(action.patch?.endDate).toBe('2026-06-30');

    const state1 = appReducer(state0, { type: 'batch', actions: s!.actions });
    const updated = state1.domain.tasks.find((t) => t.id === 'M1');
    expect(updated?.startDate).toBe('2026-06-30');
    expect(updated?.endDate).toBe('2026-06-30');
    expect(updated?.durationDays).toBe(0);

    // Suggestion disappears once applied.
    const afterSuggestions = deriveSuggestions(state1.domain, '2026-06-01');
    expect(afterSuggestions.some((sg) => sg.kind === 'milestone-drift' && sg.entityId === 'DL1')).toBe(false);

    // Undo restores the drifted date.
    const state2 = appReducer(state1, { type: 'undo' });
    expect(state2.domain.tasks.find((t) => t.id === 'M1')?.startDate).toBe('2026-06-15');
  });

  it('one suggestion per drifting milestone when multiple are linked', () => {
    const m1 = makeTask('M1', { isMilestone: true, startDate: '2026-06-10', endDate: '2026-06-10' });
    const m2 = makeTask('M2', { isMilestone: true, startDate: '2026-06-12', endDate: '2026-06-12' });
    const del = makeDeliverable('DL1', { linkedTaskIds: ['M1', 'M2'], targetDate: '2026-06-30', status: 'InProduction' });
    const domain = emptyDomain({ tasks: [m1, m2], deliverables: [del] });

    const suggestions = deriveSuggestions(domain, '2026-06-01').filter((s) => s.kind === 'milestone-drift');
    expect(suggestions.length).toBe(2);
    expect(suggestions.some((s) => s.taskId === 'M1')).toBe(true);
    expect(suggestions.some((s) => s.taskId === 'M2')).toBe(true);
  });
});
