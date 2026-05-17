// =============================================================================
// App state reducer
// =============================================================================
// Handles every transition in the app. Engine work happens through the engine
// modules; the reducer composes them.
// =============================================================================

import {
  AppState,
  DependencyType,
  GroupBy,
  ViewMode,
  WorkItem,
} from '../domain/types';
import {
  addDependency,
  deepCopyTasks,
  removeDependency,
} from '../engine/dependencyEngine';
import { forecast } from '../engine/forecastEngine';
import { recomputeSchedule } from '../engine/scheduleEngine';

export type AppAction =
  // View / chrome
  | { type: 'setViewMode'; mode: ViewMode }
  | { type: 'setZoom'; value: number }
  | { type: 'setGroupBy'; groupBy: GroupBy }
  | { type: 'setTaskListWidth'; value: number }
  | { type: 'toggleCritical' }
  | { type: 'toggleExpandedParent'; taskId: string }
  | { type: 'toggleGroupCollapsed'; key: string }
  | { type: 'selectTask'; taskId: string | null; openDrawer?: boolean }
  | { type: 'openDrawer' }
  | { type: 'closeDrawer' }
  | { type: 'selectDep'; fromId: string; toId: string }
  | { type: 'clearSelectedDep' }
  // Forecast lifecycle
  | { type: 'previewTaskDates'; taskId: string; startDate: string; endDate: string }
  | { type: 'applyForecast' }
  | { type: 'cancelForecast' }
  // Task mutations
  | { type: 'updateTask'; taskId: string; patch: Partial<WorkItem> }
  | { type: 'moveTaskStatus'; taskId: string; status: string }
  | { type: 'moveTaskSwimlane'; taskId: string; swimlane: string }
  | { type: 'setTaskParent'; taskId: string; parentId: string | null }
  | { type: 'convertToParent'; taskId: string }
  | { type: 'deleteTask'; taskId: string }
  | { type: 'createTask'; task: WorkItem }
  // Dependency mutations
  | { type: 'addDependency'; fromId: string; toId: string; depType: DependencyType; lagDays: number }
  | { type: 'updateDependency'; fromId: string; toId: string; depType: DependencyType; lagDays: number }
  | { type: 'removeDependency'; fromId: string; toId: string }
  // Board column mutations
  | { type: 'addColumn' }
  | { type: 'renameColumn'; key: string; label: string }
  | { type: 'deleteColumn'; key: string }
  // Swimlane mutations
  | { type: 'addSwimlane' }
  | { type: 'renameSwimlane'; key: string; label: string }
  | { type: 'deleteSwimlane'; key: string }
  // Calendar
  | { type: 'setWorkingCalendar'; highlightWeekends: boolean; holidays: string[] }
  // Scroll target
  | { type: 'setScrollToTask'; taskId: string | null }
  // Milestone filter
  | { type: 'setMilestonesOnly'; value: boolean };

function withRecomputedTasks(state: AppState, nextTasks: WorkItem[]): AppState {
  return {
    ...state,
    domain: { ...state.domain, tasks: recomputeSchedule(nextTasks) },
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // ------- view / chrome -------
    case 'setViewMode':
      return { ...state, view: { ...state.view, mode: action.mode } };
    case 'setZoom':
      return { ...state, view: { ...state.view, zoom: action.value } };
    case 'setGroupBy':
      return { ...state, view: { ...state.view, groupBy: action.groupBy } };
    case 'setTaskListWidth':
      return { ...state, view: { ...state.view, taskListWidth: action.value } };
    case 'toggleCritical':
      return { ...state, view: { ...state.view, showCritical: !state.view.showCritical } };
    case 'toggleExpandedParent': {
      const current = state.view.expandedParents[action.taskId] !== false;
      return {
        ...state,
        view: {
          ...state.view,
          expandedParents: { ...state.view.expandedParents, [action.taskId]: !current },
        },
      };
    }
    case 'toggleGroupCollapsed': {
      const current = !!state.view.collapsedGroups[action.key];
      return {
        ...state,
        view: {
          ...state.view,
          collapsedGroups: { ...state.view.collapsedGroups, [action.key]: !current },
        },
      };
    }
    case 'selectTask':
      return {
        ...state,
        view: {
          ...state.view,
          selectedTaskId: action.taskId,
          drawerOpen: action.openDrawer ?? state.view.drawerOpen,
          selectedDep: null,
        },
      };
    case 'openDrawer':
      return { ...state, view: { ...state.view, drawerOpen: true } };
    case 'closeDrawer':
      return {
        ...state,
        view: { ...state.view, drawerOpen: false, selectedDep: null },
        // Closing the drawer cancels a pending forecast preview, matching v0.8.
        pendingForecast: null,
        pendingChange: null,
      };
    case 'selectDep':
      return {
        ...state,
        view: { ...state.view, selectedDep: { fromId: action.fromId, toId: action.toId } },
      };
    case 'clearSelectedDep':
      return { ...state, view: { ...state.view, selectedDep: null } };

    // ------- forecast lifecycle -------
    case 'previewTaskDates': {
      const result = forecast(state.domain.tasks, {
        taskId: action.taskId,
        newStartDate: action.startDate,
        newEndDate: action.endDate,
      });
      return {
        ...state,
        pendingForecast: result,
        pendingChange: result
          ? { taskId: action.taskId, newStartDate: action.startDate, newEndDate: action.endDate }
          : null,
        view: { ...state.view, selectedTaskId: action.taskId },
      };
    }
    case 'applyForecast': {
      const fc = state.pendingForecast;
      if (!fc) return state;

      // Take the proposed snapshot (already deep-copied by forecast()).
      const next = fc.proposedTasks.map((t) => ({
        ...t,
        dependencies: t.dependencies.map((d) => ({ ...d })),
        constraint: t.constraint ? { ...t.constraint } : null,
      }));

      // Capture user-target dates before recompute can revert them.
      const userTargetId = fc.changedTaskId;
      const userTarget = next.find((t) => t.id === userTargetId);
      const userStart = userTarget?.startDate;
      const userEnd = userTarget?.endDate;

      // First recompute — does the engine respect the user's dates naturally?
      recomputeSchedule(next);

      if (userTarget && userStart) {
        const after = next.find((t) => t.id === userTargetId);
        if (after && after.startDate !== userStart) {
          // Engine reverted — auto-pin with a hard must_start_on so the user's
          // chosen date holds (predecessors may now show as breaches).
          after.constraint = { type: 'must_start_on', date: userStart, hard: true };
          after.startDate = userStart;
          if (userEnd) after.endDate = userEnd;
          recomputeSchedule(next);
        } else if (
          after?.constraint?.type === 'must_start_on' &&
          after.constraint.hard &&
          after.startDate >= after.constraint.date
        ) {
          // Engine accepted naturally — clear the pin if it's no longer needed.
          after.constraint = null;
          recomputeSchedule(next);
        }
      }

      return {
        ...state,
        domain: { ...state.domain, tasks: next },
        pendingForecast: null,
        pendingChange: null,
      };
    }
    case 'cancelForecast':
      return { ...state, pendingForecast: null, pendingChange: null };

    // ------- task mutations -------
    case 'updateTask': {
      const next = deepCopyTasks(state.domain.tasks).map((t) =>
        t.id === action.taskId ? { ...t, ...action.patch } : t,
      );
      return withRecomputedTasks(state, next);
    }
    case 'moveTaskStatus': {
      // Status moves do not change dates; skip the schedule recompute.
      const next = state.domain.tasks.map((t) =>
        t.id === action.taskId ? { ...t, status: action.status } : t,
      );
      return { ...state, domain: { ...state.domain, tasks: next } };
    }
    case 'moveTaskSwimlane': {
      const next = state.domain.tasks.map((t) =>
        t.id === action.taskId ? { ...t, swimlane: action.swimlane } : t,
      );
      return { ...state, domain: { ...state.domain, tasks: next } };
    }
    case 'setTaskParent': {
      // Cycle guard: walk up the proposed parent chain; if we hit our own id, refuse.
      const taskId = action.taskId;
      const newParentId = action.parentId;
      if (newParentId) {
        let current: string | null = newParentId;
        const seen = new Set<string>();
        while (current && !seen.has(current)) {
          if (current === taskId) return state; // would create a parent loop
          seen.add(current);
          const parent = state.domain.tasks.find((t) => t.id === current);
          current = parent?.parentId ?? null;
        }
      }
      const next = deepCopyTasks(state.domain.tasks).map((t) =>
        t.id === taskId ? { ...t, parentId: newParentId } : t,
      );
      return withRecomputedTasks(state, next);
    }
    case 'convertToParent': {
      const next = deepCopyTasks(state.domain.tasks).map((t) =>
        t.id === action.taskId ? { ...t, isParent: true } : t,
      );
      return {
        ...withRecomputedTasks(state, next),
        view: {
          ...state.view,
          expandedParents: { ...state.view.expandedParents, [action.taskId]: true },
        },
      };
    }
    case 'deleteTask': {
      // Remove the task and any children, plus incoming dependencies.
      const next = deepCopyTasks(state.domain.tasks)
        .filter((t) => t.id !== action.taskId && t.parentId !== action.taskId)
        .map((t) => ({
          ...t,
          dependencies: t.dependencies.filter((d) => d.taskId !== action.taskId),
        }));
      const newSelected =
        state.view.selectedTaskId === action.taskId ? null : state.view.selectedTaskId;
      return {
        ...withRecomputedTasks(state, next),
        view: { ...state.view, selectedTaskId: newSelected, drawerOpen: newSelected !== null && state.view.drawerOpen },
      };
    }
    case 'createTask': {
      const next = [...deepCopyTasks(state.domain.tasks), action.task];
      return withRecomputedTasks(state, next);
    }

    // ------- dependency mutations -------
    case 'addDependency': {
      const next = addDependency(state.domain.tasks, action.fromId, action.toId, action.depType, action.lagDays);
      return withRecomputedTasks(state, next);
    }
    case 'updateDependency': {
      // Same as add — addDependency replaces if one already exists from fromId.
      const next = addDependency(state.domain.tasks, action.fromId, action.toId, action.depType, action.lagDays);
      return withRecomputedTasks(state, next);
    }
    case 'removeDependency': {
      const next = removeDependency(state.domain.tasks, action.fromId, action.toId);
      return {
        ...withRecomputedTasks(state, next),
        view: { ...state.view, selectedDep: null },
      };
    }

    // ------- column mutations -------
    case 'addColumn': {
      const newCol = { key: `col_${Date.now().toString(36)}`, label: 'New column' };
      return { ...state, domain: { ...state.domain, columns: [...state.domain.columns, newCol] } };
    }
    case 'renameColumn': {
      const columns = state.domain.columns.map((c) =>
        c.key === action.key ? { ...c, label: action.label.trim() || c.label } : c,
      );
      return { ...state, domain: { ...state.domain, columns } };
    }
    case 'deleteColumn': {
      if (state.domain.columns.length <= 1) return state;
      const fallback = state.domain.columns.find((c) => c.key !== action.key);
      if (!fallback) return state;
      const columns = state.domain.columns.filter((c) => c.key !== action.key);
      const tasks = state.domain.tasks.map((t) =>
        t.status === action.key ? { ...t, status: fallback.key } : t,
      );
      return { ...state, domain: { ...state.domain, columns, tasks } };
    }

    // ------- swimlane mutations -------
    case 'addSwimlane': {
      const newLane = { key: `lane_${Date.now().toString(36)}`, label: 'New lane' };
      return { ...state, domain: { ...state.domain, swimlanes: [...state.domain.swimlanes, newLane] } };
    }
    case 'renameSwimlane': {
      const swimlanes = state.domain.swimlanes.map((s) =>
        s.key === action.key ? { ...s, label: action.label.trim() || s.label } : s,
      );
      return { ...state, domain: { ...state.domain, swimlanes } };
    }
    case 'deleteSwimlane': {
      if (state.domain.swimlanes.length <= 1) return state;
      const fallback = state.domain.swimlanes.find((s) => s.key !== action.key);
      if (!fallback) return state;
      const swimlanes = state.domain.swimlanes.filter((s) => s.key !== action.key);
      const tasks = state.domain.tasks.map((t) =>
        t.swimlane === action.key ? { ...t, swimlane: fallback.key } : t,
      );
      return { ...state, domain: { ...state.domain, swimlanes, tasks } };
    }

    // ------- calendar -------
    case 'setWorkingCalendar':
      return {
        ...state,
        domain: {
          ...state.domain,
          workingCalendar: { highlightWeekends: action.highlightWeekends, holidays: action.holidays },
        },
      };

    case 'setScrollToTask':
      return { ...state, view: { ...state.view, scrollToTaskId: action.taskId } };
    case 'setMilestonesOnly':
      return { ...state, view: { ...state.view, milestonesOnly: action.value } };

    default: {
      // Exhaustiveness check
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}
