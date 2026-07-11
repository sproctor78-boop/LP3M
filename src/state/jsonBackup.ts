// =============================================================================
// JSON backup / restore — full-domain export and re-importable snapshot.
// =============================================================================
// Distinct from src/export/jsonExport.ts, which exports a narrower
// schedule-only shape (work items + dependencies) for external tooling.
// This module round-trips the entire AppDomainState (tasks, people, risks,
// RAID actions, external dependencies, deliverables) so a user can back up
// and restore their whole dataset.
// =============================================================================

import { AppDomainState } from '../domain/types';

export const BACKUP_VERSION = 3;

export interface BackupEnvelope {
  version: number;
  exportedAt: string;
  state: AppDomainState;
}

/** Every top-level register the imported domain must have (as arrays). */
const EXPECTED_DOMAIN_ARRAYS: (keyof AppDomainState)[] = [
  'tasks',
  'risks',
  'deliverables',
  'externalDependencies',
  'people',
];

export function buildBackupEnvelope(domain: AppDomainState): BackupEnvelope {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    state: domain,
  };
}

/** Triggers a browser download of the backup. `today` must come from localToday() at the call site. */
export function downloadBackup(domain: AppDomainState, today: string): void {
  const envelope = buildBackupEnvelope(domain);
  const json = JSON.stringify(envelope, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ripple-${today}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export type BackupParseResult =
  | { ok: true; domain: AppDomainState }
  | { ok: false; error: string };

/** Parses and validates a backup JSON string. Never throws. */
export function parseBackupImport(raw: string): BackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'File does not contain a Ripple backup object.' };
  }
  const envelope = parsed as Record<string, unknown>;

  if (typeof envelope.version !== 'number') {
    return { ok: false, error: 'File is missing a backup version.' };
  }
  if (envelope.version !== BACKUP_VERSION) {
    return {
      ok: false,
      error: `Unsupported backup version ${envelope.version} (expected ${BACKUP_VERSION}).`,
    };
  }

  if (!envelope.state || typeof envelope.state !== 'object') {
    return { ok: false, error: 'File is missing backup data.' };
  }
  const domain = envelope.state as Record<string, unknown>;

  for (const key of EXPECTED_DOMAIN_ARRAYS) {
    if (!Array.isArray(domain[key])) {
      return { ok: false, error: `Backup is missing the "${key}" register.` };
    }
  }

  return { ok: true, domain: envelope.state as AppDomainState };
}
