"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CheckIcon, ExternalLinkIcon } from "@/components/icons";

const REPO_URL = "https://github.com/horizon-rust/horizon";

function useCopied() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);
  return [copied, setCopied] as const;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function CopyCommand({ command, label, text }: { command: string; label: string; text?: string }) {
  const [copied, setCopied] = useCopied();
  return (
    <button
      type="button"
      onClick={async () => setCopied(await copyText(command))}
      aria-label={label}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 text-[13px] font-medium text-white/80 transition-colors outline-none hover:bg-white/[0.11] hover:text-white focus-visible:ring-2 focus-visible:ring-[#a98fff]"
    >
      {copied ? <CheckIcon className="size-3.5 text-emerald-300" /> : null}
      {copied ? "Copied" : (text ?? command)}
      <span className="sr-only" aria-live="polite">
        {copied ? `Copied ${command}` : ""}
      </span>
    </button>
  );
}

const FIELD =
  "w-full rounded-lg bg-white/[0.06] px-3.5 text-[15px] text-white placeholder:text-white/35 outline-none transition-colors focus:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-[#a98fff]";

type Report = { title: string; did: string; happened: string; expected: string; version: string; system: string };

function reportBody(r: Report) {
  const steps = r.did
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => `${i + 1}. ${l.replace(/^\d+[.)]\s*/, "")}`)
    .join("\n");
  return [
    "**What I did**",
    steps,
    "",
    "**What happened**",
    r.happened.trim(),
    "",
    "**What I expected (what vanilla does)**",
    r.expected.trim(),
    "",
    `**Horizon version:** ${r.version.trim() || "not given"}`,
    `**System:** ${r.system.trim()}`,
  ].join("\n");
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-white/80">{label}</span>
      {hint && <span className="mt-0.5 block text-[13px] text-white/45">{hint}</span>}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

export function BugReport({ version }: { version: string }) {
  const form = useRef<HTMLFormElement>(null);
  const id = useId();
  const [title, setTitle] = useState("");
  const [copied, setCopied] = useCopied();
  const [status, setStatus] = useState("");

  const read = (): Report | null => {
    const el = form.current;
    if (!el || !el.reportValidity()) return null;
    const data = new FormData(el);
    return {
      title: String(data.get("title") ?? ""),
      did: String(data.get("did") ?? ""),
      happened: String(data.get("happened") ?? ""),
      expected: String(data.get("expected") ?? ""),
      version: String(data.get("version") ?? ""),
      system: String(data.get("system") ?? ""),
    };
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const report = read();
    if (!report) return;
    const url = `${REPO_URL}/issues/new?${new URLSearchParams({ title: report.title.trim(), body: reportBody(report), labels: "bug" })}`;
    window.open(url, "_blank", "noopener");
    setStatus("GitHub opened in a new tab: check the text, then press Create.");
  };

  const onCopy = async () => {
    const report = read();
    if (!report) return;
    const ok = await copyText(`**${report.title.trim()}**\n\n${reportBody(report)}`);
    setCopied(ok);
    setStatus(ok ? "Copied. Paste it in #horizon-bugs on Discord." : "Your browser blocked the clipboard; open the issue on GitHub instead.");
  };

  const search = `${REPO_URL}/issues?${new URLSearchParams({ q: `is:issue ${title.trim()}`.trim() })}`;

  return (
    <form ref={form} onSubmit={onSubmit} className="mt-6 max-w-3xl rounded-2xl bg-white/[0.035] p-5 sm:p-6" aria-describedby={`${id}-note`}>
      <div className="grid gap-5">
        <Field label="What is broken, in a few words">
          <input
            name="title"
            required
            minLength={5}
            maxLength={120}
            autoComplete="off"
            placeholder="Water looks black on AMD graphics"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${FIELD} h-11`}
          />
        </Field>
        <Field label="What did you do?" hint="The steps, one per line.">
          <textarea name="did" required minLength={3} maxLength={2000} rows={4} className={`${FIELD} py-2.5 leading-relaxed`} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="What happened?" hint="What you saw instead.">
            <textarea name="happened" required minLength={3} maxLength={2000} rows={3} className={`${FIELD} py-2.5 leading-relaxed`} />
          </Field>
          <Field label="What did you expect?" hint="What vanilla 26.3 does.">
            <textarea name="expected" required minLength={3} maxLength={2000} rows={3} className={`${FIELD} py-2.5 leading-relaxed`} />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Horizon version" hint="The launcher shows it on the Play page.">
            <input name="version" maxLength={60} defaultValue={version} autoComplete="off" className={`${FIELD} h-11`} />
          </Field>
          <Field label="Your system" hint="OS, processor and graphics card.">
            <input name="system" required minLength={3} maxLength={200} placeholder="Windows 11, Ryzen 5 5600, RX 6600" className={`${FIELD} h-11`} />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6b4bff] px-4 text-sm font-medium text-white transition-colors outline-none hover:bg-[#7a5dff] focus-visible:ring-2 focus-visible:ring-[#a98fff]"
        >
          Open the issue on GitHub
          <ExternalLinkIcon className="size-3.5 opacity-70" />
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-white/[0.07] px-4 text-sm font-medium text-white/85 transition-colors outline-none hover:bg-white/[0.12] hover:text-white focus-visible:ring-2 focus-visible:ring-[#a98fff]"
        >
          {copied && <CheckIcon className="size-4 text-emerald-300" />}
          Copy for Discord
        </button>
        <a
          href={search}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-1.5 px-2 text-sm font-medium text-[#c4b5ff] transition-colors hover:text-white"
        >
          {title.trim() ? "Search for this bug first" : "Search the open bugs first"}
          <ExternalLinkIcon className="size-3.5 opacity-60" />
        </a>
      </div>
      <p className="mt-3 min-h-5 text-sm text-emerald-200/90" role="status">
        {status}
      </p>
      <p id={`${id}-note`} className="mt-1 text-[13px] leading-relaxed text-white/45">
        Issues are public, so leave out passwords and personal details. A screenshot or your log file helps: add it once the issue is open (
        <Link href="/docs/troubleshooting" className="text-white/70 underline underline-offset-4 hover:text-white">
          where the log is
        </Link>
        ). No GitHub account? Copy it for Discord and post it in #horizon-bugs, where Kira turns it into an issue.
      </p>
    </form>
  );
}

const CHIP_BUTTON = "h-8 rounded-lg px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff]";
const CHIP_ON = "bg-[#6b4bff]/30 text-[#e4dcff] ring-1 ring-[#a98fff]/40 ring-inset";
const CHIP_OFF = "bg-white/[0.05] text-white/60 hover:bg-white/[0.09] hover:text-white";

export function BoardFilter({ items }: { items: { id: string; title: string }[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [item, setItem] = useState("");
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const board = root.current?.parentElement?.querySelector<HTMLElement>("[data-board]");
    if (!board) return;
    const terms = query.toLowerCase().replace(/#/g, "").split(/\s+/).filter(Boolean);
    const active = terms.length > 0 || item !== "";
    let total = 0;
    for (const column of board.querySelectorAll<HTMLElement>("[data-board-column]")) {
      let count = 0;
      for (const card of column.querySelectorAll<HTMLElement>("[data-board-card]")) {
        const text = card.dataset.search ?? "";
        const inItem = item === "" || (item === "-" ? card.dataset.item !== "" : card.dataset.item === item);
        const visible = inItem && terms.every((t) => text.includes(t));
        card.hidden = !visible;
        if (visible) count++;
      }
      const label = column.querySelector<HTMLElement>("[data-col-count]");
      if (label) label.textContent = active ? `${count} of ${label.dataset.total}` : (label.dataset.total ?? "");
      if (active) column.querySelectorAll("details").forEach((d) => (d.open = true));
      total += count;
    }
    const frame = requestAnimationFrame(() => setShown(active ? total : null));
    return () => cancelAnimationFrame(frame);
  }, [query, item]);

  return (
    <div ref={root} className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        type="search"
        aria-label="Filter the cards"
        placeholder="Filter by title, #number or author"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={`${FIELD} h-10 text-sm sm:max-w-xs`}
      />
      <select aria-label="Roadmap item" value={item} onChange={(e) => setItem(e.target.value)} className={`${FIELD} h-10 text-sm sm:max-w-xs`}>
        <option value="">Every card</option>
        <option value="-">Cards of a roadmap item</option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.title}
          </option>
        ))}
      </select>
      {shown !== null && (
        <p className="text-sm text-white/50 sm:ml-2" role="status">
          {shown} {shown === 1 ? "card matches" : "cards match"}
        </p>
      )}
    </div>
  );
}

const JOURNAL_KINDS = [
  { id: "all", label: "Everything" },
  { id: "release", label: "Game releases" },
  { id: "launcher", label: "Launcher" },
  { id: "week", label: "Weekly summaries" },
  { id: "merged", label: "Not released yet" },
];

export function JournalFilter({ present }: { present: string[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [kind, setKind] = useState("all");
  const kinds = JOURNAL_KINDS.filter((k) => k.id === "all" || present.includes(k.id));

  useEffect(() => {
    const list = root.current?.parentElement?.querySelector<HTMLElement>("[data-journal]");
    if (!list) return;
    for (const entry of list.querySelectorAll<HTMLElement>("[data-journal-kind]")) {
      entry.hidden = kind !== "all" && entry.dataset.journalKind !== kind;
    }
  }, [kind]);

  return (
    <div ref={root} role="group" aria-label="Show" className="mt-6 flex flex-wrap gap-1.5">
      {kinds.map((k) => (
        <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)} className={`${CHIP_BUTTON} ${kind === k.id ? CHIP_ON : CHIP_OFF}`}>
          {k.label}
        </button>
      ))}
    </div>
  );
}
