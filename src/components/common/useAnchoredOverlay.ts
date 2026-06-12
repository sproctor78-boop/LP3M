// =============================================================================
// useAnchoredOverlay — shared position logic for hovercards and popovers.
// Returns a computed viewport-relative {top, left} given an anchor DOMRect.
// Both HoverCard and PopoverEdit use this hook to flip above/below viewport.
// =============================================================================

import { useCallback, useRef, useState } from 'react';

export interface OverlayPosition {
  top: number;
  left: number;
}

/** Computes a fixed position for an overlay anchored below/above a rect. */
export function computeOverlayPosition(
  anchor: DOMRect,
  overlayHeight: number,
  overlayWidth: number,
): OverlayPosition {
  const spaceBelow = window.innerHeight - anchor.bottom;
  const spaceAbove = anchor.top;
  const top =
    spaceBelow >= overlayHeight || spaceBelow >= spaceAbove
      ? anchor.bottom + 4
      : anchor.top - overlayHeight - 4;
  const rawLeft = anchor.left;
  const left = Math.max(8, Math.min(rawLeft, window.innerWidth - overlayWidth - 8));
  return { top, left };
}

interface Options {
  /** Delay in ms before opening (for hovercards). Default 0. */
  openDelay?: number;
}

export interface AnchoredOverlayState<T> {
  payload: T | null;
  anchorRect: DOMRect | null;
  isOpen: boolean;
  open: (payload: T, rect: DOMRect) => void;
  close: () => void;
}

/**
 * Manages open/close state for a single anchored overlay. Supports an
 * optional open delay for hovercard-style delayed reveal.
 */
export function useAnchoredOverlay<T>(options?: Options): AnchoredOverlayState<T> {
  const [state, setState] = useState<{ payload: T; anchorRect: DOMRect } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delay = options?.openDelay ?? 0;

  const open = useCallback(
    (payload: T, rect: DOMRect) => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
      if (delay > 0) {
        timerRef.current = setTimeout(() => {
          setState({ payload, anchorRect: rect });
        }, delay);
      } else {
        setState({ payload, anchorRect: rect });
      }
    },
    [delay],
  );

  const close = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setState(null);
  }, []);

  return {
    payload: state?.payload ?? null,
    anchorRect: state?.anchorRect ?? null,
    isOpen: state !== null,
    open,
    close,
  };
}
