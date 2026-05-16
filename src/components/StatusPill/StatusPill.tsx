import { AppState } from '../../domain/types';
import { detectConstraintIssues } from '../../engine/scheduleEngine';

interface Props {
  state: AppState;
  onBreachClick?: () => void;
}

export function StatusPill({ state, onBreachClick }: Props) {
  const fc = state.pendingForecast;
  let className = 'pill';
  let label = 'Schedule clear';
  let hasBreaches = false;

  if (fc) {
    if (fc.constraintBreaches.length > 0) {
      className = 'pill bad';
      label = 'Breach pending';
      hasBreaches = true;
    } else if (fc.affectedTasks.length > 0) {
      className = 'pill warn';
      label = 'Forecast preview';
    } else {
      className = 'pill';
      label = 'No downstream impact';
    }
  } else {
    const { breaches } = detectConstraintIssues(state.domain.tasks);
    if (breaches.length > 0) {
      className = 'pill bad';
      label = `${breaches.length} constraint breach${breaches.length === 1 ? '' : 'es'}`;
      hasBreaches = true;
    }
  }

  if (hasBreaches && onBreachClick) {
    return (
      <button type="button" className={className} onClick={onBreachClick} title="Click to cycle through breached tasks">
        <span className="pill-dot" />
        {label}
      </button>
    );
  }

  return (
    <span className={className}>
      <span className="pill-dot" />
      {label}
    </span>
  );
}
