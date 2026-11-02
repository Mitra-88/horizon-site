"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { HTMLAttributes, ReactNode } from "react";

export const PLAY = "inline-flex items-center justify-center gap-2.5 rounded-[14px] bg-(--accent) font-semibold text-(--on-accent) transition-[filter] hover:brightness-110 disabled:pointer-events-none disabled:opacity-50";
export const SOLID = "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-white px-4 text-[14px] font-medium text-[#100a1f] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40";
export const QUIET = "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-white/[0.08] px-3.5 text-[14px] font-medium text-white transition-colors hover:bg-white/[0.14] disabled:pointer-events-none disabled:opacity-40";
export const TEXT_BUTTON = "inline-flex h-9 shrink-0 items-center gap-2 text-[15px] text-white/80 transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-40";
export const ICON_BUTTON = "inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] text-white/65 transition-colors hover:bg-white/[0.08] hover:text-white";
export const BIG_ICON = "inline-flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-white/[0.08] text-white/80 transition-colors hover:bg-white/[0.13] hover:text-white disabled:pointer-events-none disabled:opacity-40";
export const ROW = "flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]";
export const FIELD = "rounded-[10px] bg-white/[0.07] outline-none focus:bg-white/[0.11]";
export const POPOVER = "hzl-float hzl-pop rounded-[16px] p-1.5";
export const CARD_TITLE = "text-[16px] font-semibold tracking-[-0.01em]";
export const CARD_NOTE = "mt-0.5 text-[13px] text-white/60";

export function Icon({ icon, size = 18, className }: { icon: IconSvgElement; size?: number; className?: string }) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={1.6} className={className} />;
}

export function Glass({ className = "", children, ...rest }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section className={`hzl-glass rounded-[20px] ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className}>
      <path fill="#fff" d="M4 3h2v4H4zM10 3h2v4h-2z" />
      <path fill="#fff" opacity="0.4" d="M4 8h2v4H4zM10 8h2v4h-2z" />
      <path style={{ fill: "var(--accent-soft, #a98fff)" }} d="M1 7h14v1H1z" />
    </svg>
  );
}

export function MarkTile({ size }: { size: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center bg-[#0c0818]" style={{ width: size, height: size, borderRadius: Math.round(size * 0.26) }}>
      <Mark className="w-[64%]" />
    </span>
  );
}

export function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 21 21" aria-hidden className={className}>
      <path fill="#f25022" d="M0 0h10v10H0z" />
      <path fill="#7fba00" d="M11 0h10v10H11z" />
      <path fill="#00a4ef" d="M0 11h10v10H0z" />
      <path fill="#ffb900" d="M11 11h10v10H11z" />
    </svg>
  );
}

export function Dot({ tone }: { tone: "live" | "busy" | "warn" | "accent" | "off" }) {
  const color =
    tone === "live" ? "bg-(--live)" : tone === "busy" ? "animate-pulse bg-(--warn)" : tone === "warn" ? "bg-(--warn)" : tone === "accent" ? "bg-(--accent-soft)" : "bg-white/35";
  return <span aria-hidden className={`inline-block size-[7px] shrink-0 rounded-full ${color}`} />;
}

export function Bar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`block h-1 overflow-hidden rounded-full bg-white/[0.12] ${className}`}>
      <span className="block h-full rounded-full bg-(--accent-soft) transition-[width] duration-200" style={{ width: `${Math.round(value * 100)}%` }} />
    </span>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? "bg-(--accent)" : "bg-white/[0.14]"}`}
    >
      <span className={`absolute top-1 left-1 size-4 rounded-full transition-[translate,opacity,background-color] duration-200 ${on ? "translate-x-4 bg-(--on-accent)" : "bg-white opacity-70"}`} />
    </button>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  format: (value: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-6 w-44 items-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-(--accent-soft) sm:w-52">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.12]">
          <div className="h-full rounded-full bg-(--accent-soft)" style={{ width: `${pct}%` }} />
        </div>
        <div className="pointer-events-none absolute size-4 rounded-full bg-white" style={{ left: `calc(${pct}% - ${pct * 0.16}px)` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
        />
      </div>
      <span className="w-12 text-right text-[13px] text-white/60 tabular-nums">{format(value)}</span>
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "md",
}: {
  value: T;
  options: { id: T; label: string; count?: number; disabled?: boolean; hint?: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
  size?: "md" | "sm";
}) {
  return (
    <div role="tablist" aria-label={label} className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === value}
          disabled={o.disabled}
          onClick={() => onChange(o.id)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-[10px] transition-colors disabled:cursor-not-allowed ${
            size === "md" ? "h-9 px-3.5 text-[15px]" : "h-8 px-3 text-[13px]"
          } ${o.id === value ? "bg-white/[0.12] font-medium text-white" : "text-white/70 enabled:hover:text-white disabled:text-white/35"}`}
        >
          {o.icon}
          {o.label}
          {o.count !== undefined && o.count > 0 && <span className="text-white/45 tabular-nums">{o.count}</span>}
          {o.hint && <span className="text-white/35">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}
