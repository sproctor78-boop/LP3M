// =============================================================================
// Persistence adapter
// =============================================================================
// Wraps localStorage with a schema version. Pending forecast and pending change
// are intentionally NOT persisted — they are transient UI state that should
// not survive a refresh.
// =============================================================================

import { AppState } from '../domain/types';
import { createInitialDomainState } from '../domain/seedData';
import { DEFAULT_TASK_LIST_WIDTH, DEFAULT_ZOOM } from '../domain/constants';

const STORE_KEY = 'ripple_state_v3';
const STORE_VERSION = 3;

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
    },
    pendingForecast: null,
    pendingChange: null,
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
 * `mode: 'both'` (now removed) and did not have `taskListWidth`.
 */
function migrateView(view: AppState['view']): AppState['view'] {
  const raw = view as unknown as Record<string, unknown>;
  const rawMode = raw.mode;
  const mode = rawMode === 'board' || rawMode === 'timeline' ? rawMode : 'timeline';
  const taskListWidth =
    typeof raw.taskListWidth === 'number' && raw.taskListWidth > 0
      ? (raw.taskListWidth as number)
      : DEFAULT_TASK_LIST_WIDTH;
  return { ...view, mode, taskListWidth, scrollToTaskId: null };
}

/**
 * Migrate a persisted domain: ensure every task has a numeric percentComplete.
 */
function migrateDomain(domain: AppState['domain']): AppState['domain'] {
  return {
    ...domain,
    tasks: domain.tasks.map((task) => ({
      ...task,
      percentComplete:
        typeof task.percentComplete === 'number' ? task.percentComplete : 0,
    })),
  };
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return createInitialAppState();
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidEnvelope(parsed)) return createInitialAppState();
    return {
      domain: migrateDomain(parsed.state.domain),
      view: migrateView(parsed.state.view),
      pendingForecast: null,
      pendingChange: null,
    };
  } catch {
    return createInitialAppState();
  }
}

export function saveAppState(state: AppState): void {
  try {
    const envelope: StoredEnvelope = {
      version: STORE_VERSION,
      state: { domain: state.domain, view: state.view },
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(envelope));
  } catch {
    // Non-fatal. Storage may be unavailable in private browsing or restricted
    // environments. The app continues to work in-memory.
  }
}

