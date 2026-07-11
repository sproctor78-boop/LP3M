# Ripple — Schedule Impact Forecasting

A prototype for forecasting the downstream effect of any schedule change on a
multi-stream programme. Drag a task on the timeline and Ripple computes which
tasks shift, which constraints break, and how the forecast finish date moves —
all before the change is applied.

This repository is the **Vite + React + TypeScript** port of the original
single-file HTML prototype (`ripple-v0_8.html`). The visual design, scheduling
engine, and interaction model are preserved; what changed is the structure:
the engine is now pure TypeScript, the UI is a tree of React components, and
the project is set up for CI, testing, and Netlify deployment.

---

## Getting started

Requires Node 20 or higher.

```bash
npm install        # one time
npm run dev        # local dev server (Vite, hot reload)
npm run build      # production build → dist/
npm run preview    # serve the built dist/ locally
npm run test       # vitest unit tests
npm run test:watch # vitest in watch mode
```

The dev server prints a localhost URL. Open it in any modern browser.

---

## Project structure

```
ripple/
├── index.html               # Vite entry HTML
├── netlify.toml             # Netlify deploy config
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx             # React mount
    ├── App.tsx              # Root composition (reducer + modal state)
    ├── styles/              # CSS tokens, global, layout
    ├── domain/              # Types, constants, seed data
    │   ├── types.ts         # All shared domain types + re-exports
    │   ├── risk.ts          # Risk / RiskScore / ResponseItem types
    │   ├── raidAction.ts    # RaidAction / ActionStatus types
    │   ├── raidScoring.ts   # Pure scoring functions (probabilityToBand, buildRiskScore …)
    │   ├── seedData.ts      # Programme task + people seed data
    │   └── raidSeedData.ts  # 12 risks + 19 actions seed data
    ├── engine/              # Pure scheduling engine
    │   ├── dateUtils.ts
    │   ├── calendarEngine.ts
    │   ├── dependencyEngine.ts
    │   ├── scheduleEngine.ts
    │   ├── constraintEngine.ts
    │   ├── forecastEngine.ts
    │   └── impactEngine.ts
    ├── state/               # Reducer + localStorage adapter
    ├── export/              # JSON export + RAID CSV export
    ├── components/
    │   ├── AppShell/        # Header, 4-item view switch
    │   ├── Board/           # Kanban board (project tasks + RAID actions)
    │   │   ├── Board.tsx           # source prop selects project / RAID mode
    │   │   ├── BoardColumn.tsx     # render-prop column (task or custom card)
    │   │   ├── BoardCard.tsx       # project task card
    │   │   ├── RaidActionCard.tsx  # RAID action card
    │   │   └── boardHelpers.ts     # pure tasksForColumn / actionsForColumn
    │   ├── Timeline/        # Timeline + drag hooks + dep lines + RAID overlay
    │   │   └── RaidActionsOverlay.tsx  # amber flag-marker band
    │   ├── RiskRegister/    # Risk register table + inspector
    │   │   ├── RiskRegister.tsx    # toolbar, filters, export
    │   │   ├── RiskGrid.tsx        # sortable table
    │   │   ├── RiskScoreBadge.tsx  # RAG score chip
    │   │   └── RiskInspector.tsx   # detail panel + approval form
    │   ├── InspectorDrawer/ # Right rail (task / risk / action / forecast)
    │   │   └── RaidActionInspector.tsx  # action detail + mark-complete
    │   ├── ImpactStrip/     # Forecast summary above the timeline
    │   ├── Modals/          # Task creator, settings
    │   ├── Legend/
    │   ├── StatusPill/
    │   └── Toasts/          # Hint
    └── tests/               # Vitest unit tests (87 tests across 7 files)
```

### Architecture in one paragraph

The engine in `src/engine/` is pure TypeScript. It takes work items in and
returns work items out. Nothing in the engine touches the DOM, React, or
localStorage. The reducer in `src/state/appState.ts` is the single point at
which a user action becomes a new state — it composes engine functions and
returns a new `AppState`. React components only read state and dispatch
actions; they never call engine functions directly. The persistence adapter
serialises state to localStorage with a version key (`ripple_state_v5`); the
pending forecast is intentionally excluded so a refresh always lands on a
committed state.

### RAID scoring

Risk scores use a `probabilityBand × max(costImpact, timeImpact)` formula
(range 1–25). Bands follow HM Treasury Orange Book symmetric quintiles.
RAG: Green 1–5 · Amber 6–12 · Red ≥ 13. All scoring logic is in
`src/domain/raidScoring.ts` — pure functions with no side effects, tested
independently of the UI.

### Board parameterisation

`BoardColumn` accepts an optional `renderCard` render-prop. When provided it
renders `ownItems` flat using the custom renderer, bypassing all task-specific
logic. The project-tasks Board and the RAID Actions Board share all column
drag-and-drop mechanics through this seam — the RAID Board path passes
`RaidActionCard` as the renderer and `RAID_BOARD_COLUMNS` as the fixed column
set. The existing project board is entirely unmodified.

### PendingApproval governance flow

1. A `RaidAction` is marked Done with an effectiveness rating (1–5).
2. The parent `Risk.status` moves to `PendingApproval`.
3. An approver opens the risk in the inspector, manually enters a new residual
   probability %, cost impact, and time impact.
4. Approve → updates `risk.scores.residual`; status becomes Mitigated if the
   new residual score ≤ target score, otherwise Open.
5. Reject → clears `proposedResidualScore`; status reverts to Open.

There is no auto-calculation formula. The approver is the governance actor.

### Future engine integration seam

`src/engine/` is intentionally unchanged in this pass. When the engine is
extended to model schedule risk (Monte Carlo date ranges, risk-adjusted float),
the seam is `raidScoring.ts` → schedule engine: supply risk score and
probability to a simulation pass that widens float bands on critical-path tasks
linked to open/red risks. The data model supports this: `Risk` records carry
all three score tiers (inherent / residual / target) and `RaidAction` records
carry `dueDate` and `completionEffectiveness` for weighting.

### Overlay (z-index) scale

All overlay layering is defined as CSS custom properties in
`src/styles/tokens.css` (`--z-base` … `--z-toast`). Components reference these
tokens; raw `z-index` values are not used.

| Token            | Used for                                                  |
| ---------------- | --------------------------------------------------------- |
| `--z-task`       | task bars, milestones                                     |
| `--z-annotation` | today line, dep lines, forecast ghosts                    |
| `--z-sticky`     | sticky timeline headers, sticky group labels              |
| `--z-controls`   | dep handles, resize handles                               |
| `--z-popover`    | dep popover, inline rename inputs                         |
| `--z-panel`      | inspector drawer                                          |
| `--z-strip`      | impact strip                                              |
| `--z-modal`      | modal backdrops + modals                                  |
| `--z-drag`       | active drag/draw layer                                    |
| `--z-toast`      | hint                                                      |

---

## Deploying to Netlify

1. Push this repository to GitHub.
2. In Netlify, **Add new site → Import an existing project** and pick the repo.
3. Netlify will read `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 20
4. SPA fallback is already configured (`/*` → `/index.html`).

That's it. The first deploy should succeed without any additional settings.

### Custom domain

If you point a domain at the Netlify site, you may also want to add the
deployed URL to `index.html` `<meta>` tags. The bundle itself is static and has
no environment-specific configuration.

---

## Pushing to GitHub for the first time

From the project root:

```bash
git init
git add .
git commit -m "Initial commit — Ripple v0.9 React/TS port"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

Netlify will pick the next push up automatically once connected.

---

## What's here in this version

The interface has four top-level views, switchable from the header:

- **Timeline.** MS-Project-style Gantt with a task list + splitter. Drag any
  bar to forecast schedule impact. Toggle "RAID actions" to overlay amber flag
  markers at each action's due date.
- **Board.** Kanban view of project tasks with editable columns.
- **Risk Register.** Sortable/filterable table of programme risks with
  inherent / residual / target RAG scores, CSV export, and a
  "Needs approval" filter for the PendingApproval workflow.
- **RAID Actions Board.** Fixed four-column kanban (To Do · In Progress ·
  Done · Overdue) showing all RAID actions. Drag to change status; click to
  open the action inspector and mark complete.

| Feature                                  | Status   |
| ---------------------------------------- | -------- |
| Forward-pass scheduling                  | ✅       |
| Backward pass + critical path + float    | ✅       |
| Constraint types (4 + dependency conflict) | ✅     |
| Forecast preview with full impact diff   | ✅       |
| Apply forecast with auto-pin on revert   | ✅       |
| Bar drag, left-resize, right-resize      | ✅       |
| Dep handle drag to create new dependency | ✅       |
| Dep popover (type / lag / delete)        | ✅       |
| Zoom presets, slider, fit-to-screen      | ✅       |
| Group-by lens (swimlane / parent / status / none) | ✅ |
| Editable columns (rename / add / delete) | ✅       |
| Editable swimlanes (rename / add / delete) | ✅     |
| Task creator modal                       | ✅       |
| Settings modal (highlight weekends, holidays) | ✅  |
| Parent / subtask rollups                 | ✅       |
| Parents as ghost headers on the board    | ✅       |
| Colour tags                              | ✅       |
| JSON export (`ripple.export.v1`)         | ✅       |
| Versioned localStorage persistence       | ✅       |
| Weekend / holiday visual overlays        | ✅       |
| Today line                               | ✅       |
| Hint toasts                              | ✅       |
| Escape / click-outside handling          | ✅       |
| MS-Project-style task list + splitter    | ✅       |
| % complete (editable, with bar overlay)  | ✅       |
| **Risk Register** (12 seed risks, sortable, filterable, CSV export) | ✅ |
| **RAID Actions Board** (fixed 4-column kanban, drag to change status) | ✅ |
| **Timeline RAID overlay** (amber flag markers at due dates, toggle chip) | ✅ |
| **PendingApproval governance workflow** (complete action → approver reviews → approve/reject) | ✅ |
| **RAID scoring engine** (Orange Book–aligned probability bands, RAG 1–25 scale) | ✅ |
| **Defence-sector seed data** (12 risks R01–R12, 19 actions RA01–RA19) | ✅ |

### Known limitations (not yet implemented)

- Working-calendar arithmetic. Weekends and holidays display visually but are
  not yet skipped in duration / date math. `calendarEngine.ts` includes a
  scaffolded `addWorkingDays`; wiring it into the schedule engine is a future
  release.
- Multi-select. Tasks are selected and edited one at a time.
- Undo / redo. The reducer is structured to support this (single source of
  state mutation), but no undo stack is in place.
- Backend persistence. State lives in `localStorage` only.
- Authentication / multi-user. None.

---

## Roadmap

1. **v0.10 — Working calendar math.** Wire `addWorkingDays` into the forward
   pass; constraint dates respect non-working days.
2. **v0.11 — Multi-select + bulk move.** Select multiple bars; drag them as a
   group; preview the combined impact.
3. **v0.12 — Undo / redo.** Action history with bounded depth.
4. **v0.13 — Server persistence.** Replace the localStorage adapter with an
   HTTP adapter against a backend that will be added separately.

---

## Security and data handling

This prototype is for design and feedback only. **Do not use it with real
operational data.** Specifically:

- All data is fictional. The seed (`src/domain/seedData.ts`) describes a
  generic capability-delivery example.
- The app does not call any backend. State is held in memory and (optionally)
  in `localStorage` on the user's own machine.
- There is no authentication or access control.
- No third-party analytics are loaded.
- The only external dependency at runtime is Google Fonts (`fonts.googleapis.com`)
  for the Inter and JetBrains Mono webfonts. Remove those `<link>` tags in
  `index.html` if even that level of third-party network access is
  unacceptable in your deployment context.

If you want to demo this with sample programme data, replace
`src/domain/seedData.ts` with your own fictional examples. Do not commit real
data to the repository.

---

## Reporting issues

This is a single-author prototype. Open a GitHub issue describing the bug or
suggestion; include the browser, viewport size, and a screenshot or short
recording where possible.
