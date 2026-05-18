import { RaidAction } from '../../domain/types';

interface Props {
  action: RaidAction;
  riskId: string;
  selected: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  Todo: 'To Do',
  InProgress: 'In Progress',
  Done: 'Done',
  Overdue: 'Overdue',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

export function RaidActionCard({ action, riskId, selected, onSelect, onDragStart, onDragEnd }: Props) {
  const classes = [
    'kcard',
    'raid-action-card',
    selected && 'selected',
    action.status === 'Overdue' && 'overdue',
    action.status === 'Done' && 'done',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      data-action-id={action.id}
      draggable
      onClick={onSelect}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', action.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="kcard-id-row">
        <span className="kcard-id raid-action-risk-crumb">{riskId}</span>
        <span className={`badge raid-action-status-badge ${action.status.toLowerCase()}`}>
          {STATUS_LABELS[action.status] ?? action.status}
        </span>
      </div>
      <div className="kcard-title">{action.title}</div>
      <div className="kcard-meta">
        <span>{action.owner}</span>
        <span className="dot" />
        <span>Due {formatDate(action.dueDate)}</span>
      </div>
    </div>
  );
}
