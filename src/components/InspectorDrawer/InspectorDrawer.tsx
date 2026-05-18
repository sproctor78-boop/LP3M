import { AppState, ExternalDependency, ImpactBand, Person, RaidAction, Risk, RiskScore, WorkItem } from '../../domain/types';
import { TaskInspector } from './TaskInspector';
import { ImpactPanel } from './ImpactPanel';
import { RiskInspector } from '../RiskRegister/RiskInspector';
import { RiskCreateForm } from '../RiskRegister/RiskCreateForm';
import { RaidActionInspector } from './RaidActionInspector';
import { ExternalDependencyCreateForm } from '../ExternalDependenciesRegister/ExternalDependencyCreateForm';
import { ExternalDependencyInspector } from '../ExternalDependenciesRegister/ExternalDependencyInspector';

interface Props {
  state: AppState;
  selectedTask: WorkItem | null;
  selectedRisk: Risk | null;
  selectedAction: RaidAction | null;
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
  onUpdateRisk: (riskId: string, patch: Partial<Risk>) => void;
  onDeleteRisk: (riskId: string) => void;
  onApproveResidualScore: (riskId: string, newResidual: RiskScore) => void;
  onRejectResidualScore: (riskId: string) => void;
  onUpdateRaidAction: (actionId: string, patch: Partial<RaidAction>) => void;
  onDeleteRaidAction: (actionId: string) => void;
  onCompleteRaidAction: (actionId: string, effectiveness: ImpactBand) => void;
  // Risk creation
  wide?: boolean;
  showRiskCreate?: boolean;
  onCreateRisk?: (risk: Risk) => void;
  onCloseRiskCreate?: () => void;
  // External dependency create/edit
  showExtDepCreate?: boolean;
  selectedExtDep?: ExternalDependency | null;
  onCreateExtDep?: (dep: ExternalDependency) => void;
  onCloseExtDepCreate?: () => void;
  onUpdateExtDep?: (depId: string, patch: Partial<ExternalDependency>) => void;
  onRemoveExtDep?: (depId: string) => void;
  today?: string;
}

export function InspectorDrawer({
  state,
  selectedTask,
  selectedRisk,
  selectedAction,
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
  onUpdateRisk,
  onDeleteRisk,
  onApproveResidualScore,
  onRejectResidualScore,
  onUpdateRaidAction,
  onDeleteRaidAction,
  onCompleteRaidAction,
  wide,
  showRiskCreate,
  onCreateRisk,
  onCloseRiskCreate,
  showExtDepCreate,
  selectedExtDep,
  onCreateExtDep,
  onCloseExtDepCreate,
  onUpdateExtDep,
  onRemoveExtDep,
  today = new Date().toISOString().slice(0, 10),
}: Props) {
  const fc = state.pendingForecast;
  let kicker = 'Inspector';
  let title = 'Select an item';

  if (showExtDepCreate) {
    kicker = 'New External Dependency';
    title = 'Create dependency';
  } else if (showRiskCreate) {
    kicker = 'New Risk';
    title = 'Create risk';
  } else if (selectedExtDep) {
    kicker = 'External Dependency';
    title = selectedExtDep.title;
  } else if (fc) {
    kicker = 'Schedule impact';
    title = state.domain.tasks.find((t) => t.id === fc.changedTaskId)?.title ?? 'Forecast';
  } else if (selectedTask) {
    kicker = 'Task Detail';
    title = selectedTask.title;
  } else if (selectedRisk) {
    kicker = selectedRisk.status === 'PendingApproval' ? 'Risk · Pending Approval' : 'Risk Detail';
    title = selectedRisk.title;
  } else if (selectedAction) {
    kicker = selectedAction.status === 'Overdue' ? 'Action · Overdue' : 'Action Detail';
    title = selectedAction.title;
  }

  let body: JSX.Element;
  if (showExtDepCreate && onCreateExtDep && onCloseExtDepCreate) {
    body = (
      <ExternalDependencyCreateForm
        tasks={state.domain.tasks}
        onSave={onCreateExtDep}
        onClose={onCloseExtDepCreate}
      />
    );
  } else if (showRiskCreate && onCreateRisk && onCloseRiskCreate) {
    body = (
      <RiskCreateForm
        onSave={onCreateRisk}
        onClose={onCloseRiskCreate}
      />
    );
  } else if (selectedExtDep && onUpdateExtDep && onRemoveExtDep) {
    body = (
      <ExternalDependencyInspector
        dep={selectedExtDep}
        tasks={state.domain.tasks}
        today={today}
        onUpdate={onUpdateExtDep}
        onRemove={onRemoveExtDep}
      />
    );
  } else if (fc) {
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
  } else if (selectedRisk) {
    body = (
      <RiskInspector
        risk={selectedRisk}
        raidActions={state.domain.raidActions.filter((a) => a.riskId === selectedRisk.id)}
        onUpdateRisk={onUpdateRisk}
        onDeleteRisk={onDeleteRisk}
        onApproveResidualScore={onApproveResidualScore}
        onRejectResidualScore={onRejectResidualScore}
      />
    );
  } else if (selectedAction) {
    const risk = state.domain.risks.find((r) => r.id === selectedAction.riskId) ?? null;
    body = (
      <RaidActionInspector
        action={selectedAction}
        risk={risk}
        onUpdateAction={onUpdateRaidAction}
        onDeleteAction={onDeleteRaidAction}
        onCompleteAction={onCompleteRaidAction}
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

  const drawerOpen = state.view.drawerOpen || !!showRiskCreate || !!showExtDepCreate;

  const isWide = wide || showExtDepCreate;

  return (
    <aside className={`drawer${drawerOpen ? ' open' : ''}${isWide ? ' wide' : ''}`}>
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
