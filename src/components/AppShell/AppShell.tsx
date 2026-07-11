import { ReactNode } from 'react';
import { AppState, ViewMode } from '../../domain/types';
import { getDeliverablesReadyForAcceptance } from '../../domain/deliverable';
import { downloadJsonExport } from '../../export/jsonExport';
import { StatusPill } from '../StatusPill/StatusPill';
import { showHint } from '../Toasts/Hint';
import { SectionSwitcher } from './SectionSwitcher';

interface Props {
  state: AppState;
  children: ReactNode;
  onViewMode: (mode: ViewMode) => void;
  onToggleCritical: () => void;
  onBreachClick?: () => void;
  onOpenSettings: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const BASE_VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'board', label: 'Board' },
  { key: 'riskRegister', label: 'Risk Register' },
  { key: 'raidBoard', label: 'RAID Board' },
  { key: 'extDepRegister', label: 'External Dependencies' },
  { key: 'deliverableRegister', label: 'Deliverables' },
];

export function AppShell({
  state,
  children,
  onViewMode,
  onToggleCritical,
  onBreachClick,
  onOpenSettings,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: Props) {
  const handleExport = () => {
    downloadJsonExport(state.domain);
    showHint('Exported JSON');
  };

  const readyCount = getDeliverablesReadyForAcceptance(state.domain.deliverables).length;

  const viewModeLabel = (key: ViewMode, baseLabel: string): string => {
    if (key === 'deliverableRegister' && readyCount > 0) {
      return `${baseLabel} (${readyCount} ready)`;
    }
    return baseLabel;
  };

  const switcherOptions = BASE_VIEW_MODES.map((mode) => ({
    key: mode.key,
    label: viewModeLabel(mode.key, mode.label),
  }));

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark-small">
            Ripple<em>.</em>
          </div>
          <SectionSwitcher mode={state.view.mode} options={switcherOptions} onSelect={onViewMode} />
        </div>

        <div className="header-actions">
          <StatusPill state={state} onBreachClick={onBreachClick} />
          <button
            type="button"
            className="btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 7 C3 4.5 5.5 2.5 8 2.5 C10.8 2.5 13 4.7 13 7.5 C13 10.3 10.8 12.5 8 12.5 L5.5 12.5" strokeLinecap="round" />
              <path d="M2 5l1 2 2-1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13 7 C13 4.5 10.5 2.5 8 2.5 C5.2 2.5 3 4.7 3 7.5 C3 10.3 5.2 12.5 8 12.5 L10.5 12.5" strokeLinecap="round" />
              <path d="M14 5l-1 2-2-1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
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
