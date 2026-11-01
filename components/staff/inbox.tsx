"use client";

import { useState, type ReactNode } from "react";
import { CHOICE, FINAL, ROLE, ownerAct } from "@/components/staff/applications";
import { left, when, type Application, type Card, type Column, type Dashboard, type Decision } from "@/components/staff/api";
import { LINK, PRIMARY_SM, SECONDARY_SM } from "@/components/staff/ui";

const SOON = 24 * 3_600_000;
const WEEK = 7 * 24 * 3_600_000;
const COLUMN: Record<string, string> = { todo: "To do", doing: "Doing" };

type Item = { key: string; what: ReactNode; detail: string; actions: ReactNode };
type Group = { id: string; title: string; short: string; items: Item[] };

const votes = (v: Application["vote"]) => (v.needed > 0 ? `${v.cast} of ${v.quorum} votes needed` : `${v.cast} vote${v.cast === 1 ? "" : "s"}, enough`);
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function namesYou(d: Decision, names: string[]) {
  const text = `${d.title} ${d.body || ""}`;
  return names.some((n) => n && new RegExp(`(^|[^\\w])@?${escapeRegex(n)}(?![\\w])`, "i").test(text));
}

function Who({ a }: { a: Application }) {
  return (
    <>
      <strong className="text-white">{a.name || "someone"}</strong>&apos;s {ROLE[a.role] ?? a.role} application
    </>
  );
}

const stamp = (v: Decision["at"]) => new Date(v).getTime();

export function inboxGroups({
  apps,
  cards,
  decisions,
  me,
  names,
  act,
  now = Date.now(),
}: {
  apps: Application[];
  cards?: Record<Column, Card[]> | null;
  decisions?: Decision[] | null;
  me?: string;
  names: string[];
  act: (a: Application, action: string, label: string) => void;
  now?: number;
}): { groups: Group[]; waiting: number } {
  const open = apps.filter((a) => a.status === "open");
  const go = (a: Application) => `#application-${encodeURIComponent(a.id)}`;
  const link = (href: string, label: string, primary = false) => (
    <a href={href} className={primary ? PRIMARY_SM : SECONDARY_SM}>
      {label}
    </a>
  );
  const owner = (a: Application, action: string, label: string, primary = false) => (
    <button type="button" onClick={() => act(a, action, label)} className={primary ? PRIMARY_SM : SECONDARY_SM}>
      {label}
    </button>
  );
  const groups: Group[] = [
    {
      id: "veto",
      title: "In your veto window",
      short: "in your veto window",
      items: apps
        .filter((a) => a.owner && a.status === "veto-window")
        .map((a) => ({
          key: a.id,
          what: (
            <>
              <Who a={a} /> passed{a.tally ? `, ${a.tally.for} to ${a.tally.against}` : ""} · goes through in {left(a.veto?.until ?? now, now)}
            </>
          ),
          detail: "Approve it now, veto it, or let it go through.",
          actions: (
            <>
              {owner(a, "approve", "Approve now", true)}
              {owner(a, "veto", "Veto")}
              {link(go(a), "Read")}
            </>
          ),
        })),
    },
    {
      id: "decide",
      title: "Needs your decision",
      short: "need your decision",
      items: apps
        .filter((a) => a.owner && (a.status === "stalled" || a.status === "owner"))
        .map((a) => ({
          key: a.id,
          what: (
            <>
              Decide on <Who a={a} />
            </>
          ),
          detail: a.status === "stalled" ? "Not enough votes, even after 48 more hours." : "Too few active voters to hold a vote.",
          actions: link(go(a), "Decide", true),
        })),
    },
    {
      id: "vote",
      title: "Waiting for your vote",
      short: "to vote on",
      items: open
        .filter((a) => a.vote.canVote && !a.vote.mine)
        .sort((a, b) => a.vote.closesAt - b.vote.closesAt)
        .map((a) => ({
          key: a.id,
          what: (
            <>
              Vote on <Who a={a} /> · closes in {left(a.vote.closesAt, now)}
            </>
          ),
          detail: votes(a.vote),
          actions: link(go(a), "Vote", true),
        })),
    },
    {
      id: "closing",
      title: "Closing within a day",
      short: "closing within a day",
      items: open
        .filter((a) => a.vote.mine && a.vote.closesAt - now < SOON)
        .map((a) => ({
          key: a.id,
          what: (
            <>
              <Who a={a} /> · closes in {left(a.vote.closesAt, now)}
            </>
          ),
          detail: `You voted ${CHOICE[a.vote.mine!.choice]}. Change it before it closes if you need to.`,
          actions: link(go(a), "Review"),
        })),
    },
  ];
  if (cards) {
    const mine = (["doing", "todo"] as Column[]).flatMap((c) => cards[c] ?? []).filter((c) => me && c.owner === me);
    groups.push({
      id: "cards",
      title: "Your cards",
      short: mine.length === 1 ? "card of yours" : "cards of yours",
      items: mine.map((c) => ({ key: c.id, what: c.title, detail: `${COLUMN[c.column] ?? c.column} on the Team board`, actions: link("#board", "Open") })),
    });
  }
  if (decisions) {
    const named = decisions.filter((d) => d.status === "active" && d.by !== me && stamp(d.at) > now - WEEK && namesYou(d, names));
    groups.push({
      id: "decisions",
      title: "Decisions that name you",
      short: named.length === 1 ? "decision names you" : "decisions name you",
      items: named.map((d) => ({ key: d.id, what: d.title, detail: `Recorded ${when(d.at)}`, actions: link("#decisions", "Read") })),
    });
  }
  return { groups: groups.filter((g) => g.items.length), waiting: apps.filter((a) => !FINAL.includes(a.status)).length };
}

export function inboxCount(groups: Group[]) {
  return groups.reduce((n, g) => n + g.items.length, 0);
}

export function Inbox({
  dashboard,
  apps,
  cards,
  decisions,
  me,
  names,
  onDone,
}: {
  dashboard: Dashboard;
  apps: Application[];
  cards?: Record<Column, Card[]> | null;
  decisions?: Decision[] | null;
  me?: string;
  names: string[];
  onDone: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const act = async (a: Application, action: string, label: string) => {
    if (busy) return;
    setBusy(true);
    try {
      if (await ownerAct(dashboard, a.id, action, label)) await onDone();
    } catch (err) {
      window.alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const { groups, waiting } = inboxGroups({ apps, cards, decisions, me, names, act });
  if (!groups.length) {
    return (
      <div className="space-y-2">
        <p className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">Nothing needs you right now.</p>
        <p className="text-sm text-white/55">
          Votes waiting for you{cards ? ", your cards and decisions that name you" : ""} show up here.{" "}
          <a href="#applications" className={LINK}>
            {waiting ? `${waiting} application${waiting === 1 ? "" : "s"} in progress` : "No application in progress"}
          </a>
          .
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
        {groups.map((g) => (
          <a key={g.id} href={`#inbox-${g.id}`} className="hover:text-white">
            <strong className="text-white">{g.items.length}</strong> {g.short}
          </a>
        ))}
      </p>
      {groups.map((g) => (
        <section key={g.id} id={`inbox-${g.id}`} className="scroll-mt-28">
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-white">{g.title}</h2>
          <ul className="mt-3 divide-y divide-white/[0.06] overflow-hidden rounded-2xl bg-[#18112c]">
            {g.items.map((it) => (
              <li key={it.key} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[15px] text-white/85">{it.what}</p>
                  <p className="mt-0.5 text-[13px] text-white/50">{it.detail}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">{it.actions}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
