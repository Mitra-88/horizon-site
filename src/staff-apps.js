// Applications on a staff dashboard (both of them). A card's first screen holds what a voter needs: who, which role,
// the contributor badge, the answers, where the vote stands in plain words, the tally once you voted, and your buttons.
// The ballots, the history, recusal and the rest fold away under "More". Blind until you vote: Kira sends the others'
// ballots only once you cast yours or the vote closed (src/application-votes.js in kira).
import { api, escape, when, paragraphs, section } from "./staff-api.js";

export const ROLE = { mod: "🛡️ Mod", support: "🤝 Support", team: "🌌 Horizon Team" };
export const CHOICE = { for: "For", against: "Against", abstain: "Abstain" };
const ACTION = {
  ballot: "voted", "ballot-changed": "changed their vote", recused: "recused themselves", extended: "not enough votes: 48 more hours",
  stalled: "still not enough votes: sent to Ludovic", "to-owner": "too few active voters: sent to Ludovic", passed: "the vote passed: Ludovic's 12-hour veto window opened",
  veto: "vetoed it", accepted: "accepted", declined: "declined", "role-revoked": "took the role back",
};
export const FINAL = ["accepted", "declined"];

// "31 h", "2 days", "25 min": how long until `ms`.
export function left(ms, now = Date.now()) {
  const m = Math.max(0, Math.round((ms - now) / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h` : `${Math.round(h / 24)} days`;
}
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const who = (people, id) => (id === "vote" ? "The vote" : people[id] ? escape(people[id]) : "A former member");

// Where the vote stands, in one line.
export function standing(a, now = Date.now()) {
  const v = a.vote;
  if (a.status === "open") {
    const votes = v.needed > 0 ? `${v.cast} of ${v.quorum} votes needed` : `${plural(v.cast, "vote")}, enough`;
    return `${votes} · closes in ${left(v.closesAt, now)}${v.extended ? " (extended once)" : ""}`;
  }
  if (a.status === "veto-window") return `Passed · goes through in ${left(a.veto.until, now)} unless Ludovic vetoes it`;
  if (a.status === "stalled") return "Not enough votes, even after 48 more hours · Ludovic decides";
  if (a.status === "owner") return "Too few active voters · Ludovic decides";
  if (a.status === "accepted") return `Accepted ${when(a.decidedAt)}${a.revoked ? ` · role taken back ${when(a.revoked.at)}` : ""}`;
  return `Declined ${when(a.decidedAt)}`;
}

// What the viewer is asked to do, in one line (the Inbox uses it too).
export function yourPart(a) {
  const v = a.vote;
  if (a.owner && a.status === "veto-window") return "Approve it now, veto it, or let it go through.";
  if (a.owner && ["stalled", "owner"].includes(a.status)) return "Your decision: accept or decline.";
  if (a.status !== "open") return "";
  if (v.recused) return "You recused yourself.";
  if (v.mine) return `You voted ${CHOICE[v.mine.choice]}. You can change it until the vote closes.`;
  if (v.canVote) return "Your vote is needed.";
  return a.owner ? "You don't vote; you can veto it at any time." : "You don't vote on this one.";
}

function badge(c) {
  if (!c) return "";
  if (!c.verified) return `<span class="badge">GitHub: ${escape(c.login)} (not verified)</span>`;
  return `<span class="badge badge-signed">Contributor · ${c.merged == null ? "pull requests unknown" : plural(c.merged, "merged PR")}</span>`;
}
function prLinks(c, from, to) {
  return (c?.prs || []).slice(from, to).map((p) => `<a href="${escape(p.url)}" title="${escape(p.title)}">#${p.number}</a>`).join(" · ");
}

function ballotForm(a) {
  const v = a.vote;
  if (!v.canVote) return "";
  return `<form class="app-ballot" data-ballot="${escape(a.id)}">
    <fieldset class="app-choices"><legend class="sr-only">Your vote</legend>
      ${Object.entries(CHOICE).map(([k, label]) => `<label class="app-choice"><input type="radio" name="choice" value="${k}"${v.mine?.choice === k ? " checked" : ""} required><span>${label}</span></label>`).join("")}
    </fieldset>
    <label class="hub-field app-comment"><span>Comment (required for Against; the applicant never sees it)</span><textarea name="comment" rows="2" maxlength="1000">${escape(v.mine?.comment || "")}</textarea></label>
    <p class="hub-form-foot"><button type="submit" class="button primary">${v.mine ? "Change my vote" : "Send my vote"}</button><span class="meta" data-status role="status"></span></p>
  </form>`;
}

function ownerButtons(a) {
  if (!a.owner) return "";
  const b = [];
  if (["veto-window", "stalled", "owner"].includes(a.status)) b.push(["approve", a.status === "veto-window" ? "Approve now" : "Accept", "primary"]);
  if (["stalled", "owner"].includes(a.status)) b.push(["decline", "Decline", "secondary"]);
  if (!FINAL.includes(a.status)) b.push(["veto", "Veto", "secondary"]);
  if (a.status === "accepted" && !a.revoked) b.push(["revoke", "Take the role back", "secondary"]);
  return b.length ? `<p class="app-owner">${b.map(([act, label, kind]) => `<button type="button" class="button ${kind}" data-owner="${act}" data-id="${escape(a.id)}">${label}</button>`).join("")}<span class="meta" data-status role="status"></span></p>` : "";
}

function tallyLine(a) {
  const t = a.vote.tally || a.tally;
  if (!t) return "";
  const n = `${t.for} for · ${t.against} against · ${t.abstain} abstain`;
  return `<p class="app-tally">${a.status === "open" ? `So far: ${n}` : `Result: ${n}`}</p>`;
}

function resultLine(a) {
  const r = a.result;
  const lines = [];
  if (a.githubManual && ["veto-window", "accepted"].includes(a.status)) lines.push("Accepting gives only the Discord role: GitHub organisation access is Ludovic's to give, by hand.");
  if (r && a.status === "accepted" && !r.granted) lines.push(`<strong>The role was not given</strong>${r.error ? `: ${escape(r.error)}` : ""}.`);
  if (r && !r.dmSent) lines.push(`<strong>The DM was not sent</strong>${r.error ? `: ${escape(r.error)}` : ""}.`);
  if (a.revoked?.result?.error) lines.push(`Taking the role back: ${escape(a.revoked.result.error)}.`);
  return lines.length ? `<p class="app-result">${lines.join("<br>")}</p>` : "";
}

function moreHtml(a, people) {
  const v = a.vote;
  const ballots = v.ballots?.length ? `<h4>Votes</h4><ul class="app-ballots">${v.ballots.map((b) => `<li><strong>${who(people, b.by)}</strong>: ${CHOICE[b.choice]}${b.comment ? ` · ${escape(b.comment)}` : ""}</li>`).join("")}</ul>`
    : a.status === "open" ? `<p class="meta">${a.owner ? "Who voted what shows here when the vote closes." : "The others' votes show here once you vote (or when the vote closes)."}</p>` : "";
  const more = (a.contributor?.prs || []).length > 3 ? `<p>More pull requests: ${prLinks(a.contributor, 3)}</p>` : "";
  const github = !a.contributor ? `<p class="meta">No GitHub account linked on Discord.</p>` : "";
  const recuse = v.canVote ? `<p><button type="button" class="button ghost small" data-recuse="${escape(a.id)}">Recuse myself</button> <span class="meta">You won't vote or see the votes on this one.</span></p>` : "";
  const history = (a.audit || []).map((e) => `<li>${when(e.at)} · ${who(people, e.by)} ${ACTION[e.action] || "acted"}${e.choice ? `: ${CHOICE[e.choice]}` : ""}${e.note ? ` (your note: ${escape(e.note)})` : ""}</li>`).join("");
  return `<details class="app-more"><summary class="meta">More: votes, history${v.canVote ? ", recuse" : ""}</summary>
    ${ballots}${more}${github}${recuse}
    ${history ? `<h4>History</h4><ul class="app-history">${history}</ul>` : ""}
    <p class="meta">Sent ${when(a.submittedAt)}.</p>
  </details>`;
}

export function cardHtml(a, people, now = Date.now()) {
  const answers = (a.questions || []).filter((q) => a.answers?.[q.id]).map((q) => `<dt>${escape(q.label)}</dt><dd>${paragraphs(a.answers[q.id])}</dd>`).join("");
  const part = yourPart(a);
  return `<article class="hub-entry app-card${a.vote.canVote && !a.vote.mine ? " needs-you" : ""}" id="application-${escape(a.id)}">
    <header class="app-head">
      <h3 class="hub-entry-title">${escape(a.name || "Someone")}</h3>
      <p class="app-badges"><span class="badge">${ROLE[a.role]}</span>${badge(a.contributor)}${a.contributor?.verified && a.contributor.prs?.length ? `<span class="app-prs">${prLinks(a.contributor, 0, 3)}</span>` : ""}</p>
    </header>
    <p class="app-standing">${standing(a, now)}</p>
    <dl class="app-answers">${answers}</dl>
    ${tallyLine(a)}
    ${a.vote.againstComments?.length ? `<div class="app-against"><p class="meta">Against, without names until the vote closes:</p><ul>${a.vote.againstComments.map((c) => `<li>${escape(c)}</li>`).join("")}</ul></div>` : ""}
    ${part ? `<p class="app-part">${part}</p>` : ""}
    ${ballotForm(a)}
    ${ownerButtons(a)}
    ${resultLine(a)}
    ${moreHtml(a, people)}
  </article>`;
}

// Ludovic's action on an application, after he confirms (a veto asks for an optional private note). False if he cancels.
export async function ownerAct(dashboard, id, action, label) {
  let note = "";
  if (action === "veto") {
    note = prompt("Veto: the application is declined and the applicant gets the usual polite DM, without the votes.\nOptional note, only you will see it:", "");
    if (note === null) return false;
  } else if (!confirm(`${label}: are you sure?`)) return false;
  await api("POST", `${dashboard}/applications/owner`, { id, action, note });
  return true;
}

// One application on its own: if it can't be shown, the others still are.
const cardOrError = (a, people) => section(`${a?.name || "An"} application`, () => cardHtml(a, people));

export async function fetchApplications(dashboard) {
  return api("GET", `${dashboard}/applications`);
}

// Renders the dashboard's applications into `root`. people: { id: name } known beforehand; Kira adds the names behind
// the ids in ballots and history. onChange: called after a vote or an owner action (the Inbox refreshes).
export async function renderApplications(root, dashboard, people = {}, onChange = () => {}) {
  const draw = (list) => {
    const open = list.filter((a) => !FINAL.includes(a.status));
    const done = list.filter((a) => FINAL.includes(a.status));
    root.innerHTML = `<p class="hub-intro">Verified contributors come first. <a href="/staff/help#applications">How the vote works</a>.</p>
      ${open.length ? open.map((a) => cardOrError(a, people)).join("") : `<p class="empty">No application waiting. New ones appear here when someone sends the form from <code>/apply</code>.</p>`}
      ${done.length ? `<details class="app-decided"><summary><h3 class="title app-done-title">Decided <span class="hub-count">${done.length}</span></h3></summary>${done.map((a) => cardOrError(a, people)).join("")}</details>` : ""}`;
    const target = location.hash.startsWith("#application-") && document.getElementById(location.hash.slice(1));
    if (target) {
      target.closest("details")?.setAttribute("open", "");
      target.scrollIntoView({ block: "start" });
    }
  };
  const load = async () => {
    const res = await fetchApplications(dashboard);
    people = { ...people, ...res.people };
    draw(res.applications);
  };
  const after = async () => {
    await load();
    onChange();
  };
  root.onsubmit = async (event) => {
    const form = event.target.closest("[data-ballot]");
    if (!form) return;
    event.preventDefault();
    const status = form.querySelector("[data-status]");
    status.textContent = "Sending…";
    try {
      await api("POST", `${dashboard}/applications/vote`, { id: form.dataset.ballot, choice: form.elements.choice.value, comment: form.elements.comment.value });
      await after();
    } catch (e) {
      status.textContent = e.message;
    }
  };
  root.onclick = async (event) => {
    const recuse = event.target.closest("[data-recuse]");
    const owner = event.target.closest("[data-owner]");
    if (!recuse && !owner) return;
    const status = event.target.closest(".app-card")?.querySelector(".app-owner [data-status]");
    if (recuse && !confirm("Recuse yourself? You won't vote or see the votes on this application.")) return;
    try {
      if (recuse) await api("POST", `${dashboard}/applications/vote`, { id: recuse.dataset.recuse, recuse: true });
      else if (!(await ownerAct(dashboard, owner.dataset.id, owner.dataset.owner, owner.textContent))) return;
      await after();
    } catch (e) {
      if (status) status.textContent = e.message;
      else alert(e.message);
    }
  };
  await load();
  return { reload: load };
}
