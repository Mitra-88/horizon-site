// Both dashboards built from Kira's payloads with every optional field null (as Kira sends them: a card of its own
// board without a link, an item without an owner, a decision without details...). Nothing may throw, and a part that
// fails anyway shows its error without blanking the others.
import { test } from "node:test";
import assert from "node:assert/strict";
import { teamPanels } from "./staff-team.js";
import { statsHtml } from "./staff-mod.js";
import { cardHtml } from "./staff-apps.js";
import { inboxHtml } from "./staff-inbox.js";

const H = 3_600_000;
const NOW = Date.UTC(2026, 9, 30, 12);
const ERROR = /class="staff-error"/;

const overview = () => ({
  people: { 1: "aurora" },
  board: { generatedAt: null, columns: [{ key: "review", name: "Review", cards: [
    // Kira's own card: no link (what blanked the live Team dashboard on 2026-10-30).
    { id: "card#20", kind: "card", number: 20, title: "Microsoft sign-in", url: null, labels: null, people: [{ login: null, discordId: "1", name: "Ludovic", claimed: true }], claim: null, prs: null, moved: false },
    { id: "issue#7", kind: "issue", number: 7, title: "Black water", url: "https://github.com/horizon-rust/horizon/issues/7", labels: [], people: null, claim: null, prs: [], moved: false },
  ] }] },
  cards: { todo: [{ id: "c1", title: "Plan the release notes", column: "todo", owner: null, note: null, link: null, updatedAt: null }], doing: [], done: [] },
  decisions: [{ id: "d1", title: "Releases ship in batches of 5", body: null, link: null, item: null, by: null, at: null, status: "active", history: null }],
  roadmap: {
    available: false,
    areas: [{ id: "performance", name: null }],
    team: [{ id: "t1", title: "Second release manager", area: null, status: "next", owner: null, note: null, plain: null, dev: null, links: null, publishRequested: null }],
    public: [
      { id: "p1", title: "Steady frames", area: null, status: "now", links: null, focus: false, team: null },
      { id: "p2", title: "Mods", area: "performance", status: "next", links: [], focus: false, team: { owner: null, priority: null, note: null } },
    ],
  },
});

const vote = { canVote: true, mine: null, recused: false, cast: 0, quorum: 2, needed: 2, active: 3, eligible: 3, closesAt: NOW + 30 * H, firstBallotAt: null, extended: false, seen: false, ballots: null, tally: null, againstComments: null };
const application = (more = {}) => ({
  id: "a1", user: "9", name: null, role: "mod", status: "open", owner: false, submittedAt: null, decidedAt: null, contributor: null,
  questions: [{ id: "why", label: "Why?" }], answers: { why: null }, githubManual: false, tally: null, veto: null, result: null, revoked: null,
  audit: [{ at: null, by: null, app: "a1", action: "ballot", choice: null, comment: null, note: null }],
  ...more, vote: { ...vote, ...more.vote },
});

test("the Team dashboard's panels render from a payload of nulls; Kira's cards without a link are plain cards", () => {
  const html = teamPanels(overview());
  for (const [panel, part] of Object.entries(html)) assert.doesNotMatch(part, ERROR, panel);
  assert.match(html.board, /<div><span class="hub-card-title">Microsoft sign-in<\/span><span class="hub-card-meta meta"><span>Card #20<\/span><span>Ludovic<\/span>/);
  assert.match(html.board, /<a href="https:\/\/github\.com\/horizon-rust\/horizon\/issues\/7"><span class="hub-card-title">Black water/);
  assert.doesNotMatch(html.board, /href=""/);
  assert.match(html.decisions, /Releases ship in batches of 5/);
  assert.match(html.roadmap, /Second release manager/);
});

test("one part that fails shows its error; the others still render", (t) => {
  t.mock.method(console, "error", () => {});
  const html = teamPanels({ ...overview(), roadmap: null, board: { columns: [{ name: "Review", cards: [{ get title() { throw new Error("bad card"); } }] }] } });
  assert.match(html.roadmap, /The roadmap couldn't be shown/);
  assert.match(html.board, /Kira&#39;s work board couldn't be shown \(bad card\)/);
  assert.match(html.board, /Plan the release notes/, "the Team kanban beside it still renders");
  assert.doesNotMatch(html.decisions, ERROR);
});

test("the Mod numbers render without a start date and with empty weeks", () => {
  const zeros = { reports: 0, modmail: 0, warns: 0, timeouts: 0, kicks: 0, bans: 0, automod: 0 };
  const html = statsHtml({ countingSince: null, last7: zeros, last30: zeros, weeks: [{ week: "2026-W44", reports: null, modmail: null, warns: null, timeouts: null, kicks: null, bans: null, automod: null, joins: null, leaves: null }], applications: { open: { mod: 0, support: 0 }, accepted30: 0, declined30: 0 } });
  assert.match(html, /Counts only: Kira stores no list of who or what\./);
});

test("applications and the Inbox render from nulls, for a voter and for the owner", () => {
  const voting = application();
  const window = application({ id: "a2", status: "veto-window", owner: true, veto: { until: NOW + 6 * H, dm: null }, vote: { canVote: false } });
  const stalled = application({ id: "a3", status: "stalled", owner: true, vote: { canVote: false } });
  for (const a of [voting, window, stalled]) assert.match(cardHtml(a, {}, NOW), /class="hub-entry app-card/, a.id);
  const inbox = inboxHtml({ apps: [voting, window, stalled], cards: overview().cards, decisions: overview().decisions, me: "1", names: [null, undefined], now: NOW });
  assert.match(inbox, /Vote on <strong>someone<\/strong>/);
  assert.match(inbox, /data-owner="approve" data-id="a2"/);
  assert.match(inbox, /Needs your decision/);
});
