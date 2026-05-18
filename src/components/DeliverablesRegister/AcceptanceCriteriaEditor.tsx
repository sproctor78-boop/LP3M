import { useState, useRef } from 'react';
import { AcceptanceCriterion } from '../../domain/types';

interface Props {
  criteria: AcceptanceCriterion[];
  /** Create mode: called when criteria list changes locally (not yet persisted). */
  onChange?: (criteria: AcceptanceCriterion[]) => void;
  /** Inspector mode: individual action dispatchers. */
  onAdd?: (criterion: AcceptanceCriterion) => void;
  onUpdate?: (criterionId: string, patch: Partial<AcceptanceCriterion>) => void;
  onRemove?: (criterionId: string) => void;
  onReorder?: (orderedIds: string[]) => void;
  onMarkMet?: (criterionId: string) => void;
  onMarkUnmet?: (criterionId: string) => void;
}

function newId(): string {
  return `AC-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export function AcceptanceCriteriaEditor({
  criteria,
  onChange,
  onAdd,
  onUpdate,
  onRemove,
  onReorder,
  onMarkMet,
  onMarkUnmet,
}: Props) {
  const [addingText, setAddingText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  const metCount = criteria.filter((c) => c.met).length;
  const total = criteria.length;

  const handleAdd = () => {
    if (!addingText.trim()) return;
    const criterion: AcceptanceCriterion = {
      id: newId(),
      description: addingText.trim(),
      met: false,
      metAt: null,
      metBy: null,
    };
    if (onAdd) {
      onAdd(criterion);
    } else if (onChange) {
      onChange([...criteria, criterion]);
    }
    setAddingText('');
    setIsAdding(false);
  };

  const handleToggleMet = (c: AcceptanceCriterion) => {
    if (c.met) {
      if (onMarkUnmet) onMarkUnmet(c.id);
      else if (onChange) onChange(criteria.map((x) => x.id === c.id ? { ...x, met: false, metAt: null, metBy: null } : x));
    } else {
      if (onMarkMet) onMarkMet(c.id);
      else if (onChange) onChange(criteria.map((x) => x.id === c.id ? { ...x, met: true, metAt: new Date().toISOString(), metBy: 'system' } : x));
    }
  };

  const handleDescriptionBlur = (c: AcceptanceCriterion, newDesc: string) => {
    setEditingId(null);
    if (!newDesc.trim() || newDesc.trim() === c.description) return;
    if (onUpdate) onUpdate(c.id, { description: newDesc.trim() });
    else if (onChange) onChange(criteria.map((x) => x.id === c.id ? { ...x, description: newDesc.trim() } : x));
  };

  const handleRemove = (id: string) => {
    if (onRemove) onRemove(id);
    else if (onChange) onChange(criteria.filter((c) => c.id !== id));
    setConfirmDeleteId(null);
  };

  // HTML5 drag reorder
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverId.current = id;
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === targetId) return;
    const ids = criteria.map((c) => c.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...ids];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, draggedId);
    if (onReorder) onReorder(next);
    else if (onChange) {
      const map = new Map(criteria.map((c) => [c.id, c]));
      onChange(next.map((id) => map.get(id)!).filter(Boolean));
    }
    dragOverId.current = null;
  };

  return (
    <div className="criteria-editor">
      <div className="criteria-editor-header">
        <span className="criteria-completion-label">
          {total === 0 ? 'No criteria defined' : `${metCount} of ${total} met`}
        </span>
        {total > 0 && (
          <div className="criteria-completion-bar">
            <div
              className="criteria-completion-fill"
              style={{ width: `${Math.round((metCount / total) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {total === 0 && !isAdding ? (
        <div className="criteria-empty-state">
          <div className="criteria-empty-title">What does "done" look like for this deliverable?</div>
          <div className="criteria-empty-examples">
            <div>· Code reviewed by senior engineer</div>
            <div>· Security scan passes with zero criticals</div>
            <div>· Customer demo signed off in writing</div>
          </div>
        </div>
      ) : null}

      {criteria.map((c) => (
        <div
          key={c.id}
          className={`criterion-row${c.met ? ' met' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, c.id)}
          onDragOver={(e) => handleDragOver(e, c.id)}
          onDrop={(e) => handleDrop(e, c.id)}
        >
          <span className="criterion-drag-handle" title="Drag to reorder" aria-hidden="true">⠿</span>

          <input
            type="checkbox"
            className="criterion-checkbox"
            checked={c.met}
            onChange={() => handleToggleMet(c)}
            aria-label={c.met ? 'Mark criterion unmet' : 'Mark criterion met'}
          />

          <div className="criterion-body">
            {editingId === c.id ? (
              <input
                type="text"
                className="criterion-edit-input"
                value={editingText}
                autoFocus
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={() => handleDescriptionBlur(c, editingText)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDescriptionBlur(c, editingText);
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
            ) : (
              <span
                className="criterion-description"
                onClick={() => { setEditingId(c.id); setEditingText(c.description); }}
                title="Click to edit"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') { setEditingId(c.id); setEditingText(c.description); } }}
              >
                {c.description}
              </span>
            )}
            {c.met && c.metAt ? (
              <span className="criterion-meta">
                Met {new Date(c.metAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>

          <div className="criterion-actions">
            {confirmDeleteId === c.id ? (
              <>
                <span className="criterion-confirm-label">Delete?</span>
                <button type="button" className="btn btn-sm" style={{ color: 'var(--breach)', borderColor: 'var(--breach)' }} onClick={() => handleRemove(c.id)}>Yes</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmDeleteId(null)}>No</button>
              </>
            ) : (
              <button
                type="button"
                className="criterion-delete-btn"
                title="Delete criterion"
                onClick={() => setConfirmDeleteId(c.id)}
                aria-label="Delete criterion"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}

      {isAdding ? (
        <div className="criterion-add-row">
          <input
            type="text"
            className="detail-input"
            placeholder="Describe what must be true for acceptance…"
            value={addingText}
            autoFocus
            onChange={(e) => setAddingText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setIsAdding(false); setAddingText(''); }
            }}
          />
          <button type="button" className="btn btn-sm btn-primary" onClick={handleAdd}>Add</button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setIsAdding(false); setAddingText(''); }}>Cancel</button>
        </div>
      ) : (
        <button
          type="button"
          className="criterion-add-trigger"
          onClick={() => setIsAdding(true)}
        >
          + Add criterion
        </button>
      )}
    </div>
  );
}
