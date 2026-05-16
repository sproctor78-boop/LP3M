// =============================================================================
// Ripple shared constants
// =============================================================================

export interface ColorOption {
  name: string;
  /** CSS colour string, or null for "no colour". */
  value: string | null;
}

export const TASK_COLORS: ColorOption[] = [
  { name: 'None', value: null },
  { name: 'Sky', value: '#3aa6ff' },
  { name: 'Teal', value: '#16a8a8' },
  { name: 'Lime', value: '#7cb342' },
  { name: 'Amber', value: '#f4a721' },
  { name: 'Coral', value: '#e76f51' },
  { name: 'Pink', value: '#d63384' },
  { name: 'Violet', value: '#7c5cd6' },
];

/** Zoom range in pixels-per-day. */
export const MIN_ZOOM = 1.5;
export const MAX_ZOOM = 60;
export const DEFAULT_ZOOM = 36;

export const ZOOM_PRESETS: { key: string; pxPerDay: number; label: string; title: string }[] = [
  { key: 'D', pxPerDay: 36, label: 'D', title: 'Day view (36 px/day)' },
  { key: 'W', pxPerDay: 14, label: 'W', title: 'Week view (14 px/day)' },
  { key: 'M', pxPerDay: 5, label: 'M', title: 'Month view (5 px/day)' },
  { key: 'Q', pxPerDay: 2, label: 'Q', title: 'Quarter view (2 px/day)' },
];

/** Task-list panel width clamps. */
export const MIN_TASK_LIST_WIDTH = 240;
export const DEFAULT_TASK_LIST_WIDTH = 380;
/** The Gantt panel keeps at least this many pixels even at max splitter drag. */
export const MIN_GANTT_AREA_WIDTH = 300;
