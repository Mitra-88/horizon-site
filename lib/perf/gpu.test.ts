import assert from "node:assert/strict";
import { test } from "node:test";
import { gpuBusy, gpuReport, nearestFrame, niceCeil, stackFrames, stackPaths } from "./gpu.ts";
import type { GpuFrame, GpuRow, GpuSummary } from "./gpu.ts";

const stats = (p50: number | null) => ({ samples: p50 === null ? 0 : 10, p50, p95: p50, p99: p50, max: p50 });
const pass = (name: string, p50: number | null, ms: number | null, parts: [string, number][] = []) => ({
  id: `g:${name}`,
  name,
  source: "horizon",
  ms,
  share: null,
  ...stats(p50),
  parts: parts.map(([part, p]) => ({ name: part, ms: p, share: null, ...stats(p) })),
  counters: null,
});
const summary = (gpu: number | null, cpu: number | null): GpuSummary => ({
  id: "g:frame",
  gpu_frame: stats(gpu),
  cpu_frame: stats(cpu),
  bound: null,
  bound_rule: "",
});

test("the report sorts passes and their parts slowest first, by p50 or an old capture's median", () => {
  const rows: GpuRow[] = [
    summary(0.1, 0.5),
    pass("HUD", 0.003, 0.003),
    pass("World", 0.053, 0.053, [["sky", 0.006], ["solid terrain", 0.042], ["occlusion boxes", 0.003]]),
    pass("Old", null, 0.02),
  ];
  const report = gpuReport(rows);
  assert.equal(report.device, null);
  assert.equal(report.summary?.gpu_frame.p50, 0.1);
  assert.deepEqual(report.passes.map((p) => p.name), ["World", "Old", "HUD"]);
  assert.deepEqual(report.passes[0].parts.map((p) => p.name), ["solid terrain", "sky", "occlusion boxes"]);
});

test("the GPU is busy for its frame p50 over the CPU's", () => {
  assert.equal(gpuBusy(summary(0.095, 0.475)), 0.2);
  assert.equal(gpuBusy(summary(null, 0.5)), null);
  assert.equal(gpuBusy(summary(0.1, 0)), null);
});

const frame = (t: number, total: number | null, passes: GpuFrame["passes"], slow = false): GpuFrame => ({
  id: `g:frame ${t}`,
  t,
  source: "horizon",
  total_ms: total,
  slow,
  slow_wall_ms: null,
  passes,
});

test("frames stack their top passes and put the rest of the total in other", () => {
  const frames = [
    frame(0, 1.0, [
      { name: "World", ms: 0.6, parts: [] },
      { name: "Culling", ms: null, parts: [{ name: "cull", ms: 0.1 }, { name: "scan", ms: 0.15 }] },
      { name: "HUD", ms: 0.05, parts: [] },
    ]),
    frame(1, null, [{ name: "World", ms: 0.5, parts: [] }], true),
  ];
  const { layers, stacks } = stackFrames(frames, ["World", "Culling", "HUD"], 2);
  assert.deepEqual(layers, ["World", "Culling", null]);
  assert.deepEqual(stacks[0].values.slice(0, 2), [0.6, 0.25]);
  assert.ok(Math.abs(stacks[0].values[2] - 0.15) < 1e-12);
  assert.equal(stacks[0].total, 1.0);
  assert.deepEqual(stacks[1], { t: 1, total: 0.5, slow: true, values: [0.5, 0, 0] });
});

test("axis tops round up to the next step of a power of ten", () => {
  assert.equal(niceCeil(0.183), 0.2);
  assert.equal(niceCeil(0.2), 0.2);
  assert.equal(niceCeil(0.108), 0.15);
  assert.equal(niceCeil(3.1), 4);
  assert.equal(niceCeil(7), 8);
  assert.equal(niceCeil(9), 10);
  assert.equal(niceCeil(0), 1);
});

test("stacked paths run along the top and back along the layer below", () => {
  const stacks = [
    { t: 10, total: 2, slow: false, values: [1, 1] },
    { t: 12, total: 4, slow: false, values: [2, 2] },
  ];
  assert.deepEqual(stackPaths(stacks, 100, 40, 4), ["M0,30L100,20L100,40L0,40Z", "M0,20L100,0L100,20L0,30Z"]);
});

test("the nearest frame to a time, ties to the earlier one", () => {
  const stacks = [{ t: 0 }, { t: 1 }, { t: 3 }];
  assert.equal(nearestFrame(stacks, -5), 0);
  assert.equal(nearestFrame(stacks, 1.4), 1);
  assert.equal(nearestFrame(stacks, 2), 1);
  assert.equal(nearestFrame(stacks, 2.1), 2);
  assert.equal(nearestFrame(stacks, 9), 2);
  assert.equal(nearestFrame([], 1), -1);
});
