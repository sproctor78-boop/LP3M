// =============================================================================
// Dependency engine
// =============================================================================
// Topological sort with parent semantics, linked-task discovery (forward walk
// through dep + parent edges), and dependency mutation helpers. All functions
// are pure: they return new arrays/objects and never mutate their inputs.
// =============================================================================

import { DependencyType, WorkItem } from '../domain/types';

/** Returns a deep copy where dependencies and constraint are also copied. */
export function deepCopyTasks(tasks: WorkItem[]): WorkItem[] {
  return tasks.map((task) => ({
    ...task,
    dependencies: task.dependencies.map((dep) => ({ ...dep })),
    constraint: task.constraint ? { ...task.constraint } : null,
  }));
}

interface TopoResult {
  /** Tasks in dependency order. If a cycle was detected, this may be shorter than the input. */
  sorted: WorkItem[];
  /** True if the input contained a cycle (some tasks could not be ordered). */
  hasCycle: boolean;
}

/**
 * Topological sort with two kinds of edges:
 *   1. predecessor → successor (from `dependencies`)
 *   2. parent → child (so a child is processed after its parent)
 * Plus virtual edges: child → parent's external successor, so that a parent's
 * rolled-up endDate is fully known before any task that depends on the parent
 * is scheduled.
 */
export function topoSort(tasks: WorkItem[]): TopoResult {
  const map = new Map(tasks.map((task) => [task.id, task]));
  const indegree = new Map(tasks.map((task) => [task.id, 0]));
  const successors = new Map<string, string[]>(tasks.map((task) => [task.id, []]));

  // Standard edges
  tasks.forEach((task) => {
    task.dependencies.forEach((dep) => {
      if (!map.has(dep.taskId)) return;
      indegree.set(task.id, (indegree.get(task.id) ?? 0) + 1);
      successors.get(dep.taskId)!.push(task.id);
    });
    if (task.parentId && map.has(task.parentId)) {
      indegree.set(task.id, (indegree.get(task.id) ?? 0) + 1);
      successors.get(task.parentId)!.push(task.id);
    }
  });

  // Virtual edges: child → parent's external successor
  tasks.forEach((parent) => {
    if (!parent.isParent) return;
    const children = tasks.filter((c) => c.parentId === parent.id);
    const externalSuccessors = tasks.filter((s) =>
      s.dependencies.some((d) => d.taskId === parent.id),
    );
    children.forEach((child) => {
      externalSuccessors.forEach((es) => {
        indegree.set(es.id, (indegree.get(es.id) ?? 0) + 1);
        successors.get(child.id)!.push(es.id);
      });
    });
  });

  const queue: string[] = [];
  indegree.forEach((value, key) => {
    if (value === 0) queue.push(key);
  });

  const sorted: WorkItem[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    const task = map.get(id);
    if (task) sorted.push(task);
    successors.get(id)?.forEach((sid) => {
      indegree.set(sid, (indegree.get(sid) ?? 0) - 1);
      if ((indegree.get(sid) ?? 0) === 0) queue.push(sid);
    });
  }

  return { sorted, hasCycle: sorted.length !== tasks.length };
}

/**
 * Every task whose schedule may shift as a consequence of changing `fromId`.
 * Walks forward through dep edges, and BOTH directions through parent↔child
 * edges so that:
 *   • Changing a child ripples up via its parent's endDate to the parent's
 *     dep successors.
 *   • Changing a parent ripples down to its children.
 */
export function computeLinkedTasks(tasks: WorkItem[], fromId: string): Set<string> {
  const forward = new Map<string, string[]>(tasks.map((t) => [t.id, []]));

  tasks.forEach((task) => {
    task.dependencies.forEach((dep) => {
      forward.get(dep.taskId)?.push(task.id);
    });
    if (task.parentId) {
      // parent → child
      forward.get(task.parentId)?.push(task.id);
      // child → parent (so a child change reaches the parent's successors)
      forward.get(task.id)?.push(task.parentId);
    }
  });

  const linked = new Set<string>();
  const stack = [...(forward.get(fromId) ?? [])];

  while (stack.length) {
    const id = stack.pop()!;
    if (linked.has(id)) continue;
    linked.add(id);
    forward.get(id)?.forEach((s) => stack.push(s));
  }

  return linked;
}

/**
 * Would adding a new dependency `fromId → toId` create a cycle?
 * Walks "waits-for" edges backwards from `fromId`: a task waits for its
 * predecessors and for its parent. Cycle iff `toId` is reachable.
 */
export function wouldCreateCycle(tasks: WorkItem[], fromId: string, toId: string): boolean {
  if (fromId === toId) return true;
  const map = new Map(tasks.map((task) => [task.id, task]));
  const visited = new Set<string>();
  const stack: string[] = [fromId];

  while (stack.length) {
    const current = stack.pop()!;
    if (current === toId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const task = map.get(current);
    if (!task) continue;
    task.dependencies.forEach((dep) => stack.push(dep.taskId));
    if (task.parentId) stack.push(task.parentId);
  }

  return false;
}

/** Returns a NEW task array with the dependency added or updated. */
export function addDependency(
  tasks: WorkItem[],
  fromId: string,
  toId: string,
  type: DependencyType = 'finish_to_start',
  lagDays: number = 0,
): WorkItem[] {
  const next = deepCopyTasks(tasks);
  const target = next.find((t) => t.id === toId);
  if (!target) return next;

  const existing = target.dependencies.find((d) => d.taskId === fromId);
  if (existing) {
    existing.type = type;
    existing.lagDays = lagDays;
  } else {
    target.dependencies.push({ taskId: fromId, type, lagDays });
  }
  return next;
}

/** Returns a NEW task array with the dependency removed. */
export function removeDependency(tasks: WorkItem[], fromId: string, toId: string): WorkItem[] {
  const next = deepCopyTasks(tasks);
  const target = next.find((t) => t.id === toId);
  if (!target) return next;
  target.dependencies = target.dependencies.filter((d) => d.taskId !== fromId);
  return next;
}
