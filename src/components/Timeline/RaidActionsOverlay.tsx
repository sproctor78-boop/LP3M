import { RaidAction, Risk } from '../../domain/types';
import { diffDays } from '../../engine/dateUtils';
import { TimelineWindow } from '../../domain/types';

interface Props {
  actions: RaidAction[];
  risks: Risk[];
  window_: TimelineWindow;
  dayWidth: number;
  totalWidth: number;
  selectedActionId: string | null;
  onSelectAction: (actionId: string) => void;
}

export const RAID_BAND_HEIGHT = 72;

export function RaidActionsOverlay({
  actions,
  risks,
  window_,
  dayWidth,
  totalWidth,
  selectedActionId,
  onSelectAction,
}: Props) {
  const riskMap = new Map(risks.map((r) => [r.id, r]));

  // Sort actions by due date for stable rendering order
  const sorted = [...actions].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Assign stagger slots (up to 3 rows within the band) to avoid full overlap
  // Each slot is a horizontal lane; we try to fit into the topmost available lane.
  const SLOT_COUNT = 3;
  const slotLastX: number[] = Array(SLOT_COUNT).fill(-Infinity);
  const MIN_GAP = 28; // px between flag centres in the same slot

  return (
    <div className="raid-overlay-band" style={{ width: totalWidth, height: RAID_BAND_HEIGHT }}>
      {sorted.map((action) => {
        const x = diffDays(window_.start, action.dueDate) * dayWidth;
        if (x < 0 || x > totalWidth) return null;

        // Find first slot with enough horizontal clearance
        let slot = 0;
        for (let s = 0; s < SLOT_COUNT; s++) {
          if (x - slotLastX[s] >= MIN_GAP) {
            slot = s;
            break;
          }
          if (s === SLOT_COUNT - 1) slot = s; // all full: use last slot (overlap accepted)
        }
        slotLastX[slot] = x;

        const risk = riskMap.get(action.riskId);
        const isSelected = action.id === selectedActionId;
        const statusClass = action.status.toLowerCase();
        // top offset per slot: 4px, 24px, 44px
        const topOffset = 4 + slot * 20;
        const stemHeight = RAID_BAND_HEIGHT - topOffset - 18;

        return (
          <div
            key={action.id}
            className={`raid-flag ${statusClass}${isSelected ? ' selected' : ''}`}
            style={{ left: x, top: topOffset }}
            onClick={() => onSelectAction(action.id)}
            title={[
              `${action.id}: ${action.title}`,
              `Risk: ${risk?.id ?? action.riskId}`,
              `Owner: ${action.owner}`,
              `Due: ${action.dueDate}`,
              `Status: ${action.status}`,
            ].join('\n')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectAction(action.id)}
          >
            <span className="raid-flag-label">{action.id}</span>
            <div className="raid-flag-stem" style={{ height: stemHeight }} />
          </div>
        );
      })}
    </div>
  );
}
