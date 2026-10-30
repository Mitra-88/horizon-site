// Applications on a staff dashboard (both of them): each one's answers, what GitHub says about the applicant, the vote
// (blind while open: the count and your own ballot), Ludovic's veto window and his actions, the audit lines.
import { api, escape, when, relative, paragraphs } from "./staff-api.js";

const ROLE = { mod: "🛡️ Mod", support: "🤝 Support", team: "🌌 Horizon Team" };
const STATUS = {
  open: "Voting",
  "veto-window": "Passed: Ludovic's veto window",
  stalled: "Stalled: Ludovic decides",
  owner: "Too few voters: Ludovic decides",
  accepted: "Accepted",
  declined: "Declined",
};
const CHOICE = { for: "For", against: "Against", abstain: "Abstain" };
const ACTION = {
  ballot: "voted", "ballot-changed": "changed their vote", recused: "recused themselves", extended: "no quorum: extended by 48 h",
  stalled: "no quorum after the extension: stalled", "to-owner": "too few active voters: to Ludovic", passed: "the vote passed: veto window opened",
  veto: "vetoed", accepted: "accepted", declined: "declined", "role-revoked": "took the role back",
};

const who = (people, id) => (id === "vote" ? "the vote" : people[id] ? escape(people[id]) : `<code>${escape(String(id).slice(-6))}</code>`);

function contributorHtml(c) {
  if (!c) return `<p class="meta">No GitHub account linked on Discord.</p>`;
  const prs = (c.prs || []).map((p) => `<li><a href="${escape(p.url)}">#${p.number}</a> ${escape(p.title)}</li>`).join("");
  return `<div class="app-github${c.verified && c.merged ? " is-contributor" : ""}">
    <p><strong>${c.verified ? "Contributor" : "GitHub"}:</strong> <a href="https://github.com/${escape(c.login)}">${escape(c.login)}</a>
    ${c.verified ? `<span class="badge badge-signed">verified</span>` : `<span class="badge badge-unsigned">not verified</span>`}
    · ${c.merged == null ? "merged pull requests unknown (GitHub didn't answer)" : `${c.merged} merged pull request${c.merged === 1 ? "" : "s"} in Horizon`}</p>
    ${prs ? `<ul class="app-prs">${prs}</ul>` : ""}
  </div>`;
}

function voteHtml(a, people) {
  const v = a.vote;
  const open = a.status === "open";
  const head = open
    ? `<p class="meta">${v.cast} ballot${v.cast === 1 ? "" : "s"} cast · quorum ${v.quorum} of ${v.active} active voter${v.active === 1 ? "" : "s"} · ${v.firstBallotAt ? `closes ${relative(v.closesAt)}` : `no ballot yet: closes ${relative(v.closesAt)} without one`}${v.extended ? " (extended)" : ""}. Ballots stay hidden until it closes.</p>`
    : a.tally ? `<p class="meta">${a.tally.for} for, ${a.tally.against} against, ${a.tally.abstain} abstain (quorum ${a.tally.quorum}).</p>` : "";
  const mine = !open ? "" : v.mine ? `<p>Your ballot: <strong>${CHOICE[v.mine.choice]}</strong>${v.mine.comment ? `: ${escape(v.mine.comment)}` : ""}. You can change it until it closes.</p>` : v.recused ? `<p>You recused yourself.</p>` : "";
  const form = v.canVote
    ? `<form class="app-ballot" data-ballot="${escape(a.id)}">
        <div class="app-choices" role="group" aria-label="Your ballot">
          ${Object.entries(CHOICE).map(([k, label]) => `<label><input type="radio" name="choice" value="${k}"${v.mine?.choice === k ? " checked" : ""} required> ${label}</label>`).join("")}
        </div>
        <label class="hub-field"><span>Comment (required when against)</span><textarea name="comment" rows="2" maxlength="1000">${escape(v.mine?.comment || "")}</textarea></label>
        <p class="hub-form-foot"><button type="submit" class="button primary small">${v.mine ? "Change my ballot" : "Vote"}</button><button type="button" class="button ghost small" data-recuse="${escape(a.id)}">Recuse myself</button><span class="meta" data-status role="status"></span></p>
      </form>`
    : open ? `<p class="meta">You don't vote on this one${v.recused ? " (recused)" : ""}.</p>` : "";
  const ballots = v.ballots?.length
    ? `<ul class="app-ballots">${v.ballots.map((b) => `<li><strong>${who(people, b.by)}</strong>: ${CHOICE[b.choice]}${b.comment ? ` · ${escape(b.comment)}` : ""}</li>`).join("")}</ul>`
    : "";
  return `<div class="app-vote">${head}${mine}${form}${ballots}</div>`;
}

function ownerHtml(a) {
  if (!a.owner) return "";
  const buttons = [];
  if (!["accepted", "declined"].includes(a.status)) buttons.push(["veto", "Veto (decline)"]);
  if (["veto-window", "stalled", "owner"].includes(a.status)) buttons.push(["approve", a.status === "veto-window" ? "Approve now" : "Accept"]);
  if (["stalled", "owner"].includes(a.status)) buttons.push(["decline", "Decline"]);
  if (a.status === "accepted" && !a.revoked) buttons.push(["revoke", "Take the role back"]);
  if (!buttons.length) return "";
  return `<p class="app-owner">${buttons.map(([act, label]) => `<button type="button" class="button ${act === "approve" ? "primary" : "secondary"} small" data-owner="${act}" data-id="${escape(a.id)}">${label}</button>`).join("")}<span class="meta" data-status role="status"></span></p>`;
}

function resultHtml(a) {
  const r = a.result;
  const lines = [];
  if (a.status === "veto-window") lines.push(`Goes through ${relative(a.veto.until)} unless Ludovic vetoes it${a.veto.dm ? ` (DM to Ludovic: ${a.veto.dm.sent ? "sent" : `not sent, ${escape(a.veto.dm.error || "")}`})` : ""}.`);
  if (r) lines.push(`${a.status === "accepted" ? `Role ${r.granted ? "given" : "<strong>not given</strong>"} · ` : ""}DM ${r.dmSent ? "sent" : "<strong>not sent</strong>"}${r.error ? ` · ${escape(r.error)}` : ""}`);
  if (a.revoked) lines.push(`Role taken back ${when(a.revoked.at)}${a.revoked.result?.error ? `: ${escape(a.revoked.result.error)}` : ""}.`);
  if (a.githubManual && ["veto-window", "accepted"].includes(a.status)) lines.push("Accepting grants only the Discord role: GitHub organisation or team access is Ludovic's to give, by hand.");
  return lines.length ? `<p class="app-result">${lines.join("<br>")}</p>` : "";
}

function cardHtml(a, people) {
  const answers = a.questions.filter((q) => a.answers[q.id]).map((q) => `<dt>${escape(q.label)}</dt><dd>${paragraphs(a.answers[q.id])}</dd>`).join("");
  const audit = a.audit.map((e) => `<li>${when(e.at)} · ${who(people, e.by)} ${ACTION[e.action] || escape(e.action)}${e.choice ? `: ${CHOICE[e.choice]}` : ""}</li>`).join("");
  return `<article class="hub-entry app-card" id="application-${escape(a.id)}">
    <p class="hub-entry-meta"><span class="badge">${ROLE[a.role]}</span><span>${STATUS[a.status] || escape(a.status)}</span><span>sent ${when(a.submittedAt)}</span></p>
    <h3 class="hub-entry-title">${escape(a.name || "someone")}</h3>
    ${contributorHtml(a.contributor)}
    <dl class="app-answers">${answers}</dl>
    ${voteHtml(a, people)}
    ${resultHtml(a)}
    ${ownerHtml(a)}
    ${audit ? `<details class="app-audit"><summary class="meta">History (${a.audit.length})</summary><ul>${audit}</ul></details>` : ""}
  </article>`;
}

// Renders the dashboard's applications into `root`. people: { id: name } known beforehand; Kira adds the names behind
// the ids in ballots and history.
export async function renderApplications(root, dashboard, people = {}) {
  const draw = (list) => {
    const open = list.filter((a) => !["accepted", "declined"].includes(a.status));
    const done = list.filter((a) => ["accepted", "declined"].includes(a.status));
    root.innerHTML = `<p class="hub-intro">Applications sent with the form Kira DMs through <code>/apply</code>. Verified contributors with merged pull requests come first. A vote passes with 2/3 of For and Against once the quorum is reached; then Ludovic has 12 hours to veto it.</p>
      ${open.length ? open.map((a) => cardHtml(a, people)).join("") : `<p class="empty">No application waiting.</p>`}
      ${done.length ? `<h3 class="title app-done-title">Decided</h3>${done.map((a) => cardHtml(a, people)).join("")}` : ""}`;
    const target = location.hash.startsWith("#application-") && document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView({ block: "start" });
  };
  const load = async () => {
    const res = await api("GET", `${dashboard}/applications`);
    people = { ...people, ...res.people };
    draw(res.applications);
  };
  root.onsubmit = async (event) => {
    const form = event.target.closest("[data-ballot]");
    if (!form) return;
    event.preventDefault();
    const status = form.querySelector("[data-status]");
    status.textContent = "Saving…";
    try {
      await api("POST", `${dashboard}/applications/vote`, { id: form.dataset.ballot, choice: form.elements.choice.value, comment: form.elements.comment.value });
      await load();
    } catch (e) {
      status.textContent = e.message;
    }
  };
  root.onclick = async (event) => {
    const recuse = event.target.closest("[data-recuse]");
    const owner = event.target.closest("[data-owner]");
    if (!recuse && !owner) return;
    const status = event.target.closest("p")?.querySelector("[data-status]");
    if (owner && !confirm(`${owner.textContent}: are you sure?`)) return;
    try {
      if (recuse) await api("POST", `${dashboard}/applications/vote`, { id: recuse.dataset.recuse, recuse: true });
      else await api("POST", `${dashboard}/applications/owner`, { id: owner.dataset.id, action: owner.dataset.owner });
      await load();
    } catch (e) {
      if (status) status.textContent = e.message;
    }
  };
  await load();
}
