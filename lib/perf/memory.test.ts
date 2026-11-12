import assert from "node:assert/strict";
import { test } from "node:test";
import { changeTone, defaultPair, snapshotLabels } from "./memory.ts";
import type { Envelope } from "./types.ts";

const failed = (error: Envelope<unknown>["error"]): Envelope<unknown> => ({ ok: false, op: "memory", rows: [], warnings: [], error });

test("the labels come out of the reader's unknown-label error, in order", () => {
  assert.deepEqual(snapshotLabels(failed("no memory snapshot labelled x; labels: start, 10s, stop")), ["start", "10s", "stop"]);
  assert.deepEqual(snapshotLabels(failed({ code: "bad_request", message: "no memory snapshot labelled x; labels: start" })), ["start"]);
});

test("an error that lists no labels gives none", () => {
  assert.deepEqual(snapshotLabels(failed("this capture has no memory snapshots for the selected side")), []);
  assert.deepEqual(snapshotLabels(failed(undefined)), []);
});

test("a diff needs two snapshots, and defaults to the first and last", () => {
  assert.equal(defaultPair(["start"]), null);
  assert.deepEqual(defaultPair(["start", "10s", "stop"]), ["start", "stop"]);
});

test("a change is told by its sign", () => {
  assert.equal(changeTone(["a", 1, 3, 2]), "grew");
  assert.equal(changeTone(["a", 3, 1, -2]), "shrank");
  assert.equal(changeTone(["a", 1, 1, 0]), "same");
});
