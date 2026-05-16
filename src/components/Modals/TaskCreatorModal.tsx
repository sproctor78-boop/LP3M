import { useEffect, useRef, useState } from 'react';
import { AppDomainState, WorkItem } from '../../domain/types';
import { ColorSwatches } from '../InspectorDrawer/ColorSwatches';
import { addDays } from '../../engine/dateUtils';

interface Props {
  domain: AppDomainState;
  /** If non-null, the modal opens preset for adding a subtask under this parent. */
  parentPreset: string | null;
  onCancel: () => void;
  onCreate: (task: WorkItem) => void;
}

function generateTaskId(tasks: WorkItem[], parentId: string | null): string {
  if (parentId) {
    const siblings = tasks.filter((t) => t.parentId === parentId);
    const suffixes = siblings.map((t) => t.id.slice(parentId.length));
    for (let i = 0; i < 26; i += 1) {
      const letter = String.fromCharCode(97 + i);
      if (!suffixes.includes(letter)) return parentId + letter;
    }
    return parentId + Date.now().toString(36);
  }
  const nums = tasks
    .filter((t) => !t.parentId && /^T\d+$/.test(t.id))
    .map((t) => parseInt(t.id.slice(1), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `T${String(next).padStart(2, '0')}`;
}

export function TaskCreatorModal({ domain, parentPreset, onCancel, onCreate }: Props) {
  const [title, setTitle] = useState('');
  const [swimlane, setSwimlane] = useState(() => {
    if (parentPreset) {
      const parent = domain.tasks.find((t) => t.id === parentPreset);
      return parent?.swimlane ?? domain.swimlanes[0]?.key ?? '';
    }
    return domain.swimlanes[0]?.key ?? '';
  });
  const [duration, setDuration] = useState(5);
  const [parentId, setParentId] = useState<string>(parentPreset ?? '');
  const [color, setColor] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 30);
  }, []);

  // ESC to close, but only when our inputs are not consuming keys (covered by parent App)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      titleRef.current?.focus();
      return;
    }
    const dur = Math.max(1, duration);
    const id = generateTaskId(domain.tasks, parentId || null);

    // Place after the latest task in the chosen swimlane (rough heuristic)
    let startGuess = '2026-04-13';
    if (parentId) {
      const parent = domain.tasks.find((t) => t.id === parentId);
      if (parent) {
        const siblings = domain.tasks.filter((t) => t.parentId === parentId);
        if (siblings.length) {
          const lastEnd = siblings.reduce((m, s) => (s.endDate > m ? s.endDate : m), parent.startDate);
          startGuess = addDays(lastEnd, 1);
        } else {
          startGuess = parent.startDate;
        }
      }
    } else {
      const sameSwim = domain.tasks.filter((t) => t.swimlane === swimlane && !t.isParent);
      if (sameSwim.length) {
        const latest = sameSwim.reduce((m, t) => (t.endDate > m ? t.endDate : m), '0000-00-00');
        startGuess = addDays(latest, 1);
      }
    }
    const endGuess = addDays(startGuess, dur - 1);

    const newTask: WorkItem = {
      id,
      title: trimmed,
      status: domain.columns[0]?.key ?? 'backlog',
      startDate: startGuess,
      endDate: endGuess,
      durationDays: dur,
      isMilestone: false,
      locked: false,
      swimlane,
      percentComplete: 0,
      parentId: parentId || null,
      isParent: false,
      dependencies: [],
      constraint: null,
      color: color ?? null,
    };

    onCreate(newTask);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="modal" role="dialog" aria-labelledby="task-modal-title">
        <div className="modal-header">
          <div className="modal-title" id="task-modal-title">
            {parentPreset ? 'New subtask' : 'New task'}
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
            <label htmlFor="tm-title">Title</label>
            <input
              id="tm-title"
              ref={titleRef}
              type="text"
              placeholder="e.g. Site survey"
              maxLength={80}
              autoComplete="off"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
            />
          </div>
          <div className="modal-grid">
            <div className="modal-field">
              <label htmlFor="tm-swimlane">Swimlane</label>
              <select
                id="tm-swimlane"
                value={swimlane}
                onChange={(event) => setSwimlane(event.target.value)}
              >
                {domain.swimlanes.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-field">
              <label htmlFor="tm-duration">Duration (days)</label>
              <input
                id="tm-duration"
                type="number"
                min={1}
                max={180}
                step={1}
                value={duration}
                onChange={(event) => setDuration(Math.max(1, parseInt(event.target.value, 10) || 1))}
              />
            </div>
          </div>
          <div className="modal-field">
            <label htmlFor="tm-parent">Parent (optional — creates a subtask)</label>
            <select
              id="tm-parent"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">— None (top-level task) —</option>
              {domain.tasks
                .filter((t) => t.isParent)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.title}
                  </option>
                ))}
            </select>
          </div>
          <div className="modal-field">
            <label>Colour tag</label>
            <ColorSwatches current={color} onPick={setColor} />
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-apply" onClick={submit}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
