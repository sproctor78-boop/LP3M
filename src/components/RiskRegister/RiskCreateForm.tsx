import { useState } from 'react';
import { ImpactBand, Proximity, ResponseItem, Risk, RiskCategory } from '../../domain/types';
import { buildRiskScore } from '../../domain/raidScoring';
import { RiskScoreBadge } from './RiskScoreBadge';

const CATEGORIES: RiskCategory[] = [
  'Technical', 'Resource', 'Schedule', 'Commercial', 'Supply Chain', 'Regulatory', 'External',
];

const IMPACT_OPTIONS: { value: ImpactBand; label: string }[] = [
  { value: 1, label: '1 — Negligible' },
  { value: 2, label: '2 — Minor' },
  { value: 3, label: '3 — Moderate' },
  { value: 4, label: '4 — Major' },
  { value: 5, label: '5 — Severe' },
];

const PROXIMITY_OPTIONS: { value: Proximity; label: string }[] = [
  { value: 'Imminent',   label: 'Imminent (≤ 1 month)' },
  { value: 'NearTerm',   label: 'Near-term (1–3 months)' },
  { value: 'MediumTerm', label: 'Medium-term (3–12 months)' },
  { value: 'LongTerm',   label: 'Long-term (> 12 months)' },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ScoreFields {
  probabilityPct: number;
  costImpact: ImpactBand;
  timeImpact: ImpactBand;
}

const DEFAULT_SCORE: ScoreFields = { probabilityPct: 50, costImpact: 3, timeImpact: 3 };

interface Props {
  onSave: (risk: Risk) => void;
  onClose: () => void;
}

export function RiskCreateForm({ onSave, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RiskCategory>('Technical');
  const [owner, setOwner] = useState('');
  const [raisedDate, setRaisedDate] = useState(today());
  const [reviewDate, setReviewDate] = useState('');
  const [proximity, setProximity] = useState<Proximity>('MediumTerm');
  const [inherent, setInherent] = useState<ScoreFields>(DEFAULT_SCORE);
  const [residual, setResidual] = useState<ScoreFields>({ probabilityPct: 25, costImpact: 3, timeImpact: 3 });
  const [target, setTarget] = useState<ScoreFields>({ probabilityPct: 10, costImpact: 2, timeImpact: 2 });
  const [controls, setControls] = useState<ResponseItem[]>([]);
  const [mitigations, setMitigations] = useState<ResponseItem[]>([]);
  const [newControlDesc, setNewControlDesc] = useState('');
  const [newMitigationDesc, setNewMitigationDesc] = useState('');
  const [addingControl, setAddingControl] = useState(false);
  const [addingMitigation, setAddingMitigation] = useState(false);
  const [titleError, setTitleError] = useState(false);

  const inherentScore = buildRiskScore(inherent.probabilityPct, inherent.costImpact, inherent.timeImpact);
  const residualScore = buildRiskScore(residual.probabilityPct, residual.costImpact, residual.timeImpact);
  const targetScore = buildRiskScore(target.probabilityPct, target.costImpact, target.timeImpact);

  const buildRisk = (): Risk => ({
    id: crypto.randomUUID().slice(0, 8).toUpperCase(),
    title: title.trim(),
    description: description.trim(),
    category,
    owner: owner.trim(),
    status: 'Open',
    scores: { inherent: inherentScore, residual: residualScore, target: targetScore },
    proposedResidualScore: null,
    controls,
    mitigations,
    raisedDate: raisedDate || today(),
    reviewDate: reviewDate || today(),
    lastModifiedAt: new Date().toISOString(),
    proximity,
    linkedTaskIds: [],
    linkedDeliverableIds: [],
  });

  const handleSave = () => {
    if (!title.trim()) { setTitleError(true); return; }
    onSave(buildRisk());
    onClose();
  };

  const handleSaveAndAnother = () => {
    if (!title.trim()) { setTitleError(true); return; }
    onSave(buildRisk());
    // Reset all fields to blank
    setTitle('');
    setDescription('');
    setCategory('Technical');
    setOwner('');
    setRaisedDate(today());
    setReviewDate('');
    setProximity('MediumTerm');
    setInherent(DEFAULT_SCORE);
    setResidual({ probabilityPct: 25, costImpact: 3, timeImpact: 3 });
    setTarget({ probabilityPct: 10, costImpact: 2, timeImpact: 2 });
    setControls([]);
    setMitigations([]);
    setNewControlDesc('');
    setNewMitigationDesc('');
    setAddingControl(false);
    setAddingMitigation(false);
    setTitleError(false);
  };

  const addControl = () => {
    if (!newControlDesc.trim()) return;
    const id = `ctrl-${crypto.randomUUID().slice(0, 8)}`;
    setControls((c) => [...c, { id, type: 'control', description: newControlDesc.trim() }]);
    setNewControlDesc('');
    setAddingControl(false);
  };

  const addMitigation = () => {
    if (!newMitigationDesc.trim()) return;
    const id = `mit-${crypto.randomUUID().slice(0, 8)}`;
    setMitigations((m) => [...m, { id, type: 'mitigation', description: newMitigationDesc.trim() }]);
    setNewMitigationDesc('');
    setAddingMitigation(false);
  };

  return (
    <div className="risk-create-form">
      {/* Identity section */}
      <div className="risk-create-section">
        <div className="risk-create-section-title">Identity</div>

        <div className="detail-field">
          <div className="detail-label">Title <span className="required-mark">*</span></div>
          <input
            type="text"
            className={`detail-input${titleError ? ' input-error' : ''}`}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
            placeholder="Risk title"
            autoFocus
          />
          {titleError && <div className="input-error-msg">Title is required</div>}
        </div>

        <div className="detail-field">
          <div className="detail-label">Description</div>
          <textarea
            className="detail-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the risk and its potential impact"
            rows={3}
          />
        </div>

        <div className="risk-create-row">
          <div className="detail-field">
            <div className="detail-label">Category</div>
            <select
              className="detail-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as RiskCategory)}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="detail-field">
            <div className="detail-label">Owner</div>
            <input
              type="text"
              className="detail-input"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Owner name or ID"
            />
          </div>
        </div>

        <div className="risk-create-row">
          <div className="detail-field">
            <div className="detail-label">Raised Date</div>
            <input
              type="date"
              className="detail-input"
              value={raisedDate}
              onChange={(e) => setRaisedDate(e.target.value)}
            />
          </div>

          <div className="detail-field">
            <div className="detail-label">Review Date</div>
            <input
              type="date"
              className="detail-input"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
            />
          </div>
        </div>

        <div className="detail-field">
          <div className="detail-label">Proximity</div>
          <select
            className="detail-select"
            value={proximity}
            onChange={(e) => setProximity(e.target.value as Proximity)}
          >
            {PROXIMITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Scoring section */}
      <div className="risk-create-section">
        <div className="risk-create-section-title">Scoring</div>

        {([
          { label: 'Inherent', fields: inherent, set: setInherent, score: inherentScore },
          { label: 'Residual', fields: residual, set: setResidual, score: residualScore },
          { label: 'Target',   fields: target,   set: setTarget,   score: targetScore   },
        ] as const).map(({ label, fields, set, score }) => (
          <div key={label} className="risk-create-score-block">
            <div className="risk-create-score-label">{label}</div>
            <div className="risk-create-score-row">
              <div className="detail-field risk-create-score-field">
                <div className="detail-label">Probability %</div>
                <input
                  type="number"
                  className="detail-input"
                  min={0}
                  max={100}
                  value={fields.probabilityPct}
                  onChange={(e) => set((f) => ({ ...f, probabilityPct: Math.max(0, Math.min(100, Number(e.target.value))) }))}
                />
              </div>
              <div className="detail-field risk-create-score-field">
                <div className="detail-label">Cost impact</div>
                <select
                  className="detail-select"
                  value={fields.costImpact}
                  onChange={(e) => set((f) => ({ ...f, costImpact: Number(e.target.value) as ImpactBand }))}
                >
                  {IMPACT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="detail-field risk-create-score-field">
                <div className="detail-label">Time impact</div>
                <select
                  className="detail-select"
                  value={fields.timeImpact}
                  onChange={(e) => set((f) => ({ ...f, timeImpact: Number(e.target.value) as ImpactBand }))}
                >
                  {IMPACT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="risk-create-score-result">
                <div className="detail-label">Score</div>
                <RiskScoreBadge score={score} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls section */}
      <div className="risk-create-section">
        <div className="risk-create-section-title">Controls</div>
        {controls.map((c) => (
          <div key={c.id} className="risk-create-response-item">
            <span className="risk-create-response-desc">{c.description}</span>
            <button
              type="button"
              className="risk-create-response-remove"
              aria-label="Remove control"
              onClick={() => setControls((cs) => cs.filter((x) => x.id !== c.id))}
            >
              ×
            </button>
          </div>
        ))}
        {addingControl ? (
          <div className="risk-create-add-row">
            <input
              type="text"
              className="detail-input risk-create-add-input"
              value={newControlDesc}
              onChange={(e) => setNewControlDesc(e.target.value)}
              placeholder="Control description"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') addControl(); if (e.key === 'Escape') { setAddingControl(false); setNewControlDesc(''); } }}
            />
            <button type="button" className="btn btn-sm" onClick={addControl}>Add</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setAddingControl(false); setNewControlDesc(''); }}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="btn btn-sm btn-ghost risk-create-add-btn" onClick={() => setAddingControl(true)}>
            + Add control
          </button>
        )}
      </div>

      {/* Mitigations section */}
      <div className="risk-create-section">
        <div className="risk-create-section-title">Mitigations</div>
        {mitigations.map((m) => (
          <div key={m.id} className="risk-create-response-item">
            <span className="risk-create-response-desc">{m.description}</span>
            <button
              type="button"
              className="risk-create-response-remove"
              aria-label="Remove mitigation"
              onClick={() => setMitigations((ms) => ms.filter((x) => x.id !== m.id))}
            >
              ×
            </button>
          </div>
        ))}
        {addingMitigation ? (
          <div className="risk-create-add-row">
            <input
              type="text"
              className="detail-input risk-create-add-input"
              value={newMitigationDesc}
              onChange={(e) => setNewMitigationDesc(e.target.value)}
              placeholder="Mitigation description"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') addMitigation(); if (e.key === 'Escape') { setAddingMitigation(false); setNewMitigationDesc(''); } }}
            />
            <button type="button" className="btn btn-sm" onClick={addMitigation}>Add</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setAddingMitigation(false); setNewMitigationDesc(''); }}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="btn btn-sm btn-ghost risk-create-add-btn" onClick={() => setAddingMitigation(true)}>
            + Add mitigation
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="risk-create-footer">
        <button type="button" className="btn btn-primary" onClick={handleSave}>Save</button>
        <button type="button" className="btn" onClick={handleSaveAndAnother}>Save and add another</button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
