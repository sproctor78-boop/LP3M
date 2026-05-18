import { useState } from 'react';
import { AppState } from '../../domain/types';
import { ActionStatus } from '../../domain/raidAction';
import { BoardColumn } from './BoardColumn';
import { RaidActionCard } from './RaidActionCard';
import { RAID_BOARD_COLUMNS, actionsForColumn, tasksForColumn } from './boardHelpers';
import { showHint } from '../Toasts/Hint';

interface Props {
  state: AppState;
  source?: 'projectTasks' | 'raidActions';
  onSelectTask: (taskId: string) => void;
  onMoveTaskStatus: (taskId: string, status: string) => void;
  onRenameColumn: (key: string, label: string) => void;
  onDeleteColumn: (key: string) => void;
  onAddColumn: () => void;
  onNewTask: () => void;
  onCollapseBoard: () => void;
  // RAID board props:
  onSelectAction?: (actionId: string) => void;
  onMoveActionStatus?: (actionId: string, status: ActionStatus) => void;
}

export function Board({
  state,
  source = 'projectTasks',
  onSelectTask,
  onMoveTaskStatus,
  onRenameColumn,
  onDeleteColumn,
  onAddColumn,
  onNewTask,
  onCollapseBoard,
  onSelectAction,
  onMoveActionStatus,
}: Props) {
  const { columns, tasks } = state.domain;
  const [dragging, setDragging] = useState(false);
  const [autoRenameKey, setAutoRenameKey] = useState<string | null>(null);

  const breachTaskIds = new Set(
    state.pendingForecast?.constraintBreaches.map((b) => b.taskId) ?? [],
  );

  const handleTaskDrop = (taskId: string, columnKey: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.status === columnKey) return;
    onMoveTaskStatus(taskId, columnKey);
    const column = columns.find((c) => c.key === columnKey);
    if (column) showHint(`Moved "${task.title}" → ${column.label}`);
  };

  const handleActionDrop = (actionId: string, columnKey: string) => {
    const action = state.domain.raidActions.find((a) => a.id === actionId);
    if (!action) return;
    if (action.status === columnKey) return;
    onMoveActionStatus?.(actionId, columnKey as ActionStatus);
    const col = RAID_BOARD_COLUMNS.find((c) => c.key === columnKey);
    if (col) showHint(`Action moved → ${col.label}`);
  };

  if (source === 'raidActions') {
    const riskMap = new Map(state.domain.risks.map((r) => [r.id, r]));

    return (
      <section className="board-panel">
        <div className="board-header">
          <div>
            <div className="board-title">RAID Actions Board</div>
            <div className="board-meta">
              Operational Capability Delivery · {state.domain.raidActions.length} actions
            </div>
          </div>
          <div className="board-header-actions">
            <button type="button" className="btn" onClick={onCollapseBoard} title="Switch to timeline">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M10 3 L5 8 L10 13" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="kanban-cols">
          {RAID_BOARD_COLUMNS.map((col) => {
            const colActions = actionsForColumn(state.domain.raidActions, col.key);
            return (
              <BoardColumn
                key={col.key}
                column={col}
                activeDrop={dragging}
                ownItems={colActions}
                selectedItemId={state.view.selectedActionId}
                renderCard={(id, selected) => {
                  const action = state.domain.raidActions.find((a) => a.id === id);
                  if (!action) return null;
                  const risk = riskMap.get(action.riskId);
                  return (
                    <RaidActionCard
                      key={id}
                      action={action}
                      riskId={risk?.id ?? action.riskId}
                      selected={selected}
                      onSelect={() => onSelectAction?.(id)}
                      onDragStart={() => setDragging(true)}
                      onDragEnd={() => setDragging(false)}
                    />
                  );
                }}
                onDropTask={(actionId) => handleActionDrop(actionId, col.key)}
                onDragStartCard={() => setDragging(true)}
                onDragEndCard={() => setDragging(false)}
              />
            );
          })}
        </div>
      </section>
    );
  }

  // Project Tasks Board
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
            ownTasks={tasksForColumn(tasks, columns, column.key)}
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
            onDropTask={(taskId) => handleTaskDrop(taskId, column.key)}
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
