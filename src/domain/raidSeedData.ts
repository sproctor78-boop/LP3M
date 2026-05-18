// =============================================================================
// RAID seed data — Operational Capability Delivery (FICTIONAL)
// =============================================================================
// 12 defence-sector risks (R01–R12) and 19 actions (RA01–RA19).
// Covers all 7 categories, all 4 action statuses, all 3 RAG colours,
// PendingApproval workflow (R03), Mitigated status (R07, R09).
// =============================================================================

import { Risk } from './risk';
import { RaidAction } from './raidAction';
import { buildRiskScore } from './raidScoring';

const TS = '2026-05-01T09:00:00.000Z';

export function seedRisks(): Risk[] {
  return [
    // -------------------------------------------------------------------------
    // R01 — Tier 1 Supplier Financial Instability · Commercial · Amber
    // -------------------------------------------------------------------------
    {
      id: 'R01',
      title: 'Tier 1 Supplier Financial Instability',
      description:
        'The primary Tier 1 supplier may face cash-flow difficulties or insolvency during the delivery phase, disrupting component supply and on-site support.',
      category: 'Commercial',
      owner: 'P02',
      status: 'Open',
      scores: {
        inherent: buildRiskScore(40, 4, 4), // band 3 × 4 = 12 Amber
        residual: buildRiskScore(20, 4, 4), // band 2 × 4 = 8 Amber
        target:   buildRiskScore(5,  3, 3), // band 1 × 3 = 3 Green
      },
      proposedResidualScore: null,
      controls: [
        { id: 'R01-C1', type: 'control', description: 'Quarterly financial-health review of all Tier 1 suppliers' },
      ],
      mitigations: [
        { id: 'R01-M1', type: 'mitigation', description: 'Pre-qualify two alternative suppliers for each critical component and negotiate step-in rights' },
      ],
      raisedDate: '2026-03-10',
      reviewDate: '2026-06-30',
      lastModifiedAt: TS,
    },

    // -------------------------------------------------------------------------
    // R02 — Export Licence Procurement Delay · Regulatory · Amber
    // -------------------------------------------------------------------------
    {
      id: 'R02',
      title: 'Export Licence Procurement Delay',
      description:
        'Delay in obtaining the required export licence from ECJU could prevent delivery of controlled equipment within the contracted timescale.',
      category: 'Regulatory',
      owner: 'P03',
      status: 'Open',
      scores: {
        inherent: buildRiskScore(30, 2, 3), // band 2 × 3 = 6 Amber
        residual: buildRiskScore(15, 2, 3), // band 2 × 3 = 6 Amber
        target:   buildRiskScore(5,  2, 2), // band 1 × 2 = 2 Green
      },
      proposedResidualScore: null,
      controls: [
        { id: 'R02-C1', type: 'control', description: 'Standing early-engagement protocol with ECJU; licence tracker updated monthly' },
      ],
      mitigations: [
        { id: 'R02-M1', type: 'mitigation', description: 'Obtain specialist export-controls legal counsel to advise on licence scope and timing' },
      ],
      raisedDate: '2026-02-14',
      reviewDate: '2026-06-10',
      lastModifiedAt: TS,
    },

    // -------------------------------------------------------------------------
    // R03 — Insufficient Security-Cleared Engineering Resource · Resource · Red
    //        Status: PendingApproval (RA06 completed with effectiveness 4)
    // -------------------------------------------------------------------------
    {
      id: 'R03',
      title: 'Insufficient Security-Cleared Engineering Resource',
      description:
        'The programme may not have access to sufficient SC/DV-cleared engineers for the integration and acceptance phases, causing schedule delay.',
      category: 'Resource',
      owner: 'P01',
      status: 'PendingApproval',
      scores: {
        inherent: buildRiskScore(65, 4, 4), // band 4 × 4 = 16 Red
        residual: buildRiskScore(35, 4, 4), // band 3 × 4 = 12 Amber
        target:   buildRiskScore(20, 3, 3), // band 2 × 3 = 6 Amber
      },
      proposedResidualScore: buildRiskScore(18, 4, 4), // proposed: band 2 × 4 = 8 Amber
      controls: [
        { id: 'R03-C1', type: 'control', description: 'In-flight SC vetting underway for all identified programme staff' },
      ],
      mitigations: [
        { id: 'R03-M1', type: 'mitigation', description: 'Framework agreement with specialist cleared-engineer staffing agency; schedule review for below-SC work packages' },
      ],
      raisedDate: '2026-01-20',
      reviewDate: '2026-06-06',
      lastModifiedAt: '2026-05-09T11:00:00.000Z',
    },

    // -------------------------------------------------------------------------
    // R04 — Cybersecurity Accreditation Delay (JSP 440) · Regulatory · Amber
    // -------------------------------------------------------------------------
    {
      id: 'R04',
      title: 'Cybersecurity Accreditation Delay (JSP 440)',
      description:
        'Failure to obtain JSP 440 accreditation before the operational readiness review would prevent service commencement.',
      category: 'Regulatory',
      owner: 'P04',
      status: 'Open',
      scores: {
        inherent: buildRiskScore(45, 2, 4), // band 3 × 4 = 12 Amber
        residual: buildRiskScore(20, 2, 3), // band 2 × 3 = 6 Amber
        target:   buildRiskScore(5,  1, 2), // band 1 × 2 = 2 Green
      },
      proposedResidualScore: null,
      controls: [
        { id: 'R04-C1', type: 'control', description: 'Dedicated DSO liaison; accreditation work package named on the programme schedule' },
      ],
      mitigations: [
        { id: 'R04-M1', type: 'mitigation', description: 'Phased accreditation — obtain interim Authority to Operate (iATO) to allow limited service commencement' },
      ],
      raisedDate: '2026-02-28',
      reviewDate: '2026-06-20',
      lastModifiedAt: TS,
    },

    // -------------------------------------------------------------------------
    // R05 — Single-Source Critical Component Dependency · Supply Chain · Amber→Green
    // -------------------------------------------------------------------------
    {
      id: 'R05',
      title: 'Single-Source Critical Component Dependency',
      description:
        'A single-source supplier provides the primary guidance module. Any disruption to their production would halt equipment delivery with no alternative available.',
      category: 'Supply Chain',
      owner: 'P03',
      status: 'Open',
      scores: {
        inherent: buildRiskScore(20, 5, 5), // band 2 × 5 = 10 Amber
        residual: buildRiskScore(10, 5, 5), // band 1 × 5 = 5 Green
        target:   buildRiskScore(5,  4, 4), // band 1 × 4 = 4 Green
      },
      proposedResidualScore: null,
      controls: [
        { id: 'R05-C1', type: 'control', description: '9-month strategic stock holding maintained; long-term supply agreement signed' },
      ],
      mitigations: [],
      raisedDate: '2026-01-15',
      reviewDate: '2026-07-01',
      lastModifiedAt: TS,
    },

    // -------------------------------------------------------------------------
    // R06 — Schedule Concurrency: Design / Procurement Overlap · Schedule · Amber
    // -------------------------------------------------------------------------
    {
      id: 'R06',
      title: 'Schedule Concurrency: Design / Procurement Overlap',
      description:
        'Running procurement activities before design baseline is frozen risks scope changes that invalidate contracted requirements, creating rework and cost growth.',
      category: 'Schedule',
      owner: 'P05',
      status: 'Open',
      scores: {
        inherent: buildRiskScore(55, 3, 3), // band 4 × 3 = 12 Amber
        residual: buildRiskScore(35, 3, 3), // band 3 × 3 = 9 Amber
        target:   buildRiskScore(20, 2, 2), // band 2 × 2 = 4 Green
      },
      proposedResidualScore: null,
      controls: [
        { id: 'R06-C1', type: 'control', description: 'Stage-gate review enforced before any procurement commitment is made' },
      ],
      mitigations: [
        { id: 'R06-M1', type: 'mitigation', description: 'Shadow procurement — framework call-off documents prepared but uncommitted until design freeze' },
      ],
      raisedDate: '2026-03-01',
      reviewDate: '2026-06-27',
      lastModifiedAt: TS,
    },

    // -------------------------------------------------------------------------
    // R07 — Departure of Key Programme Personnel · Resource · Mitigated
    // -------------------------------------------------------------------------
    {
      id: 'R07',
      title: 'Departure of Key Programme Personnel',
      description:
        'Loss of key programme staff (programme manager, lead systems engineer) would cause schedule disruption and knowledge loss.',
      category: 'Resource',
      owner: 'P01',
      status: 'Mitigated',
      scores: {
        inherent: buildRiskScore(20, 3, 2), // band 2 × 3 = 6 Amber
        residual: buildRiskScore(20, 2, 1), // band 2 × 2 = 4 Green
        target:   buildRiskScore(5,  2, 1), // band 1 × 2 = 2 Green
      },
      proposedResidualScore: null,
      controls: [
        { id: 'R07-C1', type: 'control', description: 'Knowledge-management plan maintained; succession planning completed for all Tier 1 posts' },
      ],
      mitigations: [],
      raisedDate: '2026-01-10',
      reviewDate: '2026-07-01',
      lastModifiedAt: TS,
    },

    // -------------------------------------------------------------------------
    // R08 — Contractor Site Vetting / Access Delay · External · Amber
    // -------------------------------------------------------------------------
    {
      id: 'R08',
      title: 'Contractor Site Vetting / Access Delay',
      description:
        'MOD site access vetting for contractor personnel may be delayed, preventing planned installation activities from commencing on schedule.',
      category: 'External',
      owner: 'P02',
      status: 'Open',
      scores: {
        inherent: buildRiskScore(35, 2, 3), // band 3 × 3 = 9 Amber
        residual: buildRiskScore(15, 1, 2), // band 2 × 2 = 4 Green
        target:   buildRiskScore(5,  1, 1), // band 1 × 1 = 1 Green
      },
      proposedResidualScore: null,
      controls: [
        { id: 'R08-C1', type: 'control', description: 'Early submission of DV/SC applications; vetting tracker reviewed weekly' },
      ],
      mitigations: [
        { id: 'R08-M1', type: 'mitigation', description: 'Identify work packages executable below SC clearance to progress during vetting period' },
      ],
      raisedDate: '2026-02-20',
      reviewDate: '2026-05-30',
      lastModifiedAt: TS,
    },

    // -------------------------------------------------------------------------
    // R09 — Foreign Exchange Exposure (USD/GBP) · Commercial · Mitigated / Green
    // -------------------------------------------------------------------------
    {
      id: 'R09',
      title: 'Foreign Exchange Exposure (USD/GBP)',
      description:
        'USD-denominated contracts expose the programme budget to sterling/dollar exchange-rate volatility.',
      category: 'Commercial',
      owner: 'P03',
      status: 'Mitigated',
      scores: {
        inherent: buildRiskScore(25, 2, 1), // band 2 × 2 = 4 Green
        residual: buildRiskScore(10, 2, 1), // band 1 × 2 = 2 Green
        target:   buildRiskScore(5,  1, 1), // band 1 × 1 = 1 Green
      },
      proposedResidualScore: null,
      controls: [
        { id: 'R09-C1', type: 'control', description: 'Forward purchasing agreement covering 90% of committed USD spend through programme completion' },
      ],
      mitigations: [],
      raisedDate: '2026-01-08',
      reviewDate: '2026-07-01',
      lastModifiedAt: TS,
    },

    // -------------------------------------------------------------------------
    // R10 — Integration Test Environment Late Availability · Technical · Red
    // -------------------------------------------------------------------------
    {
      id: 'R10',
      title: 'Integration Test Environment Late Availability',
      description:
        'The MOD Integration Test and Evaluation Facility (ITEF) may not be available in Q3 2026 as scheduled, delaying acceptance testing and the service-commencement milestone.',
      category: 'Technical',
      owner: 'P04',
      status: 'Open',
      scores: {
        inherent: buildRiskScore(55, 3, 4), // band 4 × 4 = 16 Red
        residual: buildRiskScore(25, 2, 3), // band 3 × 3 = 9 Amber
        target:   buildRiskScore(20, 2, 2), // band 2 × 2 = 4 Green
      },
      proposedResidualScore: null,
      controls: [
        { id: 'R10-C1', type: 'control', description: 'Priority ITEF booking confirmed for Q3 2026; escorted by DDT sponsor' },
      ],
      mitigations: [
        { id: 'R10-M1', type: 'mitigation', description: 'Commission Hardware-in-the-Loop (HIL) virtual integration environment as fallback; define minimum viable test suite for pre-ITEF dry run' },
      ],
      raisedDate: '2026-02-05',
      reviewDate: '2026-07-18',
      lastModifiedAt: TS,
    },

    // -------------------------------------------------------------------------
    // R11 — Regulatory Change to DEFSTAN Requirements · Regulatory · Green
    // -------------------------------------------------------------------------
    {
      id: 'R11',
      title: 'Regulatory Change to DEFSTAN Requirements',
      description:
        'Revisions to applicable DEFSTANs or NATO STANAGs during the programme may require design changes or re-testing, adding cost and schedule.',
      category: 'Regulatory',
      owner: 'P05',
      status: 'Open',
      scores: {
        inherent: buildRiskScore(10, 4, 3), // band 1 × 4 = 4 Green
        residual: buildRiskScore(10, 4, 3), // band 1 × 4 = 4 Green
        target:   buildRiskScore(5,  3, 2), // band 1 × 3 = 3 Green
      },
      proposedResidualScore: null,
      controls: [
        { id: 'R11-C1', type: 'control', description: 'Standing watch brief from MOD DAAS; STANAG compliance register maintained' },
      ],
      mitigations: [],
      raisedDate: '2026-03-15',
      reviewDate: '2026-06-28',
      lastModifiedAt: TS,
    },

    // -------------------------------------------------------------------------
    // R12 — Incomplete Interface Control Documents · Technical · Amber
    // -------------------------------------------------------------------------
    {
      id: 'R12',
      title: 'Incomplete Interface Control Documents',
      description:
        'Incomplete or late ICDs from sub-system suppliers could prevent integration planning and cause rework during the integration and test phase.',
      category: 'Technical',
      owner: 'P04',
      status: 'Open',
      scores: {
        inherent: buildRiskScore(60, 3, 3), // band 4 × 3 = 12 Amber
        residual: buildRiskScore(25, 2, 2), // band 3 × 2 = 6 Amber
        target:   buildRiskScore(20, 2, 2), // band 2 × 2 = 4 Green
      },
      proposedResidualScore: null,
      controls: [
        { id: 'R12-C1', type: 'control', description: 'ICD baseline review locked to design-freeze milestone; non-delivery triggers escalation' },
      ],
      mitigations: [
        { id: 'R12-M1', type: 'mitigation', description: 'Early interface-identification workshop with all sub-system leads to produce draft ICD register' },
      ],
      raisedDate: '2026-03-22',
      reviewDate: '2026-06-19',
      lastModifiedAt: TS,
    },
  ];
}

export function seedRaidActions(): RaidAction[] {
  const NOW = new Date().toISOString();
  return [
    // --- R01 actions ---
    {
      id: 'RA01',
      riskId: 'R01',
      responseItemId: 'R01-C1',
      responseItemType: 'control',
      title: 'Conduct financial due-diligence review on all Tier 1 suppliers',
      owner: 'P02',
      dueDate: '2026-05-12',
      status: 'Done',
      completionEffectiveness: 3,
      completedAt: '2026-05-12T14:00:00.000Z',
      lastModifiedAt: '2026-05-12T14:00:00.000Z',
    },
    {
      id: 'RA02',
      riskId: 'R01',
      responseItemId: 'R01-M1',
      responseItemType: 'mitigation',
      title: 'Pre-qualify alternative suppliers for all critical components',
      owner: 'P03',
      dueDate: '2026-06-30',
      status: 'InProgress',
      completionEffectiveness: null,
      completedAt: null,
      lastModifiedAt: TS,
    },
    {
      id: 'RA03',
      riskId: 'R01',
      responseItemId: 'R01-M1',
      responseItemType: 'mitigation',
      title: 'Negotiate step-in rights clause in all Tier 1 contracts',
      owner: 'P02',
      dueDate: '2026-06-15',
      status: 'Todo',
      completionEffectiveness: null,
      completedAt: null,
      lastModifiedAt: TS,
    },

    // --- R02 actions ---
    {
      id: 'RA04',
      riskId: 'R02',
      responseItemId: 'R02-C1',
      responseItemType: 'control',
      title: 'Submit draft export licence application to ECJU',
      owner: 'P03',
      dueDate: '2026-05-05',
      status: 'Done',
      completionEffectiveness: 4,
      completedAt: '2026-05-05T09:00:00.000Z',
      lastModifiedAt: '2026-05-05T09:00:00.000Z',
    },
    {
      id: 'RA05',
      riskId: 'R02',
      responseItemId: 'R02-M1',
      responseItemType: 'mitigation',
      title: 'Obtain specialist export-controls legal counsel',
      owner: 'P03',
      dueDate: '2026-06-10',
      status: 'InProgress',
      completionEffectiveness: null,
      completedAt: null,
      lastModifiedAt: TS,
    },

    // --- R03 actions (PendingApproval trigger: RA06 Done) ---
    {
      id: 'RA06',
      riskId: 'R03',
      responseItemId: 'R03-M1',
      responseItemType: 'mitigation',
      title: 'Place framework agreement with cleared-engineer staffing agency',
      owner: 'P01',
      dueDate: '2026-05-09',
      status: 'Done',
      completionEffectiveness: 4,
      completedAt: '2026-05-09T11:00:00.000Z',
      lastModifiedAt: '2026-05-09T11:00:00.000Z',
    },
    {
      id: 'RA07',
      riskId: 'R03',
      responseItemId: 'R03-C1',
      responseItemType: 'control',
      title: 'Accelerate SC vetting for 8 identified programme staff',
      owner: 'P01',
      dueDate: '2026-06-06',
      status: 'InProgress',
      completionEffectiveness: null,
      completedAt: null,
      lastModifiedAt: TS,
    },
    {
      id: 'RA08',
      riskId: 'R03',
      responseItemId: 'R03-M1',
      responseItemType: 'mitigation',
      title: 'Review schedule for tasks executable below SC clearance',
      owner: 'P05',
      dueDate: '2026-05-30',
      status: 'Todo',
      completionEffectiveness: null,
      completedAt: null,
      lastModifiedAt: TS,
    },

    // --- R04 actions ---
    {
      id: 'RA09',
      riskId: 'R04',
      responseItemId: 'R04-C1',
      responseItemType: 'control',
      title: 'Submit ITHC work order to SIRO',
      owner: 'P04',
      dueDate: '2026-05-22',
      status: 'InProgress',
      completionEffectiveness: null,
      completedAt: null,
      lastModifiedAt: TS,
    },
    {
      id: 'RA10',
      riskId: 'R04',
      responseItemId: 'R04-M1',
      responseItemType: 'mitigation',
      title: 'Request interim Authority to Operate (iATO) from DSO',
      owner: 'P04',
      dueDate: '2026-06-20',
      status: 'Todo',
      completionEffectiveness: null,
      completedAt: null,
      lastModifiedAt: TS,
    },

    // --- R05 actions ---
    {
      id: 'RA11',
      riskId: 'R05',
      responseItemId: 'R05-C1',
      responseItemType: 'control',
      title: 'Review and increase minimum stock holding to 9 months',
      owner: 'P03',
      dueDate: '2026-05-01',
      status: 'Done',
      completionEffectiveness: 5,
      completedAt: '2026-04-30T16:00:00.000Z',
      lastModifiedAt: '2026-04-30T16:00:00.000Z',
    },

    // --- R06 actions ---
    {
      id: 'RA12',
      riskId: 'R06',
      responseItemId: 'R06-C1',
      responseItemType: 'control',
      title: 'Convene concurrency risk review with programme board',
      owner: 'P05',
      dueDate: '2026-05-08',
      status: 'Done',
      completionEffectiveness: 3,
      completedAt: '2026-05-08T15:00:00.000Z',
      lastModifiedAt: '2026-05-08T15:00:00.000Z',
    },
    {
      id: 'RA13',
      riskId: 'R06',
      responseItemId: 'R06-M1',
      responseItemType: 'mitigation',
      title: 'Prepare shadow procurement documents for top-3 packages',
      owner: 'P05',
      dueDate: '2026-06-27',
      status: 'InProgress',
      completionEffectiveness: null,
      completedAt: null,
      lastModifiedAt: TS,
    },

    // --- R10 actions ---
    {
      id: 'RA14',
      riskId: 'R10',
      responseItemId: 'R10-C1',
      responseItemType: 'control',
      title: 'Reserve ITEF booking for Q3 2026',
      owner: 'P04',
      dueDate: '2026-05-01',
      status: 'Done',
      completionEffectiveness: 4,
      completedAt: '2026-04-30T10:00:00.000Z',
      lastModifiedAt: '2026-04-30T10:00:00.000Z',
    },
    {
      id: 'RA15',
      riskId: 'R10',
      responseItemId: 'R10-M1',
      responseItemType: 'mitigation',
      title: 'Scope and commission HIL virtual integration environment',
      owner: 'P04',
      dueDate: '2026-06-30',
      status: 'InProgress',
      completionEffectiveness: null,
      completedAt: null,
      lastModifiedAt: TS,
    },
    {
      id: 'RA16',
      riskId: 'R10',
      responseItemId: 'R10-M1',
      responseItemType: 'mitigation',
      title: 'Define minimum viable test suite for pre-ITEF dry run',
      owner: 'P04',
      dueDate: '2026-07-18',
      status: 'Todo',
      completionEffectiveness: null,
      completedAt: null,
      lastModifiedAt: TS,
    },

    // --- R11 actions ---
    {
      id: 'RA19',
      riskId: 'R11',
      responseItemId: 'R11-C1',
      responseItemType: 'control',
      title: 'Submit NATO STANAG compliance register',
      owner: 'P05',
      dueDate: '2026-04-28',
      status: 'Overdue',
      completionEffectiveness: null,
      completedAt: null,
      lastModifiedAt: NOW,
    },

    // --- R12 actions ---
    {
      id: 'RA17',
      riskId: 'R12',
      responseItemId: 'R12-C1',
      responseItemType: 'control',
      title: 'Schedule ICD identification workshop with all sub-system leads',
      owner: 'P04',
      dueDate: '2026-05-15',
      status: 'Done',
      completionEffectiveness: 3,
      completedAt: '2026-05-15T17:00:00.000Z',
      lastModifiedAt: '2026-05-15T17:00:00.000Z',
    },
    {
      id: 'RA18',
      riskId: 'R12',
      responseItemId: 'R12-M1',
      responseItemType: 'mitigation',
      title: 'Draft ICD register for all identified interfaces',
      owner: 'P04',
      dueDate: '2026-06-19',
      status: 'InProgress',
      completionEffectiveness: null,
      completedAt: null,
      lastModifiedAt: TS,
    },
  ];
}
