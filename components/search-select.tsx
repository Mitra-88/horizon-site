"use client";

import { useEffect, useId, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "@/components/icons";

export type SearchOption = { value: string; label: string; detail?: string; match?: RegExp };

const words = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean);

function filter(options: SearchOption[], query: string) {
  const wanted = words(query);
  if (!wanted.length) return options;
  const raw = query.trim();
  return options.filter((o) => {
    const label = o.label.toLowerCase();
    return wanted.every((w) => label.includes(w)) || Boolean(o.match?.test(raw));
  });
}

function Highlight({ text, query }: { text: string; query: string }) {
  const wanted = words(query);
  if (!wanted.length) return text;
  const lower = text.toLowerCase();
  const hit = new Array<boolean>(text.length).fill(false);
  for (const w of wanted) {
    for (let i = lower.indexOf(w); i >= 0; i = lower.indexOf(w, i + w.length)) hit.fill(true, i, i + w.length);
  }
  const parts: { text: string; hit: boolean }[] = [];
  let from = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || hit[i] !== hit[from]) {
      parts.push({ text: text.slice(from, i), hit: hit[from] });
      from = i;
    }
  }
  return parts.map((p, i) =>
    p.hit ? (
      <span key={i} className="font-semibold text-white">
        {p.text}
      </span>
    ) : (
      <span key={i}>{p.text}</span>
    ),
  );
}

export function SearchSelect({
  label,
  noun,
  value,
  options,
  onChange,
}: {
  label: string;
  noun: string;
  value: string;
  options: SearchOption[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => filter(options, query), [options, query]);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active, results]);

  const show = (seed = "") => {
    const shown = filter(options, seed);
    setQuery(seed);
    setActive(Math.max(0, shown.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  const choose = (option: SearchOption) => {
    onChange(option.value);
    close(true);
  };

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      show();
    } else if (e.key.length === 1 && e.key !== " " && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      show(e.key);
    }
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const last = results.length - 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(last, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "PageDown") {
      e.preventDefault();
      setActive((a) => Math.min(last, a + 8));
    } else if (e.key === "PageUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 8));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) choose(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (open && !root.current?.contains(e.relatedTarget as Node | null)) close(false);
  };

  return (
    <div ref={root} className="relative" onBlur={onBlur}>
      <span id={`${id}-label`} className="text-sm font-medium text-white/80">
        {label}
      </span>
      <button
        ref={trigger}
        id={`${id}-button`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-button`}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={onTriggerKey}
        className="group mt-2 flex h-11 w-full items-center justify-between gap-3 rounded-lg bg-white/[0.06] px-3 text-left text-[15px] text-white outline-none transition-colors hover:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-[#a98fff] aria-expanded:bg-white/[0.09]"
      >
        <span className="truncate">{selected?.label ?? `Choose a ${noun}`}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-white/50 transition-transform duration-200 group-aria-expanded:rotate-180" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-30 mt-1.5 w-full rounded-xl bg-[#231a3d] p-1.5 ring-1 ring-white/[0.08] lg:w-max lg:max-w-[28rem] lg:min-w-full">
          <div className="flex items-center gap-2 rounded-md bg-white/[0.06] px-2.5">
            <SearchIcon className="size-4 shrink-0 text-white/45" />
            <input
              ref={input}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={`${id}-list`}
              aria-autocomplete="list"
              aria-activedescendant={results[active] ? `${id}-option-${active}` : undefined}
              aria-label={`Search ${noun}s`}
              placeholder={`Search ${options.length} ${noun}s`}
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKey}
              className="h-10 w-full min-w-0 bg-transparent text-[15px] text-white outline-none placeholder:text-white/35"
            />
          </div>
          {results.length ? (
            <ul
              ref={list}
              id={`${id}-list`}
              role="listbox"
              aria-labelledby={`${id}-label`}
              onMouseDown={(e) => e.preventDefault()}
              className="mt-1.5 max-h-72 overflow-y-auto overscroll-contain"
            >
              {results.map((o, i) => {
                const isSelected = o.value === value;
                return (
                  <li
                    key={o.value}
                    id={`${id}-option-${i}`}
                    role="option"
                    aria-selected={isSelected}
                    data-active={i === active || undefined}
                    onPointerMove={() => setActive(i)}
                    onClick={() => choose(o)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[14px] text-white/70 data-active:bg-white/[0.07] data-active:text-white/90"
                  >
                    <CheckIcon className={`size-4 shrink-0 text-[#a98fff] ${isSelected ? "" : "invisible"}`} />
                    <span className={`min-w-0 flex-1 ${isSelected ? "text-white" : ""}`}>
                      <Highlight text={o.label} query={query} />
                    </span>
                    {o.detail && <span className="shrink-0 text-[13px] text-white/40 tabular-nums">{o.detail}</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-2.5 py-6 text-center text-sm text-white/50">
              No {noun} matches &ldquo;{query.trim()}&rdquo;. Pick the closest one you can find.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
