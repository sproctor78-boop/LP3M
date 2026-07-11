// =============================================================================
// SectionTileIcons — abstract 16x16 icon set for the section tile bar.
// Matches the ripple identity family (see RippleMark.tsx): circles, arcs,
// no literal glyphs (no board/gantt/warning pictograms).
// =============================================================================

const ICON_PROPS = {
  viewBox: '0 0 16 16',
  width: 16,
  height: 16,
  stroke: 'currentColor',
  strokeWidth: 1.5,
  'aria-hidden': true,
} as const;

export function IconTimeline() {
  return (
    <svg {...ICON_PROPS} fill="none">
      <path d="M1 8 Q 3.5 4, 6 8 T 11 8 T 15 8" fill="none" />
    </svg>
  );
}

export function IconBoard() {
  return (
    <svg {...ICON_PROPS} fill="none">
      <circle cx="5" cy="5" r="1.5" fill="currentColor" />
      <circle cx="11" cy="5" r="1.5" fill="currentColor" />
      <circle cx="5" cy="11" r="1.5" fill="currentColor" />
      <circle cx="11" cy="11" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconRiskRegister() {
  return (
    <svg {...ICON_PROPS} fill="none">
      <circle cx="8" cy="8" r="6" fill="none" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  );
}

export function IconRaidBoard() {
  return (
    <svg {...ICON_PROPS} fill="none">
      <circle cx="8" cy="2.5" r="1.5" fill="currentColor" />
      <circle cx="13.5" cy="8" r="1.5" fill="currentColor" />
      <circle cx="8" cy="13.5" r="1.5" fill="currentColor" />
      <circle cx="2.5" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconExtDeps() {
  return (
    <svg {...ICON_PROPS} fill="none">
      <circle cx="3" cy="11" r="2" fill="none" />
      <circle cx="13" cy="5" r="2" fill="none" />
      <path d="M4.5 9.5 Q 8 4, 11.5 6.5" fill="none" />
    </svg>
  );
}

export function IconDeliverables() {
  return (
    <svg {...ICON_PROPS} fill="none">
      <path d="M8 2 L 14 8 L 8 14 L 2 8 Z" fill="currentColor" />
    </svg>
  );
}
