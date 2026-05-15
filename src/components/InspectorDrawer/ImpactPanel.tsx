import { ForecastResult, WorkItem } from '../../domain/types';
import { buildImpactRows, ImpactRowKind } from '../../engine/impactEngine';
import { diffDays } from '../../engine/dateUtils';

interface Props {
  forecastResult: ForecastResult;
  tasks: WorkItem[];
  onApply: () => void;
  onCancel: () => void;
}

const ICONS: Record<ImpactRowKind, JSX.Element> = {
  chain: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 10l4-4M5 9a2 2 0 002.83 0L9 7.83a2 2 0 10-2.83-2.83M11 7a2 2 0 00-2.83 0L7 8.17a2 2 0 102.83 2.83" />
    </svg>
  ),
  breach: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 3v5M8 11v.5" />
      <circle cx="8" cy="8" r="6.5" />
    </svg>
  ),
  risk: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2.5L14.5 13.5h-13L8 2.5z" />
      <path d="M8 7v3M8 12v.5" />
    </svg>
  ),
  cp: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 8h12M5 4l-3 4 3 4M11 4l3 4-3 4" />
    </svg>
  ),
  finish: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 13V3M3 4h8l-1.5 2L11 8H3" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  ),
};

export function ImpactPanel({ forecastResult, tasks, onApply, onCancel }: Props) {
  const rows = buildImpactRows(forecastResult, tasks);
  const changedTask = tasks.find((t) => t.id === forecastResult.changedTaskId);
  const shift = diffDays(forecastResult.oldEndDate, forecastResult.newEndDate);
  const shiftWord = shift > 0 ? 'later' : 'earlier';
  const shiftDays = Math.abs(shift);

  const summary = changedTask
    ? shiftDays === 0
      ? `${changedTask.title} updated.`
      : `${changedTask.title} moved ${shiftDays} day${shiftDays === 1 ? '' : 's'} ${shiftWord}.`
    : '';

  return (
    <>
      <div className="impact">
        <div className="impact-header">
          <div className="impact-title">Schedule impact</div>
          <div className="impact-kicker">
            {forecastResult.impactCategories.length} impact
            {forecastResult.impactCategories.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="impact-summary">{summary}</div>
        {rows.map((row, i) => (
          <div key={i} className={`impact-row ${row.severity}`}>
            <span className="impact-icon">{ICONS[row.kind]}</span>
            <span className="impact-text">{row.text}</span>
          </div>
        ))}
        <div className="impact-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-apply" onClick={onApply}>
            Apply forecast
          </button>
        </div>
      </div>
      <div
        style={{
          padding: '0 20px 20px',
          fontSize: 11.5,
          color: 'var(--ink-muted)',
          lineHeight: 1.5,
        }}
      >
        Applying commits all dependent re-scheduling. Locked tasks remain fixed and will retain
        any conflict shown above until reconciled.
      </div>
    </>
  );
}
