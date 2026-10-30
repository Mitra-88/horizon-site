// The Team dashboard (/staff/team): the Team kanban and Kira's work board, the roadmap with its Team layer (Team-only
// items, notes on public ones, publishing an item to the public roadmap), the decisions log, applications.
import { api, escape, when, linkHtml, paragraphs, placePill, section } from "./staff-api.js";
import { renderApplications, fetchApplications } from "./staff-apps.js";
import { inboxHtml, inboxCount, wireInbox } from "./staff-inbox.js";
import { renderStats, renderData } from "./staff-stats.js";

const TABS = [["inbox", "Inbox"], ["applications", "Applications"], ["board", "Board"], ["roadmap", "Roadmap"], ["decisions", "Decisions"], ["stats", "Stats"], ["data", "Data"]];
const COLUMNS = [["todo", "To do"], ["doing", "Doing"], ["done", "Done"]];
const STATUSES = [["now", "Now"], ["next", "Next"], ["help-wanted", "Help wanted"], ["later", "Later"], ["shipped", "Shipped"]];
const statusName = Object.fromEntries(STATUSES);

let data = null; // team/overview
const name = (id) => (id && data.people?.[id] ? escape(data.people[id]) : "");
const peopleOptions = (selected) => `<option value="">Nobody</option>` + Object.entries(data.people || {}).map(([id, n]) => `<option value="${escape(id)}"${id === selected ? " selected" : ""}>${escape(n)}</option>`).join("");
const field = (label, input) => `<label class="hub-field"><span>${label}</span>${input}</label>`;
const status = `<span class="meta" data-status role="status"></span>`;

// ── Board ─────────────────────────────────────────────────────────────────────

function cardHtml(c) {
  const i = COLUMNS.findIndex(([k]) => k === c.column);
  return `<li class="hub-card staff-card"><div class="staff-card-body">
    <span class="hub-card-title">${escape(c.title)}</span>
    ${c.note ? `<span class="meta">${paragraphs(c.note)}</span>` : ""}
    <span class="hub-card-meta meta">${c.owner ? `<span>${name(c.owner)}</span>` : ""}${c.link ? `<span>${linkHtml(c.link)}</span>` : ""}${c.updatedAt ? `<span>${when(c.updatedAt)}</span>` : ""}</span>
    <span class="staff-card-actions">
      ${i > 0 ? `<button type="button" class="button ghost small" data-move="${escape(c.id)}" data-to="${COLUMNS[i - 1][0]}" aria-label="Move to ${COLUMNS[i - 1][1]}">←</button>` : ""}
      ${i < 2 ? `<button type="button" class="button ghost small" data-move="${escape(c.id)}" data-to="${COLUMNS[i + 1][0]}" aria-label="Move to ${COLUMNS[i + 1][1]}">→</button>` : ""}
      <button type="button" class="button ghost small" data-delete-card="${escape(c.id)}">Delete</button>
    </span>
    <details><summary class="meta">Edit</summary>
      <form class="hub-form staff-inline" data-card-form="${escape(c.id)}">
        <input type="hidden" name="column" value="${escape(c.column)}">
        ${field("Title", `<input name="title" required maxlength="200" value="${escape(c.title)}">`)}
        ${field("Owner", `<select name="owner">${peopleOptions(c.owner)}</select>`)}
        ${field("Note", `<textarea name="note" rows="2" maxlength="2000">${escape(c.note || "")}</textarea>`)}
        ${field("Link", `<input name="link" maxlength="300" value="${escape(c.link || "")}">`)}
        <p class="hub-form-foot"><button type="submit" class="button primary small">Save</button>${status}</p>
      </form>
    </details></div></li>`;
}

const KIND = { pr: "PR", issue: "Issue", card: "Card" };
// A card of Kira's work board: issues and pull requests link to GitHub; Kira's own cards may have no link (url null).
function workCardHtml(k) {
  const inner = `<span class="hub-card-title">${escape(k.title)}</span><span class="hub-card-meta meta"><span>${KIND[k.kind] || "Card"} #${escape(k.number)}</span>${(k.people || []).slice(0, 2).map((p) => `<span>${escape(p?.name || p?.login)}</span>`).join("")}</span>`;
  return `<li class="hub-card">${k.url ? `<a href="${escape(k.url)}">${inner}</a>` : `<div>${inner}</div>`}</li>`;
}

function workBoardHtml() {
  if (!data.board) return `<p class="empty">Kira's board isn't loaded yet.</p>`;
  return (data.board.columns || []).map((c) => {
    const cards = c.cards || [];
    return `<section class="hub-column"><h3>${escape(c.name)}<span class="hub-count">${cards.length}</span></h3><ul class="hub-cards-list">${cards.slice(0, 12).map(workCardHtml).join("")}</ul>${cards.length > 12 ? `<p class="meta">and ${cards.length - 12} more on <a href="/hub#board">the hub</a></p>` : ""}</section>`;
  }).join("");
}

function boardHtml() {
  const team = section("The Team kanban", () => COLUMNS.map(([k, label]) => {
    const cards = data.cards?.[k] || [];
    return `<section class="hub-column"><h3>${label}<span class="hub-count">${cards.length}</span></h3><ul class="hub-cards-list">${cards.map(cardHtml).join("") || `<li class="empty meta">Nothing here.</li>`}</ul></section>`;
  }).join(""));
  const work = section("Kira's work board", workBoardHtml);
  return `<section class="hub-block staff-first">
      <h2 class="title">Team kanban</h2>
      <p class="hub-intro">Coordination that isn't a GitHub issue: releases, onboarding, reviews to organise. Only the Team sees it.</p>
      <div class="hub-board staff-board-3">${team}</div>
      <form class="hub-form staff-inline" data-add-card>
        <div class="hub-form-pair">${field("New card", `<input name="title" required maxlength="200" placeholder="What needs doing">`)}${field("Owner", `<select name="owner">${peopleOptions("")}</select>`)}</div>
        <div class="hub-form-pair">${field("Note", `<input name="note" maxlength="2000">`)}${field("Link", `<input name="link" maxlength="300" placeholder="#123 or https://github.com/…">`)}</div>
        <p class="hub-form-foot"><button type="submit" class="button primary small">Add to To do</button>${status}</p>
      </form>
    </section>
    <section class="hub-block">
      <h2 class="title">Work board</h2>
      <p class="hub-intro">Kira's board from GitHub, as on the hub (read-only here: move cards with <code>/move</code> on Discord or the MCP tools).</p>
      <div class="hub-board">${work}</div>
    </section>`;
}

// ── Roadmap ───────────────────────────────────────────────────────────────────

const areaOptions = (selected) => (data.roadmap?.areas || []).map((a) => `<option value="${escape(a.id)}"${a.id === selected ? " selected" : ""}>${escape(a.name)}</option>`).join("");
const statusOptions = (selected) => STATUSES.map(([k, l]) => `<option value="${k}"${k === selected ? " selected" : ""}>${l}</option>`).join("");
const areaName = (id) => escape((data.roadmap?.areas || []).find((a) => a.id === id)?.name || id);

function itemForm(it = {}) {
  return `<form class="hub-form staff-inline" data-item-form="${escape(it.id || "")}">
    <div class="hub-form-pair">${field("Title", `<input name="title" required maxlength="120" value="${escape(it.title || "")}">`)}${field("Owner", `<select name="owner">${peopleOptions(it.owner)}</select>`)}</div>
    <div class="hub-form-pair">${field("Area", `<select name="area">${areaOptions(it.area)}</select>`)}${field("Status", `<select name="status">${statusOptions(it.status || "next")}</select>`)}</div>
    ${field("Team note", `<textarea name="note" rows="2" maxlength="2000">${escape(it.note || "")}</textarea>`)}
    ${field("For players, if it is published (240 characters)", `<textarea name="plain" rows="2" maxlength="240">${escape(it.plain || "")}</textarea>`)}
    ${field("For contributors, if it is published", `<textarea name="dev" rows="3" maxlength="1500">${escape(it.dev || "")}</textarea>`)}
    ${field("Links (#123, https://github.com/…, docs/…), separated by spaces", `<input name="links" maxlength="800" value="${escape((it.links || []).join(" "))}">`)}
    <p class="hub-form-foot"><button type="submit" class="button primary small">${it.id ? "Save" : "Add the Team-only item"}</button>${status}</p>
  </form>`;
}

function teamItemHtml(it) {
  return `<article class="hub-entry staff-item" id="item-${escape(it.id)}">
    <p class="hub-entry-meta"><span class="badge badge-unsigned">Team only</span><span>${statusName[it.status] || escape(it.status)}</span><span>${areaName(it.area)}</span>${it.owner ? `<span>${name(it.owner)}</span>` : ""}${it.publishRequested ? `<span>publish asked ${when(it.publishRequested.at)}</span>` : ""}</p>
    <h3 class="hub-entry-title">${escape(it.title)}</h3>
    ${it.note ? `<p>${paragraphs(it.note)}</p>` : ""}
    ${it.links?.length ? `<p class="meta">${it.links.map(linkHtml).join(" · ")}</p>` : ""}
    <details><summary class="meta">Edit</summary>${itemForm(it)}</details>
    <p class="staff-card-actions"><button type="button" class="button secondary small" data-publish="${escape(it.id)}">Publish…</button><button type="button" class="button ghost small" data-delete-item="${escape(it.id)}">Delete</button>${status}</p>
    <div data-snippet></div>
  </article>`;
}

function publicItemHtml(it) {
  const t = it.team;
  return `<li class="staff-public">
    <div><a href="/hub#${escape(it.id)}">${escape(it.title)}</a> <span class="meta">${areaName(it.area)}</span>
    ${t ? `<span class="meta"> · ${t.priority ? `${escape(t.priority)} priority` : ""}${t.owner ? ` · ${name(t.owner)}` : ""}${t.note ? ` · ${escape(t.note)}` : ""}</span>` : ""}</div>
    <details><summary class="meta">Team note</summary>
      <form class="hub-form staff-inline" data-note-form="${escape(it.id)}">
        <div class="hub-form-pair">${field("Owner", `<select name="owner">${peopleOptions(t?.owner)}</select>`)}${field("Priority", `<select name="priority">${["", "high", "normal", "low"].map((p) => `<option value="${p}"${(t?.priority || "") === p ? " selected" : ""}>${p || "None"}</option>`).join("")}</select>`)}</div>
        ${field("Note (Team only)", `<input name="note" maxlength="2000" value="${escape(t?.note || "")}">`)}
        <p class="hub-form-foot"><button type="submit" class="button primary small">Save</button>${status}</p>
      </form>
    </details>
  </li>`;
}

function roadmapHtml() {
  const r = data.roadmap;
  const groups = STATUSES.map(([k, label]) => {
    const items = (r.public || []).filter((i) => i.status === k);
    return items.length ? `<details class="staff-group"${k === "now" ? " open" : ""}><summary><span class="title">${label}</span> <span class="hub-count">${items.length}</span></summary><ul class="staff-publics">${items.map(publicItemHtml).join("")}</ul></details>` : "";
  }).join("");
  return `<section class="hub-block staff-first">
      <h2 class="title">Team-only items</h2>
      <p class="hub-intro">Plans the public doesn't see. They never reach the public repository by themselves: "Publish" gives the entry to add to <code>roadmap/roadmap.toml</code> in a pull request, and once it is merged the item shows as public here.</p>
      ${(r.team || []).map(teamItemHtml).join("") || `<p class="empty">No Team-only item.</p>`}
      <details class="staff-new"><summary class="button secondary small">New Team-only item</summary>${itemForm()}</details>
    </section>
    <section class="hub-block">
      <h2 class="title">Public roadmap</h2>
      <p class="hub-intro">What everyone sees on <a href="/hub#roadmap">the hub</a>, from <code>roadmap/roadmap.toml</code>${r.available ? "" : " (not loaded right now)"}. The Team's owner, priority and notes on each item stay here.</p>
      ${groups}
    </section>`;
}

// ── Decisions ─────────────────────────────────────────────────────────────────

const itemOptions = (selected) => `<option value="">None</option>` + [...(data.roadmap?.team || []), ...(data.roadmap?.public || [])].map((i) => `<option value="${escape(i.id)}"${i.id === selected ? " selected" : ""}>${escape(i.title)}</option>`).join("");
function decisionForm(d = {}) {
  return `<form class="hub-form staff-inline" data-decision-form="${escape(d.id || "")}">
    ${field("Decision", `<input name="title" required maxlength="200" value="${escape(d.title || "")}" placeholder="What was decided, in one line">`)}
    ${field("Details", `<textarea name="body" rows="3" maxlength="4000">${escape(d.body || "")}</textarea>`)}
    <div class="hub-form-pair">${field("Link", `<input name="link" maxlength="300" value="${escape(d.link || "")}" placeholder="#123 or https://github.com/…">`)}${field("Roadmap item", `<select name="item">${itemOptions(d.item)}</select>`)}</div>
    <p class="hub-form-foot"><button type="submit" class="button primary small">${d.id ? "Save (the old version is kept)" : "Record the decision"}</button>${status}</p>
  </form>`;
}
function decisionsHtml() {
  const list = (data.decisions || []).map((d) => `<article class="hub-entry${d.status === "withdrawn" ? " is-withdrawn" : ""}">
      <p class="hub-entry-meta"><span>${when(d.at)}</span><span>${name(d.by) || "someone"}</span>${d.item ? `<span>${escape(d.item)}</span>` : ""}${d.status === "withdrawn" ? `<span class="badge badge-unsigned">withdrawn</span>` : ""}</p>
      <h3 class="hub-entry-title">${escape(d.title)}</h3>
      ${d.body ? `<p>${paragraphs(d.body)}</p>` : ""}
      ${d.link ? `<p class="meta">${linkHtml(d.link)}</p>` : ""}
      ${d.history?.length ? `<details><summary class="meta">Earlier versions (${d.history.length})</summary><ul class="app-ballots">${d.history.map((h) => `<li>${when(h.at)}, before ${name(h.by)}'s change: ${escape(h.title)}</li>`).join("")}</ul></details>` : ""}
      ${d.status === "active" ? `<details><summary class="meta">Edit</summary>${decisionForm(d)}<p><button type="button" class="button ghost small" data-withdraw="${escape(d.id)}">Withdraw it</button>${status}</p></details>` : ""}
    </article>`).join("");
  return `<section class="hub-block staff-first">
      <h2 class="title">Record a decision</h2>
      <p class="hub-intro">Who decided what and when, with a link. Nothing is ever deleted: an edit keeps the previous version and a withdrawn decision stays listed.</p>
      ${decisionForm()}
    </section>
    <section class="hub-block"><h2 class="title">Decisions</h2>${list || `<p class="empty">No decision recorded yet.</p>`}</section>`;
}

// ── The page ──────────────────────────────────────────────────────────────────

const values = (form) => Object.fromEntries(new FormData(form));

// The Board, Roadmap and Decisions panels from Kira's team/overview, each on its own: one that fails shows its error.
export function teamPanels(overview) {
  data = overview;
  return { board: section("The board", boardHtml), roadmap: section("The roadmap", roadmapHtml), decisions: section("The decisions", decisionsHtml) };
}

export async function render(root, who) {
  root.innerHTML = `<div class="staff-nav"><div class="tabs hub-tabs staff-tabs" role="tablist" aria-label="Team dashboard"><span class="tab-pill" aria-hidden="true"></span>${TABS.map(([id, label]) => `<button type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}">${label}<span class="tab-count" data-count="${id}"></span></button>`).join("")}</div><a class="staff-help-link" href="/staff/help">How this works</a></div>
    ${TABS.map(([id]) => `<div class="hub-panel" role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}"></div>`).join("")}`;
  const tabs = root.querySelector("[role=tablist]");
  const panel = (id) => root.querySelector(`#panel-${id}`);
  const draw = () => {
    const html = teamPanels(data);
    for (const id of ["board", "roadmap", "decisions"]) panel(id).innerHTML = html[id];
  };
  // The Inbox: what needs this member now, from the applications, the Team kanban and the decisions log.
  const drawInbox = async () => {
    const apps = (await fetchApplications("team")).applications;
    const html = section("The Inbox", () => inboxHtml({ apps, cards: data.cards, decisions: data.decisions, me: who?.user, names: [who?.name, data.people?.[who?.user]] }));
    panel("inbox").innerHTML = html;
    const n = inboxCount(html);
    root.querySelector('[data-count="inbox"]').textContent = n ? String(n) : "";
    placePill(tabs);
  };
  const reload = async () => {
    data = await api("GET", "team/overview");
    draw();
    if (panel("inbox").dataset.ready) drawInbox();
  };
  const select = (id) => {
    const opened = !panel(id).classList.contains("is-active");
    for (const [t] of TABS) {
      const on = t === id;
      root.querySelector(`#tab-${t}`).setAttribute("aria-selected", String(on));
      root.querySelector(`#tab-${t}`).tabIndex = on ? 0 : -1;
      panel(t).classList.toggle("is-active", on);
    }
    placePill(tabs);
    // Stats and Data load when first opened: Kira counts from GitHub for them.
    if (id === "stats" && !panel("stats").dataset.loaded) { panel("stats").dataset.loaded = "1"; renderStats(panel("stats")); }
    if (id === "data" && opened) renderData(panel("data"), () => data); // fresh tables each time it is opened
    if (!location.hash.startsWith(`#${id}`) && !(id === "applications" && location.hash.startsWith("#application-"))) history.replaceState(null, "", `#${id}`);
  };
  tabs.addEventListener("click", (e) => {
    const b = e.target.closest("[role=tab]");
    if (b) select(b.id.slice(4));
  });
  await reload();
  const applications = await renderApplications(panel("applications"), "team", data.people, drawInbox);
  wireInbox(panel("inbox"), "team", async () => { await applications.reload(); await drawInbox(); });
  panel("inbox").dataset.ready = "1";
  await drawInbox();
  // A link to a tab or to an application (#applications, #application-<id>, as in Kira's DMs) opens it, also when
  // the dashboard is already open.
  const fromHash = () => {
    const id = location.hash.slice(1).replace(/^application-.*/, "applications").replace(/^data-.*/, "data").replace(/^inbox-.*/, "inbox");
    select(TABS.some(([t]) => t === id) ? id : "inbox");
    const target = /^#(application|inbox)-/.test(location.hash) && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) {
      target.closest("details")?.setAttribute("open", "");
      target.scrollIntoView({ block: "start" });
    }
  };
  fromHash();
  addEventListener("hashchange", fromHash);

  // Every form and button of the panels: one listener each, by data attribute.
  root.addEventListener("submit", async (e) => {
    const form = e.target;
    const kind = ["addCard", "cardForm", "itemForm", "noteForm", "decisionForm"].find((k) => k in form.dataset);
    if (!kind) return;
    e.preventDefault();
    const out = form.querySelector("[data-status]");
    out.textContent = "Saving…";
    const v = values(form);
    try {
      if (kind === "addCard") await api("POST", "team/cards", { action: "save", ...v });
      if (kind === "cardForm") await api("POST", "team/cards", { action: "save", ...v, id: form.dataset.cardForm });
      if (kind === "itemForm") await api("POST", "team/roadmap", { action: "save", ...v, id: form.dataset.itemForm || undefined });
      if (kind === "noteForm") await api("POST", "team/roadmap", { action: "note", id: form.dataset.noteForm, ...v });
      if (kind === "decisionForm") await api("POST", "team/decisions", { ...v, id: form.dataset.decisionForm || undefined });
      await reload();
    } catch (err) {
      out.textContent = err.message;
    }
  });
  root.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-move], [data-delete-card], [data-delete-item], [data-publish], [data-withdraw], [data-copy]");
    if (!b || b.closest("[data-staff-apps]")) return;
    const out = b.parentElement.querySelector("[data-status]");
    try {
      if (b.dataset.move) await api("POST", "team/cards", { action: "move", id: b.dataset.move, column: b.dataset.to });
      else if (b.dataset.deleteCard) { if (!confirm("Delete this card?")) return; await api("POST", "team/cards", { action: "delete", id: b.dataset.deleteCard }); }
      else if (b.dataset.deleteItem) { if (!confirm("Delete this Team-only item?")) return; await api("POST", "team/roadmap", { action: "delete", id: b.dataset.deleteItem }); }
      else if (b.dataset.withdraw) { if (!confirm("Withdraw this decision? It stays listed as withdrawn.")) return; await api("POST", "team/decisions", { id: b.dataset.withdraw, withdraw: true }); }
      else if (b.dataset.copy) { await navigator.clipboard.writeText(b.closest("[data-snippet]").querySelector("pre").textContent); b.textContent = "Copied"; return; }
      else if (b.dataset.publish) {
        const p = await api("POST", "team/roadmap", { action: "publish", id: b.dataset.publish });
        b.closest(".staff-item").querySelector("[data-snippet]").innerHTML = `<div class="staff-snippet"><p>Add this to <code>${escape(p.file)}</code> in a pull request to horizon (then <code>${escape(p.then)}</code>). Until it merges the item stays Team-only.</p><pre><code>${escape(p.snippet)}</code></pre><p><button type="button" class="button secondary small" data-copy>Copy</button><a class="button ghost small" href="${escape(p.edit)}">Edit roadmap.toml on GitHub</a></p></div>`;
        return;
      }
      await reload();
    } catch (err) {
      if (out) out.textContent = err.message;
      else alert(err.message);
    }
  });
  addEventListener("resize", () => placePill(tabs));
}
