import { useState } from 'react';
import { DepStatus, ExternalDependency, WorkItem } from '../../domain/types';
import { isOverdue } from '../../domain/externalDependency';

const ALL_STATUSES: DepStatus[] = ['OnTrack', 'AtRisk', 'Late', 'Received'];
const STATUS_LABELS: Record<DepStatus, string> = {
  OnTrack: 'On Track', AtRisk: 'At Risk', Late: 'Late', Received: 'Received',
};
const STATUS_CLASS: Record<DepStatus, string> = {
  OnTrack: 'dep-ontrack', AtRisk: 'dep-atrisk', Late: 'dep-late', Received: 'dep-received',
};

interface Props {
  dep: ExternalDependency;
  tasks: WorkItem[];
  today: string;
  onUpdate: (depId: string, patch: Partial<ExternalDependency>) => void;
  onRemove: (depId: string) => void;
}

export function ExternalDependencyInspector({ dep, tasks, today, onUpdate, onRemove }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const overdue = isOverdue(dep, today);

  const field = (label: string, content: React.ReactNode) => (
    <div className="detail-field">
      <div className="detail-label">{label}</div>
      {content}
    </div>
  );

  const toggleTask = (taskId: string) => {
    const next = dep.linkedTaskIds.includes(taskId)
      ? dep.linkedTaskIds.filter((id) => id !== taskId)
      : [...dep.linkedTaskIds, taskId];
    onUpdate(dep.id, { linkedTaskIds: next });
  };

  return (
    <div>
      {overdue ? (
        <div className="risk-approval-panel" style={{ background: 'var(--breach-soft)', borderColor: 'var(--breach-border)' }}>
          <div className="risk-approval-panel-title" style={{ color: 'var(--breach)' }}>
            ⚠ Overdue — past target date
          </div>
          <div className="risk-approval-panel-desc">
            This dependency is past its target date and has not been received. Review status.
          </div>
        </div>
      ) : null}

      <div className="inspector-body">
        <div className="detail-section">
          {field('Title',
            <input
              type="text"
              className="detail-input"
              defaultValue={dep.title}
              onBlur={(e) => onUpdate(dep.id, { title: e.target.value.trim() || dep.title })}
            />
          )}
          {field('Description',
            <textarea
              className="detail-textarea"
              defaultValue={dep.description}
              rows={3}
              onBlur={(e) => onUpdate(dep.id, { description: e.target.value })}
            />
          )}
          {field('External Owner',
            <input
              type="text"
              className="detail-input"
              defaultValue={dep.externalOwner}
              onBlur={(e) => onUpdate(dep.id, { externalOwner: e.target.value })}
            />
          )}
          {field('Internal Owner',
            <input
              type="text"
              className="detail-input"
              defaultValue={dep.internalOwner}
              onBlur={(e) => onUpdate(dep.id, { internalOwner: e.target.value })}
            />
          )}
          {field('Target Date',
            <input
              type="date"
              className="detail-input"
              defaultValue={dep.targetDate}
              onBlur={(e) => onUpdate(dep.id, { targetDate: e.target.value || dep.targetDate })}
            />
          )}
          {field('Status',
            <select
              className="detail-select"
              value={dep.status}
              onChange={(e) => onUpdate(dep.id, { status: e.target.value as DepStatus })}
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          )}
          <div style={{ marginTop: 4 }}>
            <span className={`badge ${STATUS_CLASS[dep.status]}`}>{STATUS_LABELS[dep.status]}</span>
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-label">Linked Tasks</div>
          <div className="ext-dep-task-picker" style={{ marginTop: 6 }}>
            {tasks.filter((t) => !t.isParent).map((t) => (
              <label key={t.id} className="ext-dep-task-option">
                <input
                  type="checkbox"
                  checked={dep.linkedTaskIds.includes(t.id)}
                  onChange={() => toggleTask(t.id)}
                />
                <span className="risk-grid-id">{t.id}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{t.title}</span>
              </label>
            ))}
          </div>
          {dep.linkedTaskIds.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-muted)' }}>
              {dep.linkedTaskIds.map((id) => taskMap.get(id)?.title ?? id).join(' · ')}
            </div>
          )}
        </div>

        <div className="detail-section">
          {field('Notes',
            <textarea
              className="detail-textarea"
              defaultValue={dep.notes}
              rows={4}
              onBlur={(e) => onUpdate(dep.id, { notes: e.target.value })}
            />
          )}
        </div>

        <div className="detail-section">
          <div className="detail-label" style={{ marginBottom: 4 }}>Metadata</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
            <div>Created: {new Date(dep.createdAt).toLocaleDateString()}</div>
            <div>Last reviewed: {new Date(dep.lastReviewedAt).toLocaleDateString()}</div>
            <div>ID: {dep.id}</div>
          </div>
        </div>

        <div className="detail-section">
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: 'var(--breach)' }}>Remove this dependency?</span>
              <button type="button" className="btn btn-sm" style={{ background: 'var(--breach)', color: '#fff', borderColor: 'var(--breach)' }} onClick={() => onRemove(dep.id)}>
                Remove
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-sm btn-ghost" style={{ color: 'var(--breach)' }} onClick={() => setConfirmDelete(true)}>
              Remove dependency
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
