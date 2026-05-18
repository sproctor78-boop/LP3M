// =============================================================================
// Deliverable seed data — Operational Capability Delivery (FICTIONAL)
// =============================================================================
// 6 defence-programme deliverables (DL01–DL06).
// Covers all 5 statuses; DL01 is ready for acceptance; DL06 is overdue.
// Seed dates calibrated to "today = 2026-05-18".
// =============================================================================

import { AcceptanceCriterion, Deliverable } from './deliverable';

const TS = '2026-05-01T09:00:00.000Z';

function criterion(id: string, description: string, met: boolean, metAt?: string): AcceptanceCriterion {
  return {
    id,
    description,
    met,
    metAt: met ? (metAt ?? '2026-05-10T10:00:00.000Z') : null,
    metBy: met ? 'system' : null,
  };
}

export function seedDeliverables(): Deliverable[] {
  return [
    // -------------------------------------------------------------------------
    // DL01 — Phase 2 Critical Design Review Pack · InReview · READY FOR ACCEPTANCE
    // All 5 criteria met — demonstrates "Ready for acceptance" filter and nav badge
    // -------------------------------------------------------------------------
    {
      id: 'DL01',
      title: 'Phase 2 Critical Design Review Pack',
      description:
        'The CDR documentation package for Phase 2, comprising the system design authority review pack, interface control documents, design risk assessment, and supporting annexes. Required before proceeding to build phase.',
      owner: 'P03',
      targetDate: '2026-06-20',
      status: 'InReview',
      acceptanceCriteria: [
        criterion('DL01-AC1', 'All interface control documents are at Issue 2 or later', true, '2026-05-08T09:00:00.000Z'),
        criterion('DL01-AC2', 'Design authority review board has signed the cover sheet', true, '2026-05-12T14:00:00.000Z'),
        criterion('DL01-AC3', 'Design risk assessment is at residual score ≤ 4×4', true, '2026-05-09T11:00:00.000Z'),
        criterion('DL01-AC4', 'Action items from preliminary design review are formally closed', true, '2026-05-07T16:00:00.000Z'),
        criterion('DL01-AC5', 'Technical data package has been lodged in EDMS at baseline Rev A', true, '2026-05-14T10:00:00.000Z'),
      ],
      linkedTaskIds: ['T05', 'T06'],
      notes:
        'CDR pack submitted to customer 2026-05-14. Customer review board scheduled 2026-06-05. Awaiting formal acceptance memo.',
      acceptedAt: null,
      acceptedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      lastReviewedAt: '2026-05-14T10:00:00.000Z',
      createdAt: '2026-02-10T09:00:00.000Z',
    },

    // -------------------------------------------------------------------------
    // DL02 — Cleared Engineer Training Material · InProduction · some criteria met
    // -------------------------------------------------------------------------
    {
      id: 'DL02',
      title: 'Cleared Engineer Training Material',
      description:
        'Training package for cleared engineers operating the system, including operator handbook, maintenance procedures, and CBRN safety annexe. Must be accredited before system handover.',
      owner: 'P04',
      targetDate: '2026-07-15',
      status: 'InProduction',
      acceptanceCriteria: [
        criterion('DL02-AC1', 'Operator handbook reviewed and approved by the system safety authority', false),
        criterion('DL02-AC2', 'CBRN safety annexe cross-referenced with current regulations', true, '2026-05-06T14:00:00.000Z'),
        criterion('DL02-AC3', 'Training material classified and marked IAW JSP 440 handling instructions', true, '2026-05-03T09:00:00.000Z'),
        criterion('DL02-AC4', 'Pilot delivery completed with at least 6 engineers; feedback incorporated', false),
      ],
      linkedTaskIds: ['T07'],
      notes:
        'Operator handbook first draft complete; safety authority review booked 2026-06-10. Pilot delivery planned for July.',
      acceptedAt: null,
      acceptedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      lastReviewedAt: '2026-05-13T09:00:00.000Z',
      createdAt: TS,
    },

    // -------------------------------------------------------------------------
    // DL03 — STANAG Conformance Test Report · Planned · no criteria met
    // -------------------------------------------------------------------------
    {
      id: 'DL03',
      title: 'STANAG 4671 Conformance Test Report',
      description:
        'Formal test report from the MOD Directorate of Standardisation confirming STANAG 4671 conformance of the primary guidance module. Required for NATO interoperability clearance.',
      owner: 'P05',
      targetDate: '2026-09-01',
      status: 'Planned',
      acceptanceCriteria: [
        criterion('DL03-AC1', 'Test plan reviewed and approved by MOD test authority', false),
        criterion('DL03-AC2', 'All 47 conformance test cases executed with pass result', false),
        criterion('DL03-AC3', 'Test report signed by accredited test witness', false),
      ],
      linkedTaskIds: ['T08'],
      notes:
        'Dependent on STANAG certification from ED02. Test facility booked for August 2026 subject to ED02 clearance.',
      acceptedAt: null,
      acceptedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      lastReviewedAt: '2026-05-05T09:00:00.000Z',
      createdAt: '2026-03-01T09:00:00.000Z',
    },

    // -------------------------------------------------------------------------
    // DL04 — Integration Test Environment · Accepted · historic
    // -------------------------------------------------------------------------
    {
      id: 'DL04',
      title: 'Integration Test Environment',
      description:
        'Stand-alone integration test environment (ITE) comprising target hardware, stimulus rack, and associated test software suite. Used for software integration testing before acceptance testing.',
      owner: 'P02',
      targetDate: '2026-04-15',
      status: 'Accepted',
      acceptanceCriteria: [
        criterion('DL04-AC1', 'All hardware items received, inspected, and logged on IFORM', true, '2026-04-08T09:00:00.000Z'),
        criterion('DL04-AC2', 'Stimulus rack calibrated against reference standard; calibration certificate issued', true, '2026-04-09T14:00:00.000Z'),
        criterion('DL04-AC3', 'Test software baseline v1.0 installed and smoke-tested against 10 representative test cases', true, '2026-04-11T10:00:00.000Z'),
        criterion('DL04-AC4', 'Acceptance test witnessed by independent TDA representative', true, '2026-04-14T11:00:00.000Z'),
      ],
      linkedTaskIds: ['T05'],
      notes:
        'ITE accepted by customer representative 2026-04-15. Acceptance memo signed and filed in EDMS.',
      acceptedAt: '2026-04-15T15:30:00.000Z',
      acceptedBy: 'system',
      rejectedAt: null,
      rejectionReason: null,
      lastReviewedAt: '2026-04-15T15:30:00.000Z',
      createdAt: '2026-01-15T09:00:00.000Z',
    },

    // -------------------------------------------------------------------------
    // DL05 — Cyber Security Accreditation Submission · Rejected
    // -------------------------------------------------------------------------
    {
      id: 'DL05',
      title: 'Cyber Security Accreditation Submission',
      description:
        'Information Assurance submission package to the MOD Cyber team for system accreditation, covering the Risk Management Accreditation Document Set (RMADS) and supporting artefacts.',
      owner: 'P04',
      targetDate: '2026-05-01',
      status: 'Rejected',
      acceptanceCriteria: [
        criterion('DL05-AC1', 'RMADS document set complete and at Issue 1.0', true, '2026-04-20T09:00:00.000Z'),
        criterion('DL05-AC2', 'System security policy approved by system owner', true, '2026-04-22T14:00:00.000Z'),
        criterion('DL05-AC3', 'Residual risk statement accepted by SIRO', false),
        criterion('DL05-AC4', 'Penetration test report (ITHC) included and findings classified', true, '2026-04-18T10:00:00.000Z'),
        criterion('DL05-AC5', 'Section 4 — Data-at-Rest controls — independently reviewed', false),
      ],
      linkedTaskIds: ['T07'],
      notes:
        'ITSO review completed 2026-04-30. Rejected pending rework of section 4 data-at-rest controls. Rework estimated 2 weeks.',
      acceptedAt: null,
      acceptedBy: null,
      rejectedAt: '2026-04-30T16:00:00.000Z',
      rejectionReason: 'ITSO requested rework of section 4 — data-at-rest encryption controls do not meet JSP 440 Annex B requirements. Full re-submission required once remediation is complete.',
      lastReviewedAt: '2026-04-30T16:00:00.000Z',
      createdAt: '2026-02-01T09:00:00.000Z',
    },

    // -------------------------------------------------------------------------
    // DL06 — Q2 Stakeholder Briefing Pack · InProduction · OVERDUE
    // targetDate 2026-05-15 < today 2026-05-18; status is not Accepted
    // -------------------------------------------------------------------------
    {
      id: 'DL06',
      title: 'Q2 Stakeholder Briefing Pack',
      description:
        'Quarterly briefing pack for programme stakeholders including the SRO, TLB finance team, and contractor leadership. Covers schedule status, risk summary, earned value, and decisions required.',
      owner: 'P03',
      targetDate: '2026-05-15',
      status: 'InProduction',
      acceptanceCriteria: [
        criterion('DL06-AC1', 'EVM data extracted from planning tool and validated by programme controller', true, '2026-05-10T09:00:00.000Z'),
        criterion('DL06-AC2', 'Risk heat map updated with current scores and reviewed by risk owner', false),
        criterion('DL06-AC3', 'Decisions required section cleared with SRO PA before circulation', false),
      ],
      linkedTaskIds: [],
      notes:
        'Pack delayed due to late EVM data from planning tool. Risk heat map update blocked on R09 re-score. SRO PA chased 2026-05-16.',
      acceptedAt: null,
      acceptedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      lastReviewedAt: '2026-05-16T08:00:00.000Z',
      createdAt: '2026-04-01T09:00:00.000Z',
    },
  ];
}
