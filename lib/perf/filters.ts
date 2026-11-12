// The filters the whole capture view shares, and which of them each query op reads in the reader (crates/horizon-perf/src/query).
import type { Tab } from "./tabs";
import type { BoundArg, ContextFilter, ContextKey, QueryOp, RequestFilters, SampleKind } from "./types";

export type FilterKey = "range" | "thread" | "select" | "slow" | ContextKey;

export const CONTEXT_FILTER_KEYS: readonly ContextKey[] = ["span", "entity", "block", "chunk", "dim"];

export const FILTER_KEYS: readonly FilterKey[] = ["range", "thread", "select", "slow", ...CONTEXT_FILTER_KEYS];

/** One end of the time range: a second of the capture, or a mark the reader looks up by name. */
export type Bound = { kind: "seconds"; seconds: number } | { kind: "mark"; name: string };

export interface TimeRange {
  from: Bound;
  to: Bound;
}

export interface CaptureFilters {
  range: TimeRange | null;
  /** The thread picked; null leaves the side's main thread. */
  thread: string | null;
  select: SampleKind;
  slow: boolean;
  where: ContextFilter;
}

export const NO_FILTERS: CaptureFilters = { range: null, thread: null, select: "cpu", slow: false, where: {} };

const SAMPLE_OPS: readonly FilterKey[] = FILTER_KEYS;

// A one-line gotcha per row: spans reads the thread only for the unfiltered table, series only for `span:` fields.
export const OP_FILTERS: Record<QueryOp, readonly FilterKey[]> = {
  hot: SAMPLE_OPS,
  tree: SAMPLE_OPS,
  callers: SAMPLE_OPS,
  callees: SAMPLE_OPS,
  split: SAMPLE_OPS,
  group: SAMPLE_OPS,
  frames: SAMPLE_OPS,
  spans: ["range", "thread", "slow"],
  ticks: ["range"],
  tick: [],
  series: ["range", "thread"],
  world: ["dim"],
  net: ["range"],
  gpu: [],
  gpu_frames: ["range"],
  meta: [],
  memory: [],
  marks: ["range"],
  warnings: [],
  bench: [],
};

/** The ops each tab asks, so a tab can say which active filters its numbers ignore. */
export const TAB_OPS: Record<Tab, readonly QueryOp[]> = {
  summary: ["series", "spans", "hot", "group", "world"],
  metadata: ["meta"],
  gpu: ["gpu", "gpu_frames", "marks"],
  spans: ["spans"],
  ticks: ["ticks", "tick"],
  world: ["world"],
  net: ["net"],
  memory: ["memory"],
  bench: ["bench"],
  marks: ["marks"],
  warnings: ["warnings"],
  hot: ["hot", "callers", "callees", "frames", "group"],
  tree: ["tree", "callers", "callees", "split", "group"],
  compare: [],
};

export function boundArg(bound: Bound): BoundArg {
  return bound.kind === "mark" ? `mark:${bound.name}` : bound.seconds;
}

/** The reader names a dimension `minecraft:overworld` in `world` and `d:overworld` among samples. */
export function worldDimension(value: string): string {
  const name = value.replace(/^d:/, "");
  return name.includes(":") ? name : `minecraft:${name}`;
}

function whereFor(where: ContextFilter, honoured: ReadonlySet<FilterKey>, op: QueryOp): ContextFilter | null {
  const out: ContextFilter = {};
  for (const key of CONTEXT_FILTER_KEYS) {
    const values = where[key];
    if (!honoured.has(key) || !values || values.length === 0) continue;
    out[key] = op === "world" && key === "dim" ? values.map(worldDimension) : [...values];
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** The request filters `op` reads out of the shared ones; the rest are left off so the reply is the one `horizon-perf` gives. */
export function wireFilters(filters: CaptureFilters, op: QueryOp): RequestFilters {
  const honoured = new Set(OP_FILTERS[op]);
  const out: RequestFilters = {};
  if (honoured.has("range") && filters.range) {
    out.from = boundArg(filters.range.from);
    out.to = boundArg(filters.range.to);
  }
  if (honoured.has("thread") && filters.thread !== null) out.thread = filters.thread;
  if (honoured.has("select") && filters.select !== "cpu") out.select = filters.select;
  if (honoured.has("slow") && filters.slow) out.slow = true;
  const where = whereFor(filters.where, honoured, op);
  if (where) out.where = where;
  return out;
}

/** `extra` on top of `base`; a context key in both takes the values of `extra`, and an `undefined` removes a base value. */
export function mergeFilters(base: RequestFilters, extra: RequestFilters): RequestFilters {
  const merged: RequestFilters = { ...base, ...extra };
  if (base.where && extra.where) merged.where = { ...base.where, ...extra.where };
  for (const key of Object.keys(merged) as (keyof RequestFilters)[]) {
    if (merged[key] === undefined) delete merged[key];
  }
  return merged;
}

/** The filters that differ from showing everything, in the order the bar lists them. */
export function activeKeys(filters: CaptureFilters): FilterKey[] {
  return FILTER_KEYS.filter((key) => {
    switch (key) {
      case "range":
        return filters.range !== null;
      case "thread":
        return filters.thread !== null;
      case "select":
        return filters.select !== "cpu";
      case "slow":
        return filters.slow;
      default:
        return (filters.where[key]?.length ?? 0) > 0;
    }
  });
}

export function isDefault(filters: CaptureFilters): boolean {
  return activeKeys(filters).length === 0;
}

/** The active filters none of `ops` reads. */
export function ignoredKeys(filters: CaptureFilters, ops: readonly QueryOp[]): FilterKey[] {
  const read = new Set(ops.flatMap((op) => OP_FILTERS[op]));
  return activeKeys(filters).filter((key) => !read.has(key));
}

export function ignoredOnTab(filters: CaptureFilters, tab: Tab): FilterKey[] {
  return ignoredKeys(filters, TAB_OPS[tab]);
}

/** One removable item of the active filters: a context key has one chip per value. */
export interface Chip {
  id: string;
  key: FilterKey;
  value?: string;
}

export function chipsOf(filters: CaptureFilters): Chip[] {
  return activeKeys(filters).flatMap((key): Chip[] => {
    if (key === "range" || key === "thread" || key === "select" || key === "slow") return [{ id: key, key }];
    return (filters.where[key] ?? []).map((value) => ({ id: `${key}:${value}`, key, value }));
  });
}

export function withoutChip(filters: CaptureFilters, chip: Chip): CaptureFilters {
  switch (chip.key) {
    case "range":
      return { ...filters, range: null };
    case "thread":
      return { ...filters, thread: null };
    case "select":
      return { ...filters, select: "cpu" };
    case "slow":
      return { ...filters, slow: false };
    default: {
      const rest = (filters.where[chip.key] ?? []).filter((value) => value !== chip.value);
      const where = { ...filters.where };
      if (rest.length > 0) where[chip.key] = rest;
      else delete where[chip.key];
      return { ...filters, where };
    }
  }
}

export function withContext(filters: CaptureFilters, key: ContextKey, value: string): CaptureFilters {
  const have = filters.where[key] ?? [];
  const text = value.trim();
  if (text === "" || have.includes(text)) return filters;
  return { ...filters, where: { ...filters.where, [key]: [...have, text] } };
}

/** A mark of the capture, as the reader lists it. */
export interface MarkPoint {
  name: string;
  t: number;
}

/** Seconds into the capture a bound stands for; null for a mark the capture does not have. */
export function boundSeconds(bound: Bound, marks: readonly MarkPoint[]): number | null {
  if (bound.kind === "seconds") return bound.seconds;
  return marks.find((mark) => mark.name === bound.name)?.t ?? null;
}

const MIN_RANGE_S = 0.001;

/** The range between two drag positions (0 to 1 across the timeline): a bound within `snap` of a mark becomes that mark. */
export function rangeFromDrag(
  a: number,
  b: number,
  seconds: number,
  marks: readonly MarkPoint[],
  snap: number,
): TimeRange | null {
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  const [lo, hi] = [clamp(a), clamp(b)].sort((x, y) => x - y);
  if (seconds <= 0 || (hi - lo) * seconds < MIN_RANGE_S) return null;
  const bound = (x: number): Bound => {
    const near = marks
      .map((mark) => ({ mark, gap: Math.abs(mark.t / seconds - x) }))
      .filter((item) => item.gap <= snap)
      .sort((p, q) => p.gap - q.gap)[0];
    return near ? { kind: "mark", name: near.mark.name } : { kind: "seconds", seconds: x * seconds };
  };
  return { from: bound(lo), to: bound(hi) };
}

/** The range from one mark to another, in time order; null when they are the same moment. */
export function rangeBetweenMarks(a: MarkPoint, b: MarkPoint): TimeRange | null {
  if (a.t === b.t) return null;
  const [from, to] = a.t < b.t ? [a, b] : [b, a];
  return { from: { kind: "mark", name: from.name }, to: { kind: "mark", name: to.name } };
}

/** The range's ends in seconds, for drawing; null when a mark it names is gone. */
export function rangeSeconds(range: TimeRange, marks: readonly MarkPoint[]): [number, number] | null {
  const from = boundSeconds(range.from, marks);
  const to = boundSeconds(range.to, marks);
  return from === null || to === null ? null : [from, to];
}

/** Seconds the range covers, or the whole capture without one. */
export function windowSeconds(range: TimeRange | null, total: number, marks: readonly MarkPoint[]): number {
  const ends = range ? rangeSeconds(range, marks) : null;
  return ends ? Math.max(0, ends[1] - ends[0]) : total;
}

/** A context value as people read it: the reader's `e:minecraft:zombie` is `zombie`. */
export function contextLabel(value: string): string {
  return value.replace(/^[a-z]:/, "").replace(/^minecraft:/, "");
}
