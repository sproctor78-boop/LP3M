import { useMemo } from 'react';
import { TimelineWindow, WorkingCalendar } from '../../domain/types';
import {
  addDays,
  dayOfWeek,
  isWeekend,
  parseISO,
  todayISO,
} from '../../engine/dateUtils';

interface Props {
  window: TimelineWindow;
  dayWidth: number;
  calendar: WorkingCalendar;
}

interface MonthGroup {
  key: string;
  label: string;
  days: number;
}

export function TimelineHeader({ window, dayWidth, calendar }: Props) {
  const totalWidth = window.totalDays * dayWidth;

  // Label density driven by dayWidth
  const showEveryDay = dayWidth >= 24;
  const showMondays = dayWidth >= 10 && !showEveryDay;
  const showMonthOnly = dayWidth >= 5 && !showEveryDay && !showMondays;

  const { months, dayCells } = useMemo(() => {
    const groups: MonthGroup[] = [];
    const cells: { date: string; label: string }[] = [];
    let cursor = window.start;
    while (cursor <= window.end) {
      const date = parseISO(cursor);
      const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
      let group = groups.find((g) => g.key === key);
      if (!group) {
        const fmt: Intl.DateTimeFormatOptions =
          dayWidth >= 8
            ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
            : dayWidth >= 4
              ? { month: 'short', year: '2-digit', timeZone: 'UTC' }
              : { month: 'short', timeZone: 'UTC' };
        group = { key, label: date.toLocaleDateString('en-GB', fmt), days: 0 };
        groups.push(group);
      }
      group.days += 1;

      // Day cell label
      let cellLabel = '';
      if (showEveryDay) {
        cellLabel = String(date.getUTCDate());
      } else if (showMondays) {
        cellLabel = dayOfWeek(cursor) === 1 ? String(date.getUTCDate()) : '';
      } else if (showMonthOnly) {
        cellLabel = date.getUTCDate() === 1 ? '1' : '';
      } else if (date.getUTCDate() === 1 && date.getUTCMonth() % 3 === 0) {
        cellLabel = `Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
      }

      cells.push({ date: cursor, label: cellLabel });
      cursor = addDays(cursor, 1);
    }
    return { months: groups, dayCells: cells };
  }, [window.start, window.end, dayWidth, showEveryDay, showMondays, showMonthOnly]);

  const today = todayISO();
  const holidaySet = new Set(calendar.holidays);

  return (
    <div className="timeline-headers" style={{ width: totalWidth }}>
      <div className="timeline-header-row months" style={{ width: totalWidth }}>
        {months.map((group) => (
          <div
            key={group.key}
            className="timeline-header-cell month"
            style={{ width: group.days * dayWidth }}
          >
            {group.label}
          </div>
        ))}
      </div>
      <div className="timeline-header-row" style={{ width: totalWidth }}>
        {dayCells.map((cell) => {
          const classes = ['timeline-header-cell'];
          if (isWeekend(cell.date)) classes.push('weekend');
          if (holidaySet.has(cell.date)) classes.push('holiday');
          if (cell.date === today) classes.push('today');
          return (
            <div
              key={cell.date}
              className={classes.join(' ')}
              style={{ width: dayWidth }}
            >
              {cell.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
