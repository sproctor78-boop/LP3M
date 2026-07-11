// =============================================================================
// v0.17 "Focus" — test suite
// =============================================================================

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AppDomainState, WorkItem } from '../domain/types';
import { Risk } from '../domain/risk';
import { ExternalDependency } from '../domain/externalDependency';
import { Deliverable } from '../domain/deliverable';
import { AppState } from '../domain/types';
import { appReducer } from '../state/appState';
import { loadAppState, migrateDomainForTest, saveAppState } from '../state/persistenceAdapter';
import { createInitialDomainState } from '../domain/seedData';
import { BACKUP_VERSION, buildBackupEnvelope, downloadBackup, parseBackupImport } from '../state/jsonBackup';

// ---------------------------------------------------------------------------
// Helpers (mirrors src/tests/v016.test.ts)
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
    lastModifiedAt: '2026-01-01T00:00:00.000Z',
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
    lastReviewedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
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
    lastReviewedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
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

function makeView(overrides: Partial<AppState['view']> = {}): AppState['view'] {
  return {
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
    ...overrides,
  };
}

function makeState(domain: AppDomainState, viewOverrides: Partial<AppState['view']> = {}): AppState {
  return {
    domain,
    view: makeView(viewOverrides),
    pendingForecast: null,
    pendingChange: null,
    _past: [],
    _future: [],
  };
}

// ---------------------------------------------------------------------------
// 1. Reset actions
// ---------------------------------------------------------------------------

describe('WP1 — resetToEmpty / resetToSeed', () => {
  it('resetToEmpty leaves domain arrays empty and preserves state.view.mode', () => {
    const task = makeTask('T1');
    const risk = makeRisk('R1');
    const domain = emptyDomain({ tasks: [task], risks: [risk] });
    const state0 = makeState(domain, { mode: 'riskRegister' });

    const state1 = appReducer(state0, { type: 'resetToEmpty' });

    expect(state1.domain.tasks).toEqual([]);
    expect(state1.domain.risks).toEqual([]);
    expect(state1.domain.deliverables).toEqual([]);
    expect(state1.domain.externalDependencies).toEqual([]);
    expect(state1.domain.people).toEqual([]);
    expect(state1.domain.raidActions).toEqual([]);
    expect(state1.view.mode).toBe('riskRegister');
  });

  it('resetToSeed restores expected seed counts matching createInitialDomainState', () => {
    const domain = emptyDomain();
    const state0 = makeState(domain);

    const state1 = appReducer(state0, { type: 'resetToSeed' });
    const seed = createInitialDomainState();

    expect(state1.domain.tasks.length).toBe(seed.tasks.length);
    expect(state1.domain.risks.length).toBe(seed.risks.length);
    expect(state1.domain.deliverables.length).toBe(seed.deliverables.length);
    expect(state1.domain.externalDependencies.length).toBe(seed.externalDependencies.length);
    expect(state1.domain.people.length).toBe(seed.people.length);
    expect(state1.domain.raidActions.length).toBe(seed.raidActions.length);
    expect(state1.domain.tasks.map((t) => t.id)).toEqual(seed.tasks.map((t) => t.id));
  });

  it('undo after resetToEmpty restores the exact prior domain', () => {
    const task = makeTask('T1', { startDate: '2026-06-01', endDate: '2026-06-10' });
    const risk = makeRisk('R1');
    const domain = emptyDomain({ tasks: [task], risks: [risk] });
    const state0 = makeState(domain);
    const preResetSnapshot = JSON.parse(JSON.stringify(state0.domain));

    const state1 = appReducer(state0, { type: 'resetToEmpty' });
    expect(state1.domain.tasks).toEqual([]);

    const state2 = appReducer(state1, { type: 'undo' });
    expect(state2.domain).toEqual(preResetSnapshot);
  });

  it('undo after resetToSeed restores the exact prior domain', () => {
    const task = makeTask('T1', { startDate: '2026-06-01', endDate: '2026-06-10' });
    const domain = emptyDomain({ tasks: [task] });
    const state0 = makeState(domain);
    const preResetSnapshot = JSON.parse(JSON.stringify(state0.domain));

    const state1 = appReducer(state0, { type: 'resetToSeed' });
    expect(state1.domain.tasks.length).toBeGreaterThan(1);

    const state2 = appReducer(state1, { type: 'undo' });
    expect(state2.domain).toEqual(preResetSnapshot);
  });
});

// ---------------------------------------------------------------------------
// 2. JSON round-trip
// ---------------------------------------------------------------------------

describe('WP1 — JSON backup export/import round-trip', () => {
  it('buildBackupEnvelope produces version 3 and the correct wrapper shape', () => {
    const domain = emptyDomain({ tasks: [makeTask('T1')] });
    const envelope = buildBackupEnvelope(domain);
    expect(envelope.version).toBe(3);
    expect(BACKUP_VERSION).toBe(3);
    expect(typeof envelope.exportedAt).toBe('string');
    expect(envelope.state).toBe(domain);
  });

  it('import of an exported payload yields a domain deep-equal to the original', () => {
    const domain = emptyDomain({
      tasks: [makeTask('T1', { assignees: ['P1'] })],
      risks: [makeRisk('R1', { linkedDependencyIds: ['D1'] })],
      externalDependencies: [makeExtDep('D1')],
      deliverables: [makeDeliverable('DL1')],
    });
    const envelope = buildBackupEnvelope(domain);
    const raw = JSON.stringify(envelope);

    const result = parseBackupImport(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.domain).toEqual(domain);
    }
  });

  it('hydrateFromJson dispatch applies the imported domain and undo restores the original', () => {
    const original = emptyDomain({ tasks: [makeTask('T1')] });
    const state0 = makeState(original);
    const imported = emptyDomain({ tasks: [makeTask('T2'), makeTask('T3')] });

    const state1 = appReducer(state0, { type: 'hydrateFromJson', domain: imported });
    expect(state1.domain.tasks.map((t) => t.id)).toEqual(['T2', 'T3']);

    const state2 = appReducer(state1, { type: 'undo' });
    expect(state2.domain.tasks.map((t) => t.id)).toEqual(['T1']);
  });

  it('rejects payloads with the wrong version', () => {
    const domain = emptyDomain();
    const envelope = { version: 2, exportedAt: '2026-01-01T00:00:00.000Z', state: domain };
    const result = parseBackupImport(JSON.stringify(envelope));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('version');
    }
  });

  it('rejects malformed JSON without producing a domain', () => {
    const result = parseBackupImport('{not valid json');
    expect(result.ok).toBe(false);
  });

  it('rejects a payload missing an expected register array', () => {
    const domain = emptyDomain() as unknown as Record<string, unknown>;
    delete domain.risks;
    const envelope = { version: 3, exportedAt: '2026-01-01T00:00:00.000Z', state: domain };
    const result = parseBackupImport(JSON.stringify(envelope));
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Nav switcher / view state
// ---------------------------------------------------------------------------

describe('WP2 — setViewMode across all six views', () => {
  const modes: AppState['view']['mode'][] = [
    'timeline', 'board', 'riskRegister', 'raidBoard', 'extDepRegister', 'deliverableRegister',
  ];

  it.each(modes)('setViewMode switches to %s', (mode) => {
    const state0 = makeState(emptyDomain());
    const state1 = appReducer(state0, { type: 'setViewMode', mode });
    expect(state1.view.mode).toBe(mode);
  });
});

describe('WP4 — riskSummaryCollapsed toggles and persists', () => {
  it('setRiskSummaryCollapsed toggles the view flag', () => {
    const state0 = makeState(emptyDomain());
    expect(state0.view.riskSummaryCollapsed).toBe(false);

    const state1 = appReducer(state0, { type: 'setRiskSummaryCollapsed', value: true });
    expect(state1.view.riskSummaryCollapsed).toBe(true);

    const state2 = appReducer(state1, { type: 'setRiskSummaryCollapsed', value: false });
    expect(state2.view.riskSummaryCollapsed).toBe(false);
  });

  it('persists across a save/load round-trip', () => {
    localStorage.clear();
    const state0 = makeState(emptyDomain(), { riskSummaryCollapsed: true });
    saveAppState(state0);
    const loaded = loadAppState();
    expect(loaded.view.riskSummaryCollapsed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Persistence guard
// ---------------------------------------------------------------------------

describe('WP4 — persistence: riskSummaryCollapsed guard', () => {
  beforeEach(() => localStorage.clear());

  it('legacy state missing riskSummaryCollapsed hydrates to false', () => {
    const legacyView = {
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
      // riskSummaryCollapsed intentionally omitted — simulates a pre-v0.17 record
    };
    const envelope = {
      version: 9,
      state: { domain: migrateDomainForTest({}), view: legacyView },
    };
    localStorage.setItem('ripple_state_v9', JSON.stringify(envelope));

    const loaded = loadAppState();
    expect(loaded.view.riskSummaryCollapsed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Purity — no wall-clock leaks
// ---------------------------------------------------------------------------

describe('WP1 — purity', () => {
  it('resetToEmpty is deterministic given the same starting state', () => {
    const domain = emptyDomain({ tasks: [makeTask('T1')] });
    const stateA = appReducer(makeState(domain), { type: 'resetToEmpty' });
    const stateB = appReducer(makeState(domain), { type: 'resetToEmpty' });
    expect(stateA.domain).toEqual(stateB.domain);
  });

  it('hydrateFromJson is deterministic given the same payload', () => {
    const domain = emptyDomain({ tasks: [makeTask('T1')] });
    const payload = emptyDomain({ tasks: [makeTask('T2')] });
    const stateA = appReducer(makeState(domain), { type: 'hydrateFromJson', domain: payload });
    const stateB = appReducer(makeState(domain), { type: 'hydrateFromJson', domain: payload });
    expect(stateA.domain).toEqual(stateB.domain);
  });

  it('downloadBackup names the file from the provided today string, not the wall clock', () => {
    const domain = emptyDomain();
    let capturedFilename = '';
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'download', {
          configurable: true,
          set(v: string) { capturedFilename = v; },
          get() { return capturedFilename; },
        });
      }
      return el;
    });
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();

    downloadBackup(domain, '2026-01-15');
    expect(capturedFilename).toBe('ripple-2026-01-15.json');

    downloadBackup(domain, '1999-12-31');
    expect(capturedFilename).toBe('ripple-1999-12-31.json');

    createElementSpy.mockRestore();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });
});
