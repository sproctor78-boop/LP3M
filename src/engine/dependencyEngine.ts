import { WorkItem } from '../domain/types';

export function deepCopyTasks(tasks: WorkItem[]): WorkItem[] {
  return tasks.map((task) => ({
    ...task,
    dependencies: task.dependencies.map((dependency) => ({ ...dependency })),
    constraint: task.constraint ? { ...task.constraint } : null
  }));
}

export function topoSort(tasks: WorkItem[]): WorkItem[] {
  const map = new Map(tasks.map((task) => [task.id, task]));
  const indegree = new Map(tasks.map((task) => [task.id, 0]));
  const successors = new Map(tasks.map((task) => [task.id, [] as string[]]));

  tasks.forEach((task) => {
    task.dependencies.forEach((dependency) => {
      if (!map.has(dependency.taskId)) return;
      indegree.set(task.id, (indegree.get(task.id) ?? 0) + 1);
      successors.get(dependency.taskId)?.push(task.id);
    });

    if (task.parentId && map.has(task.parentId)) {
      indegree.set(task.id, (indegree.get(task.id) ?? 0) + 1);
      successors.get(task.parentId)?.push(task.id);
    }
  });

  tasks.forEach((parent) => {
    if (!parent.isParent) return;
    const children = tasks.filter((child) => child.parentId === parent.id);
    const externalSuccessors = tasks.filter((candidate) => candidate.dependencies.some((dependency) => dependency.taskId === parent.id));
    children.forEach((child) => {
      externalSuccessors.forEach((successor) => {
        indegree.set(successor.id, (indegree.get(successor.id) ?? 0) + 1);
        successors.get(child.id)?.push(successor.id);
      });
    });
  });

  const queue = [...indegree.entries()].filter(([, value]) => value === 0).map(([id]) => id);
  const sorted: WorkItem[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    const task = map.get(id);
    if (task) sorted.push(task);
    successors.get(id)?.forEach((successorId) => {
      indegree.set(successorId, (indegree.get(successorId) ?? 0) - 1);
      if ((indegree.get(successorId) ?? 0) === 0) queue.push(successorId);
    });
  }

  if (sorted.length !== tasks.length) {
    return tasks;
  }

  return sorted;
}

export function computeLinkedTasks(tasks: WorkItem[], fromId: string): Set<string> {
  const forward = new Map(tasks.map((task) => [task.id, [] as string[]]));

  tasks.forEach((task) => {
    task.dependencies.forEach((dependency) => forward.get(dependency.taskId)?.push(task.id));
    if (task.parentId) {
      forward.get(task.parentId)?.push(task.id);
      forward.get(task.id)?.push(task.parentId);
    }
  });

  const linked = new Set<string>();
  const stack = [...(forward.get(fromId) ?? [])];

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (linked.has(id)) continue;
    linked.add(id);
    forward.get(id)?.forEach((successorId) => stack.push(successorId));
  }

  return linked;
}

export function wouldCreateCycle(tasks: WorkItem[], fromId: string, toId: string): boolean {
  if (fromId === toId) return true;
  const map = new Map(tasks.map((task) => [task.id, task]));
  const visited = new Set<string>();
  const stack = [fromId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === toId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const task = map.get(current);
    if (!task) continue;
    task.dependencies.forEach((dependency) => stack.push(dependency.taskId));
    if (task.parentId) stack.push(task.parentId);
  }

  return false;
}
