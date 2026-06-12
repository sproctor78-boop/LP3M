# Ripple design language — v0.12+ surfaces

## Principle

Register data (risks, external dependencies, deliverables) surfaces **in context** via
small primitives anchored near the work it touches. Grids remain audit views;
they are never restyled with these primitives. All labels use sentence case.
Typography follows a two-weight rule: regular (400) for body, medium (500) or
semibold (600) for headings and interactive labels — never bold (700+) on small text.

---

## Primitives

### `.rip-badge`

A compact pill, 10–11 px, weight 500. Use for category tags, count labels, and
status chips where space is at a premium — inside table cells, on timeline bars,
in list rows. Modifiers:

| Modifier | Family | When to use |
|---|---|---|
| `--risk` | Red | Risk category, breach indicators |
| `--dep` | Amber | External-dependency status, forecast warnings |
| `--gate` | Teal | Deliverable gate / acceptance status |

Never use a badge as an interactive affordance; it is read-only.

---

### `.rip-chip`

A removable selection chip: label + × affordance. Used exclusively by
`LinkPicker` to show the currently selected items. Rendered in the accent
(blue) family to signal an active selection that can be removed. The × button
must carry an `aria-label` naming the item.

---

### `.rip-hovercard`

A small anchored card that appears on hover or keyboard focus near a badge or
reference. Anatomy: title row (12 px, weight 600) + one or more meta rows
(11 px, muted) + optional action row separated by a hairline border.
Max width 320 px; 0.5 px border; `--radius-md` corners; `--shadow-md` elevation.

Use when a task bar, timeline annotation, or grid cell needs to expose a
summary without opening the inspector. The card is **read-only** — it links
to the inspector for mutations.

---

### `.rip-popover`

An anchored editing container: same anatomy as hovercard but larger padding
(16 px), wider max-width (380 px), and `--shadow-lg` elevation. The popover
is **focus-trapped** and dismisses on Escape. Use for inline edits that do not
warrant the full inspector drawer — quick score adjustments, status changes,
notes edits.

---

### `.rip-signal-card`

A rail card used for compact register summaries displayed alongside the timeline
or in sidebar rails. Anatomy: 11 px category label (semantic colour) +
12 px body line + optional action row. Single-line body only; truncate with
`text-overflow: ellipsis`.

Use to surface the highest-priority risk, nearest ext-dep deadline, or next
deliverable gate without cluttering the timeline grid itself.

---

## Grids vs. primitives

The Risk Register, External Dependencies, and Deliverables grids are full-width
audit tables. They are **not** restyled with these classes — their purpose is
completeness, not contextual awareness. Use primitives only in:

- timeline overlays and annotations
- inspector drawer header badges
- task bar tooltips / hovercards
- sidebar signal rails

---

## Tokens contract

All colour, shadow, radius, and spacing values come exclusively from
`src/styles/tokens.css`. Adding a new token there is preferred over hardcoding
a value. Surface-specific tokens (e.g. the teal gate colour) that are not yet
in the global palette live in `surface.css` as locally scoped values until
they earn promotion.
