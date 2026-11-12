import assert from "node:assert/strict";
import { checkPerfStyles } from "./perf-style-test.mjs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { gzipSync, gunzipSync } from "node:zlib";

const port = "3491";
const external = process.argv[2];
const base = external ?? `http://127.0.0.1:${port}`;
let server;
if (!external) {
  server = spawn(process.execPath, [".next/standalone/server.js"], {
    env: { ...process.env, PORT: port, HOSTNAME: "127.0.0.1", PERF_PUBLIC_URL: base },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("The production server did not start")), 30_000);
    server.once("exit", () => { clearTimeout(timeout); reject(new Error("The production server exited")); });
    server.stdout.on("data", (chunk) => { if (chunk.toString().includes("Ready")) { clearTimeout(timeout); resolve(); } });
    server.stderr.on("data", (chunk) => process.stderr.write(chunk));
  });
}

const bytes = await readFile(new URL("../tests/fixtures/slow-frames.hzperf", import.meta.url));
const owners = [];
const endpoint = "/api/perf/captures";
const request = (path, options = {}) => fetch(base + path, options);
const upload = (body) => request(endpoint, { method: "POST", headers: { "Content-Type": "application/vnd.horizon.perf" }, body });

try {
  await checkPerfStyles(base);
  const created = await upload(bytes);
  assert.equal(created.status, 201);
  assert.equal(created.headers.get("cache-control"), "no-store");
  const capture = await created.json();
  owners.push(capture);
  assert.match(capture.id, /^[a-z2-7]{10}$/);
  assert.equal(capture.shared, false);
  assert.equal(capture.summary.kind, "client");
  assert.equal(capture.summary.seconds, 10);
  assert.equal(Date.parse(capture.expires_utc) - Date.parse(capture.created_utc), 3_600_000);
  const path = `${endpoint}/${capture.id}`;
  const raw = await request(path);
  assert.equal(raw.headers.get("content-type"), "application/vnd.horizon.perf");
  assert.equal(raw.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.deepEqual(Buffer.from(await raw.arrayBuffer()), bytes);
  const meta = await request(`${path}/meta`);
  assert.equal(meta.headers.get("cache-control"), "no-store");
  assert.deepEqual((await meta.json()).summary, capture.summary);
  assert.equal((await request(path, { method: "DELETE", headers: { Authorization: "Bearer wrong" } })).status, 403);
  assert.equal((await request(`${path}/share`, { method: "POST", headers: { Authorization: "Bearer wrong" } })).status, 403);
  const shared = await request(`${path}/share`, { method: "POST", headers: { Authorization: `Bearer ${capture.delete_token}` } });
  assert.equal(shared.status, 200);
  assert.equal((await shared.json()).shared, true);
  assert.equal((await request(`/perf/c/${capture.id}`)).status, 200);
  assert.equal((await upload(new Uint8Array([1, 2, 3]))).status, 415);
  const newer = gunzipSync(bytes);
  assert.deepEqual([...newer.subarray(0, 2)], [8, 1]);
  newer[1] = 2;
  assert.equal((await upload(gzipSync(newer))).status, 422);
  console.log("PASS: production API validates with the bundled worker, stores exact bytes, shares, authorizes, and rejects invalid captures.");
} finally {
  for (const capture of owners) {
    const path = `${endpoint}/${capture.id}`;
    const response = await request(path, { method: "DELETE", headers: { Authorization: `Bearer ${capture.delete_token}` } });
    assert.equal(response.status, 204);
    assert.equal((await request(path)).status, 404);
  }
  if (server) {
    server.kill("SIGTERM");
    await once(server, "exit");
  }
}
