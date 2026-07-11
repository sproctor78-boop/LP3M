// =============================================================================
// Ripple domain types
// =============================================================================
// Pure data types describing the schedule. No React, no DOM, no browser APIs.
// =============================================================================

import { Risk } from './risk';
import { RaidAction } from './raidAction';
import { ExternalDependency } from './externalDependency';
import { Deliverable } from './deliverable';
export type { Risk, RiskScore, RiskScores, RiskStatus, RiskCategory, RagColour, ImpactBand, ProbabilityBand, ResponseItem, Proximity } from './risk';
export { PROXIMITY_BANDS, getProximityFromDate } from './risk';
export type { RaidAction, ActionStatus } from './raidAction';
export type { ExternalDependency, DepStatus } from './externalDependency';
export { getSuggestedStatus, isOverdue as isExtDepOverdue } from './externalDependency';
export type { Deliverable, DeliverableStatus, AcceptanceCriterion } from './deliverable';
export { getCompletionPercentage, canBeAccepted, isOverdue as isDeliverableOverdue, getDeliverablesReadyForAcceptance } from './deliverable';

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

  /** IDs of Person records assigned to this task. */
  assignees: string[];

  dependencies: Dependency[];
  constraint: Constraint | null;

  // Derived (set by the schedule engine, not user-edited):
  criticalPath?: boolean;
  floatDays?: number;
  /** True when a linked ExternalDependency has status 'Late'. Engine-derived; not stored by the user. */
  forecastWarning?: boolean;
  /** True when a linked Deliverable is Rejected or overdue. Engine-derived; not stored by the user. */
  deliverableWarning?: boolean;
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

/**
 * Represents a person who can be assigned to tasks.
 * Designed to accommodate future Active Directory / Entra ID integration:
 *   - `source: 'local'`  → created and managed within this app
 *   - `source: 'ad'`     → synced from Azure AD / Entra ID; adObjectId & upn
 *     are the stable identifiers used to match records during sync.
 */
export interface Person {
  id: string;
  displayName: string;
  email?: string;
  /** Azure AD / Entra ID object GUID — stable across renames. */
  adObjectId?: string;
  /** User Principal Name (e.g. jane@contoso.com) — used as AD login key. */
  upn?: string;
  source: 'local' | 'ad';
  /** ISO timestamp of last successful AD sync for this record. */
  adSyncedAt?: string;
}

export type ViewMode = 'board' | 'timeline' | 'riskRegister' | 'raidBoard' | 'extDepRegister' | 'deliverableRegister';
export type GroupBy = 'swimlane' | 'parent' | 'status' | 'none';

export interface AppDomainState {
  tasks: WorkItem[];
  columns: BoardColumn[];
  swimlanes: Swimlane[];
  workingCalendar: WorkingCalendar;
  people: Person[];
  risks: Risk[];
  raidActions: RaidAction[];
  externalDependencies: ExternalDependency[];
  deliverables: Deliverable[];
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
  /** When true, the timeline shows only milestone tasks. */
  milestonesOnly: boolean;
  /** When true, RAID Actions appear as an overlay layer on the Timeline. */
  raidActionsVisibleInTimeline: boolean;
  /** ID of the currently selected risk, or null. */
  selectedRiskId: string | null;
  /** ID of the currently selected RAID action, or null. */
  selectedActionId: string | null;
  /** Persisted collapse state for Risk Register Inherent/Residual column groups. */
  riskRegisterCollapseState: { inherentCollapsed: boolean; residualCollapsed: boolean };
  /** When true, External Dependencies appear as an overlay layer on the Timeline. */
  externalDependenciesVisibleInTimeline: boolean;
  /** ID of the currently selected external dependency, or null. */
  selectedExtDepId: string | null;
  /** When true, Deliverables appear as an overlay layer on the Timeline. */
  deliverablesVisibleInTimeline: boolean;
  /** ID of the currently selected deliverable, or null. */
  selectedDeliverableId: string | null;
  /** When true, the Signals rail is shown on the Timeline view. */
  signalsRailOpen: boolean;
  /** When true, the Risk Register's stats summary strip is collapsed. */
  riskSummaryCollapsed: boolean;
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
  /** Undo stack — never persisted. */
  _past: AppDomainState[];
  /** Redo stack — never persisted. */
  _future: AppDomainState[];
}

export interface TimelineWindow {
  start: string;
  end: string;
  totalDays: number;
}
