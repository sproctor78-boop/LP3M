export const ONE_DAY = 86_400_000;

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

export function diffDays(start: string, end: string): number {
  return Math.round((parseISO(end).getTime() - parseISO(start).getTime()) / ONE_DAY);
}

export function formatNice(value?: string | null): string {
  if (!value) return '—';
  return parseISO(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

export function formatShort(value?: string | null): string {
  if (!value) return '—';
  return parseISO(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC'
  });
}

export function dayOfWeek(value: string): number {
  return parseISO(value).getUTCDay();
}

export function isWeekend(value: string): boolean {
  const day = dayOfWeek(value);
  return day === 0 || day === 6;
}

export function clampDateOrder(startDate: string, endDate: string): { startDate: string; endDate: string } {
  if (diffDays(startDate, endDate) < 0) return { startDate, endDate: startDate };
  return { startDate, endDate };
}
