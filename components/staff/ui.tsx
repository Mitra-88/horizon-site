"use client";

import { Component, useRef, type KeyboardEvent, type ReactNode } from "react";
import { safeLink } from "@/components/staff/api";

export const FIELD =
  "w-full rounded-lg bg-white/[0.06] px-3.5 text-[15px] text-white placeholder:text-white/35 outline-none transition-colors focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-[#a98fff]";
export const INPUT = `${FIELD} h-10`;
export const AREA = `${FIELD} py-2.5 leading-relaxed`;
const BASE = "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] disabled:cursor-not-allowed disabled:opacity-50";
export const PRIMARY = `${BASE} h-10 bg-white px-4 text-sm text-[#100a1f] hover:bg-white/90`;
export const PRIMARY_SM = `${BASE} h-8 bg-white px-3 text-[13px] text-[#100a1f] hover:bg-white/90`;
export const SECONDARY = `${BASE} h-10 bg-white/10 px-4 text-sm text-white hover:bg-white/15`;
export const SECONDARY_SM = `${BASE} h-8 bg-white/10 px-3 text-[13px] text-white hover:bg-white/15`;
export const GHOST_SM = `${BASE} h-8 px-2.5 text-[13px] text-white/60 hover:bg-white/[0.06] hover:text-white`;
export const CARD = "rounded-2xl bg-[#18112c] p-5 sm:p-6";
export const LINK = "text-[#c4b5ff] underline decoration-[#c4b5ff]/40 underline-offset-4 transition-colors hover:text-white";
export const BADGE = "inline-flex items-center rounded-md bg-white/[0.07] px-2 py-0.5 text-xs font-medium text-white/75";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-white/70">{label}</span>
      {children}
    </label>
  );
}

export function LinkText({ link }: { link?: string | null }) {
  const safe = safeLink(link);
  if (!safe) return null;
  return safe.href ? (
    <a href={safe.href} rel="noreferrer" className={LINK}>
      {safe.label}
    </a>
  ) : (
    <span>{safe.label}</span>
  );
}

export function Lines({ text, className = "" }: { text?: string | null; className?: string }) {
  if (!text) return null;
  return <p className={`whitespace-pre-line ${className}`}>{text}</p>;
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-white/60">{children}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-white/[0.03] px-4 py-6 text-center text-sm text-white/50">{children}</p>;
}

export function Status({ text }: { text?: string }) {
  return (
    <span role="status" className="text-[13px] text-white/55">
      {text}
    </span>
  );
}

export class Guard extends Component<{ what: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error(`staff: ${this.props.what}`, error);
  }
  render() {
    if (this.state.error) {
      return (
        <p role="alert" className="rounded-xl bg-[#f07a6a]/10 px-4 py-3 text-sm text-[#f7b2a8]">
          {this.props.what} couldn&apos;t be shown ({this.state.error.message}). The rest of the dashboard works; tell the Team if this stays.
        </p>
      );
    }
    return this.props.children;
  }
}

export type Tab = { id: string; label: string; count?: number };

export function Tabs({ tabs, active, onSelect, label }: { tabs: Tab[]; active: string; onSelect: (id: string) => void; label: string }) {
  const list = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.id === active);
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(i + step + tabs.length) % tabs.length];
    onSelect(next.id);
    list.current?.querySelector<HTMLButtonElement>(`#tab-${next.id}`)?.focus();
  };
  return (
    <div ref={list} role="tablist" aria-label={label} onKeyDown={onKey} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={`panel-${t.id}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onSelect(t.id)}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] ${
              on ? "bg-white text-[#100a1f]" : "text-white/65 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {t.label}
            {t.count ? <span className={`rounded-md px-1.5 text-xs tabular-nums ${on ? "bg-[#100a1f]/10" : "bg-[#a98fff]/20 text-[#d8ceff]"}`}>{t.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function Panel({ id, active, children }: { id: string; active: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} hidden={id !== active} className="pt-6">
      {id === active ? children : null}
    </div>
  );
}
