import { useEffect, useReducer } from 'react';
import { AppShell } from './components/AppShell/AppShell';
import { Board } from './components/Board/Board';
import { Timeline } from './components/Timeline/Timeline';
import { InspectorDrawer } from './components/InspectorDrawer/InspectorDrawer';
import { ImpactStrip } from './components/ImpactStrip/ImpactStrip';
import { Legend } from './components/Legend/Legend';
import { appReducer } from './state/appState';
import { loadAppState, resetAppState, saveAppState } from './state/persistenceAdapter';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, loadAppState);

  useEffect(() => {
    saveAppState(state);
  }, [state]);

  const selectedTask = state.domain.tasks.find((task) => task.id === state.view.selectedTaskId) ?? null;
  const workspaceClass = `workspace ${state.view.mode === 'board' ? 'board' : state.view.mode === 'timeline' ? 'timeline' : ''}`;

  return (
    <AppShell
      state={state}
      onViewMode={(mode) => dispatch({ type: 'setViewMode', mode })}
      onToggleCritical={() => dispatch({ type: 'toggleCritical' })}
      onReset={() => dispatch({ type: 'replaceState', state: resetAppState() })}
    >
      <main className={workspaceClass}>
        {state.view.mode !== 'timeline' && (
          <Board
            domain={state.domain}
            selectedTaskId={state.view.selectedTaskId}
            showCritical={state.view.showCritical}
            onSelectTask={(taskId) => dispatch({ type: 'selectTask', taskId, openDrawer: true })}
            onMoveTaskStatus={(taskId, status) => dispatch({ type: 'moveTaskStatus', taskId, status })}
          />
        )}
        {state.view.mode !== 'board' && (
          <section className="timeline-panel">
            <Timeline
              state={state}
              dispatch={dispatch}
            />
            {state.pendingForecast && (
              <ImpactStrip
                forecast={state.pendingForecast}
                tasks={state.domain.tasks}
                onApply={() => dispatch({ type: 'applyForecast' })}
                onCancel={() => dispatch({ type: 'cancelForecast' })}
                onDetails={() => dispatch({ type: 'selectTask', taskId: state.pendingForecast?.changedTaskId ?? null, openDrawer: true })}
              />
            )}
            <Legend />
          </section>
        )}
      </main>
      {state.view.drawerOpen && selectedTask && (
        <InspectorDrawer
          task={selectedTask}
          tasks={state.domain.tasks}
          columns={state.domain.columns}
          swimlanes={state.domain.swimlanes}
          forecast={state.pendingForecast}
          onClose={() => dispatch({ type: 'closeDrawer' })}
          onPreviewDates={(taskId, startDate, endDate) => dispatch({ type: 'previewTaskDates', taskId, startDate, endDate })}
          onUpdateTask={(taskId, patch) => dispatch({ type: 'updateTask', taskId, patch })}
        />
      )}
    </AppShell>
  );
}
