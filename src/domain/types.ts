// =============================================================================
// Ripple domain types
// =============================================================================
// Pure data types describing the schedule. No React, no DOM, no browser APIs.
// =============================================================================

export type TaskStatusKey = string; // a key into AppDomainState.columns
export type SwimlaneKey = string; // a key into AppDomainState.swimlanes

export type DependencyType = 'finish_to_start' | 'start_to_start';

export interface Dependency {
  /** ID of the predecessor task. */
  taskId: string;
  type: DependencyType;
  lagDays: number;
}

export type ConstraintType =
  | 'must_start_on'
  | 'must_finish_on'
  | 'start_no_earlier_than'
  | 'finish_no_later_than';

export interface Constraint {
  type: ConstraintType;
  /** ISO date 'YYYY-MM-DD'. */
  date: string;
  /** Hard constraints surface as breaches when violated. */
  hard: boolean;
}

export interface WorkItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatusKey;

  /** ISO date 'YYYY-MM-DD'. */
  startDate: string;
  /** ISO date 'YYYY-MM-DD'. For milestones, equal to startDate. */
  endDate: string;
  /** Inclusive duration; for milestones this is 0. */
  durationDays: number;

  isMilestone: boolean;
  /** Locked tasks do not move during forward-pass propagation. */
  locked: boolean;
  swimlane: SwimlaneKey;

  /** Percent complete, 0–100. Display-only; does not affect scheduling. */
  percentComplete: number;

  /** If this task is a child, the ID of its parent. */
  parentId: string | null;
  /** True if this task has subtasks rolling into it. */
  isParent: boolean;

  /** Optional colour tag (CSS colour string), or null. */
  color?: string | null;

  dependencies: Dependency[];
  constraint: Constraint | null;

  // Derived (set by the schedule engine, not user-edited):
  criticalPath?: boolean;
  floatDays?: number;
}

export interface BoardColumn {
  key: TaskStatusKey;
  label: string;
}

export interface Swimlane {
  key: SwimlaneKey;
  label: string;
}

export interface WorkingCalendar {
  /** Visual stripe for weekends. Date math currently ignores this. */
  highlightWeekends: boolean;
  /** ISO date strings; visual stripe only at this stage. */
  holidays: string[];
}

export type ViewMode = 'board' | 'timeline';
export type GroupBy = 'swimlane' | 'parent' | 'status' | 'none';

export interface AppDomainState {
  tasks: WorkItem[];
  columns: BoardColumn[];
  swimlanes: Swimlane[];
  workingCalendar: WorkingCalendar;
}

export interface AppViewState {
  mode: ViewMode;
  /** Pixels per day; continuous range. */
  zoom: number;
  groupBy: GroupBy;
  showCritical: boolean;
  selectedTaskId: string | null;
  drawerOpen: boolean;
  /** parentId -> expanded? (default true). */
  expandedParents: Record<string, boolean>;
  /** group key -> collapsed? */
  collapsedGroups: Record<string, boolean>;
  /** Currently-selected dep edge, if any. */
  selectedDep: { fromId: string; toId: string } | null;
  /** Width in pixels of the task-list panel inside the Timeline view. */
  taskListWidth: number;
  /** When non-null, Timeline scrolls this task into view then clears the field. */
  scrollToTaskId: string | null;
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
  constraintType: ConstraintType | 'dependency_conflict';
  constraintDate?: string;
  forecastStartDate?: string;
  forecastEndDate?: string;
  predecessorId?: string;
  requiredStartDate?: string;
  actualStartDate?: string;
  breachDays?: number;
}

export type ImpactCategory =
  | 'dependency_impact'
  | 'constraint_risk'
  | 'constraint_breach'
  | 'critical_path_impact'
  | 'end_date_impact'
  | 'local_impact';

export interface ForecastResult {
  changedTaskId: string;
  oldStartDate: string;
  oldEndDate: string;
  newStartDate: string;
  newEndDate: string;
  proposedTasks: WorkItem[];
  linkedTasks: string[];
  affectedTasks: TaskMovement[];
  linkedButUnaffected: string[];
  constraintBreaches: ConstraintIssue[];
  constraintRisks: ConstraintIssue[];
  criticalPathAffected: boolean;
  criticalPathChanged: boolean;
  oldProjectFinish: string;
  newProjectFinish: string;
  forecastShiftDays: number;
  impactCategories: ImpactCategory[];
}

export interface ProposedChange {
  taskId: string;
  newStartDate: string;
  newEndDate: string;
}

export interface AppState {
  domain: AppDomainState;
  view: AppViewState;
  pendingForecast: ForecastResult | null;
  pendingChange: ProposedChange | null;
}

export interface TimelineWindow {
  start: string;
  end: string;
  totalDays: number;
}
