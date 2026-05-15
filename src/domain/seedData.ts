import { AppDomainState, WorkItem } from './types';
import { recomputeSchedule } from '../engine/scheduleEngine';

export function seedTasks(): WorkItem[] {
  const tasks: WorkItem[] = [
    { id: 'T01', title: 'Requirements baseline approval', status: 'complete', startDate: '2026-04-13', endDate: '2026-04-17', durationDays: 5, isMilestone: false, locked: false, swimlane: 'define', parentId: null, isParent: false, dependencies: [], constraint: null },
    { id: 'T02', title: 'System design package', status: 'in_progress', startDate: '2026-04-18', endDate: '2026-04-27', durationDays: 10, isMilestone: false, locked: false, swimlane: 'define', parentId: null, isParent: false, dependencies: [{ taskId: 'T01', type: 'finish_to_start', lagDays: 0 }], constraint: null },
    { id: 'T03', title: 'Procurement contract award', status: 'backlog', startDate: '2026-04-28', endDate: '2026-05-05', durationDays: 8, isMilestone: false, locked: false, swimlane: 'procure', parentId: null, isParent: false, dependencies: [{ taskId: 'T02', type: 'finish_to_start', lagDays: 0 }], constraint: null },
    { id: 'T04', title: 'Site preparation works', status: 'backlog', startDate: '2026-04-28', endDate: '2026-05-05', durationDays: 8, isMilestone: false, locked: false, swimlane: 'procure', parentId: null, isParent: false, dependencies: [{ taskId: 'T02', type: 'finish_to_start', lagDays: 0 }], constraint: null },
    { id: 'T05', title: 'Equipment delivery and inspection', status: 'backlog', startDate: '2026-05-06', endDate: '2026-05-20', durationDays: 15, isMilestone: false, locked: false, swimlane: 'procure', parentId: null, isParent: false, dependencies: [{ taskId: 'T03', type: 'finish_to_start', lagDays: 0 }], constraint: null },
    { id: 'T06', title: 'Installation', status: 'backlog', startDate: '2026-05-21', endDate: '2026-06-01', durationDays: 12, isMilestone: false, locked: false, swimlane: 'deliver', parentId: null, isParent: false, dependencies: [{ taskId: 'T05', type: 'finish_to_start', lagDays: 0 }, { taskId: 'T04', type: 'finish_to_start', lagDays: 0 }], constraint: null },
    { id: 'T07', title: 'Integration and acceptance testing', status: 'backlog', startDate: '2026-06-02', endDate: '2026-06-11', durationDays: 10, isMilestone: false, locked: false, swimlane: 'deliver', parentId: null, isParent: true, isCollapsed: false, dependencies: [{ taskId: 'T06', type: 'finish_to_start', lagDays: 0 }], constraint: null },
    { id: 'T07a', title: 'System integration tests', status: 'backlog', startDate: '2026-06-02', endDate: '2026-06-05', durationDays: 4, isMilestone: false, locked: false, swimlane: 'deliver', parentId: 'T07', isParent: false, dependencies: [], constraint: null },
    { id: 'T07b', title: 'Operator training', status: 'backlog', startDate: '2026-06-06', endDate: '2026-06-08', durationDays: 3, isMilestone: false, locked: false, swimlane: 'deliver', parentId: 'T07', isParent: false, dependencies: [{ taskId: 'T07a', type: 'finish_to_start', lagDays: 0 }], constraint: null },
    { id: 'T07c', title: 'Acceptance test execution', status: 'backlog', startDate: '2026-06-09', endDate: '2026-06-11', durationDays: 3, isMilestone: false, locked: false, swimlane: 'deliver', parentId: 'T07', isParent: false, dependencies: [{ taskId: 'T07b', type: 'finish_to_start', lagDays: 0 }], constraint: null },
    { id: 'T08', title: 'User acceptance trial', status: 'backlog', startDate: '2026-06-12', endDate: '2026-06-19', durationDays: 8, isMilestone: false, locked: false, swimlane: 'assure', parentId: null, isParent: false, dependencies: [{ taskId: 'T07', type: 'finish_to_start', lagDays: 0 }], constraint: null },
    { id: 'T09', title: 'Operational readiness review', status: 'backlog', startDate: '2026-06-20', endDate: '2026-06-22', durationDays: 3, isMilestone: false, locked: false, swimlane: 'assure', parentId: null, isParent: false, dependencies: [{ taskId: 'T08', type: 'finish_to_start', lagDays: 0 }], constraint: null },
    { id: 'T10', title: 'Service commencement', status: 'backlog', startDate: '2026-06-24', endDate: '2026-06-24', durationDays: 0, isMilestone: true, locked: true, swimlane: 'assure', parentId: null, isParent: false, dependencies: [{ taskId: 'T09', type: 'finish_to_start', lagDays: 1 }], constraint: { type: 'must_finish_on', date: '2026-06-24', hard: true } }
  ];
  return recomputeSchedule(tasks);
}

export function createInitialDomainState(): AppDomainState {
  return {
    tasks: seedTasks(),
    columns: [
      { key: 'backlog', label: 'Backlog' },
      { key: 'in_progress', label: 'In Progress' },
      { key: 'complete', label: 'Complete' }
    ],
    swimlanes: [
      { key: 'define', label: 'Define' },
      { key: 'procure', label: 'Procure' },
      { key: 'deliver', label: 'Deliver' },
      { key: 'assure', label: 'Assure' }
    ],
    workingCalendar: {
      highlightWeekends: true,
      holidays: []
    }
  };
}
