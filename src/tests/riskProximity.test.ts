import { describe, expect, it } from 'vitest';
import { getProximityFromDate, PROXIMITY_BANDS, Proximity } from '../domain/risk';

function daysFromToday(days: number, today: Date): Date {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d;
}

describe('getProximityFromDate', () => {
  const today = new Date('2026-05-18T12:00:00Z');

  it('0 days → Imminent', () => {
    expect(getProximityFromDate(daysFromToday(0, today), today)).toBe('Imminent');
  });

  it('30 days → Imminent (boundary)', () => {
    expect(getProximityFromDate(daysFromToday(30, today), today)).toBe('Imminent');
  });

  it('31 days → NearTerm (boundary)', () => {
    expect(getProximityFromDate(daysFromToday(31, today), today)).toBe('NearTerm');
  });

  it('91 days → NearTerm (boundary)', () => {
    expect(getProximityFromDate(daysFromToday(91, today), today)).toBe('NearTerm');
  });

  it('92 days → MediumTerm (boundary)', () => {
    expect(getProximityFromDate(daysFromToday(92, today), today)).toBe('MediumTerm');
  });

  it('365 days → MediumTerm (boundary)', () => {
    expect(getProximityFromDate(daysFromToday(365, today), today)).toBe('MediumTerm');
  });

  it('366 days → LongTerm (boundary)', () => {
    expect(getProximityFromDate(daysFromToday(366, today), today)).toBe('LongTerm');
  });

  it('negative (past date) → Imminent', () => {
    expect(getProximityFromDate(daysFromToday(-10, today), today)).toBe('Imminent');
  });
});

describe('PROXIMITY_BANDS', () => {
  it('has exactly 4 keys', () => {
    expect(Object.keys(PROXIMITY_BANDS)).toHaveLength(4);
  });

  it('all keys are valid Proximity values', () => {
    const valid: Proximity[] = ['Imminent', 'NearTerm', 'MediumTerm', 'LongTerm'];
    valid.forEach((k) => {
      expect(PROXIMITY_BANDS).toHaveProperty(k);
    });
  });

  it('each band has a label and months string', () => {
    (['Imminent', 'NearTerm', 'MediumTerm', 'LongTerm'] as Proximity[]).forEach((k) => {
      expect(typeof PROXIMITY_BANDS[k].label).toBe('string');
      expect(typeof PROXIMITY_BANDS[k].months).toBe('string');
    });
  });
});
