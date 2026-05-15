import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayOfWeek,
  diffDays,
  isWeekend,
  maxDate,
  minDate,
  parseISO,
  toISO,
} from '../engine/dateUtils';

describe('dateUtils', () => {
  it('parseISO + toISO round-trip is stable', () => {
    expect(toISO(parseISO('2026-04-13'))).toBe('2026-04-13');
    expect(toISO(parseISO('2026-12-31'))).toBe('2026-12-31');
    expect(toISO(parseISO('2026-01-01'))).toBe('2026-01-01');
  });

  it('addDays crosses month boundary correctly', () => {
    expect(addDays('2026-04-30', 1)).toBe('2026-05-01');
    expect(addDays('2026-05-01', -1)).toBe('2026-04-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('addDays handles leap year correctly', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('diffDays returns correct positive and negative deltas', () => {
    expect(diffDays('2026-04-13', '2026-04-17')).toBe(4);
    expect(diffDays('2026-04-17', '2026-04-13')).toBe(-4);
    expect(diffDays('2026-04-13', '2026-04-13')).toBe(0);
    expect(diffDays('2026-04-30', '2026-05-01')).toBe(1);
  });

  it('dayOfWeek returns 0..6 (Sun..Sat)', () => {
    // 2026-04-13 is a Monday
    expect(dayOfWeek('2026-04-13')).toBe(1);
    // 2026-04-18 is a Saturday
    expect(dayOfWeek('2026-04-18')).toBe(6);
    // 2026-04-19 is a Sunday
    expect(dayOfWeek('2026-04-19')).toBe(0);
  });

  it('isWeekend matches Sat/Sun', () => {
    expect(isWeekend('2026-04-18')).toBe(true);
    expect(isWeekend('2026-04-19')).toBe(true);
    expect(isWeekend('2026-04-20')).toBe(false);
    expect(isWeekend('2026-04-17')).toBe(false);
  });

  it('minDate / maxDate compare lexically (ISO-safe)', () => {
    expect(minDate('2026-04-13', '2026-04-17')).toBe('2026-04-13');
    expect(maxDate('2026-04-13', '2026-04-17')).toBe('2026-04-17');
  });
});
