// =============================================================================
// Persistence adapter
// =============================================================================
// Wraps localStorage with a schema version. Pending forecast and pending change
// are intentionally NOT persisted — they are transient UI state that should
// not survive a refresh.
// =============================================================================

import { AppState, WorkItem } from '../domain/types';
import { createInitialDomainState } from '../domain/seedData';
import { DEFAULT_TASK_LIST_WIDTH, DEFAULT_ZOOM } from '../domain/constants';
import { localToday } from './appState';
import { recomputeSchedule } from '../engine/scheduleEngine';

const STORE_KEY = 'ripple_state_v9';
const STORE_VERSION = 9;

interface StoredEnvelope {
  version: number;
  state: PersistedState;
}

interface PersistedState {
  domain: AppState['domain'];
  view: AppState['view'];
}

export function createInitialAppState(): AppState {
  return {
    domain: createInitialDomainState(),
    view: {
      mode: 'timeline',
      zoom: DEFAULT_ZOOM,
      groupBy: 'swimlane',
      showCritical: true,
      selectedTaskId: null,
      drawerOpen: false,
      expandedParents: { T07: true },
      collapsedGroups: {},
      selectedDep: null,
      taskListWidth: DEFAULT_TASK_LIST_WIDTH,
      scrollToTaskId: null,
      milestonesOnly: false,
      raidActionsVisibleInTimeline: false,
      selectedRiskId: null,
      selectedActionId: null,
      riskRegisterCollapseState: { inherentCollapsed: true, residualCollapsed: false },
      externalDependenciesVisibleInTimeline: false,
      selectedExtDepId: null,
      deliverablesVisibleInTimeline: false,
      selectedDeliverableId: null,
      signalsRailOpen: true,
      riskSummaryCollapsed: false,
    },
    pendingForecast: null,
    pendingChange: null,
    _past: [],
    _future: [],
  };
}

function isValidEnvelope(value: unknown): value is StoredEnvelope {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.version !== STORE_VERSION) return false;
  if (!v.state || typeof v.state !== 'object') return false;
  const s = v.state as Record<string, unknown>;
  return (
    typeof s.domain === 'object' &&
    s.domain !== null &&
    typeof s.view === 'object' &&
    s.view !== null
  );
}

/**
 * Migrate a persisted view object to the current shape. Older versions used
 * `mode: 'both'` (now removed) and did not have `taskListWidth` or RAID fields.
 */
function migrateView(view: AppState['view']): AppState['view'] {
  const raw = view as unknown as Record<string, unknown>;
  const rawMode = raw.mode;
  const validModes = ['board', 'timeline', 'riskRegister', 'raidBoard', 'extDepRegister', 'deliverableRegister'];
  const mode = validModes.includes(rawMode as string) ? (rawMode as AppState['view']['mode']) : 'timeline';
  const taskListWidth =
    typeof raw.taskListWidth === 'number' && raw.taskListWidth > 0
      ? (raw.taskListWidth as number)
      : DEFAULT_TASK_LIST_WIDTH;
  const milestonesOnly = typeof raw.milestonesOnly === 'boolean' ? raw.milestonesOnly : false;
  const raidActionsVisibleInTimeline =
    typeof raw.raidActionsVisibleInTimeline === 'boolean' ? raw.raidActionsVisibleInTimeline : false;
  const selectedRiskId =
    typeof raw.selectedRiskId === 'string' ? raw.selectedRiskId : null;
  const selectedActionId =
    typeof raw.selectedActionId === 'string' ? raw.selectedActionId : null;
  const rawCollapse = raw.riskRegisterCollapseState as Record<string, unknown> | undefined;
  const riskRegisterCollapseState = {
    inherentCollapsed: typeof rawCollapse?.inherentCollapsed === 'boolean' ? rawCollapse.inherentCollapsed : true,
    residualCollapsed: typeof rawCollapse?.residualCollapsed === 'boolean' ? rawCollapse.residualCollapsed : false,
  };
  const externalDependenciesVisibleInTimeline =
    typeof raw.externalDependenciesVisibleInTimeline === 'boolean'
      ? raw.externalDependenciesVisibleInTimeline
      : false;
  const selectedExtDepId =
    typeof raw.selectedExtDepId === 'string' ? raw.selectedExtDepId : null;
  const deliverablesVisibleInTimeline =
    typeof raw.deliverablesVisibleInTimeline === 'boolean'
      ? raw.deliverablesVisibleInTimeline
      : false;
  const selectedDeliverableId =
    typeof raw.selectedDeliverableId === 'string' ? raw.selectedDeliverableId : null;
  const signalsRailOpen =
    typeof raw.signalsRailOpen === 'boolean' ? raw.signalsRailOpen : true;
  const riskSummaryCollapsed =
    typeof raw.riskSummaryCollapsed === 'boolean' ? raw.riskSummaryCollapsed : false;
  return {
    ...view,
    mode,
    taskListWidth,
    scrollToTaskId: null,
    milestonesOnly,
    raidActionsVisibleInTimeline,
    selectedRiskId,
    selectedActionId,
    riskRegisterCollapseState,
    externalDependenciesVisibleInTimeline,
    selectedExtDepId,
    deliverablesVisibleInTimeline,
    selectedDeliverableId,
    signalsRailOpen,
    riskSummaryCollapsed,
  };
}

/**
 * Migrate a persisted domain: fill any fields that may be absent in older
 * stored versions (percentComplete, assignees, people, risks, raidActions).
 */
function migrateDomain(domain: AppState['domain']): AppState['domain'] {
  const raw = domain as unknown as Record<string, unknown>;
  const people = Array.isArray(raw.people) ? raw.people : [];
  const risks = Array.isArray(raw.risks) ? raw.risks : [];
  const raidActions = Array.isArray(raw.raidActions) ? raw.raidActions : [];
  const externalDependencies = Array.isArray(raw.externalDependencies) ? raw.externalDependencies : [];
  const deliverables = Array.isArray(raw.deliverables) ? raw.deliverables : [];
  const migratedRisks = risks.map((r: unknown) => {
    const risk = r as Record<string, unknown>;
    return {
      ...risk,
      proximity: risk.proximity ?? 'MediumTerm',
      linkedTaskIds: Array.isArray(risk.linkedTaskIds) ? risk.linkedTaskIds : [],
      linkedDeliverableIds: Array.isArray(risk.linkedDeliverableIds) ? risk.linkedDeliverableIds : [],
      linkedDependencyIds: Array.isArray(risk.linkedDependencyIds) ? risk.linkedDependencyIds : [],
    };
  }) as unknown as AppState['domain']['risks'];
  const migratedExtDeps = externalDependencies.map((d: unknown) => {
    const dep = d as Record<string, unknown>;
    return {
      ...dep,
      linkedTaskIds: Array.isArray(dep.linkedTaskIds) ? dep.linkedTaskIds : [],
    };
  }) as unknown as AppState['domain']['externalDependencies'];
  const migratedDeliverables = deliverables.map((d: unknown) => {
    const del = d as Record<string, unknown>;
    return {
      ...del,
      linkedTaskIds: Array.isArray(del.linkedTaskIds) ? del.linkedTaskIds : [],
      acceptanceCriteria: Array.isArray(del.acceptanceCriteria) ? del.acceptanceCriteria : [],
    };
  }) as unknown as AppState['domain']['deliverables'];
  return {
    ...domain,
    people,
    risks: migratedRisks,
    raidActions,
    externalDependencies: migratedExtDeps,
    deliverables: migratedDeliverables,
    tasks: domain.tasks.map((task) => {
      const t = task as unknown as Record<string, unknown>;
      return {
        ...task,
        percentComplete:
          typeof task.percentComplete === 'number' ? task.percentComplete : 0,
        assignees: Array.isArray(t.assignees) ? (t.assignees as string[]) : [],
      };
    }),
  };
}

/** Exported for testing — accepts a partial domain-like object and normalises it. */
export function migrateDomainForTest(partial: Record<string, unknown>): AppState['domain'] {
  const base: AppState['domain'] = {
    tasks: [],
    columns: [{ key: 'todo', label: 'To do' }],
    swimlanes: [{ key: 'default', label: 'Default' }],
    workingCalendar: { highlightWeekends: false, holidays: [] },
    people: [],
    risks: [],
    raidActions: [],
    externalDependencies: [],
    deliverables: [],
    ...partial,
  };
  return migrateDomain(base);
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return createInitialAppState();
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidEnvelope(parsed)) return createInitialAppState();
    const domain = migrateDomain(parsed.state.domain);
    domain.tasks = recomputeSchedule(
      domain.tasks,
      domain.externalDependencies,
      domain.deliverables,
      localToday(),
    );
    return {
      domain,
      view: migrateView(parsed.state.view),
      pendingForecast: null,
      pendingChange: null,
      _past: [],
      _future: [],
    };
  } catch {
    return createInitialAppState();
  }
}

/** Strip engine-derived fields before persisting — they are recomputed on load. */
function stripDerivedFields(tasks: WorkItem[]): WorkItem[] {
  return tasks.map((t) => {
    const { criticalPath, floatDays, forecastWarning, deliverableWarning, ...rest } = t;
    void criticalPath;
    void floatDays;
    void forecastWarning;
    void deliverableWarning;
    return rest as WorkItem;
  });
}

export function saveAppState(state: AppState): void {
  try {
    const envelope: StoredEnvelope = {
      version: STORE_VERSION,
      state: {
        domain: { ...state.domain, tasks: stripDerivedFields(state.domain.tasks) },
        view: state.view,
      },
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(envelope));
  } catch {
    // Non-fatal. Storage may be unavailable in private browsing or restricted
    // environments. The app continues to work in-memory.
  }
}

