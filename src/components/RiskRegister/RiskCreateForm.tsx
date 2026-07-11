import { useState } from 'react';
import { Deliverable, ExternalDependency, WorkItem } from '../../domain/types';
import { ImpactBand, Proximity, Risk, RiskCategory } from '../../domain/types';
import { buildRiskScore } from '../../domain/raidScoring';
import { RiskScoreBadge } from './RiskScoreBadge';
import { LinkPicker } from '../common/LinkPicker';

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

const IMPACT_TYPES = [
  { value: 'schedule', label: 'Schedule' },
  { value: 'cost',     label: 'Cost' },
  { value: 'quality',  label: 'Quality' },
  { value: 'scope',    label: 'Scope' },
  { value: 'mixed',    label: 'Mixed' },
] as const;

type ImpactType = 'schedule' | 'cost' | 'quality' | 'scope' | 'mixed';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface RiskCreateInitialValues {
  title?: string;
  linkedTaskIds?: string[];
}

interface Props {
  tasks: WorkItem[];
  deliverables: Deliverable[];
  externalDependencies: ExternalDependency[];
  onSave: (risk: Risk) => void;
  onClose: () => void;
  initialValues?: RiskCreateInitialValues;
}

export function RiskCreateForm({ tasks, deliverables, externalDependencies, onSave, onClose, initialValues }: Props) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RiskCategory>('Technical');
  const [owner, setOwner] = useState('');
  const [raisedDate, setRaisedDate] = useState(todayStr());
  const [reviewDate, setReviewDate] = useState('');
  const [proximity, setProximity] = useState<Proximity>('MediumTerm');
  const [probabilityPct, setProbabilityPct] = useState(50);
  const [impactBand, setImpactBand] = useState<ImpactBand>(3);
  const [impactType, setImpactType] = useState<ImpactType>('schedule');
  const [optimistic, setOptimistic] = useState(0);
  const [mostLikely, setMostLikely] = useState(0);
  const [pessimistic, setPessimistic] = useState(0);
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>(initialValues?.linkedTaskIds ?? []);
  const [linkedDeliverableIds, setLinkedDeliverableIds] = useState<string[]>([]);
  const [linkedDependencyIds, setLinkedDependencyIds] = useState<string[]>([]);
  const [titleError, setTitleError] = useState(false);

  const inherentScore = buildRiskScore(probabilityPct, impactBand, impactBand);
  const showScheduleImpact = impactType === 'schedule' || impactType === 'mixed';
  const pert = showScheduleImpact
    ? ((optimistic + 4 * mostLikely + pessimistic) / 6)
    : 0;

  const taskItems = tasks.filter((t) => !t.isParent).map((t) => ({ id: t.id, label: t.title }));
  const deliverableItems = deliverables.map((d) => ({ id: d.id, label: d.title }));
  const dependencyItems = externalDependencies.map((d) => ({ id: d.id, label: d.title }));

  const buildRisk = (): Risk => ({
    id: crypto.randomUUID().slice(0, 8).toUpperCase(),
    title: title.trim(),
    description: description.trim(),
    category,
    owner: owner.trim(),
    status: 'Open',
    scores: { inherent: inherentScore, residual: { ...inherentScore }, target: { ...inherentScore } },
    proposedResidualScore: null,
    controls: [],
    mitigations: [],
    raisedDate: raisedDate || todayStr(),
    reviewDate: reviewDate || todayStr(),
    lastModifiedAt: new Date().toISOString(),
    proximity,
    linkedTaskIds,
    linkedDeliverableIds,
    linkedDependencyIds,
    impactType,
    scheduleImpactDays: showScheduleImpact
      ? { optimistic, mostLikely, pessimistic }
      : undefined,
  });

  const reset = () => {
    setTitle(''); setDescription(''); setCategory('Technical'); setOwner('');
    setRaisedDate(todayStr()); setReviewDate(''); setProximity('MediumTerm');
    setProbabilityPct(50); setImpactBand(3); setImpactType('schedule');
    setOptimistic(0); setMostLikely(0); setPessimistic(0);
    setLinkedTaskIds([]); setLinkedDeliverableIds([]); setLinkedDependencyIds([]); setTitleError(false);
  };

  const handleSave = () => {
    if (!title.trim()) { setTitleError(true); return; }
    onSave(buildRisk());
    onClose();
  };

  const handleSaveAndAnother = () => {
    if (!title.trim()) { setTitleError(true); return; }
    onSave(buildRisk());
    reset();
  };

  return (
    <div className="risk-create-form">
      {/* Identity */}
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
            <input type="date" className="detail-input" value={raisedDate}
              onChange={(e) => setRaisedDate(e.target.value)} />
          </div>
          <div className="detail-field">
            <div className="detail-label">Review Date</div>
            <input type="date" className="detail-input" value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)} />
          </div>
        </div>

        <div className="detail-field">
          <div className="detail-label">Proximity</div>
          <select className="detail-select" value={proximity}
            onChange={(e) => setProximity(e.target.value as Proximity)}>
            {PROXIMITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Scoring */}
      <div className="risk-create-section">
        <div className="risk-create-section-title">Scoring</div>
        <div className="risk-create-score-row">
          <div className="detail-field risk-create-score-field">
            <div className="detail-label">Probability %</div>
            <input
              type="number"
              className="detail-input"
              min={0} max={100}
              value={probabilityPct}
              onChange={(e) => setProbabilityPct(Math.max(0, Math.min(100, Number(e.target.value))))}
            />
          </div>
          <div className="detail-field risk-create-score-field">
            <div className="detail-label">Impact (1–5)</div>
            <select className="detail-select" value={impactBand}
              onChange={(e) => setImpactBand(Number(e.target.value) as ImpactBand)}>
              {IMPACT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="risk-create-score-result">
            <div className="detail-label">Inherent score</div>
            <RiskScoreBadge score={inherentScore} />
          </div>
        </div>
      </div>

      {/* Impact type + schedule impact */}
      <div className="risk-create-section">
        <div className="risk-create-section-title">Impact</div>
        <div className="detail-field">
          <div className="detail-label">Impact type</div>
          <select className="detail-select" value={impactType}
            onChange={(e) => setImpactType(e.target.value as ImpactType)}>
            {IMPACT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {showScheduleImpact && (
          <div className="risk-create-schedule-impact">
            <div className="risk-create-row">
              <div className="detail-field risk-create-score-field">
                <div className="detail-label">Optimistic (days)</div>
                <input type="number" className="detail-input" min={0} value={optimistic}
                  onChange={(e) => setOptimistic(Math.max(0, Number(e.target.value)))} />
              </div>
              <div className="detail-field risk-create-score-field">
                <div className="detail-label">Most likely (days)</div>
                <input type="number" className="detail-input" min={0} value={mostLikely}
                  onChange={(e) => setMostLikely(Math.max(0, Number(e.target.value)))} />
              </div>
              <div className="detail-field risk-create-score-field">
                <div className="detail-label">Pessimistic (days)</div>
                <input type="number" className="detail-input" min={0} value={pessimistic}
                  onChange={(e) => setPessimistic(Math.max(0, Number(e.target.value)))} />
              </div>
            </div>
            <div className="detail-field">
              <div className="detail-label">PERT weighted estimate</div>
              <div className="risk-pert-readout">{pert.toFixed(1)} days</div>
            </div>
          </div>
        )}
      </div>

      {/* Threatens tasks */}
      <div className="risk-create-section">
        <div className="risk-create-section-title">Threatens tasks</div>
        <LinkPicker
          items={taskItems}
          selected={linkedTaskIds}
          onChange={setLinkedTaskIds}
          placeholder="Search tasks…"
        />
      </div>

      {/* Threatens deliverables */}
      <div className="risk-create-section">
        <div className="risk-create-section-title">Threatens deliverables</div>
        <LinkPicker
          items={deliverableItems}
          selected={linkedDeliverableIds}
          onChange={setLinkedDeliverableIds}
          placeholder="Search deliverables…"
        />
      </div>

      {/* Threatens dependencies */}
      <div className="risk-create-section">
        <div className="risk-create-section-title">Threatens dependencies</div>
        <LinkPicker
          items={dependencyItems}
          selected={linkedDependencyIds}
          onChange={setLinkedDependencyIds}
          placeholder="Search external dependencies…"
        />
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
