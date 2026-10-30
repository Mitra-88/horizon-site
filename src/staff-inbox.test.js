import { test } from "node:test";
import assert from "node:assert/strict";
import { inboxHtml, inboxCount } from "./staff-inbox.js";
import { standing } from "./staff-apps.js";

const H = 3_600_000;
const NOW = Date.UTC(2026, 9, 30, 12);
const vote = (v = {}) => ({ canVote: true, mine: null, cast: 1, quorum: 2, needed: 1, closesAt: NOW + 31 * H, firstBallotAt: NOW - H, extended: false, ...v });
const app = (a = {}) => ({ id: "a1", name: "harbor", role: "team", status: "open", owner: false, vote: vote(a.vote), ...a, vote: vote(a.vote) });
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

test("a vote waiting for you: one line with the time left, the votes still needed", () => {
  const html = inboxHtml({ apps: [app()], me: "m1", now: NOW });
  assert.match(text(html), /Vote on harbor ?'s 🌌 Horizon Team application · closes in 31 h 1 of 2 votes needed/);
  assert.equal(inboxCount(html), 1);
  assert.equal(inboxCount(inboxHtml({ apps: [app({ vote: { mine: { choice: "for" } } })], me: "m1", now: NOW })), 0); // voted, closes in 31 h
});

test("Ludovic's veto window: Approve now and Veto right in the Inbox", () => {
  const html = inboxHtml({ apps: [app({ status: "veto-window", owner: true, tally: { for: 3, against: 0 }, veto: { until: NOW + 9 * H }, vote: { canVote: false } })], me: "o", now: NOW });
  assert.match(text(html), /harbor ?'s 🌌 Horizon Team application passed, 3 to 0 · goes through in 9 h/);
  assert.match(html, /data-owner="approve" data-id="a1">Approve now</);
  assert.match(html, /data-owner="veto" data-id="a1">Veto</);
});

test("decisions of the last week that name you, not your own nor withdrawn ones", () => {
  const d = (title, extra = {}) => ({ id: title, title, body: "", by: "m2", at: NOW - H, status: "active", ...extra });
  const decisions = [d("Aurora owns the shader API"), d("@aurora reviews mods"), d("Auroras are pretty"), d("Aurora again", { by: "m1" }), d("Aurora old", { at: NOW - 8 * 24 * H }), d("Aurora gone", { status: "withdrawn" })];
  const html = inboxHtml({ apps: [], cards: { todo: [], doing: [] }, decisions, me: "m1", names: ["aurora"], now: NOW });
  assert.deepEqual([...html.matchAll(/class="inbox-what">([^<]*)</g)].map((m) => m[1]), ["Aurora owns the shader API", "@aurora reviews mods"]);
});

test("nothing to do: the empty state", () => {
  assert.match(inboxHtml({ apps: [], me: "m1", now: NOW }), /Nothing needs you right now\./);
});

test("the vote line in plain words", () => {
  assert.equal(standing(app(), NOW), "1 of 2 votes needed · closes in 31 h");
  assert.equal(standing(app({ vote: { cast: 3, needed: 0, closesAt: NOW + 50 * H, extended: true } }), NOW), "3 votes, enough · closes in 2 days (extended once)");
});
