// =============================================================================
// TaskBadges — compact badge cluster rendered on timeline bars and task-list rows.
// Absolutely positioned; pointer events scoped to the badges themselves.
// =============================================================================

import { useRef } from 'react';
import { RiskBadge, DepBadge, GateBadge } from '../../state/selectors';

export type BadgeType = 'risk' | 'dep' | 'gate';

export interface BadgeClickPayload {
  type: BadgeType;
  taskId: string;
  rect: DOMRect;
}

interface Props {
  taskId: string;
  risk: RiskBadge | null;
  dep: DepBadge | null;
  gate: GateBadge | null;
  /** Total bar width in px — used to decide collapse-to-dot mode. */
  barWidth?: number;
  /** Smaller variant for task-list panel rows. */
  small?: boolean;
  onHover: (payload: BadgeClickPayload) => void;
  onLeave: () => void;
  onClick: (payload: BadgeClickPayload) => void;
}

/** Below this bar width (px) collapse all badges to a single severity dot. */
const COLLAPSE_THRESHOLD = 60;

export function TaskBadges({
  taskId,
  risk,
  dep,
  gate,
  barWidth,
  small,
  onHover,
  onLeave,
  onClick,
}: Props) {
  const count = (risk ? 1 : 0) + (dep ? 1 : 0) + (gate ? 1 : 0);
  if (count === 0) return null;

  const collapsed = typeof barWidth === 'number' && barWidth < COLLAPSE_THRESHOLD;

  const riskRef = useRef<HTMLSpanElement>(null);
  const depRef = useRef<HTMLSpanElement>(null);
  const gateRef = useRef<HTMLSpanElement>(null);

  if (collapsed) {
    // Single severity dot — pick highest severity colour
    let dotClass = 'rip-badge rip-badge--gate';
    if (risk) dotClass = 'rip-badge rip-badge--risk';
    else if (dep && (dep.worstStatus === 'Late' || dep.worstStatus === 'AtRisk'))
      dotClass = 'rip-badge rip-badge--dep';
    const firstType: BadgeType = risk ? 'risk' : dep ? 'dep' : 'gate';
    return (
      <span
        className={dotClass}
        style={small ? collapseStyleSmall : collapseStyle}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseEnter={(e) => {
          onHover({ type: firstType, taskId, rect: (e.target as HTMLElement).getBoundingClientRect() });
        }}
        onMouseLeave={onLeave}
        onClick={(e) => {
          e.stopPropagation();
          onClick({ type: firstType, taskId, rect: (e.target as HTMLElement).getBoundingClientRect() });
        }}
        title="Linked register records"
      >
        •
      </span>
    );
  }

  return (
    <span
      className="task-badges"
      style={small ? badgesStyleSmall : badgesStyle}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {risk ? (
        <span
          ref={riskRef}
          className="rip-badge rip-badge--risk"
          style={small ? badgeStyleSmall : badgeStyle}
          onMouseEnter={() => onHover({ type: 'risk', taskId, rect: riskRef.current!.getBoundingClientRect() })}
          onMouseLeave={onLeave}
          onClick={(e) => {
            e.stopPropagation();
            onClick({ type: 'risk', taskId, rect: riskRef.current!.getBoundingClientRect() });
          }}
          title={`Risk score: ${risk.score}`}
        >
          {risk.score}
        </span>
      ) : null}
      {dep ? (
        <span
          ref={depRef}
          className="rip-badge rip-badge--dep"
          style={small ? badgeStyleSmall : badgeStyle}
          onMouseEnter={() => onHover({ type: 'dep', taskId, rect: depRef.current!.getBoundingClientRect() })}
          onMouseLeave={onLeave}
          onClick={(e) => {
            e.stopPropagation();
            onClick({ type: 'dep', taskId, rect: depRef.current!.getBoundingClientRect() });
          }}
          title={`External dependency: ${dep.worstStatus}`}
        >
          {/* plug glyph */}
          ⏚
        </span>
      ) : null}
      {gate ? (
        <span
          ref={gateRef}
          className="rip-badge rip-badge--gate"
          style={small ? badgeStyleSmall : badgeStyle}
          onMouseEnter={() => onHover({ type: 'gate', taskId, rect: gateRef.current!.getBoundingClientRect() })}
          onMouseLeave={onLeave}
          onClick={(e) => {
            e.stopPropagation();
            onClick({ type: 'gate', taskId, rect: gateRef.current!.getBoundingClientRect() });
          }}
          title={`Gate criteria: ${gate.criteriaMet}/${gate.criteriaTotal}`}
        >
          {gate.criteriaMet}/{gate.criteriaTotal}
        </span>
      ) : null}
    </span>
  );
}

const badgesStyle: React.CSSProperties = {
  position: 'absolute',
  right: 4,
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  zIndex: 2,
  pointerEvents: 'auto',
};

const badgesStyleSmall: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  marginLeft: 4,
  pointerEvents: 'auto',
};

const badgeStyle: React.CSSProperties = {
  cursor: 'pointer',
  fontSize: 9,
  padding: '1px 4px',
};

const badgeStyleSmall: React.CSSProperties = {
  cursor: 'pointer',
  fontSize: 8,
  padding: '1px 3px',
};

const collapseStyle: React.CSSProperties = {
  position: 'absolute',
  right: 3,
  top: '50%',
  transform: 'translateY(-50%)',
  cursor: 'pointer',
  fontSize: 9,
  padding: '1px 3px',
  zIndex: 2,
  pointerEvents: 'auto',
};

const collapseStyleSmall: React.CSSProperties = {
  cursor: 'pointer',
  fontSize: 8,
  padding: '1px 2px',
  marginLeft: 2,
};
