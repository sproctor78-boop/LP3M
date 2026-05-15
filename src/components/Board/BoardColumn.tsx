import { useEffect, useRef, useState } from 'react';
import { BoardColumn as Column, WorkItem } from '../../domain/types';
import { BoardCard } from './BoardCard';
import { showHint } from '../Toasts/Hint';

interface Props {
  column: Column;
  /** All tasks belonging in this column (own status matches). */
  ownTasks: WorkItem[];
  /** All tasks — used to find parents for ghost headers. */
  allTasks: WorkItem[];
  showCritical: boolean;
  selectedTaskId: string | null;
  breachTaskIds: Set<string>;
  canDelete: boolean;
  /** True while another card is being dragged. */
  activeDrop: boolean;
  /** True to autofocus the rename input on mount (for newly-added columns). */
  autoRenameOnMount?: boolean;
  onRename: (label: string) => void;
  onDelete: () => void;
  onSelectTask: (taskId: string) => void;
  onDropTask: (taskId: string) => void;
  onDragStartCard: () => void;
  onDragEndCard: () => void;
}

export function BoardColumn({
  column,
  ownTasks,
  allTasks,
  showCritical,
  selectedTaskId,
  breachTaskIds,
  canDelete,
  activeDrop,
  autoRenameOnMount,
  onRename,
  onDelete,
  onSelectTask,
  onDropTask,
  onDragStartCard,
  onDragEndCard,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(column.label);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current && autoRenameOnMount) {
      mounted.current = true;
      setEditing(true);
    }
  }, [autoRenameOnMount]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitRename = () => {
    setEditing(false);
    if (editValue.trim() && editValue.trim() !== column.label) {
      onRename(editValue.trim());
    } else {
      setEditValue(column.label);
    }
  };

  const cancelRename = () => {
    setEditing(false);
    setEditValue(column.label);
  };

  // Build a "groups + orphans" layout: children whose parent is in another column
  // get a ghost parent header above them in this column.
  const childrenByParent = new Map<string, WorkItem[]>();
  ownTasks.forEach((t) => {
    if (t.parentId) {
      const list = childrenByParent.get(t.parentId) ?? [];
      list.push(t);
      childrenByParent.set(t.parentId, list);
    }
  });

  const parentsTouchingCol = new Set<string>();
  ownTasks.forEach((t) => {
    if (t.isParent) parentsTouchingCol.add(t.id);
  });
  childrenByParent.forEach((_, parentId) => parentsTouchingCol.add(parentId));

  const parentOrder = allTasks
    .filter((t) => t.isParent && parentsTouchingCol.has(t.id))
    .map((t) => t.id);

  const renderedIds = new Set<string>();

  return (
    <div
      className={`kanban-col ${isDropTarget || activeDrop ? 'drop-target' : ''}`}
      data-column-key={column.key}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsDropTarget(true);
      }}
      onDragLeave={(event) => {
        if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
          setIsDropTarget(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDropTarget(false);
        const taskId = event.dataTransfer.getData('text/plain');
        if (taskId) {
          onDropTask(taskId);
        }
      }}
    >
      <div className="kanban-col-header">
        {editing ? (
          <input
            ref={inputRef}
            className="kanban-col-title-input"
            value={editValue}
            maxLength={40}
            onChange={(event) => setEditValue(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitRename();
              else if (event.key === 'Escape') cancelRename();
            }}
          />
        ) : (
          <span
            className="kanban-col-title"
            title="Click to rename"
            onClick={() => setEditing(true)}
          >
            {column.label}
          </span>
        )}
        <span className="kanban-col-count">{ownTasks.length}</span>
        {canDelete && !editing ? (
          <button
            type="button"
            className="kanban-col-delete"
            title="Delete column"
            aria-label="Delete column"
            onClick={(event) => {
              event.stopPropagation();
              const taskCount = ownTasks.filter((t) => !t.isParent).length;
              const message = taskCount > 0
                ? `Delete column "${column.label}"? Its ${taskCount} task${taskCount === 1 ? '' : 's'} will move to another column.`
                : `Delete column "${column.label}"?`;
              if (window.confirm(message)) {
                onDelete();
                showHint('Column deleted');
              }
            }}
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 2 L12 12 M12 2 L2 12" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>

      {parentOrder.map((parentId) => {
        const parent = allTasks.find((p) => p.id === parentId);
        if (!parent) return null;
        const childrenHere = childrenByParent.get(parentId) ?? [];
        const parentIsInCol = ownTasks.some((t) => t.id === parentId);

        const itemsToRender: WorkItem[] = [];
        if (parentIsInCol && !renderedIds.has(parentId)) {
          itemsToRender.push(parent);
          renderedIds.add(parentId);
        }
        childrenHere.forEach((c) => {
          if (!renderedIds.has(c.id)) {
            itemsToRender.push(c);
            renderedIds.add(c.id);
          }
        });

        return (
          <div className="kcard-group" key={parentId}>
            {!parentIsInCol ? (
              <div
                className="kcard-ghost-parent"
                onClick={() => onSelectTask(parent.id)}
              >
                <span className="kcard-ghost-parent-id">{parent.id}</span>
                <span className="kcard-ghost-parent-title">{parent.title}</span>
              </div>
            ) : null}
            {itemsToRender.map((task) => (
              <BoardCard
                key={task.id}
                task={task}
                selected={task.id === selectedTaskId}
                showCritical={showCritical}
                breadcrumbParent={null}
                nested={task.parentId === parentId}
                hasBreach={breachTaskIds.has(task.id)}
                onSelect={() => onSelectTask(task.id)}
                onDragStart={onDragStartCard}
                onDragEnd={onDragEndCard}
              />
            ))}
          </div>
        );
      })}

      {ownTasks
        .filter((t) => !t.parentId && !t.isParent && !renderedIds.has(t.id))
        .map((task) => {
          const parent = task.parentId
            ? allTasks.find((p) => p.id === task.parentId) ?? null
            : null;
          return (
            <BoardCard
              key={task.id}
              task={task}
              selected={task.id === selectedTaskId}
              showCritical={showCritical}
              breadcrumbParent={parent}
              nested={false}
              hasBreach={breachTaskIds.has(task.id)}
              onSelect={() => onSelectTask(task.id)}
              onDragStart={onDragStartCard}
              onDragEnd={onDragEndCard}
            />
          );
        })}
    </div>
  );
}
