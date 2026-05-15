import { AppState } from '../domain/types';
import { createInitialDomainState } from '../domain/seedData';

export const STORE_KEY = 'ripple_professional_state_v1';

export function createInitialAppState(): AppState {
  return {
    domain: createInitialDomainState(),
    view: {
      mode: 'both',
      timelineZoomPxPerDay: 24,
      groupBy: 'swimlane',
      showCritical: true,
      selectedTaskId: null,
      drawerOpen: false,
      expandedParents: { T07: true }
    },
    pendingForecast: null
  };
}

export function loadAppState(): AppState {
  try {
    const stored = localStorage.getItem(STORE_KEY);
    if (!stored) return createInitialAppState();
    return JSON.parse(stored) as AppState;
  } catch {
    return createInitialAppState();
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // Non-fatal. Storage may be unavailable in private browsing or restricted environments.
  }
}

export function resetAppState(): AppState {
  localStorage.removeItem(STORE_KEY);
  return createInitialAppState();
}
