import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { WorkItem } from '../../domain/types';
import { AppAction } from '../../state/appState';
import { parsePaletteInput, PalettePrefix } from './parsePaletteInput';

interface Props {
  tasks: WorkItem[];
  onClose: () => void;
  dispatch: (action: AppAction) => void;
  onOpenCreateForm: (kind: PalettePrefix & ('task' | 'risk' | 'dep' | 'del'), title: string, linkedTaskIds: string[]) => void;
}

export function CommandPalette({ tasks, onClose, dispatch, onOpenCreateForm }: Props) {
  const [input, setInput] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    inputRef.current?.focus();
    return () => {
      const prev = previousFocusRef.current;
      if (prev && 'focus' in prev) (prev as HTMLElement).focus();
    };
  }, []);

  const parsed = parsePaletteInput(input, tasks);

  useEffect(() => {
    setCursor(0);
  }, [input]);

  const handleCommit = (item?: WorkItem) => {
    if (parsed.prefix) {
      // Open create form pre-filled
      onOpenCreateForm(parsed.prefix as 'task' | 'risk' | 'dep' | 'del', parsed.title, parsed.linkedTaskIds);
      onClose();
      return;
    }
    // Search mode — jump to task
    const target = item ?? parsed.searchResults[cursor];
    if (target) {
      dispatch({ type: 'selectTask', taskId: target.id, openDrawer: false });
      dispatch({ type: 'setScrollToTask', taskId: target.id });
    }
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
      return;
    }
    if (!parsed.prefix && parsed.searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, parsed.searchResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
        background: 'rgba(11, 18, 32, 0.35)',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rip-popover"
        style={{
          width: 480,
          maxWidth: 'calc(100vw - 32px)',
          padding: 0,
          overflow: 'hidden',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="task: title  ·  risk: title  ·  dep: title  ·  del: title  ·  or search…"
          style={{
            width: '100%',
            padding: '12px 16px',
            border: 'none',
            borderBottom: '0.5px solid var(--border)',
            background: 'transparent',
            fontSize: 14,
            color: 'var(--ink)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Hint line */}
        <div
          style={{
            padding: '6px 16px',
            fontSize: 11,
            color: 'var(--ink-muted)',
            borderBottom: parsed.searchResults.length > 0 ? '0.5px solid var(--border)' : 'none',
            minHeight: 28,
          }}
        >
          {parsed.hint}
          {parsed.linkedTaskIds.length > 0 && (
            <span style={{ marginLeft: 6 }}>
              {parsed.linkedTaskIds.map((id) => (
                <span
                  key={id}
                  style={{
                    display: 'inline-block',
                    marginRight: 4,
                    padding: '1px 6px',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent)',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                >
                  {id}
                </span>
              ))}
            </span>
          )}
        </div>

        {/* Search results */}
        {!parsed.prefix && parsed.searchResults.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}>
            {parsed.searchResults.map((task, i) => (
              <li
                key={task.id}
                style={{
                  padding: '7px 16px',
                  cursor: 'pointer',
                  background: i === cursor ? 'var(--surface-3)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
                onMouseEnter={() => setCursor(i)}
                onMouseDown={() => handleCommit(task)}
              >
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-muted)', minWidth: 40 }}>
                  {task.id}
                </span>
                <span style={{ fontSize: 13, color: 'var(--ink)' }}>{task.title}</span>
                {task.isMilestone && (
                  <span style={{ fontSize: 10, color: '#7c3aed', marginLeft: 'auto' }}>milestone</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
