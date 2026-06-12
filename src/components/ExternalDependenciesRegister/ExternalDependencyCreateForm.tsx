import { useState } from 'react';
import { DepStatus, ExternalDependency } from '../../domain/types';
import { WorkItem } from '../../domain/types';
import { LinkPicker } from '../common/LinkPicker';

const ALL_STATUSES: DepStatus[] = ['OnTrack', 'AtRisk', 'Late', 'Received'];
const STATUS_LABELS: Record<DepStatus, string> = {
  OnTrack: 'On Track', AtRisk: 'At Risk', Late: 'Late', Received: 'Received',
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  tasks: WorkItem[];
  onSave: (dep: ExternalDependency) => void;
  onClose: () => void;
}

export function ExternalDependencyCreateForm({ tasks, onSave, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [externalOwner, setExternalOwner] = useState('');
  const [internalOwner, setInternalOwner] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [status, setStatus] = useState<DepStatus>('OnTrack');
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [titleError, setTitleError] = useState(false);

  const buildDep = (): ExternalDependency => ({
    id: `ED${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
    title: title.trim(),
    description: description.trim(),
    externalOwner: externalOwner.trim(),
    internalOwner: internalOwner.trim(),
    targetDate: targetDate || today(),
    status,
    linkedTaskIds,
    notes: notes.trim(),
    lastReviewedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  const handleSave = () => {
    if (!title.trim()) { setTitleError(true); return; }
    onSave(buildDep());
    onClose();
  };

  const handleSaveAndAnother = () => {
    if (!title.trim()) { setTitleError(true); return; }
    onSave(buildDep());
    setTitle('');
    setDescription('');
    setExternalOwner('');
    setInternalOwner('');
    setTargetDate('');
    setStatus('OnTrack');
    setLinkedTaskIds([]);
    setNotes('');
    setTitleError(false);
  };

  const taskItems = tasks.filter((t) => !t.isParent).map((t) => ({ id: t.id, label: t.title }));

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
            placeholder="What we depend on"
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
            placeholder="Describe what is needed and why"
            rows={3}
          />
        </div>

        <div className="risk-create-row">
          <div className="detail-field">
            <div className="detail-label">External Owner</div>
            <input
              type="text"
              className="detail-input"
              value={externalOwner}
              onChange={(e) => setExternalOwner(e.target.value)}
              placeholder="Third party / organisation"
            />
          </div>
          <div className="detail-field">
            <div className="detail-label">Internal Owner</div>
            <input
              type="text"
              className="detail-input"
              value={internalOwner}
              onChange={(e) => setInternalOwner(e.target.value)}
              placeholder="Person ID or name"
            />
          </div>
        </div>
      </div>

      {/* Dates and status */}
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
              onChange={(e) => setStatus(e.target.value as DepStatus)}
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Linked tasks */}
      <div className="risk-create-section">
        <div className="risk-create-section-title">Linked Tasks</div>
        <div className="detail-label" style={{ marginBottom: 6 }}>
          Tasks blocked or constrained by this dependency
        </div>
        <LinkPicker
          items={taskItems}
          selected={linkedTaskIds}
          onChange={setLinkedTaskIds}
          placeholder="Search tasks…"
        />
      </div>

      {/* Notes */}
      <div className="risk-create-section">
        <div className="risk-create-section-title">Notes</div>
        <div className="detail-field">
          <textarea
            className="detail-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Context, escalation steps, related risks or actions…"
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
