// =============================================================================
// Command palette input parser — pure function, no DOM, no React.
// =============================================================================

import { WorkItem } from '../../domain/types';

export type PalettePrefix = 'task' | 'risk' | 'dep' | 'del' | null;

export interface ParsedPaletteInput {
  prefix: PalettePrefix;
  title: string;
  /** Task IDs pre-selected via @TOKEN or title-word matching. */
  linkedTaskIds: string[];
  /** Matching tasks for the search path (no prefix). */
  searchResults: WorkItem[];
  /** Human-readable hint describing what Enter will do. */
  hint: string;
}

const PREFIX_RE = /^(task|risk|dep|del):\s*/i;
const AT_TOKEN_RE = /@([A-Za-z0-9_-]+)/g;

function extractAtTokens(text: string): string[] {
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  AT_TOKEN_RE.lastIndex = 0;
  while ((m = AT_TOKEN_RE.exec(text)) !== null) {
    matches.push(m[1].toUpperCase());
  }
  return matches;
}

/** Words from title that are 3+ chars (for substring matching). */
function titleWords(title: string): string[] {
  return title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

function findLinkedTaskIds(freeText: string, tasks: WorkItem[]): string[] {
  const atTokens = extractAtTokens(freeText).map((t) => t.toUpperCase());
  const words = titleWords(freeText);
  const matched = new Set<string>();

  for (const task of tasks) {
    const idUpper = task.id.toUpperCase();
    // Exact @TOKEN match
    if (atTokens.some((tok) => tok === idUpper)) {
      matched.add(task.id);
      continue;
    }
    // ID substring match (case-insensitive)
    if (atTokens.some((tok) => idUpper.includes(tok))) {
      matched.add(task.id);
      continue;
    }
    // Title word match (3+ chars)
    const taskTitleLower = task.title.toLowerCase();
    if (words.some((w) => taskTitleLower.includes(w))) {
      matched.add(task.id);
    }
  }

  return [...matched];
}

function searchTasks(query: string, tasks: WorkItem[]): WorkItem[] {
  if (!query) return [];
  const q = query.toLowerCase();
  return tasks
    .filter(
      (t) =>
        t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q),
    )
    .slice(0, 6);
}

export function parsePaletteInput(raw: string, tasks: WorkItem[]): ParsedPaletteInput {
  const prefixMatch = PREFIX_RE.exec(raw);

  if (prefixMatch) {
    const prefix = prefixMatch[1].toLowerCase() as PalettePrefix;
    const rest = raw.slice(prefixMatch[0].length);
    const linkedTaskIds = (prefix === 'risk' || prefix === 'dep' || prefix === 'del')
      ? findLinkedTaskIds(rest, tasks)
      : [];
    const kindLabel =
      prefix === 'task' ? 'task' :
      prefix === 'risk' ? 'risk' :
      prefix === 'dep'  ? 'external dependency' :
                          'deliverable';
    const linkHint =
      linkedTaskIds.length > 0
        ? ` — will link: ${linkedTaskIds.join(', ')}`
        : '';
    return {
      prefix,
      title: rest,
      linkedTaskIds,
      searchResults: [],
      hint: rest.trim()
        ? `Enter to open new-${kindLabel} form pre-filled with "${rest.trim()}"${linkHint}`
        : `Type a title for your ${kindLabel}`,
    };
  }

  // No prefix — search mode
  const results = searchTasks(raw, tasks);
  return {
    prefix: null,
    title: raw,
    linkedTaskIds: [],
    searchResults: results,
    hint: raw.trim()
      ? results.length > 0
        ? `${results.length} result${results.length > 1 ? 's' : ''} — Enter or click to jump`
        : 'No matching tasks'
      : 'Type to search, or use task: / risk: / dep: / del:',
  };
}
