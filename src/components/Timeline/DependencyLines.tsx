import { useMemo } from 'react';
import { ForecastResult, WorkItem } from '../../domain/types';
import { addDays, diffDays } from '../../engine/dateUtils';

interface Props {
  tasks: WorkItem[];
  timelineStart: string;
  dayWidth: number;
  totalWidth: number;
  totalHeight: number;
  showCritical: boolean;
  taskCentreY: Map<string, number>;
  pendingForecast: ForecastResult | null;
  selectedDep: { fromId: string; toId: string } | null;
  onSelectDep: (fromId: string, toId: string, x: number, y: number) => void;
}

interface DepPath {
  fromId: string;
  toId: string;
  d: string;
  arrow: string;
  critical: boolean;
  forecast: boolean;
  selected: boolean;
}

export function DependencyLines({
  tasks,
  timelineStart,
  dayWidth,
  totalWidth,
  totalHeight,
  showCritical,
  taskCentreY,
  pendingForecast,
  selectedDep,
  onSelectDep,
}: Props) {
  const paths = useMemo<DepPath[]>(() => {
    const xOf = (iso: string) => diffDays(timelineStart, iso) * dayWidth;

    return tasks.flatMap((task) =>
      task.dependencies
        .map((dep): DepPath | null => {
          const pred = tasks.find((t) => t.id === dep.taskId);
          if (!pred) return null;
          const y1 = taskCentreY.get(pred.id);
          const y2 = taskCentreY.get(task.id);
          if (y1 == null || y2 == null) return null;

          const x1 = xOf(addDays(pred.endDate, 1));
          const x2 = xOf(task.startDate);
          const midX = x1 + 6;
          const arrowX = x2 - 4;
          const d = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${arrowX} ${y2}`;
          const arrow = `M ${x2 - 5} ${y2 - 3} L ${x2} ${y2} L ${x2 - 5} ${y2 + 3} z`;

          const critical = !!(showCritical && pred.criticalPath && task.criticalPath);
          const forecast = !!(
            pendingForecast &&
            (pendingForecast.affectedTasks.some((a) => a.taskId === task.id) ||
              pendingForecast.changedTaskId === task.id ||
              pendingForecast.changedTaskId === pred.id)
          );
          const selected = !!(
            selectedDep &&
            selectedDep.fromId === pred.id &&
            selectedDep.toId === task.id
          );

          return { fromId: pred.id, toId: task.id, d, arrow, critical, forecast, selected };
        })
        .filter((p): p is DepPath => p !== null),
    );
  }, [tasks, timelineStart, dayWidth, taskCentreY, showCritical, pendingForecast, selectedDep]);

  return (
    <svg
      className="dep-svg"
      width={totalWidth}
      height={totalHeight}
      style={{ width: totalWidth, height: totalHeight }}
      role="presentation"
    >
      {paths.map((p) => {
        const lineClasses = ['dep-line'];
        if (p.selected) lineClasses.push('selected');
        else if (p.critical) lineClasses.push('critical');
        else if (p.forecast) lineClasses.push('forecast');

        const arrowClasses = ['dep-arrow'];
        if (p.selected) arrowClasses.push('selected');
        else if (p.critical) arrowClasses.push('critical');
        else if (p.forecast) arrowClasses.push('forecast');

        return (
          <g key={`${p.fromId}-${p.toId}`}>
            <path
              d={p.d}
              className="dep-hit"
              onClick={(event) => {
                event.stopPropagation();
                onSelectDep(p.fromId, p.toId, event.clientX, event.clientY);
              }}
            />
            <path d={p.d} className={lineClasses.join(' ')} />
            <path d={p.arrow} className={arrowClasses.join(' ')} />
          </g>
        );
      })}
    </svg>
  );
}
