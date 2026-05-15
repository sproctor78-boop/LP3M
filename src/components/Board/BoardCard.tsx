import { CSSProperties } from 'react';
import { WorkItem } from '../../domain/types';
import { formatShort } from '../../engine/dateUtils';

interface Props {
  task: WorkItem;
  selected: boolean;
  showCritical: boolean;
  /** Parent task to show as breadcrumb, if any. Null when nested under a parent group. */
  breadcrumbParent: WorkItem | null;
  /** Visually nest under a parent group. */
  nested: boolean;
  /** True if a pending forecast flags this task as a breach. */
  hasBreach: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function BoardCard({
  task,
  selected,
  showCritical,
  breadcrumbParent,
  nested,
  hasBreach,
  onSelect,
  onDragStart,
  onDragEnd,
}: Props) {
  const isCritical = task.criticalPath && showCritical;
  const classes = [
    'kcard',
    isCritical && 'critical',
    task.isMilestone && 'milestone',
    task.locked && 'locked',
    task.parentId && 'subtask',
    task.isParent && 'parent-card',
    task.color && 'colored',
    selected && 'selected',
    nested && 'nested',
  ]
    .filter(Boolean)
    .join(' ');

  const style: CSSProperties = task.color
    ? ({ ['--task-color' as string]: task.color } as CSSProperties)
    : {};

  return (
    <div
      className={classes}
      style={style}
      data-task-id={task.id}
      draggable
      onClick={onSelect}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', task.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      {breadcrumbParent ? <div className="kcard-parent">{breadcrumbParent.title}</div> : null}
      <div className="kcard-id-row">
        <span className="kcard-id">{task.id}</span>
        {task.isParent ? <span className="kcard-parent-tag">Parent</span> : null}
      </div>
      <div className="kcard-title">{task.title}</div>
      <div className="kcard-meta">
        <span>{formatShort(task.startDate)}</span>
        <span className="dot" />
        <span>{formatShort(task.endDate)}</span>
        {task.isMilestone ? null : (
          <>
            <span className="dot" />
            <span>{task.durationDays}d</span>
          </>
        )}
      </div>
      {(task.isMilestone || task.locked || isCritical || hasBreach) && (
        <div className="kcard-badges">
          {task.isMilestone ? <span className="badge milestone">Milestone</span> : null}
          {task.locked ? <span className="badge locked">Locked</span> : null}
          {isCritical ? <span className="badge critical">Critical</span> : null}
          {hasBreach ? <span className="badge breach">Breach</span> : null}
        </div>
      )}
    </div>
  );
}
