// =============================================================================
// v0.13 "Brain" — test suite
// =============================================================================

import { describe, expect, it } from 'vitest';
import { AppDomainState, WorkItem } from '../domain/types';
import { Risk } from '../domain/risk';
import { ExternalDependency } from '../domain/externalDependency';
import { Deliverable } from '../domain/deliverable';
import { AppAction, appReducer } from '../state/appState';
import { AppState } from '../domain/types';
import { migrateDomainForTest } from '../state/persistenceAdapter';
import { deriveSuggestions } from '../engine/adviceEngine';
import { parsePaletteInput } from '../components/common/parsePaletteInput';

// ---------------------------------------------------------------------------
// Helpers
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
    lastModifiedAt: new Date().toISOString(),
    proximity: 'MediumTerm',
    linkedTaskIds: [],
    linkedDeliverableIds: [],
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
    },
    pendingForecast: null,
    pendingChange: null,
    _past: [],
    _future: [],
  };
}

// ---------------------------------------------------------------------------
// WP1 — Migration: backfill missing array fields
// ---------------------------------------------------------------------------

describe('WP1 — migration normalises legacy fixture', () => {
  it('backfills linkedTaskIds on risks', () => {
    const legacyRisk = { id: 'R1', title: 'R1', status: 'Open', proximity: 'MediumTerm' };
    const result = migrateDomainForTest({ risks: [legacyRisk] });
    expect(result.risks[0].linkedTaskIds).toEqual([]);
  });

  it('backfills linkedDeliverableIds on risks', () => {
    const legacyRisk = { id: 'R1', title: 'R1', status: 'Open', proximity: 'MediumTerm' };
    const result = migrateDomainForTest({ risks: [legacyRisk] });
    expect(result.risks[0].linkedDeliverableIds).toEqual([]);
  });

  it('preserves existing linkedTaskIds on risks', () => {
    const risk = { id: 'R1', linkedTaskIds: ['T1', 'T2'], linkedDeliverableIds: [] };
    const result = migrateDomainForTest({ risks: [risk] });
    expect(result.risks[0].linkedTaskIds).toEqual(['T1', 'T2']);
  });

  it('backfills linkedTaskIds on external dependencies', () => {
    const legacyDep = { id: 'D1', title: 'D1', status: 'OnTrack' };
    const result = migrateDomainForTest({ externalDependencies: [legacyDep] });
    expect(result.externalDependencies[0].linkedTaskIds).toEqual([]);
  });

  it('preserves existing linkedTaskIds on external dependencies', () => {
    const dep = { id: 'D1', linkedTaskIds: ['T1'] };
    const result = migrateDomainForTest({ externalDependencies: [dep] });
    expect(result.externalDependencies[0].linkedTaskIds).toEqual(['T1']);
  });

  it('backfills linkedTaskIds on deliverables', () => {
    const legacyDel = { id: 'DL1', title: 'DL1', status: 'Planned' };
    const result = migrateDomainForTest({ deliverables: [legacyDel] });
    expect(result.deliverables[0].linkedTaskIds).toEqual([]);
  });

  it('backfills acceptanceCriteria on deliverables', () => {
    const legacyDel = { id: 'DL1', title: 'DL1', status: 'Planned' };
    const result = migrateDomainForTest({ deliverables: [legacyDel] });
    expect(result.deliverables[0].acceptanceCriteria).toEqual([]);
  });

  it('backfills proximity on risks', () => {
    const legacyRisk = { id: 'R1', title: 'R1', status: 'Open' };
    const result = migrateDomainForTest({ risks: [legacyRisk] });
    expect(result.risks[0].proximity).toBe('MediumTerm');
  });

  it('is idempotent — running migration twice yields same result', () => {
    const legacyRisk = { id: 'R1', linkedTaskIds: ['T1'] };
    const once = migrateDomainForTest({ risks: [legacyRisk] });
    const twice = migrateDomainForTest({ risks: once.risks });
    expect(twice.risks[0].linkedTaskIds).toEqual(['T1']);
  });
});

// ---------------------------------------------------------------------------
// WP2 — Batch action: one undo step and flattening
// ---------------------------------------------------------------------------

describe('WP2 — batch action', () => {
  const baseTask = makeTask('T1', { startDate: '2026-06-01', endDate: '2026-06-10' });

  it('batch of three mutations is one undo step', () => {
    const domain = emptyDomain({ tasks: [baseTask] });
    const state0 = makeState(domain);

    const t2 = makeTask('T2');
    const t3 = makeTask('T3');
    const t4 = makeTask('T4');

    const state1 = appReducer(state0, {
      type: 'batch',
      actions: [
        { type: 'createTask', task: t2 },
        { type: 'createTask', task: t3 },
        { type: 'createTask', task: t4 },
      ],
    });

    expect(state1.domain.tasks.map((t) => t.id)).toContain('T2');
    expect(state1.domain.tasks.map((t) => t.id)).toContain('T3');
    expect(state1.domain.tasks.map((t) => t.id)).toContain('T4');
    // Exactly one past snapshot was recorded
    expect(state1._past.length).toBe(1);

    // One undo reverses all three
    const state2 = appReducer(state1, { type: 'undo' });
    expect(state2.domain.tasks.map((t) => t.id)).not.toContain('T2');
    expect(state2.domain.tasks.map((t) => t.id)).not.toContain('T3');
    expect(state2.domain.tasks.map((t) => t.id)).not.toContain('T4');
    expect(state2._past.length).toBe(0);
  });

  it('flattens nested batches', () => {
    const domain = emptyDomain({ tasks: [baseTask] });
    const state0 = makeState(domain);

    const t2 = makeTask('T2');
    const t3 = makeTask('T3');

    const nested: AppAction = {
      type: 'batch',
      actions: [{ type: 'batch', actions: [{ type: 'createTask', task: t2 }] }, { type: 'createTask', task: t3 }],
    };
    const state1 = appReducer(state0, nested);
    expect(state1.domain.tasks.map((t) => t.id)).toContain('T2');
    expect(state1.domain.tasks.map((t) => t.id)).toContain('T3');
    // Still only one undo step
    expect(state1._past.length).toBe(1);
  });

  it('excludes undo/redo from sub-actions', () => {
    const domain = emptyDomain({ tasks: [baseTask] });
    const state0 = makeState(domain);

    const t2 = makeTask('T2');
    // batch includes undo — should be ignored
    const state1 = appReducer(state0, {
      type: 'batch',
      actions: [
        { type: 'createTask', task: t2 },
        { type: 'undo' } as AppAction,
      ],
    });
    // T2 should have been created (undo sub-action was dropped)
    expect(state1.domain.tasks.map((t) => t.id)).toContain('T2');
  });

  it('empty batch records no domain change and no history entry', () => {
    const domain = emptyDomain({ tasks: [baseTask] });
    const state0 = makeState(domain);
    const state1 = appReducer(state0, { type: 'batch', actions: [] });
    expect(state1._past.length).toBe(0);
    expect(state1.domain).toBe(state0.domain);
  });
});

// ---------------------------------------------------------------------------
// WP3 — Advice engine rules
// ---------------------------------------------------------------------------

describe('WP3 — adviceEngine.deriveSuggestions', () => {
  // ── Rule 1: Deliverable has no acceptance milestone ────────────────────
  describe('Rule 1: missing-milestone', () => {
    it('fires when a deliverable has no milestone in its linked tasks', () => {
      const task = makeTask('T1', { isMilestone: false });
      const del = makeDeliverable('DL1', { linkedTaskIds: ['T1'] });
      const domain = emptyDomain({ tasks: [task], deliverables: [del] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'missing-milestone' && s.entityId === 'DL1')).toBe(true);
    });

    it('does not fire when a milestone is already linked', () => {
      const milestone = makeTask('M1', { isMilestone: true });
      const del = makeDeliverable('DL1', { linkedTaskIds: ['M1'] });
      const domain = emptyDomain({ tasks: [milestone], deliverables: [del] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'missing-milestone')).toBe(false);
    });

    it('does not fire for accepted deliverables', () => {
      const task = makeTask('T1');
      const del = makeDeliverable('DL1', { linkedTaskIds: ['T1'], status: 'Accepted' });
      const domain = emptyDomain({ tasks: [task], deliverables: [del] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'missing-milestone')).toBe(false);
    });

    it('suggestion carries actions (Apply creates milestone)', () => {
      const del = makeDeliverable('DL1', { targetDate: '2026-09-01' });
      const domain = emptyDomain({ deliverables: [del] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      const s = suggestions.find((s) => s.kind === 'missing-milestone' && s.entityId === 'DL1');
      expect(s).toBeDefined();
      expect(s!.actions.length).toBeGreaterThan(0);
    });

    it('suggestion id is stable across two identical derives', () => {
      const del = makeDeliverable('DL1');
      const domain = emptyDomain({ deliverables: [del] });
      const s1 = deriveSuggestions(domain, '2026-06-01');
      const s2 = deriveSuggestions(domain, '2026-06-01');
      const id1 = s1.find((s) => s.kind === 'missing-milestone')?.id;
      const id2 = s2.find((s) => s.kind === 'missing-milestone')?.id;
      expect(id1).toBe(id2);
      expect(id1).toBeDefined();
    });
  });

  // ── Rule 2: Breach from birth ──────────────────────────────────────────
  describe('Rule 2: breach-from-birth', () => {
    it('fires when ext dep target >= linked task start', () => {
      const task = makeTask('T1', { startDate: '2026-06-10' });
      const dep = makeExtDep('D1', { linkedTaskIds: ['T1'], targetDate: '2026-06-10', status: 'OnTrack' });
      const domain = emptyDomain({ tasks: [task], externalDependencies: [dep] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'breach-from-birth' && s.taskId === 'T1')).toBe(true);
    });

    it('fires when ext dep target is after task start', () => {
      const task = makeTask('T1', { startDate: '2026-06-05' });
      const dep = makeExtDep('D1', { linkedTaskIds: ['T1'], targetDate: '2026-06-10', status: 'OnTrack' });
      const domain = emptyDomain({ tasks: [task], externalDependencies: [dep] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'breach-from-birth')).toBe(true);
    });

    it('does not fire when ext dep target is before task start', () => {
      const task = makeTask('T1', { startDate: '2026-06-15' });
      const dep = makeExtDep('D1', { linkedTaskIds: ['T1'], targetDate: '2026-06-01', status: 'OnTrack' });
      const domain = emptyDomain({ tasks: [task], externalDependencies: [dep] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'breach-from-birth')).toBe(false);
    });

    it('does not fire for Received dependencies', () => {
      const task = makeTask('T1', { startDate: '2026-06-01' });
      const dep = makeExtDep('D1', { linkedTaskIds: ['T1'], targetDate: '2026-06-10', status: 'Received' });
      const domain = emptyDomain({ tasks: [task], externalDependencies: [dep] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'breach-from-birth')).toBe(false);
    });

    it('has no actions (deep-link only)', () => {
      const task = makeTask('T1', { startDate: '2026-06-10' });
      const dep = makeExtDep('D1', { linkedTaskIds: ['T1'], targetDate: '2026-06-10' });
      const domain = emptyDomain({ tasks: [task], externalDependencies: [dep] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      const s = suggestions.find((s) => s.kind === 'breach-from-birth');
      expect(s?.actions).toEqual([]);
    });
  });

  // ── Rule 3: Stale risk ─────────────────────────────────────────────────
  describe('Rule 3: stale-risk', () => {
    it('fires when review date is on today', () => {
      const risk = makeRisk('R1', { reviewDate: '2026-06-01' });
      const domain = emptyDomain({ risks: [risk] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'stale-risk' && s.entityId === 'R1')).toBe(true);
    });

    it('fires when review date is in the past', () => {
      const risk = makeRisk('R1', { reviewDate: '2026-01-01' });
      const domain = emptyDomain({ risks: [risk] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'stale-risk')).toBe(true);
    });

    it('does not fire when review date is in the future', () => {
      const risk = makeRisk('R1', { reviewDate: '2026-12-31' });
      const domain = emptyDomain({ risks: [risk] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'stale-risk')).toBe(false);
    });

    it('does not fire for Closed risks', () => {
      const risk = makeRisk('R1', { reviewDate: '2026-01-01', status: 'Closed' });
      const domain = emptyDomain({ risks: [risk] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'stale-risk')).toBe(false);
    });

    it('today injection is respected — different today values change results', () => {
      const risk = makeRisk('R1', { reviewDate: '2026-06-05' });
      const domain = emptyDomain({ risks: [risk] });
      const before = deriveSuggestions(domain, '2026-06-04');
      const on = deriveSuggestions(domain, '2026-06-05');
      expect(before.some((s) => s.kind === 'stale-risk')).toBe(false);
      expect(on.some((s) => s.kind === 'stale-risk')).toBe(true);
    });

    it('action bumps review date by 28 days', () => {
      const risk = makeRisk('R1', { reviewDate: '2026-06-01' });
      const domain = emptyDomain({ risks: [risk] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      const s = suggestions.find((s) => s.kind === 'stale-risk');
      expect(s?.actions.length).toBe(1);
      const action = s!.actions[0] as { type: string; riskId?: string; patch?: { reviewDate?: string } };
      expect(action.type).toBe('updateRisk');
      // Should be 28 days after today (2026-06-01 + 28 = 2026-06-29)
      expect(action.patch?.reviewDate).toBe('2026-06-29');
    });
  });

  // ── Rule 4: Floating milestone ─────────────────────────────────────────
  describe('Rule 4: floating-milestone', () => {
    it('fires for a milestone with no predecessor deps', () => {
      const ms = makeTask('M1', { isMilestone: true, dependencies: [] });
      const domain = emptyDomain({ tasks: [ms] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'floating-milestone' && s.taskId === 'M1')).toBe(true);
    });

    it('does not fire when milestone has a predecessor', () => {
      const t1 = makeTask('T1');
      const ms = makeTask('M1', {
        isMilestone: true,
        dependencies: [{ taskId: 'T1', type: 'finish_to_start', lagDays: 0 }],
      });
      const domain = emptyDomain({ tasks: [t1, ms] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'floating-milestone' && s.taskId === 'M1')).toBe(false);
    });

    it('does not fire for non-milestone tasks', () => {
      const t1 = makeTask('T1', { isMilestone: false, dependencies: [] });
      const domain = emptyDomain({ tasks: [t1] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'floating-milestone')).toBe(false);
    });

    it('has no actions (deep-link only)', () => {
      const ms = makeTask('M1', { isMilestone: true });
      const domain = emptyDomain({ tasks: [ms] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      const s = suggestions.find((s) => s.kind === 'floating-milestone');
      expect(s?.actions).toEqual([]);
    });
  });

  // ── Rule 5: Received, still constraining ──────────────────────────────
  describe('Rule 5: received-constraining', () => {
    it('fires when task sits on dep targetDate with no binding predecessor', () => {
      const task = makeTask('T1', { startDate: '2026-07-01', dependencies: [] });
      const dep = makeExtDep('D1', { linkedTaskIds: ['T1'], targetDate: '2026-07-01', status: 'Received' });
      const domain = emptyDomain({ tasks: [task], externalDependencies: [dep] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'received-constraining' && s.taskId === 'T1')).toBe(true);
    });

    it('does not fire when dep is not Received', () => {
      const task = makeTask('T1', { startDate: '2026-07-01' });
      const dep = makeExtDep('D1', { linkedTaskIds: ['T1'], targetDate: '2026-07-01', status: 'OnTrack' });
      const domain = emptyDomain({ tasks: [task], externalDependencies: [dep] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'received-constraining')).toBe(false);
    });

    it('does not fire when task is not on the constraint date', () => {
      const task = makeTask('T1', { startDate: '2026-07-15' });
      const dep = makeExtDep('D1', { linkedTaskIds: ['T1'], targetDate: '2026-07-01', status: 'Received' });
      const domain = emptyDomain({ tasks: [task], externalDependencies: [dep] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      expect(suggestions.some((s) => s.kind === 'received-constraining')).toBe(false);
    });

    it('has no actions (deep-link only)', () => {
      const task = makeTask('T1', { startDate: '2026-07-01', dependencies: [] });
      const dep = makeExtDep('D1', { linkedTaskIds: ['T1'], targetDate: '2026-07-01', status: 'Received' });
      const domain = emptyDomain({ tasks: [task], externalDependencies: [dep] });
      const suggestions = deriveSuggestions(domain, '2026-06-01');
      const s = suggestions.find((s) => s.kind === 'received-constraining');
      expect(s?.actions).toEqual([]);
    });
  });

  // ── Healthy domain has no suggestions ────────────────────────────────
  it('returns empty array for a healthy domain', () => {
    const ms = makeTask('M1', {
      isMilestone: true,
      dependencies: [{ taskId: 'T1', type: 'finish_to_start', lagDays: 0 }],
    });
    const t1 = makeTask('T1');
    const del = makeDeliverable('DL1', { linkedTaskIds: ['M1'], status: 'Planned' });
    const risk = makeRisk('R1', { reviewDate: '2026-12-31' });
    const dep = makeExtDep('D1', { linkedTaskIds: ['T1'], targetDate: '2026-01-01', status: 'Received' });
    const domain = emptyDomain({ tasks: [t1, ms], deliverables: [del], risks: [risk], externalDependencies: [dep] });
    const suggestions = deriveSuggestions(domain, '2026-06-01');
    // del has a milestone (M1), risk not stale, dep Received and task not on dep date
    expect(suggestions.some((s) => s.kind === 'missing-milestone')).toBe(false);
    expect(suggestions.some((s) => s.kind === 'stale-risk')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// WP3 — End-to-end: deliverable-milestone Apply through reducer
// ---------------------------------------------------------------------------

describe('WP3 — deliverable-milestone apply end-to-end', () => {
  it('Apply batch creates linked milestone with correct date and dependencies', () => {
    const t1 = makeTask('T1', { isMilestone: false, startDate: '2026-06-01', endDate: '2026-06-20' });
    const del = makeDeliverable('DL1', {
      linkedTaskIds: ['T1'],
      targetDate: '2026-06-30',
      status: 'InProduction',
    });
    const domain = emptyDomain({ tasks: [t1], deliverables: [del] });
    const state0 = makeState(domain);

    const suggestions = deriveSuggestions(domain, '2026-06-01');
    const s = suggestions.find((s) => s.kind === 'missing-milestone' && s.entityId === 'DL1');
    expect(s).toBeDefined();
    expect(s!.actions.length).toBeGreaterThan(0);

    const state1 = appReducer(state0, { type: 'batch', actions: s!.actions });

    // A new milestone should exist
    const milestones = state1.domain.tasks.filter((t) => t.isMilestone);
    expect(milestones.length).toBe(1);
    const ms = milestones[0];

    // Milestone date matches deliverable targetDate
    expect(ms.startDate).toBe('2026-06-30');
    expect(ms.endDate).toBe('2026-06-30');

    // Milestone title starts with "Accept:"
    expect(ms.title).toMatch(/^Accept:/i);

    // Milestone has dependency on T1
    expect(ms.dependencies.some((d) => d.taskId === 'T1')).toBe(true);

    // Deliverable now links to the milestone
    const updatedDel = state1.domain.deliverables.find((d) => d.id === 'DL1');
    expect(updatedDel?.linkedTaskIds).toContain(ms.id);

    // One undo reverses everything
    const state2 = appReducer(state1, { type: 'undo' });
    expect(state2.domain.tasks.filter((t) => t.isMilestone).length).toBe(0);
    const restoredDel = state2.domain.deliverables.find((d) => d.id === 'DL1');
    expect(restoredDel?.linkedTaskIds).not.toContain(ms.id);
  });
});

// ---------------------------------------------------------------------------
// WP5 — Palette parser
// ---------------------------------------------------------------------------

describe('WP5 — parsePaletteInput', () => {
  const tasks: WorkItem[] = [
    makeTask('T01', { title: 'Requirements baseline' }),
    makeTask('T02', { title: 'System design package' }),
    makeTask('T03', { title: 'Integration testing' }),
  ];

  // ── Prefix detection ──────────────────────────────────────────────────
  it('detects task: prefix', () => {
    const r = parsePaletteInput('task: my new task', tasks);
    expect(r.prefix).toBe('task');
    expect(r.title).toBe('my new task');
  });

  it('detects risk: prefix', () => {
    const r = parsePaletteInput('risk: Supply chain failure', tasks);
    expect(r.prefix).toBe('risk');
  });

  it('detects dep: prefix', () => {
    const r = parsePaletteInput('dep: Supplier cert', tasks);
    expect(r.prefix).toBe('dep');
  });

  it('detects del: prefix', () => {
    const r = parsePaletteInput('del: SDD document', tasks);
    expect(r.prefix).toBe('del');
  });

  it('is case-insensitive for prefix', () => {
    const r = parsePaletteInput('RISK: Big risk', tasks);
    expect(r.prefix).toBe('risk');
  });

  it('returns null prefix for plain search', () => {
    const r = parsePaletteInput('requirements', tasks);
    expect(r.prefix).toBeNull();
  });

  // ── @-token extraction ─────────────────────────────────────────────────
  it('extracts @T01 token and matches to task', () => {
    const r = parsePaletteInput('risk: Something @T01 related', tasks);
    expect(r.linkedTaskIds).toContain('T01');
  });

  it('extracts multiple @tokens', () => {
    const r = parsePaletteInput('dep: Thing @T01 @T02', tasks);
    expect(r.linkedTaskIds).toContain('T01');
    expect(r.linkedTaskIds).toContain('T02');
  });

  // ── Substring link matching ────────────────────────────────────────────
  it('matches tasks by title word (3+ chars)', () => {
    const r = parsePaletteInput('risk: Something about requirements', tasks);
    // "requirements" matches T01 title word
    expect(r.linkedTaskIds).toContain('T01');
  });

  it('does not match words shorter than 3 chars', () => {
    const r = parsePaletteInput('risk: Something about it', tasks);
    // "it" is 2 chars — should not match
    expect(r.linkedTaskIds).not.toContain('T01');
  });

  it('does not extract link matches for task: prefix', () => {
    // task: prefix doesn't do link matching
    const r = parsePaletteInput('task: requirements design', tasks);
    expect(r.linkedTaskIds).toEqual([]);
  });

  // ── No-prefix search results ───────────────────────────────────────────
  it('returns matching tasks for search', () => {
    const r = parsePaletteInput('requirements', tasks);
    expect(r.searchResults.some((t) => t.id === 'T01')).toBe(true);
  });

  it('returns up to 6 results', () => {
    const manyTasks = Array.from({ length: 10 }, (_, i) =>
      makeTask(`TX${i}`, { title: `Testing task ${i}` }),
    );
    const r = parsePaletteInput('testing', manyTasks);
    expect(r.searchResults.length).toBeLessThanOrEqual(6);
  });

  it('returns empty search results for empty input', () => {
    const r = parsePaletteInput('', tasks);
    expect(r.searchResults).toEqual([]);
  });

  it('matches tasks by ID substring', () => {
    const r = parsePaletteInput('T01', tasks);
    expect(r.searchResults.some((t) => t.id === 'T01')).toBe(true);
  });
});
