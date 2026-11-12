import assert from "node:assert/strict";
import { test } from "node:test";
import { areaPath, fraction, linePath, timelinePoints } from "./timeline.ts";

test("points sit at their time, with the largest value on the top edge", () => {
  const points = timelinePoints([0, 5, 10], [10, 20, 5], 10, 100, 40);
  assert.deepEqual(points, [
    { x: 0, y: 20 },
    { x: 50, y: 0 },
    { x: 100, y: 30 },
  ]);
});

test("a gap in the series leaves its point out, and an empty series has no shape", () => {
  assert.equal(timelinePoints([0, 1, 2], [4, null, 4], 2, 10, 10).length, 2);
  assert.deepEqual(timelinePoints([0, 1], [null, null], 2, 10, 10), []);
  assert.equal(areaPath([], 10), "");
});

test("the area closes along the baseline", () => {
  assert.equal(areaPath([{ x: 0, y: 5 }, { x: 10, y: 0 }], 10), "M 0.0,10 L 0.0,5.0 L 10.0,0.0 L 10.0,10 Z");
});

test("a pointer outside the timeline clamps to its ends", () => {
  assert.equal(fraction(150, 100, 200), 0.25);
  assert.equal(fraction(50, 100, 200), 0);
  assert.equal(fraction(900, 100, 200), 1);
  assert.equal(fraction(5, 0, 0), 0);
});

test("a line runs through its points in order", () => {
  assert.equal(linePath([{ x: 0, y: 5 }, { x: 10, y: 0 }]), "M 0.0,5.0 L 10.0,0.0");
  assert.equal(linePath([]), "");
});
