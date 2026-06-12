// =============================================================================
// TaskListPanel — MS-Project-style task list on the left of the timeline
// =============================================================================
// Rows are positioned absolutely using the same layout the Gantt uses, so
// every list row sits at the exact same Y as its bar. Swimlane labels and
// summary rows mirror the Gantt structure for visual symmetry.
// =============================================================================

import React, { ForwardedRef, forwardRef, useState } from 'react';
import { WorkItem } from '../../domain/types';
import { formatShort } from '../../engine/dateUtils';
import { LayoutGroup } from './layoutEngine';
import { TaskBadges, BadgeClickPayload } from './TaskBadges';
import { TaskBadges as TaskBadgesData } from '../../state/selectors';

interface Props {
  layout: { groups: LayoutGroup[]; totalHeight: number };
  width: number;
  selectedTaskId: string | null;
  showCritical: boolean;
  milestonesOnly?: boolean;
  onSelectTask: (taskId: string) => void;
  onToggleGroupCollapse: (key: string) => void;
  onToggleParent: (taskId: string) => void;
  onUpdatePercent: (taskId: string, percent: number) => void;
  badgeMap?: Map<string, TaskBadgesData>;
  onBadgeHover?: (payload: BadgeClickPayload) => void;
  onBadgeLeave?: () => void;
  onBadgeClick?: (payload: BadgeClickPayload) => void;
}

const HEADER_HEIGHT = 52; // matches TOTAL_HEADER_HEIGHT in layoutEngine

export const TaskListPanel = forwardRef(function TaskListPanel(
  {
    layout,
    width,
    selectedTaskId,
    showCritical,
    milestonesOnly = false,
    onSelectTask,
    onToggleGroupCollapse,
    onToggleParent,
    onUpdatePercent,
    badgeMap,
    onBadgeHover,
    onBadgeLeave,
    onBadgeClick,
  }: Props,
  scrollRef: ForwardedRef<HTMLDivElement>,
) {
  return (
    <div className="task-list-panel" style={{ width }}>
      <div className="task-list-header" style={{ height: HEADER_HEIGHT }}>
        <div className="tl-col tl-col-name">Task</div>
        <div className="tl-col tl-col-duration">Dur</div>
        <div className="tl-col tl-col-percent">%</div>
      </div>
      <div className="task-list-scroll" ref={scrollRef}>
        <div
          className="task-list-rows"
          style={{ position: 'relative', height: layout.totalHeight }}
        >
          {layout.groups.map((group) => (
            <div key={group.key}>
              {/* Group label row, mirrors the swimlane label in the Gantt */}
              <div
                className={`task-list-group ${group.collapsed ? 'collapsed' : ''}`}
                style={{ position: 'absolute', top: group.labelY, left: 0, right: 0, height: 32 }}
                onClick={() => onToggleGroupCollapse(group.key)}
              >
                <span className="task-list-group-chevron" aria-hidden="true">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="task-list-group-label">{group.label}</span>
                <span className="task-list-group-count">
                  {group.taskCount} {milestonesOnly ? 'milestone' : 'task'}{group.taskCount === 1 ? '' : 's'}
                </span>
              </div>

              {/* Either a single summary row (collapsed) or all task rows */}
              {group.summaryRow ? (
                <div
                  className="task-list-row summary"
                  style={{
                    position: 'absolute',
                    top: group.summaryRow.y,
                    left: 0,
                    right: 0,
                    height: group.summaryRow.height,
                  }}
                >
                  <div className="tl-col tl-col-name">
                    <span className="task-list-name-summary">
                      {group.summaryRow.task!.title}
                    </span>
                  </div>
                  <div className="tl-col tl-col-duration">—</div>
                  <div className="tl-col tl-col-percent">—</div>
                </div>
              ) : (
                group.rows.map((row) => (
                  <TaskListRow
                    key={row.taskId}
                    task={row.task!}
                    y={row.y}
                    height={row.height}
                    isSubtask={row.isSubtask}
                    selected={row.taskId === selectedTaskId}
                    showCritical={showCritical}
                    onSelect={() => onSelectTask(row.taskId)}
                    onToggleParent={() => onToggleParent(row.taskId)}
                    onUpdatePercent={(percent) => onUpdatePercent(row.taskId, percent)}
                    badges={badgeMap?.get(row.taskId)}
                    onBadgeHover={onBadgeHover}
                    onBadgeLeave={onBadgeLeave}
                    onBadgeClick={onBadgeClick}
                  />
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

interface RowProps {
  task: WorkItem;
  y: number;
  height: number;
  isSubtask: boolean;
  selected: boolean;
  showCritical: boolean;
  onSelect: () => void;
  onToggleParent: () => void;
  onUpdatePercent: (percent: number) => void;
  badges?: TaskBadgesData;
  onBadgeHover?: (payload: BadgeClickPayload) => void;
  onBadgeLeave?: () => void;
  onBadgeClick?: (payload: BadgeClickPayload) => void;
}

function TaskListRow({
  task,
  y,
  height,
  isSubtask,
  selected,
  showCritical,
  onSelect,
  onToggleParent,
  onUpdatePercent,
  badges,
  onBadgeHover,
  onBadgeLeave,
  onBadgeClick,
}: RowProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(task.percentComplete));
  const isCritical = task.criticalPath && showCritical;

  const classes = ['task-list-row'];
  if (isSubtask) classes.push('subtask');
  if (task.isParent) classes.push('parent');
  if (selected) classes.push('selected');
  if (isCritical) classes.push('critical');
  if (task.isMilestone) classes.push('milestone');
  if (task.locked) classes.push('locked');

  const commitEdit = () => {
    setEditing(false);
    const parsed = parseInt(editValue, 10);
    if (Number.isFinite(parsed)) {
      onUpdatePercent(Math.max(0, Math.min(100, parsed)));
    }
  };

  return (
    <div
      className={classes.join(' ')}
      style={{ position: 'absolute', top: y, left: 0, right: 0, height }}
      onClick={onSelect}
      data-task-id={task.id}
    >
      <div className="tl-col tl-col-name">
        {task.isParent ? (
          <button
            type="button"
            className="task-list-chevron"
            title="Toggle subtasks"
            aria-label="Toggle subtasks"
            onClick={(event) => {
              event.stopPropagation();
              onToggleParent();
            }}
          >
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 3.5 L5 6.5 L8 3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : task.isMilestone ? (
          <svg
            className="task-list-marker-milestone"
            viewBox="0 0 10 10"
            width="10"
            height="10"
            aria-hidden="true"
          >
            <path d="M5 0.5 L9.5 5 L5 9.5 L0.5 5 Z" />
          </svg>
        ) : isSubtask ? (
          <span className="task-list-indent" aria-hidden="true" />
        ) : (
          <span className="task-list-bullet" aria-hidden="true" />
        )}
        <span className="task-list-name" title={task.title}>
          {task.title}
        </span>
        {badges && (badges.risk || badges.dep || badges.gate) ? (
          <TaskBadges
            taskId={task.id}
            risk={badges.risk}
            dep={badges.dep}
            gate={badges.gate}
            small
            onHover={onBadgeHover ?? (() => {})}
            onLeave={onBadgeLeave ?? (() => {})}
            onClick={onBadgeClick ?? (() => {})}
          />
        ) : null}
        {task.color ? (
          <span
            className="task-list-color-chip"
            style={{ background: task.color }}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className="tl-col tl-col-duration">
        <span className="task-list-duration">
          {task.isMilestone ? formatShort(task.startDate) : `${task.durationDays}d`}
        </span>
      </div>
      <div className="tl-col tl-col-percent">
        {task.isMilestone ? (
          <span className="task-list-percent-text">—</span>
        ) : editing ? (
          <input
            className="task-list-percent-input"
            type="number"
            min={0}
            max={100}
            step={5}
            value={editValue}
            autoFocus
            onChange={(event) => setEditValue(event.target.value)}
            onBlur={commitEdit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitEdit();
              else if (event.key === 'Escape') {
                setEditing(false);
                setEditValue(String(task.percentComplete));
              }
            }}
            onClick={(event) => event.stopPropagation()}
          />
        ) : (
          <button
            type="button"
            className="task-list-percent"
            onClick={(event) => {
              event.stopPropagation();
              setEditing(true);
              setEditValue(String(task.percentComplete));
            }}
            title="Click to edit"
          >
            <span
              className="task-list-percent-fill"
              style={Object.assign(
                { width: `${task.percentComplete}%` } as React.CSSProperties,
                task.color ? { '--base': task.color } : {},
              )}
              aria-hidden="true"
            />
            <span className="task-list-percent-text">{task.percentComplete}%</span>
          </button>
        )}
      </div>
    </div>
  );
}
