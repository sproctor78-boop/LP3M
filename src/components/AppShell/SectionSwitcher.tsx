import { useEffect, useRef, useState } from 'react';
import { ViewMode } from '../../domain/types';

export interface SectionSwitcherOption {
  key: ViewMode;
  label: string;
}

interface Props {
  mode: ViewMode;
  options: SectionSwitcherOption[];
  onSelect: (mode: ViewMode) => void;
}

export function SectionSwitcher({ mode, options, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentIndex = options.findIndex((o) => o.key === mode);
  const currentLabel = options[currentIndex]?.label ?? 'Select view';

  useEffect(() => {
    if (!open) return;
    setCursor(currentIndex >= 0 ? currentIndex : 0);
  }, [open, currentIndex]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const picked = options[cursor];
      if (picked) {
        onSelect(picked.key);
        setOpen(false);
      }
    }
  };

  return (
    <div className="section-switcher" ref={containerRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className="section-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{currentLabel}</span>
        <svg
          className="chevron"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M3 4.5 L6 7.5 L9 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul className="section-switcher-dropdown" role="listbox">
          {options.map((opt, i) => (
            <li
              key={opt.key}
              role="option"
              aria-selected={opt.key === mode}
              className={`section-switcher-option${opt.key === mode ? ' current' : ''}${i === cursor ? ' active-cursor' : ''}`}
              onMouseEnter={() => setCursor(i)}
              onMouseDown={() => {
                onSelect(opt.key);
                setOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
