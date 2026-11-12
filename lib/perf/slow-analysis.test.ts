import assert from "node:assert/strict";
import { test } from "node:test";
import { culprits, stepLines, tickFlame, usualTimes } from "./slow-analysis.ts";
import type { SpanRow, TickRow } from "./types.ts";

function span(id: string, name: string, parent: string | null, value: number): SpanRow {
  return { id, name, parent, values: [value], cpu: [value], waited: [0], seen: [10] };
}

function tick(id: string, wall: number, spans: TickRow["spans"]): TickRow {
  return { id, t: 1, wall_ms: wall, spans } as TickRow;
}

const usual = usualTimes([span("s:a", "a", null, 5), span("s:b", "b", "s:a", 3), span("s:c", "c", "s:a", 1)]);

test("a step is compared with its usual time under the same parent", () => {
  const lines = stepLines(tick("k:1", 20, [["a", 0, 20, 19], ["b", 1, 12, 12], ["z", 1, 2, 2]]), usual);
  assert.deepEqual(
    lines.map((line) => [line.name, line.parent, line.usual, line.extra]),
    [["a", "", 5, 15], ["b", "a", 3, 9], ["z", "a", null, null]],
  );
});

test("a flame row nests by depth and shares are of the whole tick", () => {
  const [root] = tickFlame(tick("k:1", 20, [["a", 0, 20, 19], ["b", 1, 5, 5], ["c", 1, 10, 10]]));
  assert.equal(root.total, 20);
  assert.equal(root.pct, 100);
  assert.deepEqual(root.children?.map((row) => [row.name, row.pct]), [["b", 25], ["c", 50]]);
});

test("a step is blamed for its own extra time, not its children's", () => {
  const ticks = [
    tick("k:1", 20, [["a", 0, 20, 19], ["b", 1, 16, 16], ["c", 1, 1, 1]]),
    tick("k:2", 14, [["a", 0, 14, 14], ["b", 1, 10, 10], ["c", 1, 1, 1]]),
  ];
  // b runs 13 and 7 long, so 10 per tick; a's own time is 3 over its usual 1, both ticks: 2 each after b.
  const found = culprits(ticks, usual, 5);
  assert.deepEqual(found.map((c) => [c.name, c.extra, c.largestIn]), [["b", 10, 2], ["a", 2, 0]]);
});
