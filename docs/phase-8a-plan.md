# Phase 8a Implementation Plan — External Dependencies Register

**Branch:** `claude/phase-8a-external-dependencies`
**Anchored on:** IRM (primary), PMI/PMBOK (fallback)
**Persistence version:** v6 → v7

---

## 1. Scope

Add an External Dependencies register and Timeline overlay to Ripple. An external dependency is something outside the programme that the programme depends on. This is distinct from internal task-to-task dependencies already modelled in the Gantt.

Deliverables:
- `ExternalDependency` domain type + helpers
- State slice (CRUD, selectors, persistence v7)
- External Dependencies Register (table view with filters)
- Create/edit UX in InspectorDrawer (wide mode for create)
- Timeline purple arrow overlay with toggle chip
- 5 seed records; tests for domain, state, and seed integrity

---

## 2. Domain — `src/domain/externalDependency.ts` (new file)

```typescript
export type DepStatus = 'OnTrack' | 'AtRisk' | 'Late' | 'Received';

export interface ExternalDependency {
  id: string;
  title: string;
  description: string;
  externalOwner: string;      // free text — the third party
  internalOwner: string;      // Person ID or free-text name on our side
  targetDate: string;         // ISO 'YYYY-MM-DD'
  status: DepStatus;
  linkedTaskIds: string[];    // tasks blocked/constrained by this dependency
  notes: string;
  lastReviewedAt: string;     // ISO timestamp
  createdAt: string;          // ISO timestamp
}
```

Helper functions in the same file:

```typescript
// Returns a suggested status based on date alone.
// Past target date + not Received → suggests 'Late'.
// Within 14 days + not Received → suggests 'AtRisk'.
// Otherwise → suggests 'OnTrack' (or existing status if Received).
export function getSuggestedStatus(targetDate: string, today: string, currentStatus: DepStatus): DepStatus

// True if past targetDate and status !== 'Received'
export function isOverdue(dep: ExternalDependency, today: string): boolean
```

No proximity field — `targetDate` and `status` already carry that information.

---

## 3. State — `src/state/appState.ts` + `src/domain/types.ts`

### 3.1 Domain state

Add to `AppDomainState`:
```typescript
externalDependencies: ExternalDependency[];
```

### 3.2 View state

Add to `AppViewState`:
```typescript
externalDependenciesVisibleInTimeline: boolean;  // default false
selectedExtDepId: string | null;
```

### 3.3 Actions (new in AppAction union)

```typescript
| { type: 'addExternalDependency'; dep: ExternalDependency }
| { type: 'updateExternalDependency'; depId: string; patch: Partial<ExternalDependency> }
| { type: 'removeExternalDependency'; depId: string }
| { type: 'setExternalDependencyStatus'; depId: string; status: DepStatus }
| { type: 'setExtDepVisible'; value: boolean }
| { type: 'selectExtDep'; depId: string | null; openDrawer?: boolean }
```

### 3.4 Selectors (pure functions, not reducer actions)

```typescript
// In a new src/domain/externalDependencySelectors.ts or inside the domain file:
export function getOverdueExternalDependencies(deps: ExternalDependency[], today: string): ExternalDependency[]
```

---

## 4. Persistence — `src/state/persistenceAdapter.ts`

- Bump `STORE_KEY` → `'ripple_state_v7'`, `STORE_VERSION` → `7`
- `createInitialAppState()`: add `externalDependencies: seedExternalDependencies()`, `externalDependenciesVisibleInTimeline: false`, `selectedExtDepId: null`
- `migrateView()`: default `externalDependenciesVisibleInTimeline: false`, `selectedExtDepId: null` if absent
- `migrateDomain()`: default `externalDependencies: []` if absent

---

## 5. Register UI — `src/components/ExternalDependenciesRegister/`

### 5.1 Files

| File | Role |
|---|---|
| `ExternalDependenciesRegister.tsx` | Top-level view (toolbar + filters + grid) |
| `ExternalDependenciesGrid.tsx` | Sortable table |
| `ExternalDependencyCreateForm.tsx` | Wide-drawer creation form |
| `ExternalDependencyInspector.tsx` | Edit form in standard-width drawer |

### 5.2 Grid columns

| Column | Notes |
|---|---|
| ID | Monospace |
| Title | Title text |
| External Owner | Free text |
| Internal Owner | Text |
| Target Date | ISO date, monospace |
| Status | Coloured badge: OnTrack=neutral, AtRisk=amber, Late=red, Received=muted |
| Linked Tasks | Count badge (0 = empty pill); hover tooltip lists task titles |
| Overdue | Warning icon if `isOverdue` = true and status ≠ Received |

Default sort: Target Date ascending.

### 5.3 Filters (toolbar)

- **Status** multi-select (default: OnTrack, AtRisk, Late — Received unchecked by default, but accessible)
- **Overdue** toggle chip — shows only overdue dependencies
- **Internal Owner** free-text search / filter

### 5.4 Navigation position

AppShell view-switch order: Timeline · Board · Risk Register · RAID Actions · **External Dependencies** · [Issues queued for 7b]

New `ViewMode` value: `'extDepRegister'`

### 5.5 Create UX

- "+ New External Dependency" button top-right of register toolbar
- Opens `InspectorDrawer` in wide mode (60vw) — same pattern as Risk creation in 7a
- `showExtDepCreate` local state in `App.tsx`
- Form sections: Identity (title, desc, external owner, internal owner), Dates (target date, last reviewed), Status, Linked Tasks (multi-select from `state.domain.tasks`), Notes
- Footer: Save · Save and add another · Cancel (same pattern as 7a)
- "Save and add another" resets all fields; drawer stays open

### 5.6 Edit UX

- Clicking a row in the grid opens InspectorDrawer in standard width (≈400px) with `ExternalDependencyInspector`
- All fields editable inline; status dropdown; "Remove" button with confirmation

---

## 6. Timeline overlay — `src/components/Timeline/ExternalDependenciesOverlay.tsx`

### 6.1 Pattern

Mirrors `RaidActionsOverlay.tsx` exactly. Same band height constant (`EXT_DEP_BAND_HEIGHT = 72`). Imported in `Timeline.tsx` and placed below the RAID Actions band.

Stacking order (per Steven's confirmation): tasks → RAID Actions → **External Dependencies** → Deliverables (8b).

### 6.2 Marker shape

An "inbound arrow" drawn in SVG:
```
←  filled arrowhead pointing left, with a short horizontal stem
```
Specifically: a left-pointing filled triangle (≈10×14px) at the target date x-position, with a 16px horizontal stem extending right. This reads visually as "something arriving from outside".

### 6.3 Status colours

| Status | Fill | Outline |
|---|---|---|
| OnTrack | `#9333EA` (purple-600) | none |
| AtRisk | `#9333EA` | amber ring (`var(--risk)`) |
| Late | `#9333EA` | red ring (`var(--breach)`) |
| Received | `#c4b5fd` (muted purple) | none |

### 6.4 Behaviour

- Hover: tooltip with title, external owner, target date, status
- Click: `onSelectExtDep(dep.id)` → opens `ExternalDependencyInspector` in standard drawer, switches to extDepRegister view
- Stagger: same 3-slot logic as RAID overlay (`MIN_GAP = 28px`)
- Hidden when toggle is off

### 6.5 Timeline window expansion

In `layoutEngine.ts`, inside `computeTimelineWindow`:
```typescript
if (state.view.externalDependenciesVisibleInTimeline) {
  state.domain.externalDependencies.forEach((d) => {
    if (d.targetDate < minDate) minDate = d.targetDate;
    if (d.targetDate > maxDate) maxDate = d.targetDate;
  });
}
```

### 6.6 Timeline toolbar toggle chip

New chip in Timeline toolbar alongside existing "RAID actions" and "Milestones only" chips:
```
[External dependencies]   // label, same milestones-only-chip CSS class
```
When toggled on, shows `ExternalDependenciesOverlay`. Persists via `externalDependenciesVisibleInTimeline`.

Toolbar props additions: `onSetExtDepVisible`, `onSelectExtDep`.

---

## 7. Seed data — `src/domain/externalDependencySeedData.ts` (new file)

5 records calibrated to "today = May 2026":

| ID | Title | Status | Target date | Notes |
|---|---|---|---|---|
| ED01 | Cleared facility access from MOD ABW | AtRisk | 2026-06-15 | Linked to T06 (Installation) |
| ED02 | STANAG 4671 certification from MOD test authority | Late | 2026-05-10 | Past, not Received; linked to T07, T08 |
| ED03 | Integration test facility access confirmation | OnTrack | 2026-06-01 | Linked to T07 |
| ED04 | Sub-component delivery from prime contractor | OnTrack | 2026-05-25 | Linked to T05, T06 — multiple tasks |
| ED05 | Security accreditation sign-off | Received | 2026-04-30 | Historic; no linked tasks |

Each seed record has `description`, `externalOwner`, `internalOwner`, `notes`, `createdAt`, `lastReviewedAt` populated with realistic defence-programme text.

---

## 8. Tests — `src/tests/externalDependency.test.ts` (new file)

Pure domain and state tests (no React rendering — consistent with existing test pattern):

**Domain helpers:**
- `getSuggestedStatus` — past date + not Received → Late
- `getSuggestedStatus` — within 14 days + not Received → AtRisk
- `getSuggestedStatus` — future date → OnTrack
- `getSuggestedStatus` — Received status preserved regardless of date
- `isOverdue` — past date, not Received → true
- `isOverdue` — past date, Received → false
- `isOverdue` — future date → false

**Seed data integrity:**
- All 5 seeds load without error
- All IDs unique and in format `ED\d{2}`
- Every `linkedTaskId` in every seed record resolves to an existing task in `seedTasks()`
- At least one seed has status OnTrack, AtRisk, Late, Received each
- At least one seed has multiple `linkedTaskIds`

**State CRUD:**
- `addExternalDependency` adds to slice
- `updateExternalDependency` patches the record
- `removeExternalDependency` removes it; `selectedExtDepId` clears if it was that dep
- `setExternalDependencyStatus` updates only status field

**Migration:**
- State stored at v6 (no `externalDependencies` field) migrates to v7 with empty array and `externalDependenciesVisibleInTimeline: false`

---

## 9. AppShell / App.tsx changes

- `ViewMode` gains `'extDepRegister'`
- `AppShell` VIEW_MODES array gains `{ key: 'extDepRegister', label: 'External Dependencies' }`
- `App.tsx`: `showExtDepCreate` local state; route `extDepRegister` mode to `ExternalDependenciesRegister`; wire `InspectorDrawer` for create and edit paths
- `InspectorDrawer.tsx`: add `showExtDepCreate`, `selectedExtDep`, `onCreateExtDep`, `onCloseExtDepCreate`, `onUpdateExtDep`, `onRemoveExtDep` props (same pattern as Risk)
- Escape key handler in `App.tsx` closes `showExtDepCreate` (same pattern as `showRiskCreate`)

---

## 10. CSS additions — `src/styles/layout.css`

- `.ext-dep-overlay-band` — same shape/size as `.raid-overlay-band`
- `.ext-dep-arrow` — SVG-based inbound arrow, purple fill
- `.ext-dep-arrow.atrisk` — amber outline ring
- `.ext-dep-arrow.late` — red outline ring
- `.ext-dep-arrow.received` — muted purple
- Status badge colours: `.badge.dep-ontrack`, `.badge.dep-atrisk`, `.badge.dep-late`, `.badge.dep-received`
- `.ext-dep-create-form` — inherits `.risk-create-form` patterns; no new layout primitives needed

---

## 11. README updates

Add `External Dependencies` row to the "What's here" feature table and a brief description of the register and Timeline overlay to the Project structure section.

---

## 12. Files created or modified

| File | Change |
|---|---|
| `src/domain/externalDependency.ts` | New: ExternalDependency type, getSuggestedStatus, isOverdue |
| `src/domain/externalDependencySeedData.ts` | New: 5 seed records |
| `src/domain/types.ts` | Add externalDependencies to AppDomainState; add extDep view state fields; add 'extDepRegister' to ViewMode; re-export ExternalDependency |
| `src/state/appState.ts` | New actions + reducer cases for ext dep CRUD and view |
| `src/state/persistenceAdapter.ts` | v6→v7, migrate externalDependencies and view flags |
| `src/domain/seedData.ts` | Import and include seedExternalDependencies() in createInitialDomainState |
| `src/components/ExternalDependenciesRegister/ExternalDependenciesRegister.tsx` | New |
| `src/components/ExternalDependenciesRegister/ExternalDependenciesGrid.tsx` | New |
| `src/components/ExternalDependenciesRegister/ExternalDependencyCreateForm.tsx` | New |
| `src/components/ExternalDependenciesRegister/ExternalDependencyInspector.tsx` | New |
| `src/components/Timeline/ExternalDependenciesOverlay.tsx` | New |
| `src/components/Timeline/layoutEngine.ts` | Extend computeTimelineWindow for ext dep dates |
| `src/components/Timeline/Timeline.tsx` | Add ext dep toggle chip, overlay render, new props |
| `src/components/AppShell/AppShell.tsx` | Add 'extDepRegister' to VIEW_MODES |
| `src/components/InspectorDrawer/InspectorDrawer.tsx` | Add ext dep create/edit branches |
| `src/App.tsx` | showExtDepCreate state, route extDepRegister view, wire all handlers |
| `src/styles/layout.css` | Ext dep band, arrow marker, status badges, form styles |
| `src/tests/externalDependency.test.ts` | New: 15+ domain + state + seed tests |

---

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| SVG arrow marker more complex than flag label | Fall back to a simple left-pointing triangle CSS shape (border trick) if SVG causes layout issues |
| Timeline props already large (27 props) | Add only 2 new props (`onSetExtDepVisible`, `onSelectExtDep`); keep InspectorDrawer pattern for edit path |
| Linked Tasks multi-select on large task lists | Simple `<select multiple>` with task title + ID — no custom component needed at this scale |
| v7 migration silent on corrupt localStorage | Existing try/catch in `loadAppState()` falls back to `createInitialAppState()` |
