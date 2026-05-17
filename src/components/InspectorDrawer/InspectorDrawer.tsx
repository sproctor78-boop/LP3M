import { AppState, Person, WorkItem } from '../../domain/types';
import { TaskInspector } from './TaskInspector';
import { ImpactPanel } from './ImpactPanel';

interface Props {
  state: AppState;
  selectedTask: WorkItem | null;
  onClose: () => void;
  onApplyForecast: () => void;
  onCancelForecast: () => void;
  onPreviewDates: (taskId: string, start: string, end: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<WorkItem>) => void;
  onSetParent: (taskId: string, parentId: string | null) => void;
  onConvertToParent: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onJumpToTask: (taskId: string) => void;
  onMoveTaskStatus: (taskId: string, status: string) => void;
  onMoveTaskSwimlane: (taskId: string, swimlane: string) => void;
  onAddSubtask: (parentTaskId: string) => void;
  onAddAssignee: (taskId: string, personId: string) => void;
  onRemoveAssignee: (taskId: string, personId: string) => void;
  onCreatePerson: (person: Person) => void;
}

export function InspectorDrawer({
  state,
  selectedTask,
  onClose,
  onApplyForecast,
  onCancelForecast,
  onPreviewDates,
  onUpdateTask,
  onSetParent,
  onConvertToParent,
  onDeleteTask,
  onJumpToTask,
  onMoveTaskStatus,
  onMoveTaskSwimlane,
  onAddSubtask,
  onAddAssignee,
  onRemoveAssignee,
  onCreatePerson,
}: Props) {
  const fc = state.pendingForecast;
  let kicker = 'Inspector';
  let title = 'Select a task';

  if (fc) {
    kicker = 'Schedule impact';
    title = state.domain.tasks.find((t) => t.id === fc.changedTaskId)?.title ?? 'Forecast';
  } else if (selectedTask) {
    kicker = 'Task Detail';
    title = selectedTask.title;
  }

  let body: JSX.Element;
  if (fc) {
    body = (
      <ImpactPanel
        forecastResult={fc}
        tasks={state.domain.tasks}
        onApply={onApplyForecast}
        onCancel={onCancelForecast}
      />
    );
  } else if (selectedTask) {
    body = (
      <TaskInspector
        state={state}
        task={selectedTask}
        onPreviewDates={onPreviewDates}
        onUpdateTask={onUpdateTask}
        onSetParent={onSetParent}
        onConvertToParent={onConvertToParent}
        onDeleteTask={onDeleteTask}
        onJumpToTask={onJumpToTask}
        onMoveTaskStatus={onMoveTaskStatus}
        onMoveTaskSwimlane={onMoveTaskSwimlane}
        onAddSubtask={onAddSubtask}
        onAddAssignee={onAddAssignee}
        onRemoveAssignee={onRemoveAssignee}
        onCreatePerson={onCreatePerson}
      />
    );
  } else {
    body = (
      <div className="drawer-empty">
        <svg
          className="drawer-empty-icon"
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="4" y="6" width="24" height="20" rx="2" />
          <path d="M4 12h24M10 18h6M10 22h10" />
        </svg>
        <strong>Drag a task bar to forecast impact</strong>
        Move or resize any bar on the timeline. Ripple will calculate the downstream effect on
        dependencies, constraints, and the forecast finish date.
      </div>
    );
  }

  return (
    <aside className={`drawer ${state.view.drawerOpen ? 'open' : ''}`}>
      <div className="drawer-header">
        <button
          type="button"
          className="drawer-close"
          aria-label="Close drawer"
          title="Close (Esc)"
          onClick={onClose}
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M2 2 L12 12 M12 2 L2 12" strokeLinecap="round" />
          </svg>
        </button>
        <div className="drawer-kicker">{kicker}</div>
        <div className="drawer-title">{title}</div>
      </div>
      <div className="drawer-body">{body}</div>
    </aside>
  );
}
