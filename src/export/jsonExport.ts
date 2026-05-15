import { AppDomainState } from '../domain/types';
import { RippleExportV1 } from './exportSchema';

export function buildJsonExport(domain: AppDomainState): RippleExportV1 {
  return {
    schema: 'ripple.export.v1',
    exportedAt: new Date().toISOString(),
    workItems: domain.tasks,
    dependencies: domain.tasks.flatMap((task) => task.dependencies.map((dependency) => ({
      predecessorId: dependency.taskId,
      successorId: task.id,
      type: dependency.type,
      lagDays: dependency.lagDays
    }))),
    columns: domain.columns,
    swimlanes: domain.swimlanes,
    workingCalendar: domain.workingCalendar
  };
}

export function downloadJsonExport(domain: AppDomainState): void {
  const content = JSON.stringify(buildJsonExport(domain), null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ripple-export-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
