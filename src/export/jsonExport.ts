// =============================================================================
// JSON export
// =============================================================================

import { AppDomainState } from '../domain/types';
import { DependencyExportRow, EXPORT_SCHEMA, RippleExportV1 } from './exportSchema';

export function buildJsonExport(domain: AppDomainState): RippleExportV1 {
  const dependencies: DependencyExportRow[] = domain.tasks.flatMap((task) =>
    task.dependencies.map((dep) => ({
      predecessorId: dep.taskId,
      successorId: task.id,
      type: dep.type,
      lagDays: dep.lagDays,
    })),
  );

  return {
    schema: EXPORT_SCHEMA,
    exportedAt: new Date().toISOString(),
    workItems: domain.tasks,
    dependencies,
    columns: domain.columns,
    swimlanes: domain.swimlanes,
    workingCalendar: domain.workingCalendar,
  };
}

export function downloadJsonExport(domain: AppDomainState): void {
  const json = JSON.stringify(buildJsonExport(domain), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ripple-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
