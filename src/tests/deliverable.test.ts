// =============================================================================
// Deliverables — domain, state, and seed integrity tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  getCompletionPercentage,
  canBeAccepted,
  isOverdue,
  getDeliverablesReadyForAcceptance,
  Deliverable,
  AcceptanceCriterion,
} from '../domain/deliverable';
import { seedDeliverables } from '../domain/deliverableSeedData';
import { createInitialAppState } from '../state/persistenceAdapter';
import { appReducer } from '../state/appState';

const TODAY = '2026-05-18';

// ---------------------------------------------------------------------------
// getCompletionPercentage
// ---------------------------------------------------------------------------
describe('getCompletionPercentage', () => {
  it('returns 0 for empty criteria list', () => {
    const d = makeDeliverable([]);
    expect(getCompletionPercentage(d)).toBe(0);
  });

  it('returns 0 when no criteria are met', () => {
    const d = makeDeliverable([makeCriterion(false), makeCriterion(false)]);
    expect(getCompletionPercentage(d)).toBe(0);
  });

  it('returns 100 when all criteria are met', () => {
    const d = makeDeliverable([makeCriterion(true), makeCriterion(true)]);
    expect(getCompletionPercentage(d)).toBe(100);
  });

  it('rounds to nearest integer (2/3 = 67)', () => {
    const d = makeDeliverable([makeCriterion(true), makeCriterion(true), makeCriterion(false)]);
    expect(getCompletionPercentage(d)).toBe(67);
  });

  it('rounds to nearest integer (1/3 = 33)', () => {
    const d = makeDeliverable([makeCriterion(true), makeCriterion(false), makeCriterion(false)]);
    expect(getCompletionPercentage(d)).toBe(33);
  });
});

// ---------------------------------------------------------------------------
// canBeAccepted
// ---------------------------------------------------------------------------
describe('canBeAccepted', () => {
  it('returns false for empty criteria list', () => {
    const d = makeDeliverable([]);
    expect(canBeAccepted(d)).toBe(false);
  });

  it('returns false when any criterion is unmet', () => {
    const d = makeDeliverable([makeCriterion(true), makeCriterion(false)]);
    expect(canBeAccepted(d)).toBe(false);
  });

  it('returns true when all criteria are met', () => {
    const d = makeDeliverable([makeCriterion(true), makeCriterion(true)]);
    expect(canBeAccepted(d)).toBe(true);
  });

  it('returns true with a single met criterion', () => {
    const d = makeDeliverable([makeCriterion(true)]);
    expect(canBeAccepted(d)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isOverdue
// ---------------------------------------------------------------------------
describe('isOverdue', () => {
  it('returns true when targetDate is before today and status is not Accepted', () => {
    const d = makeDeliverable([], { targetDate: '2026-05-17', status: 'InProduction' });
    expect(isOverdue(d, TODAY)).toBe(true);
  });

  it('returns false when targetDate is today', () => {
    const d = makeDeliverable([], { targetDate: TODAY, status: 'InProduction' });
    expect(isOverdue(d, TODAY)).toBe(false);
  });

  it('returns false when targetDate is in the future', () => {
    const d = makeDeliverable([], { targetDate: '2026-06-01', status: 'InProduction' });
    expect(isOverdue(d, TODAY)).toBe(false);
  });

  it('returns false when status is Accepted even if past target date', () => {
    const d = makeDeliverable([], { targetDate: '2026-04-01', status: 'Accepted' });
    expect(isOverdue(d, TODAY)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getDeliverablesReadyForAcceptance
// ---------------------------------------------------------------------------
describe('getDeliverablesReadyForAcceptance', () => {
  it('returns empty array when none qualify', () => {
    const deliverables = [
      makeDeliverable([makeCriterion(true)], { status: 'Planned' }),
      makeDeliverable([], { status: 'InReview' }),
    ];
    expect(getDeliverablesReadyForAcceptance(deliverables)).toHaveLength(0);
  });

  it('returns InReview deliverable with all criteria met', () => {
    const d = makeDeliverable([makeCriterion(true)], { status: 'InReview' });
    const result = getDeliverablesReadyForAcceptance([d]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(d);
  });

  it('excludes InReview with unmet criteria', () => {
    const d = makeDeliverable([makeCriterion(true), makeCriterion(false)], { status: 'InReview' });
    expect(getDeliverablesReadyForAcceptance([d])).toHaveLength(0);
  });

  it('excludes InReview with empty criteria', () => {
    const d = makeDeliverable([], { status: 'InReview' });
    expect(getDeliverablesReadyForAcceptance([d])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Seed data integrity
// ---------------------------------------------------------------------------
describe('seed data integrity', () => {
  const seeds = seedDeliverables();

  it('produces 6 deliverables', () => {
    expect(seeds).toHaveLength(6);
  });

  it('all deliverable IDs are unique', () => {
    const ids = seeds.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all statuses are valid DeliverableStatus values', () => {
    const valid = new Set(['Planned', 'InProduction', 'InReview', 'Accepted', 'Rejected']);
    seeds.forEach((d) => {
      expect(valid.has(d.status)).toBe(true);
    });
  });

  it('DL01 is InReview with all criteria met (ready for acceptance)', () => {
    const dl01 = seeds.find((d) => d.id === 'DL01')!;
    expect(dl01.status).toBe('InReview');
    expect(canBeAccepted(dl01)).toBe(true);
  });

  it('DL04 is Accepted and has acceptedAt timestamp', () => {
    const dl04 = seeds.find((d) => d.id === 'DL04')!;
    expect(dl04.status).toBe('Accepted');
    expect(dl04.acceptedAt).toBeTruthy();
    expect(dl04.acceptedBy).toBeTruthy();
  });

  it('DL05 is Rejected and has rejectionReason', () => {
    const dl05 = seeds.find((d) => d.id === 'DL05')!;
    expect(dl05.status).toBe('Rejected');
    expect(dl05.rejectedAt).toBeTruthy();
    expect(dl05.rejectionReason).toBeTruthy();
  });

  it('DL06 is overdue as of TODAY (targetDate 2026-05-15 < 2026-05-18)', () => {
    const dl06 = seeds.find((d) => d.id === 'DL06')!;
    expect(isOverdue(dl06, TODAY)).toBe(true);
  });

  it('DL04 is not overdue (Accepted)', () => {
    const dl04 = seeds.find((d) => d.id === 'DL04')!;
    expect(isOverdue(dl04, TODAY)).toBe(false);
  });

  it('getDeliverablesReadyForAcceptance returns exactly DL01', () => {
    const ready = getDeliverablesReadyForAcceptance(seeds);
    expect(ready).toHaveLength(1);
    expect(ready[0].id).toBe('DL01');
  });

  it('all acceptanceCriteria have required fields', () => {
    seeds.forEach((d) => {
      d.acceptanceCriteria.forEach((c) => {
        expect(typeof c.id).toBe('string');
        expect(typeof c.description).toBe('string');
        expect(typeof c.met).toBe('boolean');
      });
    });
  });
});

// ---------------------------------------------------------------------------
// State — CRUD via appReducer
// ---------------------------------------------------------------------------
describe('appReducer — deliverable CRUD', () => {
  const base = createInitialAppState();

  it('initial state includes seed deliverables', () => {
    expect(base.domain.deliverables.length).toBeGreaterThan(0);
  });

  it('addDeliverable appends a new record', () => {
    const newDeliv = makeDeliverable([makeCriterion(false)], { id: 'TEST01' });
    const next = appReducer(base, { type: 'addDeliverable', deliverable: newDeliv });
    const found = next.domain.deliverables.find((d) => d.id === 'TEST01');
    expect(found).toBeDefined();
    expect(found!.title).toBe('Test Deliverable');
  });

  it('updateDeliverable patches an existing record', () => {
    const target = base.domain.deliverables[0];
    const next = appReducer(base, {
      type: 'updateDeliverable',
      deliverableId: target.id,
      patch: { title: 'Updated Title' },
    });
    const updated = next.domain.deliverables.find((d) => d.id === target.id)!;
    expect(updated.title).toBe('Updated Title');
  });

  it('removeDeliverable removes the record', () => {
    const target = base.domain.deliverables[0];
    const next = appReducer(base, { type: 'removeDeliverable', deliverableId: target.id });
    expect(next.domain.deliverables.find((d) => d.id === target.id)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// State — setDeliverableStatus workflow guards
// ---------------------------------------------------------------------------
describe('appReducer — setDeliverableStatus', () => {
  const base = createInitialAppState();

  it('accepts DL01 (all criteria met, InReview)', () => {
    const next = appReducer(base, {
      type: 'setDeliverableStatus',
      deliverableId: 'DL01',
      status: 'Accepted',
      acceptedBy: 'p.jones',
    });
    const dl01 = next.domain.deliverables.find((d) => d.id === 'DL01')!;
    expect(dl01.status).toBe('Accepted');
    expect(dl01.acceptedAt).toBeTruthy();
    expect(dl01.acceptedBy).toBe('p.jones');
  });

  it('refuses to accept DL02 (not all criteria met)', () => {
    const next = appReducer(base, {
      type: 'setDeliverableStatus',
      deliverableId: 'DL02',
      status: 'Accepted',
    });
    const dl02 = next.domain.deliverables.find((d) => d.id === 'DL02')!;
    expect(dl02.status).toBe('InProduction');
  });

  it('rejects a deliverable and records timestamp and reason', () => {
    const next = appReducer(base, {
      type: 'setDeliverableStatus',
      deliverableId: 'DL01',
      status: 'Rejected',
      rejectionReason: 'Needs more detail in section 3',
    });
    const dl01 = next.domain.deliverables.find((d) => d.id === 'DL01')!;
    expect(dl01.status).toBe('Rejected');
    expect(dl01.rejectedAt).toBeTruthy();
    expect(dl01.rejectionReason).toBe('Needs more detail in section 3');
  });

  it('transitions status to InProduction (re-open) without timestamp side-effects', () => {
    const next = appReducer(base, {
      type: 'setDeliverableStatus',
      deliverableId: 'DL03',
      status: 'InProduction',
    });
    const dl03 = next.domain.deliverables.find((d) => d.id === 'DL03')!;
    expect(dl03.status).toBe('InProduction');
    expect(dl03.acceptedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// State — acceptance criteria actions
// ---------------------------------------------------------------------------
describe('appReducer — acceptance criteria', () => {
  const base = createInitialAppState();

  it('addAcceptanceCriterion appends a criterion', () => {
    const criterion = makeCriterion(false, 'NEW-AC1');
    const next = appReducer(base, {
      type: 'addAcceptanceCriterion',
      deliverableId: 'DL01',
      criterion,
    });
    const dl01 = next.domain.deliverables.find((d) => d.id === 'DL01')!;
    expect(dl01.acceptanceCriteria.find((c) => c.id === 'NEW-AC1')).toBeDefined();
  });

  it('updateAcceptanceCriterion patches a criterion', () => {
    const criterion = makeCriterion(false, 'UPDT-AC1');
    const withCrit = appReducer(base, {
      type: 'addAcceptanceCriterion',
      deliverableId: 'DL03',
      criterion,
    });
    const next = appReducer(withCrit, {
      type: 'updateAcceptanceCriterion',
      deliverableId: 'DL03',
      criterionId: 'UPDT-AC1',
      patch: { description: 'Updated description' },
    });
    const dl03 = next.domain.deliverables.find((d) => d.id === 'DL03')!;
    const c = dl03.acceptanceCriteria.find((ac) => ac.id === 'UPDT-AC1')!;
    expect(c.description).toBe('Updated description');
  });

  it('removeAcceptanceCriterion removes a criterion', () => {
    const criterion = makeCriterion(false, 'REM-AC1');
    const withCrit = appReducer(base, {
      type: 'addAcceptanceCriterion',
      deliverableId: 'DL03',
      criterion,
    });
    const next = appReducer(withCrit, {
      type: 'removeAcceptanceCriterion',
      deliverableId: 'DL03',
      criterionId: 'REM-AC1',
    });
    const dl03 = next.domain.deliverables.find((d) => d.id === 'DL03')!;
    expect(dl03.acceptanceCriteria.find((c) => c.id === 'REM-AC1')).toBeUndefined();
  });

  it('markCriterionMet sets met=true and records metAt', () => {
    const targetId = base.domain.deliverables.find((d) => d.id === 'DL03')!
      .acceptanceCriteria[0].id;
    const next = appReducer(base, {
      type: 'markCriterionMet',
      deliverableId: 'DL03',
      criterionId: targetId,
    });
    const dl03 = next.domain.deliverables.find((d) => d.id === 'DL03')!;
    const c = dl03.acceptanceCriteria.find((ac) => ac.id === targetId)!;
    expect(c.met).toBe(true);
    expect(c.metAt).toBeTruthy();
  });

  it('markCriterionUnmet clears met and metAt', () => {
    const targetId = base.domain.deliverables.find((d) => d.id === 'DL01')!
      .acceptanceCriteria[0].id;
    const next = appReducer(base, {
      type: 'markCriterionUnmet',
      deliverableId: 'DL01',
      criterionId: targetId,
    });
    const dl01 = next.domain.deliverables.find((d) => d.id === 'DL01')!;
    const c = dl01.acceptanceCriteria.find((ac) => ac.id === targetId)!;
    expect(c.met).toBe(false);
    expect(c.metAt).toBeNull();
  });

  it('reorderAcceptanceCriteria changes the order', () => {
    const dl01 = base.domain.deliverables.find((d) => d.id === 'DL01')!;
    const originalIds = dl01.acceptanceCriteria.map((c) => c.id);
    const reversed = [...originalIds].reverse();
    const next = appReducer(base, {
      type: 'reorderAcceptanceCriteria',
      deliverableId: 'DL01',
      orderedIds: reversed,
    });
    const reordered = next.domain.deliverables.find((d) => d.id === 'DL01')!;
    expect(reordered.acceptanceCriteria.map((c) => c.id)).toEqual(reversed);
  });
});

// ---------------------------------------------------------------------------
// State — selectDeliverable view actions
// ---------------------------------------------------------------------------
describe('appReducer — selectDeliverable', () => {
  const base = createInitialAppState();

  it('sets selectedDeliverableId', () => {
    const next = appReducer(base, {
      type: 'selectDeliverable',
      deliverableId: 'DL01',
      openDrawer: true,
    });
    expect(next.view.selectedDeliverableId).toBe('DL01');
    expect(next.view.drawerOpen).toBe(true);
  });

  it('clears selectedTaskId when a deliverable is selected', () => {
    const withTask = appReducer(base, {
      type: 'selectTask',
      taskId: base.domain.tasks[0].id,
      openDrawer: true,
    });
    const next = appReducer(withTask, {
      type: 'selectDeliverable',
      deliverableId: 'DL01',
      openDrawer: true,
    });
    expect(next.view.selectedTaskId).toBeNull();
    expect(next.view.selectedDeliverableId).toBe('DL01');
  });

  it('clears selectedDeliverableId on removeDeliverable', () => {
    const selected = appReducer(base, {
      type: 'selectDeliverable',
      deliverableId: 'DL01',
      openDrawer: true,
    });
    const next = appReducer(selected, {
      type: 'removeDeliverable',
      deliverableId: 'DL01',
    });
    expect(next.view.selectedDeliverableId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _criterionCounter = 0;
function makeCriterion(met: boolean, id?: string): AcceptanceCriterion {
  _criterionCounter++;
  return {
    id: id ?? `TEST-AC${_criterionCounter}`,
    description: 'Test criterion',
    met,
    metAt: met ? '2026-05-01T00:00:00.000Z' : null,
    metBy: met ? 'system' : null,
  };
}

function makeDeliverable(
  criteria: AcceptanceCriterion[],
  overrides: Partial<Deliverable> = {},
): Deliverable {
  return {
    id: overrides.id ?? 'TEST-DL',
    title: 'Test Deliverable',
    description: '',
    owner: 'P01',
    targetDate: '2026-07-01',
    status: overrides.status ?? 'Planned',
    acceptanceCriteria: criteria,
    linkedTaskIds: [],
    notes: '',
    acceptedAt: null,
    acceptedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    lastReviewedAt: '2026-05-01T00:00:00.000Z',
    createdAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}
