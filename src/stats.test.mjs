import { test } from "node:test";
import assert from "node:assert/strict";
import { chartSvg, fmt, titleOf, midnight, nearest, niceMax, peakSince, platformSplit, scales, segments, tableHtml, ticks } from "./stats.js";

const DAY = 86400;
// 2026-10-31 00:00 UTC.
const T0 = 1793404800;
const day = (series, extra = {}) => ({ range: "24h", step: 300, from: T0, to: T0 + DAY, series, peak: null, all_time: null, platforms: {}, ...extra });

test("counts are exact, with thousands separators", () => {
  assert.equal(fmt(1243), "1,243");
  assert.equal(fmt(12.34), "12.3");
  assert.equal(fmt(null), "–");
});

test("the axis tops at a round number", () => {
  assert.equal(niceMax(0), 5);
  assert.equal(niceMax(7), 10);
  assert.equal(niceMax(1243), 2000);
  assert.equal(niceMax(230), 250);
});

test("missing points split the line", () => {
  const s = [[0, 1, 1], [300, 1, 1], [600, 1, 1], [3000, 1, 1]];
  assert.deepEqual(segments(s, 300).map((x) => x.length), [3, 1]);
});

test("the chart draws the highest and the average, and nothing outside the frame", () => {
  const h = day([[T0, 3.5, 5], [T0 + 300, 7, 9], [T0 + 600, 6, 6]]);
  const svg = chartSvg(h, "UTC");
  assert.match(svg, /class="stats-area" d="M/);
  assert.match(svg, /class="stats-peak" d="M[\d.]+,[\d.]+L/);
  assert.match(svg, /class="stats-avg"/);
  assert.match(svg, />00:00</);
  assert.match(svg, />03:00</);
  const { x, y } = scales(h);
  for (const [t, , p] of h.series) {
    assert.ok(x(t) >= 52 && x(t) <= 788);
    assert.ok(y(p) >= 14 && y(p) <= 250);
  }
  assert.equal(nearest(h, x(T0 + 300) + 1), 1);
});

test("the table lists every point, newest first", () => {
  const html = tableHtml(day([[T0, 3.5, 5], [T0 + 300, 7, 1234]]), "UTC");
  assert.ok(html.indexOf("1,234") < html.indexOf(">5<"));
  assert.match(tableHtml(day([]), "UTC"), /No samples/);
});

test("ticks fall on whole local hours and days", () => {
  const t = ticks(day([]), "Europe/Zurich");
  // Zurich is UTC+1 on that day: 00:00 UTC is 01:00 there, so the first 3-hour tick is 03:00 local, 02:00 UTC.
  assert.equal(t[0], T0 + 2 * 3600);
  const week = ticks({ ...day([]), range: "7d", step: 3600, from: T0 - 7 * DAY }, "UTC");
  assert.ok(week.every((x) => x % DAY === 0));
});

test("today's peak is counted from the reader's midnight, to the minute when it is the 24 hours' peak", () => {
  const h = day([[T0 - 600, 0, 50], [T0 + 600, 0, 20], [T0 + 900, 0, 30]], { peak: { playing: 50, at: T0 - 540 } });
  assert.equal(midnight(T0 + 3600, "UTC"), T0);
  assert.deepEqual(peakSince(h, T0), { playing: 30, at: T0 + 900 });
  assert.deepEqual(peakSince({ ...h, peak: { playing: 30, at: T0 + 960 } }, T0), { playing: 30, at: T0 + 960 });
  assert.equal(peakSince(day([]), T0), null);
});

test("the platform split is largest first, with shares", () => {
  assert.deepEqual(platformSplit({ linux: 1, windows: 3, macos: 0 }), [
    { name: "Windows", count: 3, share: 0.75 },
    { name: "Linux", count: 1, share: 0.25 },
  ]);
});

test("the title names the series and the range", () => {
  assert.equal(titleOf(day([])), "Players over the last 24 hours");
  assert.equal(titleOf({ ...day([]), source: "official", range: "all" }), "On the official server since the count began");
});
