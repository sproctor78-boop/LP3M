import { useState } from 'react';
import { AppState, DepStatus } from '../../domain/types';
import { isOverdue } from '../../domain/externalDependency';
import { ExternalDependenciesGrid } from './ExternalDependenciesGrid';

interface Props {
  state: AppState;
  onSelectDep: (depId: string) => void;
  onNewDep: () => void;
  today: string;
}

const ALL_STATUSES: DepStatus[] = ['OnTrack', 'AtRisk', 'Late', 'Received'];
const STATUS_LABELS: Record<DepStatus, string> = {
  OnTrack: 'On Track', AtRisk: 'At Risk', Late: 'Late', Received: 'Received',
};

export function ExternalDependenciesRegister({ state, onSelectDep, onNewDep, today }: Props) {
  // Default: show OnTrack/AtRisk/Late — Received filtered out by default
  const [statusFilter, setStatusFilter] = useState<Set<DepStatus>>(
    new Set(['OnTrack', 'AtRisk', 'Late']),
  );
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState('');

  const deps = state.domain.externalDependencies;

  const filtered = deps.filter((d) => {
    if (statusFilter.size > 0 && !statusFilter.has(d.status)) return false;
    if (overdueOnly && !isOverdue(d, today)) return false;
    if (ownerSearch) {
      const q = ownerSearch.toLowerCase();
      if (!d.internalOwner.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const overdueCount = deps.filter((d) => isOverdue(d, today)).length;

  const toggleStatus = (s: DepStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  return (
    <section className="risk-register-panel">
      <div className="risk-register-toolbar">
        <div>
          <div className="board-title">External Dependencies</div>
          <div className="board-meta">
            Operational Capability Delivery · {deps.length} dependencies
          </div>
        </div>

        <div className="risk-register-filters">
          <input
            type="search"
            className="risk-register-search"
            placeholder="Internal owner…"
            value={ownerSearch}
            onChange={(e) => setOwnerSearch(e.target.value)}
            aria-label="Filter by internal owner"
          />

          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`milestones-only-chip${statusFilter.has(s) ? ' active' : ''}`}
              onClick={() => toggleStatus(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}

          {overdueCount > 0 ? (
            <button
              type="button"
              className={`milestones-only-chip${overdueOnly ? ' active' : ''}`}
              onClick={() => setOverdueOnly((v) => !v)}
              title="Show only overdue dependencies"
            >
              ⚠ Overdue ({overdueCount})
            </button>
          ) : null}
        </div>

        <div className="board-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onNewDep}
            title="Create a new external dependency"
          >
            + New Dependency
          </button>
        </div>
      </div>

      <ExternalDependenciesGrid
        deps={filtered}
        tasks={state.domain.tasks}
        selectedExtDepId={state.view.selectedExtDepId}
        onSelectDep={onSelectDep}
        today={today}
      />
    </section>
  );
}
