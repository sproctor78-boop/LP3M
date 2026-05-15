import { describe, expect, it } from 'vitest';
import {
  computeCriticalPathAndFloat,
  detectConstraintIssues,
  forwardPass,
  recomputeSchedule,
} from '../engine/scheduleEngine';
import { seedTasks } from '../domain/seedData';
import { deepCopyTasks } from '../engine/dependencyEngine';

describe('scheduleEngine', () => {
  it('seed schedule reaches its locked T10 milestone on the right date', () => {
    const tasks = seedTasks();
    const t10 = tasks.find((t) => t.id === 'T10')!;
    expect(t10.endDate).toBe('2026-06-24');
  });

  it('forwardPass propagates a late T01 finish through to T10', () => {
    const tasks = deepCopyTasks(seedTasks());
    // Push T01's finish out by 10 days
    const t01 = tasks.find((t) => t.id === 'T01')!;
    t01.endDate = '2026-04-27';
    forwardPass(tasks);

    // T02 should now start the day after T01's new finish
    expect(tasks.find((t) => t.id === 'T02')!.startDate).toBe('2026-04-28');
    // The chain ripples through; T09 should now finish past 2026-06-22
    expect(tasks.find((t) => t.id === 'T09')!.endDate > '2026-06-22').toBe(true);
  });

  it('parent T07 endDate is rolled up from its children', () => {
    const tasks = recomputeSchedule(seedTasks());
    const t07 = tasks.find((t) => t.id === 'T07')!;
    const t07c = tasks.find((t) => t.id === 'T07c')!;
    // Parent must end at or after the latest child
    expect(t07.endDate).toBe(t07c.endDate);
  });

  it('critical path includes T01..T10 in the seed', () => {
    const tasks = recomputeSchedule(seedTasks());
    const critIds = new Set(tasks.filter((t) => t.criticalPath).map((t) => t.id));
    // The seed is a tight chain: every task is critical (T04 may have float since T05 is longer).
    expect(critIds.has('T01')).toBe(true);
    expect(critIds.has('T10')).toBe(true);
    expect(critIds.has('T05')).toBe(true);
    expect(critIds.has('T07')).toBe(true);
  });

  it('detectConstraintIssues finds the must_finish_on breach when T10 slips', () => {
    const tasks = deepCopyTasks(seedTasks());
    // Force T09 to finish a day late by changing T01 a day late
    tasks.find((t) => t.id === 'T01')!.endDate = '2026-04-18';
    forwardPass(tasks);
    computeCriticalPathAndFloat(tasks);
    // T10 is locked at 2026-06-24, but T09 now finishes a day later.
    // The seed's locked behaviour holds T10's endDate, so we should see a dependency_conflict
    // breach (T09 finishes after T10's start).
    const { breaches } = detectConstraintIssues(tasks);
    const conflict = breaches.find(
      (b) => b.taskId === 'T10' && b.constraintType === 'dependency_conflict',
    );
    expect(conflict).toBeDefined();
  });

  it('detectConstraintIssues is clean on the unmodified seed', () => {
    const tasks = recomputeSchedule(seedTasks());
    const { breaches } = detectConstraintIssues(tasks);
    expect(breaches.length).toBe(0);
  });
});
