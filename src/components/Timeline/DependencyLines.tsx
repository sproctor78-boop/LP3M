import { useMemo } from 'react';
import { ForecastResult, WorkItem } from '../../domain/types';
import { addDays, diffDays } from '../../engine/dateUtils';
import { ROW_HEIGHTS } from './layoutEngine';

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

// Horizontal/vertical stub length used when routing around corners.
const STUB = 14;

type Obstacle = { left: number; right: number };

/** True when x falls inside an obstacle's bar X range. */
const hitsX = (obstacles: Obstacle[], x: number) =>
  obstacles.some((o) => x > o.left && x < o.right);

/**
 * Compute obstacles: bars whose row centre is strictly between yLo and yHi,
 * excluding pred and succ themselves.
 */
function obstaclesBetween(
  yLo: number,
  yHi: number,
  predId: string,
  succId: string,
  allTasks: WorkItem[],
  taskCentreY: Map<string, number>,
  xOf: (iso: string) => number,
): Obstacle[] {
  return allTasks
    .filter((t) => {
      if (t.id === predId || t.id === succId || t.isMilestone) return false;
      const cy = taskCentreY.get(t.id);
      return cy != null && cy > yLo && cy < yHi;
    })
    .map((t) => ({ left: xOf(t.startDate), right: xOf(addDays(t.endDate, 1)) }));
}

/**
 * Find a safe X for a vertical routing segment given a preferred starting
 * point. Tries left of obstacles first (keeps the line visually tight),
 * then right (only if it stays left of maxX to avoid crossing the successor).
 * Falls back to the preferred value on unresolvable overlaps.
 */
function safeMidX(
  preferred: number,
  obstacles: Obstacle[],
  xMin: number,
  xMax: number,
): number {
  if (obstacles.length === 0 || !hitsX(obstacles, preferred)) return preferred;

  // Route to the LEFT of all obstacles — visually tight, no successor crossing.
  const leftClear = Math.min(...obstacles.map((o) => o.left)) - STUB;
  if (leftClear >= xMin && !hitsX(obstacles, leftClear)) return leftClear;

  // Route to the RIGHT of all obstacles, but never past the successor start.
  const rightClear = Math.max(...obstacles.map((o) => o.right)) + STUB;
  if (rightClear <= xMax && !hitsX(obstacles, rightClear)) return rightClear;

  return preferred; // extreme overlap — fall back gracefully
}

/**
 * Build the SVG path string for one dependency edge.
 *
 * Scenarios handled:
 *   A) Forward dep, no obstacles in vertical column  → 3-segment L-shape
 *   B) Forward dep, vertical blocked by intermediate bar → relocate midX
 *   C) Loop-back (succ starts before pred ends)     → U-shape via inter-row gap
 *   D) Loop-back with blocked left vertical          → shift left-stub X clear
 */
function buildPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  pred: WorkItem,
  succ: WorkItem,
  allTasks: WorkItem[],
  taskCentreY: Map<string, number>,
  xOf: (iso: string) => number,
): string {
  const arrowX = x2 - 4;
  const yLo = Math.min(y1, y2);
  const yHi = Math.max(y1, y2);

  // ── Case C / D: loop-back ────────────────────────────────────────────────
  if (x2 <= x1) {
    // Route the horizontal through the inter-row gap immediately adjacent to
    // the predecessor (below if succ is below, above if succ is above/same).
    const halfPredRow = pred.parentId
      ? ROW_HEIGHTS.subtask / 2
      : ROW_HEIGHTS.normal / 2;
    const dir = y2 > y1 ? 1 : -1; // positive = succ below pred
    const yMid = y1 + dir * halfPredRow;

    // Left vertical descends from yMid to y2 at x = leftX.
    // Check for bars that could block it in the Y band [yMid, y2].
    const loopY0 = Math.min(yMid, y2);
    const loopY1 = Math.max(yMid, y2);
    const leftObstacles = allTasks
      .filter((t) => {
        if (t.id === pred.id || t.id === succ.id || t.isMilestone) return false;
        const cy = taskCentreY.get(t.id);
        return cy != null && cy > loopY0 && cy < loopY1;
      })
      .map((t) => ({ left: xOf(t.startDate), right: xOf(addDays(t.endDate, 1)) }));

    let leftX = x2 - STUB;
    if (hitsX(leftObstacles, leftX)) {
      const lc = Math.min(...leftObstacles.map((o) => o.left)) - STUB;
      if (!hitsX(leftObstacles, lc)) leftX = lc;
    }

    return (
      `M ${x1} ${y1} ` +
      `L ${x1 + STUB} ${y1} ` +
      `L ${x1 + STUB} ${yMid} ` +
      `L ${leftX} ${yMid} ` +
      `L ${leftX} ${y2} ` +
      `L ${arrowX} ${y2}`
    );
  }

  // ── Case A / B: forward dep ──────────────────────────────────────────────
  // midX is the X coordinate of the vertical segment.
  // Preferred: just left of the successor (clean right-side entry).
  // Constraint: must not fall inside any intermediate bar's X range,
  //             and must not go past x2 (would create a leftward entry crossing succ).
  const obstacles = obstaclesBetween(yLo, yHi, pred.id, succ.id, allTasks, taskCentreY, xOf);
  const preferred = Math.max(x1 + 4, x2 - 10);
  const midX = safeMidX(preferred, obstacles, x1 + 4, x2 - 4);

  return (
    `M ${x1} ${y1} ` +
    `L ${midX} ${y1} ` +
    `L ${midX} ${y2} ` +
    `L ${arrowX} ${y2}`
  );
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

          const d = buildPath(x1, y1, x2, y2, pred, task, tasks, taskCentreY, xOf);
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
