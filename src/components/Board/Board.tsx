import { AppDomainState } from '../../domain/types';
import { formatShort } from '../../engine/dateUtils';

interface Props {
  domain: AppDomainState;
  selectedTaskId: string | null;
  showCritical: boolean;
  onSelectTask: (taskId: string) => void;
  onMoveTaskStatus: (taskId: string, status: string) => void;
}

export function Board({ domain, selectedTaskId, showCritical, onSelectTask, onMoveTaskStatus }: Props) {
  return (
    <section className="board-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Work Board</div>
          <div className="panel-meta">Operational capability delivery</div>
        </div>
      </div>
      <div className="kanban-columns">
        {domain.columns.map((column) => {
          const tasks = domain.tasks.filter((task) => task.status === column.key);
          return (
            <div
              className="kanban-column"
              key={column.key}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const taskId = event.dataTransfer.getData('text/plain');
                if (taskId) onMoveTaskStatus(taskId, column.key);
              }}
            >
              <div className="kanban-column-header">
                <span className="kanban-column-title">{column.label}</span>
                <span className="kanban-count">{tasks.length}</span>
              </div>
              {tasks.map((task) => (
                <article
                  key={task.id}
                  className={`card ${selectedTaskId === task.id ? 'selected' : ''} ${task.criticalPath && showCritical ? 'critical' : ''}`}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', task.id)}
                  onClick={() => onSelectTask(task.id)}
                >
                  <div className="card-id">{task.id}{task.isParent ? ' · Parent' : ''}</div>
                  <div className="card-title">{task.title}</div>
                  <div className="card-meta">
                    <span>{formatShort(task.startDate)}</span>
                    <span>→</span>
                    <span>{formatShort(task.endDate)}</span>
                    {!task.isMilestone && <span>{task.durationDays}d</span>}
                  </div>
                  <div className="card-badges">
                    {task.isMilestone && <span className="badge">Milestone</span>}
                    {task.locked && <span className="badge locked">Locked</span>}
                    {task.criticalPath && showCritical && <span className="badge critical">Critical</span>}
                  </div>
                </article>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
