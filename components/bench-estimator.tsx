"use client";

import { useMemo, useState } from "react";
import { CPUS, estimate, GPUS, type EstimateRow, type Range } from "@/components/bench-estimate";
import { benchNumbers } from "@/components/bench-format";
import type { Messages } from "@/components/i18n";
import { format, formatParts } from "@/components/i18n-text";
import { SearchSelect, type SearchOption } from "@/components/search-select";

type T = Messages["benchmarks"]["estimator"];

const round = (n: number) => (n >= 100 ? Math.round(n / 10) * 10 : Math.round(n));

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

export function BenchEstimator({ rows, t, numberLocale }: { rows: EstimateRow[]; t: T; numberLocale: string }) {
  const n = benchNumbers(numberLocale);
  const gpuOptions: SearchOption[] = GPUS.map((g) => ({ value: g.name, label: g.name, detail: format(t.tflops, { n: n.plain(g.tflops) }), match: g.match }));
  const cpuOptions: SearchOption[] = CPUS.map((c) => ({ value: c.name, label: c.name, detail: format(t.ghz, { n: n.plain(c.ghz) }), match: c.match }));
  const whole = (x: number) => n.int(round(x));
  const rangeText = (r: Range) => (r.atLeast ? format(t.atLeast, { n: whole(r.low) }) : format(t.range, { low: whole(r.low), high: whole(r.high ?? r.low) }));
  const machineName = (machine: string) => t.machines[machine as keyof T["machines"]] ?? machine;
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
        <SearchSelect label={t.gpu} text={t.gpuSelect} value={gpuName} options={gpuOptions} onChange={setGpuName} />
        <SearchSelect label={t.cpu} text={t.cpuSelect} value={cpuName} options={cpuOptions} onChange={setCpuName} />
        <fieldset>
          <legend className="text-sm font-medium text-white/80">{t.renderDistance}</legend>
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
              {formatParts(horizon.exact ? t.headlineExact : t.headline, { h: rangeText(horizon.low1), v: rangeText(vanilla.low1) })}
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
                      {formatParts(t.line, { range: rangeText(est.avg), low: Math.round(est.world.low / 1000), high: Math.round((est.world.high ?? est.world.low) / 1000) })}
                    </span>
                  </p>
                  <div className="mt-2">
                    <RangeBar range={est.avg} max={max} color={color} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[13px] leading-relaxed text-white/50">
              {format(horizon.exact ? t.measured : t.scaled, { machine: machineName(horizon.base.machine) })} {t.caveat}
              {horizon.avg.atLeast && t.floor}
            </p>
          </>
        ) : (
          <p className="text-[15px] text-white/60">{t.none}</p>
        )}
      </div>
    </div>
  );
}
