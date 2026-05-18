# Phase 8b — Deliverables (handoff spec)

For: Claude Code, working in the LP3M repo
Branch: `claude/phase-8b-deliverables` (open only after Phase 8a is merged — 8a is now merged)
Status: Ready to execute.

First action: commit this file to `/docs/raid-phase-8b-handoff.md` in the repo before doing anything else. This protects it against context loss in long Claude Code sessions.

---

## 0. Operating rules (read and acknowledge before starting)

* Single branch, single PR: `claude/phase-8b-deliverables`. Do not chain other phases onto this branch.
* No mid-flight merges. Wait for explicit "merged, proceed to next phase" from Steven before opening any further branch.
* Phase 7b/7c/7d (Issues, Assumptions, Opportunities) are NOT in scope here. Do not touch them.
* Architecture continuity: no new dependencies (no Tailwind, no Zustand, no TanStack Table), no top-level feature folders (distribute by layer), no engine modifications beyond TODO comments, no breaking earlier phases.
* Persistence version bumps required at each domain model change. Migrations must be backward-clean.
* Tests gate merge. Build must be green; new tests must accompany new features.

---

## 1. Discovery (do this first, do not skip)

* Re-read merged Phase 8a code so you understand the established marker/overlay pattern (External Dependencies, purple arrows)
* Re-read `src/components/Timeline/MilestoneBar.tsx` — Ripple may already have milestone rendering primitives worth reusing rather than building fresh
* Write `/docs/phase-8b-plan.md` covering: domain, state, register, acceptance criteria sub-component, Gantt milestone integration, test coverage
* Stop. Wait for Steven to approve the plan before writing implementation code.

---

## 2. Domain — Deliverable type and AcceptanceCriterion

Add `src/domain/deliverable.ts`.

```typescript
type AcceptanceCriterion = {
  id: string
  description: string
  met: boolean
  metAt: Date | null
  metBy: string | null  // person who marked it met
}

type DeliverableStatus = 'Planned' | 'InProduction' | 'InReview' | 'Accepted' | 'Rejected'

type Deliverable = {
  id: string
  title: string
  description: string
  owner: string  // internal person reference
  targetDate: Date
  status: DeliverableStatus
  acceptanceCriteria: AcceptanceCriterion[]
  linkedTaskIds: string[]
  notes: string
  acceptedAt: Date | null
  acceptedBy: string | null
  rejectedAt: Date | null
  rejectionReason: string | null
  lastReviewedAt: Date
  createdAt: Date
}
```

Helper functions:

* `getCompletionPercentage(d: Deliverable): number` — proportion of criteria marked met
* `canBeAccepted(d: Deliverable): boolean` — true if all criteria are met
* `isOverdue(d: Deliverable, today: Date): boolean` — past target date and not Accepted

---

## 3. State changes

Add to `src/state/appState.ts`:

* `deliverables: Deliverable[]` slice
* CRUD actions: `addDeliverable`, `updateDeliverable`, `removeDeliverable`, `setDeliverableStatus`
* Acceptance criteria actions: `addAcceptanceCriterion`, `updateAcceptanceCriterion`, `removeAcceptanceCriterion`, `markCriterionMet`, `markCriterionUnmet`
* Selectors: `getOverdueDeliverables(today)`, `getDeliverablesReadyForAcceptance()` (status is InReview AND all criteria met)
* View state: `deliverablesVisibleInTimeline: boolean`, default `false`

Persistence v8. Migration: missing `deliverables` defaults to empty array; missing toggle flag defaults to `false`.

---

## 4. Deliverables Register UI

New view in AppShell view-switch.
Position: to the right of External Dependencies.
Running order in the view-switch: Timeline · Board · Risk Register · RAID Actions · External Dependencies · Deliverables · [Issues queued for 7b]

New folder `src/components/DeliverablesRegister/` containing:

* `DeliverablesRegister.tsx` — top-level view
* `DeliverablesGrid.tsx` — the table
* `DeliverableCreateForm.tsx` — used inside the wide InspectorDrawer
* `AcceptanceCriteriaEditor.tsx` — sub-component for managing the criteria list

### Columns

* ID
* Title
* Owner
* Target Date
* Status
* Completion (% bar showing criteria met / total)
* Criteria count badge
* Overdue indicator
* Linked Tasks count badge

### Filter chips

* Status (multi-select)
* Owner (multi-select)
* "Ready for acceptance" — selects deliverables where status = InReview AND all criteria met
* "Overdue"

### Sorting and styling

* Default sort: Target Date ascending
* Status colour cues: Planned = neutral, InProduction = blue tint, InReview = amber tint, Accepted = green tint, Rejected = red tint

### Nav count badge

Add a count badge to the Deliverables nav entry showing how many are "Ready for acceptance" — e.g. "Deliverables (2 ready for acceptance)". Same prominence pattern as "Needs approval" on Risks.

---

## 5. Acceptance Criteria Editor

The most important UX piece of 8b. Embedded within the InspectorDrawer when viewing/editing a deliverable.

### Behaviour

* Each criterion is a row with: checkbox (met/unmet), description text, met-by/met-at display when met
* "+ Add criterion" button reveals an inline mini-form (description text only; met defaults to false)
* Re-orderable via drag handles — lift the existing drag pattern from the Board (`useBarDrag.ts` / Board column drag). Do NOT introduce a new drag library.
* Editing a criterion description is inline (click-to-edit on the text)
* Deleting a criterion requires confirmation (irreversible)
* When a criterion is checked met, set `metAt = now` and `metBy = "system"` for now (no auth, but record the timestamp)
* Visual completion indicator at the top of the editor: "3 of 5 met"

### Empty state

A friendly hint explaining what acceptance criteria are, with examples:

* "Code reviewed by senior engineer"
* "Security scan passes with zero criticals"
* "Customer demo signed off in writing"

---

## 6. Creation and editing UX

* "+ New Deliverable" opens wide InspectorDrawer (60vw), all sections expanded, including the Acceptance Criteria Editor section
* Empty acceptance criteria list is fine on creation; PM can populate now or later
* Save and Save-and-add-another footer pattern, same as Phase 7a and 8a

---

## 7. Status workflow

Status transitions are mostly free-flowing, with two guards:

* Cannot move to Accepted unless all criteria are met (`canBeAccepted` returns true). UI must disable or hide the Accept option until this is satisfied.
* Moving to Accepted prompts for confirmation and records `acceptedAt` + `acceptedBy`
* Moving to Rejected prompts for `rejectionReason` (required, free text) and records `rejectedAt`
* Rejected → InProduction is allowed (re-work cycle)

---

## 8. Timeline overlay — green milestone diamond markers

Create `src/components/Timeline/DeliverablesOverlay.tsx`.

### Behaviour

* Renders an overlay band on the Timeline
* For each Deliverable, render a diamond shape at the deliverable's target date
* Diamond colour and fill modified by status:
  * Planned: outline only, neutral colour
  * InProduction: solid blue
  * InReview: solid amber
  * Accepted: solid green
  * Rejected: solid red
* Hover tooltip: title, owner, target date, status, completion percentage
* Click navigates to the Deliverable in the register (opens InspectorDrawer)

### Reuse before building

Reuse `MilestoneBar.tsx` primitives if they exist and fit — don't build fresh diamond rendering if there's already a milestone visual in Ripple. State in your plan whether you're reusing or building new and why.

### Stagger and Timeline window expansion

Same patterns as Phase 8a (External Dependencies) and Phase 4 (RAID Actions):

* Stagger overlapping markers within the band (3-slot vertical stagger)
* Timeline window auto-expands to include any deliverable date outside the existing range

### Band stacking order in the Timeline

Top to bottom:

1. Task rows (existing)
2. Deliverables band (NEW — closest to tasks because milestones are most tightly related to delivery work)
3. External Dependencies band (existing from 8a)
4. RAID Actions band (existing from Phase 4 — furthest because it's governance overlay)

---

## 9. Timeline toolbar toggle

Add "Deliverables" toggle chip to the Timeline toolbar, alongside the RAID actions and External dependencies chips. Default: off.

---

## 10. Seed data

Add 6 seed Deliverables appropriate to a defence programme. Variety required:

* At least one Planned (future target, no criteria met yet)
* At least one InProduction (some criteria met)
* At least one InReview with all criteria met (ready for acceptance — to demonstrate the "Ready for acceptance" filter and nav count badge)
* At least one Accepted (historic)
* At least one Rejected with rejection reason
* At least one overdue

Each deliverable should have 3–6 acceptance criteria. Criteria should sound realistic for a defence programme context, not placeholder text.

Examples for inspiration:

* "Phase 2 Critical Design Review pack" — InReview, 5 criteria, 5 met
* "Cleared engineer training material" — InProduction
* "STANAG conformance test report" — Planned
* "Integration test environment" — Accepted (historic)
* "Cyber security accreditation submission" — Rejected (rejection reason: "ITSO requested rework of section 4")
* "Q2 stakeholder briefing pack" — overdue, InProduction

Seed dates calibrated to "today" being late May 2026 so the data tells a coherent story.

---

## 11. Tests

* Domain: `getCompletionPercentage`, `canBeAccepted` (all criteria met case and mixed case), `isOverdue`
* State: CRUD on deliverables and criteria, status guards (can't Accept without all criteria met), v7→v8 migration
* Acceptance criteria editor: add, edit, delete, re-order, mark met/unmet, completion percentage updates
* Status workflow: Accept records timestamp and acceptor; Reject records reason and timestamp; Rejected→InProduction allowed
* Register filters: including "Ready for acceptance"
* Timeline overlay: diamond markers at correct positions, status-modified, stagger, toggle, hover content
* Seed data integrity: every linked task resolves, criteria counts are realistic

---

## 12. Phase 8b definition of done

* Deliverables Register reachable from AppShell view-switch in the correct position (to the right of External Dependencies)
* 6 seed deliverables render with correct columns, filters, sorting, completion bars
* Acceptance Criteria Editor works (add/edit/delete/reorder/mark met)
* Status workflow guards work (cannot Accept without all criteria met; Reject prompts for reason)
* Creating uses wide InspectorDrawer (60vw); editing uses standard width (40vw)
* Timeline has new "Deliverables" toggle chip
* Toggle on: green diamond markers appear at target dates, status-modified, click navigates to register
* Timeline band stacking order: tasks → Deliverables → External Dependencies → RAID Actions
* Nav count badge shows "Ready for acceptance" count
* All existing tests pass; new tests added; build green
* README updated to cover Deliverables
* Open PR. Stop. Wait for Steven to merge.

---

## 13. Pre-confirmed decisions (no need to ask)

Steven has pre-answered the open questions from the original handoff:

1. Timeline band order: tasks → Deliverables → External Dependencies → RAID Actions (specified in Section 8 above)
2. Acceptance Criteria reordering: drag-and-drop, lifting the existing Board drag pattern (specified in Section 5 above)
3. "Ready for acceptance" nav count badge: yes, included (specified in Section 4 above)
