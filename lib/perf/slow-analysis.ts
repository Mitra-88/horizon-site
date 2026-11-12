import type { SpanRow, TickRow, TreeRow } from "./types";

/** One step of a slow tick against its usual time; `usual` is null for a step the capture has no average for. */
export interface StepLine {
  name: string;
  parent: string;
  depth: number;
  wall: number;
  cpu: number;
  usual: number | null;
  extra: number | null;
}

/** A step that keeps costing more than usual across the slow ticks. */
export interface Culprit {
  name: string;
  parent: string;
  /** The extra own time per tick, over the ticks given. */
  extra: number;
  /** In how many ticks this step's extra own time was the largest. */
  largestIn: number;
}

function key(parent: string, name: string): string {
  return `${parent}>${name}`;
}

/** The average time of each step, by its parent's name and its own. */
export function usualTimes(rows: readonly SpanRow[]): ReadonlyMap<string, number> {
  const nameOf = new Map(rows.map((row) => [row.id, row.name]));
  return new Map(
    rows.map((row) => [key(row.parent ? (nameOf.get(row.parent) ?? "") : "", row.name), row.values[0] ?? 0]),
  );
}

/** A tick's steps in tree order, each with what it usually takes. */
export function stepLines(tick: TickRow, usual: ReadonlyMap<string, number>): StepLine[] {
  const open: string[] = [];
  return tick.spans.map(([name, depth, wall, cpu]) => {
    open.length = depth;
    const parent = open[depth - 1] ?? "";
    open[depth] = name;
    const typical = usual.get(key(parent, name)) ?? null;
    return { name, parent, depth, wall, cpu, usual: typical, extra: typical === null ? null : wall - typical };
  });
}

/** A tick's steps as the rows a flame graph draws; shares are of the whole tick. */
export function tickFlame(tick: TickRow): TreeRow[] {
  const roots: TreeRow[] = [];
  const open: TreeRow[] = [];
  tick.spans.forEach(([name, depth, wall], at) => {
    const row: TreeRow = {
      id: `${at}`,
      function: name,
      name,
      // Steps have no crate of their own; they are the game's code.
      crate: "horizon_client",
      total: wall,
      self: null,
      pct: tick.wall_ms > 0 ? (wall / tick.wall_ms) * 100 : 0,
      samples: 0,
      children: [],
    };
    open.length = depth;
    (depth === 0 ? roots : (open[depth - 1]?.children ?? roots)).push(row);
    open[depth] = row;
  });
  return roots;
}

/** Each step's own extra time in one tick: what is left after the steps inside it, so a parent does not repeat them. */
function ownExtras(lines: readonly StepLine[]): Map<string, number> {
  const extras = new Map<string, number>();
  lines.forEach((line, at) => {
    if (line.extra === null) return;
    let inner = 0;
    for (let next = at + 1; next < lines.length && lines[next].depth > line.depth; next += 1) {
      const child = lines[next];
      if (child.depth === line.depth + 1) inner += child.extra ?? 0;
    }
    const id = key(line.parent, line.name);
    extras.set(id, (extras.get(id) ?? 0) + line.extra - inner);
  });
  return extras;
}

/** The steps that most often run long in these ticks, worst first. */
export function culprits(
  ticks: readonly TickRow[],
  usual: ReadonlyMap<string, number>,
  limit: number,
): Culprit[] {
  const totals = new Map<string, { name: string; parent: string; extra: number; largestIn: number }>();
  for (const tick of ticks) {
    const lines = stepLines(tick, usual);
    const extras = ownExtras(lines);
    const counted = new Set<string>();
    let largest: string | null = null;
    for (const line of lines) {
      const id = key(line.parent, line.name);
      if (counted.has(id)) continue;
      counted.add(id);
      const extra = extras.get(id) ?? 0;
      const entry = totals.get(id) ?? { name: line.name, parent: line.parent, extra: 0, largestIn: 0 };
      entry.extra += extra;
      totals.set(id, entry);
      if (extra > 0 && (largest === null || extra > (extras.get(largest) ?? 0))) largest = id;
    }
    if (largest !== null) (totals.get(largest) as Culprit).largestIn += 1;
  }
  return [...totals.values()]
    .map((entry) => ({ ...entry, extra: entry.extra / Math.max(1, ticks.length) }))
    .filter((entry) => entry.extra > 0)
    .sort((a, b) => b.extra - a.extra)
    .slice(0, limit);
}
