"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { HorizonMark, MinecraftIcon } from "@/components/icons";

const FPS = { horizon: 150, standard: 50 };
const RATIO = FPS.horizon / FPS.standard;

const TRACK_FPS = 400;
const PEAK_FPS = TRACK_FPS * RATIO;

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const INTRO = { delay: 700, duration: 1600 };
const intro: Vars = { "--delay": `${INTRO.delay}ms`, "--dur": `${INTRO.duration}ms` };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function useCountUp(target: number) {
  const [shown, setShown] = useState(target);
  const current = useRef<number | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const first = current.current === null;
    const from = first ? 0 : (current.current ?? target);
    const delay = reduced || !first ? 0 : INTRO.delay;
    const duration = reduced ? 0 : first ? INTRO.duration : 450;
    const begin = performance.now() + delay;
    let frame = 0;

    const tick = (now: number) => {
      const t = duration === 0 ? 1 : clamp((now - begin) / duration, 0, 1);
      const value = Math.round(from + (target - from) * easeOut(t));
      current.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return shown;
}

function Readout({
  icon,
  label,
  value,
  strong,
  className = "",
  style,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  strong?: boolean;
  className?: string;
  style?: Vars;
}) {
  const tone = strong ? "text-white" : "text-white/55";
  const shown = useCountUp(value);
  return (
    <div className="flex items-end justify-between gap-4">
      <span className={`inline-flex items-center gap-2 text-[15px] ${strong ? "font-medium" : ""} ${tone}`}>
        {icon}
        {label}
      </span>
      <span
        className={`font-display text-[2.5rem] leading-none font-semibold tracking-[-0.02em] tabular-nums ${tone} ${className}`}
        style={style}
      >
        <span aria-hidden>{shown}</span>
        <span className="sr-only">{value}</span>
        <span className="ml-1.5 font-sans text-sm font-medium tracking-normal text-white/50">fps</span>
      </span>
    </div>
  );
}

export function FrameRateComparison() {
  const [standard, setStandard] = useState(FPS.standard);
  const [noise, setNoise] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let interval = 0;
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => setNoise(1 + (Math.random() * 2 - 1) * 0.02), 550);
    }, INTRO.delay + INTRO.duration);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  const horizon = Math.round(standard * RATIO * noise);
  const overloaded = horizon > TRACK_FPS;
  const overload = clamp((horizon - TRACK_FPS) / (PEAK_FPS - TRACK_FPS), 0, 1);
  const shake: Vars = { "--amp": 0.4 + overload * 2.2, "--shake": `${0.24 - overload * 0.14}s` };

  return (
    <div id="benchmarks" className="rise w-full max-w-2xl scroll-mt-24 rounded-2xl bg-white/[0.04] p-6 backdrop-blur-xl ring-inset sm:p-8 lg:justify-self-end" style={{ "--delay": "320ms" } as Vars}>
      <p className="text-sm font-medium text-white/60">Benchmarks</p>
      <h2 className="mt-4 font-display text-[2rem] leading-[1.1] font-semibold tracking-[-0.02em] text-white">
        <span className="text-accent">{Math.round(RATIO)}×</span> the frame rate.
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-pretty text-white/60">
        Average frames per second in vanilla 26.3 with no mods installed.
      </p>

      <div className="mt-10 space-y-8">
        <div>
          <Readout
            icon={<HorizonMark className="size-4" />}
            label="Horizon"
            value={horizon}
            strong
            className={overloaded ? "overload-shake" : ""}
            style={{
              "--amp": overload * 1.2,
              "--shake": shake["--shake"],
              textShadow: overloaded ? `0 0 ${8 + overload * 16}px rgb(124 92 255 / ${0.4 + overload * 0.5})` : undefined,
            }}
          />
          <div className={`relative mt-3 h-2 ${overloaded ? "overload-shake" : ""}`} style={shake}>
            <div
              aria-hidden
              className="absolute -inset-1.5 rounded-md bg-[#7c5cff] blur-md transition-opacity duration-300"
              style={{ opacity: overloaded ? 0.3 + overload * 0.5 : 0 }}
            />
            <div className="absolute inset-0 rounded-[2px] bg-white/[0.07]" />
            <div
              className="stat-bar absolute inset-0 rounded-[2px] bg-[linear-gradient(90deg,#6b4bff,#9f86ff_60%,#c9bbff)]"
              style={{ ...intro, "--fill": `${Math.min(1, horizon / TRACK_FPS) * 100}%` } as Vars}
            >
              <div
                className={`absolute inset-0 transition-opacity duration-300 ${overloaded ? "overload-flow" : ""}`}
                style={{ opacity: overloaded ? 1 : 0, "--flow": `${1.2 - overload * 0.9}s` } as Vars}
              />
            </div>
          </div>
        </div>

        <div>
          <Readout icon={<MinecraftIcon className="size-4" />} label="Standard launcher" value={standard} />
          <div className="relative mt-3 h-2 rounded-[2px] bg-white/[0.07]">
            <div
              className="stat-bar absolute inset-0 rounded-[2px] bg-white/30"
              style={{ ...intro, "--fill": `${(standard / TRACK_FPS) * 100}%`, transitionDuration: "80ms" } as Vars}
            />
            <input
              type="range"
              min={0}
              max={TRACK_FPS}
              step={5}
              value={standard}
              onChange={(e) => setStandard(Math.max(10, Number(e.target.value)))}
              aria-label="Standard launcher frame rate"
              aria-valuetext={`${standard} fps`}
              className="fps-range absolute inset-x-0 top-1/2 h-6 w-full -translate-y-1/2"
              style={{ "--delay": `${INTRO.delay + INTRO.duration}ms` } as Vars}
            />
          </div>
        </div>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-white/50">
        Drag the standard launcher bar to try your own frame rate. Results vary with hardware.
      </p>
    </div>
  );
}
