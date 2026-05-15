// =============================================================================
// useBarDrag — pointer drag for task bars
// =============================================================================
// Handles three modes:
//   • move        (whole bar)
//   • resize-left (start date)
//   • resize-right (end date)
//
// While dragging, the caller's `onPreview(start, end)` is invoked at most once
// per animation frame so the live forecast can be recomputed cheaply.
// On release, `onCommit(start, end, moved)` is called once with the final
// dates and a `moved` flag (false → treat as a click).
// =============================================================================

import { useCallback, useRef } from 'react';
import { addDays, diffDays } from '../../engine/dateUtils';

export type DragMode = 'move' | 'resize-left' | 'resize-right';

interface BarDragOptions {
  /** Pixels per day at the time of the drag. */
  dayWidth: number;
  /** Initial task start date (ISO). */
  startDate: string;
  /** Initial task end date (ISO). */
  endDate: string;
  /** True if the task is locked — drag is suppressed. */
  locked: boolean;
  /** Whether this bar is a milestone (resize disabled for milestones). */
  isMilestone: boolean;
  /** Called repeatedly during drag, at most once per animation frame. */
  onPreview: (newStartDate: string, newEndDate: string) => void;
  /** Called once on pointerup. */
  onCommit: (
    newStartDate: string,
    newEndDate: string,
    moved: boolean,
  ) => void;
  /** Called on pointercancel or other interruption. */
  onCancel: () => void;
}

/**
 * Returns an onPointerDown handler. The caller decides the drag mode from the
 * pointerdown event target (handle vs bar body).
 */
export function useBarDrag(options: BarDragOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  return useCallback((event: React.PointerEvent, modeOverride?: DragMode) => {
    const opts = optionsRef.current;
    if (opts.locked) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;

    const target = event.target as HTMLElement;
    let mode: DragMode = modeOverride ?? 'move';
    if (!modeOverride && target.classList.contains('bar-handle')) {
      mode = target.classList.contains('left') ? 'resize-left' : 'resize-right';
    }
    if (opts.isMilestone && mode !== 'move') return;

    const startClientX = event.clientX;
    const originalStart = opts.startDate;
    const originalEnd = opts.endDate;
    const dayWidth = opts.dayWidth;

    let lastStart = originalStart;
    let lastEnd = originalEnd;
    let rafPending = false;
    let moved = false;

    event.preventDefault();

    const computeDates = (clientX: number): { start: string; end: string; days: number } | null => {
      const dx = clientX - startClientX;
      const days = Math.round(dx / dayWidth);
      if (Math.abs(dx) > 3) moved = true;
      if (mode === 'move') {
        return { start: addDays(originalStart, days), end: addDays(originalEnd, days), days };
      }
      if (mode === 'resize-left') {
        const newStart = addDays(originalStart, days);
        if (diffDays(newStart, originalEnd) < 0) return null;
        return { start: newStart, end: originalEnd, days };
      }
      // resize-right
      const newEnd = addDays(originalEnd, days);
      if (diffDays(originalStart, newEnd) < 0) return null;
      return { start: originalStart, end: newEnd, days };
    };

    const onPointerMove = (ev: PointerEvent) => {
      const result = computeDates(ev.clientX);
      if (!result) return;
      lastStart = result.start;
      lastEnd = result.end;
      if (rafPending) return;
      rafPending = true;
      window.requestAnimationFrame(() => {
        rafPending = false;
        optionsRef.current.onPreview(lastStart, lastEnd);
      });
    };

    const cleanup = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerCancel);
    };

    const onPointerUp = (ev: PointerEvent) => {
      const result = computeDates(ev.clientX);
      const finalStart = result ? result.start : originalStart;
      const finalEnd = result ? result.end : originalEnd;
      cleanup();
      optionsRef.current.onCommit(finalStart, finalEnd, moved);
    };

    const onPointerCancel = () => {
      cleanup();
      optionsRef.current.onCancel();
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerCancel);
  }, []);
}
