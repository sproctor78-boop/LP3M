// =============================================================================
// SignalsRail — collapsible right-hand rail showing action-required signals.
// =============================================================================

import { useMemo } from 'react';
import { AppDomainState } from '../../domain/types';
import { AppAction, localToday } from '../../state/appState';
import { deriveSignals, Signal } from '../../engine/signalsEngine';
import { canBeAccepted } from '../../domain/deliverable';

const RAIL_WIDTH = 280;

interface Props {
  domain: AppDomainState;
  open: boolean;
  onToggle: () => void;
  dispatch: (action: AppAction) => void;
  onEditEntity: (type: 'risk' | 'dep' | 'gate', entityId: string) => void;
}

export function SignalsRail({ domain, open, onToggle, dispatch, onEditEntity }: Props) {
  const today = localToday();
  const signals = useMemo(() => deriveSignals(domain, today), [domain, today]);

  return (
    <div
      className="signals-rail"
      style={{
        width: open ? RAIL_WIDTH : 36,
        flexShrink: 0,
        borderLeft: '0.5px solid var(--border)',
        background: 'var(--surface-2)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.15s ease',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Toggle button */}
      <button
        type="button"
        className="btn"
        onClick={onToggle}
        title={open ? 'Collapse signals rail' : 'Open signals rail'}
        style={{
          position: 'absolute',
          top: 8,
          right: open ? 8 : 4,
          zIndex: 1,
          padding: '4px 6px',
          minWidth: 0,
          fontSize: 11,
        }}
      >
        {open ? (
          <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M8 2L4 6L8 10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M4 2L8 6L4 10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {open ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div
            style={{
              padding: '10px 12px 8px',
              borderBottom: '0.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 40,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Signals</span>
            {signals.length > 0 ? (
              <span className="rip-badge rip-badge--risk" style={{ fontSize: 9 }}>{signals.length}</span>
            ) : null}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
            {signals.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--ink-muted)', textAlign: 'center', marginTop: 24 }}>
                Nothing needs you right now.
              </p>
            ) : (
              signals.map((sig) => (
                <SignalCard
                  key={sig.id}
                  signal={sig}
                  domain={domain}
                  dispatch={dispatch}
                  onEditEntity={onEditEntity}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function categoryLabel(cat: Signal['category']): string {
  switch (cat) {
    case 'breach': return 'Breach';
    case 'dep': return 'Ext. dep';
    case 'gate': return 'Gate';
    case 'risk': return 'Risk';
    case 'forecast': return 'Forecast';
  }
}

interface CardProps {
  signal: Signal;
  domain: AppDomainState;
  dispatch: (action: AppAction) => void;
  onEditEntity: (type: 'risk' | 'dep' | 'gate', entityId: string) => void;
}

function SignalCard({ signal, domain, dispatch, onEditEntity }: CardProps) {
  const catClass = `rip-signal-card-category rip-signal-card-category--${signal.category}`;

  const handleJump = () => {
    if (signal.taskId) {
      dispatch({ type: 'selectTask', taskId: signal.taskId, openDrawer: false });
      dispatch({ type: 'setScrollToTask', taskId: signal.taskId });
    } else if (signal.entityId) {
      navigateToRegister(signal, domain, dispatch);
    }
  };

  const handleAccept = () => {
    if (!signal.entityId) return;
    const del = domain.deliverables.find((d) => d.id === signal.entityId);
    if (!del || !canBeAccepted(del)) return;
    dispatch({ type: 'setDeliverableStatus', deliverableId: del.id, status: 'Accepted', acceptedBy: 'system' });
  };

  const handleEdit = () => {
    if (!signal.entityId) return;
    const type = signal.category === 'risk' ? 'risk' : signal.category === 'dep' ? 'dep' : 'gate';
    if (type === 'risk' || type === 'dep' || type === 'gate') {
      onEditEntity(type, signal.entityId);
    }
  };

  return (
    <div className="rip-signal-card" style={{ marginBottom: 6 }}>
      <div className={catClass}>{categoryLabel(signal.category)}</div>
      <div className="rip-signal-card-body" title={signal.title}>{signal.title}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {signal.detail}
      </div>
      <div className="rip-signal-card-actions">
        {signal.taskId ? (
          <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={handleJump}>Jump</button>
        ) : null}
        {(signal.category === 'risk' || signal.category === 'dep' || signal.category === 'gate') && signal.entityId ? (
          <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={handleEdit}>Edit</button>
        ) : null}
        {signal.category === 'gate' && signal.entityId ? (
          (() => {
            const del = domain.deliverables.find((d) => d.id === signal.entityId);
            if (del && canBeAccepted(del) && del.status !== 'Accepted') {
              return (
                <button className="btn btn-sm" style={{ fontSize: 10, color: '#0f766e' }} onClick={handleAccept}>
                  Accept
                </button>
              );
            }
            return null;
          })()
        ) : null}
        {!signal.taskId && signal.entityId ? (
          <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={() => navigateToRegister(signal, domain, dispatch)}>
            Open register
          </button>
        ) : null}
      </div>
    </div>
  );
}

function navigateToRegister(signal: Signal, _domain: AppDomainState, dispatch: (action: AppAction) => void) {
  if (signal.category === 'risk' && signal.entityId) {
    dispatch({ type: 'setViewMode', mode: 'riskRegister' });
    dispatch({ type: 'selectRisk', riskId: signal.entityId, openDrawer: true });
  } else if (signal.category === 'dep' && signal.entityId) {
    dispatch({ type: 'setViewMode', mode: 'extDepRegister' });
    dispatch({ type: 'selectExtDep', depId: signal.entityId, openDrawer: true });
  } else if (signal.category === 'gate' && signal.entityId) {
    dispatch({ type: 'setViewMode', mode: 'deliverableRegister' });
    dispatch({ type: 'selectDeliverable', deliverableId: signal.entityId, openDrawer: true });
  }
}
