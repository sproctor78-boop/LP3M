import { useState } from 'react';
import { ImpactBand, RaidAction, Risk, RiskCategory, RiskScore } from '../../domain/types';
import { buildRiskScore } from '../../domain/raidScoring';
import { RiskScoreBadge } from './RiskScoreBadge';
import { formatShort } from '../../engine/dateUtils';

interface Props {
  risk: Risk;
  raidActions: RaidAction[];
  onUpdateRisk: (riskId: string, patch: Partial<Risk>) => void;
  onDeleteRisk: (riskId: string) => void;
  onApproveResidualScore: (riskId: string, newResidual: RiskScore) => void;
  onRejectResidualScore: (riskId: string) => void;
}

const CATEGORIES: RiskCategory[] = [
  'Technical', 'Resource', 'Schedule', 'Commercial', 'Supply Chain', 'Regulatory', 'External',
];

const IMPACT_LABELS: Record<ImpactBand, string> = {
  1: '1 — Negligible', 2: '2 — Minor', 3: '3 — Moderate', 4: '4 — Major', 5: '5 — Severe',
};

const ACTION_STATUS_LABELS: Record<string, string> = {
  Todo: 'To Do', InProgress: 'In Progress', Done: 'Done', Overdue: 'Overdue',
};

export function RiskInspector({
  risk,
  raidActions,
  onUpdateRisk,
  onDeleteRisk,
  onApproveResidualScore,
  onRejectResidualScore,
}: Props) {
  const [approvalPct, setApprovalPct] = useState(risk.scores.residual.probabilityPct);
  const [approvalCost, setApprovalCost] = useState<ImpactBand>(risk.scores.residual.costImpact);
  const [approvalTime, setApprovalTime] = useState<ImpactBand>(risk.scores.residual.timeImpact);

  const proposedScore = buildRiskScore(approvalPct, approvalCost, approvalTime);
  const isPending = risk.status === 'PendingApproval';

  const riskActions = raidActions.filter((a) => a.riskId === risk.id);

  return (
    <div>
      {isPending ? (
        <div className="risk-approval-panel">
          <div className="risk-approval-panel-title">Residual score review required</div>
          <div className="risk-approval-panel-desc">
            An action on this risk has been marked complete. Review the evidence and set
            the updated residual score below.
          </div>
          <div className="risk-approval-reference">
            <span className="detail-label" style={{ marginBottom: 0 }}>Current residual</span>
            <RiskScoreBadge score={risk.scores.residual} showDetail />
          </div>
          <div className="detail-grid" style={{ marginTop: 10 }}>
            <div className="detail-field">
              <div className="detail-label">New probability %</div>
              <input
                type="number"
                min={0}
                max={100}
                value={approvalPct}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (Number.isFinite(v)) setApprovalPct(Math.max(0, Math.min(100, v)));
                }}
              />
            </div>
            <div className="detail-field">
              <div className="detail-label">Proposed score</div>
              <div style={{ paddingTop: 8 }}>
                <RiskScoreBadge score={proposedScore} showDetail />
              </div>
            </div>
          </div>
          <div className="detail-grid" style={{ marginTop: 8 }}>
            <div className="detail-field">
              <div className="detail-label">Cost impact</div>
              <select
                value={approvalCost}
                onChange={(e) => setApprovalCost(parseInt(e.target.value, 10) as ImpactBand)}
              >
                {([1, 2, 3, 4, 5] as ImpactBand[]).map((b) => (
                  <option key={b} value={b}>{IMPACT_LABELS[b]}</option>
                ))}
              </select>
            </div>
            <div className="detail-field">
              <div className="detail-label">Time impact</div>
              <select
                value={approvalTime}
                onChange={(e) => setApprovalTime(parseInt(e.target.value, 10) as ImpactBand)}
              >
                {([1, 2, 3, 4, 5] as ImpactBand[]).map((b) => (
                  <option key={b} value={b}>{IMPACT_LABELS[b]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="risk-approval-actions">
            <button
              type="button"
              className="btn-apply"
              onClick={() => onApproveResidualScore(risk.id, proposedScore)}
            >
              Approve new residual
            </button>
            <button
              type="button"
              className="btn-cancel"
              onClick={() => onRejectResidualScore(risk.id)}
            >
              Reject — keep current
            </button>
          </div>
        </div>
      ) : null}

      <div className="detail-section">
        <div className="risk-score-cards">
          {(['inherent', 'residual', 'target'] as const).map((key) => (
            <div key={key} className="risk-score-card">
              <div className="risk-score-card-label">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
              <RiskScoreBadge score={risk.scores[key]} />
              <div className="risk-score-card-detail">
                P{risk.scores[key].probabilityBand} × {Math.max(risk.scores[key].costImpact, risk.scores[key].timeImpact)}
              </div>
              <div className="risk-score-card-pct">{risk.scores[key].probabilityPct}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-label">Description</div>
        <textarea
          rows={3}
          value={risk.description}
          onChange={(e) => onUpdateRisk(risk.id, { description: e.target.value })}
          style={{ resize: 'vertical' }}
        />
      </div>

      <div className="detail-section">
        <div className="detail-grid">
          <div className="detail-field">
            <div className="detail-label">Category</div>
            <select
              value={risk.category}
              onChange={(e) => onUpdateRisk(risk.id, { category: e.target.value as RiskCategory })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="detail-field">
            <div className="detail-label">Owner</div>
            <input
              type="text"
              value={risk.owner}
              onChange={(e) => onUpdateRisk(risk.id, { owner: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-grid">
          <div className="detail-field">
            <div className="detail-label">Raised</div>
            <input
              type="date"
              value={risk.raisedDate}
              onChange={(e) => { if (e.target.value) onUpdateRisk(risk.id, { raisedDate: e.target.value }); }}
            />
          </div>
          <div className="detail-field">
            <div className="detail-label">Review date</div>
            <input
              type="date"
              value={risk.reviewDate}
              onChange={(e) => { if (e.target.value) onUpdateRisk(risk.id, { reviewDate: e.target.value }); }}
            />
          </div>
        </div>
      </div>

      {risk.controls.length > 0 ? (
        <div className="detail-section">
          <div className="detail-label">Controls in place</div>
          <ul className="dep-list">
            {risk.controls.map((c) => (
              <li key={c.id}>{c.description}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {risk.mitigations.length > 0 ? (
        <div className="detail-section">
          <div className="detail-label">Planned mitigations</div>
          <ul className="dep-list">
            {risk.mitigations.map((m) => (
              <li key={m.id}>{m.description}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {riskActions.length > 0 ? (
        <div className="detail-section">
          <div className="detail-label">Actions ({riskActions.length})</div>
          <div className="risk-actions-list">
            {riskActions.map((a) => (
              <div key={a.id} className="risk-action-row">
                <span className={`badge risk-action-status--${a.status.toLowerCase()}`}>
                  {ACTION_STATUS_LABELS[a.status]}
                </span>
                <span className="risk-action-title">{a.title}</span>
                <span className="risk-action-due">{formatShort(a.dueDate)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="detail-section" style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
        <button
          type="button"
          className="btn-danger"
          onClick={() => {
            if (window.confirm(`Delete risk "${risk.title}"? All associated actions will also be removed.`)) {
              onDeleteRisk(risk.id);
            }
          }}
        >
          Delete risk
        </button>
      </div>

      <div className="detail-section">
        <div className="detail-label">Reference</div>
        <div className="detail-value" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {risk.id} · last modified {new Date(risk.lastModifiedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
