import { AppDomainState } from '../domain/types';

export interface RippleExportV1 {
  schema: 'ripple.export.v1';
  exportedAt: string;
  workItems: AppDomainState['tasks'];
  dependencies: Array<{ predecessorId: string; successorId: string; type: string; lagDays: number }>;
  columns: AppDomainState['columns'];
  swimlanes: AppDomainState['swimlanes'];
  workingCalendar: AppDomainState['workingCalendar'];
}
