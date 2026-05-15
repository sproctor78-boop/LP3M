import { describe, expect, it } from 'vitest';
import { seedTasks } from '../domain/seedData';
import { forecast } from '../engine/forecastEngine';

describe('forecast engine', () => {
  it('returns impact categories for a proposed move', () => {
    const result = forecast(seedTasks(), { taskId: 'T03', newStartDate: '2026-05-01', newEndDate: '2026-05-08' });
    expect(result?.impactCategories.length).toBeGreaterThan(0);
  });
});
