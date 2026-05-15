// =============================================================================
// Export schema
// =============================================================================
// Versioned envelope for JSON exports. Future analytics targets (Power BI,
// Snowflake, etc.) can rely on this shape. Bump the schema version when the
// shape changes in a breaking way.
// =============================================================================

import { AppDomainState } from '../domain/types';

export const EXPORT_SCHEMA = 'ripple.export.v1' as const;

export interface DependencyExportRow {
  predecessorId: string;
  successorId: string;
  type: string;
  lagDays: number;
}

export interface RippleExportV1 {
  schema: typeof EXPORT_SCHEMA;
  exportedAt: string;
  workItems: AppDomainState['tasks'];
  dependencies: DependencyExportRow[];
  columns: AppDomainState['columns'];
  swimlanes: AppDomainState['swimlanes'];
  workingCalendar: AppDomainState['workingCalendar'];
}
