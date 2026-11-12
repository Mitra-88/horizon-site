import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NO_FILTERS,
  TAB_OPS,
  activeKeys,
  chipsOf,
  ignoredOnTab,
  mergeFilters,
  rangeBetweenMarks,
  rangeFromDrag,
  windowSeconds,
  withContext,
  withoutChip,
  wireFilters,
} from "./filters.ts";
import type { CaptureFilters } from "./filters.ts";

const busy: CaptureFilters = {
  range: { from: { kind: "seconds", seconds: 10 }, to: { kind: "mark", name: "spike" } },
  thread: "worker",
  select: "waiting",
  slow: true,
  where: { entity: ["e:zombie", "e:husk"], dim: ["d:overworld"] },
};

test("a sample query reads every shared filter", () => {
  assert.deepEqual(wireFilters(busy, "hot"), {
    from: 10,
    to: "mark:spike",
    thread: "worker",
    select: "waiting",
    slow: true,
    where: { entity: ["e:zombie", "e:husk"], dim: ["d:overworld"] },
  });
});

test("nothing active adds nothing to the request, so the reply is the CLI's default", () => {
  assert.deepEqual(wireFilters(NO_FILTERS, "tree"), {});
});

test("an op sends only the filters the reader reads for it", () => {
  assert.deepEqual(wireFilters(busy, "ticks"), { from: 10, to: "mark:spike" });
  assert.deepEqual(wireFilters(busy, "spans"), { from: 10, to: "mark:spike", thread: "worker", slow: true });
  assert.deepEqual(wireFilters(busy, "meta"), {});
});

test("world takes only the dimension, by the name the world section uses", () => {
  assert.deepEqual(wireFilters(busy, "world"), { where: { dim: ["minecraft:overworld"] } });
});

test("a tab says which active filters its numbers ignore", () => {
  assert.deepEqual(ignoredOnTab(busy, "memory"), activeKeys(busy));
  assert.deepEqual(ignoredOnTab(busy, "net"), ["thread", "select", "slow", "entity", "dim"]);
  assert.deepEqual(ignoredOnTab(busy, "tree"), []);
  assert.deepEqual(ignoredOnTab(NO_FILTERS, "memory"), []);
});

test("every tab has a list of ops, and the compare tab reads none", () => {
  assert.deepEqual(TAB_OPS.compare, []);
  assert.deepEqual(ignoredOnTab({ ...NO_FILTERS, slow: true }, "compare"), ["slow"]);
});

test("chips list one per context value and removing one leaves the rest", () => {
  const chips = chipsOf(busy);
  assert.deepEqual(
    chips.map((chip) => chip.id),
    ["range", "thread", "select", "slow", "entity:e:zombie", "entity:e:husk", "dim:d:overworld"],
  );
  const husk = chips.find((chip) => chip.id === "entity:e:husk");
  assert.ok(husk);
  assert.deepEqual(withoutChip(busy, husk).where.entity, ["e:zombie"]);
  const zombie = chips.find((chip) => chip.id === "entity:e:zombie");
  assert.ok(zombie);
  assert.equal(withoutChip(withoutChip(busy, zombie), husk).where.entity, undefined);
  assert.equal(withoutChip(busy, chips[0]).range, null);
  assert.equal(withoutChip(busy, chips[2]).select, "cpu");
});

test("adding a context value keeps repeats out", () => {
  const once = withContext(NO_FILTERS, "span", "s:tick");
  assert.deepEqual(withContext(once, "span", "s:tick"), once);
  assert.deepEqual(withContext(once, "span", " "), once);
  assert.deepEqual(withContext(once, "span", "s:save").where.span, ["s:tick", "s:save"]);
});

test("merging puts an op's own filters over the shared ones, per context key", () => {
  const merged = mergeFilters(
    { thread: "tick", where: { entity: ["e:zombie"], dim: ["d:overworld"] }, limit: 25 },
    { thread: undefined, where: { entity: ["e:husk"] }, by: "span" },
  );
  assert.deepEqual(merged, { where: { entity: ["e:husk"], dim: ["d:overworld"] }, limit: 25, by: "span" });
});

const marks = [
  { name: "start", t: 20 },
  { name: "spike", t: 60 },
];

test("a drag becomes seconds, and an end near a mark snaps to it", () => {
  assert.deepEqual(rangeFromDrag(0.1, 0.4, 100, [], 0.02), {
    from: { kind: "seconds", seconds: 10 },
    to: { kind: "seconds", seconds: 40 },
  });
  assert.deepEqual(rangeFromDrag(0.19, 0.61, 100, marks, 0.02), {
    from: { kind: "mark", name: "start" },
    to: { kind: "mark", name: "spike" },
  });
});

test("a drag backwards is the same range, and one with no width is none", () => {
  assert.deepEqual(rangeFromDrag(0.5, 0.2, 100, [], 0), rangeFromDrag(0.2, 0.5, 100, [], 0));
  assert.equal(rangeFromDrag(0.3, 0.3, 100, [], 0), null);
  assert.equal(rangeFromDrag(0.3, 0.9, 0, [], 0), null);
});

test("two marks make a range in time order", () => {
  assert.deepEqual(rangeBetweenMarks(marks[1], marks[0]), { from: { kind: "mark", name: "start" }, to: { kind: "mark", name: "spike" } });
  assert.equal(rangeBetweenMarks(marks[0], marks[0]), null);
});

test("the window is the range's length, or the whole capture", () => {
  assert.equal(windowSeconds(busy.range, 100, marks), 50);
  assert.equal(windowSeconds(null, 100, marks), 100);
  assert.equal(windowSeconds({ from: { kind: "mark", name: "gone" }, to: { kind: "seconds", seconds: 5 } }, 100, marks), 100);
});

test("a context value reads without its id prefix or the vanilla namespace", async () => {
  const { contextLabel } = await import("./filters.ts");
  assert.equal(contextLabel("e:minecraft:zombie"), "zombie");
  assert.equal(contextLabel("d:overworld"), "overworld");
  assert.equal(contextLabel("e:mod:thing"), "mod:thing");
  assert.equal(contextLabel("3,4"), "3,4");
});
