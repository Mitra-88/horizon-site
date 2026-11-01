"use client";

import { useEffect, useMemo, useState } from "react";

// The Official Horizon SMP's market (/hub/market): the page the SMP mod writes once a minute (horizon-mods
// native/smp README, "web/market.json"), through Kira and /api/market.
type Series = { step: number; t: number[]; price: number[]; volume: number[] };
type Item = {
  id: string;
  name: string;
  category: string | null;
  buy: number | null;
  sell: number | null;
  mid: number;
  base: number;
  change_1h: number | null;
  change_24h: number | null;
  volume_24h: number;
  day: Series;
  month: Series;
};
type Market = {
  schema: 1;
  generated: number;
  currency: string;
  moving: boolean;
  tax_percent: number;
  taxes_collected: number;
  daily_summary?: { day: number; lines: string[] };
  items: Item[];
};

const UP = "#7ee08a";
const DOWN = "#ff7a85";
const W = 800;
const H = 260;
const LEFT = 56;
const RIGHT = 12;
const TOP = 14;
const BOTTOM = 30;

const num = (n?: number | null, digits = 0) => (n == null ? "–" : Number(n).toLocaleString("en", { maximumFractionDigits: digits }));
const time = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function Change({ value }: { value: number | null }) {
  if (value == null) return <span className="text-white/40">–</span>;
  if (Math.abs(value) < 0.05) return <span className="text-white/55">0.0%</span>;
  return (
    <span style={{ color: value > 0 ? UP : DOWN }} className="tabular-nums">
      {value > 0 ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function useMarket() {
  const [data, setData] = useState<Market | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/market?file=market", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<Market>) : Promise.reject(new Error(String(r.status)))))
        .then(
          (d) => {
            if (!alive) return;
            setData(d);
            setFailed(false);
          },
          () => alive && setFailed(true),
        );
    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);
  return { data, failed };
}

function Spark({ s }: { s: Series }) {
  const p = s.price;
  if (p.length < 2) return <span className="text-xs text-white/35">–</span>;
  const lo = Math.min(...p);
  const hi = Math.max(...p);
  const span = hi - lo || hi * 0.01 || 1;
  const pts = p.map((v, i) => `${((i / (p.length - 1)) * 96 + 2).toFixed(1)},${(26 - ((v - lo) / span) * 22).toFixed(1)}`).join(" ");
  const color = p[p.length - 1] >= p[0] ? UP : DOWN;
  return (
    <svg viewBox="0 0 100 30" className="h-7 w-24" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function Chart({ item, range, currency }: { item: Item; range: "day" | "month"; currency: string }) {
  const s = item[range];
  if (s.price.length < 2) return <p className="text-sm text-white/50">No trades yet in this span.</p>;
  const lo = Math.min(...s.price);
  const hi = Math.max(...s.price);
  const pad = (hi - lo || hi * 0.02 || 1) * 0.1;
  const [y0, y1] = [lo - pad, hi + pad];
  const t0 = s.t[0];
  const t1 = s.t[s.t.length - 1];
  const x = (t: number) => LEFT + ((t - t0) / (t1 - t0 || 1)) * (W - LEFT - RIGHT);
  const y = (v: number) => TOP + (1 - (v - y0) / (y1 - y0)) * (H - TOP - BOTTOM);
  const line = s.price.map((v, i) => `${x(s.t[i]).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${x(t0)},${H - BOTTOM} ${line} ${x(t1)},${H - BOTTOM}`;
  const color = s.price[s.price.length - 1] >= s.price[0] ? UP : DOWN;
  const maxVol = Math.max(1, ...s.volume);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => y0 + f * (y1 - y0));
  const label = (t: number) =>
    range === "day" ? time(t) : new Date(t).toLocaleDateString([], { day: "numeric", month: "short" });
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${item.name}'s price ${range === "day" ? "over 24 hours" : "over 30 days"}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={LEFT} x2={W - RIGHT} y1={y(v)} y2={y(v)} stroke="white" strokeOpacity="0.07" />
            <text x={LEFT - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="white" fillOpacity="0.5">
              {num(v, v < 10 ? 2 : 0)}
            </text>
          </g>
        ))}
        {s.volume.map((v, i) =>
          v ? (
            <rect
              key={s.t[i]}
              x={x(s.t[i]) - 1}
              width="2"
              y={H - BOTTOM - (v / maxVol) * 40}
              height={(v / maxVol) * 40}
              fill="#a98fff"
              fillOpacity="0.45"
            />
          ) : null,
        )}
        <polygon points={area} fill={color} fillOpacity="0.08" />
        <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {[t0, (t0 + t1) / 2, t1].map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="11" fill="white" fillOpacity="0.5">
            {label(t)}
          </text>
        ))}
      </svg>
      <figcaption className="mt-2 text-[13px] text-white/50">
        The mid price ({currency} per item, between what the market asks and pays), and in violet the items traded in each{" "}
        {range === "day" ? "5 minutes" : "hour"}.
      </figcaption>
    </figure>
  );
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

export function MarketBoard() {
  const { data, failed } = useMarket();
  const [category, setCategory] = useState("All");
  const [picked, setPicked] = useState<string | null>(null);
  const [range, setRange] = useState<"day" | "month">("day");
  const categories = useMemo(() => ["All", ...new Set((data?.items ?? []).map((i) => i.category ?? "Other"))], [data]);
  const items = (data?.items ?? []).filter((i) => category === "All" || (i.category ?? "Other") === category);
  const item = data?.items.find((i) => i.id === (picked ?? "minecraft:diamond")) ?? data?.items[0];
  const traded = (data?.items ?? []).reduce((n, i) => n + i.volume_24h, 0);
  const movers = [...(data?.items ?? [])].filter((i) => i.change_24h != null).sort((a, b) => Math.abs(b.change_24h!) - Math.abs(a.change_24h!));

  if (!data) {
    return <p className="text-sm text-white/55">{failed ? "The server's market isn't available right now." : "Loading the market…"}</p>;
  }
  return (
    <div className="space-y-12">
      <section aria-label="The market now">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
          <Tile value={num(data.items.length)} label="items traded" note={`Updated ${time(data.generated)}, again every minute`} />
          <Tile value={num(traded)} label="items traded in 24 hours" />
          <Tile value={movers[0] ? movers[0].name : "–"} label="biggest move today" note={movers[0] ? `${movers[0].change_24h! > 0 ? "▲" : "▼"} ${Math.abs(movers[0].change_24h!).toFixed(1)}% in 24 hours` : ""} />
          <Tile value={`${num(data.taxes_collected)} ${data.currency}`} label="taxes to the Treasury" note={`${data.tax_percent}% of each trade`} />
        </div>
        {data.daily_summary?.lines.length ? (
          <div className="mt-4 rounded-2xl bg-[#18112c] p-5 sm:p-6">
            <h3 className="text-[15px] font-medium text-white">Yesterday&apos;s summary</h3>
            <ul className="mt-2 space-y-1 text-[14px] text-white/70">
              {data.daily_summary.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {item ? (
        <section aria-labelledby="chart-title" className="rounded-2xl bg-[#18112c] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="chart-title" className="text-[15px] font-medium text-white">
              {item.name}: buy {num(item.buy)} · sell {num(item.sell)} {data.currency}{" "}
              <span className="ml-2 text-white/60">
                <Change value={item.change_24h} /> in 24 hours
              </span>
            </h2>
            <div role="group" aria-label="Show the" className="flex rounded-lg bg-white/[0.06] p-1">
              {(
                [
                  ["day", "24 hours"],
                  ["month", "30 days"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={range === k}
                  onClick={() => setRange(k)}
                  className={`h-8 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] ${
                    range === k ? "bg-white text-[#100a1f]" : "text-white/65 hover:text-white"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <Chart item={item} range={range} currency={data.currency} />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="prices-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="prices-title" className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">
            Prices
          </h2>
          <div role="group" aria-label="Category" className="flex flex-wrap gap-1 rounded-lg bg-white/[0.06] p-1">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`h-8 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] ${
                  category === c ? "bg-white text-[#100a1f]" : "text-white/65 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl bg-[#18112c]">
          <table className="w-full text-left text-[14px]">
            <thead className="text-[12px] tracking-wide text-white/50 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 text-right font-medium">Buy</th>
                <th className="px-4 py-3 text-right font-medium">Sell</th>
                <th className="px-4 py-3 text-right font-medium">1 hour</th>
                <th className="px-4 py-3 text-right font-medium">24 hours</th>
                <th className="px-4 py-3 text-right font-medium">Traded, 24 h</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Last 24 hours</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className={`border-t border-white/[0.06] ${item?.id === i.id ? "bg-white/[0.04]" : ""}`}>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setPicked(i.id)}
                      className="text-white underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#a98fff]"
                    >
                      {i.name}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right text-white/80 tabular-nums">{num(i.buy)}</td>
                  <td className="px-4 py-2 text-right text-white/80 tabular-nums">{num(i.sell)}</td>
                  <td className="px-4 py-2 text-right">
                    <Change value={i.change_1h} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Change value={i.change_24h} />
                  </td>
                  <td className="px-4 py-2 text-right text-white/70 tabular-nums">{num(i.volume_24h)}</td>
                  <td className="px-4 py-2">
                    <Spark s={i.day} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-white/50">
          Buy is what the market asks, sell what it pays, in {data.currency} per item, tax not included. Items bought from the market can&apos;t
          be sold back to it for 24 hours. Times are in your time zone.
        </p>
      </section>
    </div>
  );
}
