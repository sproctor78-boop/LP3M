import { useEffect, useReducer, useRef, useState } from 'react';
import { appReducer } from './state/appState';
import {
  loadAppState,
  saveAppState,
} from './state/persistenceAdapter';
import { detectConstraintIssues } from './engine/constraintEngine';
import { AppShell } from './components/AppShell/AppShell';
import { Board } from './components/Board/Board';
import { Timeline } from './components/Timeline/Timeline';
import { RiskRegister } from './components/RiskRegister/RiskRegister';
import { ExternalDependenciesRegister } from './components/ExternalDependenciesRegister/ExternalDependenciesRegister';
import { DeliverablesRegister } from './components/DeliverablesRegister/DeliverablesRegister';
import { Deliverable, ExternalDependency } from './domain/types';
import { InspectorDrawer } from './components/InspectorDrawer/InspectorDrawer';
import { ImpactStrip } from './components/ImpactStrip/ImpactStrip';
import { Legend } from './components/Legend/Legend';
import { TaskCreatorModal } from './components/Modals/TaskCreatorModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { Hint, showHint } from './components/Toasts/Hint';
import { CommandPalette } from './components/common/CommandPalette';
import { RiskCreateInitialValues } from './components/RiskRegister/RiskCreateForm';
import { ExtDepCreateInitialValues } from './components/ExternalDependenciesRegister/ExternalDependencyCreateForm';
import { DeliverableCreateInitialValues } from './components/DeliverablesRegister/DeliverableCreateForm';

export function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, loadAppState);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalParent, setTaskModalParent] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRiskCreate, setShowRiskCreate] = useState(false);
  const [showExtDepCreate, setShowExtDepCreate] = useState(false);
  const [showDeliverableCreate, setShowDeliverableCreate] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [riskCreateInitialValues, setRiskCreateInitialValues] = useState<RiskCreateInitialValues | undefined>();
  const [extDepCreateInitialValues, setExtDepCreateInitialValues] = useState<ExtDepCreateInitialValues | undefined>();
  const [deliverableCreateInitialValues, setDeliverableCreateInitialValues] = useState<DeliverableCreateInitialValues | undefined>();
  const breachCycleRef = useRef(0);

  // Persist on every state change (excluding pendingForecast — handled by adapter)
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  const canUndo = state._past.length > 0;
  const canRedo = state._future.length > 0;

  // Keyboard handlers — Escape closes modals/popovers/drawing/drawer in priority order
  // Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z = redo
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Undo / redo — ignore when focus is in a form element
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isFormElement = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (!isFormElement && (event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          dispatch({ type: 'redo' });
        } else {
          dispatch({ type: 'undo' });
        }
        return;
      }
      if (!isFormElement && (event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setShowPalette((p) => !p);
        return;
      }

      if (event.key !== 'Escape') return;
      if (showPalette) {
        setShowPalette(false);
        return;
      }
      if (showSettings) {
        setShowSettings(false);
        return;
      }
      if (showTaskModal) {
        setShowTaskModal(false);
        return;
      }
      if (showRiskCreate) {
        setShowRiskCreate(false);
        return;
      }
      if (showExtDepCreate) {
        setShowExtDepCreate(false);
        return;
      }
      if (showDeliverableCreate) {
        setShowDeliverableCreate(false);
        return;
      }
      if (document.body.classList.contains('drawing-dep')) {
        // The dep drag hook owns its own cancellation via blur — this is a safety net
        document.body.classList.remove('drawing-dep');
        document.querySelectorAll('.task-bar.dep-source').forEach((b) => {
          b.classList.remove('dep-source');
        });
        document.querySelectorAll('.task-bar.dep-target').forEach((b) => {
          b.classList.remove('dep-target', 'invalid');
        });
        return;
      }
      if (state.view.selectedDep) {
        dispatch({ type: 'clearSelectedDep' });
        return;
      }
      if (state.view.drawerOpen) {
        dispatch({ type: 'closeDrawer' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showPalette, showSettings, showTaskModal, showRiskCreate, showExtDepCreate, showDeliverableCreate, state.view.drawerOpen, state.view.selectedDep, dispatch]);

  // Initial hint
  useEffect(() => {
    const timer = window.setTimeout(() => {
      showHint('Drag any task bar to forecast impact');
    }, 600);
    return () => window.clearTimeout(timer);
  }, []);

  const handleBreachClick = () => {
    const fc = state.pendingForecast;
    const breachedIds = fc
      ? fc.constraintBreaches.map((b) => b.taskId)
      : detectConstraintIssues(state.domain.tasks).breaches.map((b) => b.taskId);
    if (breachedIds.length === 0) return;
    const idx = breachCycleRef.current % breachedIds.length;
    breachCycleRef.current = (idx + 1) % breachedIds.length;
    const taskId = breachedIds[idx];
    dispatch({ type: 'selectTask', taskId, openDrawer: true });
    dispatch({ type: 'setScrollToTask', taskId });
  };

  const selectedTask =
    state.view.selectedTaskId
      ? state.domain.tasks.find((t) => t.id === state.view.selectedTaskId) ?? null
      : null;

  const selectedRisk =
    state.view.selectedRiskId
      ? state.domain.risks.find((r) => r.id === state.view.selectedRiskId) ?? null
      : null;

  const selectedAction =
    state.view.selectedActionId
      ? state.domain.raidActions.find((a) => a.id === state.view.selectedActionId) ?? null
      : null;

  const selectedExtDep: ExternalDependency | null =
    state.view.selectedExtDepId
      ? state.domain.externalDependencies.find((d) => d.id === state.view.selectedExtDepId) ?? null
      : null;

  const selectedDeliverable: Deliverable | null =
    state.view.selectedDeliverableId
      ? state.domain.deliverables.find((d) => d.id === state.view.selectedDeliverableId) ?? null
      : null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <AppShell
        state={state}
        onViewMode={(mode) => dispatch({ type: 'setViewMode', mode })}
        onToggleCritical={() => dispatch({ type: 'toggleCritical' })}
        onBreachClick={handleBreachClick}
        onOpenSettings={() => setShowSettings(true)}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
        canUndo={canUndo}
        canRedo={canRedo}
      >
        <main className="workspace single-pane">
          {state.view.mode === 'board' ? (
            <Board
              state={state}
              onSelectTask={(taskId) =>
                dispatch({ type: 'selectTask', taskId, openDrawer: true })
              }
              onMoveTaskStatus={(taskId, status) =>
                dispatch({ type: 'moveTaskStatus', taskId, status })
              }
              onRenameColumn={(key, label) => dispatch({ type: 'renameColumn', key, label })}
              onDeleteColumn={(key) => dispatch({ type: 'deleteColumn', key })}
              onAddColumn={() => dispatch({ type: 'addColumn' })}
              onNewTask={() => {
                setTaskModalParent(null);
                setShowTaskModal(true);
              }}
              onCollapseBoard={() => dispatch({ type: 'setViewMode', mode: 'timeline' })}
            />
          ) : state.view.mode === 'riskRegister' ? (
            <RiskRegister
              state={state}
              onSelectRisk={(riskId) =>
                dispatch({ type: 'selectRisk', riskId, openDrawer: true })
              }
              onNewRisk={() => setShowRiskCreate(true)}
              onSetCollapse={(group, collapsed) =>
                dispatch({ type: 'setRiskColumnCollapse', group, collapsed })
              }
            />
          ) : state.view.mode === 'extDepRegister' ? (
            <ExternalDependenciesRegister
              state={state}
              onSelectDep={(depId) =>
                dispatch({ type: 'selectExtDep', depId, openDrawer: true })
              }
              onNewDep={() => setShowExtDepCreate(true)}
              today={today}
            />
          ) : state.view.mode === 'deliverableRegister' ? (
            <DeliverablesRegister
              state={state}
              today={today}
              onSelectDeliverable={(deliverableId) =>
                dispatch({ type: 'selectDeliverable', deliverableId, openDrawer: true })
              }
              onNewDeliverable={() => setShowDeliverableCreate(true)}
            />
          ) : state.view.mode === 'raidBoard' ? (
            <Board
              state={state}
              source="raidActions"
              onSelectTask={(taskId) =>
                dispatch({ type: 'selectTask', taskId, openDrawer: true })
              }
              onMoveTaskStatus={(taskId, status) =>
                dispatch({ type: 'moveTaskStatus', taskId, status })
              }
              onRenameColumn={(key, label) => dispatch({ type: 'renameColumn', key, label })}
              onDeleteColumn={(key) => dispatch({ type: 'deleteColumn', key })}
              onAddColumn={() => dispatch({ type: 'addColumn' })}
              onNewTask={() => {}}
              onCollapseBoard={() => dispatch({ type: 'setViewMode', mode: 'timeline' })}
              onSelectAction={(actionId) =>
                dispatch({ type: 'selectRaidAction', actionId, openDrawer: true })
              }
              onMoveActionStatus={(actionId, status) =>
                dispatch({ type: 'updateRaidAction', actionId, patch: { status } })
              }
            />
          ) : (
            <Timeline
              state={state}
              onZoom={(value) => dispatch({ type: 'setZoom', value })}
              onGroupBy={(groupBy) => dispatch({ type: 'setGroupBy', groupBy })}
              onSetTaskListWidth={(value) => dispatch({ type: 'setTaskListWidth', value })}
              onShowBoard={() => dispatch({ type: 'setViewMode', mode: 'board' })}
              onSelectTask={(taskId) =>
                dispatch({ type: 'selectTask', taskId, openDrawer: true })
              }
              onToggleParent={(taskId) =>
                dispatch({ type: 'toggleExpandedParent', taskId })
              }
              onToggleGroupCollapse={(key) =>
                dispatch({ type: 'toggleGroupCollapsed', key })
              }
              onPreviewTaskDates={(taskId, startDate, endDate) =>
                dispatch({ type: 'previewTaskDates', taskId, startDate, endDate })
              }
              onCancelForecast={() => dispatch({ type: 'cancelForecast' })}
              onCreateDependency={(fromId, toId, depType) =>
                dispatch({ type: 'addDependency', fromId, toId, depType, lagDays: 0 })
              }
              onUpdateDependency={(fromId, toId, depType, lagDays) =>
                dispatch({ type: 'updateDependency', fromId, toId, depType, lagDays })
              }
              onRemoveDependency={(fromId, toId) =>
                dispatch({ type: 'removeDependency', fromId, toId })
              }
              onUpdateTask={(taskId, patch) =>
                dispatch({ type: 'updateTask', taskId, patch })
              }
              onRenameSwimlane={(key, label) =>
                dispatch({ type: 'renameSwimlane', key, label })
              }
              onDeleteSwimlane={(key) => dispatch({ type: 'deleteSwimlane', key })}
              onMoveTaskSwimlane={(taskId, swimlane) =>
                dispatch({ type: 'moveTaskSwimlane', taskId, swimlane })
              }
              onMoveTaskStatus={(taskId, status) =>
                dispatch({ type: 'moveTaskStatus', taskId, status })
              }
              onAddSwimlane={() => dispatch({ type: 'addSwimlane' })}
              onSetMilestonesOnly={(value) => dispatch({ type: 'setMilestonesOnly', value })}
              onSetRaidActionsVisible={(value) => dispatch({ type: 'setRaidActionsVisible', value })}
              onSelectAction={(actionId) =>
                dispatch({ type: 'selectRaidAction', actionId, openDrawer: true })
              }
              onSetExtDepVisible={(value) => dispatch({ type: 'setExtDepVisible', value })}
              onSelectExtDep={(depId) =>
                dispatch({ type: 'selectExtDep', depId, openDrawer: true })
              }
              onSetDeliverablesVisible={(value) => dispatch({ type: 'setDeliverablesVisible', value })}
              onSelectDeliverable={(deliverableId) =>
                dispatch({ type: 'selectDeliverable', deliverableId, openDrawer: true })
              }
              showImpactStrip={!!state.pendingForecast && !state.view.drawerOpen}
              onClearScrollToTask={() => dispatch({ type: 'setScrollToTask', taskId: null })}
              dispatch={dispatch}
            />
          )}
        </main>

        {state.pendingForecast && !state.view.drawerOpen ? (
          <ImpactStrip
            state={state}
            onDetails={() => dispatch({ type: 'openDrawer' })}
            onApply={() => {
              dispatch({ type: 'applyForecast' });
              showHint('Forecast applied');
            }}
            onCancel={() => dispatch({ type: 'cancelForecast' })}
          />
        ) : null}

        <Legend />
      </AppShell>

      <InspectorDrawer
        state={state}
        selectedTask={selectedTask}
        selectedRisk={selectedRisk}
        selectedAction={selectedAction}
        wide={showRiskCreate || showExtDepCreate || showDeliverableCreate}
        showRiskCreate={showRiskCreate}
        showExtDepCreate={showExtDepCreate}
        selectedExtDep={selectedExtDep}
        showDeliverableCreate={showDeliverableCreate}
        selectedDeliverable={selectedDeliverable}
        today={today}
        riskCreateInitialValues={riskCreateInitialValues}
        onCreateRisk={(risk) => {
          dispatch({ type: 'createRisk', risk });
          setRiskCreateInitialValues(undefined);
          showHint(`Risk ${risk.id} created`);
        }}
        onCloseRiskCreate={() => { setShowRiskCreate(false); setRiskCreateInitialValues(undefined); }}
        extDepCreateInitialValues={extDepCreateInitialValues}
        onCreateExtDep={(dep) => {
          dispatch({ type: 'addExternalDependency', dep });
          setExtDepCreateInitialValues(undefined);
          showHint(`Dependency ${dep.id} created`);
        }}
        onCloseExtDepCreate={() => { setShowExtDepCreate(false); setExtDepCreateInitialValues(undefined); }}
        onUpdateExtDep={(depId, patch) => dispatch({ type: 'updateExternalDependency', depId, patch })}
        onRemoveExtDep={(depId) => {
          dispatch({ type: 'removeExternalDependency', depId });
          showHint('External dependency removed');
        }}
        deliverableCreateInitialValues={deliverableCreateInitialValues}
        onCreateDeliverable={(deliverable) => {
          dispatch({ type: 'addDeliverable', deliverable });
          setDeliverableCreateInitialValues(undefined);
          showHint(`Deliverable ${deliverable.id} created`);
        }}
        onCloseDeliverableCreate={() => { setShowDeliverableCreate(false); setDeliverableCreateInitialValues(undefined); }}
        onUpdateDeliverable={(deliverableId, patch) =>
          dispatch({ type: 'updateDeliverable', deliverableId, patch })
        }
        onSetDeliverableStatus={(deliverableId, status, acceptedBy, rejectionReason) =>
          dispatch({ type: 'setDeliverableStatus', deliverableId, status, acceptedBy, rejectionReason })
        }
        onRemoveDeliverable={(deliverableId) => {
          dispatch({ type: 'removeDeliverable', deliverableId });
          showHint('Deliverable removed');
        }}
        onAddCriterion={(deliverableId, criterion) =>
          dispatch({ type: 'addAcceptanceCriterion', deliverableId, criterion })
        }
        onUpdateCriterion={(deliverableId, criterionId, patch) =>
          dispatch({ type: 'updateAcceptanceCriterion', deliverableId, criterionId, patch })
        }
        onRemoveCriterion={(deliverableId, criterionId) =>
          dispatch({ type: 'removeAcceptanceCriterion', deliverableId, criterionId })
        }
        onReorderCriteria={(deliverableId, orderedIds) =>
          dispatch({ type: 'reorderAcceptanceCriteria', deliverableId, orderedIds })
        }
        onMarkCriterionMet={(deliverableId, criterionId) =>
          dispatch({ type: 'markCriterionMet', deliverableId, criterionId })
        }
        onMarkCriterionUnmet={(deliverableId, criterionId) =>
          dispatch({ type: 'markCriterionUnmet', deliverableId, criterionId })
        }
        onClose={() => { dispatch({ type: 'closeDrawer' }); setShowRiskCreate(false); setShowExtDepCreate(false); setShowDeliverableCreate(false); }}
        onUpdateRisk={(riskId, patch) => dispatch({ type: 'updateRisk', riskId, patch })}
        onDeleteRisk={(riskId) => {
          dispatch({ type: 'deleteRisk', riskId });
          showHint('Risk deleted');
        }}
        onApproveResidualScore={(riskId, newResidual) => {
          dispatch({ type: 'approveResidualScore', riskId, newResidual });
          showHint('Residual score approved');
        }}
        onRejectResidualScore={(riskId) => {
          dispatch({ type: 'rejectResidualScore', riskId });
          showHint('Score update rejected');
        }}
        onApplyForecast={() => {
          dispatch({ type: 'applyForecast' });
          dispatch({ type: 'closeDrawer' });
          showHint('Forecast applied');
        }}
        onCancelForecast={() => {
          dispatch({ type: 'cancelForecast' });
          dispatch({ type: 'closeDrawer' });
        }}
        onPreviewDates={(taskId, startDate, endDate) =>
          dispatch({ type: 'previewTaskDates', taskId, startDate, endDate })
        }
        onUpdateTask={(taskId, patch) => dispatch({ type: 'updateTask', taskId, patch })}
        onSetParent={(taskId, parentId) => dispatch({ type: 'setTaskParent', taskId, parentId })}
        onConvertToParent={(taskId) => dispatch({ type: 'convertToParent', taskId })}
        onDeleteTask={(taskId) => {
          dispatch({ type: 'deleteTask', taskId });
          showHint('Task deleted');
        }}
        onJumpToTask={(taskId) => dispatch({ type: 'selectTask', taskId, openDrawer: true })}
        onMoveTaskStatus={(taskId, status) => {
          dispatch({ type: 'moveTaskStatus', taskId, status });
          const col = state.domain.columns.find((c) => c.key === status);
          if (col) showHint(`Moved to ${col.label}`);
        }}
        onMoveTaskSwimlane={(taskId, swimlane) => {
          dispatch({ type: 'moveTaskSwimlane', taskId, swimlane });
          const lane = state.domain.swimlanes.find((s) => s.key === swimlane);
          if (lane) showHint(`Moved to ${lane.label}`);
        }}
        onAddSubtask={(parentTaskId) => {
          setTaskModalParent(parentTaskId);
          setShowTaskModal(true);
        }}
        onAddAssignee={(taskId, personId) =>
          dispatch({
            type: 'updateTask',
            taskId,
            patch: {
              assignees: [
                ...(state.domain.tasks.find((t) => t.id === taskId)?.assignees ?? []),
                personId,
              ],
            },
          })
        }
        onRemoveAssignee={(taskId, personId) =>
          dispatch({
            type: 'updateTask',
            taskId,
            patch: {
              assignees: (state.domain.tasks.find((t) => t.id === taskId)?.assignees ?? []).filter(
                (id) => id !== personId,
              ),
            },
          })
        }
        onCreatePerson={(person) => dispatch({ type: 'addPerson', person })}
        onUpdateRaidAction={(actionId, patch) =>
          dispatch({ type: 'updateRaidAction', actionId, patch })
        }
        onDeleteRaidAction={(actionId) => {
          dispatch({ type: 'deleteRaidAction', actionId });
          showHint('Action deleted');
        }}
        onCompleteRaidAction={(actionId, effectiveness) => {
          dispatch({ type: 'completeRaidAction', actionId, effectiveness });
          showHint('Action marked complete — risk pending approval');
        }}
      />

      {showTaskModal ? (
        <TaskCreatorModal
          domain={state.domain}
          parentPreset={taskModalParent}
          onCancel={() => setShowTaskModal(false)}
          onCreate={(task) => {
            dispatch({ type: 'createTask', task });
            setShowTaskModal(false);
            showHint(`Created ${task.id} — ${task.title}`);
          }}
        />
      ) : null}

      {showSettings ? (
        <SettingsModal
          calendar={state.domain.workingCalendar}
          onCancel={() => setShowSettings(false)}
          onSave={(highlightWeekends, holidays) => {
            dispatch({ type: 'setWorkingCalendar', highlightWeekends, holidays });
            setShowSettings(false);
            showHint('Settings saved');
          }}
        />
      ) : null}

      {showPalette ? (
        <CommandPalette
          tasks={state.domain.tasks}
          onClose={() => setShowPalette(false)}
          dispatch={dispatch}
          onOpenCreateForm={(kind, title, linkedTaskIds) => {
            if (kind === 'task') {
              setTaskModalParent(null);
              setShowTaskModal(true);
            } else if (kind === 'risk') {
              setRiskCreateInitialValues({ title, linkedTaskIds });
              setShowRiskCreate(true);
            } else if (kind === 'dep') {
              setExtDepCreateInitialValues({ title, linkedTaskIds });
              setShowExtDepCreate(true);
            } else if (kind === 'del') {
              setDeliverableCreateInitialValues({ title, linkedTaskIds });
              setShowDeliverableCreate(true);
            }
          }}
        />
      ) : null}

      <Hint />
    </>
  );
}
