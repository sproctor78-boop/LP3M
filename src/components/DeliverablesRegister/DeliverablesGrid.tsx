import { useState } from 'react';
import { Deliverable, DeliverableStatus, WorkItem } from '../../domain/types';
import { getCompletionPercentage, isOverdue } from '../../domain/deliverable';

type SortKey = 'id' | 'title' | 'owner' | 'targetDate' | 'status' | 'completion';

const STATUS_LABELS: Record<DeliverableStatus, string> = {
  Planned: 'Planned',
  InProduction: 'In Production',
  InReview: 'In Review',
  Accepted: 'Accepted',
  Rejected: 'Rejected',
};

const STATUS_CLASS: Record<DeliverableStatus, string> = {
  Planned: 'deliv-planned',
  InProduction: 'deliv-inprod',
  InReview: 'deliv-inreview',
  Accepted: 'deliv-accepted',
  Rejected: 'deliv-rejected',
};

const STATUS_ORDER: Record<DeliverableStatus, number> = {
  Rejected: 0, InReview: 1, InProduction: 2, Planned: 3, Accepted: 4,
};

interface Props {
  deliverables: Deliverable[];
  tasks: WorkItem[];
  selectedDeliverableId: string | null;
  onSelectDeliverable: (id: string) => void;
  today: string;
}

function sortValue(d: Deliverable, key: SortKey): string | number {
  switch (key) {
    case 'id': return d.id;
    case 'title': return d.title.toLowerCase();
    case 'owner': return d.owner.toLowerCase();
    case 'targetDate': return d.targetDate;
    case 'status': return STATUS_ORDER[d.status];
    case 'completion': return getCompletionPercentage(d);
  }
}

export function DeliverablesGrid({ deliverables, tasks, selectedDeliverableId, onSelectDeliverable, today }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('targetDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const handleHeader = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (
      <span className="risk-grid-sort-icon" aria-hidden="true">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
    ) : null;

  const sorted = [...deliverables].sort((a, b) => {
    const va = sortValue(a, sortKey);
    const vb = sortValue(b, sortKey);
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const th = (key: SortKey, label: string) => (
    <th
      onClick={() => handleHeader(key)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}{sortIcon(key)}
    </th>
  );

  return (
    <div className="risk-grid-wrap">
      <table className="risk-grid deliverables-grid">
        <thead>
          <tr>
            {th('id', 'ID')}
            {th('title', 'Title')}
            {th('owner', 'Owner')}
            {th('targetDate', 'Target Date')}
            {th('status', 'Status')}
            {th('completion', 'Completion')}
            <th title="Acceptance criteria count">Criteria</th>
            <th title="Linked tasks count">Linked Tasks</th>
            <th title="Overdue indicator"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => {
            const pct = getCompletionPercentage(d);
            const metCount = d.acceptanceCriteria.filter((c) => c.met).length;
            const total = d.acceptanceCriteria.length;
            const overdue = isOverdue(d, today);
            const linkedTitles = d.linkedTaskIds
              .map((id) => taskMap.get(id))
              .filter(Boolean)
              .map((t) => `${t!.id}: ${t!.title}`)
              .join('\n');

            return (
              <tr
                key={d.id}
                className={[
                  d.id === selectedDeliverableId ? 'selected' : '',
                  overdue ? 'pending-approval' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onSelectDeliverable(d.id)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectDeliverable(d.id); }}
                aria-selected={d.id === selectedDeliverableId}
              >
                <td><span className="risk-grid-id">{d.id}</span></td>
                <td className="risk-grid-title">{d.title}</td>
                <td>{d.owner}</td>
                <td className="risk-grid-date">{d.targetDate}</td>
                <td>
                  <span className={`badge ${STATUS_CLASS[d.status]}`}>
                    {STATUS_LABELS[d.status]}
                  </span>
                </td>
                <td>
                  <div className="deliverable-completion-cell">
                    <div className="criteria-completion-bar criteria-completion-bar--sm">
                      <div className="criteria-completion-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="deliverable-completion-text">{metCount}/{total}</span>
                  </div>
                </td>
                <td>
                  <span
                    className={total > 0 ? 'response-count-badge' : 'response-count-badge response-count-badge--empty'}
                    title={`${total} acceptance ${total === 1 ? 'criterion' : 'criteria'}`}
                  >
                    {total}
                  </span>
                </td>
                <td>
                  {d.linkedTaskIds.length > 0 ? (
                    <span className="response-count-badge" title={linkedTitles}>
                      {d.linkedTaskIds.length}
                    </span>
                  ) : (
                    <span className="response-count-badge response-count-badge--empty">0</span>
                  )}
                </td>
                <td>
                  {overdue ? (
                    <span className="ext-dep-overdue-flag" title="Overdue — past target date and not Accepted">⚠</span>
                  ) : null}
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={9} className="risk-grid-empty">No deliverables match the current filters.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
