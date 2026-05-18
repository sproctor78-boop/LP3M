import { Deliverable, DeliverableStatus, TimelineWindow } from '../../domain/types';
import { diffDays } from '../../engine/dateUtils';
import { getCompletionPercentage } from '../../domain/deliverable';

export const DELIVERABLES_BAND_HEIGHT = 72;

const STATUS_FILL: Record<DeliverableStatus, string> = {
  Planned: 'none',
  InProduction: '#3b82f6',
  InReview: '#f59e0b',
  Accepted: '#22c55e',
  Rejected: 'var(--breach)',
};

const STATUS_STROKE: Record<DeliverableStatus, string> = {
  Planned: 'var(--ink-3)',
  InProduction: '#3b82f6',
  InReview: '#f59e0b',
  Accepted: '#22c55e',
  Rejected: 'var(--breach)',
};

interface Props {
  deliverables: Deliverable[];
  window_: TimelineWindow;
  dayWidth: number;
  totalWidth: number;
  selectedDeliverableId: string | null;
  onSelectDeliverable: (id: string) => void;
}

export function DeliverablesOverlay({
  deliverables,
  window_,
  dayWidth,
  totalWidth,
  selectedDeliverableId,
  onSelectDeliverable,
}: Props) {
  const sorted = [...deliverables].sort((a, b) => a.targetDate.localeCompare(b.targetDate));

  const SLOT_COUNT = 3;
  const slotLastX: number[] = Array(SLOT_COUNT).fill(-Infinity);
  const MIN_GAP = 28;

  return (
    <div className="deliverables-overlay-band" style={{ width: totalWidth, height: DELIVERABLES_BAND_HEIGHT }}>
      {sorted.map((d) => {
        const x = diffDays(window_.start, d.targetDate) * dayWidth;
        if (x < 0 || x > totalWidth) return null;

        let slot = 0;
        for (let s = 0; s < SLOT_COUNT; s++) {
          if (x - slotLastX[s] >= MIN_GAP) { slot = s; break; }
          if (s === SLOT_COUNT - 1) slot = s;
        }
        slotLastX[slot] = x;

        const fill = STATUS_FILL[d.status];
        const stroke = STATUS_STROKE[d.status];
        const isSelected = d.id === selectedDeliverableId;
        const topOffset = 4 + slot * 20;
        const stemHeight = DELIVERABLES_BAND_HEIGHT - topOffset - 22;
        const pct = getCompletionPercentage(d);

        const tooltip = [
          `${d.id}: ${d.title}`,
          `Owner: ${d.owner}`,
          `Target: ${d.targetDate}`,
          `Status: ${d.status}`,
          `Completion: ${pct}%`,
        ].join('\n');

        return (
          <div
            key={d.id}
            className={`deliverable-marker${isSelected ? ' selected' : ''}`}
            style={{
              position: 'absolute',
              left: x - 8,
              top: topOffset,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => onSelectDeliverable(d.id)}
            title={tooltip}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectDeliverable(d.id)}
          >
            {/* Diamond — same geometry as MilestoneBar */}
            <svg width="16" height="16" viewBox="0 0 28 28" style={{ overflow: 'visible' }}>
              <polygon
                points="14,3 25,14 14,25 3,14"
                fill={fill}
                stroke={stroke}
                strokeWidth={d.status === 'Planned' ? 1.5 : 0}
              />
              {isSelected && (
                <polygon
                  points="14,3 25,14 14,25 3,14"
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth={2}
                />
              )}
            </svg>
            {/* ID label */}
            <span className="deliverable-label">{d.id}</span>
            {/* Stem */}
            <div
              style={{
                width: 1,
                height: stemHeight,
                background: stroke,
                opacity: d.status === 'Planned' ? 0.35 : 0.5,
                flexShrink: 0,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
