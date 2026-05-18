import { describe, expect, it } from 'vitest';
import { actionsForColumn, RAID_BOARD_COLUMNS, tasksForColumn } from '../components/Board/boardHelpers';
import { RaidAction } from '../domain/raidAction';
import { BoardColumn, WorkItem } from '../domain/types';

const makeColumn = (key: string, label: string): BoardColumn => ({ key, label });

const makeTask = (id: string, status: string): WorkItem => ({
  id,
  title: `Task ${id}`,
  status,
  startDate: '2025-01-06',
  endDate: '2025-01-10',
  durationDays: 5,
  isMilestone: false,
  locked: false,
  swimlane: 'default',
  percentComplete: 0,
  parentId: null,
  isParent: false,
  assignees: [],
  dependencies: [],
  constraint: null,
});

const makeAction = (id: string, status: RaidAction['status']): RaidAction => ({
  id,
  riskId: 'R01',
  responseItemId: 'resp-1',
  responseItemType: 'mitigation',
  title: `Action ${id}`,
  owner: 'Alice',
  dueDate: '2025-06-30',
  status,
  completionEffectiveness: null,
  completedAt: null,
  lastModifiedAt: '2025-01-01T00:00:00Z',
});

describe('tasksForColumn', () => {
  const columns = [makeColumn('todo', 'To Do'), makeColumn('done', 'Done')];
  const tasks = [makeTask('T1', 'todo'), makeTask('T2', 'done'), makeTask('T3', 'todo')];

  it('returns only tasks matching the column key', () => {
    const result = tasksForColumn(tasks, columns, 'todo');
    expect(result.map((t) => t.id)).toEqual(['T1', 'T3']);
  });

  it('returns empty array for column with no tasks', () => {
    const result = tasksForColumn(tasks, columns, 'inprogress');
    expect(result).toHaveLength(0);
  });

  it('tasks in one column do not appear in another', () => {
    const todoTasks = tasksForColumn(tasks, columns, 'todo');
    const doneTasks = tasksForColumn(tasks, columns, 'done');
    const todoIds = new Set(todoTasks.map((t) => t.id));
    doneTasks.forEach((t) => expect(todoIds.has(t.id)).toBe(false));
  });

  it('task with no status falls into first column', () => {
    const taskNoStatus = { ...makeTask('T4', '') };
    const result = tasksForColumn([taskNoStatus], columns, 'todo');
    expect(result).toHaveLength(1);
  });
});

describe('actionsForColumn', () => {
  const actions = [
    makeAction('RA1', 'Todo'),
    makeAction('RA2', 'InProgress'),
    makeAction('RA3', 'Done'),
    makeAction('RA4', 'Todo'),
    makeAction('RA5', 'Overdue'),
  ];

  it('returns actions with matching status', () => {
    const result = actionsForColumn(actions, 'Todo');
    expect(result.map((a) => a.id)).toEqual(['RA1', 'RA4']);
  });

  it('InProgress actions are isolated', () => {
    const result = actionsForColumn(actions, 'InProgress');
    expect(result.map((a) => a.id)).toEqual(['RA2']);
  });

  it('Done actions are isolated', () => {
    const result = actionsForColumn(actions, 'Done');
    expect(result.map((a) => a.id)).toEqual(['RA3']);
  });

  it('Overdue actions are isolated', () => {
    const result = actionsForColumn(actions, 'Overdue');
    expect(result.map((a) => a.id)).toEqual(['RA5']);
  });

  it('returns empty array for unknown column', () => {
    expect(actionsForColumn(actions, 'Unknown')).toHaveLength(0);
  });

  it('all actions belong to exactly one column', () => {
    const allKeys = RAID_BOARD_COLUMNS.map((c) => c.key);
    const found = new Set<string>();
    allKeys.forEach((key) => {
      actionsForColumn(actions, key).forEach((a) => found.add(a.id));
    });
    expect(found.size).toBe(actions.length);
  });
});

describe('RAID_BOARD_COLUMNS', () => {
  it('has exactly four columns', () => {
    expect(RAID_BOARD_COLUMNS).toHaveLength(4);
  });

  it('covers all ActionStatus values', () => {
    const keys = RAID_BOARD_COLUMNS.map((c) => c.key);
    expect(keys).toContain('Todo');
    expect(keys).toContain('InProgress');
    expect(keys).toContain('Done');
    expect(keys).toContain('Overdue');
  });
});
