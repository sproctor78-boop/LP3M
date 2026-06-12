import { describe, expect, it } from 'vitest';
import { recomputeSchedule } from '../engine/scheduleEngine';
import { deepCopyTasks } from '../engine/dependencyEngine';
import { seedTasks } from '../domain/seedData';
import { appReducer } from '../state/appState';
import { createInitialAppState } from '../state/persistenceAdapter';
import { WorkItem } from '../domain/types';
import { ExternalDependency } from '../domain/externalDependency';
import { Deliverable } from '../domain/deliverable';
import { Risk } from '../domain/risk';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(id: string, startDate: string, endDate: string): WorkItem {
  return {
    id,
    title: id,
    status: 'todo',
    startDate,
    endDate,
    durationDays: 1,
    isMilestone: false,
    locked: false,
    swimlane: 'default',
    percentComplete: 0,
    parentId: null,
    isParent: false,
    assignees: [],
    dependencies: [],
    constraint: null,
  };
}

function makeExtDep(id: string, taskId: string, targetDate: string, status: ExternalDependency['status'] = 'OnTrack'): ExternalDependency {
  return {
    id,
    title: id,
    description: '',
    externalOwner: '',
    internalOwner: '',
    targetDate,
    status,
    linkedTaskIds: [taskId],
    notes: '',
    lastReviewedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function makeDeliverable(id: string, taskId: string, targetDate: string, status: Deliverable['status'] = 'Planned'): Deliverable {
  return {
    id,
    title: id,
    description: '',
    owner: '',
    targetDate,
    status,
    acceptanceCriteria: [],
    linkedTaskIds: [taskId],
    notes: '',
    acceptedAt: null,
    acceptedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    lastReviewedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function makeRisk(id: string, linkedTaskIds: string[] = [], linkedDeliverableIds: string[] = []): Risk {
  const score = { probabilityPct: 50, probabilityBand: 3 as const, costImpact: 3 as const, timeImpact: 3 as const, score: 9, rag: 'amber' as const };
  return {
    id,
    title: id,
    description: '',
    category: 'Technical',
    owner: '',
    status: 'Open',
    scores: { inherent: score, residual: score, target: score },
    proposedResidualScore: null,
    controls: [],
    mitigations: [],
    raisedDate: '2026-01-01',
    reviewDate: '2026-12-31',
    lastModifiedAt: new Date().toISOString(),
    proximity: 'MediumTerm',
    linkedTaskIds,
    linkedDeliverableIds,
  };
}

// ---------------------------------------------------------------------------
// WP1 + WP3: recomputeSchedule with injected today is deterministic
// ---------------------------------------------------------------------------

describe('recomputeSchedule with injected today', () => {
  it('same inputs + same today produce identical warning flags', () => {
    const tasks = deepCopyTasks(seedTasks());
    const deliverable = makeDeliverable('D_TEST', 'T01', '2026-01-01', 'Planned');
    const today = '2026-06-01';

    const result1 = recomputeSchedule(deepCopyTasks(tasks), [], [deliverable], today);
    const result2 = recomputeSchedule(deepCopyTasks(tasks), [], [deliverable], today);

    const warn1 = result1.map((t) => ({ id: t.id, dw: !!t.deliverableWarning }));
    const warn2 = result2.map((t) => ({ id: t.id, dw: !!t.deliverableWarning }));
    expect(warn1).toEqual(warn2);
  });

  it('changing today across a deliverable targetDate flips deliverableWarning on linked task', () => {
    const task = makeTask('TX', '2026-06-01', '2026-06-05');
    const deliverable = makeDeliverable('D_FLIP', 'TX', '2026-06-10', 'Planned');

    // today before targetDate — not overdue
    const before = recomputeSchedule([{ ...task }], [], [deliverable], '2026-06-09');
    expect(before.find((t) => t.id === 'TX')?.deliverableWarning).toBeFalsy();

    // today after targetDate — overdue
    const after = recomputeSchedule([{ ...task }], [], [deliverable], '2026-06-11');
    expect(after.find((t) => t.id === 'TX')?.deliverableWarning).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// WP2: applyForecast preserves register effects
// ---------------------------------------------------------------------------

describe('applyForecast preserves register effects', () => {
  it('task linked to Late extDep carries forecastWarning after forecast applied', () => {
    const base = createInitialAppState();
    const task = makeTask('T_FORECAST', '2026-06-01', '2026-06-05');
    const extDep = makeExtDep('ED_TEST', 'T_FORECAST', '2026-05-01', 'Late');

    const seeded = appReducer(base, { type: 'createTask', task });
    const withDep = appReducer(seeded, { type: 'addExternalDependency', dep: extDep });

    // Preview moving the task forward by a few days
    const previewed = appReducer(withDep, {
      type: 'previewTaskDates',
      taskId: 'T_FORECAST',
      startDate: '2026-06-10',
      endDate: '2026-06-14',
    });
    const applied = appReducer(previewed, { type: 'applyForecast' });

    const t = applied.domain.tasks.find((x) => x.id === 'T_FORECAST');
    expect(t).toBeDefined();
    // forecastWarning must survive the apply — previously it was silently dropped
    expect(t!.forecastWarning).toBe(true);
  });

  it('task linked to overdue deliverable still carries deliverableWarning after forecast applied', () => {
    const base = createInitialAppState();
    const task = makeTask('T_WARN', '2026-06-01', '2026-06-05');
    const deliverable = makeDeliverable('DL_OLD', 'T_WARN', '2020-01-01', 'Planned');

    const seeded = appReducer(base, { type: 'createTask', task });
    const withDel = appReducer(seeded, { type: 'addDeliverable', deliverable });

    const previewed = appReducer(withDel, {
      type: 'previewTaskDates',
      taskId: 'T_WARN',
      startDate: '2026-06-10',
      endDate: '2026-06-14',
    });
    const applied = appReducer(previewed, { type: 'applyForecast' });

    const t = applied.domain.tasks.find((x) => x.id === 'T_WARN');
    expect(t?.deliverableWarning).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// WP3: referential integrity for risks
// ---------------------------------------------------------------------------

describe('deleteTask removes deleted IDs from risks.linkedTaskIds', () => {
  it('risk no longer references a deleted task', () => {
    const base = createInitialAppState();
    const task = makeTask('T_DEL', '2026-06-01', '2026-06-03');
    const risk = makeRisk('R1', ['T_DEL']);

    const s1 = appReducer(base, { type: 'createTask', task });
    const s2 = appReducer(s1, { type: 'createRisk', risk });
    const s3 = appReducer(s2, { type: 'deleteTask', taskId: 'T_DEL' });

    const r = s3.domain.risks.find((x) => x.id === 'R1');
    expect(r).toBeDefined();
    expect(r!.linkedTaskIds).not.toContain('T_DEL');
  });
});

describe('removeDeliverable removes deliverable ID from risks.linkedDeliverableIds', () => {
  it('risk no longer references a removed deliverable', () => {
    const base = createInitialAppState();
    const deliverable = makeDeliverable('DL_RM', 'nonexistent', '2026-12-01');
    const risk = makeRisk('R2', [], ['DL_RM']);

    const s1 = appReducer(base, { type: 'addDeliverable', deliverable });
    const s2 = appReducer(s1, { type: 'createRisk', risk });
    const s3 = appReducer(s2, { type: 'removeDeliverable', deliverableId: 'DL_RM' });

    const r = s3.domain.risks.find((x) => x.id === 'R2');
    expect(r).toBeDefined();
    expect(r!.linkedDeliverableIds).not.toContain('DL_RM');
  });
});

// ---------------------------------------------------------------------------
// WP7: undo / redo round-trip
// ---------------------------------------------------------------------------

describe('undo / redo', () => {
  it('createTask → undo restores prior task array', () => {
    const s0 = createInitialAppState();
    const task = makeTask('T_UND', '2026-06-01', '2026-06-03');
    const s1 = appReducer(s0, { type: 'createTask', task });

    expect(s1.domain.tasks.find((t) => t.id === 'T_UND')).toBeDefined();

    const s2 = appReducer(s1, { type: 'undo' });
    expect(s2.domain.tasks.find((t) => t.id === 'T_UND')).toBeUndefined();
  });

  it('redo reinstates the task after undo', () => {
    const s0 = createInitialAppState();
    const task = makeTask('T_RED', '2026-06-01', '2026-06-03');
    const s1 = appReducer(s0, { type: 'createTask', task });
    const s2 = appReducer(s1, { type: 'undo' });
    const s3 = appReducer(s2, { type: 'redo' });

    expect(s3.domain.tasks.find((t) => t.id === 'T_RED')).toBeDefined();
  });

  it('view-only action (setZoom) creates no history entry', () => {
    const s0 = createInitialAppState();
    const s1 = appReducer(s0, { type: 'setZoom', value: 99 });
    expect(s1._past.length).toBe(0);
  });

  it('undo is a no-op when history is empty', () => {
    const s0 = createInitialAppState();
    const s1 = appReducer(s0, { type: 'undo' });
    expect(s1).toBe(s0);
  });

  it('redo is a no-op when future is empty', () => {
    const s0 = createInitialAppState();
    const s1 = appReducer(s0, { type: 'redo' });
    expect(s1).toBe(s0);
  });

  it('domain mutation after undo clears redo stack', () => {
    const s0 = createInitialAppState();
    const t1 = makeTask('T_A', '2026-06-01', '2026-06-03');
    const t2 = makeTask('T_B', '2026-06-04', '2026-06-06');
    const s1 = appReducer(s0, { type: 'createTask', task: t1 });
    const s2 = appReducer(s1, { type: 'undo' });           // undo → T_A gone, future=[s1.domain]
    const s3 = appReducer(s2, { type: 'createTask', task: t2 }); // new mutation clears future
    expect(s3._future.length).toBe(0);
  });
});
