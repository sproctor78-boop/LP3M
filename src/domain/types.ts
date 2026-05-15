export type TaskStatus = 'backlog' | 'in_progress' | 'complete' | string;
export type DependencyType = 'finish_to_start' | 'start_to_start';
export type ConstraintType = 'flexible' | 'must_start_on' | 'must_finish_on' | 'start_no_earlier_than' | 'finish_no_later_than';
export type ViewMode = 'both' | 'board' | 'timeline';
export type GroupBy = 'swimlane' | 'parent' | 'status' | 'none';

export interface Dependency {
  taskId: string;
  type: DependencyType;
  lagDays: number;
}

export interface Constraint {
  type: Exclude<ConstraintType, 'flexible'>;
  date: string;
  hard: boolean;
}

export interface WorkItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  durationDays: number;
  isMilestone: boolean;
  locked: boolean;
  swimlane: string;
  parentId: string | null;
  isParent: boolean;
  isCollapsed?: boolean;
  color?: string | null;
  dependencies: Dependency[];
  constraint: Constraint | null;
  criticalPath?: boolean;
  floatDays?: number;
}

export interface BoardColumn {
  key: string;
  label: string;
}

export interface Swimlane {
  key: string;
  label: string;
}

export interface WorkingCalendar {
  highlightWeekends: boolean;
  holidays: string[];
}

export interface AppViewState {
  mode: ViewMode;
  timelineZoomPxPerDay: number;
  groupBy: GroupBy;
  showCritical: boolean;
  selectedTaskId: string | null;
  drawerOpen: boolean;
  expandedParents: Record<string, boolean>;
}

export interface AppDomainState {
  tasks: WorkItem[];
  columns: BoardColumn[];
  swimlanes: Swimlane[];
  workingCalendar: WorkingCalendar;
}

export interface AppState {
  domain: AppDomainState;
  view: AppViewState;
  pendingForecast: ForecastResult | null;
}

export interface TaskMovement {
  taskId: string;
  oldStartDate: string;
  oldEndDate: string;
  newStartDate: string;
  newEndDate: string;
  shiftDays: number;
}

export interface ConstraintIssue {
  taskId: string;
  constraintType: string;
  constraintDate?: string;
  predecessorId?: string;
  requiredStartDate?: string;
  actualStartDate?: string;
  breachDays?: number;
}

export interface ForecastResult {
  changedTaskId: string;
  oldStartDate: string;
  oldEndDate: string;
  newStartDate: string;
  newEndDate: string;
  proposedTasks: WorkItem[];
  affectedTasks: TaskMovement[];
  linkedTasks: string[];
  linkedButUnaffected: string[];
  constraintBreaches: ConstraintIssue[];
  constraintRisks: ConstraintIssue[];
  criticalPathAffected: boolean;
  criticalPathChanged: boolean;
  oldProjectFinish: string;
  newProjectFinish: string;
  forecastShiftDays: number;
  impactCategories: string[];
}

export interface TimelineWindow {
  start: string;
  end: string;
  totalDays: number;
}
