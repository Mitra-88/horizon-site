// The GPU tab's rows (crates/horizon-perf/src/query/rows.rs) and the drawing of them: grouping, ordering and chart geometry.

export interface MsStats {
  samples: number;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  max: number | null;
}

export type GpuBound = "gpu" | "cpu" | "mixed";
export type GpuPassSplit = "draw_groups" | "passes_only" | "unspecified";

export interface GpuDevice {
  id: "g:device";
  adapter: string;
  backend: string;
  driver: string;
  parts_mode: string;
  counters: boolean;
  fragment_unit: string;
  pass_split: GpuPassSplit;
}

export interface GpuSummary {
  id: "g:frame";
  gpu_frame: MsStats;
  cpu_frame: MsStats;
  bound: GpuBound | null;
  bound_rule: string;
}

export interface GpuCounts {
  vertex_shader_invocations: number;
  clipper_invocations: number;
  clipper_primitives_out: number;
  fragment_shader_invocations: number;
}

export interface GpuCounters {
  total: GpuCounts;
  pixels: number;
  fragments_per_pixel: number | null;
  parts: { name: string; counts: GpuCounts }[];
}

export interface GpuPart extends MsStats {
  name: string;
  ms: number;
  share: number | null;
}

export interface GpuPass extends MsStats {
  id: string;
  name: string;
  source: string;
  ms: number | null;
  share: number | null;
  parts: GpuPart[];
  counters: GpuCounters | null;
}

export interface GpuFrame {
  id: string;
  t: number;
  source: string;
  total_ms: number | null;
  slow: boolean;
  slow_wall_ms: number | null;
  passes: { name: string; ms: number | null; parts: { name: string; ms: number }[] }[];
}

export type GpuRow = GpuDevice | GpuSummary | GpuPass;

export interface GpuReport {
  device: GpuDevice | null;
  summary: GpuSummary | null;
  /** Slowest first. */
  passes: GpuPass[];
}

/** A pass's typical time: its p50, else the median older captures kept. */
export function typical(pass: { p50: number | null; ms: number | null }): number | null {
  return pass.p50 ?? pass.ms;
}

const byTypical = <T extends { p50: number | null; ms: number | null }>(a: T, b: T) =>
  (typical(b) ?? -1) - (typical(a) ?? -1);

/** Splits `query gpu` into its device, its frame summary and its passes, passes and parts slowest first. */
export function gpuReport(rows: readonly GpuRow[]): GpuReport {
  let device: GpuDevice | null = null;
  let summary: GpuSummary | null = null;
  const passes: GpuPass[] = [];
  for (const row of rows) {
    if (row.id === "g:device") device = row as GpuDevice;
    else if (row.id === "g:frame") summary = row as GpuSummary;
    else passes.push({ ...(row as GpuPass), parts: [...((row as GpuPass).parts ?? [])].sort(byTypical) });
  }
  passes.sort(byTypical);
  return { device, summary, passes };
}

/** How much of the CPU's typical frame the GPU is busy, as a fraction; null without both medians. */
export function gpuBusy(summary: GpuSummary | null): number | null {
  const gpu = summary?.gpu_frame.p50;
  const cpu = summary?.cpu_frame.p50;
  if (gpu == null || cpu == null || cpu <= 0) return null;
  return gpu / cpu;
}

/** A frame's time in one pass: the pass's own, else the sum of its parts for a pass timed only through them. */
export function passMs(pass: GpuFrame["passes"][number]): number {
  return pass.ms ?? pass.parts.reduce((sum, part) => sum + part.ms, 0);
}

export interface FrameStack {
  t: number;
  total: number;
  slow: boolean;
  /** One value per layer, `layers` order; the last layer is everything else. */
  values: number[];
}

/** The chart's layers: the `top` slowest passes by name, then "other" (null) for the rest of each frame's total. */
export function stackFrames(frames: readonly GpuFrame[], order: readonly string[], top: number) {
  const named = order.slice(0, top);
  const stacks: FrameStack[] = frames.map((frame) => {
    const values = named.map((name) => {
      const pass = frame.passes.find((p) => p.name === name);
      return pass ? passMs(pass) : 0;
    });
    const counted = values.reduce((sum, v) => sum + v, 0);
    const total = frame.total_ms ?? frame.passes.reduce((sum, p) => sum + passMs(p), 0);
    values.push(Math.max(0, total - counted));
    return { t: frame.t, total: Math.max(total, counted), slow: frame.slow, values };
  });
  return { layers: [...named, null] as (string | null)[], stacks };
}

/** A round top for a ms axis at or above `value`: one of a few steps times a power of ten, so the plot fills most of its height. */
export function niceCeil(value: number): number {
  if (!(value > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * power >= value - power * 1e-9) ?? 10;
  return Number((step * power).toPrecision(12));
}

/** SVG area paths of stacked layers over [0, width] x [0, height], time across and ms up, bottom layer first. */
export function stackPaths(stacks: readonly FrameStack[], width: number, height: number, top: number): string[] {
  if (stacks.length === 0) return [];
  const first = stacks[0].t;
  const span = stacks[stacks.length - 1].t - first || 1;
  const x = (t: number) => round(((t - first) / span) * width);
  const y = (ms: number) => round(height - (Math.min(ms, top) / top) * height);
  const layers = stacks[0].values.length;
  const below = stacks.map(() => 0);
  const paths: string[] = [];
  for (let layer = 0; layer < layers; layer++) {
    const lower = below.slice();
    stacks.forEach((s, i) => (below[i] += s.values[layer]));
    const upper = stacks.map((s, i) => `${x(s.t)},${y(below[i])}`);
    const back = stacks.map((s, i) => `${x(s.t)},${y(lower[i])}`).reverse();
    paths.push(`M${upper.join("L")}L${back.join("L")}Z`);
  }
  return paths;
}

/** The index of the frame nearest `t`, frames in time order; -1 without frames. */
export function nearestFrame(stacks: readonly { t: number }[], t: number): number {
  if (stacks.length === 0) return -1;
  let lo = 0;
  let hi = stacks.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (stacks[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  return lo > 0 && t - stacks[lo - 1].t <= stacks[lo].t - t ? lo - 1 : lo;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
