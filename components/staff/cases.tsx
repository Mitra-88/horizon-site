"use client";

import { useEffect, useState } from "react";
import { api, when, type People } from "@/components/staff/api";
import { BADGE, CARD, Empty } from "@/components/staff/ui";

// The Moderation dashboard's Cases tab: Kira's numbered cases (#mod-actions) and the appeals, with their status.
// Kira's side: GET /staff/api/mod/cases (src/features/modcases.js); no appeal answers here, they are in #mod-mail.

type Case = {
  n: number;
  label: string;
  userId: string;
  tag?: string | null;
  by?: string | null;
  reason?: string | null;
  at: number;
  until?: number | null;
  ign?: string | null;
  evidence?: string | null;
  lifted?: boolean;
  url?: string | null;
  appeal?: { status: "open" | "decided"; decision?: string | null; url?: string | null } | null;
};
type Appeal = { id: string; case: number; label: string; via: string; userId: string; at: number; status: "open" | "decided"; url?: string | null; decision?: string | null; decidedBy?: string | null };
type CasesView = { cases: Case[]; appeals: Appeal[]; people?: People };

const DECIDED: Record<string, string> = { uphold: "upheld", ban: "upheld, banned", shorten: "shortened", lift: "lifted" };
const discordUrl = (u?: string | null) => (u && /^https:\/\/discord\.com\/channels\/\d+\/\d+\/\d+$/.test(u) ? u : undefined);

function Who({ id, people, fallback }: { id?: string | null; people: People; fallback?: string | null }) {
  if (!id) return <span className="text-white/45">unknown</span>;
  if (id === "kira") return <span>Kira (automatic)</span>;
  return <span>{people[id] ?? fallback ?? id}</span>;
}

function AppealBadge({ a }: { a: Case["appeal"] | Appeal | null | undefined }) {
  if (!a) return null;
  const text = a.status === "open" ? "appeal open" : `appeal ${DECIDED[a.decision ?? ""] ?? "decided"}`;
  return <span className={`${BADGE} ${a.status === "open" ? "bg-[#f0932b]/20 text-[#ffd3a6]" : ""}`}>{text}</span>;
}

export function Cases() {
  const [view, setView] = useState<CasesView | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<CasesView>("GET", "mod/cases").then(setView, (e: Error) => setError(e.message));
  }, []);
  if (error) return <p className="text-[15px] text-white/70">{error}</p>;
  if (!view) return <p className="text-sm text-white/50">Loading…</p>;
  const people = view.people ?? {};
  const open = view.appeals.filter((a) => a.status === "open");
  return (
    <div className="space-y-6">
      <p className="text-[15px] text-white/60">
        Every timeout, quarantine, ban, unban and kick, by a mod or by Kira, as Kira posts it in #mod-actions. Appeals are decided in their #mod-mail
        thread by a mod who didn&apos;t act.
      </p>
      <section className={CARD}>
        <h2 className="font-display text-lg font-semibold text-white">Open appeals ({open.length})</h2>
        {open.length ? (
          <ul className="mt-3 space-y-2 text-[15px] text-white/75">
            {open.map((a) => (
              <li key={a.id}>
                <a href={discordUrl(a.url)} className="text-white hover:underline" target="_blank" rel="noreferrer">
                  Case #{a.case} · {a.label}
                </a>{" "}
                by <Who id={a.userId} people={people} /> <span className="text-white/45">· {when(a.at)} · {a.via === "web" ? "from the website" : "from Discord"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No appeal waiting.</Empty>
        )}
      </section>
      <section className={CARD}>
        <h2 className="font-display text-lg font-semibold text-white">Cases</h2>
        {view.cases.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[14px] text-white/75">
              <thead className="text-xs text-white/45">
                <tr>
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Action</th>
                  <th className="py-2 pr-3 font-medium">Member</th>
                  <th className="py-2 pr-3 font-medium">By</th>
                  <th className="py-2 pr-3 font-medium">Reason</th>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {view.cases.map((c) => (
                  <tr key={c.n} id={`case-${c.n}`} className="border-t border-white/[0.06] align-top">
                    <td className="py-2 pr-3">
                      <a href={discordUrl(c.url)} className="text-white hover:underline" target="_blank" rel="noreferrer">
                        {c.n}
                      </a>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{c.label}</td>
                    <td className="py-2 pr-3">
                      <Who id={c.userId} people={people} fallback={c.tag} />
                      {c.ign ? <span className="text-white/45"> · {c.ign}</span> : null}
                    </td>
                    <td className="py-2 pr-3">
                      <Who id={c.by} people={people} />
                    </td>
                    <td className="max-w-[24rem] py-2 pr-3 break-words">
                      {c.reason || <span className="text-white/45">none given</span>}
                      {!c.evidence && c.by && c.by !== "kira" ? <span className="text-white/45"> · no evidence yet</span> : null}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-white/55">{when(c.at)}</td>
                    <td className="space-x-1 py-2">
                      {c.lifted ? <span className={BADGE}>lifted</span> : null}
                      <AppealBadge a={c.appeal} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No case yet: they start with the next timeout, quarantine, ban or kick.</Empty>
        )}
      </section>
    </div>
  );
}
