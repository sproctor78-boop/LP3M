// =============================================================================
// Timeline layout engine
// =============================================================================
// Pure computation of which groups and rows the timeline should render, with
// their Y positions and heights. Dependency lines and forecast ghosts can be
// drawn directly from this layout — no DOM measurement required.
// =============================================================================

import {
  AppState,
  GroupBy,
  TimelineWindow,
  WorkItem,
} from '../../domain/types';
import { addDays, diffDays, dayOfWeek } from '../../engine/dateUtils';

/** CSS row height tokens, kept in sync with layout.css. */
export const ROW_HEIGHTS = {
  normal: 44,
  subtask: 36,
  summary: 44,
  swimlaneLabel: 32,
} as const;

/** Header row heights (month + day), kept in sync with layout.css. */
export const HEADER_HEIGHTS = {
  month: 28,
  day: 24,
} as const;

export const TOTAL_HEADER_HEIGHT = HEADER_HEIGHTS.month + HEADER_HEIGHTS.day;

export interface LayoutRow {
  type: 'task' | 'summary';
  taskId: string; // for summary rows, the group key
  task: WorkItem | null; // null for synthetic summary rows
  /** Y offset from the top of the timeline grid (under the headers). */
  y: number;
  height: number;
  /** Y centre, used for dependency line endpoints. */
  centreY: number;
  /** True if this row represents a subtask under an expanded parent. */
  isSubtask: boolean;
}

export interface LayoutGroup {
  key: string;
  label: string;
  taskCount: number;
  collapsed: boolean;
  /** Y offset of the swimlane label, from the top of the grid. */
  labelY: number;
  /** All visible rows in this group. Empty if collapsed (summary row sits inside the group). */
  rows: LayoutRow[];
  /** For collapsed groups, the synthetic summary row used to render a single bar. */
  summaryRow: LayoutRow | null;
}

export interface TimelineLayout {
  groups: LayoutGroup[];
  /** Total grid height after the headers. */
  totalHeight: number;
  /** Map from task ID to its row's centre Y, used by dependency lines. */
  taskCentreY: Map<string, number>;
}

/**
 * Compute the timeline window: earliest start - 7 days back, latest end + 14 forward,
 * snapped to Monday/Sunday for clean week edges.
 */
export function computeTimelineWindow(state: AppState): TimelineWindow {
  const tasks = state.domain.tasks;
  const fc = state.pendingForecast;

  let minDate = '9999-12-31';
  let maxDate = '0000-01-01';

  tasks.forEach((t) => {
    if (t.startDate < minDate) minDate = t.startDate;
    if (t.endDate > maxDate) maxDate = t.endDate;
  });
  if (fc) {
    fc.proposedTasks.forEach((t) => {
      if (t.startDate < minDate) minDate = t.startDate;
      if (t.endDate > maxDate) maxDate = t.endDate;
    });
  }

  // Fall back to today if no tasks
  if (minDate === '9999-12-31') {
    const today = new Date().toISOString().slice(0, 10);
    minDate = today;
    maxDate = today;
  }

  let start = addDays(minDate, -7);
  // Snap back to Monday
  while (dayOfWeek(start) !== 1) start = addDays(start, -1);
  let end = addDays(maxDate, 14);
  // Snap forward to Sunday
  while (dayOfWeek(end) !== 0) end = addDays(end, 1);

  return { start, end, totalDays: diffDays(start, end) + 1 };
}

function groupKeyOf(task: WorkItem, groupBy: GroupBy, defaultSwimlane: string, defaultStatus: string): string {
  if (groupBy === 'parent') return task.parentId ? task.parentId : '__top';
  if (groupBy === 'status') return task.status || defaultStatus;
  if (groupBy === 'none') return '__all';
  return task.swimlane || defaultSwimlane;
}

function groupLabelOf(
  key: string,
  groupBy: GroupBy,
  state: AppState,
): string {
  if (groupBy === 'parent') {
    if (key === '__top') return 'Top level';
    return state.domain.tasks.find((t) => t.id === key)?.title ?? key;
  }
  if (groupBy === 'status') {
    return state.domain.columns.find((c) => c.key === key)?.label ?? key;
  }
  if (groupBy === 'none') return 'All tasks';
  return state.domain.swimlanes.find((s) => s.key === key)?.label ?? key;
}

function groupSortIndex(key: string, groupBy: GroupBy, state: AppState): number {
  if (groupBy === 'swimlane') {
    const i = state.domain.swimlanes.findIndex((s) => s.key === key);
    return i < 0 ? 999 : i;
  }
  if (groupBy === 'status') {
    const i = state.domain.columns.findIndex((c) => c.key === key);
    return i < 0 ? 999 : i;
  }
  if (groupBy === 'parent') {
    if (key === '__top') return -1;
    return state.domain.tasks.findIndex((t) => t.id === key);
  }
  return 0;
}

export function computeTimelineLayout(state: AppState): TimelineLayout {
  const { groupBy, expandedParents, collapsedGroups } = state.view;
  const defaultSwimlane = state.domain.swimlanes[0]?.key ?? '';
  const defaultStatus = state.domain.columns[0]?.key ?? '';

  // Use proposed tasks during preview, otherwise live tasks
  const baseTasks = state.pendingForecast
    ? state.pendingForecast.proposedTasks
    : state.domain.tasks;

  // Hide children whose parent is collapsed
  const visibleTasks = baseTasks.filter((t) => {
    if (!t.parentId) return true;
    return expandedParents[t.parentId] !== false; // default expanded
  }).filter((t) => {
    if (!state.view.milestonesOnly) return true;
    return t.isMilestone;
  });

  // Group
  const groupMap = new Map<string, WorkItem[]>();
  visibleTasks.forEach((t) => {
    const key = groupKeyOf(t, groupBy, defaultSwimlane, defaultStatus);
    const list = groupMap.get(key) ?? [];
    list.push(t);
    groupMap.set(key, list);
  });

  // Sort group keys
  const sortedKeys = Array.from(groupMap.keys()).sort(
    (a, b) => groupSortIndex(a, groupBy, state) - groupSortIndex(b, groupBy, state),
  );

  const groups: LayoutGroup[] = [];
  const taskCentreY = new Map<string, number>();
  let cursor = 0;

  sortedKeys.forEach((key) => {
    const tasks = groupMap.get(key) ?? [];
    const collapsed = !!collapsedGroups[key];
    const labelY = cursor;
    cursor += ROW_HEIGHTS.swimlaneLabel;

    if (collapsed) {
      // Single summary row representing the group's date span
      const leaves = tasks.filter((t) => !t.isParent);
      const sourceTasks = leaves.length ? leaves : tasks;
      const minStart = sourceTasks.reduce(
        (m, t) => (t.startDate < m ? t.startDate : m),
        sourceTasks[0]?.startDate ?? '0000-01-01',
      );
      const maxEnd = sourceTasks.reduce(
        (m, t) => (t.endDate > m ? t.endDate : m),
        sourceTasks[0]?.endDate ?? '0000-01-01',
      );
      const summaryRow: LayoutRow = {
        type: 'summary',
        taskId: key,
        task: {
          id: key,
          title: `${groupLabelOf(key, groupBy, state)} — ${leaves.length || tasks.length} task${(leaves.length || tasks.length) === 1 ? '' : 's'}`,
          status: '',
          startDate: minStart,
          endDate: maxEnd,
          durationDays: Math.max(1, diffDays(minStart, maxEnd) + 1),
          isMilestone: false,
          locked: false,
          swimlane: '',
          percentComplete: 0,
          parentId: null,
          isParent: false,
          assignees: [],
          dependencies: [],
          constraint: null,
        },
        y: cursor,
        height: ROW_HEIGHTS.summary,
        centreY: cursor + ROW_HEIGHTS.summary / 2,
        isSubtask: false,
      };
      cursor += ROW_HEIGHTS.summary;
      groups.push({
        key,
        label: groupLabelOf(key, groupBy, state),
        taskCount: tasks.filter((t) => !t.isParent).length,
        collapsed: true,
        labelY,
        rows: [],
        summaryRow,
      });
    } else {
      const rows: LayoutRow[] = tasks.map((task) => {
        const height = task.parentId ? ROW_HEIGHTS.subtask : ROW_HEIGHTS.normal;
        const row: LayoutRow = {
          type: 'task',
          taskId: task.id,
          task,
          y: cursor,
          height,
          centreY: cursor + height / 2,
          isSubtask: !!task.parentId,
        };
        taskCentreY.set(task.id, row.centreY);
        cursor += height;
        return row;
      });
      groups.push({
        key,
        label: groupLabelOf(key, groupBy, state),
        taskCount: tasks.filter((t) => !t.isParent).length,
        collapsed: false,
        labelY,
        rows,
        summaryRow: null,
      });
    }
  });

  return { groups, totalHeight: cursor, taskCentreY };
}
