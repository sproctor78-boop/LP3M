import { useEffect, useRef, useState } from 'react';
import { showHint } from '../Toasts/Hint';

interface Props {
  groupKey: string;
  label: string;
  taskCount: number;
  /** Singular label for one item in the count, defaults to 'task'. */
  itemLabel?: string;
  collapsed: boolean;
  /** True if rename/delete affordances should be available (swimlane mode only). */
  editable: boolean;
  canDelete: boolean;
  y: number;
  onToggleCollapse: () => void;
  onRename: (label: string) => void;
  onDelete: () => void;
  onDropTask: (taskId: string) => void;
}

export function SwimlaneLabel({
  groupKey,
  label,
  taskCount,
  itemLabel = 'task',
  collapsed,
  editable,
  canDelete,
  y,
  onToggleCollapse,
  onRename,
  onDelete,
  onDropTask,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(label);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setValue(label);
  }, [label]);

  const commit = () => {
    setEditing(false);
    if (value.trim() && value.trim() !== label) {
      onRename(value.trim());
    } else {
      setValue(label);
    }
  };

  return (
    <div
      className={`swimlane-label ${collapsed ? 'collapsed' : ''} ${isDropTarget ? 'drop-target' : ''}`}
      style={{ top: y, position: 'absolute' }}
      data-swimlane-key={groupKey}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsDropTarget(true);
      }}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDropTarget(false);
        const taskId = event.dataTransfer.getData('text/plain');
        if (taskId) onDropTask(taskId);
      }}
    >
      <button
        type="button"
        className="swimlane-chevron"
        title={collapsed ? 'Expand' : 'Collapse'}
        onClick={(event) => {
          event.stopPropagation();
          onToggleCollapse();
        }}
      >
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {editing ? (
        <input
          ref={inputRef}
          className="swimlane-name-input"
          value={value}
          maxLength={40}
          onChange={(event) => setValue(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
            else if (event.key === 'Escape') {
              setEditing(false);
              setValue(label);
            }
          }}
        />
      ) : (
        <span
          className={`swimlane-name ${editable ? 'editable' : ''}`}
          title={editable ? 'Click to rename' : ''}
          onClick={() => editable && setEditing(true)}
        >
          {label}
        </span>
      )}

      <span className="swimlane-count">
        {taskCount} {itemLabel}{taskCount === 1 ? '' : 's'}
      </span>

      {editable && canDelete ? (
        <button
          type="button"
          className="swimlane-delete"
          title="Delete swimlane"
          aria-label="Delete swimlane"
          onClick={(event) => {
            event.stopPropagation();
            const message = taskCount > 0
              ? `Delete swimlane "${label}"? Its ${taskCount} task${taskCount === 1 ? '' : 's'} will move to another lane.`
              : `Delete swimlane "${label}"?`;
            if (window.confirm(message)) {
              onDelete();
              showHint('Swimlane deleted');
            }
          }}
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M2 2 L12 12 M12 2 L2 12" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
