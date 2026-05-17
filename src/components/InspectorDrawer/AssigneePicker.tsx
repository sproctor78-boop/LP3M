// =============================================================================
// AssigneePicker — assign/unassign people to a task
// =============================================================================
// People whose source is 'ad' are flagged as synced from Active Directory.
// Local people can be added inline. This component is intentionally
// self-contained so it can be dropped into any future people-management surface.
// =============================================================================

import { useState } from 'react';
import { Person } from '../../domain/types';

interface Props {
  assigneeIds: string[];
  people: Person[];
  onAdd: (personId: string) => void;
  onRemove: (personId: string) => void;
  onCreatePerson: (person: Person) => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function AssigneePicker({ assigneeIds, people, onAdd, onRemove, onCreatePerson }: Props) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const assigned = assigneeIds
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is Person => !!p);

  const unassigned = people.filter((p) => !assigneeIds.includes(p.id));

  const commitNew = () => {
    const name = newName.trim();
    if (!name) return;
    const person: Person = {
      id: `person_${Date.now().toString(36)}`,
      displayName: name,
      email: newEmail.trim() || undefined,
      source: 'local',
    };
    onCreatePerson(person);
    onAdd(person.id);
    setNewName('');
    setNewEmail('');
    setAdding(false);
  };

  return (
    <div className="assignee-picker">
      {assigned.length > 0 ? (
        <div className="assignee-chips">
          {assigned.map((p) => (
            <span key={p.id} className="assignee-chip" title={p.email ?? p.displayName}>
              <span className="assignee-avatar">{initials(p.displayName)}</span>
              <span className="assignee-name">{p.displayName}</span>
              {p.source === 'ad' ? <span className="assignee-ad-badge" title="Active Directory">AD</span> : null}
              <button
                type="button"
                className="assignee-remove"
                aria-label={`Remove ${p.displayName}`}
                onClick={() => onRemove(p.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="assignee-empty">No assignees</div>
      )}

      {unassigned.length > 0 ? (
        <select
          className="assignee-add-select"
          value=""
          onChange={(e) => {
            if (e.target.value) onAdd(e.target.value);
          }}
        >
          <option value="">+ Add assignee…</option>
          {unassigned.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}{p.source === 'ad' ? ' (AD)' : ''}
            </option>
          ))}
        </select>
      ) : null}

      {adding ? (
        <div className="assignee-new-form">
          <input
            type="text"
            placeholder="Full name"
            value={newName}
            autoFocus
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitNew();
              if (e.key === 'Escape') { setAdding(false); setNewName(''); setNewEmail(''); }
            }}
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitNew();
              if (e.key === 'Escape') { setAdding(false); setNewName(''); setNewEmail(''); }
            }}
          />
          <div className="assignee-new-actions">
            <button type="button" className="btn-primary-sm" onClick={commitNew}>Add</button>
            <button type="button" className="btn-cancel" onClick={() => { setAdding(false); setNewName(''); setNewEmail(''); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="assignee-new-person-btn"
          onClick={() => setAdding(true)}
        >
          + New person
        </button>
      )}
    </div>
  );
}
