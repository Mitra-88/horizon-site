import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { getBenchmarks, type BenchMachine, type Distance, type GameRun } from "@/components/bench-data";
import { BenchEstimator } from "@/components/bench-estimator";
import { BenchExplorer } from "@/components/bench-explorer";
import { CopyCommand } from "@/components/hub-tools";
import { FrameTrace } from "@/components/frame-trace";
import { pageMetadata } from "@/components/site";

export const metadata = pageMetadata({
  title: "Horizon vs Minecraft Java benchmarks: FPS, memory, loading",
  description:
    "Horizon against Minecraft: Java Edition 26.3 on a 2016 ThinkPad, a Mac mini and a gaming desktop: frame rates, hitches, loading and memory, measured alike.",
  path: "/benchmarks",
});

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;
const fps = (n: number) => Math.round(n).toLocaleString("en-US");
const s = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const gb = (mb: number) => `${(mb / 1024).toFixed(1)} GB`;
const perMin = (n: number) => Math.round(n).toLocaleString("en-US");

function summary(m: BenchMachine) {
  const p = m.runs["12"];
  if (!p) return "";
  const { horizon: h, vanilla: v } = p;
  if (h.hitchesPerMin < 0.5 && v.hitchesPerMin >= 5) return `No hitches at all in Horizon; ${perMin(v.hitchesPerMin)} a minute in Java Edition.`;
  if (h.hitchesPerMin < v.hitchesPerMin * 0.75) return `About ${Math.round((1 - h.hitchesPerMin / v.hitchesPerMin) * 10) * 10}% fewer hitches, and ${fps(h.avgFps)} FPS on average against ${fps(v.avgFps)}.`;
  const far = m.runs["32"];
  const lead = h.avgFps > v.avgFps * 1.03 ? `Horizon averages ${Math.round((h.avgFps / v.avgFps - 1) * 100)}% more FPS at render distance 12` : "Both games average about the same at render distance 12";
  const javaFar = far && !far.horizon.capped && far.vanilla.avgFps > far.horizon.avgFps * 1.03;
  return `Smooth in both. ${lead}${javaFar ? "; Java Edition is faster at 32" : ""}.`;
}

type Loss = { machine: string; rd: Distance; what: string; java: string; horizon: string };

function losses(machines: BenchMachine[]) {
  const out: Loss[] = [];
  for (const m of machines) {
    for (const rd of ["12", "32"] as const) {
      const p = m.runs[rd];
      if (!p) continue;
      const h: GameRun = p.horizon;
      const v: GameRun = p.vanilla;
      const add = (what: string, java: string, horizon: string) => out.push({ machine: m.name, rd, what, java, horizon });
      if (!h.capped && v.avgFps > h.avgFps * 1.03) add("Average frame rate", `${fps(v.avgFps)} FPS`, `${fps(h.avgFps)} FPS`);
      if (v.low1 > h.low1 * 1.03) add("Frame rate in the worst moments", `${fps(v.low1)} FPS`, `${fps(h.low1)} FPS`);
      if (v.hitchesPerMin < h.hitchesPerMin * 0.8 && h.hitchesPerMin - v.hitchesPerMin > 5) add("Hitches a minute", perMin(v.hitchesPerMin), perMin(h.hitchesPerMin));
      if (v.worldMs < h.worldMs * 0.97) add("From launch into the world", s(v.worldMs), s(h.worldMs));
      if (v.chunkMs < h.chunkMs * 0.97) add("Loading new terrain", s(v.chunkMs), s(h.chunkMs));
      if (v.ramSteady < h.ramSteady * 0.97) add("Memory in use", gb(v.ramSteady), gb(h.ramSteady));
    }
  }
  return out;
}

const COMMAND = "horizon-client --benchmark standard --render-distance 12";

export default async function BenchmarksPage() {
  const { machines, rows } = await getBenchmarks();
  const lost = losses(machines);
  const measured = machines[0]?.measured;
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
              <span className="block">Horizon against</span>
              <span className="text-accent block pb-1">Java Edition.</span>
            </h1>
            <p className="rise mt-6 max-w-xl text-lg leading-relaxed text-white/70" style={delay(100)}>
              The same three computers ran both games through the same world, on the same flight path, with the same settings. Here is what you would
              notice, in plain words, including where Java Edition still wins.
            </p>
            <p className="rise mt-6 flex flex-wrap gap-2" style={delay(180)}>
              <a href="#computers" className="inline-flex h-11 items-center rounded-lg bg-white px-5 text-[15px] font-medium text-[#100a1f] transition-colors hover:bg-white/90">
                Compare a computer
              </a>
              <a href="#yours" className="inline-flex h-11 items-center rounded-lg bg-white/10 px-5 text-[15px] font-medium text-white transition-colors hover:bg-white/15">
                Estimate yours
              </a>
            </p>
          </div>

          <ul className="rise space-y-2" style={delay(240)} aria-label="In short">
            {machines.map((m) => (
              <li key={m.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-4 rounded-2xl bg-[#140d26]/80 p-3 pr-4">
                <span className="flex h-12 items-center justify-center">
                  <Image src={m.image.src} width={m.image.width} height={m.image.height} alt="" sizes="72px" className="max-h-full w-auto object-contain" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">{m.name}</span>
                  <span className="block text-[13px] leading-snug text-white/60">{summary(m)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <BenchExplorer machines={machines} />

      <section className="bg-[#100a1f] py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:px-10">
          <div>
            <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-white">
              Where Java Edition is still faster
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-white/60">
              Every case in these runs where the original game did better. Steadier frames at long render distances is on the{" "}
              <Link href="/hub#roadmap" className="text-[#c4b5ff] underline underline-offset-4 hover:text-white">
                roadmap
              </Link>{" "}
              as work being done now.
            </p>
          </div>
          <ul className="divide-y divide-white/[0.06] rounded-2xl bg-[#18112c]">
            {lost.map((l) => (
              <li key={`${l.machine}-${l.rd}-${l.what}`} className="grid gap-1 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:px-6">
                <span>
                  <span className="block text-[15px] font-medium text-white">{l.what}</span>
                  <span className="block text-[13px] text-white/50">
                    {l.machine}, render distance {l.rd}
                  </span>
                </span>
                <span className="text-sm tabular-nums">
                  <span className="text-white">Java Edition {l.java}</span>
                  <span className="mx-2 text-white/25">/</span>
                  <span className="text-white/55">Horizon {l.horizon}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="yours" className="scroll-mt-20 bg-[#0c0718] py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-white">What about your computer?</h2>
          <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-white/60">
            Pick your graphics card and processor. The estimate starts from the measured computer closest to yours and scales it by the chips&apos;
            specifications, so it is a range, not a promise.
          </p>
          <div className="mt-8">
            <BenchEstimator rows={rows} />
          </div>
        </div>
      </section>

      <section className="bg-[#100a1f] py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 lg:grid-cols-2 lg:px-10">
          <div>
            <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-white">How it was measured</h2>
            <div className="mt-4 space-y-4 text-[16px] leading-relaxed text-white/65">
              <p>
                Each game starts from a fresh world (seed 1234, creative), waits until every chunk around the spawn is loaded and drawn, then visits a
                village, a forest, an ocean and a mountain. At each it waits for the terrain, holds for 2 seconds and flies a straight 192-block path in
                12 seconds, recording every frame.
              </p>
              <p>
                VSync off, no frame cap, a 1280x720 window, simulation distance 12, everything else at vanilla&apos;s defaults. Java Edition 26.3 runs as
                players get it, with the official launcher&apos;s Java options. Each figure is the median over the runs
                {measured ? `, measured on ${measured}` : ""}.
              </p>
              <p>
                The full method and its caveats are in{" "}
                <a href="https://github.com/horizon-rust/horizon/blob/main/docs/benchmark.md" className="text-[#c4b5ff] underline underline-offset-4 hover:text-white">
                  docs/benchmark.md
                </a>
                .
              </p>
            </div>
          </div>
          <div className="self-start rounded-2xl bg-[#18112c] p-5 sm:p-6">
            <h3 className="text-[17px] font-semibold text-white">Benchmark your own computer</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-white/60">
              Run this in a terminal. It flies the same path and writes a report to the benchmarks folder of the game folder. Share it on Discord and
              your machine helps make these numbers better.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-[#0a0614] px-4 py-3.5 font-mono text-[13.5px] text-[#e7e1ff]">
              <code>{COMMAND}</code>
            </pre>
            <p className="mt-3 flex flex-wrap items-center gap-2">
              <CopyCommand command={COMMAND} label="Copy the benchmark command" text="Copy the command" />
              <Link href="/docs/performance" className="inline-flex h-8 items-center px-2 text-[13px] font-medium text-[#c4b5ff] hover:text-white">
                More in the docs
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
