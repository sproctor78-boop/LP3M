// =============================================================================
// useDepHandleDrag — drag from a dep handle to create a new dependency
// =============================================================================
// On pointerdown: starts a drawing-line preview and signals the App to set
// `drawingDep` so all bars highlight valid drop targets.
// On pointermove: updates the SVG path; checks the element under the cursor
// for a valid target.
// On pointerup over a bar: calls `onCreate(fromId, toId, type)`. Type is
// finish-to-start for the right handle, start-to-start for the left.
// =============================================================================

import { useCallback, useRef } from 'react';

export type DepHandleSide = 'left' | 'right';

export interface DrawingState {
  fromId: string;
  fromSide: DepHandleSide;
  startX: number;
  startY: number;
  cursorX: number;
  cursorY: number;
  /** True if the current target would create a cycle. */
  invalid: boolean;
}

interface Options {
  fromId: string;
  /** Called whenever the drawing line should redraw. */
  onUpdate: (drawing: DrawingState | null) => void;
  /** Called on pointerup over a valid bar. */
  onCreate: (fromId: string, toId: string, side: DepHandleSide) => void;
  /** Reports current candidate target, with cycle check. Returns true if invalid. */
  isInvalidTarget: (fromId: string, toId: string) => boolean;
}

export function useDepHandleDrag(options: Options) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  return useCallback(
    (event: React.PointerEvent, side: DepHandleSide) => {
      event.stopPropagation();
      event.preventDefault();
      const opts = optionsRef.current;

      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;

      let drawing: DrawingState = {
        fromId: opts.fromId,
        fromSide: side,
        startX,
        startY,
        cursorX: startX,
        cursorY: startY,
        invalid: false,
      };

      opts.onUpdate(drawing);

      const findTargetBar = (clientX: number, clientY: number): HTMLElement | null => {
        const el = document.elementFromPoint(clientX, clientY);
        if (!el) return null;
        const bar = (el as HTMLElement).closest('.task-bar:not(.ghost)') as HTMLElement | null;
        if (!bar) return null;
        if (!bar.dataset.taskId) return null;
        if (bar.dataset.taskId === opts.fromId) return null;
        return bar;
      };

      const clearDecorations = () => {
        document.body.classList.remove('drawing-dep');
        document.querySelectorAll('.task-bar.dep-source').forEach((b) => {
          b.classList.remove('dep-source');
        });
        document.querySelectorAll('.task-bar.dep-target').forEach((b) => {
          b.classList.remove('dep-target', 'invalid');
        });
      };

      document.body.classList.add('drawing-dep');
      const sourceBar = document.querySelector(
        `.task-bar[data-task-id="${CSS.escape(opts.fromId)}"]:not(.ghost)`,
      );
      sourceBar?.classList.add('dep-source');

      const onPointerMove = (ev: PointerEvent) => {
        drawing = { ...drawing, cursorX: ev.clientX, cursorY: ev.clientY };
        document.querySelectorAll('.task-bar.dep-target').forEach((b) => {
          b.classList.remove('dep-target', 'invalid');
        });
        const target = findTargetBar(ev.clientX, ev.clientY);
        if (target) {
          const toId = target.dataset.taskId!;
          const invalid = optionsRef.current.isInvalidTarget(drawing.fromId, toId);
          target.classList.add('dep-target');
          if (invalid) target.classList.add('invalid');
          drawing = { ...drawing, invalid };
        } else {
          drawing = { ...drawing, invalid: false };
        }
        optionsRef.current.onUpdate(drawing);
      };

      const finish = (commit: boolean, ev?: PointerEvent) => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerCancel);
        window.removeEventListener('blur', onBlur);
        clearDecorations();
        optionsRef.current.onUpdate(null);

        if (commit && ev) {
          const target = findTargetBar(ev.clientX, ev.clientY);
          if (target && !drawing.invalid) {
            const toId = target.dataset.taskId!;
            if (!optionsRef.current.isInvalidTarget(drawing.fromId, toId)) {
              optionsRef.current.onCreate(drawing.fromId, toId, drawing.fromSide);
            }
          }
        }
      };

      const onPointerUp = (ev: PointerEvent) => finish(true, ev);
      const onPointerCancel = () => finish(false);
      const onBlur = () => finish(false);

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerCancel);
      window.addEventListener('blur', onBlur);
    },
    [],
  );
}
