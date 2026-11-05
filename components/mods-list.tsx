"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SearchIcon } from "@/components/icons";
import {
  CATEGORIES,
  KIND_NAMES,
  KINDS,
  SORTS,
  SUBMIT_URL,
  categoryLabel,
  downloadsText,
  matches,
  ratingOf,
  sorted,
  type ModSummary,
  type Ratings,
  type Sort,
} from "@/components/mods-logic";
import { ModIcon, Stars } from "@/components/mods-ui";

const SEGMENT = "h-8 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff]";
const segment = (on: boolean) => `${SEGMENT} ${on ? "bg-white text-[#100a1f]" : "text-white/65 hover:text-white"}`;

const isKind = (k: string | null): k is string => k === "all" || KINDS.some(([value]) => value === k);
const isSort = (s: string | null): s is Sort => SORTS.some(([value]) => value === s);

// The filters live in the address (?kind=…&category=…&q=…&sort=…) so a filtered list can be shared. The page is
// prerendered, so they are read after the first render rather than through useSearchParams.
function fromAddress() {
  const q = new URLSearchParams(window.location.search);
  const kind = isKind(q.get("kind")) ? q.get("kind")! : "all";
  const category = q.get("category") ?? "";
  return {
    kind,
    category: CATEGORIES[kind]?.includes(category) ? category : "",
    text: q.get("q") ?? "",
    order: isSort(q.get("sort")) ? (q.get("sort") as Sort) : "downloads",
  };
}

function toAddress(kind: string, category: string, text: string, order: Sort) {
  const q = new URLSearchParams();
  if (kind !== "all") q.set("kind", kind);
  if (category) q.set("category", category);
  if (text.trim()) q.set("q", text.trim());
  if (order !== "downloads") q.set("sort", order);
  const search = q.toString();
  const url = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(window.history.state, "", url);
}

export function ModsList({ projects, ratings }: { projects: ModSummary[]; ratings: Ratings | null }) {
  const [kind, setKind] = useState("all");
  const [category, setCategory] = useState("");
  const [text, setText] = useState("");
  const [order, setOrder] = useState<Sort>("downloads");
  const [read, setRead] = useState(false);
  useEffect(() => {
    const f = fromAddress();
    /* eslint-disable react-hooks/set-state-in-effect -- the address is only readable in the browser */
    setKind(f.kind);
    setCategory(f.category);
    setText(f.text);
    setOrder(f.order);
    setRead(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    if (read) toAddress(kind, category, text, order);
  }, [read, kind, category, text, order]);
  const pickKind = (k: string) => {
    setKind(k);
    if (!CATEGORIES[k]?.includes(category)) setCategory("");
  };
  const shown = useMemo(
    () => sorted(projects.filter((p) => matches(p, kind, text, category)), order, ratings),
    [projects, kind, text, category, order, ratings],
  );
  const tally = useMemo(() => {
    const t: Record<string, number> = { all: projects.length };
    for (const p of projects) t[p.kind] = (t[p.kind] ?? 0) + 1;
    return t;
  }, [projects]);
  const categories = CATEGORIES[kind] ?? [];
  const inCategory = useMemo(() => {
    const t: Record<string, number> = {};
    for (const p of projects) if (p.kind === kind) for (const c of p.categories) t[c] = (t[c] ?? 0) + 1;
    return t;
  }, [projects, kind]);

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="flex h-11 w-full items-center gap-2.5 rounded-lg bg-white/[0.06] px-3.5 transition-colors focus-within:bg-white/[0.09] focus-within:ring-2 focus-within:ring-[#a98fff] md:max-w-sm">
          <SearchIcon className="size-4 shrink-0 text-white/45" />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Search ${projects.length} projects`}
            aria-label="Search mods"
            autoComplete="off"
            spellCheck={false}
            className="h-full w-full min-w-0 bg-transparent text-[15px] text-white outline-none placeholder:text-white/35"
          />
        </label>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href="/mods/policy" className="inline-flex h-11 items-center px-2 text-[15px] font-medium text-white/60 transition-colors hover:text-white">
            Mod policy
          </Link>
          <Link
            href="/docs/make-a-mod"
            className="inline-flex h-11 items-center rounded-lg bg-white/10 px-4 text-[15px] font-medium text-white transition-colors outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#a98fff]"
          >
            Make a mod
          </Link>
          <Link
            href={SUBMIT_URL}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-[15px] font-medium text-[#100a1f] transition-colors outline-none hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-[#a98fff]"
          >
            Submit yours
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div role="group" aria-label="Kind" className="flex flex-wrap gap-1 rounded-lg bg-white/[0.06] p-1 sm:w-fit">
          {[["all", "All"] as const, ...KINDS].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={kind === value} onClick={() => pickKind(value)} className={segment(kind === value)}>
              {label}{" "}
              <span className="ml-1 tabular-nums opacity-55">{tally[value] ?? 0}</span>
            </button>
          ))}
        </div>
        <div role="group" aria-label="Order" className="flex w-fit rounded-lg bg-white/[0.06] p-1">
          {SORTS.map(([value, label]) => (
            <button key={value} type="button" aria-pressed={order === value} onClick={() => setOrder(value)} className={segment(order === value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <label className="mt-3 flex w-full items-center gap-2.5 text-sm text-white/60 sm:w-fit">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded-lg bg-white/[0.06] px-3 text-[15px] text-white outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] sm:w-64 sm:flex-none"
          >
            <option value="" className="bg-[#18112c]">
              Every category
            </option>
            {categories.map((c) => (
              <option key={c} value={c} className="bg-[#18112c]">
                {categoryLabel(c)} ({inCategory[c] ?? 0})
              </option>
            ))}
          </select>
        </label>
      )}

      <p className="mt-5 text-sm text-white/50" aria-live="polite">
        {shown.length === projects.length ? `${projects.length} projects` : `${shown.length} of ${projects.length} projects`}
      </p>

      {shown.length ? (
        <ul className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-2xl bg-[#18112c]">
          {shown.map((p) => {
            const rating = ratingOf(ratings, p.id);
            return (
              <li key={p.id}>
                <Link
                  href={`/mods/${p.id}`}
                  className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-4 gap-y-2 px-4 py-4 transition-colors outline-none hover:bg-white/[0.03] focus-visible:bg-white/[0.05] sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center sm:px-5"
                >
                  <ModIcon id={p.id} icon={p.icon} />
                  <span className="min-w-0">
                    <span className="block text-[16px] font-semibold text-white">{p.name}</span>
                    <span className="mt-0.5 line-clamp-2 block text-[14px] leading-snug text-white/60">{p.summary}</span>
                  </span>
                  <span className="col-start-2 text-[13px] text-white/50 sm:col-start-auto sm:text-right">
                    <span className="flex flex-wrap items-center gap-x-1.5 sm:justify-end">
                      {rating && (
                        <>
                          <Stars rating={rating} className="text-white/70" />
                          <span aria-hidden>·</span>
                        </>
                      )}
                      <span className="tabular-nums">{downloadsText(p.downloads)}</span>
                    </span>
                    <span className="mt-1 block">
                      {KIND_NAMES[p.kind] ?? p.kind} · {p.version}
                      {p.authors.length ? ` · ${p.authors.join(", ")}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3 rounded-2xl bg-[#18112c] px-5 py-10 text-center">
          <p className="text-[15px] text-white/70">
            {text.trim() ? (
              <>
                No project matches &ldquo;{text.trim()}&rdquo;{kind !== "all" ? ` in ${KINDS.find(([k]) => k === kind)?.[1].toLowerCase()}` : ""}
                {category ? `, ${categoryLabel(category).toLowerCase()}` : ""}.
              </>
            ) : category ? (
              `No ${KIND_NAMES[kind]?.toLowerCase() ?? "project"} in ${categoryLabel(category).toLowerCase()} yet.`
            ) : (
              "Nothing here yet."
            )}
          </p>
          <Link href={SUBMIT_URL} className="mt-3 inline-flex text-sm font-medium text-[#c4b5ff] underline underline-offset-4 hover:text-white">
            Submit yours
          </Link>
        </div>
      )}
    </div>
  );
}
