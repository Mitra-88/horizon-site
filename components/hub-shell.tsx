"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { readStaffHint, staffDashboards, subscribeStaffHint, type Dashboard } from "@/components/staff/api";

export const TABS = [
  { id: "overview", label: "Overview" },
  { id: "roadmap", label: "Roadmap" },
  { id: "board", label: "Kanban" },
  { id: "journal", label: "Journal" },
  { id: "contribute", label: "Contribute" },
] as const;

type Tab = (typeof TABS)[number]["id"];
const isTab = (id: string): id is Tab => TABS.some((t) => t.id === id);

const DETAIL_KEY = "hub:detail";
const detailListeners = new Set<() => void>();
let detailFallback = "plain";

function readDetail() {
  try {
    return localStorage.getItem(DETAIL_KEY) === "dev" ? "dev" : "plain";
  } catch {
    return detailFallback;
  }
}

function setDetail(mode: "plain" | "dev") {
  detailFallback = mode;
  try {
    localStorage.setItem(DETAIL_KEY, mode);
  } catch {
  }
  detailListeners.forEach((onChange) => onChange());
}

function subscribeDetail(onChange: () => void) {
  detailListeners.add(onChange);
  return () => detailListeners.delete(onChange);
}

const hashListeners = new Set<() => void>();

function subscribeHash(onChange: () => void) {
  hashListeners.add(onChange);
  window.addEventListener("hashchange", onChange);
  return () => {
    hashListeners.delete(onChange);
    window.removeEventListener("hashchange", onChange);
  };
}

const readHash = () => decodeURIComponent(window.location.hash.slice(1));

function setHash(id: string) {
  window.history.replaceState(null, "", `#${id}`);
  hashListeners.forEach((onChange) => onChange());
}

const TAB_CLASS =
  "inline-flex h-9 shrink-0 items-center rounded-lg px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff]";
const TAB_ON = "bg-white text-background";
const TAB_OFF = "text-white/65 hover:bg-white/[0.08] hover:text-white";
const BAR = "sticky top-18 z-30 border-b border-white/[0.08] bg-background/80 backdrop-blur-md";
const BAR_ROW = "mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-10";
export const STAFF_TABS: Record<Dashboard, string> = { team: "Team", mod: "Moderation" };

// The staff's own tabs (/hub/team, /hub/mod), after the public ones: only in a browser that signed in to them.
export function useStaffTabs(): Dashboard[] {
  const hint = useSyncExternalStore(subscribeStaffHint, readStaffHint, () => "");
  return useMemo(() => staffDashboards(hint), [hint]);
}

function StaffTabs({ dashboards, current }: { dashboards: Dashboard[]; current?: string }) {
  if (!dashboards.length) return null;
  return (
    <nav aria-label="Staff" className="flex shrink-0 gap-1 border-l border-white/[0.12] pl-2">
      {dashboards.map((d) => (
        <Link key={d} href={`/hub/${d}`} aria-current={d === current ? "page" : undefined} className={`${TAB_CLASS} ${d === current ? TAB_ON : TAB_OFF}`}>
          {STAFF_TABS[d]}
        </Link>
      ))}
    </nav>
  );
}

// The hub's tab bar on the staff pages: the public tabs lead back to /hub.
export function HubStaffBar({ dashboards, current }: { dashboards: Dashboard[]; current?: string }) {
  return (
    <div className={BAR}>
      <div className={BAR_ROW}>
        <div className="flex min-w-0 items-center gap-1">
          <nav aria-label="Hub" className="-mx-1 flex min-w-0 gap-1 overflow-x-auto px-1">
            {TABS.map((t) => (
              <a key={t.id} href={`/hub#${t.id}`} className={`${TAB_CLASS} ${TAB_OFF}`}>
                {t.label}
              </a>
            ))}
          </nav>
          <StaffTabs dashboards={dashboards} current={current} />
        </div>
      </div>
    </div>
  );
}

export function HubShell({
  areas,
  anchors,
  items,
  children,
}: {
  areas: { id: string; name: string }[];
  anchors: Record<string, string>;
  items: { id: string; area: string; text: string }[];
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState("all");
  const [query, setQuery] = useState("");
  const terms = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const matching = useMemo(() => items.filter((i) => terms.every((t) => i.text.includes(t))), [items, terms]);
  const visible = useMemo(() => new Set(matching.filter((i) => area === "all" || i.area === area).map((i) => i.id)), [matching, area]);
  const countIn = (id: string) => (id === "all" ? matching.length : matching.filter((i) => i.area === id).length);
  const detail = useSyncExternalStore(subscribeDetail, readDetail, () => "plain");
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const held = anchors[hash];
  const tab: Tab = isTab(hash) ? hash : held && isTab(held) ? held : "overview";
  const staff = useStaffTabs();

  useEffect(() => {
    if (!hash || isTab(hash)) return;
    const frame = requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    for (const item of el.querySelectorAll<HTMLElement>("[data-area-item]")) {
      item.hidden = !visible.has(item.id);
    }
    for (const section of el.querySelectorAll<HTMLElement>("[data-roadmap-section]")) {
      section.hidden = !section.querySelector("[data-area-item]:not([hidden])");
    }
  }, [visible]);

  const choose = (next: Tab) => setHash(next);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = TABS[(i + step + TABS.length) % TABS.length].id;
    choose(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <div ref={root} className="hub" data-tab={tab} data-detail={detail}>
      <div className={BAR}>
        <div className={BAR_ROW}>
          <div className="flex min-w-0 items-center gap-1">
            <div role="tablist" aria-label="Hub" className="-mx-1 flex gap-1 overflow-x-auto px-1">
              {TABS.map((t) => {
                const active = t.id === tab;
                return (
                  <button
                    key={t.id}
                    id={`tab-${t.id}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={t.id}
                    tabIndex={active ? 0 : -1}
                    onClick={() => choose(t.id)}
                    onKeyDown={onKeyDown}
                    className={`${TAB_CLASS} ${active ? TAB_ON : TAB_OFF}`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <StaffTabs dashboards={staff} />
          </div>

          <div role="group" aria-label="Detail" className="flex shrink-0 rounded-lg bg-white/[0.06] p-1">
            {(["plain", "dev"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={detail === mode}
                onClick={() => setDetail(mode)}
                className={`h-7 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] ${
                  detail === mode ? "bg-[#6b4bff] text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {mode === "plain" ? "Simple" : "Technical"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pt-10 pb-24 sm:pb-32 lg:px-10">
        {tab === "roadmap" && (
          <div className="mb-8">
            <input
              type="search"
              aria-label="Search the roadmap"
              placeholder="Is it planned? Search the roadmap"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full max-w-md rounded-lg bg-white/[0.06] px-3.5 text-[15px] text-white placeholder:text-white/40 outline-none transition-colors focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-[#a98fff]"
            />
            <div role="group" aria-label="Area" className="mt-3 flex flex-wrap gap-1.5">
              {[{ id: "all", name: "All" }, ...areas].map((a) => {
                const count = countIn(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={area === a.id}
                    onClick={() => setArea(a.id)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] ${
                      area === a.id ? "bg-[#6b4bff]/30 text-[#e4dcff] ring-1 ring-[#a98fff]/40 ring-inset" : "bg-white/[0.05] text-white/60 hover:bg-white/[0.09] hover:text-white"
                    } ${count === 0 && area !== a.id ? "opacity-50" : ""}`}
                  >
                    {a.name}
                    <span className="text-xs tabular-nums opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
            {visible.size === 0 && (
              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/60" role="status">
                Nothing on the roadmap matches{query.trim() ? ` \u201c${query.trim()}\u201d` : ""}
                {area !== "all" ? " in this area" : ""}. Not planned yet? Suggest it in #horizon-ideas on Discord.
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
