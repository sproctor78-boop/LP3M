// =============================================================================
// v0.18 "Signal" — test suite
// =============================================================================
// Renders real React components into jsdom without a testing-library
// dependency (none is installed and the release adds no new deps): a bare
// react-dom/client root, flushSync for synchronous commits, and native DOM
// events. JSX requires a .tsx loader, so this .ts file uses
// React.createElement directly.
// =============================================================================

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement as h, ReactElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { RiskGrid } from '../components/RiskRegister/RiskGrid';
import { SectionTiles } from '../components/AppShell/SectionTiles';
import { RippleMark } from '../components/AppShell/RippleMark';
import { Risk } from '../domain/risk';
import { ViewMode } from '../domain/types';

// ---------------------------------------------------------------------------
// Render helpers (no testing-library — see file header)
// ---------------------------------------------------------------------------

const roots: { root: Root; container: HTMLDivElement }[] = [];

function renderIntoDocument(element: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => root.render(element));
  roots.push({ root, container });
  return container;
}

afterEach(() => {
  while (roots.length) {
    const { root, container } = roots.pop()!;
    flushSync(() => root.unmount());
    container.remove();
  }
});

function makeRisk(id: string, extra: Partial<Risk> = {}): Risk {
  const s = { probabilityPct: 50, probabilityBand: 3 as const, costImpact: 3 as const, timeImpact: 3 as const, score: 9, rag: 'amber' as const };
  return {
    id,
    title: id,
    description: '',
    category: 'Technical',
    owner: 'alice',
    status: 'Open',
    scores: { inherent: s, residual: s, target: s },
    proposedResidualScore: null,
    controls: [],
    mitigations: [],
    raisedDate: '2026-01-01',
    reviewDate: '2026-12-31',
    lastModifiedAt: '2026-01-01T00:00:00.000Z',
    proximity: 'MediumTerm',
    linkedTaskIds: [],
    linkedDeliverableIds: [],
    linkedDependencyIds: [],
    ...extra,
  };
}

function renderRiskGrid(collapsed: boolean) {
  return renderIntoDocument(
    h(RiskGrid, {
      risks: [makeRisk('R1'), makeRisk('R2')],
      selectedRiskId: null,
      onSelectRisk: () => {},
      collapseState: { inherentCollapsed: collapsed, residualCollapsed: collapsed },
      onSetCollapse: () => {},
    }),
  );
}

// ---------------------------------------------------------------------------
// 1 & 2. RiskGrid group-header layout + colSpan integrity
// ---------------------------------------------------------------------------

describe('WP1 — RiskGrid Inherent/Residual group header', () => {
  it('the group header row is a single <tr> containing both group <th>s as siblings', () => {
    const container = renderRiskGrid(false);
    const groupRows = container.querySelectorAll('tr.risk-grid-group-row');
    expect(groupRows.length).toBe(1);

    const groupRow = groupRows[0];
    const inherentTh = groupRow.querySelector('th.col-group-inherent');
    const residualTh = groupRow.querySelector('th.col-group-residual');
    expect(inherentTh).not.toBeNull();
    expect(residualTh).not.toBeNull();
    // Siblings on the same row, not stacked into separate rows.
    expect(inherentTh!.parentElement).toBe(groupRow);
    expect(residualTh!.parentElement).toBe(groupRow);
  });

  it('reports colSpan 6 when expanded', () => {
    const container = renderRiskGrid(false);
    const inherentTh = container.querySelector('th.col-group-inherent') as HTMLTableCellElement;
    const residualTh = container.querySelector('th.col-group-residual') as HTMLTableCellElement;
    expect(inherentTh.colSpan).toBe(6);
    expect(residualTh.colSpan).toBe(6);
  });

  it('reports colSpan 2 when collapsed', () => {
    const container = renderRiskGrid(true);
    const inherentTh = container.querySelector('th.col-group-inherent') as HTMLTableCellElement;
    const residualTh = container.querySelector('th.col-group-residual') as HTMLTableCellElement;
    expect(inherentTh.colSpan).toBe(2);
    expect(residualTh.colSpan).toBe(2);
  });

  it('the collapse toggle buttons remain present and functional inside each group header', () => {
    const onSetCollapse = vi.fn();
    const container = renderIntoDocument(
      h(RiskGrid, {
        risks: [makeRisk('R1')],
        selectedRiskId: null,
        onSelectRisk: () => {},
        collapseState: { inherentCollapsed: false, residualCollapsed: false },
        onSetCollapse,
      }),
    );
    const toggles = container.querySelectorAll('th.col-group-inherent .col-group-toggle, th.col-group-residual .col-group-toggle');
    expect(toggles.length).toBe(2);
    // Buttons are centred inside the new .col-group-inner wrapper.
    expect(container.querySelectorAll('.col-group-inner').length).toBe(2);

    flushSync(() => (toggles[0] as HTMLButtonElement).click());
    expect(onSetCollapse).toHaveBeenCalledWith('inherent', true);
  });
});

// ---------------------------------------------------------------------------
// 3. SectionTiles
// ---------------------------------------------------------------------------

describe('WP3 — SectionTiles', () => {
  const options = [
    { key: 'timeline' as ViewMode, label: 'Timeline' },
    { key: 'board' as ViewMode, label: 'Board' },
    { key: 'riskRegister' as ViewMode, label: 'Risk Register' },
    { key: 'raidBoard' as ViewMode, label: 'RAID Board' },
    { key: 'extDepRegister' as ViewMode, label: 'External Dependencies' },
    { key: 'deliverableRegister' as ViewMode, label: 'Deliverables' },
  ];

  it('renders all six view labels', () => {
    const container = renderIntoDocument(
      h(SectionTiles, { mode: 'timeline', options, onSelect: () => {} }),
    );
    for (const opt of options) {
      expect(container.textContent).toContain(opt.label);
    }
  });

  it('the active tile has the .active class and only the active tile has it', () => {
    const container = renderIntoDocument(
      h(SectionTiles, { mode: 'riskRegister', options, onSelect: () => {} }),
    );
    const activeTiles = container.querySelectorAll('.section-tile.active');
    expect(activeTiles.length).toBe(1);
    expect(activeTiles[0].textContent).toContain('Risk Register');
  });

  it('clicking a non-active tile fires onSelect with the correct view mode key', () => {
    const onSelect = vi.fn();
    const container = renderIntoDocument(
      h(SectionTiles, { mode: 'timeline', options, onSelect }),
    );
    const tiles = container.querySelectorAll('.section-tile');
    // Index 3 = raidBoard
    flushSync(() => (tiles[3] as HTMLButtonElement).click());
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('raidBoard');
  });

  it('clicking the active tile is a no-op', () => {
    const onSelect = vi.fn();
    const container = renderIntoDocument(
      h(SectionTiles, { mode: 'timeline', options, onSelect }),
    );
    const activeTile = container.querySelector('.section-tile.active') as HTMLButtonElement;
    flushSync(() => activeTile.click());
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. RippleMark
// ---------------------------------------------------------------------------

describe('WP2 — RippleMark', () => {
  it('renders three circles: the droplet plus two rings', () => {
    const container = renderIntoDocument(h(RippleMark, {}));
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(3);
    expect(container.querySelectorAll('.ripple-mark-ring').length).toBe(2);
  });

  it('sits inside an .app-wordmark trigger when composed as AppShell does', () => {
    const container = renderIntoDocument(
      h('span', { className: 'app-wordmark' }, 'Ripple', h(RippleMark, {})),
    );
    const wordmark = container.querySelector('.app-wordmark');
    expect(wordmark).not.toBeNull();
    expect(wordmark!.querySelector('svg.ripple-mark')).not.toBeNull();
    expect(wordmark!.querySelectorAll('circle').length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 5. No dropdown regressions
// ---------------------------------------------------------------------------

describe('WP3 — SectionSwitcher removal', () => {
  // Vite's import.meta.glob reads the whole src/ tree as raw text without a
  // Node fs dependency (this project has no @types/node and adds none here).
  const sourceFiles = import.meta.glob('/src/**/*.{ts,tsx}', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>;

  it('SectionSwitcher.tsx no longer exists', () => {
    const paths = Object.keys(sourceFiles);
    expect(paths.some((p) => p.endsWith('SectionSwitcher.tsx'))).toBe(false);
  });

  it('no file under src/ references SectionSwitcher', () => {
    const offenders = Object.entries(sourceFiles)
      .filter(([, content]) => content.includes('SectionSwitcher'))
      .map(([p]) => p);

    expect(offenders).toEqual([]);
  });
});
