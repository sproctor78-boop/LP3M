import { useState } from 'react';
import { Risk } from '../../domain/types';
import { RiskScoreBadge } from './RiskScoreBadge';

type SortKey = 'id' | 'title' | 'category' | 'owner' | 'status' | 'inherent' | 'residual';

interface Props {
  risks: Risk[];
  selectedRiskId: string | null;
  onSelectRisk: (riskId: string) => void;
}

function sortValue(risk: Risk, key: SortKey): string | number {
  switch (key) {
    case 'id': return risk.id;
    case 'title': return risk.title.toLowerCase();
    case 'category': return risk.category;
    case 'owner': return risk.owner.toLowerCase();
    case 'status': return risk.status;
    case 'inherent': return risk.scores.inherent.score;
    case 'residual': return risk.scores.residual.score;
  }
}

const STATUS_LABELS: Record<string, string> = {
  Open: 'Open',
  Mitigated: 'Mitigated',
  Closed: 'Closed',
  PendingApproval: 'Pending approval',
};

const STATUS_CLASS: Record<string, string> = {
  Open: 'risk-open',
  Mitigated: 'risk-mitigated',
  Closed: 'risk-closed',
  PendingApproval: 'risk-pending',
};

const COLUMNS: { key: SortKey; label: string; title?: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Title' },
  { key: 'category', label: 'Category' },
  { key: 'owner', label: 'Owner' },
  { key: 'inherent', label: 'Inherent', title: 'Inherent score' },
  { key: 'residual', label: 'Residual', title: 'Residual score' },
  { key: 'status', label: 'Status' },
];

export function RiskGrid({ risks, selectedRiskId, onSelectRisk }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleHeaderClick = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...risks].sort((a, b) => {
    const va = sortValue(a, sortKey);
    const vb = sortValue(b, sortKey);
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="risk-grid-wrap">
      <table className="risk-grid">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleHeaderClick(col.key)}
                title={col.title ?? col.label}
                aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                {col.label}
                {sortKey === col.key ? (
                  <span className="risk-grid-sort-icon" aria-hidden="true">
                    {sortDir === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((risk) => (
            <tr
              key={risk.id}
              className={[
                risk.id === selectedRiskId ? 'selected' : '',
                risk.status === 'PendingApproval' ? 'pending-approval' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectRisk(risk.id)}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectRisk(risk.id); }}
              aria-selected={risk.id === selectedRiskId}
            >
              <td>
                <span className="risk-grid-id">{risk.id}</span>
              </td>
              <td className="risk-grid-title">{risk.title}</td>
              <td>
                <span className="risk-grid-category">{risk.category}</span>
              </td>
              <td>{risk.owner}</td>
              <td><RiskScoreBadge score={risk.scores.inherent} /></td>
              <td><RiskScoreBadge score={risk.scores.residual} /></td>
              <td>
                <span className={`badge ${STATUS_CLASS[risk.status] ?? ''}`}>
                  {STATUS_LABELS[risk.status] ?? risk.status}
                </span>
              </td>
            </tr>
          ))}
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="risk-grid-empty">
                No risks match the current filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
