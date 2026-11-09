"use client";

import { useEffect, useState, useSyncExternalStore, type PointerEvent } from "react";
import type { Messages } from "@/components/i18n";
import { format, formatParts } from "@/components/i18n-text";

type Point = [number, number, number];
type Moment = { playing: number; at: number };
type History = { source: string; range: string; step: number; from: number; to: number; series: Point[]; peak?: Moment | null; all_time?: Moment | null; latest?: Moment | null };
type Live = { playing: number; lan: number; platforms?: Record<string, number> };

type T = Messages["stats"]["live"];
type Range = keyof T["ranges"];

const RANGES: Range[] = ["24h", "7d", "30d", "all"];
const W = 800;
const H = 260;
const LEFT = 48;
const RIGHT = 12;
const TOP = 14;
const BOTTOM = 30;

// Numbers follow the page's language ("en", "es"). Dates and times on the English page follow the reader's own browser;
// a translated page writes them in its language, in the reader's time zone.
const formatter = (locale: string) => (n?: number | null) => (n == null ? "–" : Number(n).toLocaleString(locale, { maximumFractionDigits: 1 }));

function clockIn(locale: string) {
  const l = locale === "en" ? [] : locale;
  return {
    time: (t: number) => new Date(t * 1000).toLocaleTimeString(l, { hour: "2-digit", minute: "2-digit" }),
    moment: (t: number) => new Date(t * 1000).toLocaleString(l, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    date: (t: number) => new Date(t * 1000).toLocaleDateString(l, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    tick(t: number, range: string) {
      const d = new Date(t * 1000);
      if (range === "24h") return d.toLocaleTimeString(l, { hour: "2-digit", minute: "2-digit" });
      if (range === "7d") return d.toLocaleDateString(l, { weekday: "short", day: "numeric" });
      return d.toLocaleDateString(l, { day: "numeric", month: "short" });
    },
  };
}

function niceMax(v: number) {
  if (!(v > 5)) return 5;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v) ?? v;
}

function useJson<T>(url: string, refreshMs: number) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(url, { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(String(r.status)))))
        .then(
          (d) => {
            if (!alive) return;
            setData(d);
            setFailed(false);
          },
          () => alive && setFailed(true),
        );
    load();
    const timer = refreshMs ? window.setInterval(load, refreshMs) : 0;
    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
    };
  }, [url, refreshMs]);
  return { data, failed };
}

function Tile({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="rounded-2xl bg-[#18112c] p-5">
      <span className="block font-display text-[2rem] leading-none font-semibold text-white tabular-nums">{value}</span>
      <span className="mt-2 block text-sm text-white/70">{label}</span>
      {note ? <span className="mt-1 block text-xs text-white/45">{note}</span> : null}
    </div>
  );
}

function peakToday(h: History | null) {
  if (!h) return null;
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const since = midnight.getTime() / 1000;
  let best: Moment | null = null;
  for (const [t, , max] of h.series) if (t >= since && (!best || max > best.playing)) best = { playing: max, at: t };
  return best;
}

function segments(series: Point[], step: number) {
  const out: Point[][] = [];
  for (const p of series) {
    const last = out[out.length - 1];
    if (last && p[0] - last[last.length - 1][0] <= 2 * step) last.push(p);
    else out.push([p]);
  }
  return out;
}

function Chart({ h, title, t, numbers }: { h: History; title: string; t: T; numbers: string }) {
  const fmt = formatter(numbers);
  const { moment, date, tick } = clockIn(numbers);
  const [hover, setHover] = useState<number | null>(null);
  const first = h.series.length ? h.series[0][0] : h.to - 86400;
  const from = h.range === "all" ? Math.min(first, h.to - 86400) : h.from;
  const to = Math.max(h.to, from + h.step);
  const max = niceMax(Math.max(0, ...h.series.map((p) => p[2])));
  const x = (t: number) => LEFT + ((Math.min(t + h.step / 2, to) - from) / (to - from)) * (W - LEFT - RIGHT);
  const y = (v: number) => TOP + (H - TOP - BOTTOM) * (1 - v / max);
  const parts = segments(h.series, h.step);
  const area = parts
    .map((s) => `M${x(s[0][0])},${y(0)}` + s.map((p) => `L${x(p[0])},${y(p[2])}`).join("") + `L${x(s[s.length - 1][0])},${y(0)}Z`)
    .join("");
  const line = parts.map((s) => s.map((p, i) => `${i ? "L" : "M"}${x(p[0])},${y(p[1])}`).join("")).join("");
  const ticks = Array.from({ length: 6 }, (_, i) => from + ((to - from) * i) / 5).slice(1, 5);
  const point = hover != null ? h.series[hover] : null;
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!h.series.length) return;
    const box = e.currentTarget.getBoundingClientRect();
    const t = from + (((e.clientX - box.left) / box.width) * W - LEFT) / (W - LEFT - RIGHT) * (to - from);
    let best = 0;
    for (let i = 1; i < h.series.length; i++) if (Math.abs(h.series[i][0] - t) < Math.abs(h.series[best][0] - t)) best = i;
    setHover(best);
  };
  if (!h.series.length) return <p className="rounded-xl bg-white/[0.03] px-4 py-10 text-center text-sm text-white/50">{t.noSamples}</p>;
  return (
    <figure>
      <p className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-[3px] bg-[#a98fff]/50" />
          {t.highest}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-0.5 w-3 bg-[#8be0b4]" />
          {t.average}
        </span>
        {h.peak ? <span className="text-white/45">{formatParts(t.peak, { n: fmt(h.peak.playing), when: moment(h.peak.at) })}</span> : null}
      </p>
      <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={format(t.chartLabel, { title })}
        className="w-full touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <g className="text-white/40" fill="currentColor">
          {[0, max / 2, max].map((v) => (
            <g key={v}>
              <line x1={LEFT} x2={W - RIGHT} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.25} />
              <text x={LEFT - 8} y={y(v) + 4} textAnchor="end" fontSize={11}>
                {fmt(v)}
              </text>
            </g>
          ))}
          {ticks.map((t) => (
            <text key={t} x={LEFT + ((t - from) / (to - from)) * (W - LEFT - RIGHT)} y={H - 8} textAnchor="middle" fontSize={11}>
              {tick(t, h.range)}
            </text>
          ))}
        </g>
        <path d={area} fill="#a98fff" fillOpacity={0.35} />
        <path d={line} fill="none" stroke="#8be0b4" strokeWidth={1.75} />
        {point && (
          <g>
            <line x1={x(point[0])} x2={x(point[0])} y1={TOP} y2={H - BOTTOM} stroke="white" strokeOpacity={0.35} />
            <circle cx={x(point[0])} cy={y(point[2])} r={4} fill="#a98fff" />
          </g>
        )}
      </svg>
      {point && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-white px-3 py-2 text-[12px] whitespace-nowrap text-[#100a1f]"
          style={{ left: `${(x(point[0]) / W) * 100}%`, top: `calc(${(y(point[2]) / H) * 100}% - 10px)` }}
        >
          <span className="block font-medium">{h.range === "all" ? date(point[0]) : moment(point[0])}</span>
          <span className="block tabular-nums">{formatParts(t.tooltip, { max: fmt(point[2]), avg: fmt(point[1]) })}</span>
        </div>
      )}
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-white/50 hover:text-white">{t.table}</summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-xl bg-white/[0.03]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="text-white/50">
                <th className="px-3 py-2 font-medium">{t.when}</th>
                <th className="px-3 py-2 font-medium">{t.highest}</th>
                <th className="px-3 py-2 font-medium">{t.average}</th>
              </tr>
            </thead>
            <tbody>
              {[...h.series].reverse().map((p) => (
                <tr key={p[0]} className="odd:bg-white/[0.02]">
                  <td className="px-3 py-1.5 text-white/70">{h.range === "all" ? date(p[0]) : moment(p[0])}</td>
                  <td className="px-3 py-1.5 text-white/85 tabular-nums">{fmt(p[2])}</td>
                  <td className="px-3 py-1.5 text-white/85 tabular-nums">{fmt(p[1])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

function HistoryBlock({ series, title, t, numbers }: { series: "players" | "official"; title: string; t: T; numbers: string }) {
  const [range, setRange] = useState<Range>("24h");
  const { data, failed } = useJson<History>(`/api/players?view=history&range=${range}&series=${series}`, range === "24h" ? 60_000 : 300_000);
  const label = format(t.label, { title, span: t.spans[range] });
  return (
    <div className="rounded-2xl bg-[#18112c] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-medium text-white">{label}</h3>
        <div role="group" aria-label={t.showThe} className="flex rounded-lg bg-white/[0.06] p-1">
          {RANGES.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={range === k}
              onClick={() => setRange(k)}
              className={`h-8 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] ${
                range === k ? "bg-white text-[#100a1f]" : "text-white/65 hover:text-white"
              }`}
            >
              {t.ranges[k]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {data && data.range === range ? (
          <Chart h={data} title={label} t={t} numbers={numbers} />
        ) : failed ? (
          <p className="text-sm text-white/55">{t.down}</p>
        ) : (
          <p className="text-sm text-white/45">{t.loading}</p>
        )}
      </div>
    </div>
  );
}

let clock = 0;
let clockTimer = 0;
const clockListeners = new Set<() => void>();

function subscribeClock(onChange: () => void) {
  clockListeners.add(onChange);
  if (!clockTimer) {
    clockTimer = window.setInterval(() => {
      clock = Date.now();
      clockListeners.forEach((f) => f());
    }, 30_000);
  }
  return () => {
    clockListeners.delete(onChange);
    if (!clockListeners.size) {
      window.clearInterval(clockTimer);
      clockTimer = 0;
    }
  };
}

const readClock = () => clock || (clock = Date.now());

function useNow() {
  return useSyncExternalStore(subscribeClock, readClock, () => 0);
}

export function PlayersStats({ t, numberLocale }: { t: T; numberLocale: string }) {
  const fmt = formatter(numberLocale);
  const { time, moment } = clockIn(numberLocale);
  const now0 = useNow();
  const live = useJson<Live>("/api/players?view=live", 60_000);
  const day = useJson<History>("/api/players?view=history&range=24h&series=players", 60_000);
  const official = useJson<History>("/api/players?view=history&range=24h&series=official", 60_000);
  const now = live.data;
  const today = peakToday(day.data);
  const officialToday = peakToday(official.data);
  const latest = official.data?.latest;
  const fresh = latest && now0 / 1000 - latest.at < 300;
  const platforms = Object.entries(now?.platforms ?? {}).sort((a, b) => b[1] - a[1]);
  const total = platforms.reduce((n, [, v]) => n + v, 0);

  return (
    <div className="space-y-12">
      <section aria-labelledby="now-title">
        <h2 id="now-title" className="sr-only">
          {t.nowTitle}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
          <Tile
            value={fmt(now?.playing)}
            label={t.playingNow}
            note={live.failed ? t.down : now ? format(t.updated, { time: time(now0 / 1000) }) : t.asking}
          />
          <Tile value={today ? fmt(today.playing) : "–"} label={t.peakToday} note={today ? format(t.at, { time: time(today.at) }) : day.data ? t.noSampleToday : ""} />
          <Tile
            value={day.data?.all_time ? fmt(day.data.all_time.playing) : "–"}
            label={t.allTime}
            note={day.data?.all_time ? format(t.on, { when: moment(day.data.all_time.at) }) : ""}
          />
          <Tile
            value={fmt(now?.lan)}
            label={t.lan}
            note={now?.playing ? format(t.lanShare, { pct: Math.round((now.lan / now.playing) * 100) }) : ""}
          />
        </div>
        <div className="mt-4 rounded-2xl bg-[#18112c] p-5 sm:p-6">
          <h3 className="text-[15px] font-medium text-white">{t.system}</h3>
          {platforms.length && total ? (
            <ul className="mt-3 space-y-2 text-[13px]">
              {platforms.map(([k, v]) => (
                <li key={k} className="grid grid-cols-[6rem_minmax(0,1fr)_4rem] items-center gap-3">
                  <span className="text-white/70">{t.platforms[k as keyof T["platforms"]] ?? k}</span>
                  <span className="h-2.5 rounded-[3px] bg-white/[0.06]">
                    <i className="block h-full rounded-[3px] bg-[#a98fff]" style={{ width: `${Math.round((v / total) * 100)}%` }} />
                  </span>
                  <span className="text-right text-white/80 tabular-nums">{fmt(v)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-white/50">{live.failed ? t.down : now ? t.nobody : t.loading}</p>
          )}
        </div>
      </section>

      <section id="history" aria-labelledby="history-title" className="scroll-mt-24">
        <h2 id="history-title" className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">
          {t.overTime}
        </h2>
        <div className="mt-4">
          <HistoryBlock series="players" title={t.playersTitle} t={t} numbers={numberLocale} />
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-white/50">{t.historyNote}</p>
      </section>

      <section id="official" aria-labelledby="official-title" className="scroll-mt-24">
        <h2 id="official-title" className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">
          {t.officialTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/65">{t.officialLead}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Tile
            value={fresh ? fmt(latest!.playing) : "–"}
            label={t.playingThere}
            note={
              fresh ? format(t.atAgain, { time: time(latest!.at) }) : latest ? format(t.notAnswering, { time: time(latest.at) }) : official.failed ? t.down : ""
            }
          />
          <Tile value={officialToday ? fmt(officialToday.playing) : "–"} label={t.peakToday} note={officialToday ? format(t.at, { time: time(officialToday.at) }) : ""} />
          <Tile
            value={official.data?.all_time ? fmt(official.data.all_time.playing) : "–"}
            label={t.allTime}
            note={official.data?.all_time ? format(t.on, { when: moment(official.data.all_time.at) }) : ""}
          />
        </div>
        <div className="mt-4">
          <HistoryBlock series="official" title={t.officialHistory} t={t} numbers={numberLocale} />
        </div>
      </section>
    </div>
  );
}
