import { useEffect, useState } from 'react';
import { DependencyType, WorkItem } from '../../domain/types';

interface Props {
  x: number;
  y: number;
  fromTask: WorkItem;
  toTask: WorkItem;
  currentType: DependencyType;
  currentLag: number;
  onApply: (type: DependencyType, lag: number) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function DependencyPopover({
  x,
  y,
  fromTask,
  toTask,
  currentType,
  currentLag,
  onApply,
  onDelete,
  onClose,
}: Props) {
  const [type, setType] = useState<DependencyType>(currentType);
  const [lag, setLag] = useState<number>(currentLag);

  // Clamp to viewport
  const [pos, setPos] = useState({ left: x + 8, top: y + 8 });
  useEffect(() => {
    const width = 260;
    const height = 200;
    const left = Math.min(window.innerWidth - width - 12, Math.max(8, x + 8));
    const top = Math.min(window.innerHeight - height - 12, Math.max(8, y + 8));
    setPos({ left, top });
  }, [x, y]);

  return (
    <div
      className="dep-popover"
      style={{ left: pos.left, top: pos.top }}
      role="dialog"
      aria-label="Edit dependency"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="dep-popover-title">
        {fromTask.title} → {toTask.title}
      </div>
      <div className="dep-popover-body">
        <strong>{toTask.title}</strong> can&rsquo;t start until{' '}
        <strong>{fromTask.title}</strong>{' '}
        {type === 'start_to_start' ? 'starts' : 'finishes'}.
      </div>
      <div className="dep-popover-row">
        <label htmlFor="dep-pop-type">Type</label>
        <select
          id="dep-pop-type"
          value={type}
          onChange={(event) => setType(event.target.value as DependencyType)}
        >
          <option value="finish_to_start">Finish-to-start</option>
          <option value="start_to_start">Start-to-start</option>
        </select>
      </div>
      <div className="dep-popover-row">
        <label htmlFor="dep-pop-lag">Lag</label>
        <input
          id="dep-pop-lag"
          type="number"
          min={0}
          max={30}
          step={1}
          value={lag}
          onChange={(event) => setLag(parseInt(event.target.value, 10) || 0)}
        />
      </div>
      <div className="dep-popover-actions">
        <button type="button" className="btn-danger" onClick={onDelete}>
          Delete
        </button>
        <button type="button" className="btn-cancel" onClick={onClose}>
          Close
        </button>
        <button type="button" className="btn-apply" onClick={() => onApply(type, lag)}>
          Apply
        </button>
      </div>
    </div>
  );
}
