import { BoardColumn, WorkItem } from '../../domain/types';
import { RaidAction, ActionStatus } from '../../domain/raidAction';

export const RAID_BOARD_COLUMNS: { key: ActionStatus; label: string }[] = [
  { key: 'Todo', label: 'To Do' },
  { key: 'InProgress', label: 'In Progress' },
  { key: 'Done', label: 'Done' },
  { key: 'Overdue', label: 'Overdue' },
];

export function tasksForColumn(
  tasks: WorkItem[],
  columns: BoardColumn[],
  columnKey: string,
): WorkItem[] {
  return tasks.filter((t) => {
    const status = t.status || columns[0]?.key;
    return status === columnKey;
  });
}

export function actionsForColumn(actions: RaidAction[], columnKey: string): RaidAction[] {
  return actions.filter((a) => a.status === columnKey);
}
