import { useState } from 'react';
import { ExternalDependency, DepStatus, isOverdue } from '../../domain/externalDependency';
import { WorkItem } from '../../domain/types';

type SortKey = 'id' | 'title' | 'externalOwner' | 'internalOwner' | 'targetDate' | 'status';

const STATUS_LABELS: Record<DepStatus, string> = {
  OnTrack: 'On Track', AtRisk: 'At Risk', Late: 'Late', Received: 'Received',
};

const STATUS_CLASS: Record<DepStatus, string> = {
  OnTrack: 'dep-ontrack', AtRisk: 'dep-atrisk', Late: 'dep-late', Received: 'dep-received',
};

const STATUS_ORDER: Record<DepStatus, number> = {
  Late: 0, AtRisk: 1, OnTrack: 2, Received: 3,
};

interface Props {
  deps: ExternalDependency[];
  tasks: WorkItem[];
  selectedExtDepId: string | null;
  onSelectDep: (depId: string) => void;
  today: string;
}

function sortValue(dep: ExternalDependency, key: SortKey): string | number {
  switch (key) {
    case 'id': return dep.id;
    case 'title': return dep.title.toLowerCase();
    case 'externalOwner': return dep.externalOwner.toLowerCase();
    case 'internalOwner': return dep.internalOwner.toLowerCase();
    case 'targetDate': return dep.targetDate;
    case 'status': return STATUS_ORDER[dep.status];
  }
}

export function ExternalDependenciesGrid({ deps, tasks, selectedExtDepId, onSelectDep, today }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('targetDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const handleHeader = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (
      <span className="risk-grid-sort-icon" aria-hidden="true">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
    ) : null;

  const sorted = [...deps].sort((a, b) => {
    const va = sortValue(a, sortKey);
    const vb = sortValue(b, sortKey);
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const thProps = (key: SortKey) => ({
    onClick: () => handleHeader(key),
    style: { cursor: 'pointer', userSelect: 'none' as const },
    'aria-sort': (sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none') as 'ascending' | 'descending' | 'none',
  });

  return (
    <div className="risk-grid-wrap">
      <table className="risk-grid ext-dep-grid">
        <thead>
          <tr>
            <th {...thProps('id')}>ID{sortIcon('id')}</th>
            <th {...thProps('title')}>Title{sortIcon('title')}</th>
            <th {...thProps('externalOwner')}>External Owner{sortIcon('externalOwner')}</th>
            <th {...thProps('internalOwner')}>Internal Owner{sortIcon('internalOwner')}</th>
            <th {...thProps('targetDate')}>Target Date{sortIcon('targetDate')}</th>
            <th {...thProps('status')}>Status{sortIcon('status')}</th>
            <th title="Linked tasks count">Linked Tasks</th>
            <th title="Overdue indicator"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((dep) => {
            const overdue = isOverdue(dep, today);
            const linkedTitles = dep.linkedTaskIds
              .map((id) => taskMap.get(id))
              .filter(Boolean)
              .map((t) => `${t!.id}: ${t!.title}`)
              .join('\n');

            return (
              <tr
                key={dep.id}
                className={[
                  dep.id === selectedExtDepId ? 'selected' : '',
                  overdue ? 'pending-approval' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onSelectDep(dep.id)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectDep(dep.id); }}
                aria-selected={dep.id === selectedExtDepId}
              >
                <td><span className="risk-grid-id">{dep.id}</span></td>
                <td className="risk-grid-title">{dep.title}</td>
                <td className="ext-dep-org">{dep.externalOwner}</td>
                <td>{dep.internalOwner}</td>
                <td className="risk-grid-date">{dep.targetDate}</td>
                <td>
                  <span className={`badge ${STATUS_CLASS[dep.status]}`}>
                    {STATUS_LABELS[dep.status]}
                  </span>
                </td>
                <td>
                  {dep.linkedTaskIds.length > 0 ? (
                    <span className="response-count-badge" title={linkedTitles}>
                      {dep.linkedTaskIds.length}
                    </span>
                  ) : (
                    <span className="response-count-badge response-count-badge--empty">0</span>
                  )}
                </td>
                <td>
                  {overdue ? (
                    <span className="ext-dep-overdue-flag" title="Overdue — past target date and not yet received">
                      ⚠
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={8} className="risk-grid-empty">
                No external dependencies match the current filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
