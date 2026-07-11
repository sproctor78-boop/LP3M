import { ViewMode } from '../../domain/types';
import {
  IconTimeline,
  IconBoard,
  IconRiskRegister,
  IconRaidBoard,
  IconExtDeps,
  IconDeliverables,
} from './SectionTileIcons';

export interface SectionTileOption {
  key: ViewMode;
  label: string;
}

interface Props {
  mode: ViewMode;
  options: SectionTileOption[];
  onSelect: (mode: ViewMode) => void;
}

const ICONS: Record<ViewMode, () => JSX.Element> = {
  timeline: IconTimeline,
  board: IconBoard,
  riskRegister: IconRiskRegister,
  raidBoard: IconRaidBoard,
  extDepRegister: IconExtDeps,
  deliverableRegister: IconDeliverables,
};

export function SectionTiles({ mode, options, onSelect }: Props) {
  return (
    <div className="section-tiles" role="tablist" aria-label="View mode">
      {options.map((opt) => {
        const Icon = ICONS[opt.key];
        const active = opt.key === mode;
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={`section-tile${active ? ' active' : ''}`}
            title={opt.label}
            onClick={() => {
              if (!active) onSelect(opt.key);
            }}
          >
            <span className="section-tile-icon"><Icon /></span>
            <span className="section-tile-label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
