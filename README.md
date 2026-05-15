# Ripple — Schedule Impact Forecasting

Ripple is a professionalised front-end prototype for schedule impact forecasting and P3M coordination.

It is not just a Kanban board. The purpose is to show the consequence of schedule movement: if one task moves, which linked tasks move, what constraints break, whether the critical path changes, and how the forecast finish changes.

## Current status

This repository is a structured Vite + React + TypeScript migration from the original single-file `ripple-v0.8.html` prototype.

This version is suitable for GitHub and Netlify deployment as a static prototype. It is **not approved for production use** and must not contain real company, customer, supplier, MOD, financial or operational data.

## Features preserved in this first structured build

- Kanban board
- Timeline view with frozen task labels
- Board / timeline / both view switching
- Parent and subtask display
- Critical path highlighting
- Locked milestone display
- Forecast preview when dates are changed
- Impact strip with apply/cancel
- Inspector drawer
- Editable task dates via inspector
- Editable task status/swimlane via inspector
- JSON export
- localStorage persistence through an adapter
- Separated schedule, dependency, forecast and impact engines

## Known limitations

This is the first professionalised build, not the final product.

The following behaviours from the original HTML are not yet fully rebuilt:

- Dependency line drawing/creation is scaffolded in the architecture but not fully reimplemented.
- Resize handles on task bars need hardening.
- Working calendar logic exists as a scaffold; schedule calculations still need full working-day arithmetic.
- Board column and swimlane editing are not yet exposed in the UI.
- Accessibility needs a proper pass, including focus trapping for future modals and keyboard alternatives for drag actions.
- Tests are starter tests only and should be expanded before serious feature work.

## Architecture

```text
src/
  domain/        Domain types and fictional seed data
  engine/        Pure scheduling, dependency, forecast, calendar and impact logic
  state/         App reducer and persistence adapter
  components/    React UI components
  styles/        Design tokens, global CSS and layout rules
  export/        JSON export and future analytics schema
  tests/         Engine test scaffolding
```

## Build principles

1. Keep domain logic independent of the UI.
2. Keep schedule calculations in engine modules.
3. Keep React components focused on rendering and dispatching actions.
4. Keep UI state separate from domain state.
5. Route persistence through `persistenceAdapter.ts`.
6. Route exports through the `export/` folder.
7. Use the overlay/z-index scale in `tokens.css`.
8. Do not invent arbitrary z-index values.
9. Avoid visible text overlap at 1440px, 1280px, 1024px and 768px widths.
10. Do not use real operational data in the prototype.

## Local development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

Run tests:

```bash
npm test
```

## Netlify deployment

Use these settings:

- Build command: `npm run build`
- Publish directory: `dist`

The included `netlify.toml` is configured for a Vite single-page app.

## GitHub setup checklist

```bash
git init
git add .
git commit -m "Initial professional Ripple prototype"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

Then connect the GitHub repository to Netlify.

## Roadmap

### Phase 1: Stabilise professional prototype

- Complete dependency drawing and editing
- Add controlled board column editing
- Add controlled swimlane editing
- Add full keyboard and accessibility support
- Add stronger scheduling tests
- Add no-overlap regression checklist

### Phase 2: Scheduling correctness

- Working-day calendar logic
- Holiday and non-working day arithmetic
- More dependency types
- Baselines
- Scenario save/compare

### Phase 3: P3M expansion

- Multi-board roadmap view
- Cross-board dependencies
- Resource demand modelling
- Cost exposure modelling
- Analytics-ready exports
- Native reporting dashboards

### Phase 4: AI-assisted insight

- AI schedule review
- AI change narrative
- AI risk summary
- AI stakeholder update generation

## Security notes

- No secrets should be committed.
- Do not add `.env` files to GitHub.
- Do not store sensitive data in localStorage.
- Do not add third-party tracking or analytics without approval.
- Keep all demo data fictional.
