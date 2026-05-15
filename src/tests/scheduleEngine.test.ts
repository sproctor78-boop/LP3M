import { describe, expect, it } from 'vitest';
import { seedTasks } from '../domain/seedData';
import { forecast } from '../engine/forecastEngine';

describe('schedule engine', () => {
  it('marks at least one task as critical', () => {
    const tasks = seedTasks();
    expect(tasks.some((task) => task.criticalPath)).toBe(true);
  });

  it('forecasts downstream movement when installation moves', () => {
    const tasks = seedTasks();
    const result = forecast(tasks, { taskId: 'T06', newStartDate: '2026-05-24', newEndDate: '2026-06-04' });
    expect(result).not.toBeNull();
    expect(result?.linkedTasks.length).toBeGreaterThan(0);
  });
});
