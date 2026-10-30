// The Moderation dashboard (/staff/mod): Mod and Support applications, and the moderation counters (reports, mod-mail,
// warns, timeouts, kicks, bans, AutoMod, joins and leaves; counts only) from Kira's mod/stats. Nothing of the Team's.
import { api, escape, placePill } from "./staff-api.js";
import { renderApplications, fetchApplications } from "./staff-apps.js";
import { inboxHtml, inboxCount, wireInbox } from "./staff-inbox.js";
import { barChart, tile, tableHtml, download, fmt, toCsv } from "./staff-stats.js";

const TABS = [["inbox", "Inbox"], ["applications", "Applications"], ["stats", "Stats"]];
const LABELS = { reports: "Reports", modmail: "Mod-mail threads", warns: "Warnings", timeouts: "Timeouts", kicks: "Kicks", bans: "Bans", automod: "AutoMod actions", joins: "Joins", leaves: "Leaves" };
const day = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function statsHtml(s) {
  const w = s.weeks.map((x) => x.week);
  const col = (k) => s.weeks.map((x) => x[k]);
  const a = s.applications;
  return `<p class="hub-intro">Kira's daily counters: counts only, nothing of what was said.${s.countingSince ? ` Counting since ${day(s.countingSince)}.` : " Counting starts with the next event."}</p>
    <div class="stat-tiles">
      ${tile(fmt(s.last7.reports), "reports, last 7 days", `${fmt(s.last30.reports)} in 30 days`)}
      ${tile(fmt(s.last7.modmail), "mod-mail threads, last 7 days", `${fmt(s.last30.modmail)} in 30 days`)}
      ${tile(`${fmt(s.last7.warns)} / ${fmt(s.last7.timeouts)}`, "warnings / timeouts, last 7 days", `${fmt(s.last30.warns)} / ${fmt(s.last30.timeouts)} in 30 days`)}
      ${tile(`${fmt(s.last7.kicks)} / ${fmt(s.last7.bans)}`, "kicks / bans, last 7 days", `${fmt(s.last30.kicks)} / ${fmt(s.last30.bans)} in 30 days`)}
      ${tile(fmt(s.last7.automod), "AutoMod actions, last 7 days", `${fmt(s.last30.automod)} in 30 days`)}
      ${tile(`${fmt(a.open.mod)} / ${fmt(a.open.support)}`, "Mod / Support applications waiting", `${fmt(a.accepted30)} accepted, ${fmt(a.declined30)} declined in 30 days`)}
    </div>
    <div class="chart-grid">
      ${barChart("Reports and mod-mail per week", w, [{ name: "Reports", values: col("reports") }, { name: "Mod-mail", values: col("modmail") }])}
      ${barChart("Warnings and timeouts per week", w, [{ name: "Warnings", values: col("warns") }, { name: "Timeouts", values: col("timeouts") }])}
      ${barChart("Kicks and bans per week", w, [{ name: "Kicks", values: col("kicks") }, { name: "Bans", values: col("bans") }])}
      ${barChart("AutoMod actions per week", w, [{ name: "AutoMod", values: col("automod") }])}
      ${barChart("Joins and leaves per week", w, [{ name: "Joins", values: col("joins") }, { name: "Leaves", values: col("leaves") }])}
    </div>
    ${tableHtml({ id: "moderation-weeks", title: "Weekly numbers", rows: weekRows(s) })}`;
}
const weekRows = (s) => s.weeks.map((x) => ({ week: x.week, ...Object.fromEntries(Object.keys(LABELS).map((k) => [k, x[k]])) }));

export async function render(root, who) {
  root.innerHTML = `<div class="staff-nav"><div class="tabs hub-tabs staff-tabs" role="tablist" aria-label="Moderation dashboard"><span class="tab-pill" aria-hidden="true"></span>${TABS.map(([id, label]) => `<button type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}">${label}<span class="tab-count" data-count="${id}"></span></button>`).join("")}</div><a class="staff-help-link" href="/staff/help">How this works</a></div>
    ${TABS.map(([id]) => `<div class="hub-panel" role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}"></div>`).join("")}`;
  const tabs = root.querySelector("[role=tablist]");
  const panel = (id) => root.querySelector(`#panel-${id}`);
  let stats = null;
  const loadStats = async () => {
    try {
      stats = await api("GET", "mod/stats");
      panel("stats").innerHTML = statsHtml(stats);
    } catch (e) {
      panel("stats").innerHTML = `<p class="lede">${escape(e.message)}</p>`;
    }
  };
  const select = (id) => {
    for (const [t] of TABS) {
      const on = t === id;
      root.querySelector(`#tab-${t}`).setAttribute("aria-selected", String(on));
      root.querySelector(`#tab-${t}`).tabIndex = on ? 0 : -1;
      panel(t).classList.toggle("is-active", on);
    }
    placePill(tabs);
    if (id === "stats" && !stats) loadStats();
    if (!location.hash.startsWith(`#${id}`) && !(id === "applications" && location.hash.startsWith("#application-"))) history.replaceState(null, "", `#${id}`);
  };
  tabs.addEventListener("click", (e) => {
    const b = e.target.closest("[role=tab]");
    if (b) select(b.id.slice(4));
  });
  panel("stats").addEventListener("click", (e) => {
    const b = e.target.closest("[data-export]");
    if (!b || !stats) return;
    const rows = weekRows(stats);
    const stamp = new Date().toISOString().slice(0, 10);
    if (b.dataset.format === "json") download(`horizon-moderation-${stamp}.json`, JSON.stringify(rows, null, 2), "application/json");
    else download(`horizon-moderation-${stamp}.csv`, toCsv(rows), "text/csv");
  });
  const drawInbox = async () => {
    const html = inboxHtml({ apps: (await fetchApplications("mod")).applications, me: who?.user });
    panel("inbox").innerHTML = html;
    const n = inboxCount(html);
    root.querySelector('[data-count="inbox"]').textContent = n ? String(n) : "";
    placePill(tabs);
  };
  const applications = await renderApplications(panel("applications"), "mod", {}, drawInbox);
  wireInbox(panel("inbox"), "mod", async () => { await applications.reload(); await drawInbox(); });
  await drawInbox();
  // A link to a tab or an application (#stats, #application-<id>, as in Kira's DMs) opens it, also once open.
  const fromHash = () => {
    const id = location.hash.slice(1).replace(/^application-.*/, "applications").replace(/^inbox-.*/, "inbox");
    select(TABS.some(([t]) => t === id) ? id : "inbox");
    const target = /^#(application|inbox)-/.test(location.hash) && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) {
      target.closest("details")?.setAttribute("open", "");
      target.scrollIntoView({ block: "start" });
    }
  };
  fromHash();
  addEventListener("hashchange", fromHash);
  addEventListener("resize", () => placePill(tabs));
}
