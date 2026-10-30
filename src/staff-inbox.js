// The Inbox, the first tab of both dashboards: only what needs the signed-in member now, each item one line saying
// what to do. Applications waiting for your vote, votes you are in that close within a day; for Ludovic, votes in his
// veto window (Approve now and Veto right there) and the ones he decides; on the Team dashboard, your open cards and
// the decisions of the last week that name you.
import { escape, when } from "./staff-api.js";
import { ROLE, CHOICE, FINAL, left, ownerAct } from "./staff-apps.js";

const SOON = 24 * 3_600_000;
const WEEK = 7 * 24 * 3_600_000;
const COLUMN = { todo: "To do", doing: "Doing" };

function item(what, detail, actions) {
  return `<li class="inbox-item"><div class="inbox-text"><span class="inbox-what">${what}</span><span class="meta">${detail}</span></div><div class="inbox-actions">${actions}</div></li>`;
}
const link = (href, label, primary = false) => `<a class="button ${primary ? "primary" : "secondary"} small" href="${href}">${label}</a>`;
const owner = (a, action, label, primary = false) => `<button type="button" class="button ${primary ? "primary" : "secondary"} small" data-owner="${action}" data-id="${escape(a.id)}">${label}</button>`;
const app = (a) => `<strong>${escape(a.name || "someone")}</strong>'s ${ROLE[a.role]} application`;
const goTo = (a) => `#application-${encodeURIComponent(a.id)}`;
const votes = (v) => (v.needed > 0 ? `${v.cast} of ${v.quorum} votes needed` : `${v.cast} vote${v.cast === 1 ? "" : "s"}, enough`);

// Whether a decision names `names` (the viewer's Discord names): as a word in its title or details, with or without @.
function namesYou(d, names) {
  const text = `${d.title} ${d.body || ""}`;
  return names.some((n) => n && new RegExp(`(^|[^\\w])@?${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`, "i").test(text));
}

// apps: the dashboard's applications; cards: the Team kanban by column, decisions: the Team's log (Team dashboard
// only); me: the viewer's id; names: how others write the viewer's name.
export function inboxHtml({ apps, cards = null, decisions = null, me, names = [], now = Date.now() }) {
  const open = apps.filter((a) => a.status === "open");
  const groups = [
    { id: "veto", title: "In your veto window", short: "in your veto window", items: apps.filter((a) => a.owner && a.status === "veto-window")
      .map((a) => item(`${app(a)} passed${a.tally ? `, ${a.tally.for} to ${a.tally.against}` : ""} · goes through in ${left(a.veto.until, now)}`, "Approve it now, veto it, or let it go through.",
        owner(a, "approve", "Approve now", true) + owner(a, "veto", "Veto") + link(goTo(a), "Read"))) },
    { id: "decide", title: "Waiting for your decision", short: "to decide", items: apps.filter((a) => a.owner && ["stalled", "owner"].includes(a.status))
      .map((a) => item(`Decide on ${app(a)}`, a.status === "stalled" ? "Not enough votes, even after 48 more hours." : "Too few active voters to hold a vote.", link(goTo(a), "Decide", true))) },
    { id: "vote", title: "Waiting for your vote", short: "to vote on", items: open.filter((a) => a.vote.canVote && !a.vote.mine).sort((a, b) => a.vote.closesAt - b.vote.closesAt)
      .map((a) => item(`Vote on ${app(a)} · closes in ${left(a.vote.closesAt, now)}`, votes(a.vote), link(goTo(a), "Vote", true))) },
    { id: "closing", title: "Closing within a day", short: "closing within a day", items: open.filter((a) => a.vote.mine && a.vote.closesAt - now < SOON)
      .map((a) => item(`${app(a)} · closes in ${left(a.vote.closesAt, now)}`, `You voted ${CHOICE[a.vote.mine.choice]}. Change it before it closes if you need to.`, link(goTo(a), "Review"))) },
  ];
  if (cards) {
    const mine = ["doing", "todo"].flatMap((c) => cards[c]).filter((c) => c.owner === me);
    groups.push({ id: "cards", title: "Your cards", short: mine.length === 1 ? "card of yours" : "cards of yours", items: mine.map((c) => item(escape(c.title), `${COLUMN[c.column]} on the Team board`, link("#board", "Open"))) });
  }
  if (decisions) {
    const named = decisions.filter((d) => d.status === "active" && d.by !== me && d.at > now - WEEK && namesYou(d, names));
    groups.push({ id: "decisions", title: "Decisions that name you", short: named.length === 1 ? "decision names you" : "decisions name you", items: named.map((d) => item(escape(d.title), `Recorded ${when(d.at)}`, link("#decisions", "Read"))) });
  }
  const shown = groups.filter((g) => g.items.length);
  const waiting = apps.filter((a) => !FINAL.includes(a.status)).length;
  if (!shown.length) {
    return `<p class="lede inbox-empty">Nothing needs you right now.</p>
      <p class="meta">Votes waiting for you${cards ? ", your cards and decisions that name you" : ""} show up here. <a href="#applications">${waiting ? `${waiting} application${waiting === 1 ? "" : "s"} in progress` : "No application in progress"}</a>.</p>`;
  }
  return `<p class="inbox-summary">${shown.map((g) => `<a href="#inbox-${g.id}"><strong>${g.items.length}</strong> ${g.short}</a>`).join(" · ")}</p>
    ${shown.map((g) => `<section class="inbox-group" id="inbox-${g.id}"><h2 class="inbox-title">${g.title}</h2><ul class="inbox-list">${g.items.join("")}</ul></section>`).join("")}`;
}

// Approve now and Veto in the Inbox: the same confirmations as on the card, then `refresh` (applications and Inbox).
export function wireInbox(panel, dashboard, refresh) {
  panel.addEventListener("click", async (event) => {
    const b = event.target.closest("[data-owner]");
    if (!b) return;
    b.disabled = true;
    try {
      if (await ownerAct(dashboard, b.dataset.id, b.dataset.owner, b.textContent)) await refresh();
    } catch (e) {
      alert(e.message);
    } finally {
      b.disabled = false;
    }
  });
}

// How many items the Inbox holds (the tab's count).
export const inboxCount = (html) => (html.match(/class="inbox-item"/g) || []).length;
