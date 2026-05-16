import { useEffect, useReducer, useState } from 'react';
import { appReducer } from './state/appState';
import {
  loadAppState,
  resetAppState,
  saveAppState,
} from './state/persistenceAdapter';
import { AppShell } from './components/AppShell/AppShell';
import { Board } from './components/Board/Board';
import { Timeline } from './components/Timeline/Timeline';
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

  const selectedTask =
    state.view.selectedTaskId
      ? state.domain.tasks.find((t) => t.id === state.view.selectedTaskId) ?? null
      : null;

  return (
    <>
      <AppShell
        state={state}
        onViewMode={(mode) => dispatch({ type: 'setViewMode', mode })}
        onToggleCritical={() => dispatch({ type: 'toggleCritical' })}
        onReset={() => {
          if (window.confirm('Reset to demo data? This will discard all changes.')) {
            dispatch({ type: 'replaceState', state: resetAppState() });
            showHint('Demo reset');
          }
        }}
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
              showImpactStrip={!!state.pendingForecast && !state.view.drawerOpen}
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
        onClose={() => dispatch({ type: 'closeDrawer' })}
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
