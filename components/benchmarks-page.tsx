import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { getBenchmarks, type BenchMachine, type Distance, type GameRun } from "@/components/bench-data";
import { BenchEstimator } from "@/components/bench-estimator";
import { BenchExplorer } from "@/components/bench-explorer";
import { benchNumbers } from "@/components/bench-format";
import { CopyCommand } from "@/components/hub-tools";
import { FrameTrace } from "@/components/frame-trace";
import { format, getMessages, NUMBER_LOCALE, rich, type Locale, type Messages } from "@/components/i18n";
import { formatParts, localePath } from "@/components/i18n-text";

type T = Messages["benchmarks"];
type Numbers = ReturnType<typeof benchNumbers>;

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

function summary(m: BenchMachine, t: T, n: Numbers) {
  const p = m.runs["12"];
  if (!p) return "";
  const { horizon: h, vanilla: v } = p;
  const s = t.summary;
  if (h.hitchesPerMin < 0.5 && v.hitchesPerMin >= 5) return format(s.noHitches, { java: n.int(v.hitchesPerMin) });
  if (h.hitchesPerMin < v.hitchesPerMin * 0.75)
    return format(s.fewer, { pct: Math.round((1 - h.hitchesPerMin / v.hitchesPerMin) * 10) * 10, h: n.int(h.avgFps), v: n.int(v.avgFps) });
  const far = m.runs["32"];
  const lead = h.avgFps > v.avgFps * 1.03 ? format(s.leadMore, { pct: Math.round((h.avgFps / v.avgFps - 1) * 100) }) : s.leadSame;
  const javaFar = far && !far.horizon.capped && far.vanilla.avgFps > far.horizon.avgFps * 1.03;
  return format(s.smooth, { lead, far: javaFar ? s.javaFar : "" });
}

type Loss = { machine: string; rd: Distance; what: string; java: string; horizon: string };

function losses(machines: BenchMachine[], t: T, n: Numbers) {
  const fps = (x: number) => format(t.units.fps, { n: n.int(x) });
  const s = (ms: number) => format(t.units.seconds, { n: n.dec(ms / 1000) });
  const gb = (mb: number) => format(t.units.gb, { n: n.dec(mb / 1024) });
  const out: Loss[] = [];
  for (const m of machines) {
    for (const rd of ["12", "32"] as const) {
      const p = m.runs[rd];
      if (!p) continue;
      const h: GameRun = p.horizon;
      const v: GameRun = p.vanilla;
      const add = (what: string, java: string, horizon: string) => out.push({ machine: m.name, rd, what, java, horizon });
      if (!h.capped && v.avgFps > h.avgFps * 1.03) add(t.metrics.avgFps, fps(v.avgFps), fps(h.avgFps));
      if (v.low1 > h.low1 * 1.03) add(t.metrics.low1, fps(v.low1), fps(h.low1));
      if (v.hitchesPerMin < h.hitchesPerMin * 0.8 && h.hitchesPerMin - v.hitchesPerMin > 5) add(t.metrics.hitches, n.int(v.hitchesPerMin), n.int(h.hitchesPerMin));
      if (v.worldMs < h.worldMs * 0.97) add(t.metrics.world, s(v.worldMs), s(h.worldMs));
      if (v.chunkMs < h.chunkMs * 0.97) add(t.metrics.terrain, s(v.chunkMs), s(h.chunkMs));
      if (v.ramSteady < h.ramSteady * 0.97) add(t.metrics.memory, gb(v.ramSteady), gb(h.ramSteady));
    }
  }
  return out;
}

const COMMAND = "horizon-client --benchmark standard --render-distance 12";

export async function BenchmarksPage({ locale }: { locale: Locale }) {
  const t = getMessages(locale).benchmarks;
  const n = benchNumbers(NUMBER_LOCALE[locale]);
  const { machines, rows } = await getBenchmarks(locale);
  const lost = losses(machines, t, n);
  // Machines can be measured on different days (the ThinkPad's runs are older than the others'): give the span.
  const days = machines.map((m) => m.measured).filter(Boolean).sort();
  const measured = days.length
    ? days[0] === days.at(-1)
      ? format(t.method.measuredOn, { day: days[0] })
      : format(t.method.measuredBetween, { from: days[0], to: days.at(-1)! })
    : "";
  const trace = machines.find((m) => m.id === "macmini")?.runs["12"];

  return (
    <main>
      <section className="relative isolate overflow-hidden pt-36 pb-14 sm:pt-40 sm:pb-16">
        {trace && <FrameTrace horizon={trace.horizon.histogram} java={trace.vanilla.histogram} className="absolute top-0 left-0 -z-10" />}
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-end lg:px-10">
          <div>
            <h1
              className="rise font-display text-[clamp(2.5rem,6.5vw,4.5rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-white"
              style={delay(0)}
            >
              <span className="block">{t.titleA}</span>
              <span className="text-accent block pb-1">{t.titleB}</span>
            </h1>
            <p className="rise mt-6 max-w-xl text-lg leading-relaxed text-white/70" style={delay(100)}>
              {t.lead}
            </p>
            <p className="rise mt-6 flex flex-wrap gap-2" style={delay(180)}>
              <a href="#computers" className="inline-flex h-11 items-center rounded-lg bg-white px-5 text-[15px] font-medium text-[#100a1f] transition-colors hover:bg-white/90">
                {t.compare}
              </a>
              <a href="#yours" className="inline-flex h-11 items-center rounded-lg bg-white/10 px-5 text-[15px] font-medium text-white transition-colors hover:bg-white/15">
                {t.estimate}
              </a>
            </p>
          </div>

          <ul className="rise space-y-2" style={delay(240)} aria-label={t.inShort}>
            {machines.map((m) => (
              <li key={m.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-4 rounded-2xl bg-[#140d26]/80 p-3 pr-4">
                <span className="flex h-12 items-center justify-center">
                  <Image src={m.image.src} width={m.image.width} height={m.image.height} alt="" sizes="72px" className="max-h-full w-auto object-contain" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">{m.name}</span>
                  <span className="block text-[13px] leading-snug text-white/60">{summary(m, t, n)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <BenchExplorer machines={machines} t={t.explorer} metrics={t.metrics} units={t.units} numberLocale={NUMBER_LOCALE[locale]} />

      <section className="bg-[#100a1f] py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:px-10">
          <div>
            <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-white">{t.losses.title}</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-white/60">
              {rich(t.losses.intro, {
                link: (text) => (
                  <Link href="/hub#roadmap" className="text-[#c4b5ff] underline underline-offset-4 hover:text-white">
                    {text}
                  </Link>
                ),
              })}
            </p>
          </div>
          <ul className="divide-y divide-white/[0.06] rounded-2xl bg-[#18112c]">
            {lost.map((l) => (
              <li key={`${l.machine}-${l.rd}-${l.what}`} className="grid gap-1 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:px-6">
                <span>
                  <span className="block text-[15px] font-medium text-white">{l.what}</span>
                  <span className="block text-[13px] text-white/50">{formatParts(t.losses.where, { machine: l.machine, rd: l.rd })}</span>
                </span>
                <span className="text-sm tabular-nums">
                  <span className="text-white">{formatParts(t.losses.java, { value: l.java })}</span>
                  <span className="mx-2 text-white/25">/</span>
                  <span className="text-white/55">{formatParts(t.losses.horizon, { value: l.horizon })}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="yours" className="scroll-mt-20 bg-[#0c0718] py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-white">{t.yours.title}</h2>
          <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-white/60">{t.yours.lead}</p>
          <div className="mt-8">
            <BenchEstimator rows={rows} t={t.estimator} numberLocale={NUMBER_LOCALE[locale]} />
          </div>
        </div>
      </section>

      <section className="bg-[#100a1f] py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 lg:grid-cols-2 lg:px-10">
          <div>
            <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-white">{t.method.title}</h2>
            <div className="mt-4 space-y-4 text-[16px] leading-relaxed text-white/65">
              <p>{t.method.p1}</p>
              <p>{formatParts(t.method.p2, { measured })}</p>
              <p>
                {rich(t.method.p3, {
                  link: (text) => (
                    <a href="https://github.com/horizon-rust/horizon/blob/main/docs/benchmark.md" className="text-[#c4b5ff] underline underline-offset-4 hover:text-white">
                      {text}
                    </a>
                  ),
                })}
              </p>
            </div>
          </div>
          <div className="self-start rounded-2xl bg-[#18112c] p-5 sm:p-6">
            <h3 className="text-[17px] font-semibold text-white">{t.own.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-white/60">{t.own.lead}</p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-[#0a0614] px-4 py-3.5 font-mono text-[13.5px] text-[#e7e1ff]">
              <code>{COMMAND}</code>
            </pre>
            <p className="mt-3 flex flex-wrap items-center gap-2">
              <CopyCommand command={COMMAND} label={t.own.copyLabel} text={t.own.copy} copied={t.own.copied} />
              <Link href={localePath(locale, "/docs/performance")} className="inline-flex h-8 items-center px-2 text-[13px] font-medium text-[#c4b5ff] hover:text-white">
                {t.own.docs}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
