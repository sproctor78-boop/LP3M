import { BoardColumn, ForecastResult, Swimlane, WorkItem } from '../../domain/types';
import { formatNice } from '../../engine/dateUtils';
import { buildImpactNarrative } from '../../engine/impactEngine';

interface Props {
  task: WorkItem;
  tasks: WorkItem[];
  columns: BoardColumn[];
  swimlanes: Swimlane[];
  forecast: ForecastResult | null;
  onClose: () => void;
  onPreviewDates: (taskId: string, startDate: string, endDate: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<WorkItem>) => void;
}

export function InspectorDrawer({ task, tasks, columns, swimlanes, forecast, onClose, onPreviewDates, onUpdateTask }: Props) {
  const predecessors = task.dependencies.map((dependency) => tasks.find((candidate) => candidate.id === dependency.taskId)).filter(Boolean) as WorkItem[];
  const successors = tasks.filter((candidate) => candidate.dependencies.some((dependency) => dependency.taskId === task.id));
  const relevantForecast = forecast?.changedTaskId === task.id ? forecast : null;

  return (
    <aside className="drawer" aria-label="Task inspector">
      <div className="drawer-header">
        <button className="btn drawer-close" onClick={onClose} aria-label="Close inspector">×</button>
        <div className="drawer-kicker">Task detail</div>
        <div className="drawer-title">{task.title}</div>
      </div>
      <div className="drawer-body">
        {relevantForecast && (
          <section className="drawer-section" style={{ background: 'var(--forecast-soft)', margin: '-4px', padding: 14, borderRadius: 'var(--radius-md)' }}>
            <div className="drawer-kicker">Forecast impact</div>
            <div>{buildImpactNarrative(relevantForecast, tasks)}</div>
          </section>
        )}

        <section className="drawer-section">
          <div className="drawer-grid">
            <div className="field">
              <label>Start</label>
              <input
                type="date"
                value={task.startDate}
                disabled={task.locked}
                onChange={(event) => onPreviewDates(task.id, event.target.value, task.endDate)}
              />
            </div>
            <div className="field">
              <label>Finish</label>
              <input
                type="date"
                value={task.endDate}
                disabled={task.locked || task.isMilestone}
                onChange={(event) => onPreviewDates(task.id, task.startDate, event.target.value)}
              />
            </div>
          </div>
          <div className="drawer-grid">
            <div><div className="drawer-kicker">Duration</div><strong>{task.durationDays} day{task.durationDays === 1 ? '' : 's'}</strong></div>
            <div><div className="drawer-kicker">Float</div><strong>{task.floatDays ?? '—'} day{task.floatDays === 1 ? '' : 's'}</strong></div>
          </div>
        </section>

        <section className="drawer-section">
          <div className="field">
            <label>Board column</label>
            <select value={task.status} onChange={(event) => onUpdateTask(task.id, { status: event.target.value })}>
              {columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Swimlane</label>
            <select value={task.swimlane} onChange={(event) => onUpdateTask(task.id, { swimlane: event.target.value })}>
              {swimlanes.map((swimlane) => <option key={swimlane.key} value={swimlane.key}>{swimlane.label}</option>)}
            </select>
          </div>
        </section>

        <section className="drawer-section">
          <div className="drawer-kicker">Critical path</div>
          <div>{task.criticalPath ? 'Yes. Movement here may shift the forecast finish.' : `No. Current float is ${task.floatDays ?? '—'} days.`}</div>
        </section>

        <section className="drawer-section">
          <div className="drawer-kicker">Dependencies</div>
          <div>
            <strong>Predecessors</strong>
            {predecessors.length === 0 ? <p>No predecessor tasks.</p> : <ul>{predecessors.map((item) => <li key={item.id}>{item.id} · {item.title}</li>)}</ul>}
          </div>
          <div>
            <strong>Successors</strong>
            {successors.length === 0 ? <p>No successor tasks.</p> : <ul>{successors.map((item) => <li key={item.id}>{item.id} · {item.title}</li>)}</ul>}
          </div>
        </section>

        <section className="drawer-section">
          <div className="drawer-kicker">Constraint</div>
          {task.constraint ? (
            <div>{task.constraint.type.replace(/_/g, ' ')} · {formatNice(task.constraint.date)} · {task.constraint.hard ? 'Hard' : 'Advisory'}</div>
          ) : (
            <div>Flexible</div>
          )}
        </section>
      </div>
    </aside>
  );
}
