// The Stats page: the live count (GET /v1/live) and two histories from the telemetry server (GET /v1/live/history):
// every game's "I'm playing" ping (`players`) and the official server's status (`official`). All asked again every
// minute while the page is visible. The charts are drawn by stats.js; this file fills the tiles and moves each chart's
// cursor (pointer and arrow keys). The range tabs set both charts.
import { setUpMenu, setUpTheme } from "./chrome.js";
import { chartSvg, escape, fmt, formats, midnight, nearest, peakSince, platformSplit, scales, tableHtml, titleOf, W } from "./stats.js";

// The telemetry server: build.mjs bakes HUB_API_URL in (a local one to try the page), else the real one.
const TELEMETRY = document.getElementById("main").dataset.api || "https://telemetry.playhorizon.dev";
const $ = (s) => document.querySelector(s);
const stat = (name) => $(`[data-stat="${name}"]`);
const buttons = [...document.querySelectorAll("[data-range]")];
// One per figure: its series, the history drawn (`shown`, with the width it was drawn at) and as it came (`raw`).
const charts = [...document.querySelectorAll("[data-chart-root]")].map((root) => ({ root, source: root.dataset.chartRoot, shown: null, raw: null }));
let range = "24h";

async function getJson(path) {
  const res = await fetch(`${TELEMETRY}${path}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

const history = (r, source) => getJson(`/v1/live/history?range=${r}&series=${source}`);
const nowSeconds = () => Date.now() / 1000;

async function updateNow() {
  try {
    const now = await getJson("/v1/live");
    stat("players-now").textContent = fmt(now.playing);
    stat("players-now-note").textContent = `Updated ${formats("24h").time(nowSeconds())}, again every minute`;
    stat("lan").textContent = fmt(now.lan);
    stat("lan-note").textContent = now.playing ? `${Math.round((now.lan / now.playing) * 100)}% of those playing` : "";
    const split = platformSplit(now.platforms);
    $("[data-platforms]").innerHTML =
      split.map((p) => `<li><span class="rank-name">${escape(p.name)}</span><span class="rank-bar"><i class="chart-s1" data-w="${Math.round(p.share * 100)}"></i></span><span class="rank-value">${fmt(p.count)} <span class="meta">${Math.round(p.share * 100)}%</span></span></li>`).join("") ||
      `<li class="empty">Nobody is playing right now.</li>`;
    // The Content-Security-Policy blocks style attributes, so widths go through the CSSOM.
    document.querySelectorAll("[data-platforms] [data-w]").forEach((i) => (i.style.width = `${i.dataset.w}%`));
  } catch {
    stat("players-now-note").textContent = "The server doesn't answer right now.";
    $("[data-platforms]").innerHTML = `<li class="empty">The server doesn't answer right now.</li>`;
  }
}

// A series' tiles from its 24-hour history: today's peak (the reader's day), the all-time peak and, for the official
// server, its newest minute (none when it hasn't answered for 5 minutes).
function updatePeaks(source, day) {
  const f = formats("24h");
  const today = peakSince(day, midnight(nowSeconds()));
  stat(`${source}-today`).textContent = today ? fmt(today.playing) : "–";
  stat(`${source}-today-note`).textContent = today ? `at ${f.time(today.at)}` : "No sample yet today";
  stat(`${source}-ever`).textContent = day.all_time ? fmt(day.all_time.playing) : "–";
  stat(`${source}-ever-note`).textContent = day.all_time ? `on ${f.moment(day.all_time.at)}` : "";
  if (source === "official") {
    const fresh = day.latest && nowSeconds() - day.latest.at < 300;
    stat("official-now").textContent = fresh ? fmt(day.latest.playing) : "–";
    stat("official-now-note").textContent = fresh ? `At ${f.time(day.latest.at)}, again every minute` : day.latest ? `Not answering since ${f.time(day.latest.at)}` : "Not answering right now";
  }
}

const q = (c, s) => c.root.querySelector(s);

function draw(c, h) {
  c.raw = h;
  // Drawn at the plot's own width, so the axis text keeps its size on a phone.
  const width = q(c, "[data-chart]").clientWidth;
  c.shown = { ...h, w: width ? Math.max(320, Math.min(W, Math.round(width))) : W };
  const f = formats(h.range);
  q(c, "[data-chart-title]").textContent = titleOf(h);
  q(c, "[data-chart-peak]").textContent = h.peak ? `Peak ${fmt(h.peak.playing)} on ${f.moment(h.peak.at)}` : "";
  q(c, "[data-chart]").innerHTML = h.series.length ? chartSvg(c.shown) : `<p class="empty">No samples in this range yet: the history began on 31 October 2026.</p>`;
  q(c, "[data-chart-table]").innerHTML = tableHtml(h);
  q(c, "[data-chart-tip]").hidden = true;
  setUpCursor(c);
}

async function updateChart(c) {
  try {
    const asked = range;
    const [h, day] = await Promise.all([history(asked, c.source), asked === "24h" ? null : history("24h", c.source)]);
    if (asked !== range) return; // another tab was picked meanwhile
    draw(c, h);
    updatePeaks(c.source, day || h);
  } catch {
    q(c, "[data-chart]").innerHTML = `<p class="empty">The history isn't available right now.</p>`;
  }
}

const updateCharts = () => charts.forEach(updateChart);

// The cursor: the point under the pointer, or the one picked with the arrow keys, with its figures in the tooltip.
function setUpCursor(c) {
  const svg = q(c, "[data-stats-chart]");
  if (!svg) return;
  const h = c.shown;
  const cursor = svg.querySelector("[data-stats-cursor]");
  const tip = q(c, "[data-chart-tip]");
  const status = q(c, "[data-chart-status]");
  const f = formats(h.range);
  let index = -1;
  const show = (i, announce) => {
    if (i < 0 || i >= h.series.length) return;
    index = i;
    const [t, avg, peak] = h.series[i];
    const { x, y } = scales(h);
    const cx = x(t);
    cursor.toggleAttribute("hidden", false);
    cursor.querySelector("line").setAttribute("x1", cx);
    cursor.querySelector("line").setAttribute("x2", cx);
    const [dotPeak, dotAvg] = cursor.querySelectorAll("circle");
    dotPeak.setAttribute("cx", cx);
    dotPeak.setAttribute("cy", y(peak));
    dotAvg.setAttribute("cx", cx);
    dotAvg.setAttribute("cy", y(avg));
    tip.innerHTML = `<strong>${escape(f.point(t))}</strong><span>Highest <b>${fmt(peak)}</b></span><span>Average <b>${fmt(avg)}</b></span>`;
    tip.hidden = false;
    // Beside the cursor, kept inside the chart.
    const box = svg.getBoundingClientRect();
    const figure = tip.parentElement.getBoundingClientRect();
    const px = (cx / h.w) * box.width + box.left - figure.left;
    tip.classList.toggle("is-left", px > figure.width / 2);
    tip.style.setProperty("--x", `${px}px`);
    tip.style.setProperty("--y", `${box.top - figure.top + 8}px`);
    if (announce) status.textContent = `${f.point(t)}: highest ${fmt(peak)}, average ${fmt(avg)}`;
  };
  const hide = () => {
    cursor.toggleAttribute("hidden", true);
    tip.hidden = true;
  };
  svg.addEventListener("pointermove", (e) => {
    const box = svg.getBoundingClientRect();
    show(nearest(h, ((e.clientX - box.left) / box.width) * h.w), false);
  });
  svg.addEventListener("pointerleave", hide);
  svg.addEventListener("blur", hide);
  svg.addEventListener("focus", () => show(index < 0 ? h.series.length - 1 : index, true));
  svg.addEventListener("keydown", (e) => {
    const last = h.series.length - 1;
    const to = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: last }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    show(Math.max(0, Math.min(last, to)), true);
  });
}

for (const b of buttons) {
  b.addEventListener("click", () => {
    range = b.dataset.range;
    buttons.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    for (const c of charts) q(c, "[data-chart]").innerHTML = `<p class="empty">Loading…</p>`;
    updateCharts();
  });
}

let resizing;
addEventListener("resize", () => {
  clearTimeout(resizing);
  resizing = setTimeout(() => {
    for (const c of charts) if (c.raw && Math.abs(q(c, "[data-chart]").clientWidth - c.shown.w) > 8) draw(c, c.raw);
  }, 150);
});

setUpTheme();
setUpMenu();
updateNow();
updateCharts();
setInterval(() => {
  if (document.visibilityState !== "visible") return;
  updateNow();
  updateCharts();
}, 60_000);
