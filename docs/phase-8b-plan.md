# Phase 8b Implementation Plan — Deliverables Register

**Branch:** `claude/phase-8b-deliverables`
**Anchored on:** IRM (primary), PMI/PMBOK (fallback)
**Persistence version:** v7 → v8

---

## 0. Pre-confirmed decisions

| Question | Answer |
|---|---|
| Timeline band order | tasks → Deliverables → External Dependencies → RAID Actions |
| AC reordering | Drag-and-drop, HTML5 Board pattern (not useBarDrag) |
| Nav count badge | Yes — "Deliverables (N ready)" in AppShell view-switch button |

---

## 1. Discovery findings

### MilestoneBar reuse assessment

`MilestoneBar.tsx` renders a diamond SVG: `polygon points="14,3 25,14 14,25 3,14"` centred in a 28×28 viewBox.
It is tightly coupled to `WorkItem` (takes a `task` prop) and applies `var(--accent)` / `var(--breach)` / `var(--locked)` fills.

**Decision: Build fresh diamond rendering in `DeliverablesOverlay.tsx`, lifting the same SVG polygon geometry.**
Reason: the overlay needs 5 status colours, a vertical stagger, click-to-navigate behaviour, and tooltip content — none of which MilestoneBar supports. Duplicating the polygon points is 1 line; building an adapter around MilestoneBar would be larger and couple the overlay to the task domain.

### Band stacking reorder

Current Timeline.tsx stacks: tasks → RAID → ExtDep.
New spec order: tasks → Deliverables → ExtDep → RAID.
This means **RAID moves to the bottom** and the `top` offsets for all three bands change. The change is localised to the `gridTotalHeight` calculation and the three `style.top` expressions in Timeline.tsx.

### Drag pattern for AcceptanceCriteriaEditor

`useBarDrag.ts` is pointer-drag for date manipulation — wrong tool.
The Board uses native HTML5 `draggable` + `dataTransfer` (onDragStart / onDragOver / onDrop). I will use the same pattern for criterion row reordering: drag-handle icon on each row, `dataTransfer.setData('text/plain', criterion.id)`, `onDrop` reorders the local array and dispatches `updateDeliverable` with the reordered criteria.

### Nav badge pattern

`AppShell` already receives `state`. VIEW_MODES is a static array. The "ready for acceptance" count will be computed inside AppShell from `state.domain.deliverables` and injected into the label of the Deliverables button using a computed label (same as the Risk Register's `pendingCount` inside the register view, but surfaced one level up in the nav).

---

## 2. Domain — `src/domain/deliverable.ts` (new file)

All dates stored as ISO strings (`'YYYY-MM-DD'` for dates, full ISO timestamp for `*At` fields) — consistent with the rest of Ripple.

```typescript
export type DeliverableStatus = 'Planned' | 'InProduction' | 'InReview' | 'Accepted' | 'Rejected';

export interface AcceptanceCriterion {
  id: string;
  description: string;
  met: boolean;
  metAt: string | null;   // ISO timestamp
  metBy: string | null;   // 'system' for now
}

export interface Deliverable {
  id: string;
  title: string;
  description: string;
  owner: string;           // free-text person name or Person ID
  targetDate: string;      // ISO 'YYYY-MM-DD'
  status: DeliverableStatus;
  acceptanceCriteria: AcceptanceCriterion[];
  linkedTaskIds: string[];
  notes: string;
  acceptedAt: string | null;   // ISO timestamp
  acceptedBy: string | null;
  rejectedAt: string | null;   // ISO timestamp
  rejectionReason: string | null;
  lastReviewedAt: string;      // ISO timestamp
  createdAt: string;           // ISO timestamp
}
```

Helper functions (pure, no side effects):

```typescript
export function getCompletionPercentage(d: Deliverable): number
// Returns 0 when no criteria. Returns Math.round((met / total) * 100).

export function canBeAccepted(d: Deliverable): boolean
// true only if acceptanceCriteria.length > 0 AND every criterion.met === true

export function isOverdue(d: Deliverable, today: string): boolean
// true if d.targetDate < today AND d.status !== 'Accepted'
```

---

## 3. State changes

### 3.1 Domain state (`src/domain/types.ts`)

```typescript
export interface AppDomainState {
  // ... existing ...
  deliverables: Deliverable[];
}
```

Re-export `Deliverable`, `DeliverableStatus`, `AcceptanceCriterion` from `types.ts`.
Add `'deliverableRegister'` to `ViewMode` union.

### 3.2 View state

```typescript
export interface AppViewState {
  // ... existing ...
  deliverablesVisibleInTimeline: boolean;  // default false
  selectedDeliverableId: string | null;
}
```

### 3.3 AppAction additions

```typescript
// View
| { type: 'selectDeliverable'; deliverableId: string | null; openDrawer?: boolean }
| { type: 'setDeliverablesVisible'; value: boolean }
// Deliverable CRUD
| { type: 'addDeliverable'; deliverable: Deliverable }
| { type: 'updateDeliverable'; deliverableId: string; patch: Partial<Deliverable> }
| { type: 'removeDeliverable'; deliverableId: string }
| { type: 'setDeliverableStatus'; deliverableId: string; status: DeliverableStatus; acceptedBy?: string; rejectionReason?: string }
// Acceptance criteria
| { type: 'addAcceptanceCriterion'; deliverableId: string; criterion: AcceptanceCriterion }
| { type: 'updateAcceptanceCriterion'; deliverableId: string; criterionId: string; patch: Partial<AcceptanceCriterion> }
| { type: 'removeAcceptanceCriterion'; deliverableId: string; criterionId: string }
| { type: 'reorderAcceptanceCriteria'; deliverableId: string; orderedIds: string[] }
| { type: 'markCriterionMet'; deliverableId: string; criterionId: string }
| { type: 'markCriterionUnmet'; deliverableId: string; criterionId: string }
```

`setDeliverableStatus` reducer guard: if `status === 'Accepted'` and `!canBeAccepted(deliverable)`, return state unchanged. When accepting, record `acceptedAt` + `acceptedBy`. When rejecting, record `rejectedAt` + `rejectionReason`.

`selectDeliverable` clears selectedTaskId, selectedRiskId, selectedActionId, selectedExtDepId (same mutual-exclusion pattern).

`removeDeliverable` clears `selectedDeliverableId` if it matched.

### 3.4 Pure selectors (not reducer — export from `deliverable.ts`)

```typescript
export function getDeliverablesReadyForAcceptance(deliverables: Deliverable[]): Deliverable[]
// status === 'InReview' AND canBeAccepted(d)
```

### 3.5 Persistence — `src/state/persistenceAdapter.ts`

- Bump `STORE_KEY` → `'ripple_state_v8'`, `STORE_VERSION` → `8`
- `createInitialAppState()`: add `deliverables: seedDeliverables()`, `deliverablesVisibleInTimeline: false`, `selectedDeliverableId: null`
- Add `'deliverableRegister'` to `validModes` array in `migrateView()`
- `migrateView()`: default `deliverablesVisibleInTimeline: false`, `selectedDeliverableId: null` if absent
- `migrateDomain()`: default `deliverables: []` if absent

---

## 4. Register UI — `src/components/DeliverablesRegister/`

### Files

| File | Role |
|---|---|
| `DeliverablesRegister.tsx` | Top-level view (toolbar + filters + grid) |
| `DeliverablesGrid.tsx` | Sortable table |
| `DeliverableCreateForm.tsx` | Wide-drawer creation form (includes AcceptanceCriteriaEditor) |
| `DeliverableInspector.tsx` | Edit form in standard-width drawer |
| `AcceptanceCriteriaEditor.tsx` | Standalone sub-component, used in both create and inspect |

### 4.1 Grid columns

| Column | Notes |
|---|---|
| ID | Monospace |
| Title | |
| Owner | Free text |
| Target Date | ISO date, monospace |
| Status | Coloured badge |
| Completion | Mini progress bar + "N/M" label |
| Criteria | Count badge |
| Overdue | ⚠ icon if `isOverdue` |
| Linked Tasks | Count badge with hover tooltip |

### 4.2 Status badge colours

| Status | CSS class | Appearance |
|---|---|---|
| Planned | `deliv-planned` | neutral/grey |
| InProduction | `deliv-inprod` | blue tint |
| InReview | `deliv-inreview` | amber tint |
| Accepted | `deliv-accepted` | green tint |
| Rejected | `deliv-rejected` | red tint |

### 4.3 Filters

- Status multi-select chips (all active by default)
- Owner free-text search
- "Ready for acceptance" toggle chip — `status === 'InReview' && canBeAccepted(d)`
- "Overdue" toggle chip

### 4.4 Nav count badge

In `AppShell.tsx`: compute `readyCount = getDeliverablesReadyForAcceptance(state.domain.deliverables).length`. The Deliverables nav button label shows `readyCount > 0 ? \`Deliverables (${readyCount} ready)\` : 'Deliverables'`. State is already in scope in AppShell.

---

## 5. Acceptance Criteria Editor — `AcceptanceCriteriaEditor.tsx`

Standalone component, embedded in both DeliverableCreateForm and DeliverableInspector.

### Props

```typescript
interface Props {
  criteria: AcceptanceCriterion[];
  deliverableId: string;           // null/empty string in create mode
  onChange: (criteria: AcceptanceCriterion[]) => void;  // create mode
  // Inspector mode dispatches directly:
  onAdd?: (criterion: AcceptanceCriterion) => void;
  onUpdate?: (criterionId: string, patch: Partial<AcceptanceCriterion>) => void;
  onRemove?: (criterionId: string) => void;
  onReorder?: (orderedIds: string[]) => void;
  onMarkMet?: (criterionId: string) => void;
  onMarkUnmet?: (criterionId: string) => void;
  readOnly?: boolean;
}
```

In **create mode**, `onChange` updates local state (criteria not yet in global state). In **inspect mode**, all `on*` props dispatch to the reducer.

### Behaviour

- Header: "N of M met" completion indicator
- Empty state: hint text with examples (see spec)
- Each row: drag handle (6-dot icon) | checkbox (met/unmet) | description (click-to-edit inline `<input>`) | met-at/met-by when met | delete button
- Drag: HTML5 `draggable` on rows, `dataTransfer.setData('text/plain', id)`, `onDrop` updates order
- "+ Add criterion" inline mini-form: single text input, Enter or Save adds, Escape cancels
- Delete: two-step (click → confirm row shows "Delete? [Confirm] [Cancel]")
- Mark met: sets `metAt = new Date().toISOString()`, `metBy = 'system'`

---

## 6. Creation UX — `DeliverableCreateForm.tsx`

Wide drawer (60vw), same pattern as 8a ExternalDependencyCreateForm.

Sections:
1. **Identity**: title (required*), description, owner
2. **Dates & Status**: targetDate, status select
3. **Acceptance Criteria**: embedded `AcceptanceCriteriaEditor` in create mode
4. **Linked Tasks**: checkbox list (non-parent tasks only)
5. **Notes**: textarea

Footer: Save · Save and add another · Cancel

---

## 7. Edit UX — `DeliverableInspector.tsx`

Standard-width drawer (~400px), no `wide` prop.

All fields editable inline (onBlur text/textarea, onChange selects).
Status section:
- Select for Planned/InProduction/InReview — always enabled
- "Accept" button: enabled only when `canBeAccepted(d)`, triggers confirmation inline panel then dispatches `setDeliverableStatus` with `status: 'Accepted'`
- "Reject" button: always shown; click reveals inline form for rejection reason (required), then dispatches `setDeliverableStatus` with `status: 'Rejected'`
- "Re-open" button (Rejected → InProduction): shown when status is Rejected

AcceptanceCriteriaEditor in inspect mode (dispatches directly).
Overdue banner (red) if `isOverdue`.
Two-step remove button at bottom.

---

## 8. Timeline overlay — `src/components/Timeline/DeliverablesOverlay.tsx`

### Constants

```typescript
export const DELIVERABLES_BAND_HEIGHT = 72;
```

### Diamond geometry (lifted from MilestoneBar)

Same SVG viewBox 28×28, polygon `points="14,3 25,14 14,25 3,14"`.

### Status fills

| Status | Fill | Stroke |
|---|---|---|
| Planned | transparent | `var(--ink-3)` (outline only) |
| InProduction | `#3b82f6` (blue-500) | none |
| InReview | `#f59e0b` (amber-500) | none |
| Accepted | `#22c55e` (green-500) | none |
| Rejected | `var(--breach)` | none |

Selected: additional outline stroke `var(--ink)` strokeWidth 2.

### Stagger

Same 3-slot logic as RaidActionsOverlay and ExternalDependenciesOverlay (`SLOT_COUNT=3`, `MIN_GAP=28px`). Sort by `targetDate` ascending before assigning slots.

### Tooltip

```
DL01: Phase 2 CDR Pack
Owner: P03
Target: 2026-06-20
Status: InReview
Completion: 100%
```

### Click handler

`onSelectDeliverable(deliverable.id)` — navigates to deliverable in register + opens InspectorDrawer.

---

## 9. Timeline.tsx changes

### New band stacking order

New top-to-bottom order per spec:

```
tasks (gridContentHeight)
↓ gap 4px
Deliverables band        ← NEW (closest to tasks)
↓ gap 4px
External Dependencies band
↓ gap 4px
RAID Actions band        ← moved to bottom
```

### gridTotalHeight update

```typescript
const delivBandVisible = state.view.deliverablesVisibleInTimeline;
const extDepVisible = state.view.externalDependenciesVisibleInTimeline;
const raidBandVisible = state.view.raidActionsVisibleInTimeline;

const gridTotalHeight =
  gridContentHeight + TOTAL_HEADER_HEIGHT
  + (delivBandVisible ? DELIVERABLES_BAND_HEIGHT + 4 : 0)
  + (extDepVisible ? EXT_DEP_BAND_HEIGHT + 4 : 0)
  + (raidBandVisible ? RAID_BAND_HEIGHT + 8 : 0);
```

### today-line height and band `top` offsets

```typescript
const delivBandTop = gridContentHeight + 4;
const extDepTop = delivBandTop + (delivBandVisible ? DELIVERABLES_BAND_HEIGHT + 4 : 0);
const raidBandTop = extDepTop + (extDepVisible ? EXT_DEP_BAND_HEIGHT + 4 : 0);
```

Today-line height accounts for all three optional bands.

### New props

```typescript
onSetDeliverablesVisible: (value: boolean) => void;
onSelectDeliverable: (deliverableId: string) => void;
```

### New toolbar chip

```
[Deliverables]
```
Alongside existing RAID actions and External dependencies chips.

---

## 10. AppShell.tsx changes

```typescript
const VIEW_MODES = [
  { key: 'timeline',           label: 'Timeline' },
  { key: 'board',              label: 'Board' },
  { key: 'riskRegister',       label: 'Risk Register' },
  { key: 'raidBoard',          label: 'RAID Actions' },
  { key: 'extDepRegister',     label: 'External Dependencies' },
  { key: 'deliverableRegister', label: 'Deliverables' },  // NEW
];
```

Add prop `state` (already present) to compute the ready count. Render the Deliverables button label as:
```
{readyCount > 0 ? `Deliverables (${readyCount} ready)` : 'Deliverables'}
```

---

## 11. App.tsx changes

- Add `showDeliverableCreate` local useState
- Escape handler: closes `showDeliverableCreate`
- Derive `selectedDeliverable` from `state.view.selectedDeliverableId`
- Route `'deliverableRegister'` mode to `<DeliverablesRegister>`
- Wire Timeline with `onSetDeliverablesVisible` and `onSelectDeliverable`
- Wire InspectorDrawer with all deliverable props

---

## 12. Seed data — `src/domain/deliverableSeedData.ts` (new file)

6 records, dates calibrated to "today = 2026-05-18":

| ID | Title | Status | Target | Criteria | Notes |
|---|---|---|---|---|---|
| DL01 | Phase 2 Critical Design Review Pack | InReview | 2026-06-20 | 5 criteria, 5 met | Ready for acceptance |
| DL02 | Cleared Engineer Training Material | InProduction | 2026-07-15 | 4 criteria, 2 met | Some progress |
| DL03 | STANAG Conformance Test Report | Planned | 2026-09-01 | 3 criteria, 0 met | No work started |
| DL04 | Integration Test Environment | Accepted | 2026-04-15 | 4 criteria, 4 met | Historic |
| DL05 | Cyber Security Accreditation Submission | Rejected | 2026-05-01 | 5 criteria, 3 met | `rejectionReason: 'ITSO requested rework of section 4'` |
| DL06 | Q2 Stakeholder Briefing Pack | InProduction | 2026-05-15 | 3 criteria, 1 met | Overdue (past today) |

Each deliverable has realistic defence-programme acceptance criteria text, linked to appropriate task IDs from seed data.

---

## 13. Tests — `src/tests/deliverable.test.ts` (new file)

### Domain helpers

- `getCompletionPercentage` — 0 criteria → 0%; all met → 100%; mixed
- `canBeAccepted` — all met → true; any unmet → false; empty → false
- `isOverdue` — past date + not Accepted → true; Accepted past date → false; future date → false

### Seed data integrity

- 6 records, unique IDs, all have 3–6 criteria
- DL01 is InReview and `canBeAccepted` = true (ready for acceptance)
- DL06 is `isOverdue` = true (past today, not Accepted)
- DL04 is Accepted (not overdue despite past date)
- DL05 has `rejectionReason` set

### State CRUD

- `addDeliverable` appends
- `updateDeliverable` patches and updates `lastReviewedAt`
- `removeDeliverable` removes; `selectedDeliverableId` clears if matched
- `addAcceptanceCriterion` / `updateAcceptanceCriterion` / `removeAcceptanceCriterion`
- `reorderAcceptanceCriteria` reorders correctly
- `markCriterionMet` sets `met=true`, `metAt`, `metBy='system'`
- `markCriterionUnmet` clears `met=false`, `metAt=null`, `metBy=null`

### Status workflow guards

- `setDeliverableStatus` to Accepted with unmet criteria → state unchanged
- `setDeliverableStatus` to Accepted with all criteria met → records `acceptedAt`
- `setDeliverableStatus` to Rejected → records `rejectedAt` and `rejectionReason`
- Rejected → InProduction is allowed

### Selectors

- `getDeliverablesReadyForAcceptance` returns only InReview deliverables with all criteria met
- Returns empty array when none qualify

### Persistence migration

- `createInitialAppState` includes `deliverables` array and `deliverablesVisibleInTimeline: false`
- `selectedDeliverableId` initialises to null

---

## 14. CSS additions — `src/styles/layout.css`

New sections:

```css
/* Deliverables status badge colours */
.badge.deliv-planned   { ... neutral }
.badge.deliv-inprod    { ... blue tint }
.badge.deliv-inreview  { ... amber tint }
.badge.deliv-accepted  { ... green tint }
.badge.deliv-rejected  { ... red tint }

/* Deliverables Timeline overlay band */
.deliverables-overlay-band { ... green tint background }
.deliverables-overlay-band::before { content: 'Deliverables'; ... }
.deliverable-marker { ... }
.deliverable-marker.selected { ... }
.deliverable-label { ... }

/* Criteria editor */
.criteria-editor { ... }
.criterion-row { ... }
.criterion-row.met { ... strikethrough/muted }
.criterion-drag-handle { ... }
.criteria-completion-bar { ... progress track }
.criteria-completion-fill { ... progress fill }
```

---

## 15. Files created or modified

| File | Change |
|---|---|
| `src/domain/deliverable.ts` | New: types, helpers |
| `src/domain/deliverableSeedData.ts` | New: 6 seed records |
| `src/domain/types.ts` | Add deliverables to AppDomainState; view state fields; 'deliverableRegister' ViewMode; re-exports |
| `src/domain/seedData.ts` | Import seedDeliverables() |
| `src/state/appState.ts` | New actions + reducer cases |
| `src/state/persistenceAdapter.ts` | v7→v8; migrate deliverables and view flags |
| `src/components/DeliverablesRegister/DeliverablesRegister.tsx` | New |
| `src/components/DeliverablesRegister/DeliverablesGrid.tsx` | New |
| `src/components/DeliverablesRegister/DeliverableCreateForm.tsx` | New |
| `src/components/DeliverablesRegister/DeliverableInspector.tsx` | New |
| `src/components/DeliverablesRegister/AcceptanceCriteriaEditor.tsx` | New |
| `src/components/Timeline/DeliverablesOverlay.tsx` | New |
| `src/components/Timeline/layoutEngine.ts` | Extend computeTimelineWindow for deliverable dates |
| `src/components/Timeline/Timeline.tsx` | New chip + overlay; reorder RAID/ExtDep/Deliverables bands; new props |
| `src/components/AppShell/AppShell.tsx` | Add deliverableRegister to VIEW_MODES; nav count badge |
| `src/components/InspectorDrawer/InspectorDrawer.tsx` | Add deliverable create/inspect branches |
| `src/App.tsx` | showDeliverableCreate state; route deliverableRegister; wire all handlers |
| `src/styles/layout.css` | New badge colours, overlay band, criteria editor styles |
| `src/tests/deliverable.test.ts` | New: 25+ domain + state + seed + selector tests |

---

## 16. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Band reorder breaks existing RAID/ExtDep offsets | New computed variables `delivBandTop`, `extDepTop`, `raidBandTop` are clean; existing tests catch any regression |
| AC drag reorder on small screens with many criteria | Max-height scroll on the criteria list; drag works within the scrollable container |
| Status guard must be enforced at both UI and reducer level | UI disables the Accept button; reducer also returns `state` unchanged if guard fails |
| Empty criteria list + canBeAccepted = false gate blocks acceptance | Empty criteria list explicitly makes `canBeAccepted` return false per spec |
| Seed DL06 overdue — needs `targetDate < today` | Use 2026-05-15 as target (3 days before "today" = 2026-05-18) |
