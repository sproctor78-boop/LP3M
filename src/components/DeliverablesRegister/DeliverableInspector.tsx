import { useState } from 'react';
import { AcceptanceCriterion, Deliverable, DeliverableStatus, WorkItem } from '../../domain/types';
import { canBeAccepted, getCompletionPercentage, isOverdue } from '../../domain/deliverable';
import { AcceptanceCriteriaEditor } from './AcceptanceCriteriaEditor';

const STATUS_LABELS: Record<DeliverableStatus, string> = {
  Planned: 'Planned', InProduction: 'In Production', InReview: 'In Review',
  Accepted: 'Accepted', Rejected: 'Rejected',
};
const STATUS_CLASS: Record<DeliverableStatus, string> = {
  Planned: 'deliv-planned', InProduction: 'deliv-inprod', InReview: 'deliv-inreview',
  Accepted: 'deliv-accepted', Rejected: 'deliv-rejected',
};
const EDITABLE_STATUSES: DeliverableStatus[] = ['Planned', 'InProduction', 'InReview'];

interface Props {
  deliverable: Deliverable;
  tasks: WorkItem[];
  today: string;
  onUpdate: (deliverableId: string, patch: Partial<Deliverable>) => void;
  onSetStatus: (deliverableId: string, status: DeliverableStatus, acceptedBy?: string, rejectionReason?: string) => void;
  onRemove: (deliverableId: string) => void;
  onAddCriterion: (deliverableId: string, criterion: AcceptanceCriterion) => void;
  onUpdateCriterion: (deliverableId: string, criterionId: string, patch: Partial<AcceptanceCriterion>) => void;
  onRemoveCriterion: (deliverableId: string, criterionId: string) => void;
  onReorderCriteria: (deliverableId: string, orderedIds: string[]) => void;
  onMarkMet: (deliverableId: string, criterionId: string) => void;
  onMarkUnmet: (deliverableId: string, criterionId: string) => void;
}

export function DeliverableInspector({
  deliverable: d,
  tasks,
  today,
  onUpdate,
  onSetStatus,
  onRemove,
  onAddCriterion,
  onUpdateCriterion,
  onRemoveCriterion,
  onReorderCriteria,
  onMarkMet,
  onMarkUnmet,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState(false);

  const overdue = isOverdue(d, today);
  const pct = getCompletionPercentage(d);
  const canAccept = canBeAccepted(d);

  const toggleTask = (taskId: string) => {
    const next = d.linkedTaskIds.includes(taskId)
      ? d.linkedTaskIds.filter((id) => id !== taskId)
      : [...d.linkedTaskIds, taskId];
    onUpdate(d.id, { linkedTaskIds: next });
  };

  const handleAccept = () => {
    onSetStatus(d.id, 'Accepted', 'system');
    setConfirmAccept(false);
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) { setRejectionError(true); return; }
    onSetStatus(d.id, 'Rejected', undefined, rejectionReason.trim());
    setShowRejectForm(false);
    setRejectionReason('');
    setRejectionError(false);
  };

  const field = (label: string, content: React.ReactNode) => (
    <div className="detail-field">
      <div className="detail-label">{label}</div>
      {content}
    </div>
  );

  return (
    <div>
      {overdue ? (
        <div className="risk-approval-panel" style={{ background: 'var(--breach-soft)', borderColor: 'var(--breach-border)' }}>
          <div className="risk-approval-panel-title" style={{ color: 'var(--breach)' }}>
            ⚠ Overdue — past target date
          </div>
          <div className="risk-approval-panel-desc">
            This deliverable is past its target date and has not been accepted. Review status.
          </div>
        </div>
      ) : null}

      <div className="inspector-body">
        <div className="detail-section">
          {field('Title',
            <input
              type="text"
              className="detail-input"
              defaultValue={d.title}
              onBlur={(e) => onUpdate(d.id, { title: e.target.value.trim() || d.title })}
            />
          )}
          {field('Description',
            <textarea
              className="detail-textarea"
              defaultValue={d.description}
              rows={3}
              onBlur={(e) => onUpdate(d.id, { description: e.target.value })}
            />
          )}
          {field('Owner',
            <input
              type="text"
              className="detail-input"
              defaultValue={d.owner}
              onBlur={(e) => onUpdate(d.id, { owner: e.target.value })}
            />
          )}
          {field('Target Date',
            <input
              type="date"
              className="detail-input"
              defaultValue={d.targetDate}
              onBlur={(e) => onUpdate(d.id, { targetDate: e.target.value || d.targetDate })}
            />
          )}
        </div>

        {/* Status section */}
        <div className="detail-section">
          <div className="detail-label" style={{ marginBottom: 6 }}>Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className={`badge ${STATUS_CLASS[d.status]}`}>{STATUS_LABELS[d.status]}</span>
            <select
              className="detail-select"
              value={EDITABLE_STATUSES.includes(d.status) ? d.status : ''}
              onChange={(e) => {
                if (e.target.value) onSetStatus(d.id, e.target.value as DeliverableStatus);
              }}
              style={{ flex: 1 }}
              disabled={d.status === 'Accepted'}
            >
              {d.status === 'Accepted'
                ? <option value="">Accepted (final)</option>
                : EDITABLE_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))
              }
            </select>
          </div>

          {/* Rejection re-open */}
          {d.status === 'Rejected' ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--breach)', marginBottom: 4 }}>
                Rejection reason: {d.rejectionReason}
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onSetStatus(d.id, 'InProduction')}
              >
                Re-open (move to In Production)
              </button>
            </div>
          ) : null}

          {/* Accept flow */}
          {d.status !== 'Accepted' && d.status !== 'Rejected' ? (
            <div style={{ marginTop: 8 }}>
              {confirmAccept ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5 }}>Accept this deliverable?</span>
                  <button type="button" className="btn btn-sm btn-primary" onClick={handleAccept}>Confirm Accept</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmAccept(false)}>Cancel</button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={!canAccept}
                  title={canAccept ? 'Accept this deliverable' : 'All acceptance criteria must be met before accepting'}
                  onClick={() => setConfirmAccept(true)}
                >
                  Accept
                </button>
              )}
              {!canAccept && (
                <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 4 }}>
                  {d.acceptanceCriteria.length === 0
                    ? 'Add acceptance criteria before accepting'
                    : `${d.acceptanceCriteria.filter((c) => !c.met).length} criteria still unmet`}
                </div>
              )}
            </div>
          ) : null}

          {/* Reject flow */}
          {d.status !== 'Accepted' && d.status !== 'Rejected' ? (
            <div style={{ marginTop: 8 }}>
              {showRejectForm ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea
                    className={`detail-textarea${rejectionError ? ' input-error' : ''}`}
                    placeholder="Rejection reason (required)…"
                    value={rejectionReason}
                    onChange={(e) => { setRejectionReason(e.target.value); setRejectionError(false); }}
                    rows={2}
                    autoFocus
                  />
                  {rejectionError && <div className="input-error-msg">Rejection reason is required</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-sm" style={{ borderColor: 'var(--breach)', color: 'var(--breach)' }} onClick={handleReject}>Reject</button>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setShowRejectForm(false); setRejectionReason(''); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ color: 'var(--breach)' }}
                  onClick={() => setShowRejectForm(true)}
                >
                  Reject
                </button>
              )}
            </div>
          ) : null}

          {/* Acceptance metadata */}
          {d.status === 'Accepted' && d.acceptedAt ? (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-muted)' }}>
              Accepted {new Date(d.acceptedAt).toLocaleDateString()}
            </div>
          ) : null}
        </div>

        {/* Completion summary */}
        <div className="detail-section">
          <div className="detail-label" style={{ marginBottom: 6 }}>
            Acceptance Criteria — {pct}% complete
          </div>
          <div className="criteria-completion-bar" style={{ marginBottom: 10 }}>
            <div className="criteria-completion-fill" style={{ width: `${pct}%` }} />
          </div>
          <AcceptanceCriteriaEditor
            criteria={d.acceptanceCriteria}
            onAdd={(criterion) => onAddCriterion(d.id, criterion)}
            onUpdate={(criterionId, patch) => onUpdateCriterion(d.id, criterionId, patch)}
            onRemove={(criterionId) => onRemoveCriterion(d.id, criterionId)}
            onReorder={(orderedIds) => onReorderCriteria(d.id, orderedIds)}
            onMarkMet={(criterionId) => onMarkMet(d.id, criterionId)}
            onMarkUnmet={(criterionId) => onMarkUnmet(d.id, criterionId)}
          />
        </div>

        {/* Linked Tasks */}
        <div className="detail-section">
          <div className="detail-label">Linked Tasks</div>
          <div className="ext-dep-task-picker" style={{ marginTop: 6 }}>
            {tasks.filter((t) => !t.isParent).map((t) => (
              <label key={t.id} className="ext-dep-task-option">
                <input
                  type="checkbox"
                  checked={d.linkedTaskIds.includes(t.id)}
                  onChange={() => toggleTask(t.id)}
                />
                <span className="risk-grid-id">{t.id}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t.title}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="detail-section">
          {field('Notes',
            <textarea
              className="detail-textarea"
              defaultValue={d.notes}
              rows={4}
              onBlur={(e) => onUpdate(d.id, { notes: e.target.value })}
            />
          )}
        </div>

        {/* Metadata */}
        <div className="detail-section">
          <div className="detail-label" style={{ marginBottom: 4 }}>Metadata</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
            <div>Created: {new Date(d.createdAt).toLocaleDateString()}</div>
            <div>Last reviewed: {new Date(d.lastReviewedAt).toLocaleDateString()}</div>
            <div>ID: {d.id}</div>
          </div>
        </div>

        {/* Remove */}
        <div className="detail-section">
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: 'var(--breach)' }}>Remove this deliverable?</span>
              <button type="button" className="btn btn-sm" style={{ background: 'var(--breach)', color: '#fff', borderColor: 'var(--breach)' }} onClick={() => onRemove(d.id)}>
                Remove
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div>
          ) : (
            <button type="button" className="btn btn-sm btn-ghost" style={{ color: 'var(--breach)' }} onClick={() => setConfirmDelete(true)}>
              Remove deliverable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
