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
import { InspectorDrawer } from './components/InspectorDrawer/InspectorDrawer';
import { ImpactStrip } from './components/ImpactStrip/ImpactStrip';
import { Legend } from './components/Legend/Legend';
import { TaskCreatorModal } from './components/Modals/TaskCreatorModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { Hint, showHint } from './components/Toasts/Hint';

export function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, loadAppState);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalParent, setTaskModalParent] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const breachCycleRef = useRef(0);

  // Persist on every state change (excluding pendingForecast — handled by adapter)
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  // Keyboard handlers — Escape closes modals/popovers/drawing/drawer in priority order
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showSettings) {
        setShowSettings(false);
        return;
      }
      if (showTaskModal) {
        setShowTaskModal(false);
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
  }, [showSettings, showTaskModal, state.view.drawerOpen, state.view.selectedDep]);

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

  return (
    <>
      <AppShell
        state={state}
        onViewMode={(mode) => dispatch({ type: 'setViewMode', mode })}
        onToggleCritical={() => dispatch({ type: 'toggleCritical' })}
        onBreachClick={handleBreachClick}
        onOpenSettings={() => setShowSettings(true)}
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
            />
          ) : state.view.mode === 'raidBoard' ? (
            // Phase 3: RAID Actions Board
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
              RAID Actions Board — coming in Phase 3
            </div>
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
              showImpactStrip={!!state.pendingForecast && !state.view.drawerOpen}
              onClearScrollToTask={() => dispatch({ type: 'setScrollToTask', taskId: null })}
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
        onClose={() => dispatch({ type: 'closeDrawer' })}
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

      <Hint />
    </>
  );
}
