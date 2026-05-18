import { useState } from 'react';
import { AcceptanceCriterion, Deliverable, DeliverableStatus, WorkItem } from '../../domain/types';
import { AcceptanceCriteriaEditor } from './AcceptanceCriteriaEditor';

const ALL_STATUSES: DeliverableStatus[] = ['Planned', 'InProduction', 'InReview', 'Accepted', 'Rejected'];
const STATUS_LABELS: Record<DeliverableStatus, string> = {
  Planned: 'Planned', InProduction: 'In Production', InReview: 'In Review',
  Accepted: 'Accepted', Rejected: 'Rejected',
};

interface Props {
  tasks: WorkItem[];
  onSave: (deliverable: Deliverable) => void;
  onClose: () => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DeliverableCreateForm({ tasks, onSave, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [status, setStatus] = useState<DeliverableStatus>('Planned');
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([]);
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [titleError, setTitleError] = useState(false);

  const buildDeliverable = (): Deliverable => ({
    id: `DL${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
    title: title.trim(),
    description: description.trim(),
    owner: owner.trim(),
    targetDate: targetDate || today(),
    status,
    acceptanceCriteria: criteria,
    linkedTaskIds,
    notes: notes.trim(),
    acceptedAt: null,
    acceptedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    lastReviewedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  const handleSave = () => {
    if (!title.trim()) { setTitleError(true); return; }
    onSave(buildDeliverable());
    onClose();
  };

  const handleSaveAndAnother = () => {
    if (!title.trim()) { setTitleError(true); return; }
    onSave(buildDeliverable());
    setTitle(''); setDescription(''); setOwner(''); setTargetDate('');
    setStatus('Planned'); setCriteria([]); setLinkedTaskIds([]); setNotes('');
    setTitleError(false);
  };

  const toggleTask = (taskId: string) => {
    setLinkedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    );
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
            placeholder="What will this deliverable produce?"
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
            placeholder="Describe what this deliverable is and why it matters"
            rows={3}
          />
        </div>
        <div className="detail-field">
          <div className="detail-label">Owner</div>
          <input
            type="text"
            className="detail-input"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Person ID or name"
          />
        </div>
      </div>

      {/* Dates & Status */}
      <div className="risk-create-section">
        <div className="risk-create-section-title">Dates & Status</div>
        <div className="risk-create-row">
          <div className="detail-field">
            <div className="detail-label">Target Date</div>
            <input
              type="date"
              className="detail-input"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div className="detail-field">
            <div className="detail-label">Status</div>
            <select
              className="detail-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as DeliverableStatus)}
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Acceptance Criteria */}
      <div className="risk-create-section">
        <div className="risk-create-section-title">Acceptance Criteria</div>
        <AcceptanceCriteriaEditor
          criteria={criteria}
          onChange={setCriteria}
        />
      </div>

      {/* Linked Tasks */}
      <div className="risk-create-section">
        <div className="risk-create-section-title">Linked Tasks</div>
        <div className="detail-label" style={{ marginBottom: 6 }}>
          Select tasks that produce this deliverable
        </div>
        <div className="ext-dep-task-picker">
          {tasks.filter((t) => !t.isParent).map((t) => (
            <label key={t.id} className="ext-dep-task-option">
              <input
                type="checkbox"
                checked={linkedTaskIds.includes(t.id)}
                onChange={() => toggleTask(t.id)}
              />
              <span className="risk-grid-id">{t.id}</span>
              <span>{t.title}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="risk-create-section">
        <div className="risk-create-section-title">Notes</div>
        <div className="detail-field">
          <textarea
            className="detail-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Context, review history, related risks or dependencies…"
            rows={3}
          />
        </div>
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
