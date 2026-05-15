import { WorkItem } from '../../domain/types';

interface Props {
  task: WorkItem;
  left: number;
  dayWidth: number;
  breach?: boolean;
  onSelect: () => void;
}

export function MilestoneBar({ task, left, dayWidth, breach, onSelect }: Props) {
  const x = left + dayWidth / 2;
  const classes = ['milestone'];
  if (task.locked) classes.push('locked');
  if (breach) classes.push('breach');

  return (
    <div
      className={classes.join(' ')}
      style={{ left: x }}
      data-task-id={task.id}
      onClick={onSelect}
    >
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <polygon
          points="14,3 25,14 14,25 3,14"
          fill={breach ? 'var(--breach)' : task.locked ? 'var(--locked)' : 'var(--accent)'}
          stroke={breach ? 'var(--breach-border)' : task.locked ? 'var(--locked)' : 'var(--accent)'}
          strokeWidth="1.5"
        />
        {task.locked ? (
          <>
            <rect x="11" y="11" width="6" height="5" fill="white" />
            <rect x="12" y="9" width="4" height="3" fill="none" stroke="white" strokeWidth="1" />
          </>
        ) : null}
      </svg>
      <span className="milestone-label">{task.title}</span>
    </div>
  );
}
