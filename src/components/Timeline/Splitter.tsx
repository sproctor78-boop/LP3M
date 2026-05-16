// =============================================================================
// Splitter
// =============================================================================
// A draggable vertical handle that resizes the task-list panel. The caller
// owns the width as state; the splitter just emits new widths during drag.
// =============================================================================

import { useCallback } from 'react';
import { MIN_GANTT_AREA_WIDTH, MIN_TASK_LIST_WIDTH } from '../../domain/constants';

interface Props {
  width: number;
  onWidthChange: (next: number) => void;
}

export function Splitter({ width, onWidthChange }: Props) {
  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = width;
      document.body.classList.add('splitter-dragging');

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const maxWidth = Math.max(
          MIN_TASK_LIST_WIDTH,
          window.innerWidth - MIN_GANTT_AREA_WIDTH,
        );
        const next = Math.max(
          MIN_TASK_LIST_WIDTH,
          Math.min(maxWidth, startWidth + dx),
        );
        onWidthChange(next);
      };
      const cleanup = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', cleanup);
        document.removeEventListener('pointercancel', cleanup);
        document.body.classList.remove('splitter-dragging');
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', cleanup);
      document.addEventListener('pointercancel', cleanup);
    },
    [width, onWidthChange],
  );

  return (
    <div
      className="splitter"
      onPointerDown={onPointerDown}
      title="Drag to resize the task list"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize task list"
    >
      <div className="splitter-handle" aria-hidden="true" />
    </div>
  );
}
