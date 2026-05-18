import { ReactNode } from 'react';
import { AppState, ViewMode } from '../../domain/types';
import { downloadJsonExport } from '../../export/jsonExport';
import { StatusPill } from '../StatusPill/StatusPill';
import { showHint } from '../Toasts/Hint';

interface Props {
  state: AppState;
  children: ReactNode;
  onViewMode: (mode: ViewMode) => void;
  onToggleCritical: () => void;
  onBreachClick?: () => void;
  onOpenSettings: () => void;
}

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'board', label: 'Board' },
  { key: 'riskRegister', label: 'Risk Register' },
  { key: 'raidBoard', label: 'RAID Actions' },
];

export function AppShell({
  state,
  children,
  onViewMode,
  onToggleCritical,
  onBreachClick,
  onOpenSettings,
}: Props) {
  const handleExport = () => {
    downloadJsonExport(state.domain);
    showHint('Exported JSON');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">
            Ripple<em>.</em>
          </div>
          <div className="brand-tag">Schedule Impact Forecasting · v0.9</div>
        </div>

        <div className="header-centre">
          <div className="view-switch" role="tablist" aria-label="View mode">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.key}
                type="button"
                role="tab"
                aria-selected={state.view.mode === mode.key}
                className={state.view.mode === mode.key ? 'active' : ''}
                onClick={() => onViewMode(mode.key)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <StatusPill state={state} onBreachClick={onBreachClick} />
        </div>

        <div className="header-actions">
          <button
            type="button"
            className={`btn ${state.view.showCritical ? 'active' : ''}`}
            onClick={onToggleCritical}
            title="Highlight critical path"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 8h12M5 4l-3 4 3 4M11 4l3 4-3 4" />
            </svg>
            Critical Path
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleExport}
            title="Export schedule as JSON"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2v9M4 7l4 4 4-4M3 13h10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export
          </button>
          <button type="button" className="btn" onClick={onOpenSettings} title="Settings">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="2.2" />
              <path
                d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8L3.4 3.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
