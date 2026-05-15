import { ForecastResult, WorkItem } from '../domain/types';
import { formatNice } from './dateUtils';

export function buildImpactNarrative(forecast: ForecastResult, tasks: WorkItem[]): string {
  const changed = tasks.find((task) => task.id === forecast.changedTaskId);
  const finishChange = forecast.forecastShiftDays === 0
    ? 'The forecast finish date is unchanged.'
    : `The forecast finish moves ${Math.abs(forecast.forecastShiftDays)} day${Math.abs(forecast.forecastShiftDays) === 1 ? '' : 's'} ${forecast.forecastShiftDays > 0 ? 'later' : 'earlier'}, from ${formatNice(forecast.oldProjectFinish)} to ${formatNice(forecast.newProjectFinish)}.`;
  const dependencyText = forecast.affectedTasks.length === 0
    ? `${forecast.linkedTasks.length} linked item${forecast.linkedTasks.length === 1 ? '' : 's'} checked; none need to move.`
    : `${forecast.affectedTasks.length} linked item${forecast.affectedTasks.length === 1 ? '' : 's'} will move.`;
  const breachText = forecast.constraintBreaches.length === 0
    ? 'No hard constraint breaches detected.'
    : `${forecast.constraintBreaches.length} hard constraint breach${forecast.constraintBreaches.length === 1 ? '' : 'es'} detected.`;

  return `${changed?.title ?? 'Selected task'} changed. ${dependencyText} ${breachText} ${finishChange}`;
}
