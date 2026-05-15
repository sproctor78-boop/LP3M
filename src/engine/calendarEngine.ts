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
