// =============================================================================
// Date utilities
// =============================================================================
// All dates are ISO 'YYYY-MM-DD' strings. All arithmetic is anchored to UTC
// midnight so timezone changes never shift a task by a day.
// =============================================================================

export const ONE_DAY_MS = 86_400_000;

export function parseISO(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toISO(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(value: string, days: number): string {
  const date = parseISO(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toISO(date);
}

/** Days from `start` to `end` (end - start). Negative if end is before start. */
export function diffDays(start: string, end: string): number {
  return Math.round((parseISO(end).getTime() - parseISO(start).getTime()) / ONE_DAY_MS);
}

export function formatNice(value: string | null | undefined): string {
  if (!value) return '—';
  return parseISO(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatShort(value: string | null | undefined): string {
  if (!value) return '—';
  return parseISO(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** Returns 0–6 with 0=Sunday, 1=Monday, ... 6=Saturday. */
export function dayOfWeek(value: string): number {
  return parseISO(value).getUTCDay();
}

export function isWeekend(value: string): boolean {
  const dow = dayOfWeek(value);
  return dow === 0 || dow === 6;
}

/** Today's date in 'YYYY-MM-DD' (uses local time, intentionally). */
export function todayISO(): string {
  return toISO(new Date());
}

/** Earliest of two ISO dates. */
export function minDate(a: string, b: string): string {
  return a < b ? a : b;
}

/** Latest of two ISO dates. */
export function maxDate(a: string, b: string): string {
  return a > b ? a : b;
}
