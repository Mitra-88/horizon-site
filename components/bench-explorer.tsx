"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { BenchMachine, Distance, GameRun, MachineId } from "@/components/bench-data";
import { EbayLogo, ExternalLinkIcon } from "@/components/icons";

const HORIZON = "#a98fff";
const JAVA = "#8b8499";
const EDGES = [0, 1, 2, 3, 4.17, 5, 6, 7, 8.33, 10, 12, 14, 16.67, 20, 25, 33.33, 40, 50, 66.67, 100, 150, 250, 500, 1000, 1500];
const CLASSES = [
  { key: "smooth", label: "Over 120 FPS", color: "#8be0b4" },
  { key: "fine", label: "60 to 120", color: "#4f9e80" },
  { key: "slow", label: "30 to 60", color: "#f2c46b" },
  { key: "stutter", label: "Under 30", color: "#f07a6a" },
] as const;

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const fps = (n: number) => Math.round(n).toLocaleString("en-US");
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const gb = (mb: number) => `${(mb / 1024).toFixed(1)} GB`;
const perMinute = (n: number) => Math.round(n).toLocaleString("en-US");

function times(a: number, b: number) {
  const r = a / b;
  if (r >= 1.95) return `${r >= 10 ? Math.round(r) : r.toFixed(1).replace(/\.0$/, "")} times`;
  return `${Math.round((r - 1) * 100)}%`;
}

function verdict(machine: BenchMachine, h: GameRun, v: GameRun) {
  const parts: string[] = [];
  if (h.hitchesPerMin < 0.5 && v.hitchesPerMin >= 5) parts.push(`Horizon never dipped below 60 FPS on the ${machine.name}; Java Edition did ${perMinute(v.hitchesPerMin)} times a minute.`);
  else if (h.hitchesPerMin < v.hitchesPerMin * 0.75) parts.push(`On the ${machine.name}, Horizon hitched ${perMinute(h.hitchesPerMin)} times a minute against Java Edition's ${perMinute(v.hitchesPerMin)}.`);
  else if (h.hitchesPerMin > v.hitchesPerMin * 1.3 && h.hitchesPerMin - v.hitchesPerMin > 5) parts.push(`On the ${machine.name}, Java Edition ran smoother here: ${perMinute(v.hitchesPerMin)} hitches a minute against Horizon's ${perMinute(h.hitchesPerMin)}.`);
  else parts.push(`On the ${machine.name}, both games stayed about as smooth.`);
  const load = v.worldMs / h.worldMs;
  const ram = h.ramSteady / v.ramSteady;
  const rest: string[] = [];
  if (load >= 1.15) rest.push(`got into the world ${load >= 1.95 ? `${load.toFixed(1).replace(/\.0$/, "")} times` : `${Math.round((load - 1) * 100)}%`} faster`);
  if (ram <= 0.8) rest.push(ram >= 0.45 && ram <= 0.56 ? "used half the memory" : `used ${Math.round((1 - ram) * 100)}% less memory`);
  if (rest.length) parts.push(`It ${rest.join(" and ")}.`);
  if (load < 0.87) parts.push("Java Edition got into the world faster.");
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

function GameLabel({ game }: { game: "horizon" | "vanilla" }) {
  return (
    <span className="flex items-center gap-2 text-sm text-white/75">
      <span className="size-2.5 rounded-[3px]" style={{ background: game === "horizon" ? HORIZON : JAVA }} />
      {game === "horizon" ? "Horizon" : "Java Edition"}
    </span>
  );
}

function PairBars({ rows }: { rows: { label: string; hint?: string; h: number; v: number; format: (n: number) => string; better: "high" | "low"; note?: string }[] }) {
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
              <div key={game} className="mt-2 grid grid-cols-[minmax(0,1fr)_4.75rem] items-center gap-3">
                <div className="h-3 overflow-hidden rounded-[4px] bg-white/[0.05]">
                  <div
                    className="h-full rounded-[4px] transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.max(2, (value / max) * 100)}%`, background: game === "horizon" ? HORIZON : JAVA }}
                  />
                </div>
                <span className={`text-right text-sm tabular-nums ${wins ? "font-semibold text-white" : "text-white/55"}`}>{r.format(value)}</span>
              </div>
            ))}
            {r.note && <p className="mt-2 text-xs leading-relaxed text-white/45">{r.note}</p>}
          </div>
        );
      })}
    </div>
  );
}

function Race({ rows, replayKey }: { rows: { label: string; h: number; v: number }[]; replayKey: string }) {
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
            const style: Vars = { "--dur": `${Math.round((ms / max) * total)}ms`, background: game === "horizon" ? HORIZON : JAVA };
            const wins = game === "horizon" ? r.h < r.v * 0.97 : r.v < r.h * 0.97;
            return (
              <div key={game} className="mt-2 grid grid-cols-[minmax(0,1fr)_4.75rem] items-center gap-3">
                <div className="h-3 overflow-hidden rounded-[4px] bg-white/[0.05]">
                  {seen && <div key={`${replayKey}-${round}`} className="race-fill h-full rounded-[4px]" style={style} />}
                </div>
                <span
                  key={`${replayKey}-${round}-t`}
                  className={`race-time text-right text-sm tabular-nums ${wins ? "font-semibold text-white" : "text-white/55"}`}
                  style={{ "--dur": seen ? `${Math.round((ms / max) * total)}ms` : "99s" } as Vars}
                >
                  {seconds(ms)}
                </span>
              </div>
            );
          })}
        </div>
      ))}
      <button type="button" onClick={() => setRound((n) => n + 1)} className="text-xs font-medium text-[#c4b5ff] hover:text-white">
        Run it again
      </button>
    </div>
  );
}

function Distribution({ run }: { run: GameRun }) {
  return (
    <div className="flex h-3.5 w-full overflow-hidden rounded-[4px] bg-white/[0.05]">
      {CLASSES.map((c) => {
        const share = run.shares[c.key];
        if (share <= 0) return null;
        return <div key={c.key} title={`${c.label}: ${(share * 100).toFixed(1)}%`} className="h-full transition-[width] duration-700" style={{ width: `${share * 100}%`, background: c.color, minWidth: share > 0.0005 ? 2 : 0 }} />;
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

function Lane({ run, label, color, playing, slowdown, seed }: { run: GameRun; label: string; color: string; playing: boolean; slowdown: number; seed: number }) {
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
        <span className="text-[#140d26]/60 tabular-nums">{hitches.toLocaleString("en-US")} hitches so far</span>
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

function Feel({ machine, pair, rd }: { machine: BenchMachine; pair: { horizon: GameRun; vanilla: GameRun }; rd: Distance }) {
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
          <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.08] font-semibold tracking-[-0.03em]">Feel the difference</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-[#140d26]/70">
            Both views pan at the same speed, but each one only moves when its game finishes a frame, using the frame times measured on the{" "}
            {machine.name} at render distance {rd}. Every freeze and jump you see is a hitch.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div role="group" aria-label="Playback speed" className="flex rounded-lg bg-[#140d26]/[0.07] p-1">
            {(
              [
                [false, "Real time"],
                [true, `${SLOWDOWN}x slower`],
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
            {isPaused ? "Play" : "Pause"}
          </button>
        </div>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Lane key={`h-${machine.id}-${rd}`} run={pair.horizon} label="Horizon" color="#6b4bff" playing={playing} slowdown={slow ? SLOWDOWN : 1} seed={seed} />
        <Lane key={`v-${machine.id}-${rd}`} run={pair.vanilla} label="Java Edition 26.3" color="#6f6880" playing={playing} slowdown={slow ? SLOWDOWN : 1} seed={seed + 1} />
      </div>
      <p className="mt-5 text-[13px] leading-relaxed text-[#140d26]/55">
        A replay of the measured distribution of frame times, not a recording. Your screen shows at most its own refresh rate, so in real time
        every frame faster than that looks the same. {SLOWDOWN}x slower plays the same frames at a quarter of the speed, so each one stays up long
        enough to see.
      </p>
    </div>
  );
}

const chipCredits = (machine: BenchMachine) => [...new Map(machine.specs.flatMap((s) => (s.thumb?.credit ? [[s.thumb.credit.href, s.thumb.credit] as const] : []))).values()];

function DeviceCard({ machine }: { machine: BenchMachine }) {
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
          Chip photos:{" "}
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
            <span className="underline decoration-white/25 underline-offset-4">About this computer&apos;s runs</span>
          </summary>
          <p className="mt-2 text-[13px] leading-relaxed text-white/50">{machine.note}</p>
        </details>
      )}
    </aside>
  );
}

export function BenchExplorer({ machines }: { machines: BenchMachine[] }) {
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
              <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-white">Pick a computer</h2>
              <p className="mt-2 max-w-xl text-[16px] leading-relaxed text-white/60">Three of the project&apos;s own machines, from a 2016 laptop to a gaming desktop.</p>
            </div>
            <div role="group" aria-label="Render distance" className="flex shrink-0 items-center gap-3">
              <span className="text-sm text-white/50">Render distance</span>
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
                      {d} {d === "12" ? "(default)" : "(far)"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div role="tablist" aria-label="Computer" className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
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
              {machine.missing["32"]} Showing render distance 12.
            </p>
          )}

          {pair && (
            <div className="mt-6 grid gap-4 lg:grid-cols-[21rem_minmax(0,1fr)]">
              <DeviceCard machine={machine} />
              <div className="min-w-0">
                <p className="rounded-2xl bg-[#18112c] px-5 py-5 font-display text-[clamp(1.25rem,2.2vw,1.6rem)] leading-snug font-medium tracking-[-0.015em] text-white sm:px-6">
                  {verdict(machine, pair.horizon, pair.vanilla)}
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Card title="Hitches in a minute of play" className="md:col-span-2">
                    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/55">
                      A hitch is a frame slower than one refresh of a 60 Hz screen, so you see the same picture twice. Red marks are the long ones, under
                      30 FPS, that you feel as a stutter.
                    </p>
                    <div className="mt-5 space-y-4">
                      {(
                        [
                          ["horizon", pair.horizon],
                          ["vanilla", pair.vanilla],
                        ] as const
                      ).map(([game, r], i) => (
                        <div key={game} className="grid grid-cols-[7rem_minmax(0,1fr)_3.5rem] items-center gap-3 sm:grid-cols-[8.5rem_minmax(0,1fr)_4rem]">
                          <GameLabel game={game} />
                          <Barcode hitches={r.hitchesPerMin} stutters={r.stuttersPerMin} seed={i * 1000 + machine.id.length * 31 + Number(rd)} />
                          <span className="text-right font-display text-2xl font-semibold text-white tabular-nums">{perMinute(r.hitchesPerMin)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-white/45">
                      Long stutters a minute: Horizon {perMinute(pair.horizon.stuttersPerMin)}, Java Edition {perMinute(pair.vanilla.stuttersPerMin)}.
                    </p>
                  </Card>

                  <Card title="Frames per second">
                    <PairBars
                      rows={[
                        {
                          label: "On average",
                          h: pair.horizon.avgFps,
                          v: pair.vanilla.avgFps,
                          format: fps,
                          better: "high",
                          note: pair.horizon.capped
                            ? `Horizon is held at ${pair.horizon.capped} here by the Mac's display, so its average can't go higher. Look at the worst moments.`
                            : undefined,
                        },
                        { label: "In the worst moments", hint: "1% lows", h: pair.horizon.low1, v: pair.vanilla.low1, format: fps, better: "high" },
                      ]}
                    />
                  </Card>

                  <Card title="Waiting">
                    <Race
                      replayKey={`${machine.id}-${rd}`}
                      rows={[
                        { label: "From launch into the world", h: pair.horizon.worldMs, v: pair.vanilla.worldMs },
                        { label: "Loading new terrain", h: pair.horizon.chunkMs, v: pair.vanilla.chunkMs },
                      ]}
                    />
                  </Card>

                  <Card title="Memory while playing">
                    <PairBars
                      rows={[
                        {
                          label: "Memory in use",
                          hint: `peak ${gb(pair.horizon.ramPeak)} and ${gb(pair.vanilla.ramPeak)}`,
                          h: pair.horizon.ramSteady,
                          v: pair.vanilla.ramSteady,
                          format: gb,
                          better: "low",
                        },
                      ]}
                    />
                    <p className="mt-4 text-xs leading-relaxed text-white/45">
                      {pair.vanilla.ramSteady > pair.horizon.ramSteady * 1.2
                        ? `Java Edition needs ${times(pair.vanilla.ramSteady, pair.horizon.ramSteady)} more, which matters on a computer with 8 GB.`
                        : "About the same."}
                    </p>
                  </Card>

                  <Card title="Where every frame landed">
                    <div className="mt-4 space-y-3">
                      {(
                        [
                          ["horizon", pair.horizon],
                          ["vanilla", pair.vanilla],
                        ] as const
                      ).map(([game, r]) => (
                        <div key={game}>
                          <GameLabel game={game} />
                          <div className="mt-1.5">
                            <Distribution run={r} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-white/55">
                      {CLASSES.map((c) => (
                        <li key={c.key} className="flex items-center gap-1.5">
                          <span className="size-2 rounded-[2px]" style={{ background: c.color }} />
                          {c.label}
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
            <Feel machine={machine} pair={pair} rd={rd} />
          </div>
        </section>
      )}
    </>
  );
}
