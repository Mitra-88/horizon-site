import assert from "node:assert/strict";
import { test } from "node:test";
import { autoEvery, counterField, everyFits, fieldKind, fieldName, togglePin } from "./pins.ts";

test("the automatic step keeps a window near a hundred and fifty points", () => {
  assert.equal(autoEvery(10), 1);
  assert.equal(autoEvery(120), 1);
  assert.equal(autoEvery(3600), 30);
  assert.equal(autoEvery(1e9), 3600);
});

test("a step fits when it stays under the reader's point limit", () => {
  assert.ok(everyFits(1, 2000));
  assert.ok(!everyFits(1, 2001));
  assert.ok(!everyFits(0, 10));
});

test("a field is told apart by its prefix", () => {
  assert.equal(fieldKind("h:tps"), "health");
  assert.equal(fieldKind("x:streaming.cap{kind=light}"), "counter");
  assert.equal(fieldKind("span:tick"), "span");
  assert.equal(fieldName("span:tick"), "tick");
  assert.equal(fieldName("x:a.b"), "a.b");
});

test("a typed counter gets its prefix once, and nothing typed is no counter", () => {
  assert.equal(counterField(" streaming.cap{kind=light} "), "x:streaming.cap{kind=light}");
  assert.equal(counterField("x:a.b"), "x:a.b");
  assert.equal(counterField("  "), null);
});

test("pinning twice unpins and order is the order of pinning", () => {
  const two = togglePin(togglePin([], "h:tps"), "span:tick");
  assert.deepEqual(two, ["h:tps", "span:tick"]);
  assert.deepEqual(togglePin(two, "h:tps"), ["span:tick"]);
});
