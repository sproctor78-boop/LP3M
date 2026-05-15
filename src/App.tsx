import { useMemo, useState } from 'react';

type ViewMode = 'both' | 'board' | 'timeline';
type Status = 'backlog' | 'in_progress' | 'complete';

type Task = {
  id: string;
  title: string;
  status: Status;
  start: string;
  finish: string;
  lane: string;
  critical?: boolean;
  locked?: boolean;
  milestone?: boolean;
  parentId?: string | null;
};

const columns: Array<{ key: Status; label: string }> = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'complete', label: 'Complete' }
];

const tasks: Task[] = [
  { id: 'T01', title: 'Requirements baseline approval', status: 'complete', start: '2026-04-13', finish: '2026-04-17', lane: 'Define', critical: true },
  { id: 'T02', title: 'System design package', status: 'in_progress', start: '2026-04-18', finish: '2026-04-27', lane: 'Define', critical: true },
  { id: 'T03', title: 'Procurement contract award', status: 'backlog', start: '2026-04-28', finish: '2026-05-05', lane: 'Procure', critical: true },
  { id: 'T04', title: 'Site preparation works', status: 'backlog', start: '2026-04-28', finish: '2026-05-05', lane: 'Procure' },
  { id: 'T05', title: 'Equipment delivery and inspection', status: 'backlog', start: '2026-05-06', finish: '2026-05-20', lane: 'Procure', critical: true },
  { id: 'T06', title: 'Installation', status: 'backlog', start: '2026-05-21', finish: '2026-06-01', lane: 'Deliver', critical: true },
  { id: 'T07', title: 'Integration and acceptance testing', status: 'backlog', start: '2026-06-02', finish: '2026-06-11', lane: 'Deliver', critical: true },
  { id: 'T08', title: 'User acceptance trial', status: 'backlog', start: '2026-06-12', finish: '2026-06-19', lane: 'Assure', critical: true },
  { id: 'T09', title: 'Operational readiness review', status: 'backlog', start: '2026-06-20', finish: '2026-06-22', lane: 'Assure', critical: true },
  { id: 'T10', title: 'Service commencement', status: 'backlog', start: '2026-06-24', finish: '2026-06-24', lane: 'Assure', critical: true, locked: true, milestone: true }
];

function niceDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC'
  });
}

function daysBetween(start: string, finish: string) {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${finish}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>('T06');
  const [showCritical, setShowCritical] = useState(true);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const projectFinish = tasks.reduce((latest, task) => task.finish > latest ? task.finish : latest, '0000-00-00');
  const lanes = useMemo(() => Array.from(new Set(tasks.map((task) => task.lane))), []);
  const firstDate = '2026-04-13';

  const xOf = (date: string) => {
    const a = new Date(`${firstDate}T00:00:00Z`).getTime();
    const b = new Date(`${date}T00:00:00Z`).getTime();
    return Math.round((b - a) / 86_400_000) * 12;
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-title">Ripple<span>.</span></div>
          <div className="brand-tag">Schedule Impact Forecasting · v0.1</div>
        </div>

        <div className="header-centre">
          <div className="view-switch" aria-label="View switch">
            {(['both', 'board', 'timeline'] as ViewMode[]).map((mode) => (
              <button key={mode} className={viewMode === mode ? 'active' : ''} onClick={() => setViewMode(mode)}>
                {mode === 'both' ? 'Both' : mode === 'board' ? 'Board' : 'Timeline'}
              </button>
            ))}
          </div>
          <span className="pill"><span className="pill-dot" />Schedule clear</span>
        </div>

        <div className="header-actions">
          <button className="btn" onClick={() => setShowCritical((value) => !value)}>{showCritical ? 'Hide critical' : 'Show critical'}</button>
          <button className="btn" onClick={() => setSelectedTaskId(null)}>Close detail</button>
        </div>
      </header>

      <main className={`workspace ${viewMode === 'board' ? 'board' : viewMode === 'timeline' ? 'timeline' : ''}`}>
        {viewMode !== 'timeline' && (
          <section className="board-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Work Board</div>
                <div className="panel-meta">Operational capability delivery</div>
              </div>
            </div>
            <div className="kanban-columns">
              {columns.map((column) => {
                const columnTasks = tasks.filter((task) => task.status === column.key);
                return (
                  <div className="kanban-column" key={column.key}>
                    <div className="kanban-column-header">
                      <span className="kanban-column-title">{column.label}</span>
                      <span className="kanban-count">{columnTasks.length}</span>
                    </div>
                    {columnTasks.map((task) => (
                      <article
                        key={task.id}
                        className={`card ${selectedTaskId === task.id ? 'selected' : ''} ${task.critical && showCritical ? 'critical' : ''}`}
                        onClick={() => setSelectedTaskId(task.id)}
                      >
                        <div className="card-id">{task.id}{task.milestone ? ' · Milestone' : ''}</div>
                        <div className="card-title">{task.title}</div>
                        <div className="card-meta"><span>{niceDate(task.start)}</span><span>→</span><span>{niceDate(task.finish)}</span><span>{daysBetween(task.start, task.finish)}d</span></div>
                        <div className="card-badges">
                          {task.locked && <span className="badge locked">Locked</span>}
                          {task.critical && showCritical && <span className="badge critical">Critical</span>}
                        </div>
                      </article>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {viewMode !== 'board' && (
          <section className="timeline-panel">
            <div className="timeline-toolbar">
              <div>
                <div className="panel-title">Programme Timeline</div>
                <div className="timeline-meta">
                  <span>Forecast finish: <strong>{niceDate(projectFinish)}</strong></span>
                  <span>Critical tasks: <strong>{tasks.filter((task) => task.critical).length}</strong></span>
                  <span>Mode: <strong>Demo</strong></span>
                </div>
              </div>
            </div>
            <div className="timeline-scroll">
              <div className="timeline-grid" style={{ ['--day-width' as string]: '12px' }}>
                <div className="timeline-head">
                  <div className="timeline-label-head">Task</div>
                  <div className="timeline-date-head" style={{ width: 920 }}>
                    <div className="date-cells">
                      {Array.from({ length: 77 }, (_, index) => (
                        <div className="date-cell" key={index}>{index % 7 === 0 ? index + 1 : ''}</div>
                      ))}
                    </div>
                  </div>
                </div>
                {lanes.map((lane) => (
                  <div className="group-row" key={lane}>
                    <div className="group-label">{lane}</div>
                    {tasks.filter((task) => task.lane === lane).map((task) => {
                      const left = xOf(task.start);
                      const width = Math.max(10, daysBetween(task.start, task.finish) * 12 - 2);
                      return (
                        <div className="group-row" key={task.id}>
                          <div className="task-label" onClick={() => setSelectedTaskId(task.id)}>
                            <span className="task-label-id">{task.id}</span>
                            <span className="task-label-title">{task.title}</span>
                          </div>
                          <div className="timeline-row" style={{ width: 920 }}>
                            {task.milestone ? (
                              <div className={`milestone ${task.locked ? 'locked' : ''}`} style={{ left }} title={task.title}>
                                <span className="milestone-label">{task.title}</span>
                              </div>
                            ) : (
                              <div
                                className={`task-bar ${task.critical && showCritical ? 'critical' : ''}`}
                                style={{ left, width }}
                                onClick={() => setSelectedTaskId(task.id)}
                                title={`${task.title}: ${niceDate(task.start)} to ${niceDate(task.finish)}`}
                              >
                                <span>{task.title}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="legend">
              <span className="legend-item"><span className="swatch critical" />Critical path</span>
              <span className="legend-item"><span className="swatch locked" />Locked milestone</span>
              <span className="legend-item"><span className="swatch forecast" />Forecast movement later</span>
            </div>
          </section>
        )}
      </main>

      {selectedTask && (
        <aside className="drawer">
          <div className="drawer-header">
            <button className="btn drawer-close" onClick={() => setSelectedTaskId(null)}>Close</button>
            <div className="drawer-kicker">Task detail</div>
            <div className="drawer-title">{selectedTask.title}</div>
          </div>
          <div className="drawer-body">
            <div className="drawer-section">
              <div className="drawer-grid">
                <div className="field"><label>Start</label><input value={niceDate(selectedTask.start)} readOnly /></div>
                <div className="field"><label>Finish</label><input value={niceDate(selectedTask.finish)} readOnly /></div>
              </div>
            </div>
            <div className="drawer-section">
              <div className="panel-meta">Impact preview</div>
              <p style={{ margin: 0, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                This deployed version confirms the professional app shell, GitHub pipeline and Netlify deployment are working. The next iteration should reconnect the full scheduling engine, dependency drawing and forecast preview interactions.
              </p>
            </div>
            <div className="drawer-section">
              <div className="panel-meta">Status</div>
              <p style={{ margin: 0 }}>{selectedTask.status.replace('_', ' ')}</p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
