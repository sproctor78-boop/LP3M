# Phase 7a Implementation Plan — Risk Register Upgrade

**Branch:** `claude/phase-7a-risk-register`
**Anchored on:** IRM Risk Management Standard (primary), PMI/PMBOK (fallback)
**Persistence version:** v5 → v6

---

## 1. Scope summary

Four independent deliverables in this sub-phase:

| # | Deliverable | Files touched |
|---|---|---|
| A | Proximity dimension on Risk domain + migration | `risk.ts`, `raidSeedData.ts`, `persistenceAdapter.ts` |
| B | Risk Register column groups (collapsible Inherent/Residual, count badges, Proximity col) | `RiskGrid.tsx`, `RiskRegister.tsx`, `types.ts`, `appState.ts` |
| C | Expanded inline drawer for risk creation ("Save and add another") | `RiskCreateForm.tsx` (new), `InspectorDrawer.tsx`, `App.tsx` |
| D | Board full-spread layout (both Task Board and RAID Actions Board) | `layout.css` only |

---

## 2. Domain changes — `src/domain/risk.ts`

### 2.1 New types and helpers

```typescript
export type Proximity = 'Imminent' | 'NearTerm' | 'MediumTerm' | 'LongTerm';

export const PROXIMITY_BANDS: Record<Proximity, { label: string; months: string }> = {
  Imminent:   { label: 'Imminent',    months: '≤ 1 month'   },
  NearTerm:   { label: 'Near-term',   months: '1–3 months'  },
  MediumTerm: { label: 'Medium-term', months: '3–12 months' },
  LongTerm:   { label: 'Long-term',   months: '> 12 months' },
};

// Derives proximity from a review/trigger date relative to today.
// A review date within 30 days → Imminent; ≤ 91 days → NearTerm;
// ≤ 365 days → MediumTerm; beyond → LongTerm.
export function getProximityFromDate(date: Date, today: Date): Proximity;
```

Boundary values (days from today):
- **≤ 30** → Imminent
- **31–91** → NearTerm
- **92–365** → MediumTerm
- **> 365** → LongTerm

These map to calendar months (30/91/365) not lunar months. The IRM standard uses approximate months; this is a pragmatic mapping.

### 2.2 Add `proximity` to `Risk` interface

```typescript
export interface Risk {
  // ... existing fields ...
  proximity: Proximity;   // new required field
}
```

### 2.3 Add `proximity` to all 12 seed risks in `raidSeedData.ts`

Derived from each risk's `reviewDate` relative to the seed anchor date 2026-05-18:

| Risk | Review Date | Days to review | Proximity |
|---|---|---|---|
| R01 | 2026-06-30 | 43 | NearTerm |
| R02 | 2026-06-10 | 23 | Imminent |
| R03 | 2026-06-06 | 19 | Imminent |
| R04 | 2026-06-20 | 33 | NearTerm |
| R05 | 2026-07-01 | 44 | NearTerm |
| R06 | 2026-06-27 | 40 | NearTerm |
| R07 | 2026-07-01 | 44 | NearTerm |
| R08 | 2026-05-30 | 12 | Imminent |
| R09 | 2026-07-01 | 44 | NearTerm |
| R10 | 2026-07-18 | 61 | NearTerm |
| R11 | 2026-06-28 | 41 | NearTerm |
| R12 | 2026-06-19 | 32 | NearTerm |

(No LongTerm or MediumTerm in the current seed set — these will arise naturally as users add risks with distant review dates. Tests will cover all four bands.)

---

## 3. State changes

### 3.1 `src/domain/types.ts` — AppViewState

Add two fields:

```typescript
// Collapse state for Risk Register column groups. Persisted to localStorage.
riskRegisterCollapseState: { inherentCollapsed: boolean; residualCollapsed: boolean };
```

### 3.2 `src/state/appState.ts` — new action

```typescript
| { type: 'setRiskColumnCollapse'; group: 'inherent' | 'residual'; collapsed: boolean }
```

Reducer case: updates `view.riskRegisterCollapseState`.

No other new actions — risk creation uses the existing `createRisk` action.

### 3.3 `src/state/persistenceAdapter.ts`

- Bump `STORE_KEY` → `'ripple_state_v6'`, `STORE_VERSION` → `6`
- `createInitialAppState()`: add `riskRegisterCollapseState: { inherentCollapsed: true, residualCollapsed: false }` (default: Inherent collapsed, Residual expanded)
- `migrateView()`: read `riskRegisterCollapseState` with same default on missing
- `migrateDomain()`: for each risk in stored state, fill `proximity: 'MediumTerm'` if not present

---

## 4. Risk Register column changes — `RiskGrid.tsx`

### 4.1 Column architecture

The current flat 7-column table becomes a grouped-header table. HTML structure:

```
<thead>
  <tr>  ← group headers row
    <th colspan="5">Identity</th>
    <th colspan="3">Dates</th>
    <th colspan="N" class="col-group-inherent">
      Inherent <button [collapse toggle]>▸</button>
    </th>
    <th colspan="N" class="col-group-residual">
      Residual <button [collapse toggle]>▸</button>
    </th>
    <th colspan="2">Target</th>
    <th colspan="2">Responses</th>
  </tr>
  <tr>  ← sub-column headers row
    <!-- Identity: ID, Title, Category, Owner, Status -->
    <!-- Dates: Raised, Review, Proximity -->
    <!-- Inherent: [Prob%, ProbBand, CostBand, TimeBand,] Score, RAG -->
    <!-- Residual: [Prob%, ProbBand, CostBand, TimeBand,] Score, RAG -->
    <!-- Target: Score, RAG -->
    <!-- Responses: Controls, Mitigations -->
  </tr>
</thead>
```

When Inherent is collapsed: Prob%, ProbBand, CostBand, TimeBand columns get `display: none`. Score and RAG stay visible. The `colspan` on the group header adjusts accordingly (via calculated value based on collapse state).

### 4.2 Collapsible state

`RiskGrid` receives `collapseState: { inherentCollapsed: boolean; residualCollapsed: boolean }` and `onSetCollapse: (group, collapsed) => void` as props (from `RiskRegister`, which gets them from `state.view.riskRegisterCollapseState`).

### 4.3 Count badges

New component `ResponseCountBadge` (lives in `RiskRegister/`):

```tsx
<ResponseCountBadge
  items={risk.controls}      // or risk.mitigations
  label="Controls"
  onBadgeClick={() => onSelectRisk(risk.id)}  // opens drawer, scrolled to controls section
/>
```

Badge renders as a small pill: `<span class="response-count-badge">3</span>`. On hover: tooltip listing the item descriptions. On click: selects the risk and opens the drawer.

The drawer-scroll-to-section behaviour requires `RiskInspector` to accept a `scrollToSection?: 'controls' | 'mitigations'` prop and perform a `scrollIntoView` on mount when set. This is a minor addition to `RiskInspector.tsx` and `InspectorDrawer.tsx`.

### 4.4 Proximity column

- Renders the PROXIMITY_BANDS label for the risk's proximity value
- CSS class based on proximity: `proximity-imminent` (red text), `proximity-near-term` (amber), `proximity-medium-term` (default ink), `proximity-long-term` (muted)
- Sortable (sort order: Imminent → NearTerm → MediumTerm → LongTerm)

### 4.5 Proximity filter in `RiskRegister.tsx`

Add a `<select>` filter alongside existing category/status filters:

```
<select> All proximity · Imminent · Near-term · Medium-term · Long-term </select>
```

Local state `proximityFilter: Proximity | ''`. Applied to `filtered` array before passing to `RiskGrid`.

---

## 5. Risk creation — expanded drawer

### 5.1 Trigger

"New Risk" button in the `RiskRegister` toolbar. Clicking it:
1. Dispatches `{ type: 'openRiskCreate' }` (new view action — OR handled as local state in `App.tsx`). I'll use local state in `App.tsx` to avoid bloating the persisted view state with transient UI modes: `const [showRiskCreate, setShowRiskCreate] = useState(false)`.
2. Opens the `RiskCreateDrawer` component (described below).

### 5.2 `src/components/RiskRegister/RiskCreateForm.tsx` — new component

Controlled form containing all risk fields:

**Identity section:** Title (required), Description, Category (select), Owner (text), Raised Date (defaults to today), Review Date, **Proximity** (select, defaults to MediumTerm)

**Scoring section:** Three sub-forms (Inherent, Residual, Target) each with Probability %, Cost Impact band, Time Impact band. Score and RAG computed live from `buildRiskScore()` and shown read-only.

**Controls section:** Lists added controls; `+ Add control` button reveals an inline mini-form (`description` input + Add/Cancel). Controls are added to local state immediately.

**Mitigations section:** Same pattern as Controls.

**Footer:**
- `Save` → calls `onSave(risk)`, then `onClose()`
- `Save and add another` → calls `onSave(risk)`, then `onReset()` (resets all fields to blank, keeps drawer open)
- `Cancel` → calls `onClose()`

Per Steven's confirmation: "Reset all fields" — both Save paths start from a blank form for the next risk.

### 5.3 `InspectorDrawer` wide-mode CSS

`InspectorDrawer` gets a `wide?: boolean` prop. When `wide === true`:

```css
.drawer.wide {
  width: 60vw;
  max-width: 900px;
}
```

The `RiskCreateForm` is rendered inside the standard drawer body when `wide === true` and no risk/action/task is selected.

### 5.4 App.tsx wiring

```tsx
const [showRiskCreate, setShowRiskCreate] = useState(false);
// ...
// In RiskRegister view:
onNewRisk={() => setShowRiskCreate(true)}
// ...
// In InspectorDrawer:
wide={showRiskCreate}
onCreateRisk={(risk) => {
  dispatch({ type: 'createRisk', risk });
  // drawer stays open — form resets
}}
onCloseRiskCreate={() => setShowRiskCreate(false)}
```

---

## 6. Board full-spread layout — CSS only

Changes to `.kanban-cols` and `.kanban-col` in `layout.css`:

```css
.kanban-cols {
  display: flex;
  gap: 12px;
  padding: 0 20px 20px;
  width: 100%;
  box-sizing: border-box;
  overflow-x: auto;   /* horizontal scroll at narrow viewport */
}

.kanban-col {
  flex: 1 1 280px;    /* grow and shrink, base 280px */
  min-width: 280px;
  max-width: 480px;
}
```

This applies to both Project Task Board and RAID Actions Board as they both render `<div class="kanban-cols">`.

No JS changes needed.

---

## 7. Tests — `src/tests/riskProximity.test.ts`

Pure domain-level tests only (consistent with existing test pattern — no React component rendering):

```
getProximityFromDate:
  - 0 days → Imminent
  - 30 days → Imminent (boundary)
  - 31 days → NearTerm (boundary)
  - 91 days → NearTerm (boundary)
  - 92 days → MediumTerm (boundary)
  - 365 days → MediumTerm (boundary)
  - 366 days → LongTerm (boundary)
  - Negative (past date) → Imminent

PROXIMITY_BANDS:
  - Has exactly 4 keys
  - All keys are valid Proximity values

Migration:
  - A risk object without a proximity field gets MediumTerm after migrateDomain
```

Also: extend `raidSeedData.test.ts` with a test that all 12 risks have a valid proximity value.

---

## 8. Files created or modified

| File | Change |
|---|---|
| `src/domain/risk.ts` | Add Proximity type, PROXIMITY_BANDS, getProximityFromDate, proximity field on Risk |
| `src/domain/raidSeedData.ts` | Add proximity to all 12 seed risks |
| `src/domain/types.ts` | Add riskRegisterCollapseState to AppViewState |
| `src/state/appState.ts` | Add setRiskColumnCollapse action and reducer case |
| `src/state/persistenceAdapter.ts` | v5→v6, migrate proximity, migrate riskRegisterCollapseState |
| `src/components/RiskRegister/RiskRegister.tsx` | Add New Risk button, proximity filter, pass collapse state to RiskGrid |
| `src/components/RiskRegister/RiskGrid.tsx` | Column groups, collapse toggles, Proximity column, Raised/Review columns, count badges |
| `src/components/RiskRegister/RiskCreateForm.tsx` | New: full creation form with inline controls/mitigations and dual-save footer |
| `src/components/RiskRegister/ResponseCountBadge.tsx` | New: count pill with hover tooltip |
| `src/components/InspectorDrawer/InspectorDrawer.tsx` | wide prop, create-risk branch |
| `src/App.tsx` | showRiskCreate local state, onNewRisk/onCreateRisk/onCloseRiskCreate handlers |
| `src/styles/layout.css` | Board full-spread, drawer wide mode, proximity text colours, column group header styles, count badge styles |
| `src/tests/riskProximity.test.ts` | New: 10–12 domain-level tests |

---

## 9. What is explicitly out of scope for 7a

- No Issue, Assumption, or Opportunity types — those are 7b, 7c, 7d
- No engine modifications
- No new npm dependencies
- No changes to Timeline, TaskBoard logic, or RAID Actions Board logic (only CSS for board layout)
- Component-level tests (would require adding @testing-library/react — not in scope here; all tests are pure domain tests)

---

## 10. Risk and mitigations

| Risk | Mitigation |
|---|---|
| RiskGrid refactor may shift column widths unexpectedly | Test at 1280px, 1600px widths; use `min-width` on key columns |
| Drawer wide-mode may overlap with InspectorDrawer on mobile | Wide mode only on Risk Register view; disable wide on viewport < 900px via media query |
| v6 migration may fail silently on corrupt localStorage | Existing try/catch in loadAppState() handles this — falls back to createInitialAppState() |
| "Save and add another" state management complexity | RiskCreateForm owns all form state internally; parent only receives final Risk objects via callbacks |
