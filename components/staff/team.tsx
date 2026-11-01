"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Applications } from "@/components/staff/applications";
import {
  ApiError,
  api,
  relative,
  safeGithubUrl,
  when,
  type Application,
  type Card,
  type Column,
  type Decision,
  type Overview,
  type People,
  type PublicItem,
  type TeamItem,
  type Who,
  type WorkCard,
} from "@/components/staff/api";
import { BarChart, DataSet, RankChart, Tile, fmt, type Row } from "@/components/staff/charts";
import { selectTab, tabFromHash, useHash, useScrollToHash } from "@/components/staff/hash";
import { Inbox, inboxCount, inboxGroups } from "@/components/staff/inbox";
import {
  AREA,
  BADGE,
  CARD,
  Empty,
  Field,
  GHOST_SM,
  Guard,
  INPUT,
  LINK,
  LinkText,
  Lines,
  Note,
  PRIMARY_SM,
  Panel,
  SECONDARY_SM,
  Status,
  Tabs,
} from "@/components/staff/ui";

const IDS = ["inbox", "applications", "board", "roadmap", "decisions", "stats", "data"];
const COLUMNS: [Column, string][] = [
  ["todo", "To do"],
  ["doing", "Doing"],
  ["done", "Done"],
];
const STATUSES: [string, string][] = [
  ["now", "Now"],
  ["next", "Next"],
  ["help-wanted", "Help wanted"],
  ["later", "Later"],
  ["shipped", "Shipped"],
];
const STATUS_NAME = Object.fromEntries(STATUSES);
const KIND: Record<string, string> = { pr: "PR", issue: "Issue", card: "Card" };

type TeamStats = {
  generatedAt: string;
  weeks: { week: string; opened: number; merged: number; medianHoursToFirstReview: number | null; medianHoursToMerge: number | null; reviewedShare?: number | null }[];
  openPullRequests: { ready: number; drafts: number; oldestReadyDays: number | null; ci: { passing: number; failing: number; pending: number; none: number } };
  bugs: { open: number; crucial: number; openIssues: number; bySource: Record<string, number>; byArea: Record<string, number>; noArea: number };
  releases: { lastGame: string | null; medianHoursBetweenGame: number | null; gamePerWeek: number[]; launcherPerWeek: number[] };
  discord: { messages: number; dailyActive: number; joins: number; leaves: number }[];
  roadmap: { id: string; title: string; status: string; merged: number; open: number }[];
  people: { login: string; opened: number; merged: number }[];
};

type Ctx = { data: Overview; reload: () => Promise<void> };

function Form({
  path,
  before,
  after,
  submit,
  reset,
  ctx,
  children,
}: {
  path: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  submit: string;
  reset?: boolean;
  ctx: Ctx;
  children: ReactNode;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true);
    setStatus("Saving…");
    try {
      await api("POST", path, { ...before, ...values, ...after });
      setStatus("");
      if (reset) form.reset();
      await ctx.reload();
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {children}
      <p className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={PRIMARY_SM}>
          {submit}
        </button>
        <Status text={status} />
      </p>
    </form>
  );
}

function Action({ label, confirm, run, ctx, className = GHOST_SM }: { label: string; confirm?: string; run: () => Promise<unknown>; ctx: Ctx; className?: string }) {
  const [status, setStatus] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        className={className}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          try {
            await run();
            await ctx.reload();
          } catch (err) {
            setStatus((err as Error).message);
          }
        }}
      >
        {label}
      </button>
      <Status text={status} />
    </span>
  );
}

function PeopleSelect({ people, name, value }: { people: People; name: string; value?: string | null }) {
  return (
    <select name={name} defaultValue={value ?? ""} className={INPUT}>
      <option value="">Nobody</option>
      {Object.entries(people).map(([id, n]) => (
        <option key={id} value={id}>
          {n}
        </option>
      ))}
    </select>
  );
}

const pair = "grid gap-3 sm:grid-cols-2";

function KanbanCard({ c, ctx }: { c: Card; ctx: Ctx }) {
  const i = COLUMNS.findIndex(([k]) => k === c.column);
  const people = ctx.data.people ?? {};
  const move = (to: Column) => () => api("POST", "team/cards", { action: "move", id: c.id, column: to });
  return (
    <li className="rounded-xl bg-white/[0.04] p-3">
      <p className="text-[15px] font-medium text-white">{c.title}</p>
      <Lines text={c.note} className="mt-1 text-[13px] text-white/60" />
      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/45">
        {c.owner && people[c.owner] ? <span>{people[c.owner]}</span> : null}
        {c.link ? (
          <span>
            <LinkText link={c.link} />
          </span>
        ) : null}
        {c.updatedAt ? <span>{when(c.updatedAt)}</span> : null}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-1">
        {i > 0 && <Action label="←" run={move(COLUMNS[i - 1][0])} ctx={ctx} />}
        {i < 2 && <Action label="→" run={move(COLUMNS[i + 1][0])} ctx={ctx} />}
        <Action label="Delete" confirm="Delete this card?" run={() => api("POST", "team/cards", { action: "delete", id: c.id })} ctx={ctx} />
      </p>
      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-white/50 hover:text-white">Edit</summary>
        <div className="mt-2">
          <Form path="team/cards" before={{ action: "save" }} after={{ id: c.id, column: c.column }} submit="Save" ctx={ctx}>
            <Field label="Title">
              <input name="title" required maxLength={200} defaultValue={c.title} className={INPUT} />
            </Field>
            <Field label="Owner">
              <PeopleSelect people={people} name="owner" value={c.owner} />
            </Field>
            <Field label="Note">
              <textarea name="note" rows={2} maxLength={2000} defaultValue={c.note ?? ""} className={AREA} />
            </Field>
            <Field label="Link">
              <input name="link" maxLength={300} defaultValue={c.link ?? ""} className={INPUT} />
            </Field>
          </Form>
        </div>
      </details>
    </li>
  );
}

function WorkBoardCard({ k }: { k: WorkCard }) {
  const href = safeGithubUrl(k.url);
  const inner = (
    <>
      <span className="block text-[14px] text-white/85">{k.title}</span>
      <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-white/45">
        <span>
          {KIND[k.kind ?? ""] ?? "Card"} #{k.number}
        </span>
        {(k.people ?? []).slice(0, 2).map((p, i) => (
          <span key={i}>{p?.name || p?.login}</span>
        ))}
      </span>
    </>
  );
  return (
    <li className="rounded-xl bg-white/[0.04] p-3">
      {href ? (
        <a href={href} rel="noreferrer" className="block hover:opacity-80">
          {inner}
        </a>
      ) : (
        <div>{inner}</div>
      )}
    </li>
  );
}

function Board({ ctx }: { ctx: Ctx }) {
  const { data } = ctx;
  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">Team kanban</h2>
        <Note>Coordination that isn&apos;t a GitHub issue: releases, onboarding, reviews to organise. Only the Team sees it.</Note>
        <Guard what="The Team kanban">
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {COLUMNS.map(([k, label]) => {
              const cards = data.cards?.[k] ?? [];
              return (
                <section key={k} className={CARD}>
                  <h3 className="flex items-center justify-between text-sm font-medium text-white">
                    {label} <span className="text-white/45 tabular-nums">{cards.length}</span>
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {cards.length ? cards.map((c) => <KanbanCard key={c.id} c={c} ctx={ctx} />) : <li className="text-sm text-white/45">Nothing here.</li>}
                  </ul>
                </section>
              );
            })}
          </div>
        </Guard>
        <div className={`${CARD} mt-4`}>
          <Form path="team/cards" before={{ action: "save" }} submit="Add to To do" reset ctx={ctx}>
            <div className={pair}>
              <Field label="New card">
                <input name="title" required maxLength={200} placeholder="What needs doing" className={INPUT} />
              </Field>
              <Field label="Owner">
                <PeopleSelect people={data.people ?? {}} name="owner" />
              </Field>
            </div>
            <div className={pair}>
              <Field label="Note">
                <input name="note" maxLength={2000} className={INPUT} />
              </Field>
              <Field label="Link">
                <input name="link" maxLength={300} placeholder="#123 or https://github.com/…" className={INPUT} />
              </Field>
            </div>
          </Form>
        </div>
      </section>
      <section>
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">Work board</h2>
        <Note>
          Kira&apos;s board from GitHub, as on{" "}
          <Link href="/hub" className={LINK}>
            the hub
          </Link>{" "}
          (read-only here: move cards with /move on Discord or the MCP tools).
        </Note>
        <Guard what="Kira's work board">
          {data.board?.columns?.length ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {data.board.columns.map((c) => {
                const cards = c.cards ?? [];
                return (
                  <section key={c.name} className={CARD}>
                    <h3 className="flex items-center justify-between text-sm font-medium text-white">
                      {c.name} <span className="text-white/45 tabular-nums">{cards.length}</span>
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {cards.slice(0, 12).map((k, i) => (
                        <WorkBoardCard key={`${k.number}-${i}`} k={k} />
                      ))}
                    </ul>
                    {cards.length > 12 && (
                      <p className="mt-2 text-xs text-white/45">
                        and {cards.length - 12} more on{" "}
                        <Link href="/hub" className={LINK}>
                          the hub
                        </Link>
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="mt-4">
              <Empty>Kira&apos;s board isn&apos;t loaded yet.</Empty>
            </div>
          )}
        </Guard>
      </section>
    </div>
  );
}

function ItemForm({ it, ctx }: { it?: TeamItem; ctx: Ctx }) {
  const areas = ctx.data.roadmap?.areas ?? [];
  return (
    <Form path="team/roadmap" before={{ action: "save" }} after={it ? { id: it.id } : {}} submit={it ? "Save" : "Add the Team-only item"} reset={!it} ctx={ctx}>
      <div className={pair}>
        <Field label="Title">
          <input name="title" required maxLength={120} defaultValue={it?.title ?? ""} className={INPUT} />
        </Field>
        <Field label="Owner">
          <PeopleSelect people={ctx.data.people ?? {}} name="owner" value={it?.owner} />
        </Field>
      </div>
      <div className={pair}>
        <Field label="Area">
          <select name="area" defaultValue={it?.area ?? areas[0]?.id ?? ""} className={INPUT}>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={it?.status ?? "next"} className={INPUT}>
            {STATUSES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Team note">
        <textarea name="note" rows={2} maxLength={2000} defaultValue={it?.note ?? ""} className={AREA} />
      </Field>
      <Field label="For players, if it is published (240 characters)">
        <textarea name="plain" rows={2} maxLength={240} defaultValue={it?.plain ?? ""} className={AREA} />
      </Field>
      <Field label="For contributors, if it is published">
        <textarea name="dev" rows={3} maxLength={1500} defaultValue={it?.dev ?? ""} className={AREA} />
      </Field>
      <Field label="Links (#123, https://github.com/…, docs/…), separated by spaces">
        <input name="links" maxLength={800} defaultValue={(it?.links ?? []).join(" ")} className={INPUT} />
      </Field>
    </Form>
  );
}

type Snippet = { file: string; then: string; snippet: string; edit: string };

function TeamItemCard({ it, ctx }: { it: TeamItem; ctx: Ctx }) {
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const people = ctx.data.people ?? {};
  const area = ctx.data.roadmap?.areas?.find((a) => a.id === it.area)?.name ?? it.area;
  const publish = async () => {
    try {
      setSnippet(await api<Snippet>("POST", "team/roadmap", { action: "publish", id: it.id }));
      setStatus("");
    } catch (err) {
      setStatus((err as Error).message);
    }
  };
  const edit = safeGithubUrl(snippet?.edit);
  return (
    <article id={`item-${it.id}`} className={CARD}>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
        <span className={BADGE}>Team only</span>
        <span>{STATUS_NAME[it.status] ?? it.status}</span>
        <span>{area}</span>
        {it.owner && people[it.owner] ? <span>{people[it.owner]}</span> : null}
        {it.publishRequested ? <span>publish asked {when(it.publishRequested.at)}</span> : null}
      </p>
      <h3 className="mt-2 text-lg font-semibold text-white">{it.title}</h3>
      <Lines text={it.note} className="mt-1 text-[15px] text-white/70" />
      {it.links?.length ? (
        <p className="mt-1 flex flex-wrap gap-x-2 text-sm">
          {it.links.map((l, i) => (
            <span key={i}>
              {i > 0 && <span className="text-white/30">· </span>}
              <LinkText link={l} />
            </span>
          ))}
        </p>
      ) : null}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-white/55 hover:text-white">Edit</summary>
        <div className="mt-3">
          <ItemForm it={it} ctx={ctx} />
        </div>
      </details>
      <p className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={publish} className={SECONDARY_SM}>
          Publish…
        </button>
        <Action label="Delete" confirm="Delete this Team-only item?" run={() => api("POST", "team/roadmap", { action: "delete", id: it.id })} ctx={ctx} />
        <Status text={status} />
      </p>
      {snippet && (
        <div className="mt-3 rounded-xl bg-white/[0.03] p-4 text-sm text-white/70">
          <p>
            Add this to <code className="font-mono text-[#e7e1ff]">{snippet.file}</code> in a pull request to horizon (then{" "}
            <code className="font-mono text-[#e7e1ff]">{snippet.then}</code>). Until it merges the item stays Team-only.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-[#0a0614] px-3.5 py-3 font-mono text-[12.5px] text-[#e7e1ff]">
            <code>{snippet.snippet}</code>
          </pre>
          <p className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={SECONDARY_SM}
              onClick={async () => {
                await navigator.clipboard.writeText(snippet.snippet).catch(() => {});
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
            {edit && (
              <a href={edit} rel="noreferrer" className={GHOST_SM}>
                Edit roadmap.toml on GitHub
              </a>
            )}
          </p>
        </div>
      )}
    </article>
  );
}

function PublicItemRow({ it, ctx }: { it: PublicItem; ctx: Ctx }) {
  const people = ctx.data.people ?? {};
  const t = it.team;
  const area = ctx.data.roadmap?.areas?.find((a) => a.id === it.area)?.name ?? it.area;
  return (
    <li className="py-3">
      <p className="text-[15px]">
        <Link href="/hub" className="text-white hover:underline">
          {it.title}
        </Link>{" "}
        <span className="text-sm text-white/45">{area}</span>
        {t && (
          <span className="text-sm text-white/45">
            {t.priority ? ` · ${t.priority} priority` : ""}
            {t.owner && people[t.owner] ? ` · ${people[t.owner]}` : ""}
            {t.note ? ` · ${t.note}` : ""}
          </span>
        )}
      </p>
      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-white/50 hover:text-white">Team note</summary>
        <div className="mt-2">
          <Form path="team/roadmap" before={{ action: "note", id: it.id }} submit="Save" ctx={ctx}>
            <div className={pair}>
              <Field label="Owner">
                <PeopleSelect people={people} name="owner" value={t?.owner} />
              </Field>
              <Field label="Priority">
                <select name="priority" defaultValue={t?.priority ?? ""} className={INPUT}>
                  {["", "high", "normal", "low"].map((p) => (
                    <option key={p} value={p}>
                      {p || "None"}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Note (Team only)">
              <input name="note" maxLength={2000} defaultValue={t?.note ?? ""} className={INPUT} />
            </Field>
          </Form>
        </div>
      </details>
    </li>
  );
}

function Roadmap({ ctx }: { ctx: Ctx }) {
  const r = ctx.data.roadmap ?? {};
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">Team-only items</h2>
        <Note>
          Plans the public doesn&apos;t see. They never reach the public repository by themselves: &ldquo;Publish&rdquo; gives the entry to add to
          roadmap/roadmap.toml in a pull request, and once it is merged the item shows as public here.
        </Note>
        {(r.team ?? []).length ? (r.team ?? []).map((it) => <TeamItemCard key={it.id} it={it} ctx={ctx} />) : <Empty>No Team-only item.</Empty>}
        <details className={CARD}>
          <summary className="cursor-pointer text-sm font-medium text-white">New Team-only item</summary>
          <div className="mt-4">
            <ItemForm ctx={ctx} />
          </div>
        </details>
      </section>
      <section>
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">Public roadmap</h2>
        <Note>
          What everyone sees on{" "}
          <Link href="/hub" className={LINK}>
            the hub
          </Link>
          , from roadmap/roadmap.toml{r.available === false ? " (not loaded right now)" : ""}. The Team&apos;s owner, priority and notes on each item stay
          here.
        </Note>
        <div className="mt-4 space-y-3">
          {STATUSES.map(([k, label]) => {
            const items = (r.public ?? []).filter((i) => i.status === k);
            if (!items.length) return null;
            return (
              <details key={k} open={k === "now"} className={CARD}>
                <summary className="cursor-pointer font-medium text-white">
                  {label} <span className="text-sm font-normal text-white/45">{items.length}</span>
                </summary>
                <ul className="mt-2 divide-y divide-white/[0.06]">
                  {items.map((it) => (
                    <PublicItemRow key={it.id} it={it} ctx={ctx} />
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function DecisionForm({ d, ctx }: { d?: Decision; ctx: Ctx }) {
  const items = [...(ctx.data.roadmap?.team ?? []), ...(ctx.data.roadmap?.public ?? [])];
  return (
    <Form path="team/decisions" after={d ? { id: d.id } : {}} submit={d ? "Save (the old version is kept)" : "Record the decision"} reset={!d} ctx={ctx}>
      <Field label="Decision">
        <input name="title" required maxLength={200} defaultValue={d?.title ?? ""} placeholder="What was decided, in one line" className={INPUT} />
      </Field>
      <Field label="Details">
        <textarea name="body" rows={3} maxLength={4000} defaultValue={d?.body ?? ""} className={AREA} />
      </Field>
      <div className={pair}>
        <Field label="Link">
          <input name="link" maxLength={300} defaultValue={d?.link ?? ""} placeholder="#123 or https://github.com/…" className={INPUT} />
        </Field>
        <Field label="Roadmap item">
          <select name="item" defaultValue={d?.item ?? ""} className={INPUT}>
            <option value="">None</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Form>
  );
}

function Decisions({ ctx }: { ctx: Ctx }) {
  const people = ctx.data.people ?? {};
  const list = ctx.data.decisions ?? [];
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">Record a decision</h2>
        <Note>Who decided what and when, with a link. Nothing is ever deleted: an edit keeps the previous version and a withdrawn decision stays listed.</Note>
        <div className={CARD}>
          <DecisionForm ctx={ctx} />
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">Decisions</h2>
        {list.length ? (
          list.map((d) => (
            <article key={d.id} className={`${CARD} ${d.status === "withdrawn" ? "opacity-60" : ""}`}>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
                <span>{when(d.at)}</span>
                <span>{(d.by && people[d.by]) || "someone"}</span>
                {d.item ? <span>{d.item}</span> : null}
                {d.status === "withdrawn" ? <span className={BADGE}>withdrawn</span> : null}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">{d.title}</h3>
              <Lines text={d.body} className="mt-1 text-[15px] text-white/70" />
              {d.link ? (
                <p className="mt-1 text-sm">
                  <LinkText link={d.link} />
                </p>
              ) : null}
              {d.history?.length ? (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-white/50 hover:text-white">Earlier versions ({d.history.length})</summary>
                  <ul className="mt-2 space-y-1 text-white/60">
                    {d.history.map((h, i) => (
                      <li key={i}>
                        {when(h.at)}, before {(h.by && people[h.by]) || "someone"}&apos;s change: {h.title}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
              {d.status === "active" && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-white/55 hover:text-white">Edit</summary>
                  <div className="mt-3 space-y-3">
                    <DecisionForm d={d} ctx={ctx} />
                    <Action
                      label="Withdraw it"
                      confirm="Withdraw this decision? It stays listed as withdrawn."
                      run={() => api("POST", "team/decisions", { id: d.id, withdraw: true })}
                      ctx={ctx}
                    />
                  </div>
                </details>
              )}
            </article>
          ))
        ) : (
          <Empty>No decision recorded yet.</Empty>
        )}
      </section>
    </div>
  );
}

function Stats({ s }: { s: TeamStats }) {
  const w = s.weeks.map((x) => x.week);
  const pr = s.openPullRequests;
  const sources = Object.entries(s.bugs.bySource).map(
    ([k, v]) => [({ discord: "From Discord", website: "From the website", github: "On GitHub" } as Record<string, string>)[k] ?? k, v] as [string, number],
  );
  const areas = Object.entries(s.bugs.byArea).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-6">
      <p className="text-[15px] text-white/60">
        GitHub counts for horizon-rust/horizon over the last 12 weeks, and Discord counters (counts only, no messages). Updated {relative(Date.parse(s.generatedAt))}.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile value={fmt(pr.ready)} label="pull requests ready for review" note={`${fmt(pr.drafts)} drafts${pr.oldestReadyDays != null ? ` · oldest ${pr.oldestReadyDays} d` : ""}`} />
        <Tile value={`${fmt(pr.ci.passing)} / ${fmt(pr.ci.failing)}`} label="CI passing / failing" note={`${fmt(pr.ci.pending)} running, ${fmt(pr.ci.none)} without CI`} />
        <Tile value={fmt(s.bugs.open)} label="open bugs" note={`${fmt(s.bugs.crucial)} crucial · ${fmt(s.bugs.openIssues)} open issues`} />
        <Tile
          value={s.releases.lastGame ? relative(Date.parse(s.releases.lastGame)) : "–"}
          label="last game release"
          note={s.releases.medianHoursBetweenGame != null ? `median ${fmt(s.releases.medianHoursBetweenGame)} h between releases` : ""}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarChart title="Pull requests per week" weeks={w} series={[{ name: "Opened", values: s.weeks.map((x) => x.opened) }, { name: "Merged", values: s.weeks.map((x) => x.merged) }]} />
        <BarChart title="Median hours to the first review" weeks={w} series={[{ name: "Hours", values: s.weeks.map((x) => x.medianHoursToFirstReview) }]} unit=" h" />
        <BarChart title="Median hours from opening to merge" weeks={w} series={[{ name: "Hours", values: s.weeks.map((x) => x.medianHoursToMerge) }]} unit=" h" />
        <BarChart title="Releases per week" weeks={w} series={[{ name: "Game", values: s.releases.gamePerWeek }, { name: "Launcher", values: s.releases.launcherPerWeek }]} />
        <BarChart title="Discord messages per week" weeks={w} series={[{ name: "Messages", values: s.discord.map((x) => x.messages) }]} />
        <BarChart title="Discord members active per day (weekly average)" weeks={w} series={[{ name: "Members", values: s.discord.map((x) => x.dailyActive) }]} />
        <BarChart
          title="Discord joins and leaves per week"
          weeks={w}
          series={[{ name: "Joins", values: s.discord.map((x) => x.joins) }, { name: "Leaves", values: s.discord.map((x) => x.leaves) }]}
        />
        <RankChart title="Open bugs by where they came from" entries={sources} />
        {areas.length > 0 && <RankChart title={`Open bugs by area (${fmt(s.bugs.noArea)} without an area label)`} entries={areas} />}
      </div>
    </div>
  );
}

const iso = (v?: string | number | null) => (v == null || v === "" ? "" : new Date(v).toISOString());
const r1 = (v?: number | null) => (v == null ? null : Math.round(v * 10) / 10);

function datasets(o: Overview, s: TeamStats | null): { id: string; title: string; rows: Row[] }[] {
  const name = (id?: string | null) => (id ? o.people?.[id] || id : "");
  const sets: { id: string; title: string; rows: Row[] }[] = [
    {
      id: "cards",
      title: "Team kanban",
      rows: Object.values(o.cards ?? {})
        .flat()
        .map((c) => ({ title: c.title, column: c.column, owner: name(c.owner), link: c.link ?? "", note: c.note ?? "", updated: iso(c.updatedAt) })),
    },
    {
      id: "team-items",
      title: "Team-only roadmap items",
      rows: (o.roadmap?.team ?? []).map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        area: i.area,
        owner: name(i.owner),
        publishAsked: iso(i.publishRequested?.at),
        note: i.note ?? "",
      })),
    },
    {
      id: "team-notes",
      title: "Team notes on public roadmap items",
      rows: (o.roadmap?.public ?? [])
        .filter((i) => i.team)
        .map((i) => ({ id: i.id, title: i.title, status: i.status, priority: i.team?.priority ?? "", owner: name(i.team?.owner), note: i.team?.note ?? "" })),
    },
    {
      id: "decisions",
      title: "Decisions",
      rows: (o.decisions ?? []).map((d) => ({ date: iso(d.at), by: name(d.by), title: d.title, status: d.status, link: d.link ?? "", item: d.item ?? "", edits: d.history?.length ?? 0 })),
    },
  ];
  if (s) {
    sets.push(
      { id: "roadmap-progress", title: "Roadmap items: pull requests labelled for them", rows: s.roadmap.map((i) => ({ id: i.id, title: i.title, status: i.status, merged: i.merged, open: i.open })) },
      { id: "contributors", title: "Contributors, last 12 weeks (GitHub)", rows: s.people.map((p) => ({ login: p.login, opened: p.opened, merged: p.merged })) },
      {
        id: "weeks",
        title: "Weekly numbers",
        rows: s.weeks.map((x, i) => ({
          week: x.week,
          opened: x.opened,
          merged: x.merged,
          medianHoursToFirstReview: r1(x.medianHoursToFirstReview),
          medianHoursToMerge: r1(x.medianHoursToMerge),
          reviewedPercent: x.reviewedShare ?? null,
          gameReleases: s.releases.gamePerWeek[i],
          launcherReleases: s.releases.launcherPerWeek[i],
          discordMessages: s.discord[i]?.messages,
          discordDailyActive: s.discord[i]?.dailyActive,
          joins: s.discord[i]?.joins,
          leaves: s.discord[i]?.leaves,
        })),
      },
    );
  }
  return sets;
}

function Data({ data, stats }: { data: Overview; stats: TeamStats | null }) {
  const [generated] = useState(() => when(Date.now()));
  const sets = datasets(data, stats);
  return (
    <div className="space-y-8">
      <p className="text-[15px] text-white/60">
        What this dashboard holds and counts, as tables. Each exports as CSV (cells that start with = + - @ get a leading quote, so a spreadsheet never runs
        them) or JSON. Generated {generated}.{stats ? "" : " The GitHub tables come once Kira has counted."}
      </p>
      <nav className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/55">
        {sets.map((x) => (
          <a key={x.id} href={`#data-${x.id}`} className="hover:text-white">
            {x.title}
          </a>
        ))}
      </nav>
      {sets.map((x) => (
        <DataSet key={x.id} id={x.id} title={x.title} rows={x.rows} file={`horizon-${x.id}`} />
      ))}
    </div>
  );
}

const fetchTeam = () =>
  Promise.all([api<Overview>("GET", "team/overview"), api<{ applications: Application[]; people?: People }>("GET", "team/applications")]);

export function TeamDashboard({ who }: { who: Who }) {
  const hash = useHash();
  const tab = tabFromHash(hash, IDS);
  const [data, setData] = useState<Overview | null>(null);
  const [apps, setApps] = useState<Application[] | null>(null);
  const [people, setPeople] = useState<People>({});
  const [error, setError] = useState("");
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [statsError, setStatsError] = useState<{ message: string; retry: boolean } | null>(null);

  const show = useCallback(([overview, list]: [Overview, { applications: Application[]; people?: People }]) => {
    setData(overview);
    setApps(list.applications ?? []);
    setPeople((p) => ({ ...p, ...overview.people, ...list.people }));
  }, []);

  const reload = useCallback(async () => show(await fetchTeam()), [show]);

  useEffect(() => {
    fetchTeam().then(show, (e: Error) => setError(e.message));
  }, [show]);

  useEffect(() => {
    if (!(tab === "stats" || tab === "data") || stats || statsError) return;
    api<TeamStats>("GET", "team/stats").then(setStats, (e: ApiError) => setStatsError({ message: e.message, retry: e.status === 503 }));
  }, [tab, stats, statsError]);

  useScrollToHash(data !== null && apps !== null);

  if (error) {
    return (
      <p role="alert" className="text-[15px] text-white/70">
        {error}
      </p>
    );
  }
  if (!data || !apps) return <p className="text-sm text-white/50">Loading…</p>;

  const ctx: Ctx = { data, reload };
  const names = [who.name, data.people?.[who.user] ?? ""];
  const count = inboxCount(inboxGroups({ apps, cards: data.cards, decisions: data.decisions, me: who.user, names, act: () => {} }).groups);
  const tabs = [
    { id: "inbox", label: "Inbox", count },
    { id: "applications", label: "Applications" },
    { id: "board", label: "Board" },
    { id: "roadmap", label: "Roadmap" },
    { id: "decisions", label: "Decisions" },
    { id: "stats", label: "Stats" },
    { id: "data", label: "Data" },
  ];
  const statsBody = (render: (s: TeamStats) => ReactNode) =>
    stats ? (
      render(stats)
    ) : statsError ? (
      <div className="space-y-3">
        <p className="text-[15px] text-white/70">{statsError.message}</p>
        {statsError.retry && (
          <button type="button" className={SECONDARY_SM} onClick={() => setStatsError(null)}>
            Try again
          </button>
        )}
      </div>
    ) : (
      <p className="text-sm text-white/50">Loading…</p>
    );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={tabs} active={tab} onSelect={selectTab} label="Team dashboard" />
        <Link href="/hub/staff-help" className="text-sm text-white/55 hover:text-white">
          How this works
        </Link>
      </div>
      <Panel id="inbox" active={tab}>
        <Guard what="The Inbox">
          <Inbox dashboard="team" apps={apps} cards={data.cards} decisions={data.decisions} me={who.user} names={names} onDone={reload} />
        </Guard>
      </Panel>
      <Panel id="applications" active={tab}>
        <Applications apps={apps} people={people} dashboard="team" onDone={reload} />
      </Panel>
      <Panel id="board" active={tab}>
        <Guard what="The board">
          <Board ctx={ctx} />
        </Guard>
      </Panel>
      <Panel id="roadmap" active={tab}>
        <Guard what="The roadmap">
          <Roadmap ctx={ctx} />
        </Guard>
      </Panel>
      <Panel id="decisions" active={tab}>
        <Guard what="The decisions">
          <Decisions ctx={ctx} />
        </Guard>
      </Panel>
      <Panel id="stats" active={tab}>
        <Guard what="The statistics">{statsBody((s) => <Stats s={s} />)}</Guard>
      </Panel>
      <Panel id="data" active={tab}>
        <Guard what="The data">{stats || statsError ? <Data data={data} stats={stats} /> : <p className="text-sm text-white/50">Loading…</p>}</Guard>
      </Panel>
    </div>
  );
}
