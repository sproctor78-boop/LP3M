import { useState } from 'react';
import { AppState, DeliverableStatus } from '../../domain/types';
import { isOverdue, getDeliverablesReadyForAcceptance, canBeAccepted } from '../../domain/deliverable';
import { DeliverablesGrid } from './DeliverablesGrid';

interface Props {
  state: AppState;
  onSelectDeliverable: (id: string) => void;
  onNewDeliverable: () => void;
  today: string;
}

const ALL_STATUSES: DeliverableStatus[] = ['Planned', 'InProduction', 'InReview', 'Accepted', 'Rejected'];
const STATUS_LABELS: Record<DeliverableStatus, string> = {
  Planned: 'Planned', InProduction: 'In Production', InReview: 'In Review',
  Accepted: 'Accepted', Rejected: 'Rejected',
};

export function DeliverablesRegister({ state, onSelectDeliverable, onNewDeliverable, today }: Props) {
  const [statusFilter, setStatusFilter] = useState<Set<DeliverableStatus>>(
    new Set(['Planned', 'InProduction', 'InReview', 'Rejected']),
  );
  const [ownerSearch, setOwnerSearch] = useState('');
  const [readyOnly, setReadyOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const deliverables = state.domain.deliverables;
  const readyCount = getDeliverablesReadyForAcceptance(deliverables).length;
  const overdueCount = deliverables.filter((d) => isOverdue(d, today)).length;

  const filtered = deliverables.filter((d) => {
    if (statusFilter.size > 0 && !statusFilter.has(d.status)) return false;
    if (readyOnly && (d.status !== 'InReview' || !canBeAccepted(d))) return false;
    if (overdueOnly && !isOverdue(d, today)) return false;
    if (ownerSearch) {
      if (!d.owner.toLowerCase().includes(ownerSearch.toLowerCase())) return false;
    }
    return true;
  });

  const toggleStatus = (s: DeliverableStatus) => {
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
          <div className="board-title">Deliverables</div>
          <div className="board-meta">
            Operational Capability Delivery · {deliverables.length} deliverables
          </div>
        </div>

        <div className="risk-register-filters">
          <input
            type="search"
            className="risk-register-search"
            placeholder="Owner…"
            value={ownerSearch}
            onChange={(e) => setOwnerSearch(e.target.value)}
            aria-label="Filter by owner"
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

          {readyCount > 0 ? (
            <button
              type="button"
              className={`milestones-only-chip${readyOnly ? ' active' : ''}`}
              onClick={() => setReadyOnly((v) => !v)}
              title="Show only deliverables ready for acceptance"
            >
              ✓ Ready for acceptance ({readyCount})
            </button>
          ) : null}

          {overdueCount > 0 ? (
            <button
              type="button"
              className={`milestones-only-chip${overdueOnly ? ' active' : ''}`}
              onClick={() => setOverdueOnly((v) => !v)}
              title="Show only overdue deliverables"
            >
              ⚠ Overdue ({overdueCount})
            </button>
          ) : null}
        </div>

        <div className="board-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onNewDeliverable}
            title="Create a new deliverable"
          >
            + New Deliverable
          </button>
        </div>
      </div>

      <DeliverablesGrid
        deliverables={filtered}
        tasks={state.domain.tasks}
        selectedDeliverableId={state.view.selectedDeliverableId}
        onSelectDeliverable={onSelectDeliverable}
        today={today}
      />
    </section>
  );
}
