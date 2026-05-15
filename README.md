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
    ├── engine/              # Pure scheduling engine
    │   ├── dateUtils.ts
    │   ├── calendarEngine.ts
    │   ├── dependencyEngine.ts
    │   ├── scheduleEngine.ts
    │   ├── constraintEngine.ts
    │   ├── forecastEngine.ts
    │   └── impactEngine.ts
    ├── state/               # Reducer + localStorage adapter
    ├── components/
    │   ├── AppShell/        # Header, view switch
    │   ├── Board/           # Kanban board
    │   ├── Timeline/        # Timeline + drag hooks + dep lines
    │   ├── InspectorDrawer/ # Right rail (task inspector + impact panel)
    │   ├── ImpactStrip/     # Forecast summary above the timeline
    │   ├── Modals/          # Task creator, settings
    │   ├── Legend/
    │   ├── StatusPill/
    │   └── Toasts/          # Hint
    ├── export/              # JSON export (Ripple Export v1)
    └── tests/               # Vitest unit tests
```

### Architecture in one paragraph

The engine in `src/engine/` is pure TypeScript. It takes work items in and
returns work items out. Nothing in the engine touches the DOM, React, or
localStorage. The reducer in `src/state/appState.ts` is the single point at
which a user action becomes a new state — it composes engine functions and
returns a new `AppState`. React components only read state and dispatch
actions; they never call engine functions directly. The persistence adapter
serialises state to localStorage with a version key (`ripple_state_v3`); the
pending forecast is intentionally excluded so a refresh always lands on a
committed state.

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
