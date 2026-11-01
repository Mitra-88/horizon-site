"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { ReleaseKind } from "@/components/github-releases";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";

const KEY = "horizon:seen-releases";
const listeners = new Set<() => void>();
let fallback = "";

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read() {
  try {
    return localStorage.getItem(KEY) ?? fallback;
  } catch {
    return fallback;
  }
}

const parse = (raw: string) => new Set(raw.split(",").filter(Boolean).map(Number));

function update(change: (seen: Set<number>) => void) {
  const seen = parse(read());
  const before = seen.size;
  change(seen);
  if (seen.size === before) return;
  fallback = [...seen].join(",");
  try {
    localStorage.setItem(KEY, fallback);
  } catch {
  }
  listeners.forEach((onChange) => onChange());
}

const markSeen = (ids: number[]) => update((seen) => ids.forEach((id) => seen.add(id)));
const markUnseen = (id: number) => update((seen) => seen.delete(id));

function useSeen() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  return useMemo(() => (raw === null ? null : parse(raw)), [raw]);
}

const viewListeners = new Set<() => void>();
let views: Record<string, number> | null = null;
let loadingViews = false;
const counted = new Set<number>();

function notifyViews() {
  viewListeners.forEach((onChange) => onChange());
}

function subscribeViews(onChange: () => void) {
  viewListeners.add(onChange);
  if (!views && !loadingViews) {
    loadingViews = true;
    fetch("/api/releases/views")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json && typeof json.views === "object") {
          views = { ...json.views, ...views };
          notifyViews();
        }
      })
      .catch(() => {})
      .finally(() => {
        loadingViews = false;
      });
  }
  return () => {
    viewListeners.delete(onChange);
  };
}

function countView(id: number) {
  if (counted.has(id)) return;
  counted.add(id);
  fetch("/api/releases/views", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (json && Number.isSafeInteger(json.views)) {
        views = { ...views, [id]: json.views };
        notifyViews();
      }
    })
    .catch(() => counted.delete(id));
}

export function ReleaseViews({ id }: { id: number }) {
  const all = useSyncExternalStore(subscribeViews, () => views, () => null);
  if (!all) return null;
  const n = all[id] ?? 0;
  return (
    <>
      <span aria-hidden className="mx-2 text-white/30">
        ·
      </span>
      <span className="tabular-nums">
        {n.toLocaleString("en-US")} view{n === 1 ? "" : "s"}
      </span>
    </>
  );
}

export function useUnseenCount(ids: number[]) {
  const seen = useSeen();
  return seen ? ids.filter((id) => !seen.has(id)).length : 0;
}

type Filter = "all" | ReleaseKind;

const TABS: { filter: Filter; label: string }[] = [
  { filter: "all", label: "All" },
  { filter: "horizon", label: "Horizon" },
  { filter: "launcher", label: "Launcher" },
  { filter: "nightly", label: "Nightly" },
];

export function ReleaseList({ entries, children }: { entries: { id: number; kind: ReleaseKind }[]; children: ReactNode }) {
  const [filter, setFilter] = useState<Filter>("all");
  const seen = useSeen();
  const shown = filter === "all" ? entries : entries.filter((e) => e.kind === filter);
  const unseen = seen ? shown.filter((e) => !seen.has(e.id)) : [];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => {
            const count = tab.filter === "all" ? entries.length : entries.filter((e) => e.kind === tab.filter).length;
            const active = filter === tab.filter;
            return (
              <button
                key={tab.filter}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(tab.filter)}
                className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#a98fff] focus-visible:outline-none ${
                  active ? "bg-white text-background" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white"
                }`}
              >
                {tab.label}
                <span className={`tabular-nums ${active ? "text-background/55" : "text-white/40"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-sm">
          {seen && (
            <span aria-live="polite" className={unseen.length ? "font-medium text-[#a98fff]" : "text-white/50"}>
              {unseen.length ? `${unseen.length} new` : "All caught up"}
            </span>
          )}
          <button
            type="button"
            disabled={!unseen.length}
            onClick={() => markSeen(unseen.map((e) => e.id))}
            className="rounded-md text-white/70 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[#a98fff] focus-visible:outline-none"
          >
            Mark all as seen
          </button>
        </div>
      </div>

      <ul data-filter={filter} className="release-list mt-6 border-t border-white/[0.08]">
        {children}
      </ul>
    </>
  );
}

export function ReleaseItem({ id, summary, children }: { id: number; summary: ReactNode; children: ReactNode }) {
  const seen = useSeen();
  const isSeen = seen?.has(id) ?? false;
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const openFromHash = () => {
      if (ref.current && window.location.hash === `#release-${id}`) ref.current.open = true;
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [id]);

  return (
    <details
      ref={ref}
      id={`release-${id}`}
      data-seen={isSeen || undefined}
      onToggle={(e) => {
        if (e.currentTarget.open) {
          markSeen([id]);
          countView(id);
        }
      }}
      className="group scroll-mt-24"
    >
      <summary className="flex cursor-pointer list-none items-start gap-4 rounded-md py-5 outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className={`mt-2 size-2 shrink-0 rounded-full transition-colors ${seen && !isSeen ? "bg-[#a98fff] shadow-[0_0_10px_#a98fff]" : "bg-white/10"}`}
        />
        <span className="min-w-0 flex-1">{summary}</span>
        {seen &&
          (isSeen ? (
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs text-white/40">
              <CheckIcon className="size-3.5" />
              Seen
            </span>
          ) : (
            <span className="mt-0.5 shrink-0 rounded-md bg-[#a98fff]/15 px-2 py-0.5 text-xs font-medium text-[#c9bbff]">
              New
            </span>
          ))}
        <ChevronDownIcon className="mt-1 size-4 shrink-0 text-white/40 transition-transform group-open:rotate-180" />
      </summary>

      <div className="pb-8 pl-6">
        {children}
        {isSeen && (
          <button
            type="button"
            onClick={() => markUnseen(id)}
            className="mt-4 block rounded-md text-sm text-white/45 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-[#a98fff] focus-visible:outline-none"
          >
            Mark as unseen
          </button>
        )}
      </div>
    </details>
  );
}
