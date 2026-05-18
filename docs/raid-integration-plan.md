# RAID Integration Plan — Ripple

> Phase 0 plan. For Steven's review before any implementation code is written.
> Branch: `claude/integrate-raid-log-ripple-2UgGP`

---

## Summary

RAID (Risks and Actions only in this pass) is integrated into Ripple as a
first-class feature distributed across the existing layer structure — domain,
state, components, export — rather than as a sub-app. No new top-level folders.
No new frameworks.

---

## 1. New files and where they live

### `src/domain/`
| File | Purpose |
|---|---|
| `risk.ts` | `Risk`, `RiskScore`, `RiskScores`, `RiskCategory`, `RiskStatus`, `Control`, `Mitigation` types |
| `raidAction.ts` | `RaidAction`, `ActionStatus` types |
| `raidScoring.ts` | Pure helpers: probability→band, score calculation, RAG colour, proposed-residual computation |
| `raidSeedData.ts` | Seed risks + actions (ported from P3M Governance MVP) |

### `src/state/`
No new files; `appState.ts` and `persistenceAdapter.ts` are extended in place.

### `src/components/RiskRegister/`
| File | Purpose |
|---|---|
| `RiskRegister.tsx` | Outer container, toolbar (search, filter, CSV export button) |
| `RiskGrid.tsx` | Spreadsheet-feel table: frozen header, sortable columns, inline cell edit, keyboard nav |
| `RiskRow.tsx` | A single row; clicking opens risk in InspectorDrawer |
| `RiskScoreBadge.tsx` | RAG pill/badge showing score and colour |
| `RiskInspector.tsx` | Content rendered inside the existing InspectorDrawer when a risk is selected |

### `src/export/`
| File | Purpose |
|---|---|
| `raidCsvExport.ts` | Builds and downloads the risk CSV |

### `src/components/Board/`
No new files. `Board.tsx`, `BoardColumn.tsx`, `BoardCard.tsx` are refactored
to accept a `source` prop (see section 4).

---

## 2. Files modified

| File | Change |
|---|---|
| `src/domain/types.ts` | Add `ViewMode` values `'riskRegister'` and `'raidBoard'`; extend `AppViewState` with `raidActionsVisibleInTimeline: boolean`, `selectedRiskId: string \| null` |
| `src/state/appState.ts` | Add RAID slices to `AppDomainState`; new action types for risk/action CRUD and `PendingApproval` flow; new selectors |
| `src/state/persistenceAdapter.ts` | Bump store version to `v4`; persist `raid` domain slice; `migrateDomain` fills defaults |
| `src/components/AppShell/AppShell.tsx` | Extend `VIEW_MODES` to include Risk Register and RAID Actions Board entries (3 open questions — see section 6) |
| `src/components/Board/Board.tsx` | Accept `source: 'projectTasks' \| 'raidActions'` prop; read items via selector |
| `src/components/Board/BoardColumn.tsx` | Accept generic item type; delegate card rendering to a render-prop or typed sub-component |
| `src/components/Board/BoardCard.tsx` | Either generic-ified or kept task-specific with a new `RaidActionCard.tsx` sibling (see section 6 Q3) |
| `src/components/InspectorDrawer/InspectorDrawer.tsx` | Add a `selectedRisk` branch that renders `RiskInspector` |
| `src/components/Timeline/Timeline.tsx` | Add RAID Actions overlay layer (conditional on `raidActionsVisibleInTimeline`); add toggle control |
| `src/App.tsx` | Wire new view modes, risk/action dispatch handlers, and drawer branch |
| `src/domain/seedData.ts` | Re-export via `createInitialDomainState` — extend to call `raidSeedData` |

---

## 3. State shape changes

### Domain additions (inside `AppDomainState`)

```typescript
interface AppDomainState {
  // existing…
  risks: Risk[];
  raidActions: RaidAction[];
}
```

### View additions (inside `AppViewState`)

```typescript
interface AppViewState {
  // existing…
  mode: ViewMode;  // extended to include 'riskRegister' | 'raidBoard'
  raidActionsVisibleInTimeline: boolean;  // default false
  selectedRiskId: string | null;
}
```

### New action types in `AppAction`

```
// RAID view
| { type: 'setRaidActionsVisible'; value: boolean }
| { type: 'selectRisk'; riskId: string | null; openDrawer?: boolean }

// Risk CRUD
| { type: 'createRisk'; risk: Risk }
| { type: 'updateRisk'; riskId: string; patch: Partial<Risk> }
| { type: 'deleteRisk'; riskId: string }

// Action CRUD + complete flow
| { type: 'createRaidAction'; action: RaidAction }
| { type: 'updateRaidAction'; actionId: string; patch: Partial<RaidAction> }
| { type: 'deleteRaidAction'; actionId: string }
| { type: 'completeRaidAction'; actionId: string; effectiveness: 1|2|3|4|5 }
  // ↑ sets action.status = 'Done', proposes new residual on parent risk,
  //   sets risk.status = 'PendingApproval'
| { type: 'approveResidualScore'; riskId: string }
| { type: 'rejectResidualScore'; riskId: string }
```

---

## 4. Board parameterisation strategy

The existing `Board` component is tightly coupled to `WorkItem` but it's
mechanically clean enough to parameterise. The plan:

1. `Board.tsx` gains a `source: 'projectTasks' | 'raidActions'` prop.
2. Columns and cards are selected via a helper that returns the right data
   based on `source`.
3. For `'projectTasks'`: existing `WorkItem` columns/tasks, unchanged behaviour.
4. For `'raidActions'`: `ActionStatus` buckets (`Todo`, `InProgress`, `Done`,
   `Overdue`) as columns; `RaidAction` items as cards.

`BoardCard.tsx` shape diverges enough (risk actions have `dueDate` and `riskId`;
project tasks have `startDate`/`endDate`/`isMilestone`) that the cleanest
approach is a **render-prop on `BoardColumn`**: it receives an item and returns
a JSX node. `BoardCard` stays as-is for project tasks; a new `RaidActionCard`
is added for RAID actions. `BoardColumn` itself (drag/drop, header, count) is
fully reused. **Question Q3 below asks Steven to confirm this direction.**

---

## 5. Timeline RAID Actions layer

- When `raidActionsVisibleInTimeline` is `true`, RAID actions are rendered as
  an additional set of rows **below** the project task rows, in a visually
  distinct group (separate swimlane-style band labelled "RAID Actions").
- Each action renders as a point marker (diamond or flag) at its `dueDate`, or
  as a short bar if a `startDate` is also present. Visual distinction: use
  `--risk` / `--risk-soft` tokens from `tokens.css` (amber family) so they
  are clearly differentiated from project task bars.
- Toggle: a chip button in the Timeline toolbar (same style as
  `milestones-only-chip`) labelled "RAID Actions".
- RAID actions do **not** feed the forecast engine in this pass. A `// TODO`
  comment is left in `src/engine/forecastEngine.ts` marking where RAID action
  due-date pressure would be registered.

---

## 6. Open questions for Steven (required before Phase 1)

These must be answered before implementation begins.

**Q1 — Navigation structure**
Should Risk Register and RAID Actions Board appear as:

- **Option A:** Separate entries in the header `view-switch` alongside Timeline
  and Board (simple; keeps one flat nav bar, but with 4 items it's busier)
- **Option B:** A "RAID" grouping in the header that expands to show
  Register / Actions Board sub-views (cleaner at scale, slightly more complex
  to build)
- **Option C:** Risk Register and RAID Actions Board each get their own
  `view-switch` entry, but the header is restructured (e.g. two rows or a
  dropdown) to keep it uncluttered

*Recommendation:* Option A to start — 4 items is still readable and avoids
introducing a navigation hierarchy for now.

**Q2 — RAID Actions visual distinction in the Timeline**
Which of these:

- **Option A:** Amber/gold bars using existing `--risk` / `--risk-soft` tokens,
  rendered in a dedicated "RAID Actions" swimlane band below all project lanes
- **Option B:** Same lanes as project tasks, but a different bar shape (e.g.
  flag icon at due-date rather than a full bar)
- **Option C:** Separate swimlane band (as A) with a flag-at-due-date marker
  (as B) — the band makes them groupable; the marker makes them clearly not tasks

*Recommendation:* Option C. The swimlane band keeps RAID actions spatially
separate and the flag marker makes clear these are point-in-time governance
events, not schedule tasks.

**Q3 — Board parameterisation: shared card or separate card component?**
The `WorkItem` and `RaidAction` shapes differ enough (dates, IDs, metadata)
that a single `BoardCard` can't render both without conditional logic that
would grow over time.

- **Option A:** Refactor `BoardCard` to accept a generic union type and branch
  internally — simpler now, but adds coupling between task and RAID concepts
- **Option B:** Keep `BoardCard.tsx` for tasks; add `RaidActionCard.tsx` for
  RAID actions; `BoardColumn.tsx` accepts a render-prop to decide which to use
  — cleaner separation, slightly more boilerplate, future-proof

*Recommendation:* Option B. The render-prop lets both board flavours reuse all
the drag/drop and column mechanics while keeping card rendering independent.
**If you agree, I'll proceed with Option B without further confirmation.**
**If you disagree, stop me before Phase 3.**

**Q4 — `PendingApproval` visual treatment**
Should risks in `PendingApproval` status:

- **Option A:** Show a prominent amber highlight row in the Risk Register, with
  a dedicated "Needs approval" filter chip above the grid
- **Option B:** Show only the `PendingApproval` badge in the status column;
  no special filter (user can sort/filter the grid column)
- **Option C:** Both A and B — highlighted row AND a filter chip

*Recommendation:* Option A. The approval flow is a governance gate and should
be hard to miss.

---

## 7. Phased commit plan

| Phase | Commits |
|---|---|
| Phase 1 | Domain types + scoring helpers + state slice + persistence |
| Phase 2 | Risk Register UI + RiskInspector + CSV export |
| Phase 3 | Board parameterisation + RaidActionCard + tests for both configs |
| Phase 4 | Timeline RAID layer + toggle control |
| Phase 5 | Seed data |
| Phase 6 | Tests + README updates |

Each phase commits a green build. No WIP commits.

---

## 8. Dependencies / no-new-frameworks confirmation

| Need | Solution | New dependency? |
|---|---|---|
| Spreadsheet-feel table | Custom `RiskGrid.tsx` using CSS grid + `position: sticky` header row | No |
| Sorting | In-memory array sort in `RiskGrid` | No |
| UUID generation | `crypto.randomUUID()` (browser native, TS 4.7+) | No |
| CSV export | Manual string building in `raidCsvExport.ts` | No |
| Date arithmetic | Reuse existing `src/engine/dateUtils.ts` | No |

No Tailwind, no Zustand, no TanStack Table, no router introduced.
