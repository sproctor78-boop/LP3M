// =============================================================================
// Calendar engine
// =============================================================================
// Scaffolding for working-day arithmetic. At this stage the schedule engine
// does not yet skip weekends or holidays; these helpers exist so that future
// versions can opt in without changing call sites elsewhere.
// =============================================================================

import { WorkingCalendar } from '../domain/types';
import { addDays, isWeekend } from './dateUtils';

export function isHoliday(date: string, calendar: WorkingCalendar): boolean {
  return calendar.holidays.includes(date);
}

export function isWorkingDay(date: string, calendar: WorkingCalendar): boolean {
  if (isWeekend(date)) return false;
  if (isHoliday(date, calendar)) return false;
  return true;
}

/**
 * Advance `startDate` by `days` working days. Returns startDate unchanged when
 * days <= 0. Note: this is not yet wired into the schedule engine — it is here
 * for future use so working-calendar logic can be added in one place.
 */
export function addWorkingDays(startDate: string, days: number, calendar: WorkingCalendar): string {
  if (days <= 0) return startDate;
  let current = startDate;
  let remaining = days;
  while (remaining > 0) {
    current = addDays(current, 1);
    if (isWorkingDay(current, calendar)) remaining -= 1;
  }
  return current;
}
