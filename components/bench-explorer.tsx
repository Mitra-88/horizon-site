"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { BenchMachine, Distance, GameRun, MachineId } from "@/components/bench-data";
import { benchNumbers } from "@/components/bench-format";
import type { Messages } from "@/components/i18n";
import { format, formatParts } from "@/components/i18n-text";
import { EbayLogo, ExternalLinkIcon } from "@/components/icons";

const HORIZON = "#a98fff";
const JAVA = "#8b8499";
const EDGES = [0, 1, 2, 3, 4.17, 5, 6, 7, 8.33, 10, 12, 14, 16.67, 20, 25, 33.33, 40, 50, 66.67, 100, 150, 250, 500, 1000, 1500];
const CLASSES = [
  { key: "smooth", color: "#8be0b4" },
  { key: "fine", color: "#4f9e80" },
  { key: "slow", color: "#f2c46b" },
  { key: "stutter", color: "#f07a6a" },
] as const;

type Vars = CSSProperties & Record<`--${string}`, string | number>;

type T = Messages["benchmarks"]["explorer"];

// The page's words and number formats, handed down to every part of the explorer.
type Text = {
  t: T;
  fps: (n: number) => string;
  seconds: (ms: number) => string;
  gb: (mb: number) => string;
  perMinute: (n: number) => string;
  dec: (n: number) => string;
};

function text(t: T, units: Messages["benchmarks"]["units"], numberLocale: string): Text {
  const n = benchNumbers(numberLocale);
  return {
    t,
    fps: n.int,
    seconds: (ms) => format(units.seconds, { n: n.dec(ms / 1000) }),
    gb: (mb) => format(units.gb, { n: n.dec(mb / 1024) }),
    perMinute: n.int,
    dec: n.dec,
  };
}

// "2.5 times" from 2.5, "45%" from 1.45.
function times(x: Text, r: number) {
  if (r >= 1.95) return format(x.t.times, { n: r >= 10 ? Math.round(r) : x.dec(r).replace(/[.,]0$/, "") });
  return format(x.t.percent, { n: Math.round((r - 1) * 100) });
}

function verdict(x: Text, machine: BenchMachine, h: GameRun, v: GameRun) {
  const { verdict: t } = x.t;
  const name = machine.inSentence;
  const parts: string[] = [];
  if (h.hitchesPerMin < 0.5 && v.hitchesPerMin >= 5) parts.push(format(t.never, { machine: name, java: x.perMinute(v.hitchesPerMin) }));
  else if (h.hitchesPerMin < v.hitchesPerMin * 0.75) parts.push(format(t.fewer, { machine: name, h: x.perMinute(h.hitchesPerMin), v: x.perMinute(v.hitchesPerMin) }));
  else if (h.hitchesPerMin > v.hitchesPerMin * 1.3 && h.hitchesPerMin - v.hitchesPerMin > 5)
    parts.push(format(t.javaSmoother, { machine: name, h: x.perMinute(h.hitchesPerMin), v: x.perMinute(v.hitchesPerMin) }));
  else parts.push(format(t.same, { machine: name }));
  const load = v.worldMs / h.worldMs;
  const ram = h.ramSteady / v.ramSteady;
  const rest: string[] = [];
  const amount = load >= 1.95 ? format(x.t.times, { n: x.dec(load).replace(/[.,]0$/, "") }) : format(x.t.percent, { n: Math.round((load - 1) * 100) });
  if (load >= 1.15) rest.push(format(t.faster, { amount }));
  if (ram <= 0.8) rest.push(ram >= 0.45 && ram <= 0.56 ? t.half : format(t.less, { pct: Math.round((1 - ram) * 100) }));
  if (rest.length) parts.push(format(t.it, { rest: rest.join(t.and) }));
  if (load < 0.87) parts.push(t.javaFaster);
  return parts.join(" ");
}

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Barcode({ hitches, stutters, seed }: { hitches: number; stutters: number; seed: number }) {
  const marks = useMemo(() => {
    const rand = mulberry(seed);
    const n = Math.min(900, Math.round(hitches));
    const long = Math.min(n, Math.round(stutters));
    return Array.from({ length: n }, (_, i) => ({ x: rand() * 599, long: i < long }));
  }, [hitches, stutters, seed]);
  return (
    <svg viewBox="0 0 600 28" preserveAspectRatio="none" className="block h-9 w-full rounded-md bg-white/[0.04]" aria-hidden>
      {marks.map((m, i) => (
        <rect key={i} x={m.x} y={m.long ? 0 : 6} width={1.3} height={m.long ? 28 : 16} fill={m.long ? "#f07a6a" : "#f2c46b"} opacity={m.long ? 0.95 : 0.8} />
      ))}
    </svg>
  );
}

function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-[#18112c] p-5 sm:p-6 ${className}`}>
      <h3 className="text-[15px] font-semibold text-white">{title}</h3>
      {children}
    </section>
  );
}

function GameLabel({ game, t }: { game: "horizon" | "vanilla"; t: T }) {
  return (
    <span className="flex items-center gap-2 text-sm text-white/75">
      <span className="size-2.5 rounded-[3px]" style={{ background: game === "horizon" ? HORIZON : JAVA }} />
      {game === "horizon" ? t.horizon : t.java}
    </span>
  );
}

function BarRow({
  t,
  game,
  value,
  wins,
  valueClassName = "",
  valueStyle,
  children,
}: {
  t: T;
  game: "horizon" | "vanilla";
  value: string;
  wins: boolean;
  valueClassName?: string;
  valueStyle?: Vars;
  children: ReactNode;
}) {
  return (
    <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:mt-2 sm:grid-cols-[minmax(0,1fr)_4.75rem]">
      <span className="text-xs text-white/50 sm:hidden">{game === "horizon" ? t.horizon : t.java}</span>
      <span className={`text-right text-sm tabular-nums sm:col-start-2 sm:row-start-1 ${wins ? "font-semibold text-white" : "text-white/55"} ${valueClassName}`} style={valueStyle}>
        {value}
      </span>
      <div className="col-span-2 h-2.5 overflow-hidden rounded-[4px] bg-white/[0.05] sm:col-span-1 sm:col-start-1 sm:row-start-1 sm:h-3">{children}</div>
    </div>
  );
}

function PairBars({ t, rows }: { t: T; rows: { label: string; hint?: string; h: number; v: number; format: (n: number) => string; better: "high" | "low"; note?: string }[] }) {
  return (
    <div className="mt-4 space-y-5">
      {rows.map((r) => {
        const max = Math.max(r.h, r.v) || 1;
        const hWins = r.better === "high" ? r.h > r.v * 1.03 : r.h < r.v * 0.97;
        const vWins = r.better === "high" ? r.v > r.h * 1.03 : r.v < r.h * 0.97;
        return (
          <div key={r.label}>
            <p className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-white/80">{r.label}</span>
              {r.hint && <span className="text-xs text-white/40">{r.hint}</span>}
            </p>
            {(
              [
                ["horizon", r.h, hWins],
                ["vanilla", r.v, vWins],
              ] as const
            ).map(([game, value, wins]) => (
              <BarRow key={game} t={t} game={game} value={r.format(value)} wins={wins}>
                <div
                  className="h-full rounded-[4px] transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.max(2, (value / max) * 100)}%`, background: game === "horizon" ? HORIZON : JAVA }}
                />
              </BarRow>
            ))}
            {r.note && <p className="mt-2 text-xs leading-relaxed text-white/45">{r.note}</p>}
          </div>
        );
      })}
    </div>
  );
}

function Race({ x, rows, replayKey }: { x: Text; rows: { label: string; h: number; v: number }[]; replayKey: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [round, setRound] = useState(0);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const max = Math.max(...rows.flatMap((r) => [r.h, r.v]));
  const total = 2600;
  return (
    <div ref={root} className="mt-4 space-y-5">
      {rows.map((r) => (
        <div key={r.label}>
          <p className="text-sm text-white/80">{r.label}</p>
          {(
            [
              ["horizon", r.h],
              ["vanilla", r.v],
            ] as const
          ).map(([game, ms]) => {
            const duration = `${Math.round((ms / max) * total)}ms`;
            const style: Vars = { "--dur": duration, width: `${Math.max(2, (ms / max) * 100)}%`, background: game === "horizon" ? HORIZON : JAVA };
            const wins = game === "horizon" ? r.h < r.v * 0.97 : r.v < r.h * 0.97;
            return (
              <BarRow
                key={`${game}-${replayKey}-${round}`}
                t={x.t}
                game={game}
                value={x.seconds(ms)}
                wins={wins}
                valueClassName="race-time"
                valueStyle={{ "--dur": seen ? duration : "99s" }}
              >
                {seen && <div className="race-fill h-full rounded-[4px]" style={style} />}
              </BarRow>
            );
          })}
        </div>
      ))}
      <button type="button" onClick={() => setRound((n) => n + 1)} className="text-xs font-medium text-[#c4b5ff] hover:text-white">
        {x.t.waiting.again}
      </button>
    </div>
  );
}

function Distribution({ x, run }: { x: Text; run: GameRun }) {
  return (
    <div className="flex h-3.5 w-full overflow-hidden rounded-[4px] bg-white/[0.05]">
      {CLASSES.map((c) => {
        const share = run.shares[c.key];
        if (share <= 0) return null;
        return <div key={c.key} title={format(x.t.frames.share, { label: x.t.classes[c.key], pct: x.dec(share * 100) })} className="h-full transition-[width] duration-700" style={{ width: `${share * 100}%`, background: c.color, minWidth: share > 0.0005 ? 2 : 0 }} />;
      })}
    </div>
  );
}

function sampler(histogram: number[]) {
  const total = histogram.reduce((a, b) => a + b, 0) || 1;
  const cdf: number[] = [];
  let acc = 0;
  for (const c of histogram) cdf.push((acc += c) / total);
  return (rand: () => number) => {
    const r = rand();
    let i = cdf.findIndex((p) => p >= r);
    if (i < 0) i = histogram.length - 1;
    const lo = EDGES[i];
    const hi = EDGES[i + 1];
    return Math.max(0.3, lo + rand() * (hi - lo));
  };
}

const PAN = 0.45;
const LOOP_ASPECT = 1240 / 480;
const SLOWDOWN = 4;

type Replay = {
  rand: () => number;
  next: (rand: () => number) => number;
  clock: number;
  started: number;
  current: number;
  hitches: number;
};

function step(r: Replay, ms: number) {
  r.clock += ms;
  while (r.started + r.current <= r.clock) {
    if (r.current > 16.67) r.hitches++;
    r.started += r.current;
    r.current = r.next(r.rand);
  }
}

function createReplay(run: GameRun, seed: number): Replay {
  const rand = mulberry(seed);
  const next = sampler(run.histogram);
  return { rand, next, clock: 0, started: 0, current: next(rand), hitches: 0 };
}

function Lane({
  x,
  run,
  label,
  color,
  playing,
  slowdown,
  seed,
}: {
  x: Text;
  run: GameRun;
  label: string;
  color: string;
  playing: boolean;
  slowdown: number;
  seed: number;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const replay = useRef<Replay | null>(null);
  const pace = useRef(slowdown);
  const [hitches, setHitches] = useState(0);

  useEffect(() => {
    pace.current = slowdown;
  }, [slowdown]);

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const r = (replay.current ??= createReplay(run, seed));
    const render = () => {
      const loop = el.clientHeight * LOOP_ASPECT;
      el.style.setProperty("--x", `${-((r.started * PAN) % loop)}px`);
    };
    render();
    const resize = new ResizeObserver(render);
    resize.observe(el);
    if (!playing) return () => resize.disconnect();
    let last = 0;
    let frame = 0;
    const tick = (now: number) => {
      if (last) step(r, Math.min(now - last, 100) / pace.current);
      last = now;
      render();
      setHitches(r.hitches);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [run, playing, seed]);

  return (
    <div>
      <p className="flex items-baseline justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-[#140d26]">
          <span className="size-2.5 rounded-[3px]" style={{ background: color }} />
          {label}
        </span>
        <span className="text-[#140d26]/60 tabular-nums">{formatParts(x.t.feel.soFar, { n: x.perMinute(hitches) })}</span>
      </p>
      <div className="mt-2 overflow-hidden rounded-2xl bg-[#140d26]">
        <div ref={strip} className="relative h-36 overflow-hidden sm:h-44">
          <div
            className="absolute inset-y-0 left-0 w-[300%] bg-[length:auto_100%] bg-repeat-x will-change-transform"
            style={{ backgroundImage: "url(/media/bench/village-loop.webp)", transform: "translate3d(var(--x, 0px), 0, 0)" }}
          />
        </div>
      </div>
    </div>
  );
}

const MOTION = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (onChange: () => void) => {
  const query = window.matchMedia(MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const readMotion = () => window.matchMedia(MOTION).matches;

function Feel({ x, machine, pair, rd }: { x: Text; machine: BenchMachine; pair: { horizon: GameRun; vanilla: GameRun }; rd: Distance }) {
  const t = x.t.feel;
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState<boolean | null>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const [slow, setSlow] = useState(true);
  const reduced = useSyncExternalStore(subscribeMotion, readMotion, () => true);
  const isPaused = paused ?? reduced;
  const playing = visible && !isPaused;
  const seed = machine.id.length * 97 + Number(rd);
  return (
    <div ref={root} className="rounded-[28px] bg-[#f3f0fa] p-6 text-[#140d26] sm:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.08] font-semibold tracking-[-0.03em]">{t.title}</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-[#140d26]/70">{formatParts(t.lead, { machine: machine.inSentence, rd })}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div role="group" aria-label={t.speed} className="flex rounded-lg bg-[#140d26]/[0.07] p-1">
            {(
              [
                [false, t.realTime],
                [true, format(t.slower, { n: SLOWDOWN })],
              ] as const
            ).map(([value, text]) => (
              <button
                key={text}
                type="button"
                aria-pressed={slow === value}
                onClick={() => setSlow(value)}
                className={`h-8 rounded-md px-3 text-sm font-medium transition-colors ${slow === value ? "bg-[#140d26] text-white" : "text-[#140d26]/65 hover:text-[#140d26]"}`}
              >
                {text}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPaused(!isPaused)}
            className="inline-flex h-10 items-center rounded-lg bg-[#140d26] px-4 text-sm font-medium text-white transition-colors hover:bg-[#2a2045]"
          >
            {isPaused ? t.play : t.pause}
          </button>
        </div>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Lane key={`h-${machine.id}-${rd}`} x={x} run={pair.horizon} label={x.t.horizon} color="#6b4bff" playing={playing} slowdown={slow ? SLOWDOWN : 1} seed={seed} />
        <Lane key={`v-${machine.id}-${rd}`} x={x} run={pair.vanilla} label={x.t.java263} color="#6f6880" playing={playing} slowdown={slow ? SLOWDOWN : 1} seed={seed + 1} />
      </div>
      <p className="mt-5 text-[13px] leading-relaxed text-[#140d26]/55">{formatParts(t.note, { n: SLOWDOWN })}</p>
    </div>
  );
}

const chipCredits = (machine: BenchMachine) => [...new Map(machine.specs.flatMap((s) => (s.thumb?.credit ? [[s.thumb.credit.href, s.thumb.credit] as const] : []))).values()];

function DeviceCard({ t, machine }: { t: T; machine: BenchMachine }) {
  return (
    <aside className="flex flex-col rounded-3xl bg-[#18112c] p-5 sm:p-6">
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl ">
        <Image
          key={machine.id}
          src={machine.image.src}
          width={machine.image.width}
          height={machine.image.height}
          alt={machine.image.alt}
          sizes="(min-width: 1024px) 340px, 90vw"
          className="rise max-h-[80%] w-auto max-w-full object-contain"
          priority
        />
      </div>
      {machine.image.caption && <p className="mt-2.5 text-xs leading-relaxed text-white/40">{machine.image.caption}</p>}
      <h3 className="mt-5 font-display text-2xl font-semibold tracking-[-0.02em] text-white">{machine.name}</h3>
      <p className="text-sm text-white/50">{machine.kind}</p>
      <dl className="mt-4 space-y-2 text-sm">
        {machine.specs.map((s) => (
          <div key={s.label} className="grid grid-cols-[2.25rem_5rem_minmax(0,1fr)] items-center gap-3">
            {s.thumb ? (
              <Image src={s.thumb.src} width={36} height={36} alt="" className="size-9 rounded-md object-cover" />
            ) : (
              <span aria-hidden className="size-9" />
            )}
            <dt className="text-white/45">{s.label}</dt>
            <dd className="text-white/85">{s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex flex-wrap gap-2">
        {machine.buy.map((b) => (
          <a
            key={b.href}
            href={b.href}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors ${
              b.primary ? "bg-white text-[#100a1f] hover:bg-white/90" : "bg-white/[0.07] text-white/85 hover:bg-white/[0.12] hover:text-white"
            }`}
          >
            {/ebay\./i.test(b.href) && /eBay$/.test(b.label) ? (
              <>
                {b.label.replace(/\s*eBay$/, "")}{" "}
                <EbayLogo className="h-[18px] w-auto" />
              </>
            ) : (
              b.label
            )}
            <ExternalLinkIcon className="size-3.5 opacity-60" />
          </a>
        ))}
      </div>
      {chipCredits(machine).length > 0 && (
        <p className="mt-4 text-xs leading-relaxed text-white/40">
          {t.chipPhotos}{" "}
          {chipCredits(machine).map((c, i) => (
            <span key={c.href}>
              {i > 0 && "; "}
              <a href={c.href} target="_blank" rel="noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-white/70">
                {c.text}
              </a>
            </span>
          ))}
          .
        </p>
      )}
      {machine.note && (
        <details className="group mt-5 text-sm">
          <summary className="cursor-pointer list-none text-white/55 hover:text-white [&::-webkit-details-marker]:hidden">
            <span className="underline decoration-white/25 underline-offset-4">{t.aboutRuns}</span>
          </summary>
          <p className="mt-2 text-[13px] leading-relaxed text-white/50">{machine.note}</p>
        </details>
      )}
    </aside>
  );
}

export function BenchExplorer({
  machines,
  t,
  metrics,
  units,
  numberLocale,
}: {
  machines: BenchMachine[];
  t: T;
  metrics: Messages["benchmarks"]["metrics"];
  units: Messages["benchmarks"]["units"];
  numberLocale: string;
}) {
  const x = text(t, units, numberLocale);
  const [id, setId] = useState<MachineId>("thinkpad");
  const [wanted, setWanted] = useState<Distance>("12");
  const machine = machines.find((m) => m.id === id) ?? machines[0];
  const rd: Distance = machine.runs[wanted] ? wanted : "12";
  const pair = machine.runs[rd];

  return (
    <>
      <section id="computers" className="bg-[#0c0718] py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-white">{t.pickTitle}</h2>
              <p className="mt-2 max-w-xl text-[16px] leading-relaxed text-white/60">{t.pickLead}</p>
            </div>
            <div role="group" aria-label={t.renderDistance} className="flex shrink-0 items-center gap-3">
              <span className="text-sm text-white/50">{t.renderDistanceShort}</span>
              <div className="flex rounded-lg bg-white/[0.06] p-1">
                {(["12", "32"] as const).map((d) => {
                  const available = Boolean(machine.runs[d]);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={rd === d}
                      disabled={!available}
                      title={available ? undefined : machine.missing[d]}
                      onClick={() => setWanted(d)}
                      className={`h-8 rounded-md px-3.5 text-sm font-medium tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] disabled:cursor-not-allowed disabled:opacity-35 ${
                        rd === d ? "bg-white text-[#100a1f]" : "text-white/65 hover:text-white"
                      }`}
                    >
                      {d} {t.distances[d]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div role="tablist" aria-label={t.computer} className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
            {machines.map((m) => {
              const active = m.id === machine.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setId(m.id)}
                  className={`flex flex-col items-center gap-3 rounded-2xl px-3 py-4 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] sm:flex-row sm:px-5 sm:text-left ${
                    active ? "bg-[#241a3d] text-white" : "bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span className="flex h-10 w-16 shrink-0 items-center justify-center sm:h-12 sm:w-20">
                    <Image src={m.image.src} width={m.image.width} height={m.image.height} alt="" sizes="80px" className="max-h-full w-auto object-contain" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold sm:text-[15px]">{m.name}</span>
                    <span className="hidden text-xs text-white/45 sm:block">{m.kind}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {wanted === "32" && !machine.runs["32"] && machine.missing["32"] && (
            <p className="mt-4 text-sm text-amber-100/80" role="status">
              {formatParts(t.showing12, { missing: machine.missing["32"] })}
            </p>
          )}

          {pair && (
            <div className="mt-6 grid gap-4 lg:grid-cols-[21rem_minmax(0,1fr)]">
              <DeviceCard t={t} machine={machine} />
              <div className="min-w-0">
                <p className="rounded-2xl bg-[#18112c] px-5 py-5 font-display text-[clamp(1.25rem,2.2vw,1.6rem)] leading-snug font-medium tracking-[-0.015em] text-white sm:px-6">
                  {verdict(x, machine, pair.horizon, pair.vanilla)}
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Card title={t.hitches.title} className="md:col-span-2">
                    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/55">{t.hitches.body}</p>
                    <div className="mt-5 space-y-4">
                      {(
                        [
                          ["horizon", pair.horizon],
                          ["vanilla", pair.vanilla],
                        ] as const
                      ).map(([game, r], i) => (
                        <div key={game} className="grid grid-cols-[7rem_minmax(0,1fr)_3.5rem] items-center gap-3 sm:grid-cols-[8.5rem_minmax(0,1fr)_4rem]">
                          <GameLabel game={game} t={t} />
                          <Barcode hitches={r.hitchesPerMin} stutters={r.stuttersPerMin} seed={i * 1000 + machine.id.length * 31 + Number(rd)} />
                          <span className="text-right font-display text-2xl font-semibold text-white tabular-nums">{x.perMinute(r.hitchesPerMin)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-white/45">
                      {formatParts(t.hitches.stutters, { h: x.perMinute(pair.horizon.stuttersPerMin), v: x.perMinute(pair.vanilla.stuttersPerMin) })}
                    </p>
                  </Card>

                  <Card title={t.fps.title}>
                    <PairBars
                      t={t}
                      rows={[
                        {
                          label: t.fps.average,
                          h: pair.horizon.avgFps,
                          v: pair.vanilla.avgFps,
                          format: x.fps,
                          better: "high",
                          note: pair.horizon.capped ? format(t.fps.capped, { n: pair.horizon.capped }) : undefined,
                        },
                        { label: t.fps.worst, hint: t.fps.lows, h: pair.horizon.low1, v: pair.vanilla.low1, format: x.fps, better: "high" },
                      ]}
                    />
                  </Card>

                  <Card title={t.waiting.title}>
                    <Race
                      x={x}
                      replayKey={`${machine.id}-${rd}`}
                      rows={[
                        { label: metrics.world, h: pair.horizon.worldMs, v: pair.vanilla.worldMs },
                        { label: metrics.terrain, h: pair.horizon.chunkMs, v: pair.vanilla.chunkMs },
                      ]}
                    />
                  </Card>

                  <Card title={t.memory.title}>
                    <PairBars
                      t={t}
                      rows={[
                        {
                          label: metrics.memory,
                          hint: format(t.memory.peak, { h: x.gb(pair.horizon.ramPeak), v: x.gb(pair.vanilla.ramPeak) }),
                          h: pair.horizon.ramSteady,
                          v: pair.vanilla.ramSteady,
                          format: x.gb,
                          better: "low",
                        },
                      ]}
                    />
                    <p className="mt-4 text-xs leading-relaxed text-white/45">
                      {pair.vanilla.ramSteady > pair.horizon.ramSteady * 1.2
                        ? format(t.memory.needs, { times: times(x, pair.vanilla.ramSteady / pair.horizon.ramSteady) })
                        : t.memory.same}
                    </p>
                  </Card>

                  <Card title={t.frames.title}>
                    <div className="mt-4 space-y-3">
                      {(
                        [
                          ["horizon", pair.horizon],
                          ["vanilla", pair.vanilla],
                        ] as const
                      ).map(([game, r]) => (
                        <div key={game}>
                          <GameLabel game={game} t={t} />
                          <div className="mt-1.5">
                            <Distribution x={x} run={r} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-white/55">
                      {CLASSES.map((c) => (
                        <li key={c.key} className="flex items-center gap-1.5">
                          <span className="size-2 rounded-[2px]" style={{ background: c.color }} />
                          {t.classes[c.key]}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {pair && (
        <section className="bg-[#0c0718] pb-16 sm:pb-20">
          <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
            <Feel x={x} machine={machine} pair={pair} rd={rd} />
          </div>
        </section>
      )}
    </>
  );
}
