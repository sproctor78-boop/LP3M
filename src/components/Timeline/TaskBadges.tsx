// =============================================================================
// TaskBadges — compact icon-only badge cluster rendered inside task bars and
// task-list rows.
// =============================================================================
// A normal flex child of the bar's row (never absolutely positioned) so the
// title's flex:1 shrinks around it instead of badges painting over text —
// see the overlay contract comment at the top of Timeline.tsx.
// =============================================================================

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
  /** Total bar width in px — below a hard floor even a single icon collapses to a dot. */
  barWidth?: number;
  /** Smaller variant for task-list panel rows. */
  small?: boolean;
  onHover: (payload: BadgeClickPayload) => void;
  onLeave: () => void;
  onClick: (payload: BadgeClickPayload) => void;
}

/** Below this bar width (px), even a single badge collapses to a severity dot. */
const HARD_COLLAPSE_THRESHOLD = 34;

function RiskIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M7 2 L12.5 11.5 L1.5 11.5 Z" strokeLinejoin="round" />
      <path d="M7 5.5v2.5" strokeLinecap="round" />
      <circle cx="7" cy="9.6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DepIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="2" y="5.5" width="4" height="3" rx="0.8" />
      <rect x="8" y="5.5" width="4" height="3" rx="0.8" />
      <path d="M6 7h2" strokeLinecap="round" />
      <path d="M4 5.5V3M10 5.5V3" strokeLinecap="round" />
    </svg>
  );
}

function GateIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="7" cy="7" r="5.3" />
      <path d="M4.6 7.2 L6.2 8.8 L9.4 5.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface BadgeEntry {
  type: BadgeType;
  icon: JSX.Element;
  className: string;
  tooltip: string;
}

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
  const entries: BadgeEntry[] = [];
  if (risk) {
    entries.push({
      type: 'risk',
      icon: <RiskIcon />,
      className: 'rip-badge--risk',
      tooltip: `Risk score: ${risk.score}`,
    });
  }
  if (dep) {
    entries.push({
      type: 'dep',
      icon: <DepIcon />,
      className: 'rip-badge--dep',
      tooltip: `External dependency: ${dep.worstStatus}`,
    });
  }
  if (gate) {
    entries.push({
      type: 'gate',
      icon: <GateIcon />,
      className: 'rip-badge--gate',
      tooltip: `Gate criteria: ${gate.criteriaMet}/${gate.criteriaTotal}`,
    });
  }
  if (entries.length === 0) return null;

  const iconSizeClass = small ? 'task-badge-icon--small' : 'task-badge-icon';
  const hardCollapse = typeof barWidth === 'number' && barWidth < HARD_COLLAPSE_THRESHOLD;

  const badgeButton = (entry: BadgeEntry, key: string) => (
    <span
      key={key}
      className={`rip-badge ${entry.className} ${iconSizeClass}`}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseEnter={(e) => onHover({ type: entry.type, taskId, rect: (e.target as HTMLElement).getBoundingClientRect() })}
      onMouseLeave={onLeave}
      onClick={(e) => {
        e.stopPropagation();
        onClick({ type: entry.type, taskId, rect: (e.target as HTMLElement).getBoundingClientRect() });
      }}
      title={entry.tooltip}
    >
      {entry.icon}
    </span>
  );

  // Hard collapse (bar too narrow for even one icon) or 3+ badges: single
  // severity chip; hover reveals the full list without disturbing layout.
  if (hardCollapse || entries.length >= 3) {
    const primary = entries[0];
    return (
      <span
        className="task-badges-group task-badges-collapsed"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span
          className={`rip-badge ${primary.className} ${iconSizeClass}`}
          onMouseEnter={(e) => onHover({ type: primary.type, taskId, rect: (e.target as HTMLElement).getBoundingClientRect() })}
          onMouseLeave={onLeave}
          onClick={(e) => {
            e.stopPropagation();
            onClick({ type: primary.type, taskId, rect: (e.target as HTMLElement).getBoundingClientRect() });
          }}
          title={entries.map((en) => en.tooltip).join(' · ')}
        >
          {primary.icon}
          {entries.length > 1 ? <span className="task-badge-count">+{entries.length - 1}</span> : null}
        </span>
        {entries.length > 1 ? (
          <span className="task-badges-flyout" role="group" aria-label="Linked register records">
            {entries.map((entry) => badgeButton(entry, `flyout-${entry.type}`))}
          </span>
        ) : null}
      </span>
    );
  }

  // 1–2 badges on a bar with room: render icons directly, stacked vertically
  // when there are two so neither eats horizontal title space.
  return (
    <span
      className={`task-badges-group${entries.length > 1 ? ' task-badges-stack' : ''}`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {entries.map((entry) => badgeButton(entry, entry.type))}
    </span>
  );
}
