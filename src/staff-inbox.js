// The Inbox, the first tab of both dashboards: only what needs the signed-in member now, each item one line saying
// what to do and a button that goes there. Applications waiting for your vote, votes you are in that close within a
// day; for Ludovic, votes in his veto window and the ones he decides; on the Team dashboard, your open cards.
import { escape } from "./staff-api.js";
import { ROLE, CHOICE, FINAL, left, standing } from "./staff-apps.js";

const SOON = 24 * 3_600_000;
const COLUMN = { todo: "To do", doing: "Doing" };

function item(what, detail, href, action, primary = false) {
  return `<li class="inbox-item"><div class="inbox-text"><span class="inbox-what">${what}</span><span class="meta">${detail}</span></div><a class="button ${primary ? "primary" : "secondary"} small" href="${href}">${action}</a></li>`;
}
const app = (a) => `<strong>${escape(a.name || "someone")}</strong>'s ${ROLE[a.role]} application`;
const goTo = (a) => `#application-${encodeURIComponent(a.id)}`;

// apps: the dashboard's applications; cards: the Team kanban by column (Team dashboard only); me: the viewer's id.
export function inboxHtml({ apps, cards = null, me, now = Date.now() }) {
  const open = apps.filter((a) => a.status === "open");
  const groups = [
    { id: "vote", title: "Waiting for your vote", short: "to vote on", items: open.filter((a) => a.vote.canVote && !a.vote.mine).sort((a, b) => a.vote.closesAt - b.vote.closesAt)
      .map((a) => item(`Vote on ${app(a)}`, standing(a, now), goTo(a), "Vote", true)) },
    { id: "closing", title: "Closing within a day", short: "closing within a day", items: open.filter((a) => a.vote.mine && a.vote.closesAt - now < SOON)
      .map((a) => item(`${app(a)} closes in ${left(a.vote.closesAt, now)}`, `You voted ${CHOICE[a.vote.mine.choice]}. Change it before it closes if you need to.`, goTo(a), "Review")) },
    { id: "veto", title: "In your veto window", short: "in your veto window", items: apps.filter((a) => a.owner && a.status === "veto-window")
      .map((a) => item(`${app(a)} passed${a.tally ? `, ${a.tally.for} to ${a.tally.against}` : ""}`, `Goes through in ${left(a.veto.until, now)}. Approve it now, veto it, or let it go through.`, goTo(a), "Review", true)) },
    { id: "decide", title: "Waiting for your decision", short: "to decide", items: apps.filter((a) => a.owner && ["stalled", "owner"].includes(a.status))
      .map((a) => item(`Decide on ${app(a)}`, standing(a, now), goTo(a), "Decide", true)) },
  ];
  if (cards) {
    const mine = ["doing", "todo"].flatMap((c) => cards[c]).filter((c) => c.owner === me);
    groups.push({ id: "cards", title: "Your cards", short: mine.length === 1 ? "card of yours" : "cards of yours", items: mine.map((c) => item(escape(c.title), `${COLUMN[c.column]} on the Team kanban`, "#board", "Open")) });
  }
  const shown = groups.filter((g) => g.items.length);
  const waiting = apps.filter((a) => !FINAL.includes(a.status)).length;
  if (!shown.length) {
    return `<p class="lede inbox-empty">Nothing needs you right now. Applications waiting for your vote${cards ? " and cards assigned to you" : ""} show up here.</p>
      <p class="meta"><a href="#applications">${waiting ? `${waiting} application${waiting === 1 ? "" : "s"} in progress` : "No application in progress"}</a></p>`;
  }
  return `<p class="inbox-summary">${shown.map((g) => `<a href="#inbox-${g.id}"><strong>${g.items.length}</strong> ${g.short}</a>`).join(" · ")}</p>
    ${shown.map((g) => `<section class="inbox-group" id="inbox-${g.id}"><h2 class="inbox-title">${g.title}</h2><ul class="inbox-list">${g.items.join("")}</ul></section>`).join("")}`;
}

// How many items the Inbox holds (the tab's count).
export const inboxCount = (html) => (html.match(/class="inbox-item"/g) || []).length;
