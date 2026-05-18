// =============================================================================
// RAID CSV export
// =============================================================================

import { Risk } from '../domain/types';

const HEADERS = [
  'ID', 'Title', 'Category', 'Owner', 'Status', 'Raised Date', 'Review Date',
  'Inherent Probability %', 'Inherent Probability Band',
  'Inherent Cost Impact Band', 'Inherent Time Impact Band',
  'Inherent Score', 'Inherent RAG',
  'Residual Probability %', 'Residual Probability Band',
  'Residual Cost Impact Band', 'Residual Time Impact Band',
  'Residual Score', 'Residual RAG',
  'Target Probability %', 'Target Probability Band',
  'Target Cost Impact Band', 'Target Time Impact Band',
  'Target Score', 'Target RAG',
];

function escapeCsv(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildRaidCsv(risks: Risk[]): string {
  const rows = [
    HEADERS.join(','),
    ...risks.map((r) =>
      [
        r.id, r.title, r.category, r.owner, r.status,
        r.raisedDate, r.reviewDate,
        r.scores.inherent.probabilityPct, r.scores.inherent.probabilityBand,
        r.scores.inherent.costImpact, r.scores.inherent.timeImpact,
        r.scores.inherent.score, r.scores.inherent.rag,
        r.scores.residual.probabilityPct, r.scores.residual.probabilityBand,
        r.scores.residual.costImpact, r.scores.residual.timeImpact,
        r.scores.residual.score, r.scores.residual.rag,
        r.scores.target.probabilityPct, r.scores.target.probabilityBand,
        r.scores.target.costImpact, r.scores.target.timeImpact,
        r.scores.target.score, r.scores.target.rag,
      ].map(escapeCsv).join(',')
    ),
  ];
  return rows.join('\n');
}

export function downloadRaidCsv(risks: Risk[]): void {
  const csv = buildRaidCsv(risks);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `risk-register-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
