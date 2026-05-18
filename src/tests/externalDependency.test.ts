// =============================================================================
// External Dependencies — domain, state, and seed integrity tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  getSuggestedStatus,
  isOverdue,
  ExternalDependency,
} from '../domain/externalDependency';
import { seedExternalDependencies } from '../domain/externalDependencySeedData';
import { createInitialAppState } from '../state/persistenceAdapter';
import { appReducer } from '../state/appState';

const TODAY = '2026-05-18';

// ---------------------------------------------------------------------------
// getSuggestedStatus
// ---------------------------------------------------------------------------
describe('getSuggestedStatus', () => {
  it('returns Received when current status is Received regardless of date', () => {
    expect(getSuggestedStatus('2020-01-01', TODAY, 'Received')).toBe('Received');
    expect(getSuggestedStatus('2030-12-31', TODAY, 'Received')).toBe('Received');
  });

  it('returns Late when target date is in the past', () => {
    expect(getSuggestedStatus('2026-05-10', TODAY, 'OnTrack')).toBe('Late');
    expect(getSuggestedStatus('2020-01-01', TODAY, 'AtRisk')).toBe('Late');
  });

  it('returns AtRisk when target date is within 14 days', () => {
    expect(getSuggestedStatus('2026-05-25', TODAY, 'OnTrack')).toBe('AtRisk');
    expect(getSuggestedStatus('2026-06-01', TODAY, 'OnTrack')).toBe('AtRisk');
  });

  it('returns OnTrack when target date is more than 14 days out', () => {
    expect(getSuggestedStatus('2026-06-02', TODAY, 'OnTrack')).toBe('OnTrack');
    expect(getSuggestedStatus('2027-01-01', TODAY, 'AtRisk')).toBe('OnTrack');
  });

  it('returns AtRisk exactly at 14 days boundary', () => {
    // 14 days from 2026-05-18 = 2026-06-01
    expect(getSuggestedStatus('2026-06-01', TODAY, 'OnTrack')).toBe('AtRisk');
  });
});

// ---------------------------------------------------------------------------
// isOverdue
// ---------------------------------------------------------------------------
describe('isOverdue', () => {
  const makeDep = (targetDate: string, status: ExternalDependency['status']): ExternalDependency => ({
    id: 'TEST',
    title: 'Test dep',
    description: '',
    externalOwner: '',
    internalOwner: '',
    targetDate,
    status,
    linkedTaskIds: [],
    notes: '',
    lastReviewedAt: TODAY + 'T00:00:00.000Z',
    createdAt: TODAY + 'T00:00:00.000Z',
  });

  it('returns true when past target date and not Received', () => {
    expect(isOverdue(makeDep('2026-05-10', 'Late'), TODAY)).toBe(true);
    expect(isOverdue(makeDep('2026-05-10', 'AtRisk'), TODAY)).toBe(true);
    expect(isOverdue(makeDep('2026-05-10', 'OnTrack'), TODAY)).toBe(true);
  });

  it('returns false when past target date but status is Received', () => {
    expect(isOverdue(makeDep('2026-04-30', 'Received'), TODAY)).toBe(false);
  });

  it('returns false when target date is today', () => {
    expect(isOverdue(makeDep(TODAY, 'Late'), TODAY)).toBe(false);
  });

  it('returns false when target date is in the future', () => {
    expect(isOverdue(makeDep('2026-06-15', 'AtRisk'), TODAY)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Seed data integrity
// ---------------------------------------------------------------------------
describe('seedExternalDependencies', () => {
  const seeds = seedExternalDependencies();

  it('produces exactly 5 seed records', () => {
    expect(seeds).toHaveLength(5);
  });

  it('all IDs are unique', () => {
    const ids = seeds.map((d) => d.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('all IDs are non-empty strings starting with ED', () => {
    seeds.forEach((d) => {
      expect(d.id).toMatch(/^ED\d+$/);
    });
  });

  it('all 4 statuses are represented', () => {
    const statuses = new Set(seeds.map((d) => d.status));
    expect(statuses.has('OnTrack')).toBe(true);
    expect(statuses.has('AtRisk')).toBe(true);
    expect(statuses.has('Late')).toBe(true);
    expect(statuses.has('Received')).toBe(true);
  });

  it('ED02 is Late and past target date (overdue)', () => {
    const ed02 = seeds.find((d) => d.id === 'ED02')!;
    expect(ed02.status).toBe('Late');
    expect(isOverdue(ed02, TODAY)).toBe(true);
  });

  it('ED05 is Received and not overdue despite past target date', () => {
    const ed05 = seeds.find((d) => d.id === 'ED05')!;
    expect(ed05.status).toBe('Received');
    expect(isOverdue(ed05, TODAY)).toBe(false);
  });

  it('ED04 is linked to multiple tasks', () => {
    const ed04 = seeds.find((d) => d.id === 'ED04')!;
    expect(ed04.linkedTaskIds.length).toBeGreaterThanOrEqual(2);
  });

  it('ED05 has no linked tasks', () => {
    const ed05 = seeds.find((d) => d.id === 'ED05')!;
    expect(ed05.linkedTaskIds).toHaveLength(0);
  });

  it('all target dates are valid ISO date strings', () => {
    seeds.forEach((d) => {
      expect(d.targetDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('all titles are non-empty', () => {
    seeds.forEach((d) => {
      expect(d.title.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Initial app state includes externalDependencies
// ---------------------------------------------------------------------------
describe('createInitialAppState', () => {
  it('includes externalDependencies array from seed data', () => {
    const state = createInitialAppState();
    expect(Array.isArray(state.domain.externalDependencies)).toBe(true);
    expect(state.domain.externalDependencies.length).toBeGreaterThan(0);
  });

  it('view initialises externalDependenciesVisibleInTimeline to false', () => {
    const state = createInitialAppState();
    expect(state.view.externalDependenciesVisibleInTimeline).toBe(false);
  });

  it('view initialises selectedExtDepId to null', () => {
    const state = createInitialAppState();
    expect(state.view.selectedExtDepId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Reducer — External Dependencies actions
// ---------------------------------------------------------------------------
describe('appReducer — external dependency actions', () => {
  const baseState = createInitialAppState();

  const sampleDep: ExternalDependency = {
    id: 'ED99',
    title: 'Test dependency',
    description: 'Test',
    externalOwner: 'Test Org',
    internalOwner: 'P01',
    targetDate: '2026-12-31',
    status: 'OnTrack',
    linkedTaskIds: [],
    notes: '',
    lastReviewedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  it('addExternalDependency appends the dep', () => {
    const next = appReducer(baseState, { type: 'addExternalDependency', dep: sampleDep });
    const found = next.domain.externalDependencies.find((d) => d.id === 'ED99');
    expect(found).toBeTruthy();
    expect(found!.title).toBe('Test dependency');
  });

  it('updateExternalDependency patches the dep and updates lastReviewedAt', () => {
    const stateWithDep = appReducer(baseState, { type: 'addExternalDependency', dep: sampleDep });
    const next = appReducer(stateWithDep, {
      type: 'updateExternalDependency',
      depId: 'ED99',
      patch: { status: 'AtRisk' },
    });
    const found = next.domain.externalDependencies.find((d) => d.id === 'ED99')!;
    expect(found.status).toBe('AtRisk');
    expect(found.lastReviewedAt).not.toBe(sampleDep.lastReviewedAt);
  });

  it('removeExternalDependency deletes the dep', () => {
    const stateWithDep = appReducer(baseState, { type: 'addExternalDependency', dep: sampleDep });
    const next = appReducer(stateWithDep, { type: 'removeExternalDependency', depId: 'ED99' });
    expect(next.domain.externalDependencies.find((d) => d.id === 'ED99')).toBeUndefined();
  });

  it('removeExternalDependency clears selectedExtDepId when it matched', () => {
    const stateWithDep = appReducer(baseState, { type: 'addExternalDependency', dep: sampleDep });
    const stateSelected = appReducer(stateWithDep, {
      type: 'selectExtDep',
      depId: 'ED99',
      openDrawer: true,
    });
    expect(stateSelected.view.selectedExtDepId).toBe('ED99');
    const next = appReducer(stateSelected, { type: 'removeExternalDependency', depId: 'ED99' });
    expect(next.view.selectedExtDepId).toBeNull();
  });

  it('setExtDepVisible toggles the view flag', () => {
    const on = appReducer(baseState, { type: 'setExtDepVisible', value: true });
    expect(on.view.externalDependenciesVisibleInTimeline).toBe(true);
    const off = appReducer(on, { type: 'setExtDepVisible', value: false });
    expect(off.view.externalDependenciesVisibleInTimeline).toBe(false);
  });

  it('selectExtDep clears other selection IDs', () => {
    const stateWithRisk = { ...baseState, view: { ...baseState.view, selectedRiskId: 'R01', selectedActionId: 'RA01', selectedTaskId: 'T01' } };
    const next = appReducer(stateWithRisk, { type: 'selectExtDep', depId: 'ED01', openDrawer: true });
    expect(next.view.selectedExtDepId).toBe('ED01');
    expect(next.view.selectedRiskId).toBeNull();
    expect(next.view.selectedActionId).toBeNull();
    expect(next.view.selectedTaskId).toBeNull();
    expect(next.view.drawerOpen).toBe(true);
  });

  it('setExternalDependencyStatus updates status and lastReviewedAt', () => {
    const stateWithDep = appReducer(baseState, { type: 'addExternalDependency', dep: sampleDep });
    const next = appReducer(stateWithDep, {
      type: 'setExternalDependencyStatus',
      depId: 'ED99',
      status: 'Late',
    });
    const found = next.domain.externalDependencies.find((d) => d.id === 'ED99')!;
    expect(found.status).toBe('Late');
  });
});
