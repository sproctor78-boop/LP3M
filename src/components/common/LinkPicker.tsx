import { useState, useRef, KeyboardEvent } from 'react';

export interface LinkPickerItem {
  id: string;
  label: string;
}

interface Props {
  items: LinkPickerItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}

export function LinkPicker({ items, selected, onChange, placeholder }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.toLowerCase();
  const matches = q
    ? items
        .filter(
          (item) =>
            !selected.includes(item.id) &&
            (item.id.toLowerCase().includes(q) || item.label.toLowerCase().includes(q)),
        )
        .slice(0, 6)
    : [];

  const addItem = (id: string) => {
    onChange([...selected, id]);
    setQuery('');
    setCursor(0);
    inputRef.current?.focus();
  };

  const removeItem = (id: string) => onChange(selected.filter((s) => s !== id));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter' && open && matches.length > 0) {
      e.preventDefault();
      const item = matches[cursor];
      if (item) addItem(item.id);
    } else if (e.key === 'Backspace' && query === '' && selected.length > 0) {
      onChange(selected.slice(0, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const selectedItems = selected
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is LinkPickerItem => i !== undefined);

  return (
    <div className="link-picker">
      <div className="link-picker-chips">
        {selectedItems.map((item) => (
          <span key={item.id} className="rip-chip">
            <span className="rip-chip-label">{item.id} — {item.label}</span>
            <button
              type="button"
              className="rip-chip-remove"
              onClick={() => removeItem(item.id)}
              aria-label={`Remove ${item.label}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="link-picker-input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setCursor(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? (placeholder ?? 'Type to search…') : ''}
          autoComplete="off"
        />
      </div>
      {open && matches.length > 0 && (
        <ul className="link-picker-dropdown" role="listbox">
          {matches.map((item, i) => (
            <li
              key={item.id}
              role="option"
              aria-selected={i === cursor}
              className={`link-picker-option${i === cursor ? ' active' : ''}`}
              onMouseDown={() => addItem(item.id)}
            >
              <span className="risk-grid-id">{item.id}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
