export function Legend() {
  return (
    <div className="legend">
      <span className="legend-item"><span className="swatch critical" /> Critical path</span>
      <span className="legend-item"><span className="swatch forecast" /> Forecast movement</span>
      <span className="legend-item"><span className="swatch locked" /> Locked date</span>
      <span className="legend-item"><span className="swatch" /> Standard task</span>
    </div>
  );
}
