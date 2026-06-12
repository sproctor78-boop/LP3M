// =============================================================================
// HoverCard — read-only contextual card anchored near a badge.
// Rendered at the Timeline level, positioned with position:fixed.
// =============================================================================

import { useEffect, useRef } from 'react';
import { AppDomainState } from '../../domain/types';
import { computeOverlayPosition } from '../common/useAnchoredOverlay';
import { BadgeType } from './TaskBadges';

const CARD_WIDTH = 300;
const CARD_HEIGHT = 140;

interface Props {
  type: BadgeType;
  taskId: string;
  anchorRect: DOMRect;
  domain: AppDomainState;
  onClose: () => void;
  onEdit: (entityId: string) => void;
  onOpenRegister: (entityId: string) => void;
}

export function HoverCard({ type, taskId, anchorRect, domain, onClose, onEdit, onOpenRegister }: Props) {
  const pos = computeOverlayPosition(anchorRect, CARD_HEIGHT, CARD_WIDTH);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (type === 'risk') {
    const risks = domain.risks.filter(
      (r) => r.linkedTaskIds.includes(taskId) && r.status !== 'Closed',
    ).slice(0, 4);
    if (risks.length === 0) return null;
    return (
      <div
        ref={ref}
        className="rip-hovercard"
        style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 'var(--z-popover)' as never, width: CARD_WIDTH }}
        onMouseLeave={onClose}
      >
        {risks.map((r) => (
          <div key={r.id} style={{ marginBottom: risks.length > 1 ? 6 : 0 }}>
            <div className="rip-hovercard-title">
              {r.id} — {r.title}{' '}
              <span className="rip-badge rip-badge--risk" style={{ fontSize: 9 }}>{r.scores.residual.score}</span>
            </div>
            <div className="rip-hovercard-meta">Owner: {r.owner || '—'}</div>
            <div className="rip-hovercard-meta">Review: {r.reviewDate}</div>
            <div className="rip-hovercard-meta">Score: {r.scores.residual.score} ({r.scores.residual.rag})</div>
          </div>
        ))}
        <div className="rip-hovercard-actions">
          <button className="btn btn-sm" onClick={() => onEdit(risks[0].id)}>Edit</button>
          <button className="btn btn-sm" onClick={() => onOpenRegister(risks[0].id)}>Open register</button>
        </div>
      </div>
    );
  }

  if (type === 'dep') {
    const deps = domain.externalDependencies.filter(
      (d) => d.linkedTaskIds.includes(taskId),
    ).slice(0, 4);
    if (deps.length === 0) return null;
    return (
      <div
        ref={ref}
        className="rip-hovercard"
        style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 'var(--z-popover)' as never, width: CARD_WIDTH }}
        onMouseLeave={onClose}
      >
        {deps.map((d) => (
          <div key={d.id} style={{ marginBottom: deps.length > 1 ? 6 : 0 }}>
            <div className="rip-hovercard-title">
              {d.id} — {d.title}{' '}
              <span className="rip-badge rip-badge--dep" style={{ fontSize: 9 }}>{d.status}</span>
            </div>
            <div className="rip-hovercard-meta">Owner: {d.internalOwner || '—'}</div>
            <div className="rip-hovercard-meta">Due: {d.targetDate}</div>
          </div>
        ))}
        <div className="rip-hovercard-actions">
          <button className="btn btn-sm" onClick={() => onEdit(deps[0].id)}>Edit</button>
          <button className="btn btn-sm" onClick={() => onOpenRegister(deps[0].id)}>Open register</button>
        </div>
      </div>
    );
  }

  if (type === 'gate') {
    const dels = domain.deliverables.filter(
      (d) => d.linkedTaskIds.includes(taskId),
    ).slice(0, 4);
    if (dels.length === 0) return null;
    return (
      <div
        ref={ref}
        className="rip-hovercard"
        style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 'var(--z-popover)' as never, width: CARD_WIDTH }}
        onMouseLeave={onClose}
      >
        {dels.map((d) => {
          const met = d.acceptanceCriteria.filter((c) => c.met).length;
          const total = d.acceptanceCriteria.length;
          return (
            <div key={d.id} style={{ marginBottom: dels.length > 1 ? 6 : 0 }}>
              <div className="rip-hovercard-title">
                {d.id} — {d.title}{' '}
                <span className="rip-badge rip-badge--gate" style={{ fontSize: 9 }}>{met}/{total}</span>
              </div>
              <div className="rip-hovercard-meta">Owner: {d.owner || '—'}</div>
              <div className="rip-hovercard-meta">Due: {d.targetDate}</div>
              <div className="rip-hovercard-meta">Status: {d.status}</div>
            </div>
          );
        })}
        <div className="rip-hovercard-actions">
          <button className="btn btn-sm" onClick={() => onEdit(dels[0].id)}>Edit</button>
          <button className="btn btn-sm" onClick={() => onOpenRegister(dels[0].id)}>Open register</button>
        </div>
      </div>
    );
  }

  return null;
}
