// =============================================================================
// PopoverEdit — quick-edit popover for risk / dep / deliverable records.
// Focus-trapped; dispatches through existing reducer actions immediately.
// =============================================================================

import { useEffect, useRef } from 'react';
import { AppDomainState } from '../../domain/types';
import { DepStatus } from '../../domain/externalDependency';
import { DeliverableStatus, canBeAccepted } from '../../domain/deliverable';
import { RiskStatus, ImpactBand } from '../../domain/risk';
import { buildRiskScore } from '../../domain/raidScoring';
import { computeOverlayPosition } from '../common/useAnchoredOverlay';
import { AppAction } from '../../state/appState';
import { BadgeType } from './TaskBadges';

const POP_WIDTH = 360;
const POP_HEIGHT = 260;

interface Props {
  type: BadgeType;
  entityId: string;
  anchorRect: DOMRect;
  domain: AppDomainState;
  dispatch: (action: AppAction) => void;
  onClose: () => void;
}

export function PopoverEdit({ type, entityId, anchorRect, domain, dispatch, onClose }: Props) {
  const pos = computeOverlayPosition(anchorRect, POP_HEIGHT, POP_WIDTH);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus first field on open
  useEffect(() => {
    const first = containerRef.current?.querySelector<HTMLElement>('select,input,button');
    first?.focus();
  }, []);

  // Esc closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Outside click closes
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [onClose]);

  // Tab trap
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusable = containerRef.current?.querySelectorAll<HTMLElement>(
      'input,select,button,textarea,[tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const style: React.CSSProperties = {
    position: 'fixed',
    top: pos.top,
    left: pos.left,
    zIndex: 'var(--z-popover)' as never,
    width: POP_WIDTH,
  };

  if (type === 'dep') {
    return <DepPopover entityId={entityId} domain={domain} dispatch={dispatch} onClose={onClose} style={style} containerRef={containerRef} trapTab={trapTab} />;
  }
  if (type === 'gate') {
    return <GatePopover entityId={entityId} domain={domain} dispatch={dispatch} onClose={onClose} style={style} containerRef={containerRef} trapTab={trapTab} />;
  }
  if (type === 'risk') {
    return <RiskPopover entityId={entityId} domain={domain} dispatch={dispatch} onClose={onClose} style={style} containerRef={containerRef} trapTab={trapTab} />;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

interface SubProps {
  entityId: string;
  domain: AppDomainState;
  dispatch: (action: AppAction) => void;
  onClose: () => void;
  style: React.CSSProperties;
  containerRef: React.RefObject<HTMLDivElement>;
  trapTab: (e: React.KeyboardEvent) => void;
}

function DepPopover({ entityId, domain, dispatch, onClose, style, containerRef, trapTab }: SubProps) {
  const dep = domain.externalDependencies.find((d) => d.id === entityId);
  if (!dep) return null;
  return (
    <div className="rip-popover" style={style} ref={containerRef} onKeyDown={trapTab}>
      <div className="rip-popover-title">{dep.id} — {dep.title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 12 }}>
          Status
          <select
            style={{ display: 'block', width: '100%', marginTop: 2 }}
            value={dep.status}
            onChange={(e) => dispatch({ type: 'setExternalDependencyStatus', depId: dep.id, status: e.target.value as DepStatus })}
          >
            <option value="OnTrack">On track</option>
            <option value="AtRisk">At risk</option>
            <option value="Late">Late</option>
            <option value="Received">Received</option>
          </select>
        </label>
        <label style={{ fontSize: 12 }}>
          Target date
          <input
            type="date"
            style={{ display: 'block', width: '100%', marginTop: 2 }}
            defaultValue={dep.targetDate}
            onBlur={(e) => {
              if (e.target.value && e.target.value !== dep.targetDate) {
                dispatch({ type: 'updateExternalDependency', depId: dep.id, patch: { targetDate: e.target.value } });
              }
            }}
          />
        </label>
        <label style={{ fontSize: 12 }}>
          Internal owner
          <input
            type="text"
            style={{ display: 'block', width: '100%', marginTop: 2 }}
            defaultValue={dep.internalOwner}
            onBlur={(e) => {
              if (e.target.value !== dep.internalOwner) {
                dispatch({ type: 'updateExternalDependency', depId: dep.id, patch: { internalOwner: e.target.value } });
              }
            }}
          />
        </label>
      </div>
      <div className="rip-popover-actions">
        <button className="btn btn-sm" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function GatePopover({ entityId, domain, dispatch, onClose, style, containerRef, trapTab }: SubProps) {
  const del = domain.deliverables.find((d) => d.id === entityId);
  if (!del) return null;
  const canAccept = canBeAccepted(del);
  const acceptedStatuses: DeliverableStatus[] = ['Planned', 'InProduction', 'InReview', 'Rejected'];
  return (
    <div className="rip-popover" style={style} ref={containerRef} onKeyDown={trapTab}>
      <div className="rip-popover-title">{del.id} — {del.title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {del.acceptanceCriteria.length > 0 ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Acceptance criteria</div>
            {del.acceptanceCriteria.map((c) => (
              <label key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, marginBottom: 2 }}>
                <input
                  type="checkbox"
                  checked={c.met}
                  onChange={(e) => {
                    if (e.target.checked) {
                      dispatch({ type: 'markCriterionMet', deliverableId: del.id, criterionId: c.id });
                    } else {
                      dispatch({ type: 'markCriterionUnmet', deliverableId: del.id, criterionId: c.id });
                    }
                  }}
                />
                <span>{c.description}</span>
              </label>
            ))}
          </div>
        ) : null}
        <label style={{ fontSize: 12 }}>
          Status
          <select
            style={{ display: 'block', width: '100%', marginTop: 2 }}
            value={del.status}
            onChange={(e) => {
              const newStatus = e.target.value as DeliverableStatus;
              if (newStatus === 'Accepted' && !canAccept) return;
              dispatch({ type: 'setDeliverableStatus', deliverableId: del.id, status: newStatus });
            }}
          >
            {acceptedStatuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value="Accepted" disabled={!canAccept}>Accepted{!canAccept ? ' (criteria not met)' : ''}</option>
          </select>
        </label>
      </div>
      <div className="rip-popover-actions">
        <button className="btn btn-sm" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function RiskPopover({ entityId, domain, dispatch, onClose, style, containerRef, trapTab }: SubProps) {
  const risk = domain.risks.find((r) => r.id === entityId);
  const probabilityRef = useRef<HTMLInputElement>(null);
  const costRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  if (!risk) return null;

  const liveScore = () => {
    const pct = Number(probabilityRef.current?.value ?? risk.scores.residual.probabilityPct);
    const cost = Number(costRef.current?.value ?? risk.scores.residual.costImpact) as ImpactBand;
    const time = Number(timeRef.current?.value ?? risk.scores.residual.timeImpact) as ImpactBand;
    return buildRiskScore(pct, cost, time);
  };

  const commitScore = () => {
    const score = liveScore();
    dispatch({
      type: 'updateRisk',
      riskId: risk.id,
      patch: { scores: { ...risk.scores, residual: score } },
    });
  };

  return (
    <div className="rip-popover" style={style} ref={containerRef} onKeyDown={trapTab}>
      <div className="rip-popover-title">{risk.id} — {risk.title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 12 }}>
          Status
          <select
            style={{ display: 'block', width: '100%', marginTop: 2 }}
            defaultValue={risk.status}
            onBlur={(e) => {
              const s = e.target.value as RiskStatus;
              if (s !== risk.status) dispatch({ type: 'updateRisk', riskId: risk.id, patch: { status: s } });
            }}
          >
            <option value="Open">Open</option>
            <option value="Mitigated">Mitigated</option>
            <option value="Closed">Closed</option>
          </select>
        </label>
        <label style={{ fontSize: 12 }}>
          Review date
          <input
            type="date"
            style={{ display: 'block', width: '100%', marginTop: 2 }}
            defaultValue={risk.reviewDate}
            onBlur={(e) => {
              if (e.target.value && e.target.value !== risk.reviewDate) {
                dispatch({ type: 'updateRisk', riskId: risk.id, patch: { reviewDate: e.target.value } });
              }
            }}
          />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <label style={{ fontSize: 11 }}>
            Prob %
            <input ref={probabilityRef} type="number" min={0} max={100} defaultValue={risk.scores.residual.probabilityPct}
              style={{ display: 'block', width: '100%', marginTop: 2 }} onBlur={commitScore} />
          </label>
          <label style={{ fontSize: 11 }}>
            Cost (1–5)
            <input ref={costRef} type="number" min={1} max={5} defaultValue={risk.scores.residual.costImpact}
              style={{ display: 'block', width: '100%', marginTop: 2 }} onBlur={commitScore} />
          </label>
          <label style={{ fontSize: 11 }}>
            Time (1–5)
            <input ref={timeRef} type="number" min={1} max={5} defaultValue={risk.scores.residual.timeImpact}
              style={{ display: 'block', width: '100%', marginTop: 2 }} onBlur={commitScore} />
          </label>
        </div>
      </div>
      <div className="rip-popover-actions">
        <button className="btn btn-sm" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
