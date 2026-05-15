import type { Dispatch } from 'react';
import { AppAction } from '../../state/appState';
import { AppState, TimelineWindow, WorkItem } from '../../domain/types';
import { addDays, dayOfWeek, diffDays, formatNice, isWeekend } from '../../engine/dateUtils';
import { moveTaskByDays } from '../../engine/forecastEngine';

interface Props {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

function computeTimelineWindow(tasks: WorkItem[]): TimelineWindow {
  const dates = tasks.flatMap((task) => [task.startDate, task.endDate]);
  const min = dates.reduce((current, value) => value < current ? value : current, '9999-12-31');
  const max = dates.reduce((current, value) => value > current ? value : current, '0000-01-01');
  let start = addDays(min, -7);
  while (dayOfWeek(start) !== 1) start = addDays(start, -1);
  let end = addDays(max, 14);
  while (dayOfWeek(end) !== 0) end = addDays(end, 1);
  return { start, end, totalDays: diffDays(start, end) + 1 };
}

function visibleTasks(state: AppState): WorkItem[] {
  return state.domain.tasks.filter((task) => {
    if (!task.parentId) return true;
    return state.view.expandedParents[task.parentId] !== false;
  });
}

function groupTasks(state: AppState, tasks: WorkItem[]): Array<{ key: string; label: string; tasks: WorkItem[] }> {
  const groups = new Map<string, WorkItem[]>();
  const labelFor = (task: WorkItem): { key: string; label: string } => {
    if (state.view.groupBy === 'status') {
      const column = state.domain.columns.find((item) => item.key === task.status);
      return { key: task.status, label: column?.label ?? task.status };
    }
    if (state.view.groupBy === 'parent') {
      if (!task.parentId) return { key: '__top', label: 'Top level' };
      const parent = state.domain.tasks.find((item) => item.id === task.parentId);
      return { key: task.parentId, label: parent?.title ?? task.parentId };
    }
    if (state.view.groupBy === 'none') return { key: '__all', label: 'All tasks' };
    const lane = state.domain.swimlanes.find((item) => item.key === task.swimlane);
    return { key: task.swimlane, label: lane?.label ?? task.swimlane };
  };

  tasks.forEach((task) => {
    const { key } = labelFor(task);
    groups.set(key, [...(groups.get(key) ?? []), task]);
  });

  return [...groups.entries()].map(([key, taskList]) => ({ key, label: labelFor(taskList[0]).label, tasks: taskList }));
}

export function Timeline({ state, dispatch }: Props) {
  const baseTasks = visibleTasks(state);
  const renderedTasks = state.pendingForecast
    ? baseTasks.map((task) => state.pendingForecast?.proposedTasks.find((item) => item.id === task.id) ?? task)
    : baseTasks;
  const window = computeTimelineWindow(renderedTasks);
  const dayWidth = state.view.timelineZoomPxPerDay;
  const totalWidth = window.totalDays * dayWidth;
  const xOf = (date: string) => diffDays(window.start, date) * dayWidth;
  const groups = groupTasks(state, renderedTasks);
  const projectFinish = renderedTasks.reduce((max, task) => task.endDate > max ? task.endDate : max, '0000-00-00');
  const criticalCount = renderedTasks.filter((task) => task.criticalPath).length;
  const minFloat = Math.min(...renderedTasks.map((task) => task.floatDays ?? 0));
  const dates = Array.from({ length: window.totalDays }, (_, index) => addDays(window.start, index));

  return (
    <>
      <div className="timeline-toolbar">
        <div>
          <div className="panel-title">Programme Timeline</div>
          <div className="timeline-meta">
            <span>Forecast finish: <strong>{formatNice(projectFinish)}</strong></span>
            <span>Critical tasks: <strong>{criticalCount}</strong></span>
            <span>Minimum float: <strong>{minFloat}d</strong></span>
          </div>
        </div>
        <div className="zoom-controls">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>Zoom</span>
          <input
            type="range"
            min="6"
            max="42"
            value={dayWidth}
            onChange={(event) => dispatch({ type: 'setZoom', value: Number(event.target.value) })}
          />
        </div>
      </div>
      <div className="timeline-scroll">
        <div className="timeline-grid" style={{ ['--day-width' as string]: `${dayWidth}px` }}>
          <div className="timeline-head">
            <div className="timeline-label-head">Task</div>
            <div className="timeline-date-head" style={{ width: totalWidth }}>
              <div className="date-cells">
                {dates.map((date) => (
                  <div className={`date-cell ${isWeekend(date) ? 'weekend' : ''}`} key={date} title={formatNice(date)}>
                    {dayWidth >= 18 ? new Date(`${date}T00:00:00Z`).getUTCDate() : dayOfWeek(date) === 1 ? new Date(`${date}T00:00:00Z`).getUTCDate() : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {groups.map((group) => (
            <div className="group-row" key={group.key}>
              <div className="group-label">{group.label}</div>
              {group.tasks.map((task) => {
                const original = state.domain.tasks.find((item) => item.id === task.id) ?? task;
                const changed = state.pendingForecast?.changedTaskId === task.id;
                const affected = state.pendingForecast?.affectedTasks.find((movement) => movement.taskId === task.id);
                const left = xOf(task.startDate);
                const width = Math.max(dayWidth - 2, (diffDays(task.startDate, task.endDate) + 1) * dayWidth - 2);
                return (
                  <div className="group-row" key={task.id}>
                    <div className={`task-label ${task.parentId ? 'subtask' : ''}`} onClick={() => dispatch({ type: 'selectTask', taskId: task.id, openDrawer: true })}>
                      {task.isParent && (
                        <button className="btn" style={{ padding: '2px 6px' }} onClick={(event) => { event.stopPropagation(); dispatch({ type: 'toggleParent', taskId: task.id }); }}>
                          {state.view.expandedParents[task.id] === false ? '+' : '−'}
                        </button>
                      )}
                      <span className="task-label-id">{task.id}</span>
                      <span className="task-label-title">{task.title}</span>
                    </div>
                    <div className={`timeline-row ${task.parentId ? 'subtask' : ''}`} style={{ width: totalWidth }}>
                      {(changed || affected) && (
                        <div
                          className="task-bar ghost"
                          style={{ left: xOf(original.startDate), width: Math.max(dayWidth - 2, (diffDays(original.startDate, original.endDate) + 1) * dayWidth - 2) }}
                          title="Original position"
                        >
                          <span>{original.title}</span>
                        </div>
                      )}
                      {task.isMilestone ? (
                        <div className={`milestone ${task.locked ? 'locked' : ''}`} style={{ left: left + dayWidth / 2 - 14 }} title={task.title}>
                          <span className="milestone-label">{task.title}</span>
                        </div>
                      ) : (
                        <div
                          className={`task-bar ${task.isParent ? 'parent' : ''} ${task.parentId ? 'subtask' : ''} ${task.locked ? 'locked' : ''} ${task.criticalPath && state.view.showCritical ? 'critical' : ''} ${changed ? 'direct' : affected ? 'forecast' : ''}`}
                          style={{ left, width }}
                          title={`${task.title}: ${formatNice(task.startDate)} to ${formatNice(task.endDate)}`}
                          onClick={() => dispatch({ type: 'selectTask', taskId: task.id, openDrawer: true })}
                          onPointerDown={(event) => {
                            if (task.locked) return;
                            const startX = event.clientX;
                            const onMove = (moveEvent: PointerEvent) => {
                              const delta = Math.round((moveEvent.clientX - startX) / dayWidth);
                              if (delta !== 0) {
                                const result = moveTaskByDays(state.domain.tasks, task.id, delta);
                                if (result) dispatch({ type: 'previewTaskDates', taskId: task.id, startDate: result.newStartDate, endDate: result.newEndDate });
                              }
                            };
                            const onUp = () => {
                              document.removeEventListener('pointermove', onMove);
                              document.removeEventListener('pointerup', onUp);
                            };
                            document.addEventListener('pointermove', onMove);
                            document.addEventListener('pointerup', onUp);
                          }}
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
    </>
  );
}
