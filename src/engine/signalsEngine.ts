// =============================================================================
// Signals engine — derives action-required signals from domain state.
// Pure TypeScript: no React, no DOM, no wall-clock reads (today is a param).
// =============================================================================

import { AppDomainState } from '../domain/types';
import { canBeAccepted } from '../domain/deliverable';
import { detectConstraintIssues } from './scheduleEngine';

export interface Signal {
  id: string;
  category: 'breach' | 'dep' | 'gate' | 'risk' | 'forecast';
  severity: number;
  title: string;
  detail: string;
  taskId?: string;
  entityId?: string;
}

/**
 * Derives the full signal set from domain state relative to today (ISO string
 * 'YYYY-MM-DD'). Sorted by severity descending, stable within severity.
 * No side effects. Does not construct Date objects; uses only string comparison
 * for date ordering.
 */
export function deriveSignals(domain: AppDomainState, today: string): Signal[] {
  const signals: Signal[] = [];

  // ── 1. Tasks breaching a hard constraint ─────────────────────────────────
  const { breaches } = detectConstraintIssues(domain.tasks);
  for (const breach of breaches) {
    const task = domain.tasks.find((t) => t.id === breach.taskId);
    if (!task) continue;
    signals.push({
      id: `breach-${breach.taskId}-${breach.constraintType}`,
      category: 'breach',
      severity: 100,
      title: `Constraint breach: ${task.title}`,
      detail: `${breach.constraintType}${breach.breachDays != null ? ` — ${breach.breachDays}d` : ''}`,
      taskId: breach.taskId,
    });
  }

  // ── 2. External dependencies Late or AtRisk linked to tasks ──────────────
  for (const dep of domain.externalDependencies) {
    if (dep.status !== 'Late' && dep.status !== 'AtRisk') continue;
    const severity = dep.status === 'Late' ? 80 : 60;
    if (dep.linkedTaskIds.length > 0) {
      for (const taskId of dep.linkedTaskIds) {
        signals.push({
          id: `dep-${dep.id}-${taskId}`,
          category: 'dep',
          severity,
          title: dep.title,
          detail: `${dep.status} — due ${dep.targetDate}`,
          taskId,
          entityId: dep.id,
        });
      }
    } else {
      signals.push({
        id: `dep-${dep.id}`,
        category: 'dep',
        severity,
        title: dep.title,
        detail: `${dep.status} — due ${dep.targetDate}`,
        entityId: dep.id,
      });
    }
  }

  // ── 3. Deliverables ready for acceptance ─────────────────────────────────
  for (const del of domain.deliverables) {
    if (del.status === 'Accepted') continue;
    if (!canBeAccepted(del)) continue;
    signals.push({
      id: `gate-${del.id}`,
      category: 'gate',
      severity: 70,
      title: `Ready to accept: ${del.title}`,
      detail: `All ${del.acceptanceCriteria.length} criteria met`,
      entityId: del.id,
      taskId: del.linkedTaskIds[0],
    });
  }

  // ── 4. Open risks whose review date is on or before today ─────────────────
  for (const risk of domain.risks) {
    if (risk.status === 'Closed') continue;
    if (risk.reviewDate > today) continue;
    signals.push({
      id: `risk-${risk.id}`,
      category: 'risk',
      severity: risk.scores.residual.score,
      title: `Risk review due: ${risk.title}`,
      detail: `Score ${risk.scores.residual.score} — review by ${risk.reviewDate}`,
      entityId: risk.id,
      taskId: risk.linkedTaskIds[0],
    });
  }

  // ── 5. Tasks carrying forecastWarning or deliverableWarning ──────────────
  for (const task of domain.tasks) {
    if (task.forecastWarning) {
      signals.push({
        id: `forecast-${task.id}`,
        category: 'forecast',
        severity: 50,
        title: `Late dependency: ${task.title}`,
        detail: 'Linked external dependency is late',
        taskId: task.id,
      });
    }
    if (task.deliverableWarning) {
      signals.push({
        id: `forecast-del-${task.id}`,
        category: 'forecast',
        severity: 45,
        title: `Deliverable warning: ${task.title}`,
        detail: 'Linked deliverable is rejected or overdue',
        taskId: task.id,
      });
    }
  }

  // Sort descending by severity, stable (preserve insertion order within tier).
  return signals.sort((a, b) => b.severity - a.severity);
}
