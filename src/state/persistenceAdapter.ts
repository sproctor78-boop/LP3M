// =============================================================================
// Persistence adapter
// =============================================================================
// Wraps localStorage with a schema version. Pending forecast and pending change
// are intentionally NOT persisted — they are transient UI state that should
// not survive a refresh.
// =============================================================================

import { AppState } from '../domain/types';
import { createInitialDomainState } from '../domain/seedData';
import { DEFAULT_ZOOM } from '../domain/constants';

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
      mode: 'both',
      zoom: DEFAULT_ZOOM,
      groupBy: 'swimlane',
      showCritical: true,
      selectedTaskId: null,
      drawerOpen: false,
      expandedParents: { T07: true },
      collapsedGroups: {},
      selectedDep: null,
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

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return createInitialAppState();
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidEnvelope(parsed)) return createInitialAppState();
    return {
      domain: parsed.state.domain,
      view: parsed.state.view,
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

export function resetAppState(): AppState {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    // ignore
  }
  return createInitialAppState();
}
