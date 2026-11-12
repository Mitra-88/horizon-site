import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parentPort, workerData } from "node:worker_threads";
import { gunzipSync } from "node:zlib";
import { HorizonPerf, HorizonPerfError } from "../lib/perf/generated/horizon_perf.js";

try {
  gunzipSync(workerData.bytes, { maxOutputLength: 256 * 1024 * 1024 });
  const { instance } = await WebAssembly.instantiate(await readFile(join(process.cwd(), "public/perf/horizon_perf.wasm")), {});
  const reader = new HorizonPerf(instance.exports);
  const handle = reader.open(workerData.bytes);
  try {
    const reply = reader.query(handle, { op: "meta", file: "capture" });
    if (!reply.ok || !reply.rows.length) throw new Error("invalid_capture");
    const first = reply.rows.find((row) => row.side === "server") ?? reply.rows[0];
    parentPort.postMessage({ summary: { kind: first.kind, seconds: Math.max(...reply.rows.map((row) => row.seconds)), version: first.build?.version ?? "unknown" } });
  } finally {
    reader.close(handle);
  }
} catch (error) {
  parentPort.postMessage({ error: error instanceof HorizonPerfError && error.code === "unsupported_format" ? "unsupported_format" : "invalid_capture" });
}
