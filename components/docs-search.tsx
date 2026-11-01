"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { DocIndexEntry, DocSection } from "@/components/docs-data";

type Result = { href: string; title: string; context: string; rank: number; snippet?: string; term?: string };

const MAX_RESULTS = 10;

function normalise(text: string) {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

function matches(text: string, terms: string[]) {
  const value = normalise(text);
  return terms.every((t) => value.includes(t));
}

function snippet(text: string, term: string) {
  const at = text.toLowerCase().indexOf(term);
  if (at < 0) return text.slice(0, 140);
  const start = Math.max(0, text.lastIndexOf(" ", Math.max(0, at - 50)) + 1);
  const end = Math.min(text.length, text.indexOf(" ", at + term.length + 90) > 0 ? text.indexOf(" ", at + term.length + 90) : text.length);
  return `${start > 0 ? "\u2026" : ""}${text.slice(start, end)}${end < text.length ? "\u2026" : ""}`;
}

function Snippet({ text, term }: { text: string; term: string }) {
  const at = text.toLowerCase().indexOf(term);
  if (at < 0 || !term) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="font-medium text-white/90">{text.slice(at, at + term.length)}</span>
      {text.slice(at + term.length)}
    </>
  );
}

function search(index: DocIndexEntry[], sections: DocSection[], query: string): Result[] {
  const terms = normalise(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const results: Result[] = [];
  for (const doc of index) {
    if (matches(doc.title, terms)) results.push({ href: doc.path, title: doc.title, context: doc.group, rank: 0 });
    for (const h of doc.headings) {
      if (matches(h.text, terms)) results.push({ href: `${doc.path}#${h.id}`, title: h.text, context: doc.title, rank: 1 });
    }
    if (!matches(doc.title, terms) && matches(doc.lede, terms)) results.push({ href: doc.path, title: doc.title, context: doc.group, rank: 2 });
  }
  const seen = new Set(results.map((r) => r.href));
  const longest = [...terms].sort((a, b) => b.length - a.length)[0];
  for (const section of sections) {
    if (seen.has(section.href) || !matches(`${section.heading} ${section.text}`, terms)) continue;
    seen.add(section.href);
    results.push({ href: section.href, title: section.heading, context: section.page, rank: 3, snippet: snippet(section.text, longest), term: longest });
  }
  return results.sort((a, b) => a.rank - b.rank).slice(0, MAX_RESULTS);
}

export function DocsSearch({ index, onNavigate }: { index: DocIndexEntry[]; onNavigate?: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<DocSection[]>([]);
  const loading = useRef(false);
  const results = useMemo(() => search(index, sections, query), [index, sections, query]);

  const loadSections = () => {
    if (loading.current) return;
    loading.current = true;
    fetch("/docs-index.json")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: DocSection[]) => setSections(data))
      .catch(() => {
        loading.current = false;
      });
  };

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        if (!input.current || input.current.offsetParent === null) return;
        e.preventDefault();
        input.current.focus();
        input.current.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (result: Result) => {
    setOpen(false);
    setQuery("");
    input.current?.blur();
    onNavigate?.();
    router.push(result.href);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + results.length) % results.length);
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      input.current?.blur();
    }
  };

  const showList = open && query.trim().length > 0;

  return (
    <div className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search the docs
      </label>
      <input
        ref={input}
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder="Search the docs"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          loadSections();
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-lg bg-white/[0.06] pr-10 pl-3.5 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-[#a98fff] [&::-webkit-search-cancel-button]:appearance-none"
      />
      <kbd
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 hidden h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded bg-white/[0.08] px-1.5 font-sans text-[11px] font-medium text-white/50 lg:inline-flex"
      >
        /
      </kbd>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Results"
          className="absolute top-12 left-0 z-40 max-h-[65vh] w-full overflow-y-auto rounded-xl bg-[#1c1433] p-1.5 ring-1 ring-white/[0.08] lg:w-[30rem]"
        >
          {results.length ? (
            results.map((r, i) => (
              <li
                key={r.href + r.rank}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(r);
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer rounded-lg px-3 py-2 ${i === active ? "bg-white/[0.08]" : ""}`}
              >
                <span className="block text-sm font-medium text-white">{r.title}</span>
                <span className="mt-0.5 block text-xs text-white/45">{r.context}</span>
                {r.snippet && (
                  <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-white/55">
                    <Snippet text={r.snippet} term={r.term ?? ""} />
                  </span>
                )}
              </li>
            ))
          ) : (
            <li className="px-3 py-2.5 text-sm text-white/55">Nothing matches &ldquo;{query.trim()}&rdquo;.</li>
          )}
        </ul>
      )}
    </div>
  );
}
