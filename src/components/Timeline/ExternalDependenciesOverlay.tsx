import { ExternalDependency } from '../../domain/types';
import { diffDays } from '../../engine/dateUtils';
import { TimelineWindow } from '../../domain/types';

export const EXT_DEP_BAND_HEIGHT = 72;

const STATUS_FILL: Record<string, string> = {
  OnTrack: '#9333EA',
  AtRisk:  '#9333EA',
  Late:    '#9333EA',
  Received: '#c4b5fd',
};

const STATUS_STROKE: Record<string, string | null> = {
  OnTrack:  null,
  AtRisk:   'var(--risk)',
  Late:     'var(--breach)',
  Received: null,
};

interface Props {
  deps: ExternalDependency[];
  window_: TimelineWindow;
  dayWidth: number;
  totalWidth: number;
  selectedExtDepId: string | null;
  onSelectDep: (depId: string) => void;
}

export function ExternalDependenciesOverlay({
  deps,
  window_,
  dayWidth,
  totalWidth,
  selectedExtDepId,
  onSelectDep,
}: Props) {
  const sorted = [...deps].sort((a, b) => a.targetDate.localeCompare(b.targetDate));

  const SLOT_COUNT = 3;
  const slotLastX: number[] = Array(SLOT_COUNT).fill(-Infinity);
  const MIN_GAP = 28;

  return (
    <div className="ext-dep-overlay-band" style={{ width: totalWidth, height: EXT_DEP_BAND_HEIGHT }}>
      {sorted.map((dep) => {
        const x = diffDays(window_.start, dep.targetDate) * dayWidth;
        if (x < 0 || x > totalWidth) return null;

        let slot = 0;
        for (let s = 0; s < SLOT_COUNT; s++) {
          if (x - slotLastX[s] >= MIN_GAP) { slot = s; break; }
          if (s === SLOT_COUNT - 1) slot = s;
        }
        slotLastX[slot] = x;

        const fill = STATUS_FILL[dep.status] ?? '#9333EA';
        const stroke = STATUS_STROKE[dep.status];
        const isSelected = dep.id === selectedExtDepId;
        const topOffset = 4 + slot * 20;
        const stemHeight = EXT_DEP_BAND_HEIGHT - topOffset - 20;

        const tooltip = [
          `${dep.id}: ${dep.title}`,
          `External owner: ${dep.externalOwner}`,
          `Internal owner: ${dep.internalOwner}`,
          `Target: ${dep.targetDate}`,
          `Status: ${dep.status}`,
        ].join('\n');

        return (
          <div
            key={dep.id}
            className={`ext-dep-marker${isSelected ? ' selected' : ''}`}
            style={{ position: 'absolute', left: x, top: topOffset, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => onSelectDep(dep.id)}
            title={tooltip}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectDep(dep.id)}
          >
            {/* Inbound arrow: SVG left-pointing arrow + label */}
            <svg
              width="38"
              height="14"
              viewBox="0 0 38 14"
              style={{ overflow: 'visible' }}
            >
              {/* Arrow stem (horizontal line from right toward point) */}
              <line x1="12" y1="7" x2="36" y2="7" stroke={fill} strokeWidth={stroke ? 2 : 1.5} />
              {/* Arrowhead (left-pointing triangle) */}
              <polygon
                points="0,7 12,1 12,13"
                fill={fill}
                stroke={stroke ?? 'none'}
                strokeWidth={stroke ? 1.5 : 0}
              />
              {/* Status ring for AtRisk/Late */}
              {stroke && (
                <polygon
                  points="0,7 12,1 12,13"
                  fill="none"
                  stroke={stroke}
                  strokeWidth={2}
                />
              )}
              {/* Selected highlight */}
              {isSelected && (
                <polygon
                  points="0,7 12,1 12,13"
                  fill="none"
                  stroke="var(--ink)"
                  strokeWidth={1.5}
                />
              )}
            </svg>
            {/* ID label */}
            <span className="ext-dep-label">{dep.id}</span>
            {/* Stem down to band bottom */}
            <div
              className="ext-dep-stem"
              style={{
                width: 1,
                height: stemHeight,
                background: stroke ?? fill,
                opacity: stroke ? 0.8 : 0.4,
                flexShrink: 0,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
