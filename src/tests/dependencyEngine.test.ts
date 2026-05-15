import { describe, expect, it } from 'vitest';
import {
  addDependency,
  computeLinkedTasks,
  removeDependency,
  topoSort,
  wouldCreateCycle,
} from '../engine/dependencyEngine';
import { seedTasks } from '../domain/seedData';

describe('dependencyEngine', () => {
  it('topoSort orders the seed graph without reporting a cycle', () => {
    const tasks = seedTasks();
    const result = topoSort(tasks);
    expect(result.hasCycle).toBe(false);
    expect(result.sorted.length).toBe(tasks.length);

    // T01 must come before T02 (FS dependency)
    const positions = new Map(result.sorted.map((t, i) => [t.id, i]));
    expect(positions.get('T01')!).toBeLessThan(positions.get('T02')!);
    expect(positions.get('T02')!).toBeLessThan(positions.get('T03')!);
    expect(positions.get('T09')!).toBeLessThan(positions.get('T10')!);

    // Parent T07 must come before its children T07a/T07b/T07c
    expect(positions.get('T07')!).toBeLessThan(positions.get('T07a')!);
    expect(positions.get('T07')!).toBeLessThan(positions.get('T07b')!);
    expect(positions.get('T07')!).toBeLessThan(positions.get('T07c')!);

    // T07's children must come before T08 (via the virtual edges in topoSort)
    expect(positions.get('T07a')!).toBeLessThan(positions.get('T08')!);
    expect(positions.get('T07b')!).toBeLessThan(positions.get('T08')!);
    expect(positions.get('T07c')!).toBeLessThan(positions.get('T08')!);
  });

  it('wouldCreateCycle catches direct and transitive loops', () => {
    const tasks = seedTasks();
    // T02 already depends on T01, so T01 → T02 already exists.
    // Attempting T02 → T01 would create a cycle.
    expect(wouldCreateCycle(tasks, 'T02', 'T01')).toBe(true);
    // Transitive: T05 transitively depends on T01 via T02 → T03 → T05.
    // T05 → T01 is a cycle.
    expect(wouldCreateCycle(tasks, 'T05', 'T01')).toBe(true);
    // T03 → T04 is fine: neither depends on the other.
    expect(wouldCreateCycle(tasks, 'T03', 'T04')).toBe(false);
    // Self-loop
    expect(wouldCreateCycle(tasks, 'T01', 'T01')).toBe(true);
  });

  it('computeLinkedTasks walks forward through dep + parent edges', () => {
    const tasks = seedTasks();
    // Changing T01 should ripple to T02, T03, T04, T05, T06, T07 (+ its children), T08, T09, T10.
    const linked = computeLinkedTasks(tasks, 'T01');
    ['T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T07a', 'T07b', 'T07c', 'T08', 'T09', 'T10'].forEach(
      (id) => {
        expect(linked.has(id)).toBe(true);
      },
    );
    // T01 itself should not be in linked (only forward).
    expect(linked.has('T01')).toBe(false);
  });

  it('addDependency replaces an existing dep instead of duplicating', () => {
    const tasks = seedTasks();
    // T02 already depends on T01 (finish-to-start, 0 lag).
    const next = addDependency(tasks, 'T01', 'T02', 'finish_to_start', 3);
    const t2 = next.find((t) => t.id === 'T02')!;
    const t1Deps = t2.dependencies.filter((d) => d.taskId === 'T01');
    expect(t1Deps.length).toBe(1);
    expect(t1Deps[0].lagDays).toBe(3);
  });

  it('removeDependency leaves no trace and preserves immutability', () => {
    const tasks = seedTasks();
    const before = tasks.find((t) => t.id === 'T02')!.dependencies.length;
    const next = removeDependency(tasks, 'T01', 'T02');
    const t2 = next.find((t) => t.id === 'T02')!;
    expect(t2.dependencies.some((d) => d.taskId === 'T01')).toBe(false);
    // Original tasks unchanged
    expect(tasks.find((t) => t.id === 'T02')!.dependencies.length).toBe(before);
  });
});
