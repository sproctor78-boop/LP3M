export function Legend() {
  return (
    <div className="legend">
      <div className="legend-item">
        <span className="legend-swatch critical" /> Critical path
      </div>
      <div className="legend-item">
        <span className="legend-swatch changed" /> Directly changed
      </div>
      <div className="legend-item">
        <span className="legend-swatch forecast" /> Forecast-adjusted
      </div>
      <div className="legend-item">
        <span className="legend-swatch breach" /> Constraint breach
      </div>
      <div className="legend-item">
        <span className="legend-swatch locked" /> Locked
      </div>
    </div>
  );
}
