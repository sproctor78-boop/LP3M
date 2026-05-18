# RAID Integration Notes — Data Model and Proposals

> Phase 0 discovery document. All scoring thresholds, storage patterns, and seed
> data below are **proposed values** for Steven's review. Nothing here is treated
> as authoritative from the P3M Governance MVP (source not accessible). Confirm
> or redirect before Phase 1 begins.

---

## 1. Scoring system — proposals

### 1.1 Probability % → 1–5 band

Non-linear: the upper bands are compressed so that "medium" sits at the
intuitive midpoint and "high" genuinely means likely.

| Band | Label | Probability % range |
|------|-------|---------------------|
| 1 | Very Low | 0–10% |
| 2 | Low | 11–25% |
| 3 | Medium | 26–50% |
| 4 | High | 51–75% |
| 5 | Very High | 76–100% |

### 1.2 Cost (£) impact 1–5 bands

Calibrated for a defence-sector programme in the £50M–£500M total-value range.

| Band | Label | £ range |
|------|-------|---------|
| 1 | Negligible | < £50k |
| 2 | Minor | £50k – £250k |
| 3 | Moderate | £250k – £1M |
| 4 | Major | £1M – £5M |
| 5 | Severe | > £5M |

### 1.3 Time (weeks) impact 1–5 bands

| Band | Label | Programme slip |
|------|-------|----------------|
| 1 | Negligible | < 1 week |
| 2 | Minor | 1–3 weeks |
| 3 | Moderate | 4–8 weeks |
| 4 | Major | 9–16 weeks |
| 5 | Severe | > 16 weeks |

### 1.4 Risk score formula

```
score = probabilityBand × max(costImpactBand, timeImpactBand)
```

Range: 1–25.

### 1.5 RAG thresholds

| RAG | Score range | Meaning |
|-----|-------------|---------|
| Green | 1–5 | Acceptable — monitor at routine intervals |
| Amber | 6–12 | Tolerable — active management, owner-level action |
| Red | 13–25 | Intolerable — escalate to programme board, immediate action |

Boundary rationale: Red starts at 3×5=15 or 4×4=16 in the raw grid, so ≥13
is the first score that represents both medium-to-high probability AND major
impact. Amber 6–12 captures the "medium/medium" quadrant, which needs managing
but not escalating.

---

## 2. Risk data model

```typescript
export type RiskStatus = 'Open' | 'Mitigated' | 'Closed' | 'PendingApproval';
export type RiskCategory =
  | 'Technical'
  | 'Resource'
  | 'Schedule'
  | 'Commercial'
  | 'Supply Chain'
  | 'Regulatory'
  | 'External';
export type RagColour = 'green' | 'amber' | 'red';
export type ImpactBand = 1 | 2 | 3 | 4 | 5;
export type ProbabilityBand = 1 | 2 | 3 | 4 | 5;

export interface RiskScore {
  probabilityPct: number;           // raw %, 0–100
  probabilityBand: ProbabilityBand; // derived from pct
  costImpact: ImpactBand;
  timeImpact: ImpactBand;
  score: number;                    // 1–25, probabilityBand × max(cost, time)
  rag: RagColour;                   // derived from score
}

export interface RiskScores {
  inherent: RiskScore;             // before any controls or mitigations
  residual: RiskScore;             // current assessed score with controls applied
  target: RiskScore;               // desired end-state after all mitigations close
}

export interface ResponseItem {
  id: string;
  type: 'control' | 'mitigation';
  description: string;
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  owner: string;                    // Person ID or free-text
  status: RiskStatus;
  scores: RiskScores;
  /** Non-null only when status === 'PendingApproval'. See §4. */
  proposedResidualScore: RiskScore | null;
  controls: ResponseItem[];
  mitigations: ResponseItem[];
  raisedDate: string;               // ISO date 'YYYY-MM-DD'
  reviewDate: string;               // ISO date 'YYYY-MM-DD'
  lastModifiedAt: string;           // ISO timestamp
}
```

**Control vs mitigation distinction:**
- A **control** is an existing safeguard that has already been applied — it
  accounts for the gap between inherent and current residual score.
- A **mitigation** is a planned response that, once enacted via its actions,
  is intended to reduce the residual score further toward the target.

---

## 3. Action data model

```typescript
export type ActionStatus = 'Todo' | 'InProgress' | 'Done' | 'Overdue';

export interface RaidAction {
  id: string;
  riskId: string;                       // parent risk
  responseItemId: string;               // parent control or mitigation ID
  responseItemType: 'control' | 'mitigation';
  title: string;
  owner: string;                        // Person ID or free-text
  dueDate: string;                      // ISO date 'YYYY-MM-DD'
  status: ActionStatus;
  /** 1–5 rating entered when the action is marked Done. Null otherwise. */
  completionEffectiveness: ImpactBand | null;
  completedAt: string | null;           // ISO timestamp
  lastModifiedAt: string;               // ISO timestamp
}
```

---

## 4. PendingApproval flow — proposed storage pattern

**Rationale for in-record storage:**
Ripple's reducer pattern works with plain, serialisable state. A separate
`pendingApprovals` collection would require cross-collection joins in selectors.
Storing `proposedResidualScore` directly on the `Risk` record keeps the risk
self-contained and follows the same pattern as `constraint` on `WorkItem` — a
field that is `null` in the normal case and populated only when a specific
condition applies.

**Flow:**

1. User marks a `RaidAction` as Done and provides `completionEffectiveness` (1–5).
2. `completeRaidAction` reducer:
   - Sets `action.status = 'Done'`, `action.completedAt`, `action.completionEffectiveness`.
   - Calculates `proposedResidualScore` from the parent risk's current `residual`:
     ```
     Proposed probability % = residual.probabilityPct × (1 − effectiveness × 0.12)
     ```
     Clamped to [1, residual.probabilityPct]. Band and score re-derived.
     Cost and time impact bands carry over unchanged (the action affects
     likelihood, not consequence magnitude, unless overridden in a future pass).
   - Sets `risk.proposedResidualScore = calculatedScore`.
   - Sets `risk.status = 'PendingApproval'`.

3. **Approve:** `approveResidualScore` reducer:
   - `risk.scores.residual = risk.proposedResidualScore`.
   - `risk.proposedResidualScore = null`.
   - `risk.status = residual.score <= target.score ? 'Mitigated' : 'Open'`.

4. **Reject:** `rejectResidualScore` reducer:
   - `risk.proposedResidualScore = null`.
   - `risk.status = 'Open'`.

The effectiveness→probability-reduction formula:

| Effectiveness | Probability reduction |
|---|---|
| 1 | ×0.88 (−12%) |
| 2 | ×0.76 (−24%) |
| 3 | ×0.64 (−36%) |
| 4 | ×0.52 (−48%) |
| 5 | ×0.40 (−60%) |

*Steven: if you'd prefer the approver to manually input the new residual
rather than accepting an auto-calculated proposal, flag it — it's a one-line
change in the reducer.*

---

## 5. CSV export — proposed column list

One row per risk; actions are summarised as counts.

```
ID
Title
Category
Owner
Status
Raised Date
Review Date
Inherent Probability %
Inherent Probability Band
Inherent Cost Impact Band
Inherent Time Impact Band
Inherent Score
Inherent RAG
Residual Probability %
Residual Probability Band
Residual Cost Impact Band
Residual Time Impact Band
Residual Score
Residual RAG
Target Probability %
Target Probability Band
Target Cost Impact Band
Target Time Impact Band
Target Score
Target RAG
Control Count
Mitigation Count
Actions Total
Actions Todo
Actions In Progress
Actions Done
Actions Overdue
```

---

## 6. Seed data — proposed (defence-sector programme)

12 risks for a fictional "Operational Capability Delivery" programme. Matches
the existing Ripple seed data theme.

### R01 — Tier 1 Supplier Financial Instability
| Field | Value |
|---|---|
| Category | Commercial |
| Owner | James Okafor (P02) |
| Status | Open |
| Inherent | 40% / Band 3 × Cost 4 × Time 4 → score **12** Amber |
| Residual | 20% / Band 2 × Cost 4 × Time 4 → score **8** Amber |
| Target | Band 1 × Cost 3 × Time 3 → score **3** Green |
| Controls | Quarterly financial-health review of all Tier 1 suppliers |
| Mitigations | Pre-qualify two alternative suppliers for each critical component |
| Actions | RA01 Done, RA02 InProgress, RA03 Todo |

### R02 — Export Licence Procurement Delay
| Field | Value |
|---|---|
| Category | Regulatory |
| Owner | Rebecca Tan (P03) |
| Status | Open |
| Inherent | 30% / Band 3 × Cost 2 × Time 3 → score **9** Amber |
| Residual | 15% / Band 2 × Cost 2 × Time 3 → score **6** Amber |
| Target | Band 1 × Cost 2 × Time 2 → score **2** Green |
| Controls | Standing early-engagement protocol with ECJU |
| Mitigations | Obtain specialist export-controls legal counsel |
| Actions | RA04 Done, RA05 InProgress |

### R03 — Insufficient Security-Cleared Engineering Resource *(PendingApproval)*
| Field | Value |
|---|---|
| Category | Resource |
| Owner | Sarah Mitchell (P01) |
| Status | **PendingApproval** |
| Inherent | 65% / Band 4 × Cost 4 × Time 4 → score **16** Red |
| Residual | 35% / Band 3 × Cost 4 × Time 4 → score **12** Amber |
| Proposed residual | 18% → Band 2 × Cost 4 × Time 4 → score **8** Amber *(from RA06 effectiveness 4)* |
| Target | Band 2 × Cost 3 × Time 3 → score **6** Amber |
| Controls | In-flight SC vetting for all identified programme staff |
| Mitigations | Framework agreement with specialist cleared-engineer staffing agency |
| Actions | RA06 **Done (effectiveness 4)**, RA07 InProgress, RA08 Todo |

### R04 — Cybersecurity Accreditation Delay (JSP 440)
| Field | Value |
|---|---|
| Category | Regulatory |
| Owner | David Chen (P04) |
| Status | Open |
| Inherent | 45% / Band 3 × Cost 2 × Time 4 → score **12** Amber |
| Residual | 20% / Band 2 × Cost 2 × Time 3 → score **6** Amber |
| Target | Band 1 × Cost 1 × Time 2 → score **2** Green |
| Controls | Dedicated DSO liaison; accreditation as a named schedule work package |
| Mitigations | Phased accreditation (interim Authority to Operate) |
| Actions | RA09 InProgress, RA10 Todo |

### R05 — Single-Source Critical Component Dependency
| Field | Value |
|---|---|
| Category | Supply Chain |
| Owner | Rebecca Tan (P03) |
| Status | Open |
| Inherent | 20% / Band 2 × Cost 5 × Time 5 → score **10** Amber |
| Residual | 10% / Band 1 × Cost 5 × Time 5 → score **5** Green |
| Target | Band 1 × Cost 4 × Time 4 → score **4** Green |
| Controls | 9-month strategic stock holding; long-term supply agreement |
| Actions | RA11 Done |

### R06 — Schedule Concurrency: Design / Procurement Overlap
| Field | Value |
|---|---|
| Category | Schedule |
| Owner | Emma Walsh (P05) |
| Status | Open |
| Inherent | 55% / Band 4 × Cost 3 × Time 3 → score **12** Amber |
| Residual | 35% / Band 3 × Cost 3 × Time 3 → score **9** Amber |
| Target | Band 2 × Cost 2 × Time 2 → score **4** Green |
| Controls | Stage-gate review before any procurement commitment |
| Mitigations | Shadow procurement activities (framework call-off ready but uncommitted) |
| Actions | RA12 Done, RA13 InProgress |

### R07 — Departure of Key Programme Personnel
| Field | Value |
|---|---|
| Category | Resource |
| Owner | Sarah Mitchell (P01) |
| Status | Mitigated |
| Inherent | 20% / Band 2 × Cost 3 × Time 2 → score **6** Amber |
| Residual | 20% / Band 2 × Cost 2 × Time 1 → score **4** Green |
| Target | Band 1 × Cost 2 × Time 1 → score **2** Green |
| Controls | Knowledge-management plan; succession planning for Tier 1 posts |

### R08 — Contractor Site Vetting / Access Delay
| Field | Value |
|---|---|
| Category | External |
| Owner | James Okafor (P02) |
| Status | Open |
| Inherent | 35% / Band 3 × Cost 2 × Time 3 → score **9** Amber |
| Residual | 15% / Band 2 × Cost 1 × Time 2 → score **4** Green |
| Target | Band 1 × Cost 1 × Time 1 → score **1** Green |
| Controls | Early submission of DV/SC applications; vetting tracker maintained |
| Mitigations | Identify lower-classification work packages to progress during vetting |

### R09 — Foreign Exchange Exposure (USD/GBP)
| Field | Value |
|---|---|
| Category | Commercial |
| Owner | Rebecca Tan (P03) |
| Status | Mitigated |
| Inherent | 25% / Band 3 × Cost 2 × Time 1 → score **6** Amber |
| Residual | 10% / Band 1 × Cost 2 × Time 1 → score **2** Green |
| Target | Band 1 × Cost 1 × Time 1 → score **1** Green |
| Controls | Forward purchasing agreement covering all committed USD spend |

### R10 — Integration Test Environment Late Availability
| Field | Value |
|---|---|
| Category | Technical |
| Owner | David Chen (P04) |
| Status | Open |
| Inherent | 50% / Band 4 × Cost 3 × Time 4 → score **16** Red |
| Residual | 25% / Band 3 × Cost 2 × Time 3 → score **9** Amber |
| Target | Band 2 × Cost 2 × Time 2 → score **4** Green |
| Controls | Priority booking of MOD integration facility (ITEF) for Q3 2026 |
| Mitigations | Hardware-in-the-Loop (HIL) virtual integration environment as fallback |
| Actions | RA14 Done, RA15 InProgress, RA16 Todo |

### R11 — Regulatory Change to DEFSTAN Requirements
| Field | Value |
|---|---|
| Category | Regulatory |
| Owner | Emma Walsh (P05) |
| Status | Open |
| Inherent | 10% / Band 1 × Cost 4 × Time 3 → score **4** Green |
| Residual | 10% / Band 1 × Cost 4 × Time 3 → score **4** Green |
| Target | Band 1 × Cost 3 × Time 2 → score **3** Green |
| Controls | Standing watch brief from MOD DAAS |
| Actions | RA19 **Overdue** |

### R12 — Incomplete Interface Control Documents
| Field | Value |
|---|---|
| Category | Technical |
| Owner | David Chen (P04) |
| Status | Open |
| Inherent | 60% / Band 4 × Cost 3 × Time 3 → score **12** Amber |
| Residual | 25% / Band 3 × Cost 2 × Time 2 → score **6** Amber |
| Target | Band 2 × Cost 2 × Time 2 → score **4** Green |
| Controls | ICD baseline review locked to design-freeze milestone |
| Mitigations | Early interface-identification workshop with all sub-system leads |
| Actions | RA17 Done, RA18 InProgress |

---

### Action register summary

| ID | Risk | Title | Owner | Due | Status | Effectiveness |
|---|---|---|---|---|---|---|
| RA01 | R01 | Conduct financial due-diligence on Tier 1 suppliers | P02 | 2026-05-12 | Done | 3 |
| RA02 | R01 | Pre-qualify alternative suppliers for critical components | P03 | 2026-06-30 | InProgress | — |
| RA03 | R01 | Negotiate step-in rights clause in Tier 1 contracts | P02 | 2026-06-15 | Todo | — |
| RA04 | R02 | Submit draft export licence application to ECJU | P03 | 2026-05-05 | Done | 4 |
| RA05 | R02 | Obtain specialist export-controls legal counsel | P03 | 2026-06-10 | InProgress | — |
| RA06 | R03 | Place framework agreement with cleared-engineer staffing agency | P01 | 2026-05-09 | Done | 4 |
| RA07 | R03 | Accelerate SC vetting for 8 identified programme staff | P01 | 2026-06-06 | InProgress | — |
| RA08 | R03 | Review schedule for tasks executable below SC clearance | P05 | 2026-05-30 | Todo | — |
| RA09 | R04 | Submit ITHC work order to SIRO | P04 | 2026-05-22 | InProgress | — |
| RA10 | R04 | Request interim Authority to Operate (iATO) from DSO | P04 | 2026-06-20 | Todo | — |
| RA11 | R05 | Review and increase minimum stock holding to 9 months | P03 | 2026-05-01 | Done | 5 |
| RA12 | R06 | Convene concurrency risk review with programme board | P05 | 2026-05-08 | Done | 3 |
| RA13 | R06 | Prepare shadow procurement documents for top-3 packages | P05 | 2026-06-27 | InProgress | — |
| RA14 | R10 | Reserve ITEF booking for Q3 2026 | P04 | 2026-05-01 | Done | 4 |
| RA15 | R10 | Scope and commission HIL virtual integration environment | P04 | 2026-06-30 | InProgress | — |
| RA16 | R10 | Define minimum viable test suite for pre-ITEF dry run | P04 | 2026-07-18 | Todo | — |
| RA17 | R12 | Schedule ICD identification workshop with sub-system leads | P04 | 2026-05-15 | Done | 3 |
| RA18 | R12 | Draft ICD register for all identified interfaces | P04 | 2026-06-19 | InProgress | — |
| RA19 | R11 | Submit NATO STANAG compliance register | P05 | 2026-04-28 | **Overdue** | — |

Action status distribution: **Done** × 6, **InProgress** × 6, **Todo** × 4, **Overdue** × 1. Captures all four statuses.

---

## 7. Variety coverage check

| Dimension | Covered |
|---|---|
| Green inherent risk | R05 (10% × 4), R07, R09, R11 |
| Amber inherent risk | R01, R02, R04, R06, R08, R12 |
| Red inherent risk | R03 (65% × 4 = 16), R10 (50% × 4 = 16) |
| PendingApproval | R03 |
| Mitigated | R07, R09 |
| Controls only | R05, R07, R08, R09, R11 |
| Controls + Mitigations | R01, R02, R03, R04, R06, R10, R12 |
| All 4 action statuses | Done (RA01, RA04, RA06, RA11, RA12, RA14, RA17), InProgress (RA02, RA05, RA07, RA09, RA13, RA15, RA18), Todo (RA03, RA08, RA10, RA16), Overdue (RA19) |
| All 7 categories | Technical, Resource, Schedule, Commercial, Supply Chain, Regulatory, External |
| All 5 owners | P01–P05 |
