import { useMemo } from 'react';
import { AppState, ConstraintType, WorkItem } from '../../domain/types';
import { ColorSwatches } from './ColorSwatches';
import { formatNice } from '../../engine/dateUtils';

interface Props {
  state: AppState;
  task: WorkItem;
  onPreviewDates: (taskId: string, start: string, end: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<WorkItem>) => void;
  onSetParent: (taskId: string, parentId: string | null) => void;
  onConvertToParent: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onJumpToTask: (taskId: string) => void;
  onMoveTaskStatus: (taskId: string, status: string) => void;
  onMoveTaskSwimlane: (taskId: string, swimlane: string) => void;
  onAddSubtask: (parentTaskId: string) => void;
}

type ConstraintFormType = ConstraintType | 'flexible';

export function TaskInspector({
  state,
  task,
  onPreviewDates,
  onUpdateTask,
  onSetParent,
  onConvertToParent,
  onDeleteTask,
  onJumpToTask,
  onMoveTaskStatus,
  onMoveTaskSwimlane,
  onAddSubtask,
}: Props) {
  const predecessors = useMemo(
    () =>
      task.dependencies
        .map((d) => ({
          task: state.domain.tasks.find((t) => t.id === d.taskId),
          dep: d,
        }))
        .filter((x): x is { task: WorkItem; dep: typeof x.dep } => !!x.task),
    [task.dependencies, state.domain.tasks],
  );

  const successors = useMemo(
    () =>
      state.domain.tasks.filter((t) =>
        t.dependencies.some((d) => d.taskId === task.id),
      ),
    [task.id, state.domain.tasks],
  );

  const constraintType: ConstraintFormType = task.constraint?.type ?? 'flexible';
  const constraintDate = task.constraint?.date ?? task.startDate;
  const constraintHard = task.constraint?.hard ?? false;

  const showHardToggle =
    constraintType === 'start_no_earlier_than' || constraintType === 'finish_no_later_than';

  const defaultDateFor = (type: ConstraintFormType): string => {
    if (type === 'must_finish_on' || type === 'finish_no_later_than') return task.endDate;
    return task.startDate;
  };

  const commitConstraint = (
    nextType: ConstraintFormType,
    nextDate: string,
    nextHard: boolean,
  ) => {
    if (nextType === 'flexible') {
      onUpdateTask(task.id, { constraint: null });
    } else {
      const hardImplied = nextType === 'must_start_on' || nextType === 'must_finish_on' ? true : nextHard;
      onUpdateTask(task.id, {
        constraint: { type: nextType as ConstraintType, date: nextDate, hard: hardImplied },
      });
    }
  };

  const parentOptions = state.domain.tasks.filter((p) => p.isParent && p.id !== task.id);

  return (
    <div>
      <div className="detail-section">
        <div className="detail-grid">
          <div className="detail-field">
            <div className="detail-label">Start</div>
            <input
              type="date"
              value={task.startDate}
              disabled={task.locked}
              onChange={(event) => {
                if (!event.target.value) return;
                onPreviewDates(task.id, event.target.value, task.endDate);
              }}
            />
          </div>
          <div className="detail-field">
            <div className="detail-label">Finish</div>
            <input
              type="date"
              value={task.endDate}
              disabled={task.locked || task.isMilestone}
              onChange={(event) => {
                if (!event.target.value) return;
                onPreviewDates(task.id, task.startDate, event.target.value);
              }}
            />
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-grid">
          <div>
            <div className="detail-label">Duration</div>
            <div className="detail-value" style={{ fontFamily: 'var(--font-mono)' }}>
              {task.durationDays} day{task.durationDays === 1 ? '' : 's'}
            </div>
          </div>
          <div>
            <div className="detail-label">Float</div>
            <div className="detail-value" style={{ fontFamily: 'var(--font-mono)' }}>
              {task.floatDays ?? '—'} day{(task.floatDays ?? 0) === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </div>

      {!task.isMilestone ? (
        <div className="detail-section">
          <div className="detail-label">% Complete</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={task.percentComplete}
              style={{ flex: 1 }}
              onChange={(event) =>
                onUpdateTask(task.id, {
                  percentComplete: Math.max(0, Math.min(100, parseInt(event.target.value, 10))),
                })
              }
              aria-label="Percent complete"
            />
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              value={task.percentComplete}
              style={{ width: 70 }}
              onChange={(event) => {
                const next = parseInt(event.target.value, 10);
                if (Number.isFinite(next)) {
                  onUpdateTask(task.id, {
                    percentComplete: Math.max(0, Math.min(100, next)),
                  });
                }
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="detail-section">
        <label className="constraint-hard">
          <input
            type="checkbox"
            checked={task.locked}
            onChange={(event) => onUpdateTask(task.id, { locked: event.target.checked })}
          />
          <span>Locked — will not auto-move during forecast</span>
        </label>
      </div>

      <div className="detail-section">
        <div className="detail-label">Constraint</div>
        <select
          value={constraintType}
          onChange={(event) => {
            const nextType = event.target.value as ConstraintFormType;
            const nextDate = task.constraint?.date ?? defaultDateFor(nextType);
            const nextHard = task.constraint?.hard ?? true;
            commitConstraint(nextType, nextDate, nextHard);
          }}
        >
          <option value="flexible">Flexible</option>
          <option value="must_start_on">Must start on</option>
          <option value="must_finish_on">Must finish on</option>
          <option value="start_no_earlier_than">Start no earlier than</option>
          <option value="finish_no_later_than">Finish no later than</option>
        </select>
        {constraintType !== 'flexible' ? (
          <div style={{ marginTop: 8 }}>
            <input
              type="date"
              value={constraintDate}
              onChange={(event) => {
                if (!event.target.value) return;
                commitConstraint(constraintType, event.target.value, constraintHard);
              }}
            />
          </div>
        ) : null}
        {showHardToggle ? (
          <label className="constraint-hard" style={{ marginTop: 8 }}>
            <input
              type="checkbox"
              checked={constraintHard}
              onChange={(event) => commitConstraint(constraintType, constraintDate, event.target.checked)}
            />
            <span>Hard — flag as breach when violated</span>
          </label>
        ) : null}
        {(constraintType === 'must_start_on' || constraintType === 'must_finish_on') && (
          <div className="constraint-note">
            Pinned. Conflicting predecessors or successors will surface as breaches.
          </div>
        )}
        {task.locked ? (
          <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--locked)' }}>
            Task is locked — dates will not shift during forecast propagation.
          </div>
        ) : null}
      </div>

      {predecessors.length > 0 ? (
        <div className="detail-section">
          <div className="detail-label">Predecessors</div>
          <ul className="dep-list">
            {predecessors.map(({ task: pTask, dep }) => (
              <li key={pTask.id}>
                <span className="dep-link" onClick={() => onJumpToTask(pTask.id)}>
                  {pTask.title}
                </span>
                <span className="lag">{dep.lagDays > 0 ? `+${dep.lagDays}d` : dep.type === 'start_to_start' ? 'SS' : 'FS'}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {successors.length > 0 ? (
        <div className="detail-section">
          <div className="detail-label">Successors</div>
          <ul className="dep-list">
            {successors.map((sTask) => (
              <li key={sTask.id}>
                <span className="dep-link" onClick={() => onJumpToTask(sTask.id)}>
                  {sTask.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="detail-section">
        <div className="detail-label">Critical path</div>
        <div className="detail-value">
          {task.criticalPath
            ? 'Yes — task is on the critical path'
            : `No — ${task.floatDays ?? 0} day${(task.floatDays ?? 0) === 1 ? '' : 's'} of float`}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-label">Colour</div>
        <ColorSwatches
          current={task.color ?? null}
          onPick={(value) => onUpdateTask(task.id, { color: value })}
        />
      </div>

      {!task.isParent ? (
        <div className="detail-section">
          <div className="detail-label">Board column</div>
          <select
            value={task.status || state.domain.columns[0]?.key || ''}
            onChange={(event) => onMoveTaskStatus(task.id, event.target.value)}
          >
            {state.domain.columns.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="detail-section">
        <div className="detail-label">Swimlane</div>
        <select
          value={task.swimlane || state.domain.swimlanes[0]?.key || ''}
          onChange={(event) => onMoveTaskSwimlane(task.id, event.target.value)}
        >
          {state.domain.swimlanes.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {!task.isParent ? (
        <div className="detail-section">
          <div className="detail-label">Parent task</div>
          <select
            value={task.parentId ?? ''}
            onChange={(event) => onSetParent(task.id, event.target.value || null)}
          >
            <option value="">— None (top-level) —</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          {!task.parentId ? (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  if (window.confirm(
                    `Convert "${task.title}" to a parent task? Its current duration will be replaced with the rolled-up span of any subtasks you add.`,
                  )) {
                    onConvertToParent(task.id);
                  }
                }}
                title="Convert this task into a parent that can contain subtasks"
              >
                Convert to parent task
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {task.isParent ? (
        <div className="detail-section">
          <div className="detail-label">Children</div>
          <div className="subtasks-list">
            {(() => {
              const children = state.domain.tasks.filter((c) => c.parentId === task.id);
              if (children.length === 0) {
                return <div className="detail-value" style={{ color: 'var(--ink-faint)' }}>No subtasks yet</div>;
              }
              return children.map((c) => (
                <div
                  key={c.id}
                  className="subtask-row"
                  onClick={() => onJumpToTask(c.id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="subtask-row-title">{c.title}</span>
                  <span className="subtask-row-meta">{c.durationDays}d</span>
                </div>
              ));
            })()}
          </div>
        </div>
      ) : null}

      <div
        className="detail-section"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}
      >
        {task.isParent ? (
          <button
            type="button"
            className="btn-cancel"
            onClick={() => onAddSubtask(task.id)}
          >
            + Add subtask
          </button>
        ) : null}
        {!task.locked ? (
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              if (
                window.confirm(
                  `Delete task "${task.title}"? Any tasks depending on it will lose that link.`,
                )
              ) {
                onDeleteTask(task.id);
              }
            }}
          >
            Delete task
          </button>
        ) : null}
      </div>

      <div className="detail-section">
        <div className="detail-label">Reference</div>
        <div className="detail-value">
          {task.id} · {formatNice(task.startDate)} → {formatNice(task.endDate)}
        </div>
      </div>
    </div>
  );
}
