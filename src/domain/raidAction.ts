// =============================================================================
// RAID — Action domain types
// =============================================================================

import { ImpactBand } from './risk';

export type ActionStatus = 'Todo' | 'InProgress' | 'Done' | 'Overdue';

export interface RaidAction {
  id: string;
  /** Parent risk ID. */
  riskId: string;
  /** ID of the ResponseItem (control or mitigation) this action implements. */
  responseItemId: string;
  responseItemType: 'control' | 'mitigation';
  title: string;
  /** Person ID or free-text name. */
  owner: string;
  /** ISO date 'YYYY-MM-DD'. */
  dueDate: string;
  status: ActionStatus;
  /** 1–5 effectiveness rating entered when the action is marked Done. Null otherwise. */
  completionEffectiveness: ImpactBand | null;
  /** ISO timestamp — set when status transitions to Done. */
  completedAt: string | null;
  /** ISO timestamp — set on every mutation. */
  lastModifiedAt: string;
}
