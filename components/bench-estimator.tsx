"use client";

import { useMemo, useState } from "react";
import { CPUS, estimate, GPUS, type EstimateRow, type Range } from "@/components/bench-estimate";
import { SearchSelect, type SearchOption } from "@/components/search-select";

const GPU_OPTIONS: SearchOption[] = GPUS.map((g) => ({ value: g.name, label: g.name, detail: `${g.tflops} TFLOPS`, match: g.match }));
const CPU_OPTIONS: SearchOption[] = CPUS.map((c) => ({ value: c.name, label: c.name, detail: `${c.ghz} GHz`, match: c.match }));
const MACHINE_NAMES: Record<string, string> = {
  "ThinkPad (i7-7500U, HD Graphics 620)": "the ThinkPad laptop",
  "Mac mini (M4 Pro)": "the Mac mini",
  "Desktop (RTX 4080, i7-13700KF)": "the gaming desktop",
};

const round = (n: number) => (n >= 100 ? Math.round(n / 10) * 10 : Math.round(n));
const rangeText = (r: Range) =>
  r.atLeast ? `at least ${round(r.low).toLocaleString("en-US")}` : `${round(r.low).toLocaleString("en-US")} to ${round(r.high ?? r.low).toLocaleString("en-US")}`;

function RangeBar({ range, max, color }: { range: Range; max: number; color: string }) {
  const left = (range.low / max) * 100;
  const right = ((range.high ?? max) / max) * 100;
  return (
    <div className="relative h-3 rounded-[4px] bg-white/[0.05]">
      <div
        className="absolute inset-y-0 rounded-[4px] transition-all duration-500"
        style={{ left: `${left}%`, width: `${Math.max(1.5, right - left)}%`, background: color, opacity: range.atLeast ? 0.45 : 1 }}
      />
    </div>
  );
}

export function BenchEstimator({ rows }: { rows: EstimateRow[] }) {
  const [gpuName, setGpuName] = useState("NVIDIA GeForce RTX 3060");
  const [cpuName, setCpuName] = useState("AMD Ryzen 5 5600X");
  const [rd, setRd] = useState(12);
  const gpu = GPUS.find((g) => g.name === gpuName)!;
  const cpu = CPUS.find((c) => c.name === cpuName)!;
  const horizon = useMemo(() => estimate(rows, gpu, cpu, rd, "horizon"), [rows, gpu, cpu, rd]);
  const vanilla = useMemo(() => estimate(rows, gpu, cpu, rd, "vanilla"), [rows, gpu, cpu, rd]);
  const max = Math.max(horizon?.avg.high ?? horizon?.avg.low ?? 0, vanilla?.avg.high ?? vanilla?.avg.low ?? 0, 60) * 1.05;

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <form className="space-y-4 rounded-2xl bg-[#18112c] p-5 sm:p-6" onSubmit={(e) => e.preventDefault()}>
        <SearchSelect label="Graphics card" noun="graphics card" value={gpuName} options={GPU_OPTIONS} onChange={setGpuName} />
        <SearchSelect label="Processor" noun="processor" value={cpuName} options={CPU_OPTIONS} onChange={setCpuName} />
        <fieldset>
          <legend className="text-sm font-medium text-white/80">Render distance</legend>
          <div className="mt-2 flex rounded-lg bg-white/[0.06] p-1">
            {[12, 32].map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={rd === d}
                onClick={() => setRd(d)}
                className={`h-9 flex-1 rounded-md text-sm font-medium transition-colors ${rd === d ? "bg-white text-[#100a1f]" : "text-white/65 hover:text-white"}`}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>
      </form>

      <div className="rounded-2xl bg-[#18112c] p-5 sm:p-6" aria-live="polite">
        {horizon && vanilla ? (
          <>
            <p className="font-display text-[clamp(1.25rem,2.2vw,1.6rem)] leading-snug font-medium tracking-[-0.015em] text-white">
              {horizon.exact ? "Measured on this exact pair: " : "Expect roughly "}
              {rangeText(horizon.low1)} FPS in Horizon&apos;s worst moments, against {rangeText(vanilla.low1)} in Java Edition.
            </p>
            <div className="mt-6 space-y-5">
              {(
                [
                  ["Horizon", horizon, "#a98fff"],
                  ["Java Edition", vanilla, "#8b8499"],
                ] as const
              ).map(([name, est, color]) => (
                <div key={name}>
                  <p className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                    <span className="font-medium text-white">{name}</span>
                    <span className="text-white/60 tabular-nums">
                      {rangeText(est.avg)} FPS on average · in the world in {Math.round(est.world.low / 1000)} to {Math.round((est.world.high ?? est.world.low) / 1000)} s
                    </span>
                  </p>
                  <div className="mt-2">
                    <RangeBar range={est.avg} max={max} color={color} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[13px] leading-relaxed text-white/50">
              {horizon.exact
                ? `These are the figures measured on ${MACHINE_NAMES[horizon.base.machine] ?? horizon.base.machine}.`
                : `Scaled from ${MACHINE_NAMES[horizon.base.machine] ?? horizon.base.machine}, the measured computer closest to yours, by the two chips' published specifications.`}{" "}
              Drivers, cooling and the operating system can matter as much as the chip, so treat it as a rough idea and run the benchmark below for your real figure.
              {horizon.avg.atLeast && " Horizon's average there was held back by the display, so the estimate only gives a floor."}
            </p>
          </>
        ) : (
          <p className="text-[15px] text-white/60">No measured computer at this render distance to estimate from yet.</p>
        )}
      </div>
    </div>
  );
}
