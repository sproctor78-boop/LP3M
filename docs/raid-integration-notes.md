# RAID Integration Notes — P3M Governance MVP Reference

> Phase 0 discovery document. Written from the handoff specification and direct
> inspection of the P3M Governance MVP description. The P3M Governance repository
> is not available via the current GitHub scope; notes are based on the authoritative
> handoff document (section 2) supplemented by standard RAID log conventions.
> **Steven: if any of the summaries below misrepresent what is actually in the MVP
> source, please correct before Phase 1 starts.**

---

## 1. Risk data model

### Core fields (inferred from handoff + RAID conventions)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | UUID |
| `title` | `string` | Short risk statement |
| `description` | `string` | Detailed narrative |
| `category` | `RiskCategory` | e.g. Technical, Resource, External, Schedule, Commercial |
| `owner` | `string` | Person ID or free-text name |
| `status` | `RiskStatus` | `Open`, `Mitigated`, `Closed`, `PendingApproval` |
| `raisedDate` | ISO date string | When the risk was first logged |
| `reviewDate` | ISO date string | Next scheduled review |
| `lastModifiedAt` | ISO timestamp | For auditing |

### Scoring dimensions — two axes, two impact types

Each dimension has an **inherent** score (before controls), a **residual** score
(after controls), and a **target** score (where we want to get to):

**Probability**
- Raw value: percentage `0–100`
- Banded to `1–5` (very low → very high) for display and RAG rating

**Impact — Cost (£)**
- Scored `1–5` corresponding to banded monetary ranges
- Exact band thresholds are defined in the MVP; placeholders below, to be
  confirmed from source:
  - 1 = negligible (<£10k), 2 = minor (£10k–£50k), 3 = moderate (£50k–£200k),
    4 = major (£200k–£1m), 5 = severe (>£1m)

**Impact — Time (weeks)**
- Scored `1–5` corresponding to banded week-slip ranges
- Exact thresholds to be confirmed from source

**Risk Score = Probability band × max(Cost impact, Time impact)**
- Produces a `1–25` integer
- RAG: Green ≤ 5, Amber 6–12, Red ≥ 13 (thresholds to be confirmed)

The full score object shape:

```typescript
interface RiskScore {
  probabilityPct: number;        // raw %, 0–100
  probabilityBand: 1|2|3|4|5;   // derived
  costImpact: 1|2|3|4|5;
  timeImpactWeeks: 1|2|3|4|5;
  score: number;                 // 1–25
}

interface RiskScores {
  inherent: RiskScore;
  residual: RiskScore;
  target: RiskScore;
}
```

### Controls vs mitigations

The MVP distinguishes two response types on a risk:

- **Control** — a measure already in place that reduces the inherent score to the
  residual score (existing safeguard)
- **Mitigation** — a planned action that, once complete, is expected to reduce the
  residual score further toward the target score

Both are "response items" on a risk. An **Action** is created to implement a
control or mitigation.

---

## 2. Action data model

Actions implement a control or mitigation on a risk.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | UUID |
| `riskId` | `string` | Parent risk ID |
| `parentType` | `'control' \| 'mitigation'` | Which response type it implements |
| `title` | `string` | What needs to be done |
| `owner` | `string` | Person responsible |
| `dueDate` | ISO date string | |
| `status` | `ActionStatus` | `Todo`, `InProgress`, `Done`, `Overdue` |
| `completionEffectiveness` | `1\|2\|3\|4\|5 \| null` | Set when action is marked complete; drives residual recalc proposal |
| `completedAt` | ISO timestamp or null | |
| `lastModifiedAt` | ISO timestamp | |

Actions are what appear on the **RAID Actions Board** (grouped by status) and in
the **Timeline** (as a visual layer, spanning `dueDate` as a point or a range).

---

## 3. `PendingApproval` flow (residual-score recalculation proposal)

When a user marks an action as complete and provides a `completionEffectiveness`
rating:

1. The system calculates a **proposed new residual score** on the parent risk,
   factoring in the effectiveness rating.
2. The parent risk's `status` transitions to `PendingApproval`.
3. A reviewer can then **approve** (committing the new residual scores) or
   **reject** (reverting to the previous residual scores).

This flow is why `PendingApproval` is a first-class status on the Risk, not on
the Action — it represents a risk record awaiting governance sign-off on a
proposed score change, not an action awaiting work.

The proposed residual score is likely stored as a transient or staged field on
the risk record (e.g. `proposedResidualScore: RiskScore | null`).

---

## 4. CSV export shape (inferred)

The MVP exports a flat CSV of risks with denormalised action counts. Expected
columns (to be confirmed from source):

```
ID, Title, Category, Owner, Status,
InherentProbabilityPct, InherentCostImpact, InherentTimeImpact, InherentScore,
ResidualProbabilityPct, ResidualCostImpact, ResidualTimeImpact, ResidualScore,
TargetProbabilityPct, TargetCostImpact, TargetTimeImpact, TargetScore,
ControlCount, MitigationCount, ActionCount, RaisedDate, ReviewDate
```

---

## 5. Demo / seed data to preserve

The handoff calls for seed data with sufficient variety to demonstrate:

- Risks with low/medium/high probability × cost/time impact combinations
- At least one risk per RAG colour (green, amber, red)
- Both controls and mitigations on some risks
- Actions in each status column (Todo, InProgress, Done, Overdue)
- At least one risk in `PendingApproval` (to demonstrate the residual-recalc flow)

The actual seed records from the P3M Governance MVP should be ported verbatim
once source access is available. Until then, seed data will be authored to
match the above variety requirements.

---

## 6. Open questions on the MVP (to resolve before Phase 1)

1. **Exact probability→band thresholds.** Is it linear (0–20% = 1, 21–40% = 2, …)
   or non-linear?
2. **Exact cost and time impact band thresholds** (the £ and week ranges for each
   1–5 band).
3. **RAG score thresholds** (Green/Amber/Red breakpoints on the 1–25 scale).
4. **Proposed residual score storage.** Is it a staged `proposedResidualScore`
   field on the risk, or a separate pending object?
5. **CSV vs JSON export.** Does the MVP export both, or only CSV?
6. **Action timeline shape.** Do actions appear as bars (start→due) or as point
   events (due-date only)?
7. **Exact seed data records** — need source access to port these accurately.
