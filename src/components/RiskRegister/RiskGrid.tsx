import { useState } from 'react';
import { Proximity, Risk } from '../../domain/types';
import { PROXIMITY_BANDS } from '../../domain/risk';
import { RiskScoreBadge } from './RiskScoreBadge';
import { ResponseCountBadge } from './ResponseCountBadge';

type SortKey =
  | 'id' | 'title' | 'category' | 'owner' | 'status'
  | 'raised' | 'review' | 'proximity'
  | 'inherent' | 'residual' | 'target';

const PROXIMITY_ORDER: Record<Proximity, number> = {
  Imminent: 0, NearTerm: 1, MediumTerm: 2, LongTerm: 3,
};

const PROXIMITY_CLASS: Record<Proximity, string> = {
  Imminent:   'proximity-imminent',
  NearTerm:   'proximity-near-term',
  MediumTerm: 'proximity-medium-term',
  LongTerm:   'proximity-long-term',
};

const STATUS_LABELS: Record<string, string> = {
  Open: 'Open', Mitigated: 'Mitigated', Closed: 'Closed', PendingApproval: 'Pending approval',
};

const STATUS_CLASS: Record<string, string> = {
  Open: 'risk-open', Mitigated: 'risk-mitigated', Closed: 'risk-closed', PendingApproval: 'risk-pending',
};

function sortValue(risk: Risk, key: SortKey): string | number {
  switch (key) {
    case 'id':        return risk.id;
    case 'title':     return risk.title.toLowerCase();
    case 'category':  return risk.category;
    case 'owner':     return risk.owner.toLowerCase();
    case 'status':    return risk.status;
    case 'raised':    return risk.raisedDate;
    case 'review':    return risk.reviewDate;
    case 'proximity': return PROXIMITY_ORDER[risk.proximity];
    case 'inherent':  return risk.scores.inherent.score;
    case 'residual':  return risk.scores.residual.score;
    case 'target':    return risk.scores.target.score;
  }
}

interface CollapseState {
  inherentCollapsed: boolean;
  residualCollapsed: boolean;
}

interface Props {
  risks: Risk[];
  selectedRiskId: string | null;
  onSelectRisk: (riskId: string) => void;
  collapseState: CollapseState;
  onSetCollapse: (group: 'inherent' | 'residual', collapsed: boolean) => void;
}

export function RiskGrid({ risks, selectedRiskId, onSelectRisk, collapseState, onSetCollapse }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const { inherentCollapsed, residualCollapsed } = collapseState;

  const INHERENT_DETAIL_COLS = !inherentCollapsed;
  const RESIDUAL_DETAIL_COLS = !residualCollapsed;

  const inherentColSpan = inherentCollapsed ? 2 : 6;
  const residualColSpan = residualCollapsed ? 2 : 6;

  const handleHeaderClick = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (
      <span className="risk-grid-sort-icon" aria-hidden="true">
        {sortDir === 'asc' ? ' ↑' : ' ↓'}
      </span>
    ) : null;

  const sorted = [...risks].sort((a, b) => {
    const va = sortValue(a, sortKey);
    const vb = sortValue(b, sortKey);
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalCols = 5 + 3 + inherentColSpan + residualColSpan + 2 + 2;

  return (
    <div className="risk-grid-wrap">
      <table className="risk-grid">
        <thead>
          {/* Group header row */}
          <tr className="risk-grid-group-row">
            <th colSpan={5} className="risk-grid-group-header">Identity</th>
            <th colSpan={3} className="risk-grid-group-header">Dates</th>
            <th
              colSpan={inherentColSpan}
              className="risk-grid-group-header col-group-inherent"
            >
              <span className="col-group-inner">
                <span>Inherent</span>
                <button
                  type="button"
                  className="col-group-toggle"
                  aria-label={inherentCollapsed ? 'Expand Inherent columns' : 'Collapse Inherent columns'}
                  title={inherentCollapsed ? 'Expand' : 'Collapse'}
                  onClick={() => onSetCollapse('inherent', !inherentCollapsed)}
                >
                  {inherentCollapsed ? '▸' : '◂'}
                </button>
              </span>
            </th>
            <th
              colSpan={residualColSpan}
              className="risk-grid-group-header col-group-residual"
            >
              <span className="col-group-inner">
                <span>Residual</span>
                <button
                  type="button"
                  className="col-group-toggle"
                  aria-label={residualCollapsed ? 'Expand Residual columns' : 'Collapse Residual columns'}
                  title={residualCollapsed ? 'Expand' : 'Collapse'}
                  onClick={() => onSetCollapse('residual', !residualCollapsed)}
                >
                  {residualCollapsed ? '▸' : '◂'}
                </button>
              </span>
            </th>
            <th colSpan={2} className="risk-grid-group-header">Target</th>
            <th colSpan={2} className="risk-grid-group-header">Responses</th>
          </tr>

          {/* Sub-column headers row */}
          <tr>
            {/* Identity */}
            <th onClick={() => handleHeaderClick('id')} aria-sort={sortKey === 'id' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              ID{sortIcon('id')}
            </th>
            <th onClick={() => handleHeaderClick('title')} aria-sort={sortKey === 'title' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              Title{sortIcon('title')}
            </th>
            <th onClick={() => handleHeaderClick('category')} aria-sort={sortKey === 'category' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              Category{sortIcon('category')}
            </th>
            <th onClick={() => handleHeaderClick('owner')} aria-sort={sortKey === 'owner' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              Owner{sortIcon('owner')}
            </th>
            <th onClick={() => handleHeaderClick('status')} aria-sort={sortKey === 'status' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              Status{sortIcon('status')}
            </th>

            {/* Dates */}
            <th onClick={() => handleHeaderClick('raised')} aria-sort={sortKey === 'raised' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              Raised{sortIcon('raised')}
            </th>
            <th onClick={() => handleHeaderClick('review')} aria-sort={sortKey === 'review' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              Review{sortIcon('review')}
            </th>
            <th onClick={() => handleHeaderClick('proximity')} aria-sort={sortKey === 'proximity' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              Proximity{sortIcon('proximity')}
            </th>

            {/* Inherent detail (hidden when collapsed) */}
            {INHERENT_DETAIL_COLS && (
              <>
                <th>Prob %</th>
                <th>Prob band</th>
                <th>Cost</th>
                <th>Time</th>
              </>
            )}
            {/* Inherent score + RAG always visible */}
            <th onClick={() => handleHeaderClick('inherent')} aria-sort={sortKey === 'inherent' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} title="Inherent score">
              Score{sortIcon('inherent')}
            </th>
            <th title="Inherent RAG">RAG</th>

            {/* Residual detail (hidden when collapsed) */}
            {RESIDUAL_DETAIL_COLS && (
              <>
                <th>Prob %</th>
                <th>Prob band</th>
                <th>Cost</th>
                <th>Time</th>
              </>
            )}
            {/* Residual score + RAG always visible */}
            <th onClick={() => handleHeaderClick('residual')} aria-sort={sortKey === 'residual' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} title="Residual score">
              Score{sortIcon('residual')}
            </th>
            <th title="Residual RAG">RAG</th>

            {/* Target */}
            <th onClick={() => handleHeaderClick('target')} aria-sort={sortKey === 'target' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} title="Target score">
              Score{sortIcon('target')}
            </th>
            <th title="Target RAG">RAG</th>

            {/* Responses */}
            <th title="Controls count">Controls</th>
            <th title="Mitigations count">Mitigations</th>
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
              {/* Identity */}
              <td><span className="risk-grid-id">{risk.id}</span></td>
              <td className="risk-grid-title">{risk.title}</td>
              <td><span className="risk-grid-category">{risk.category}</span></td>
              <td>{risk.owner}</td>
              <td>
                <span className={`badge ${STATUS_CLASS[risk.status] ?? ''}`}>
                  {STATUS_LABELS[risk.status] ?? risk.status}
                </span>
              </td>

              {/* Dates */}
              <td className="risk-grid-date">{risk.raisedDate}</td>
              <td className="risk-grid-date">{risk.reviewDate}</td>
              <td>
                <span className={`risk-grid-proximity ${PROXIMITY_CLASS[risk.proximity]}`}>
                  {PROXIMITY_BANDS[risk.proximity].label}
                </span>
              </td>

              {/* Inherent detail (hidden when collapsed) */}
              {INHERENT_DETAIL_COLS && (
                <>
                  <td className="risk-grid-num">{risk.scores.inherent.probabilityPct}%</td>
                  <td className="risk-grid-num">{risk.scores.inherent.probabilityBand}</td>
                  <td className="risk-grid-num">{risk.scores.inherent.costImpact}</td>
                  <td className="risk-grid-num">{risk.scores.inherent.timeImpact}</td>
                </>
              )}
              <td><RiskScoreBadge score={risk.scores.inherent} /></td>
              <td><span className={`risk-rag-dot rag-${risk.scores.inherent.rag}`} /></td>

              {/* Residual detail (hidden when collapsed) */}
              {RESIDUAL_DETAIL_COLS && (
                <>
                  <td className="risk-grid-num">{risk.scores.residual.probabilityPct}%</td>
                  <td className="risk-grid-num">{risk.scores.residual.probabilityBand}</td>
                  <td className="risk-grid-num">{risk.scores.residual.costImpact}</td>
                  <td className="risk-grid-num">{risk.scores.residual.timeImpact}</td>
                </>
              )}
              <td><RiskScoreBadge score={risk.scores.residual} /></td>
              <td><span className={`risk-rag-dot rag-${risk.scores.residual.rag}`} /></td>

              {/* Target */}
              <td><RiskScoreBadge score={risk.scores.target} /></td>
              <td><span className={`risk-rag-dot rag-${risk.scores.target.rag}`} /></td>

              {/* Responses */}
              <td>
                <ResponseCountBadge
                  items={risk.controls}
                  label="Controls"
                  onBadgeClick={() => onSelectRisk(risk.id)}
                />
              </td>
              <td>
                <ResponseCountBadge
                  items={risk.mitigations}
                  label="Mitigations"
                  onBadgeClick={() => onSelectRisk(risk.id)}
                />
              </td>
            </tr>
          ))}
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={totalCols} className="risk-grid-empty">
                No risks match the current filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
