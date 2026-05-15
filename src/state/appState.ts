import { AppState, ViewMode, WorkItem } from '../domain/types';
import { deepCopyTasks } from '../engine/dependencyEngine';
import { forecast } from '../engine/forecastEngine';
import { recomputeSchedule } from '../engine/scheduleEngine';

export type AppAction =
  | { type: 'setViewMode'; mode: ViewMode }
  | { type: 'setZoom'; value: number }
  | { type: 'toggleCritical' }
  | { type: 'selectTask'; taskId: string | null; openDrawer?: boolean }
  | { type: 'closeDrawer' }
  | { type: 'previewTaskDates'; taskId: string; startDate: string; endDate: string }
  | { type: 'applyForecast' }
  | { type: 'cancelForecast' }
  | { type: 'moveTaskStatus'; taskId: string; status: string }
  | { type: 'updateTask'; taskId: string; patch: Partial<WorkItem> }
  | { type: 'toggleParent'; taskId: string }
  | { type: 'replaceState'; state: AppState };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'setViewMode':
      return { ...state, view: { ...state.view, mode: action.mode } };
    case 'setZoom':
      return { ...state, view: { ...state.view, timelineZoomPxPerDay: action.value } };
    case 'toggleCritical':
      return { ...state, view: { ...state.view, showCritical: !state.view.showCritical } };
    case 'selectTask':
      return { ...state, view: { ...state.view, selectedTaskId: action.taskId, drawerOpen: action.openDrawer ?? state.view.drawerOpen } };
    case 'closeDrawer':
      return { ...state, view: { ...state.view, drawerOpen: false } };
    case 'previewTaskDates': {
      const result = forecast(state.domain.tasks, { taskId: action.taskId, newStartDate: action.startDate, newEndDate: action.endDate });
      return { ...state, pendingForecast: result, view: { ...state.view, selectedTaskId: action.taskId, drawerOpen: false } };
    }
    case 'applyForecast': {
      if (!state.pendingForecast) return state;
      return {
        ...state,
        domain: { ...state.domain, tasks: state.pendingForecast.proposedTasks },
        pendingForecast: null
      };
    }
    case 'cancelForecast':
      return { ...state, pendingForecast: null };
    case 'moveTaskStatus': {
      const tasks = state.domain.tasks.map((task) => task.id === action.taskId ? { ...task, status: action.status } : task);
      return { ...state, domain: { ...state.domain, tasks } };
    }
    case 'updateTask': {
      const tasks = deepCopyTasks(state.domain.tasks).map((task) => task.id === action.taskId ? { ...task, ...action.patch } : task);
      return { ...state, domain: { ...state.domain, tasks: recomputeSchedule(tasks) } };
    }
    case 'toggleParent':
      return {
        ...state,
        view: {
          ...state.view,
          expandedParents: {
            ...state.view.expandedParents,
            [action.taskId]: !state.view.expandedParents[action.taskId]
          }
        }
      };
    case 'replaceState':
      return action.state;
    default:
      return state;
  }
}
