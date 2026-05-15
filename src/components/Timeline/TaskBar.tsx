import { CSSProperties } from 'react';
import { WorkItem } from '../../domain/types';
import { diffDays } from '../../engine/dateUtils';
import { useBarDrag, DragMode } from './useBarDrag';
import { DepHandleSide, useDepHandleDrag, DrawingState } from './useDepHandleDrag';

interface Props {
  task: WorkItem;
  left: number;
  dayWidth: number;
  showCritical: boolean;
  selected: boolean;
  /** Optional state variants */
  ghost?: boolean;
  forecast?: boolean;
  directlyChanged?: boolean;
  breach?: boolean;
  expanded?: boolean;
  /** Schedule changes during this drag. */
  onPreviewDates?: (start: string, end: string) => void;
  onCommitDates?: (start: string, end: string, moved: boolean) => void;
  onCancelDates?: () => void;
  /** Selection click (fired when drag did not move). */
  onSelect?: () => void;
  /** Parent expand/collapse. */
  onToggleParent?: () => void;
  /** Dep handle drag: validate target. */
  isInvalidDepTarget?: (fromId: string, toId: string) => boolean;
  /** Dep handle drag: create. */
  onCreateDependency?: (fromId: string, toId: string, side: DepHandleSide) => void;
  /** Dep handle drag: update preview line. */
  onDepDrawingChange?: (drawing: DrawingState | null) => void;
}

export function TaskBar({
  task,
  left,
  dayWidth,
  showCritical,
  selected,
  ghost,
  forecast,
  directlyChanged,
  breach,
  expanded,
  onPreviewDates,
  onCommitDates,
  onCancelDates,
  onSelect,
  onToggleParent,
  isInvalidDepTarget,
  onCreateDependency,
  onDepDrawingChange,
}: Props) {
  const widthDays = Math.max(1, diffDays(task.startDate, task.endDate) + 1);
  const widthPx = Math.max(8, widthDays * dayWidth - 2);

  const onBarPointerDown = useBarDrag({
    dayWidth,
    startDate: task.startDate,
    endDate: task.endDate,
    locked: task.locked || !!ghost,
    isMilestone: task.isMilestone,
    onPreview: onPreviewDates ?? (() => {}),
    onCommit: (start, end, moved) => {
      if (!moved) {
        onSelect?.();
      } else {
        onCommitDates?.(start, end, moved);
      }
    },
    onCancel: () => onCancelDates?.(),
  });

  const onDepPointerDown = useDepHandleDrag({
    fromId: task.id,
    onUpdate: onDepDrawingChange ?? (() => {}),
    onCreate: onCreateDependency ?? (() => {}),
    isInvalidTarget: isInvalidDepTarget ?? (() => false),
  });

  const classes = ['task-bar'];
  if (task.isParent) classes.push('parent');
  else if (task.parentId) classes.push('subtask');
  if (ghost) classes.push('ghost');
  else if (directlyChanged) classes.push('directly-changed');
  else if (breach) classes.push('breach');
  else if (forecast) classes.push('forecast');
  else if (task.locked) classes.push('locked');
  else if (task.criticalPath && showCritical) classes.push('critical');
  if (selected && !ghost) classes.push('selected');
  if (task.color && !ghost && !task.isParent) classes.push('colored');

  const style: CSSProperties = {
    left,
    width: widthPx,
  };
  if (task.color) (style as Record<string, string | number>)['--task-color'] = task.color;

  return (
    <div
      className={classes.join(' ')}
      style={style}
      data-task-id={task.id}
      onPointerDown={(event) => {
        if (ghost) return;
        const target = event.target as HTMLElement;
        if (target.closest('.dep-handle') || target.closest('.chevron-btn')) return;
        let mode: DragMode = 'move';
        if (target.classList.contains('bar-handle')) {
          mode = target.classList.contains('left') ? 'resize-left' : 'resize-right';
        }
        onBarPointerDown(event, mode);
      }}
    >
      {!ghost ? <div className="bar-handle left" /> : null}
      {task.isParent && !ghost ? (
        <button
          type="button"
          className={`chevron-btn ${expanded ? 'expanded' : ''}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onToggleParent?.();
          }}
          title={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
        >
          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path
              d={expanded ? 'M2 3.5 L5 6.5 L8 3.5' : 'M3.5 2 L6.5 5 L3.5 8'}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
      <span className="task-bar-title">{task.title}</span>
      <span className="task-bar-icons">
        {task.locked ? (
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" aria-label="Locked">
            <rect x="2.5" y="5.5" width="7" height="5" rx="0.5" />
            <path d="M4 5.5V3.5a2 2 0 014 0v2" />
          </svg>
        ) : null}
        {breach ? (
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-label="Breach">
            <path d="M6 2v4M6 8.5v.5" />
            <circle cx="6" cy="6" r="5" />
          </svg>
        ) : null}
      </span>
      {!ghost ? <div className="bar-handle right" /> : null}
      {!ghost ? (
        <>
          <div
            className="dep-handle left"
            onPointerDown={(event) => onDepPointerDown(event, 'left')}
            title="Drag to create start-to-start dependency"
          />
          <div
            className="dep-handle right"
            onPointerDown={(event) => onDepPointerDown(event, 'right')}
            title="Drag to create finish-to-start dependency"
          />
        </>
      ) : null}
    </div>
  );
}
