import { useState } from 'react';
import { AppState, Risk, RiskCategory } from '../../domain/types';
import { downloadRaidCsv } from '../../export/raidCsvExport';
import { showHint } from '../Toasts/Hint';
import { RiskGrid } from './RiskGrid';

interface Props {
  state: AppState;
  onSelectRisk: (riskId: string) => void;
}

const ALL_CATEGORIES: RiskCategory[] = [
  'Technical', 'Resource', 'Schedule', 'Commercial', 'Supply Chain', 'Regulatory', 'External',
];

export function RiskRegister({ state, onSelectRisk }: Props) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<RiskCategory | ''>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);

  const risks = state.domain.risks;
  const pendingCount = risks.filter((r) => r.status === 'PendingApproval').length;

  const filtered = risks.filter((r: Risk) => {
    if (pendingOnly && r.status !== 'PendingApproval') return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (categoryFilter && r.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.id.toLowerCase().includes(q) && !r.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleExport = () => {
    downloadRaidCsv(filtered);
    showHint('Risk register exported');
  };

  return (
    <section className="risk-register-panel">
      <div className="risk-register-toolbar">
        <div>
          <div className="board-title">Risk Register</div>
          <div className="board-meta">Operational Capability Delivery · {risks.length} risks</div>
        </div>

        <div className="risk-register-filters">
          <input
            type="search"
            className="risk-register-search"
            placeholder="Search ID or title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search risks"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as RiskCategory | '')}
            aria-label="Filter by category"
            className="risk-register-filter-select"
          >
            <option value="">All categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="risk-register-filter-select"
          >
            <option value="">All statuses</option>
            <option value="Open">Open</option>
            <option value="Mitigated">Mitigated</option>
            <option value="Closed">Closed</option>
            <option value="PendingApproval">Pending approval</option>
          </select>

          {pendingCount > 0 ? (
            <button
              type="button"
              className={`milestones-only-chip${pendingOnly ? ' active' : ''}`}
              onClick={() => setPendingOnly((v) => !v)}
              title="Show only risks awaiting residual score approval"
            >
              Needs approval ({pendingCount})
            </button>
          ) : null}
        </div>

        <div className="board-header-actions">
          <button
            type="button"
            className="btn"
            onClick={handleExport}
            title="Export risk register as CSV"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2v9M4 7l4 4 4-4M3 13h10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <RiskGrid
        risks={filtered}
        selectedRiskId={state.view.selectedRiskId}
        onSelectRisk={onSelectRisk}
      />
    </section>
  );
}
