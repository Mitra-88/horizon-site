import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { HorizonPerf } from "./generated/horizon_perf.js";
import type { MetaRow } from "./types.ts";

const wasm = await readFile(new URL("../../public/perf/horizon_perf.wasm", import.meta.url));
const reader = await HorizonPerf.load(`data:application/wasm;base64,${wasm.toString("base64")}`);

test("the bundled WASM exposes both lows and tick capacity through the browser wrapper", async () => {
  const bytes = await readFile(new URL("../../tests/fixtures/timing-lows.hzperf", import.meta.url));
  const handle = reader.open(bytes);
  try {
    const reply = reader.query<MetaRow>(handle, { op: "meta" });
    assert.equal(reply.ok, true);
    const client = reply.rows.find((row) => row.side === "client")?.timing;
    const server = reply.rows.find((row) => row.side === "server")?.timing;
    assert.deepEqual(client, { count: 1000, slowest_1pct_ms: 25, slowest_01pct_ms: 100, low_1pct: 40, low_01pct: 10 });
    assert.deepEqual(server, { count: 1000, slowest_1pct_ms: 25, slowest_01pct_ms: 100, low_1pct: 20, low_01pct: 10 });
  } finally {
    reader.close(handle);
  }
});

test("older captures remain readable without fabricated timing lows", async () => {
  const bytes = await readFile(new URL("../../tests/fixtures/slow-frames.hzperf", import.meta.url));
  const handle = reader.open(bytes);
  try {
    const reply = reader.query<MetaRow>(handle, { op: "meta" });
    assert.equal(reply.ok, true);
    assert.ok(reply.rows.length > 0);
    assert.ok(reply.rows.every((row) => row.timing === undefined));
  } finally {
    reader.close(handle);
  }
});
