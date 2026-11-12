import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gzipSync, gunzipSync } from "node:zlib";
import type { CaptureObjects } from "./objects.ts";
import type { CaptureConfig } from "./config.ts";
import { CaptureError } from "./errors.ts";
import { CaptureStore } from "./store.ts";
import { validateCapture } from "./validation.ts";

class Objects implements CaptureObjects {
  readonly values = new Map<string, Uint8Array>();
  async put(id: string, bytes: Uint8Array) { this.values.set(id, bytes.slice()); }
  async get(id: string) { const bytes = this.values.get(id); if (!bytes) throw new Error("missing"); return bytes; }
  async delete(id: string) { this.values.delete(id); }
}

const config: CaptureConfig = { database: ":memory:", publicUrl: "https://perf.example", maxBytes: 1024 * 1024, storageBytes: 1024 * 1024 * 1024, sharedDays: 30, hourlyUploads: 20, trustProxy: false };
const summary = { kind: "client", seconds: 300, version: "test" } as const;
const status = (code: number) => (error: unknown) => error instanceof CaptureError && error.status === code;

test("the shipped wasm validates a finished capture and rejects malformed and newer captures", async () => {
  const bytes = await readFile(new URL("../../../tests/fixtures/slow-frames.hzperf", import.meta.url));
  const found = await validateCapture(bytes);
  assert.equal(found.kind, "client");
  assert.equal(found.seconds, 10);
  await assert.rejects(validateCapture(new Uint8Array([1, 2, 3])), status(415));
  const newer = gunzipSync(bytes);
  assert.deepEqual([...newer.subarray(0, 2)], [8, 1]);
  newer[1] = 2;
  await assert.rejects(validateCapture(gzipSync(newer)), status(422));
});

test("uploads retain their exact bytes and deletion needs the owner token", async () => {
  const objects = new Objects();
  const store = new CaptureStore(config, objects, () => 0);
  try {
    const upload = await store.upload(new Uint8Array([1, 7, 3]), summary);
    assert.match(upload.id, /^[a-z2-7]{10}$/);
    assert.equal(upload.shared, false);
    assert.equal(upload.expires_utc, "1970-01-01T01:00:00.000Z");
    assert.deepEqual(await store.read(upload.id), new Uint8Array([1, 7, 3]));
    assert.deepEqual(store.meta(upload.id).summary, summary);
    await assert.rejects(store.delete(upload.id, "wrong"), status(403));
    assert.throws(() => store.share(upload.id, "wrong"), status(403));
    await store.delete(upload.id, upload.delete_token);
    await assert.rejects(store.read(upload.id), status(404));
    assert.equal(objects.values.size, 0);
  } finally { store.close(); }
});

test("shared captures survive the temporary sweep and expire after thirty days without extending on repeated shares", async () => {
  let time = 0;
  const objects = new Objects();
  const store = new CaptureStore(config, objects, () => time);
  try {
    const temporary = await store.upload(new Uint8Array([1]), summary);
    const shared = await store.upload(new Uint8Array([2]), summary);
    const pinned = store.share(shared.id, shared.delete_token);
    time = 3_600_001;
    assert.throws(() => store.meta(temporary.id), status(404));
    assert.equal(await store.sweep(), 1);
    assert.deepEqual(await store.read(shared.id), new Uint8Array([2]));
    assert.equal(store.share(shared.id, shared.delete_token).expires_utc, pinned.expires_utc);
    time = 30 * 86_400_000 + 1;
    assert.equal(await store.sweep(), 1);
    assert.equal(objects.values.size, 0);
  } finally { store.close(); }
});

test("capacity reservations reject the upload that crosses ninety percent and rate limits reset after one hour", async () => {
  let time = 0;
  const store = new CaptureStore({ ...config, maxBytes: 10, storageBytes: 10 }, new Objects(), () => time);
  try {
    await store.upload(new Uint8Array(8), summary);
    await assert.rejects(store.upload(new Uint8Array(1), summary), status(507));
    await assert.rejects(store.upload(new Uint8Array(11), summary), status(413));
    for (let n = 0; n < 20; n++) store.attempt("one-ip");
    assert.throws(() => store.attempt("one-ip"), status(429));
    store.attempt("other-ip");
    time = 3_600_000;
    store.attempt("one-ip");
  } finally { store.close(); }
});

test("metadata, owner tokens and rate limits survive a process restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "horizon-perf-test-"));
  const settings = { ...config, database: join(directory, "captures.sqlite"), hourlyUploads: 1 };
  const objects = new Objects();
  let store = new CaptureStore(settings, objects, () => 0);
  try {
    const uploaded = await store.upload(new Uint8Array([3]), summary);
    store.attempt("ip");
    store.close();
    store = new CaptureStore(settings, objects, () => 0);
    assert.throws(() => store.attempt("ip"), status(429));
    assert.equal(store.share(uploaded.id, uploaded.delete_token).shared, true);
    assert.deepEqual(await store.read(uploaded.id), new Uint8Array([3]));
  } finally { store.close(); await rm(directory, { recursive: true, force: true }); }
});
