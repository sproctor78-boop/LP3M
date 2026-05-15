import { AppState } from '../../domain/types';
import { buildImpactSummary } from '../../engine/impactEngine';

interface Props {
  state: AppState;
  onDetails: () => void;
  onApply: () => void;
  onCancel: () => void;
}

export function ImpactStrip({ state, onDetails, onApply, onCancel }: Props) {
  const fc = state.pendingForecast;
  if (!fc) return null;
  if (state.view.drawerOpen) return null;

  const summary = buildImpactSummary(fc, state.domain.tasks);

  return (
    <div className="impact-strip">
      <div className="impact-strip-summary">{summary}</div>
      <div className="impact-strip-actions">
        <button type="button" className="btn-cancel" onClick={onDetails}>
          Details
        </button>
        <button type="button" className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-apply" onClick={onApply}>
          Apply
        </button>
      </div>
    </div>
  );
}
