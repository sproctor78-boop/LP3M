// =============================================================================
// External Dependencies seed data — Operational Capability Delivery (FICTIONAL)
// =============================================================================
// 5 defence-programme external dependencies (ED01–ED05).
// Covers all 4 statuses; ED04 linked to multiple tasks; ED02 is overdue.
// Seed dates calibrated to "today = 2026-05-18".
// =============================================================================

import { ExternalDependency } from './externalDependency';

const TS = '2026-05-01T09:00:00.000Z';

export function seedExternalDependencies(): ExternalDependency[] {
  return [
    // -------------------------------------------------------------------------
    // ED01 — Cleared facility access from site authority · AtRisk
    // -------------------------------------------------------------------------
    {
      id: 'ED01',
      title: 'Cleared facility access from site authority',
      description:
        'Programme requires confirmed access to the secure facility for installation and testing activities. Access permits and site vetting paperwork pending sign-off by the site authority.',
      externalOwner: 'Client Facilities Authority',
      internalOwner: 'P02',
      targetDate: '2026-06-15',
      status: 'AtRisk',
      linkedTaskIds: ['T06'],
      notes:
        'Site authority has indicated a 2-week review backlog. Escalation route through PM to DIO Accommodation in progress.',
      lastReviewedAt: '2026-05-14T10:00:00.000Z',
      createdAt: TS,
    },

    // -------------------------------------------------------------------------
    // ED02 — STANAG 4671 certification from test authority · Late
    // -------------------------------------------------------------------------
    {
      id: 'ED02',
      title: 'STANAG 4671 certification from test authority',
      description:
        'Formal certification from the Certification Authority confirming STANAG 4671 compliance for the primary guidance module. Required before acceptance testing and operational use.',
      externalOwner: 'Certification Authority (CA)',
      internalOwner: 'P05',
      targetDate: '2026-05-10',
      status: 'Late',
      linkedTaskIds: ['T07', 'T08'],
      notes:
        'Submission made 2026-04-01. CA review period extended due to staff availability. Chasing weekly. Risk R11 linked.',
      lastReviewedAt: '2026-05-17T09:00:00.000Z',
      createdAt: '2026-03-15T09:00:00.000Z',
    },

    // -------------------------------------------------------------------------
    // ED03 — Integration test facility access confirmation · OnTrack
    // -------------------------------------------------------------------------
    {
      id: 'ED03',
      title: 'Integration test facility access confirmation',
      description:
        'Written confirmation from the Integration Test and Evaluation Facility (ITEF) manager that Q3 2026 booking is secured and the facility will be available for planned acceptance test activities.',
      externalOwner: 'Integration Test & Evaluation Facility (ITEF)',
      internalOwner: 'P04',
      targetDate: '2026-06-01',
      status: 'OnTrack',
      linkedTaskIds: ['T07'],
      notes:
        'Verbal confirmation received 2026-04-30. Written confirmation expected by end of May. See also RA14 (ITEF booking action).',
      lastReviewedAt: '2026-05-12T14:00:00.000Z',
      createdAt: TS,
    },

    // -------------------------------------------------------------------------
    // ED04 — Sub-component delivery from prime contractor · OnTrack
    //         Linked to multiple tasks (T05 + T06)
    // -------------------------------------------------------------------------
    {
      id: 'ED04',
      title: 'Sub-component delivery from prime contractor',
      description:
        'Physical delivery of the primary guidance module sub-components from the Tier 1 prime contractor, required before equipment inspection and installation can proceed.',
      externalOwner: 'Tier 1 Prime Contractor (ref: R01)',
      internalOwner: 'P03',
      targetDate: '2026-05-24',
      status: 'OnTrack',
      linkedTaskIds: ['T05', 'T06'],
      notes:
        'Contractor confirmed dispatch 2026-05-18. Tracked via weekly contract management call. Stock holding covers minor slip per R05 controls.',
      lastReviewedAt: '2026-05-18T08:00:00.000Z',
      createdAt: '2026-03-01T09:00:00.000Z',
    },

    // -------------------------------------------------------------------------
    // ED05 — Security accreditation sign-off · Received (historic)
    // -------------------------------------------------------------------------
    {
      id: 'ED05',
      title: 'Security accreditation sign-off from SIRO',
      description:
        'Senior Information Risk Owner (SIRO) sign-off on the Information Assurance documentation package, required before the system can be connected to the client protected network.',
      externalOwner: 'Client Senior Information Risk Owner (SIRO)',
      internalOwner: 'P04',
      targetDate: '2026-04-30',
      status: 'Received',
      linkedTaskIds: [],
      notes:
        'SIRO signed off IA documentation 2026-04-28. Condition cleared. No further action required on this dependency.',
      lastReviewedAt: '2026-04-28T16:00:00.000Z',
      createdAt: '2026-02-10T09:00:00.000Z',
    },
  ];
}
