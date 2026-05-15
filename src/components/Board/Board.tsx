import { useState } from 'react';
import { AppState } from '../../domain/types';
import { BoardColumn } from './BoardColumn';
import { showHint } from '../Toasts/Hint';

interface Props {
  state: AppState;
  onSelectTask: (taskId: string) => void;
  onMoveTaskStatus: (taskId: string, status: string) => void;
  onRenameColumn: (key: string, label: string) => void;
  onDeleteColumn: (key: string) => void;
  onAddColumn: () => void;
  onNewTask: () => void;
  onCollapseBoard: () => void;
}

export function Board({
  state,
  onSelectTask,
  onMoveTaskStatus,
  onRenameColumn,
  onDeleteColumn,
  onAddColumn,
  onNewTask,
  onCollapseBoard,
}: Props) {
  const { columns, tasks } = state.domain;
  const [dragging, setDragging] = useState(false);
  const [autoRenameKey, setAutoRenameKey] = useState<string | null>(null);

  const breachTaskIds = new Set(
    state.pendingForecast?.constraintBreaches.map((b) => b.taskId) ?? [],
  );

  const taskForColumn = (columnKey: string) => {
    return tasks.filter((t) => {
      const status = t.status || columns[0]?.key;
      return status === columnKey;
    });
  };

  const handleDrop = (taskId: string, columnKey: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.status === columnKey) return;
    onMoveTaskStatus(taskId, columnKey);
    const column = columns.find((c) => c.key === columnKey);
    if (column) showHint(`Moved "${task.title}" → ${column.label}`);
  };

  return (
    <section className="board-panel">
      <div className="board-header">
        <div>
          <div className="board-title">Work Board</div>
          <div className="board-meta">Operational Capability Delivery</div>
        </div>
        <div className="board-header-actions">
          <button type="button" className="btn" onClick={onNewTask} title="Add a new task">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M8 3v10M3 8h10" strokeLinecap="round" />
            </svg>
            New task
          </button>
          <button type="button" className="btn" onClick={onCollapseBoard} title="Hide board">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M10 3 L5 8 L10 13" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="kanban-cols">
        {columns.map((column) => (
          <BoardColumn
            key={column.key}
            column={column}
            ownTasks={taskForColumn(column.key)}
            allTasks={tasks}
            showCritical={state.view.showCritical}
            selectedTaskId={state.view.selectedTaskId}
            breachTaskIds={breachTaskIds}
            canDelete={columns.length > 1}
            activeDrop={dragging}
            autoRenameOnMount={autoRenameKey === column.key}
            onRename={(label) => {
              setAutoRenameKey(null);
              onRenameColumn(column.key, label);
            }}
            onDelete={() => onDeleteColumn(column.key)}
            onSelectTask={onSelectTask}
            onDropTask={(taskId) => handleDrop(taskId, column.key)}
            onDragStartCard={() => setDragging(true)}
            onDragEndCard={() => setDragging(false)}
          />
        ))}

        <button
          type="button"
          className="kanban-col-add"
          onClick={onAddColumn}
          title="Add a new column"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          Add column
        </button>
      </div>
    </section>
  );
}
