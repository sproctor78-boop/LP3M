import { describe, expect, it } from 'vitest';
import { forecast } from '../engine/forecastEngine';
import { seedTasks } from '../domain/seedData';

describe('forecastEngine', () => {
  it('shifting T02 finish later shifts every downstream task', () => {
    const tasks = seedTasks();
    const t02 = tasks.find((t) => t.id === 'T02')!;
    const result = forecast(tasks, {
      taskId: t02.id,
      newStartDate: t02.startDate,
      newEndDate: '2026-05-04', // 7 days later than original 2026-04-27
    });
    expect(result).not.toBeNull();
    const movedIds = new Set(result!.affectedTasks.map((a) => a.taskId));
    // T03, T04, T05, T06, T07, T08, T09 should all move; T10 is locked so stays.
    ['T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T09'].forEach((id) =>
      expect(movedIds.has(id)).toBe(true),
    );
    expect(movedIds.has('T10')).toBe(false);
  });

  it('shifting T02 later triggers a must_finish_on breach on T10', () => {
    const tasks = seedTasks();
    const t02 = tasks.find((t) => t.id === 'T02')!;
    const result = forecast(tasks, {
      taskId: t02.id,
      newStartDate: t02.startDate,
      newEndDate: '2026-05-04',
    });
    expect(result).not.toBeNull();
    // T10 is locked at 2026-06-24, so we expect a dependency_conflict breach (its predecessor T09
    // now finishes past T10's locked start).
    const t10Breach = result!.constraintBreaches.find((b) => b.taskId === 'T10');
    expect(t10Breach).toBeDefined();
    expect(result!.impactCategories.includes('constraint_breach')).toBe(true);
  });

  it('shifting T01 earlier produces no downstream movement', () => {
    const tasks = seedTasks();
    const t01 = tasks.find((t) => t.id === 'T01')!;
    const result = forecast(tasks, {
      taskId: t01.id,
      newStartDate: '2026-04-06',
      newEndDate: '2026-04-10',
    });
    expect(result).not.toBeNull();
    // No downstream task NEEDS to move; everything is pulled by deps from above.
    // The engine accepts T01's earlier dates without changing anyone else's.
    expect(result!.affectedTasks.length).toBe(0);
    expect(result!.impactCategories.includes('local_impact')).toBe(true);
  });

  it('forecastShiftDays matches the change in project finish', () => {
    const tasks = seedTasks();
    const t02 = tasks.find((t) => t.id === 'T02')!;
    const result = forecast(tasks, {
      taskId: t02.id,
      newStartDate: t02.startDate,
      newEndDate: '2026-05-04',
    });
    expect(result).not.toBeNull();
    // T10 is locked at 2026-06-24, so its bar stays put — but T09 now finishes
    // at 2026-06-29, which is 5 days past T10. The project finish therefore
    // moves to 2026-06-29 (the latest endDate across all tasks), and a
    // dependency_conflict breach surfaces on T10.
    expect(result!.forecastShiftDays).toBe(5);
    expect(result!.newProjectFinish).toBe('2026-06-29');
    expect(
      result!.constraintBreaches.some((b) => b.taskId === 'T10'),
    ).toBe(true);
  });
});
