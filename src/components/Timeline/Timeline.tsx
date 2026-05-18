import { CSSProperties, useEffect, useRef, useState } from 'react';
import {
  AppState,
  DependencyType,
  GroupBy,
  WorkItem,
} from '../../domain/types';
import {
  addDays,
  diffDays,
  isWeekend,
  todayISO,
} from '../../engine/dateUtils';
import { wouldCreateCycle } from '../../engine/dependencyEngine';
import { ZoomControls } from './ZoomControls';
import { TimelineHeader } from './TimelineHeader';
import { SwimlaneLabel } from './SwimlaneLabel';
import { TaskBar } from './TaskBar';
import { MilestoneBar } from './MilestoneBar';
import { DependencyLines } from './DependencyLines';
import { DependencyPopover } from './DependencyPopover';
import { DrawingState } from './useDepHandleDrag';
import { Splitter } from './Splitter';
import { TaskListPanel } from './TaskListPanel';
import {
  computeTimelineLayout,
  computeTimelineWindow,
  TOTAL_HEADER_HEIGHT,
} from './layoutEngine';
import { RaidActionsOverlay, RAID_BAND_HEIGHT } from './RaidActionsOverlay';
import { formatNice } from '../../engine/dateUtils';
import { showHint } from '../Toasts/Hint';

interface Props {
  state: AppState;
  onZoom: (value: number) => void;
  onGroupBy: (value: GroupBy) => void;
  onSetTaskListWidth: (value: number) => void;
  onShowBoard: () => void;
  onSelectTask: (taskId: string) => void;
  onToggleParent: (taskId: string) => void;
  onToggleGroupCollapse: (key: string) => void;
  onPreviewTaskDates: (taskId: string, start: string, end: string) => void;
  onCancelForecast: () => void;
  onCreateDependency: (fromId: string, toId: string, depType: DependencyType) => void;
  onUpdateDependency: (fromId: string, toId: string, depType: DependencyType, lag: number) => void;
  onRemoveDependency: (fromId: string, toId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<WorkItem>) => void;
  onRenameSwimlane: (key: string, label: string) => void;
  onDeleteSwimlane: (key: string) => void;
  onMoveTaskSwimlane: (taskId: string, swimlane: string) => void;
  onMoveTaskStatus: (taskId: string, status: string) => void;
  onAddSwimlane: () => void;
  onSetMilestonesOnly: (value: boolean) => void;
  onSetRaidActionsVisible: (value: boolean) => void;
  onSelectAction: (actionId: string) => void;
  showImpactStrip: boolean;
  onClearScrollToTask?: () => void;
}

interface DepPopoverState {
  x: number;
  y: number;
  fromId: string;
  toId: string;
}

export function Timeline({
  state,
  onZoom,
  onGroupBy,
  onSetTaskListWidth,
  onShowBoard,
  onSelectTask,
  onToggleParent,
  onToggleGroupCollapse,
  onPreviewTaskDates,
  onCancelForecast,
  onCreateDependency,
  onUpdateDependency,
  onRemoveDependency,
  onUpdateTask,
  onRenameSwimlane,
  onDeleteSwimlane,
  onMoveTaskSwimlane,
  onMoveTaskStatus,
  onAddSwimlane,
  onSetMilestonesOnly,
  onSetRaidActionsVisible,
  onSelectAction,
  showImpactStrip,
  onClearScrollToTask,
}: Props) {
  const ganttScrollRef = useRef<HTMLDivElement | null>(null);
  const taskListScrollRef = useRef<HTMLDivElement | null>(null);
  const isSyncingScroll = useRef(false);

  const [drawing, setDrawing] = useState<DrawingState | null>(null);
  const [depPopover, setDepPopover] = useState<DepPopoverState | null>(null);

  const window_ = computeTimelineWindow(state);
  const layout = computeTimelineLayout(state);
  const dayWidth = state.view.zoom;
  const totalWidth = window_.totalDays * dayWidth;

  const fc = state.pendingForecast;
  const proposedById = fc ? new Map(fc.proposedTasks.map((t) => [t.id, t])) : null;
  const drawnTasks = fc ? fc.proposedTasks : state.domain.tasks;

  const xOf = (iso: string) => diffDays(window_.start, iso) * dayWidth;
  const today = todayISO();

  const handleFit = () => {
    if (!ganttScrollRef.current) return;
    const available = ganttScrollRef.current.clientWidth - 24;
    const next = Math.max(1.5, Math.min(60, available / window_.totalDays));
    onZoom(next);
  };

  // --- Vertical scroll sync between task list and gantt -----------------
  useEffect(() => {
    const taskListEl = taskListScrollRef.current;
    const ganttEl = ganttScrollRef.current;
    if (!taskListEl || !ganttEl) return;

    const syncFromTaskList = () => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      ganttEl.scrollTop = taskListEl.scrollTop;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    };
    const syncFromGantt = () => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      taskListEl.scrollTop = ganttEl.scrollTop;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    };
    taskListEl.addEventListener('scroll', syncFromTaskList, { passive: true });
    ganttEl.addEventListener('scroll', syncFromGantt, { passive: true });
    return () => {
      taskListEl.removeEventListener('scroll', syncFromTaskList);
      ganttEl.removeEventListener('scroll', syncFromGantt);
    };
  }, []);

  // Scroll to a task when scrollToTaskId is set (fix 3: sync task list too)
  useEffect(() => {
    const taskId = state.view.scrollToTaskId;
    if (!taskId || !ganttScrollRef.current) return;
    const centreY = layout.taskCentreY.get(taskId);
    if (centreY != null) {
      const scrollTop = Math.max(0, centreY - 80);
      ganttScrollRef.current.scrollTop = scrollTop;
      if (taskListScrollRef.current) {
        taskListScrollRef.current.scrollTop = scrollTop;
      }
    }
    onClearScrollToTask?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view.scrollToTaskId]);

  // ESC closes the dep popover
  useEffect(() => {
    if (!depPopover) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDepPopover(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [depPopover]);

  // Click outside the popover closes it
  useEffect(() => {
    if (!depPopover) return;
    const handler = (event: PointerEvent) => {
      const el = event.target as HTMLElement;
      if (el.closest('.dep-popover')) return;
      if (el.closest('.dep-hit')) return;
      setDepPopover(null);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [depPopover]);

  const renderRow = (
    task: WorkItem,
    y: number,
    height: number,
    isSummary: boolean,
  ) => {
    const rowClasses = ['timeline-row'];
    if (task.parentId) rowClasses.push('subtask');
    if (task.isParent) rowClasses.push('parent-row');
    if (isSummary) rowClasses.push('summary');

    const rowStyle: CSSProperties = {
      position: 'absolute',
      left: 0,
      top: y,
      width: totalWidth,
      height,
    };

    let barNode = null;
    if (isSummary) {
      const left = xOf(task.startDate);
      const widthDays = Math.max(1, diffDays(task.startDate, task.endDate) + 1);
      barNode = (
        <div
          className="task-bar"
          style={{
            left,
            width: Math.max(8, widthDays * dayWidth - 2),
            background: 'var(--surface-3)',
            borderColor: 'var(--border-strong)',
            color: 'var(--ink-2)',
          }}
        >
          <span className="task-bar-title">{task.title}</span>
        </div>
      );
    } else if (task.isMilestone) {
      const proposed = proposedById?.get(task.id);
      const displayTask = proposed ?? task;
      const breach = fc?.constraintBreaches.find((b) => b.taskId === task.id);
      const left = xOf(displayTask.startDate);
      barNode = (
        <MilestoneBar
          task={displayTask}
          left={left}
          dayWidth={dayWidth}
          breach={!!breach}
          onSelect={() => onSelectTask(task.id)}
        />
      );
    } else {
      const proposed = proposedById?.get(task.id);
      const wasChanged = fc?.changedTaskId === task.id;
      const wasAffected = fc?.affectedTasks.some((a) => a.taskId === task.id);
      const breach = fc?.constraintBreaches.find((b) => b.taskId === task.id);
      const oldShift = fc?.affectedTasks.find((a) => a.taskId === task.id);

      const ghost = wasChanged || wasAffected ? (
        <TaskBar
          key={`${task.id}-ghost`}
          task={
            wasChanged
              ? { ...task, startDate: fc!.oldStartDate, endDate: fc!.oldEndDate }
              : { ...task, startDate: oldShift!.oldStartDate, endDate: oldShift!.oldEndDate }
          }
          left={xOf(wasChanged ? fc!.oldStartDate : oldShift!.oldStartDate)}
          dayWidth={dayWidth}
          showCritical={state.view.showCritical}
          selected={false}
          ghost
        />
      ) : null;

      const displayTask = proposed ?? task;
      const bar = (
        <TaskBar
          key={task.id}
          task={displayTask}
          left={xOf(displayTask.startDate)}
          dayWidth={dayWidth}
          showCritical={state.view.showCritical}
          selected={state.view.selectedTaskId === task.id}
          forecast={!!wasAffected && !wasChanged}
          directlyChanged={!!wasChanged}
          breach={!!breach}
          expanded={state.view.expandedParents[task.id] !== false}
          onPreviewDates={(start, end) => onPreviewTaskDates(task.id, start, end)}
          onCommitDates={(start, end, moved) => {
            if (moved) onPreviewTaskDates(task.id, start, end);
          }}
          onCancelDates={() => onCancelForecast()}
          onSelect={() => onSelectTask(task.id)}
          onToggleParent={() => onToggleParent(task.id)}
          isInvalidDepTarget={(fromId, toId) => wouldCreateCycle(state.domain.tasks, fromId, toId)}
          onCreateDependency={(fromId, toId, side) => {
            const depType: DependencyType = side === 'left' ? 'start_to_start' : 'finish_to_start';
            onCreateDependency(fromId, toId, depType);
            showHint(`New link: ${fromId} → ${toId}`);
          }}
          onDepDrawingChange={setDrawing}
        />
      );

      barNode = (
        <>
          {ghost}
          {bar}
        </>
      );
    }

    const overlays = [];
    let cursor = window_.start;
    while (cursor <= window_.end) {
      if (isWeekend(cursor)) {
        overlays.push(
          <div
            key={`w-${cursor}`}
            className="row-weekend-overlay"
            style={{ left: xOf(cursor), width: dayWidth }}
          />,
        );
      }
      if (state.domain.workingCalendar.holidays.includes(cursor)) {
        overlays.push(
          <div
            key={`h-${cursor}`}
            className="row-holiday-overlay"
            style={{ left: xOf(cursor), width: dayWidth }}
          />,
        );
      }
      cursor = addDays(cursor, 1);
    }

    return (
      <div
        key={task.id}
        className={rowClasses.join(' ')}
        style={rowStyle}
        data-task-id={task.id}
        onDragOver={(event) => {
          if (state.view.groupBy === 'swimlane' || state.view.groupBy === 'status') {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }
        }}
      >
        {overlays}
        {barNode}
      </div>
    );
  };

  const gridContentHeight = layout.totalHeight;
  const raidBandVisible = state.view.raidActionsVisibleInTimeline;
  const gridTotalHeight = gridContentHeight + TOTAL_HEADER_HEIGHT + (raidBandVisible ? RAID_BAND_HEIGHT + 8 : 0);

  return (
    <section className="timeline-panel">
      <div className="timeline-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="btn"
            onClick={onShowBoard}
            title="Switch to board view"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="3" width="3.5" height="10" rx="0.5" />
              <rect x="8" y="3" width="3.5" height="10" rx="0.5" />
            </svg>
            Board
          </button>
          <div>
            <div className="timeline-title">Programme Timeline</div>
            <div className="timeline-meta">
              <span>
                Forecast finish:{' '}
                <strong>
                  {formatNice(
                    fc
                      ? fc.newProjectFinish
                      : state.domain.tasks.reduce(
                          (max, t) => (t.endDate > max ? t.endDate : max),
                          '0000-00-00',
                        ),
                  )}
                </strong>
              </span>
              <span>
                Critical path:{' '}
                <strong>
                  {(fc ? fc.proposedTasks : state.domain.tasks).filter((t) => t.criticalPath).length}{' '}
                  task{(fc ? fc.proposedTasks : state.domain.tasks).filter((t) => t.criticalPath).length === 1 ? '' : 's'}
                </strong>
              </span>
            </div>
          </div>
        </div>
        <div className="timeline-toolbar-controls">
          <div className="group-by-control">
            <label htmlFor="group-by-select">Group by</label>
            <select
              id="group-by-select"
              value={state.view.groupBy}
              onChange={(event) => onGroupBy(event.target.value as GroupBy)}
            >
              <option value="swimlane">Swimlane</option>
              <option value="parent">Parent</option>
              <option value="status">Board column</option>
              <option value="none">None</option>
            </select>
          </div>
          <button
            type="button"
            className={`milestones-only-chip${state.view.milestonesOnly ? ' active' : ''}`}
            onClick={() => onSetMilestonesOnly(!state.view.milestonesOnly)}
            title={state.view.milestonesOnly ? 'Show all tasks' : 'Show milestones only'}
          >
            <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
              <path d="M6 1 L11 6 L6 11 L1 6 Z" fill="currentColor" />
            </svg>
            Milestones only
          </button>
          <button
            type="button"
            className={`milestones-only-chip${state.view.raidActionsVisibleInTimeline ? ' active' : ''}`}
            onClick={() => onSetRaidActionsVisible(!state.view.raidActionsVisibleInTimeline)}
            title={state.view.raidActionsVisibleInTimeline ? 'Hide RAID actions' : 'Show RAID actions'}
          >
            <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 2 L2 10 L7 7 L7 5 L2 5" strokeLinejoin="round" />
            </svg>
            RAID actions
          </button>
          <ZoomControls zoom={state.view.zoom} onZoomChange={onZoom} onFit={handleFit} />
        </div>
      </div>

      <div className="timeline-body">
        <TaskListPanel
          ref={taskListScrollRef}
          layout={layout}
          width={state.view.taskListWidth}
          selectedTaskId={state.view.selectedTaskId}
          showCritical={state.view.showCritical}
          milestonesOnly={state.view.milestonesOnly}
          onSelectTask={onSelectTask}
          onToggleGroupCollapse={onToggleGroupCollapse}
          onToggleParent={onToggleParent}
          onUpdatePercent={(taskId, percent) =>
            onUpdateTask(taskId, { percentComplete: percent })
          }
        />
        <Splitter width={state.view.taskListWidth} onWidthChange={onSetTaskListWidth} />
        <div className="gantt-area">
          <div className="timeline-scroll" ref={ganttScrollRef}>
            <div
              className="timeline-grid"
              style={{ width: totalWidth, height: gridTotalHeight, position: 'relative' }}
            >
              <TimelineHeader
                window={window_}
                dayWidth={dayWidth}
                calendar={state.domain.workingCalendar}
              />

              <div
                style={{
                  position: 'absolute',
                  top: TOTAL_HEADER_HEIGHT,
                  left: 0,
                  width: totalWidth,
                  height: gridContentHeight,
                }}
              >
                {layout.groups.map((group) => (
                  <div key={group.key}>
                    <SwimlaneLabel
                      groupKey={group.key}
                      label={group.label}
                      taskCount={group.taskCount}
                      itemLabel={state.view.milestonesOnly ? 'milestone' : 'task'}
                      collapsed={group.collapsed}
                      editable={state.view.groupBy === 'swimlane'}
                      canDelete={state.domain.swimlanes.length > 1}
                      y={group.labelY}
                      onToggleCollapse={() => onToggleGroupCollapse(group.key)}
                      onRename={(label) => onRenameSwimlane(group.key, label)}
                      onDelete={() => onDeleteSwimlane(group.key)}
                      onDropTask={(taskId) => {
                        if (state.view.groupBy === 'swimlane') {
                          onMoveTaskSwimlane(taskId, group.key);
                          const lane = state.domain.swimlanes.find((s) => s.key === group.key);
                          if (lane) showHint(`Moved task → ${lane.label}`);
                        } else if (state.view.groupBy === 'status') {
                          onMoveTaskStatus(taskId, group.key);
                        }
                      }}
                    />
                    {group.summaryRow
                      ? renderRow(group.summaryRow.task!, group.summaryRow.y, group.summaryRow.height, true)
                      : group.rows.map((row) =>
                          renderRow(row.task!, row.y, row.height, false),
                        )}
                  </div>
                ))}

                <DependencyLines
                  tasks={drawnTasks}
                  timelineStart={window_.start}
                  dayWidth={dayWidth}
                  totalWidth={totalWidth}
                  totalHeight={gridContentHeight}
                  showCritical={state.view.showCritical}
                  taskCentreY={layout.taskCentreY}
                  pendingForecast={fc}
                  selectedDep={state.view.selectedDep}
                  onSelectDep={(fromId, toId, x, y) => setDepPopover({ fromId, toId, x, y })}
                />

                {today >= window_.start && today <= window_.end ? (
                  <div
                    className="today-line"
                    style={{
                      left: xOf(today),
                      top: 0,
                      height: gridContentHeight + (state.view.raidActionsVisibleInTimeline ? RAID_BAND_HEIGHT + 8 : 0),
                    }}
                  />
                ) : null}

                {state.view.raidActionsVisibleInTimeline ? (
                  <div style={{ position: 'absolute', top: gridContentHeight + 4, left: 0 }}>
                    <RaidActionsOverlay
                      actions={state.domain.raidActions}
                      risks={state.domain.risks}
                      window_={window_}
                      dayWidth={dayWidth}
                      totalWidth={totalWidth}
                      selectedActionId={state.view.selectedActionId}
                      onSelectAction={(actionId) => {
                        onSelectAction(actionId);
                      }}
                    />
                  </div>
                ) : null}
              </div>

              {state.view.groupBy === 'swimlane' ? (
                <div style={{ position: 'absolute', left: 0, top: TOTAL_HEADER_HEIGHT + gridContentHeight }}>
                  <button type="button" className="swimlane-add" onClick={onAddSwimlane}>
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M6 2v8M2 6h8" strokeLinecap="round" />
                    </svg>
                    Add swimlane
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {drawing ? (
        <svg className={`drawing-line ${drawing.invalid ? 'invalid' : ''}`}>
          <path
            d={(() => {
              const midX =
                drawing.fromSide === 'right' ? drawing.startX + 12 : drawing.startX - 12;
              return `M ${drawing.startX} ${drawing.startY} L ${midX} ${drawing.startY} L ${midX} ${drawing.cursorY} L ${drawing.cursorX} ${drawing.cursorY}`;
            })()}
          />
        </svg>
      ) : null}

      {depPopover
        ? (() => {
            const from = state.domain.tasks.find((t) => t.id === depPopover.fromId);
            const to = state.domain.tasks.find((t) => t.id === depPopover.toId);
            if (!from || !to) return null;
            const dep = to.dependencies.find((d) => d.taskId === from.id);
            if (!dep) return null;
            return (
              <DependencyPopover
                x={depPopover.x}
                y={depPopover.y}
                fromTask={from}
                toTask={to}
                currentType={dep.type}
                currentLag={dep.lagDays}
                onApply={(type, lag) => {
                  onUpdateDependency(from.id, to.id, type, lag);
                  setDepPopover(null);
                  showHint('Link updated');
                }}
                onDelete={() => {
                  onRemoveDependency(from.id, to.id);
                  setDepPopover(null);
                  showHint('Link removed');
                }}
                onClose={() => setDepPopover(null)}
              />
            );
          })()
        : null}

      <div style={{ display: showImpactStrip ? 'block' : 'none' }} />
    </section>
  );
}
