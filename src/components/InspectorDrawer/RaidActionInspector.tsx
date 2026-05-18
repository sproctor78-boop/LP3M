import { useState } from 'react';
import { ImpactBand, RaidAction, Risk } from '../../domain/types';

interface Props {
  action: RaidAction;
  risk: Risk | null;
  onUpdateAction: (actionId: string, patch: Partial<RaidAction>) => void;
  onDeleteAction: (actionId: string) => void;
  onCompleteAction: (actionId: string, effectiveness: ImpactBand) => void;
}

const EFFECTIVENESS_LABELS: Record<number, string> = {
  1: '1 — Negligible',
  2: '2 — Minor',
  3: '3 — Moderate',
  4: '4 — Significant',
  5: '5 — Major',
};

const STATUS_OPTIONS = ['Todo', 'InProgress', 'Done', 'Overdue'] as const;

export function RaidActionInspector({
  action,
  risk,
  onUpdateAction,
  onDeleteAction,
  onCompleteAction,
}: Props) {
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [effectiveness, setEffectiveness] = useState<ImpactBand>(3);

  const handleComplete = () => {
    onCompleteAction(action.id, effectiveness);
    setShowCompleteForm(false);
  };

  return (
    <div className="risk-inspector">
      {/* Risk breadcrumb */}
      {risk ? (
        <div className="action-risk-breadcrumb">
          <span className="action-risk-id">{risk.id}</span>
          <span className="action-risk-title">{risk.title}</span>
        </div>
      ) : null}

      {/* Mark-complete flow */}
      {action.status !== 'Done' ? (
        <div className="approval-banner">
          {showCompleteForm ? (
            <>
              <div className="approval-label">Rate mitigation effectiveness</div>
              <select
                className="risk-register-filter-select"
                value={effectiveness}
                onChange={(e) => setEffectiveness(Number(e.target.value) as ImpactBand)}
                aria-label="Effectiveness rating"
              >
                {([1, 2, 3, 4, 5] as ImpactBand[]).map((v) => (
                  <option key={v} value={v}>{EFFECTIVENESS_LABELS[v]}</option>
                ))}
              </select>
              <div className="approval-actions">
                <button type="button" className="btn btn-primary" onClick={handleComplete}>
                  Confirm complete
                </button>
                <button type="button" className="btn" onClick={() => setShowCompleteForm(false)}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCompleteForm(true)}
            >
              Mark complete
            </button>
          )}
        </div>
      ) : (
        action.completedAt ? (
          <div className="action-completed-note">
            Completed {new Date(action.completedAt).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
            {action.completionEffectiveness ? (
              <span> · Effectiveness {action.completionEffectiveness}/5</span>
            ) : null}
          </div>
        ) : null
      )}

      {/* Fields */}
      <div className="inspector-field">
        <label className="inspector-label">Title</label>
        <input
          className="inspector-input"
          value={action.title}
          onChange={(e) => onUpdateAction(action.id, { title: e.target.value })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Owner</label>
        <input
          className="inspector-input"
          value={action.owner}
          onChange={(e) => onUpdateAction(action.id, { owner: e.target.value })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Due date</label>
        <input
          type="date"
          className="inspector-input"
          value={action.dueDate}
          onChange={(e) => onUpdateAction(action.id, { dueDate: e.target.value })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Status</label>
        <select
          className="inspector-input"
          value={action.status}
          onChange={(e) => onUpdateAction(action.id, { status: e.target.value as RaidAction['status'] })}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === 'InProgress' ? 'In Progress' : s}</option>
          ))}
        </select>
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Response type</label>
        <span className="inspector-value">{action.responseItemType === 'control' ? 'Control' : 'Mitigation'}</span>
      </div>

      {/* Danger zone */}
      <div className="inspector-danger">
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            if (window.confirm(`Delete action "${action.title}"?`)) {
              onDeleteAction(action.id);
            }
          }}
        >
          Delete action
        </button>
      </div>
    </div>
  );
}
