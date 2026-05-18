# RAID Integration Plan — Ripple

> Phase 0 plan. **For Steven's review — do not begin Phase 1 until sign-off.**
> Branch: `claude/integrate-raid-log-ripple-2UgGP`
> Scoring proposals and seed data: see `docs/raid-integration-notes.md`.

---

## 1. Confirmed constraints

| Constraint | Status |
|---|---|
| No Tailwind | Confirmed — existing `src/styles/` conventions only |
| No Zustand | Confirmed — extend `appState.ts` |
| No TanStack Table | Confirmed — custom `RiskGrid.tsx` using CSS grid |
| No top-level `raid/` folder | Confirmed — distribute by layer |
| No `src/engine/` changes | Confirmed — TODO comment only |
| No router | Confirmed — Ripple has none; view switching via `ViewMode` in state |
| No new UUID library | Confirmed — `crypto.randomUUID()` |

---

## 2. New files

### `src/domain/`

| File | Contents |
|---|---|
| `risk.ts` | `Risk`, `RiskScore`, `RiskScores`, `RiskStatus`, `RiskCategory`, `RagColour`, `ImpactBand`, `ProbabilityBand`, `ResponseItem` types |
| `raidAction.ts` | `RaidAction`, `ActionStatus` types |
| `raidScoring.ts` | Pure helpers: `probabilityToBand`, `ragForScore`, `calcRiskScore`, `proposeResidualScore`; all unit-testable with no imports beyond `risk.ts` |
| `raidSeedData.ts` | `seedRisks()` and `seedRaidActions()` — the 12 risks and 19 actions from `raid-integration-notes.md` §6 |

### `src/components/RiskRegister/`

| File | Contents |
|---|---|
| `RiskRegister.tsx` | Outer container: toolbar (search input, category filter, status filter, "Needs approval" chip, CSV export button), renders `RiskGrid` |
| `RiskGrid.tsx` | Spreadsheet table: `position: sticky` frozen header, sortable column headers, keyboard nav (arrow keys, Enter to open drawer), row click selects risk |
| `RiskRow.tsx` | Single grid row; renders `RiskScoreBadge` cells |
| `RiskScoreBadge.tsx` | RAG-coloured score pill for inherent / residual / target columns |
| `RiskInspector.tsx` | Detail panel rendered inside `InspectorDrawer` when a risk is selected; editable fields, controls/mitigations list, actions list, approve/reject buttons for `PendingApproval` risks |

### `src/components/Board/`

No new files at the `Board/` level. `BoardColumn` gets a render-prop so `RaidActionCard` (new file, same folder) can be slotted in.

| File | Contents |
|---|---|
| `RaidActionCard.tsx` | Card for a `RaidAction` item on the RAID Actions Board; shows title, owner, due date, risk ID, status badge |

### `src/export/`

| File | Contents |
|---|---|
| `raidCsvExport.ts` | `buildRaidCsv(risks, actions): string` and `downloadRaidCsv(...)` — flat CSV matching the column list in `raid-integration-notes.md` §5 |

---

## 3. Modified files

| File | Change |
|---|---|
| `src/domain/types.ts` | `ViewMode` extended: `'riskRegister' \| 'raidBoard'`; `AppViewState` gains `raidActionsVisibleInTimeline: boolean` and `selectedRiskId: string \| null` |
| `src/state/appState.ts` | `AppDomainState` gains `risks: Risk[]` and `raidActions: RaidAction[]`; new `AppAction` variants (§4); RAID case blocks in `appReducer` |
| `src/state/persistenceAdapter.ts` | Store key bumped to `ripple_state_v4`; `PersistedState` includes `raid` slice; `migrateDomain` fills missing fields with defaults; `migrateView` fills `raidActionsVisibleInTimeline: false`, `selectedRiskId: null` |
| `src/components/AppShell/AppShell.tsx` | `VIEW_MODES` extended with two new entries (see §6 Q1); new props for RAID-related handlers |
| `src/components/Board/Board.tsx` | `source: 'projectTasks' \| 'raidActions'` prop; column/item data via internal selector; title/meta lines driven by source |
| `src/components/Board/BoardColumn.tsx` | `renderCard: (item, selected) => ReactNode` render-prop added; existing callers pass a closure that renders `BoardCard` as before |
| `src/components/InspectorDrawer/InspectorDrawer.tsx` | New `selectedRisk` prop + `RiskInspector` branch alongside existing task and forecast branches |
| `src/components/Timeline/Timeline.tsx` | RAID Actions overlay layer (conditional on flag); RAID toggle chip in toolbar; TODO comment in render path |
| `src/App.tsx` | New view-mode cases; risk/action dispatch handlers; drawer branch for risks; RAID Actions toggle wired |
| `src/domain/seedData.ts` | `createInitialDomainState` calls `seedRisks()` and `seedRaidActions()` |

---

## 4. New `AppAction` variants

```typescript
// View
| { type: 'selectRisk'; riskId: string | null; openDrawer?: boolean }
| { type: 'setRaidActionsVisible'; value: boolean }

// Risk CRUD
| { type: 'createRisk'; risk: Risk }
| { type: 'updateRisk'; riskId: string; patch: Partial<Risk> }
| { type: 'deleteRisk'; riskId: string }

// RaidAction CRUD
| { type: 'createRaidAction'; action: RaidAction }
| { type: 'updateRaidAction'; actionId: string; patch: Partial<RaidAction> }
| { type: 'deleteRaidAction'; actionId: string }

// PendingApproval flow
| { type: 'completeRaidAction'; actionId: string; effectiveness: ImpactBand }
| { type: 'approveResidualScore'; riskId: string }
| { type: 'rejectResidualScore'; riskId: string }
```

---

## 5. Board parameterisation

`BoardColumn` gains a `renderCard` render-prop:

```typescript
renderCard: (item: WorkItem | RaidAction, selected: boolean) => ReactNode
```

`Board.tsx` passes:
- For `source='projectTasks'`: a closure that renders `<BoardCard task={item} ... />`
- For `source='raidActions'`: a closure that renders `<RaidActionCard action={item} ... />`

`BoardCard.tsx` and `BoardColumn.tsx` **behaviour is unchanged** for the project
task configuration. The existing test suite covers the task-board path before
the refactor touches anything.

The RAID Actions Board column set is fixed (`Todo`, `In Progress`, `Done`,
`Overdue`) rather than user-editable — RAID action statuses are not
programme-defined the way board columns are. The column-add/rename/delete
controls are hidden when `source='raidActions'`.

---

## 6. Open questions — decisions needed from Steven

### Q1 — Navigation structure (required before any AppShell changes)

Three options for surfacing Risk Register and RAID Actions Board:

**Option A — Flat (4-item view-switch, recommended)**
Extend the existing header `view-switch` to `Timeline | Board | Risk Register | RAID Actions`.
Simple, no new navigation hierarchy, keeps one code path for view switching.

**Option B — RAID group**
A "RAID ▾" button in the header opens a sub-menu with Register and Actions Board.
Cleaner at scale; slightly more complex to build; introduces a nav hierarchy.

**Option C — Restructured header**
The header grows a second row or a dropdown to avoid crowding.

*My recommendation: Option A. The header comfortably fits 4 items and avoids
adding a navigation model for the first increment. Revisit at v1.1 if more
RAID sub-views arrive.*

---

### Q2 — RAID Actions visual distinction in the Timeline (required before Phase 4)

**Option A — Amber bars, dedicated swimlane band**
RAID actions render as amber-coloured bars (using `--risk` / `--risk-soft`
tokens) in a labelled "RAID Actions" band below all project swimlanes.

**Option B — Flag/diamond point markers, mixed into existing swimlanes**
Point events at `dueDate` only; no bar. Drawn in the same lane as the task
they relate to (if any), or in a shared "RAID" lane.

**Option C — Dedicated band + flag marker (recommended)**
A "RAID Actions" swimlane band below project lanes. Within it, each action
renders as a short fixed-width flag bar (not a span bar) anchored at `dueDate`.
Amber/gold colour. A small "RAID" label distinguishes them from project bars.

Rationale: the band makes them spatially separate (can't be confused with
schedule tasks); the flag shape makes clear they are point-in-time governance
events, not duration-based tasks.

---

### Q3 — Board card: shared component vs render-prop (confirm)

**Option A — Single `BoardCard` with conditional logic**

**Option B — Render-prop, separate `RaidActionCard` (recommended)**

The plan above already describes Option B. Both `BoardCard` and `RaidActionCard`
slot into `BoardColumn` via the `renderCard` render-prop. No coupling between
the task and RAID domain models inside the card.

*If you prefer Option A, flag it; the change is small. If no instruction,
I will proceed with Option B.*

---

### Q4 — `PendingApproval` visual treatment (required before Phase 2)

**Option A — Amber row highlight + "Needs approval" filter chip (recommended)**
A persistent amber left-border on any row where `status === 'PendingApproval'`.
A chip above the grid labelled "Needs approval (N)" that filters to those rows.
Makes the approval queue hard to miss.

**Option B — Status badge only**
The `PendingApproval` status appears in the Status column; no special row
styling; user sorts/filters manually.

**Option C — Both A and B**
Same as A.

---

## 7. Phased commit plan

Each phase ends with a green build and is committed independently.

| Phase | Deliverables |
|---|---|
| **1 — Domain + state** | `risk.ts`, `raidAction.ts`, `raidScoring.ts`; state slice in `appState.ts`; persistence in `persistenceAdapter.ts`; unit tests for scoring/banding |
| **2 — Risk Register UI** | `RiskRegister/` folder (5 files); `RiskInspector`; CSV export; `InspectorDrawer` extended; nav entry |
| **3 — Board parameterisation** | `BoardColumn` render-prop; `RaidActionCard`; `Board` `source` prop; tests for both board configurations; nav entry |
| **4 — Timeline layer** | RAID Actions overlay; toggle chip in Timeline toolbar; TODO comment in `forecastEngine.ts` |
| **5 — Seed data** | `raidSeedData.ts`; `createInitialDomainState` extended; persistence version bump |
| **6 — Tests + docs** | Full unit test coverage for domain logic; integration tests for both board configs; README updated |

---

## 8. No-new-dependencies confirmation

| Need | Approach | New dep? |
|---|---|---|
| Grid / table | CSS grid + `position: sticky`, custom `RiskGrid.tsx` | No |
| Sorting | In-memory `.sort()` in `RiskGrid` state | No |
| UUID | `crypto.randomUUID()` (browser native, TS 4.7+) | No |
| CSV export | Manual string building, Blob download (same pattern as JSON export) | No |
| Date display | Reuse `formatShort` / `formatNice` from `src/engine/dateUtils.ts` | No |

No Tailwind, no Zustand, no TanStack Table, no router.
