import { useEffect, useState } from 'react';

type Listener = (message: string | null) => void;

let listeners: Listener[] = [];
let activeTimer: number | null = null;

/** Show a transient hint at the bottom of the screen. */
export function showHint(message: string, durationMs: number = 1800): void {
  listeners.forEach((listener) => listener(message));
  if (activeTimer !== null) {
    window.clearTimeout(activeTimer);
  }
  activeTimer = window.setTimeout(() => {
    listeners.forEach((listener) => listener(null));
    activeTimer = null;
  }, durationMs);
}

function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function Hint() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => subscribe(setMessage), []);

  return (
    <div className={`hint ${message ? 'show' : ''}`} role="status" aria-live="polite">
      {message ?? ''}
    </div>
  );
}
