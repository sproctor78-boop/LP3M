import { AppState } from '../../domain/types';
import { detectConstraintIssues } from '../../engine/scheduleEngine';

interface Props {
  state: AppState;
}

export function StatusPill({ state }: Props) {
  const fc = state.pendingForecast;
  let className = 'pill';
  let label = 'Schedule clear';

  if (fc) {
    if (fc.constraintBreaches.length > 0) {
      className = 'pill bad';
      label = 'Breach pending';
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
    }
  }

  return (
    <span className={className}>
      <span className="pill-dot" />
      {label}
    </span>
  );
}
