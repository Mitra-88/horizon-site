// The Team dashboard's Stats and Data tabs, from Kira's team/stats (GitHub counts over 12 weeks, Discord counters:
// counts only) and team/overview. Charts are inline SVG: one y axis each, a legend for two series, a hover title on
// every bar and the numbers in a table under each chart. Data lists the same facts as tables, exportable as CSV or JSON.
import { api, escape, when, relative } from "./staff-api.js";

const fmt = (n) => (n == null ? "–" : Number.isInteger(n) ? n.toLocaleString("en") : n.toLocaleString("en", { maximumFractionDigits: 1 }));
const day = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en", { day: "numeric", month: "short", timeZone: "UTC" });

// A round top for the axis: 1, 2 or 5 times a power of ten, at or above the largest value.
function niceMax(v) {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map((m) => m * p).find((m) => m >= v);
}

// Bars per week. series: [{ name, values }] (one or two, colors in that order); unit: what a value counts.
function barChart(title, weeks, series, unit = "") {
  const W = 640, H = 200, left = 40, bottom = 24, top = 8;
  const max = niceMax(Math.max(...series.flatMap((s) => s.values.filter((v) => v != null))));
  const y = (v) => top + (H - top - bottom) * (1 - v / max);
  const slot = (W - left) / weeks.length;
  const bar = Math.min(18, (slot - 8 - 2 * (series.length - 1)) / series.length);
  const grid = [0, max / 2, max].map((v) => `<line x1="${left}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text x="${left - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`).join("");
  const marks = weeks.map((w, i) => {
    const x0 = left + i * slot + (slot - (bar * series.length + 2 * (series.length - 1))) / 2;
    const tip = `Week of ${day(w)}: ${series.map((s) => `${s.name} ${fmt(s.values[i])}${unit}`).join(", ")}`;
    const rects = series.map((s, k) => {
      const v = s.values[i];
      if (v == null || v === 0) return "";
      const h = Math.max(2, y(0) - y(v));
      return `<rect class="chart-s${k + 1}" x="${x0 + k * (bar + 2)}" y="${y(0) - h}" width="${bar}" height="${h}" rx="2"/>`;
    }).join("");
    const label = i % 2 === weeks.length % 2 ? "" : `<text x="${left + i * slot + slot / 2}" y="${H - 6}" text-anchor="middle">${day(w)}</text>`;
    return `<g class="chart-hit"><title>${escape(tip)}</title><rect class="chart-target" x="${left + i * slot}" y="${top}" width="${slot}" height="${H - top - bottom}"/>${rects}${label}</g>`;
  }).join("");
  const legend = series.length > 1 ? `<p class="chart-legend">${series.map((s, k) => `<span><i class="chart-key chart-s${k + 1}"></i>${escape(s.name)}</span>`).join("")}</p>` : "";
  const table = `<details><summary class="meta">Table</summary><table class="staff-table"><thead><tr><th>Week of</th>${series.map((s) => `<th>${escape(s.name)}</th>`).join("")}</tr></thead><tbody>${weeks.map((w, i) => `<tr><td>${day(w)}</td>${series.map((s) => `<td>${fmt(s.values[i])}</td>`).join("")}</tr>`).join("")}</tbody></table></details>`;
  return `<figure class="chart"><figcaption class="chart-title">${escape(title)}</figcaption>${legend}
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(title)}"><g class="chart-axis">${grid}</g>${marks}</svg>${table}</figure>`;
}

// Horizontal bars for a few named counts (bugs by source or area).
function rankChart(title, entries) {
  const max = Math.max(1, ...entries.map(([, v]) => v));
  const rows = entries.map(([name, v]) => `<li><span class="rank-name">${escape(name)}</span><span class="rank-bar"><i class="chart-s1" data-w="${Math.round((v / max) * 100)}"></i></span><span class="rank-value">${fmt(v)}</span></li>`).join("");
  return `<figure class="chart"><figcaption class="chart-title">${escape(title)}</figcaption><ul class="rank">${rows || `<li class="empty">None.</li>`}</ul></figure>`;
}

const tile = (value, label, note = "") => `<div class="stat-tile"><span class="stat-value">${value}</span><span class="stat-label">${label}</span>${note ? `<span class="meta">${note}</span>` : ""}</div>`;

function statsHtml(s) {
  const w = s.weeks.map((x) => x.week);
  const pr = s.openPullRequests;
  const sources = Object.entries(s.bugs.bySource).map(([k, v]) => [{ discord: "From Discord", website: "From the website", github: "On GitHub" }[k] || k, v]);
  const areas = Object.entries(s.bugs.byArea).sort((a, b) => b[1] - a[1]);
  return `<p class="hub-intro">GitHub counts for horizon-rust/horizon over the last 12 weeks, and Discord counters (counts only, no messages). Updated ${relative(Date.parse(s.generatedAt))}.</p>
    <div class="stat-tiles">
      ${tile(fmt(pr.ready), "pull requests ready for review", `${fmt(pr.drafts)} drafts${pr.oldestReadyDays != null ? ` · oldest ${pr.oldestReadyDays} d` : ""}`)}
      ${tile(`${fmt(pr.ci.passing)} / ${fmt(pr.ci.failing)}`, "CI passing / failing", `${fmt(pr.ci.pending)} running, ${fmt(pr.ci.none)} without CI`)}
      ${tile(fmt(s.bugs.open), "open bugs", `${fmt(s.bugs.crucial)} crucial · ${fmt(s.bugs.openIssues)} open issues`)}
      ${tile(s.releases.lastGame ? relative(Date.parse(s.releases.lastGame)) : "–", "last game release", s.releases.medianHoursBetweenGame != null ? `median ${fmt(s.releases.medianHoursBetweenGame)} h between releases` : "")}
    </div>
    <div class="chart-grid">
      ${barChart("Pull requests per week", w, [{ name: "Opened", values: s.weeks.map((x) => x.opened) }, { name: "Merged", values: s.weeks.map((x) => x.merged) }])}
      ${barChart("Median hours to the first review", w, [{ name: "Hours", values: s.weeks.map((x) => x.medianHoursToFirstReview) }], " h")}
      ${barChart("Median hours from opening to merge", w, [{ name: "Hours", values: s.weeks.map((x) => x.medianHoursToMerge) }], " h")}
      ${barChart("Releases per week", w, [{ name: "Game", values: s.releases.gamePerWeek }, { name: "Launcher", values: s.releases.launcherPerWeek }])}
      ${barChart("Discord messages per week", w, [{ name: "Messages", values: s.discord.map((x) => x.messages) }])}
      ${barChart("Discord members active per day (weekly average)", w, [{ name: "Members", values: s.discord.map((x) => x.dailyActive) }])}
      ${barChart("Discord joins and leaves per week", w, [{ name: "Joins", values: s.discord.map((x) => x.joins) }, { name: "Leaves", values: s.discord.map((x) => x.leaves) }])}
      ${rankChart("Open bugs by where they came from", sources)}
      ${areas.length ? rankChart(`Open bugs by area (${fmt(s.bugs.noArea)} without an area label)`, areas) : ""}
    </div>`;
}

// ── Data: tables of what the dashboard knows, each one exportable ─────────────

const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

function datasets(o, s) {
  const name = (id) => (id ? o.people[id] || id : "");
  const sets = [
    { id: "cards", title: "Team kanban", rows: Object.values(o.cards).flat().map((c) => ({ title: c.title, column: c.column, owner: name(c.owner), link: c.link || "", note: c.note || "", updated: new Date(c.updatedAt).toISOString() })) },
    { id: "team-items", title: "Team-only roadmap items", rows: o.roadmap.team.map((i) => ({ id: i.id, title: i.title, status: i.status, area: i.area, owner: name(i.owner), publishAsked: i.publishRequested ? new Date(i.publishRequested.at).toISOString() : "", note: i.note || "" })) },
    { id: "team-notes", title: "Team notes on public roadmap items", rows: o.roadmap.public.filter((i) => i.team).map((i) => ({ id: i.id, title: i.title, status: i.status, priority: i.team.priority || "", owner: name(i.team.owner), note: i.team.note || "" })) },
    { id: "decisions", title: "Decisions", rows: o.decisions.map((d) => ({ date: new Date(d.at).toISOString(), by: name(d.by), title: d.title, status: d.status, link: d.link || "", item: d.item || "", edits: d.history.length })) },
  ];
  if (s) {
    sets.push(
      { id: "roadmap-progress", title: "Roadmap items: pull requests labelled for them", rows: s.roadmap.map((i) => ({ id: i.id, title: i.title, status: i.status, merged: i.merged, open: i.open })) },
      { id: "contributors", title: "Contributors, last 12 weeks (GitHub)", rows: s.people.map((p) => ({ login: p.login, opened: p.opened, merged: p.merged })) },
      { id: "weeks", title: "Weekly numbers", rows: s.weeks.map((x, i) => ({ week: x.week, opened: x.opened, merged: x.merged, medianHoursToFirstReview: r1(x.medianHoursToFirstReview), medianHoursToMerge: r1(x.medianHoursToMerge), reviewedPercent: x.reviewedShare, gameReleases: s.releases.gamePerWeek[i], launcherReleases: s.releases.launcherPerWeek[i], discordMessages: s.discord[i].messages, discordDailyActive: s.discord[i].dailyActive, joins: s.discord[i].joins, leaves: s.discord[i].leaves })) },
    );
  }
  return sets;
}

// A spreadsheet runs a cell that starts with = + - @: such text (from Discord or GitHub) gets a leading quote.
const csvCell = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows) => (rows.length ? [Object.keys(rows[0]), ...rows.map(Object.values)].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n" : "");

function download(file, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: file });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function tableHtml(set) {
  const cols = set.rows.length ? Object.keys(set.rows[0]) : [];
  const body = set.rows.map((r) => `<tr>${cols.map((c) => `<td>${escape(r[c] == null ? "" : String(r[c]))}</td>`).join("")}</tr>`).join("");
  return `<section class="hub-block staff-data" id="data-${set.id}">
    <div class="staff-data-head"><h2 class="title">${escape(set.title)} <span class="hub-count">${set.rows.length}</span></h2>
      <p class="staff-card-actions"><button type="button" class="button secondary small" data-export="${set.id}" data-format="csv">CSV</button><button type="button" class="button ghost small" data-export="${set.id}" data-format="json">JSON</button></p></div>
    ${set.rows.length ? `<div class="staff-table-wrap"><table class="staff-table"><thead><tr>${cols.map((c) => `<th>${escape(c)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>` : `<p class="empty">Nothing yet.</p>`}
  </section>`;
}

// ── Loading: team/stats answers 503 while Kira counts from GitHub after a restart ──

let stats = null;
async function loadStats(root, onReady) {
  if (stats) return stats;
  try {
    stats = await api("GET", "team/stats");
    return stats;
  } catch (e) {
    root.innerHTML = `<p class="lede">${escape(e.message)}</p>${e.status === 503 ? `<p><button type="button" class="button secondary small" data-retry>Try again</button></p>` : ""}`;
    root.querySelector("[data-retry]")?.addEventListener("click", onReady);
    return null;
  }
}

export async function renderStats(root) {
  const go = async () => {
    const s = await loadStats(root, go);
    if (!s) return;
    root.innerHTML = statsHtml(s);
    // Bar lengths through the CSSOM: the page's CSP refuses style attributes in markup.
    for (const i of root.querySelectorAll(".rank-bar i")) i.style.width = `${i.dataset.w}%`;
  };
  await go();
}

export async function renderData(root, overview) {
  const go = async () => {
    const s = await loadStats(root, go).catch(() => null);
    const sets = datasets(overview(), s);
    root.innerHTML = `<p class="hub-intro">What this dashboard holds and counts, as tables. Each exports as CSV (cells that start with = + - @ get a leading quote, so a spreadsheet never runs them) or JSON. Generated ${escape(when(Date.now()))}.${s ? "" : " The GitHub tables come once Kira has counted."}</p>
      <nav class="staff-data-nav meta">${sets.map((x) => `<a href="#data-${x.id}">${escape(x.title)}</a>`).join(" · ")}</nav>
      ${sets.map(tableHtml).join("")}`;
    root.onclick = (e) => {
      const b = e.target.closest("[data-export]");
      if (!b) return;
      const set = datasets(overview(), s).find((x) => x.id === b.dataset.export);
      const stamp = new Date().toISOString().slice(0, 10);
      if (b.dataset.format === "csv") download(`horizon-${set.id}-${stamp}.csv`, toCsv(set.rows), "text/csv");
      else download(`horizon-${set.id}-${stamp}.json`, JSON.stringify(set.rows, null, 2), "application/json");
    };
  };
  await go();
}
