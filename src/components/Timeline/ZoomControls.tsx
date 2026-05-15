import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, ZOOM_PRESETS } from '../../domain/constants';

interface Props {
  zoom: number;
  onZoomChange: (value: number) => void;
  onFit: () => void;
}

export function ZoomControls({ zoom, onZoomChange, onFit }: Props) {
  return (
    <div className="zoom-controls" id="zoom-controls">
      {ZOOM_PRESETS.map((preset) => (
        <button
          key={preset.key}
          type="button"
          title={preset.title}
          className={Math.abs(preset.pxPerDay - zoom) < 0.5 ? 'active' : ''}
          onClick={() => onZoomChange(preset.pxPerDay)}
        >
          {preset.label}
        </button>
      ))}
      <input
        type="range"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={0.5}
        value={zoom}
        title="Zoom"
        onChange={(event) => onZoomChange(parseFloat(event.target.value))}
        aria-label="Timeline zoom"
      />
      <button type="button" title="Fit timeline to screen" onClick={onFit}>
        Fit
      </button>
      <button
        type="button"
        title="Reset zoom"
        onClick={() => onZoomChange(DEFAULT_ZOOM)}
      >
        Reset
      </button>
    </div>
  );
}
