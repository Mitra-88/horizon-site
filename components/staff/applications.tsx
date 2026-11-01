"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api, left, safeGithubUrl, when, type Application, type Choice, type Dashboard, type People } from "@/components/staff/api";
import { AREA, BADGE, Empty, Field, GHOST_SM, Guard, LINK, Lines, PRIMARY, SECONDARY, Status } from "@/components/staff/ui";

export const ROLE: Record<string, string> = { mod: "Mod", support: "Support", team: "Horizon Team" };
export const CHOICE: Record<Choice, string> = { for: "For", against: "Against", abstain: "Abstain" };
export const FINAL = ["accepted", "declined"];
const ACTION: Record<string, string> = {
  ballot: "voted",
  "ballot-changed": "changed their vote",
  recused: "recused themselves",
  extended: "not enough votes: 48 more hours",
  stalled: "still not enough votes: sent to Ludovic",
  "to-owner": "too few active voters: sent to Ludovic",
  passed: "the vote passed: Ludovic's 12-hour veto window opened",
  veto: "vetoed it",
  accepted: "accepted",
  declined: "declined",
  "role-revoked": "took the role back",
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const person = (people: People, id: string) => (id === "vote" ? "The vote" : people[id] || "A former member");

export function standing(a: Application, now = Date.now()) {
  const v = a.vote;
  if (a.status === "open") {
    const votes = v.needed > 0 ? `${v.cast} of ${v.quorum} votes needed` : `${plural(v.cast, "vote")}, enough`;
    return `${votes} · closes in ${left(v.closesAt, now)}${v.extended ? " (extended once)" : ""}`;
  }
  if (a.status === "veto-window") return `Passed · goes through in ${left(a.veto?.until ?? now, now)} unless Ludovic vetoes it`;
  if (a.status === "stalled") return "Not enough votes, even after 48 more hours · Ludovic decides";
  if (a.status === "owner") return "Too few active voters · Ludovic decides";
  if (a.status === "accepted") return `Accepted ${when(a.decidedAt)}${a.revoked ? ` · role taken back ${when(a.revoked.at)}` : ""}`;
  return `Declined ${when(a.decidedAt)}`;
}

export function yourPart(a: Application) {
  const v = a.vote;
  if (a.owner && a.status === "veto-window") return "Approve it now, veto it, or let it go through.";
  if (a.owner && (a.status === "stalled" || a.status === "owner")) return "Your decision: accept or decline.";
  if (a.status !== "open") return "";
  if (v.recused) return "You recused yourself.";
  if (v.mine) return `You voted ${CHOICE[v.mine.choice]}. You can change it until the vote closes.`;
  if (v.canVote) return "Your vote is needed.";
  return a.owner ? "You don't vote; you can veto it at any time." : "You don't vote on this one.";
}

export async function ownerAct(dashboard: Dashboard, id: string, action: string, label: string) {
  let note = "";
  if (action === "veto") {
    const answer = window.prompt("Veto: the application is declined and the applicant gets the usual polite DM, without the votes.\nOptional note, only you will see it:", "");
    if (answer === null) return false;
    note = answer.slice(0, 1000);
  } else if (!window.confirm(`${label}: are you sure?`)) return false;
  await api("POST", `${dashboard}/applications/owner`, { id, action, note });
  return true;
}

function Prs({ prs }: { prs?: { url: string; title: string; number: number }[] }) {
  return (
    <>
      {(prs ?? []).map((p, i) => {
        const href = safeGithubUrl(p.url);
        return (
          <span key={`${p.number}-${i}`}>
            {i > 0 && " · "}
            {href ? (
              <a href={href} title={p.title} rel="noreferrer" className={LINK}>
                #{p.number}
              </a>
            ) : (
              `#${p.number}`
            )}
          </span>
        );
      })}
    </>
  );
}

function Contributor({ c }: { c: Application["contributor"] }) {
  if (!c) return null;
  if (!c.verified) return <span className={BADGE}>GitHub: {c.login} (not verified)</span>;
  return (
    <span className={`${BADGE} bg-[#8be0b4]/15 text-[#bdf0d4]`}>
      Contributor · {c.merged == null ? "pull requests unknown" : plural(c.merged, "merged PR")}
    </span>
  );
}

function Ballot({ a, dashboard, onDone }: { a: Application; dashboard: Dashboard; onDone: () => Promise<void> }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  if (!a.vote.canVote) return null;
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const choice = (form.elements.namedItem("choice") as RadioNodeList).value;
    const comment = (form.elements.namedItem("comment") as HTMLTextAreaElement).value;
    if (choice === "against" && !comment.trim()) return setStatus("Against needs a short comment.");
    setBusy(true);
    setStatus("Sending…");
    try {
      await api("POST", `${dashboard}/applications/vote`, { id: a.id, choice, comment });
      setStatus("");
      await onDone();
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl bg-white/[0.03] p-4">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Your vote</legend>
        {(Object.keys(CHOICE) as Choice[]).map((k) => (
          <label key={k} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2 text-sm text-white/85 has-[:checked]:bg-white has-[:checked]:text-[#100a1f]">
            <input type="radio" name="choice" value={k} defaultChecked={a.vote.mine?.choice === k} required className="sr-only" />
            {CHOICE[k]}
          </label>
        ))}
      </fieldset>
      <Field label="Comment (required for Against; the applicant never sees it)">
        <textarea name="comment" rows={2} maxLength={1000} defaultValue={a.vote.mine?.comment ?? ""} className={AREA} />
      </Field>
      <p className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={PRIMARY}>
          {a.vote.mine ? "Change my vote" : "Send my vote"}
        </button>
        <Status text={status} />
      </p>
    </form>
  );
}

function OwnerButtons({ a, dashboard, onDone }: { a: Application; dashboard: Dashboard; onDone: () => Promise<void> }) {
  const [status, setStatus] = useState("");
  if (!a.owner) return null;
  const buttons: [string, string, boolean][] = [];
  if (["veto-window", "stalled", "owner"].includes(a.status)) buttons.push(["approve", a.status === "veto-window" ? "Approve now" : "Accept", true]);
  if (["stalled", "owner"].includes(a.status)) buttons.push(["decline", "Decline", false]);
  if (!FINAL.includes(a.status)) buttons.push(["veto", "Veto", false]);
  if (a.status === "accepted" && !a.revoked) buttons.push(["revoke", "Take the role back", false]);
  if (!buttons.length) return null;
  const act = async (action: string, label: string) => {
    try {
      if (await ownerAct(dashboard, a.id, action, label)) await onDone();
    } catch (err) {
      setStatus((err as Error).message);
    }
  };
  return (
    <p className="mt-4 flex flex-wrap items-center gap-2">
      {buttons.map(([action, label, primary]) => (
        <button key={action} type="button" onClick={() => act(action, label)} className={primary ? PRIMARY : SECONDARY}>
          {label}
        </button>
      ))}
      <Status text={status} />
    </p>
  );
}

function More({ a, people, dashboard, onDone }: { a: Application; people: People; dashboard: Dashboard; onDone: () => Promise<void> }) {
  const v = a.vote;
  const recuse = async () => {
    if (!window.confirm("Recuse yourself? You won't vote or see the votes on this application.")) return;
    try {
      await api("POST", `${dashboard}/applications/vote`, { id: a.id, recuse: true });
      await onDone();
    } catch (err) {
      window.alert((err as Error).message);
    }
  };
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-white/55 hover:text-white">More: votes, history{v.canVote ? ", recuse" : ""}</summary>
      <div className="mt-3 space-y-3 text-white/70">
        {v.ballots?.length ? (
          <div>
            <h4 className="font-medium text-white">Votes</h4>
            <ul className="mt-1.5 space-y-1">
              {v.ballots.map((b, i) => (
                <li key={i}>
                  <strong className="text-white">{person(people, b.by)}</strong>: {CHOICE[b.choice]}
                  {b.comment ? ` · ${b.comment}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : a.status === "open" ? (
          <p className="text-white/50">{a.owner ? "Who voted what shows here when the vote closes." : "The others' votes show here once you vote (or when the vote closes)."}</p>
        ) : null}
        {(a.contributor?.prs?.length ?? 0) > 3 && (
          <p>
            More pull requests: <Prs prs={a.contributor?.prs?.slice(3)} />
          </p>
        )}
        {!a.contributor && <p className="text-white/50">No GitHub account linked on Discord.</p>}
        {v.canVote && (
          <p className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={recuse} className={GHOST_SM}>
              Recuse myself
            </button>
            <span className="text-white/45">You won&apos;t vote or see the votes on this one.</span>
          </p>
        )}
        {a.audit?.length ? (
          <div>
            <h4 className="font-medium text-white">History</h4>
            <ul className="mt-1.5 space-y-1">
              {a.audit.map((e, i) => (
                <li key={i}>
                  {when(e.at)} · {person(people, e.by)} {ACTION[e.action] ?? "acted"}
                  {e.choice ? `: ${CHOICE[e.choice]}` : ""}
                  {e.note ? ` (your note: ${e.note})` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-white/45">Sent {when(a.submittedAt)}.</p>
      </div>
    </details>
  );
}

function ApplicationCard({ a, people, dashboard, onDone }: { a: Application; people: People; dashboard: Dashboard; onDone: () => Promise<void> }) {
  const part = yourPart(a);
  const tally = a.vote.tally || a.tally;
  const r = a.result;
  const notes: string[] = [];
  if (a.githubManual && ["veto-window", "accepted"].includes(a.status)) notes.push("Accepting gives only the Discord role: GitHub organisation access is Ludovic's to give, by hand.");
  if (r && a.status === "accepted" && !r.granted) notes.push(`The role was not given${r.error ? `: ${r.error}` : ""}.`);
  if (r && r.dmSent === false) notes.push(`The DM was not sent${r.error ? `: ${r.error}` : ""}.`);
  if (a.revoked?.result?.error) notes.push(`Taking the role back: ${a.revoked.result.error}.`);
  return (
    <article id={`application-${a.id}`} className="scroll-mt-28 rounded-2xl bg-[#18112c] p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-white">{a.name || "Someone"}</h3>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className={BADGE}>{ROLE[a.role] ?? a.role}</span>
          <Contributor c={a.contributor} />
          {a.contributor?.verified && a.contributor.prs?.length ? (
            <span className="text-white/60">
              <Prs prs={a.contributor.prs.slice(0, 3)} />
            </span>
          ) : null}
        </p>
      </header>
      <p className="mt-2 text-sm font-medium text-[#c4b5ff]">{standing(a)}</p>
      <dl className="mt-4 space-y-3">
        {(a.questions ?? [])
          .filter((q) => a.answers?.[q.id])
          .map((q) => (
            <div key={q.id}>
              <dt className="text-[13px] font-medium text-white/55">{q.label}</dt>
              <dd className="mt-0.5 text-[15px] leading-relaxed text-white/85">
                <Lines text={a.answers?.[q.id]} />
              </dd>
            </div>
          ))}
      </dl>
      {tally && (
        <p className="mt-4 text-sm text-white/75">
          {a.status === "open" ? "So far" : "Result"}: {tally.for} for · {tally.against} against · {tally.abstain} abstain
        </p>
      )}
      {a.vote.againstComments?.length ? (
        <div className="mt-3 rounded-xl bg-white/[0.03] p-3 text-sm">
          <p className="text-white/50">Against, without names until the vote closes:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-white/75">
            {a.vote.againstComments.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {part && <p className={`mt-3 text-sm ${a.vote.canVote && !a.vote.mine ? "font-medium text-[#c4b5ff]" : "text-white"}`}>{part}</p>}
      <Ballot a={a} dashboard={dashboard} onDone={onDone} />
      <OwnerButtons a={a} dashboard={dashboard} onDone={onDone} />
      {notes.length > 0 && (
        <p className="mt-3 space-y-1 rounded-xl bg-[#f2c46b]/10 px-3 py-2 text-sm text-[#f6dca2]">
          {notes.map((n) => (
            <span key={n} className="block">
              {n}
            </span>
          ))}
        </p>
      )}
      <More a={a} people={people} dashboard={dashboard} onDone={onDone} />
    </article>
  );
}

export function Applications({ apps, people, dashboard, onDone }: { apps: Application[]; people: People; dashboard: Dashboard; onDone: () => Promise<void> }) {
  const open = apps.filter((a) => !FINAL.includes(a.status));
  const done = apps.filter((a) => FINAL.includes(a.status));
  return (
    <div className="space-y-4">
      <p className="text-[15px] text-white/60">
        Verified contributors come first.{" "}
        <Link href="/hub/staff-help#applications" className={LINK}>
          How the vote works
        </Link>
        .
      </p>
      {open.length ? (
        open.map((a) => (
          <Guard key={a.id} what={`${a.name || "An"} application`}>
            <ApplicationCard a={a} people={people} dashboard={dashboard} onDone={onDone} />
          </Guard>
        ))
      ) : (
        <Empty>No application waiting. New ones appear here when someone sends the form from /apply.</Empty>
      )}
      {done.length > 0 && (
        <details className="pt-2">
          <summary className="cursor-pointer font-display text-lg font-semibold text-white">
            Decided <span className="text-sm font-normal text-white/45">{done.length}</span>
          </summary>
          <div className="mt-4 space-y-4">
            {done.map((a) => (
              <Guard key={a.id} what={`${a.name || "An"} application`}>
                <ApplicationCard a={a} people={people} dashboard={dashboard} onDone={onDone} />
              </Guard>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
