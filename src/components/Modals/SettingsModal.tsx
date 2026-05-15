import { useEffect, useState } from 'react';
import { WorkingCalendar } from '../../domain/types';

interface Props {
  calendar: WorkingCalendar;
  onCancel: () => void;
  onSave: (highlightWeekends: boolean, holidays: string[]) => void;
}

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function SettingsModal({ calendar, onCancel, onSave }: Props) {
  const [highlightWeekends, setHighlightWeekends] = useState(calendar.highlightWeekends);
  const [holidaysText, setHolidaysText] = useState(calendar.holidays.join('\n'));

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const save = () => {
    const holidays = holidaysText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => ISO_PATTERN.test(line));
    onSave(highlightWeekends, holidays);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="modal" role="dialog" aria-labelledby="settings-modal-title">
        <div className="modal-header">
          <div className="modal-title" id="settings-modal-title">
            Settings
          </div>
          <button
            type="button"
            className="modal-close"
            aria-label="Close"
            title="Close (Esc)"
            onClick={onCancel}
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 2 L12 12 M12 2 L2 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-field">
            <label>Working calendar</label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={highlightWeekends}
                onChange={(event) => setHighlightWeekends(event.target.checked)}
              />
              <span>Highlight weekends on the timeline</span>
            </label>
            <div className="detail-value" style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 6 }}>
              Scaffold: weekends shade visually now. Skipping weekends in duration / date math is
              planned for a future release.
            </div>
          </div>
          <div className="modal-field">
            <label htmlFor="sm-holidays">
              Holidays / non-working days (one per line, YYYY-MM-DD)
            </label>
            <textarea
              id="sm-holidays"
              rows={5}
              placeholder={'2026-05-04\n2026-05-25'}
              value={holidaysText}
              onChange={(event) => setHolidaysText(event.target.value)}
            />
            <div className="detail-value" style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 4 }}>
              Currently displays as a visual stripe. Date arithmetic will skip these in a future
              version.
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-apply" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
