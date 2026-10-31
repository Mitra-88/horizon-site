// The Stats page's parts that need no page: the chart's SVG, its table, the axis ticks and the peaks, from the
// telemetry server's GET /v1/live/history (crates/horizon-telemetry-server/src/history.rs in the game's repository):
// { range, step, from, to, series: [[start, average, highest], …], peak: { playing, at }, all_time, platforms }.
// Times are Unix seconds. Labels follow the reader's time zone, or `timeZone` (the tests use UTC).

export const W = 800, H = 280, LEFT = 52, RIGHT = 12, TOP = 14, BOTTOM = 30;
const HOUR = 3600, DAY = 86400;

export const RANGES = {
  "24h": { span: "over the last 24 hours", point: "5 minutes" },
  "7d": { span: "over the last 7 days", point: "hour" },
  "30d": { span: "over the last 30 days", point: "3 hours" },
  all: { span: "since the count began", point: "day" },
};

// The chart's title: `source` is the series, "players" (every game's ping) or "official" (the official server).
export const titleOf = (h) => `${h.source === "official" ? "On the official server" : "Players"} ${RANGES[h.range].span}`;

export const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// Whole counts with thousands separators; averages with one decimal at most.
export const fmt = (n) => (n == null ? "–" : Number(n).toLocaleString("en", { maximumFractionDigits: 1 }));

// A round top for the axis: 1, 2, 2.5 or 5 times a power of ten, at or above the largest value (at least 5).
export function niceMax(v) {
  if (!(v > 5)) return 5;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v);
}

// Date and time formats for a range, in `timeZone` (undefined: the reader's).
export function formats(range, timeZone) {
  const f = (o) => new Intl.DateTimeFormat("en-GB", { timeZone, ...o });
  const time = f({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const weekday = f({ weekday: "short", day: "numeric" });
  const day = f({ day: "numeric", month: "short" });
  const month = f({ month: "short", year: "numeric" });
  const full = f({ weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const fullTime = f({ weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const ms = (t) => new Date(t * 1000);
  return {
    // Under the axis.
    tick: (t, span) => (range === "24h" ? time : range === "7d" ? weekday : span > 400 * DAY ? month : day).format(ms(t)),
    // A point in the tooltip and the table.
    point: (t) => (range === "all" ? full : fullTime).format(ms(t)),
    // A peak's moment.
    moment: (t) => fullTime.format(ms(t)),
    date: (t) => full.format(ms(t)),
    time: (t) => time.format(ms(t)),
  };
}

// The seconds `timeZone` is ahead of UTC at `t` (undefined: the reader's).
export function offsetAt(t, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" })
      .formatToParts(new Date(t * 1000))
      .map((p) => [p.type, p.value]),
  );
  const local = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second) / 1000;
  return local - t;
}

// The span the chart shows: the range's, or for "all" from the first point.
export function span(h) {
  const first = h.series.length ? h.series[0][0] : h.to - DAY;
  const from = h.range === "all" ? Math.min(first, h.to - DAY) : h.from;
  return { from, to: Math.max(h.to, from + h.step) };
}

// Ticks on whole local hours or days: every 3 hours for 24h, every day for 7d, every 5 days for 30d, and for all
// the smallest of a day, a week, 30, 91 or 365 days that gives at most 7.
export function ticks(h, timeZone) {
  const { from, to } = span(h);
  const length = to - from;
  const narrow = (h.w || W) < 560 ? 2 : 1;
  const every = narrow * (h.range === "24h" ? 3 * HOUR : h.range === "7d" ? DAY : h.range === "30d" ? 5 * DAY : 0) || [DAY, 7 * DAY, 30 * DAY, 91 * DAY, 365 * DAY].find((s) => length / s <= 7 / narrow) || 365 * DAY;
  const off = offsetAt(to, timeZone);
  const out = [];
  for (let t = Math.ceil((from + off) / every) * every - off; t <= to; t += every) out.push(t);
  return out;
}

// The series split where points are missing (the server was down): no line across a gap.
export function segments(series, step) {
  const out = [];
  for (const p of series) {
    const last = out.at(-1);
    if (last && p[0] - last.at(-1)[0] <= 2 * step) last.push(p);
    else out.push([p]);
  }
  return out;
}

// `h.w`: the chart's width in pixels when the page knows it (so text keeps its size on a phone), else W.
export function scales(h) {
  const { from, to } = span(h);
  const w = h.w || W;
  const max = niceMax(Math.max(0, ...h.series.map((p) => p[2])));
  // A point is drawn at its middle, so the newest one isn't at the edge.
  const x = (t) => LEFT + ((Math.min(t + h.step / 2, to) - from) / (to - from)) * (w - LEFT - RIGHT);
  const y = (v) => TOP + (H - TOP - BOTTOM) * (1 - v / max);
  return { from, to, max, x, y };
}

const r1 = (n) => Math.round(n * 10) / 10;

// The chart: the highest count per point as an area, the average as a line, one y axis from 0. The cursor (a line and
// a dot) is moved by the page.
export function chartSvg(h, timeZone) {
  const f = formats(h.range, timeZone);
  const { from, to, max, x, y } = scales(h);
  const w = h.w || W;
  const grid = [0, max / 2, max].map((v) => `<line x1="${LEFT}" x2="${w - RIGHT}" y1="${r1(y(v))}" y2="${r1(y(v))}"/><text x="${LEFT - 8}" y="${r1(y(v)) + 4}" text-anchor="end">${fmt(v)}</text>`).join("");
  const labels = ticks(h, timeZone)
    .map((t) => {
      const tx = r1(LEFT + ((t - from) / (to - from)) * (w - LEFT - RIGHT));
      return `<line class="chart-tick" x1="${tx}" x2="${tx}" y1="${H - BOTTOM}" y2="${H - BOTTOM + 4}"/><text x="${tx}" y="${H - 8}" text-anchor="middle">${escape(f.tick(t, to - from))}</text>`;
    })
    .join("");
  const parts = segments(h.series, h.step);
  const area = parts
    .map((s) => {
      const pts = s.length === 1 ? [[s[0][0] - h.step / 2, ...s[0].slice(1)], [s[0][0] + h.step / 2, ...s[0].slice(1)]] : s;
      return `M${r1(x(pts[0][0]))},${r1(y(0))}` + pts.map((p) => `L${r1(x(p[0]))},${r1(y(p[2]))}`).join("") + `L${r1(x(pts.at(-1)[0]))},${r1(y(0))}Z`;
    })
    .join("");
  const line = (k) =>
    parts
      .map((s) => s.map((p, i) => `${i ? "L" : "M"}${r1(x(p[0]))},${r1(y(p[k]))}`).join(""))
      .join("");
  const title = titleOf(h);
  return `<svg viewBox="0 0 ${w} ${H}" role="img" aria-label="${escape(title)}: the highest count per ${RANGES[h.range].point} and the average. The table below lists every point." tabindex="0" data-stats-chart>
      <g class="chart-axis">${grid}<line x1="${LEFT}" x2="${w - RIGHT}" y1="${r1(y(0))}" y2="${r1(y(0))}"/>${labels}</g>
      <path class="stats-area" d="${area}"/>
      <path class="stats-peak" d="${line(2)}"/>
      <path class="stats-avg" d="${line(1)}"/>
      <g class="stats-cursor" data-stats-cursor hidden><line x1="0" x2="0" y1="${TOP}" y2="${H - BOTTOM}"/><circle class="stats-dot-peak" r="4"/><circle class="stats-dot-avg" r="3"/></g>
    </svg>`;
}

// Every point as a table row, newest first: the chart's text view.
export function tableHtml(h, timeZone) {
  const f = formats(h.range, timeZone);
  const rows = [...h.series].reverse().map(([t, avg, peak]) => `<tr><td>${escape(f.point(t))}</td><td class="num">${fmt(peak)}</td><td class="num">${fmt(avg)}</td></tr>`).join("");
  return `<table class="staff-table stats-table"><caption class="meta">One row per ${RANGES[h.range].point}, newest first, in your time zone.</caption><thead><tr><th scope="col">From</th><th scope="col">Highest</th><th scope="col">Average</th></tr></thead><tbody>${rows || `<tr><td colspan="3">No samples in this range yet.</td></tr>`}</tbody></table>`;
}

// The point nearest to the chart's x coordinate `px` (in viewBox units).
export function nearest(h, px) {
  if (!h.series.length) return -1;
  const { x } = scales(h);
  let best = 0;
  h.series.forEach((p, i) => {
    if (Math.abs(x(p[0]) - px) < Math.abs(x(h.series[best][0]) - px)) best = i;
  });
  return best;
}

// The highest count since `midnight` (the reader's) in the 24-hour history: { playing, at }, the exact minute when the
// day's highest is the 24 hours' peak, else the start of its 5 minutes.
export function peakSince(day, midnight) {
  let best = null;
  for (const [t, , peak] of day.series) if (t + day.step > midnight && (!best || peak > best.playing)) best = { playing: peak, at: Math.max(t, midnight) };
  if (best && day.peak && day.peak.at >= midnight && day.peak.playing === best.playing) best = { ...day.peak };
  return best;
}

// Local midnight before `now` (Unix seconds) in `timeZone`.
export function midnight(now, timeZone) {
  const off = offsetAt(now, timeZone);
  return Math.floor((now + off) / DAY) * DAY - off;
}

// The platforms' split: [{ name, count, share }], largest first.
export function platformSplit(platforms) {
  const names = { linux: "Linux", macos: "macOS", windows: "Windows", other: "Other" };
  const entries = Object.entries(platforms || {}).filter(([, n]) => n > 0);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  return entries.sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ name: names[k] || k, count: n, share: total ? n / total : 0 }));
}
