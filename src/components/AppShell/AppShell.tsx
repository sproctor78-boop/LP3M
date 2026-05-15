import { ReactNode } from 'react';
import { AppState, ViewMode } from '../../domain/types';
import { downloadJsonExport } from '../../export/jsonExport';

interface Props {
  state: AppState;
  children: ReactNode;
  onViewMode: (mode: ViewMode) => void;
  onToggleCritical: () => void;
  onReset: () => void;
}

export function AppShell({ state, children, onViewMode, onToggleCritical, onReset }: Props) {
  const hasBreaches = (state.pendingForecast?.constraintBreaches.length ?? 0) > 0;
  const hasForecast = !!state.pendingForecast;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-title">Ripple<span>.</span></div>
          <div className="brand-tag">Schedule Impact Forecasting · v0.1</div>
        </div>
        <div className="header-centre">
          <div className="view-switch" aria-label="View switch">
            {(['both', 'board', 'timeline'] as ViewMode[]).map((mode) => (
              <button key={mode} className={state.view.mode === mode ? 'active' : ''} onClick={() => onViewMode(mode)}>
                {mode === 'both' ? 'Both' : mode === 'board' ? 'Board' : 'Timeline'}
              </button>
            ))}
          </div>
          <span className={`pill ${hasBreaches ? 'bad' : hasForecast ? 'warn' : ''}`}>
            <span className="pill-dot" />
            {hasBreaches ? 'Breach forecast' : hasForecast ? 'Forecast pending' : 'Schedule clear'}
          </span>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={onToggleCritical}>{state.view.showCritical ? 'Hide critical' : 'Show critical'}</button>
          <button className="btn" onClick={() => downloadJsonExport(state.domain)}>Export JSON</button>
          <button className="btn" onClick={onReset}>Reset</button>
        </div>
      </header>
      {children}
    </div>
  );
}
