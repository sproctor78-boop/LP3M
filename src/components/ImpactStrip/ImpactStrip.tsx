import { ForecastResult, WorkItem } from '../../domain/types';
import { buildImpactNarrative } from '../../engine/impactEngine';

interface Props {
  forecast: ForecastResult;
  tasks: WorkItem[];
  onApply: () => void;
  onCancel: () => void;
  onDetails: () => void;
}

export function ImpactStrip({ forecast, tasks, onApply, onCancel, onDetails }: Props) {
  return (
    <div className="impact-strip">
      <div className="impact-strip-text">{buildImpactNarrative(forecast, tasks)}</div>
      <button className="btn" onClick={onDetails}>Details</button>
      <button className="btn" onClick={onCancel}>Cancel</button>
      <button className="btn primary" onClick={onApply}>Apply</button>
    </div>
  );
}
