"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { api } from "@/components/staff/api";
import { AREA, CARD, Field, INPUT, LINK, PRIMARY, SECONDARY, Status } from "@/components/staff/ui";

// /hub/appeal: for people banned from Horizon's Discord (they can't see the server) and players banned from the official
// Minecraft server. Timeouts and quarantines are appealed inside Discord. Who you are comes from the link Kira DMs before a
// ban, or from signing in with Discord. Kira's side: src/features/modcases.js (routes appeal/*).

type Question = { id: string; label: string; max: number; required?: boolean };
type Case = { n: number; action: string; label: string; at: number; until?: number | null; reason?: string | null; ign?: string | null; canAppeal: boolean; why?: string | null };
type Appeal = { id: string; case: number; label: string; at: number; status: "open" | "decided"; outcome?: string | null };
type View = { name?: string | null; cases: Case[]; appeals: Appeal[]; questions: Question[] };

const KEY = "appeal:token";
const never = () => () => {};
const NOTES: Record<string, string> = {
  "signin-off": "Signing in with Discord isn't available yet. Use the link Kira sent you in a DM.",
  "signin-failed": "Signing in with Discord didn't work. Try again, or use the link Kira sent you in a DM.",
};

function readHash() {
  try {
    const h = window.location.hash.slice(1);
    if (h) {
      window.history.replaceState(null, "", "/hub/appeal");
      if (NOTES[h]) sessionStorage.setItem(`${KEY}:note`, h);
      else localStorage.setItem(KEY, h);
    }
    return `${localStorage.getItem(KEY) ?? ""}|${sessionStorage.getItem(`${KEY}:note`) ?? ""}`;
  } catch {
    return "|";
  }
}

function forget() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(`${KEY}:note`);
  } catch {}
}

const day = (ms: number) => new Date(ms).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });

export function AppealForm() {
  const read = useSyncExternalStore(never, readHash, () => null);
  const [token, note] = read === null ? [null, ""] : read.split("|");
  const [signIn, setSignIn] = useState<boolean | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState("");
  const [target, setTarget] = useState<string>("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api<{ signIn: boolean }>("POST", "appeal/config", {}).then((c) => setSignIn(c.signIn), () => setSignIn(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    api<View>("POST", "appeal/peek", { token }).then(
      (v) => {
        setView(v);
        const first = v.cases.find((c) => c.canAppeal);
        setTarget(first ? String(first.n) : "minecraft");
      },
      (e: Error) => {
        forget();
        setError(e.message);
      },
    );
  }, [token, sent]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!view || !token) return;
    const form = e.currentTarget;
    const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? "";
    const answers = Object.fromEntries(view.questions.map((q) => [q.id, value(q.id)]));
    const body =
      target === "minecraft" ? { token, kind: "minecraft", ign: value("ign"), banText: value("banText"), answers } : { token, kind: "discord", case: Number(target), answers };
    setBusy(true);
    setStatus("Sending…");
    try {
      await api("POST", "appeal/submit", body);
      setSent(true);
      setStatus("");
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const signInLink = signIn ? (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- a route that redirects to Discord's sign-in, not a page
    <a href="/staff/api/appeal/login" className={PRIMARY}>
      Sign in with Discord
    </a>
  ) : null;

  let body;
  if (token === null || (token && !view && !error)) {
    body = <p className="text-lg text-white/70">Checking…</p>;
  } else if (!token || error) {
    body = (
      <div className="max-w-2xl space-y-6 text-lg leading-relaxed text-white/70">
        {note ? <p>{NOTES[note]}</p> : null}
        {error ? <p>{error}</p> : null}
        <p>
          This page is for people banned from Horizon&apos;s Discord server, and for players banned from the official Minecraft server. A timeout or a
          quarantine is appealed on Discord: the <strong className="text-white">Open appeal</strong> button in Kira&apos;s DM, or in #appeal.
        </p>
        <p>{signIn ? "Sign in with Discord so the mods know who is appealing, or open the link Kira sent you in a DM." : "Open the link Kira sent you in a DM: it says who is appealing."}</p>
        {signInLink}
      </div>
    );
  } else if (view) {
    const open = view.cases.filter((c) => c.canAppeal);
    body = (
      <div className="space-y-8">
        <p className="max-w-2xl text-lg leading-relaxed text-white/70">
          {view.name ? (
            <>
              As <strong className="text-white">{view.name}</strong> on Discord.{" "}
            </>
          ) : null}
          The mods read the form and decide; the one who acted never decides alone. Come back to this page to read the answer.
        </p>
        {view.appeals.length ? (
          <section className={`${CARD} max-w-3xl space-y-3`}>
            <h2 className="font-display text-xl font-semibold text-white">Your appeals</h2>
            <ul className="space-y-3">
              {view.appeals.map((a) => (
                <li key={a.id} className="text-[15px] leading-relaxed text-white/75">
                  <span className="text-white">
                    Case #{a.case} · {a.label}
                  </span>{" "}
                  <span className="text-white/45">sent {day(a.at)}</span>
                  <p className="mt-1 whitespace-pre-line">{a.outcome ?? "Open: the mods haven't decided yet."}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {sent ? (
          <p className="text-lg text-white/75">Sent, thank you. The answer shows here once the mods decide.</p>
        ) : (
          <form onSubmit={submit} className={`${CARD} max-w-3xl space-y-5`}>
            <Field label="What you are appealing">
              <select value={target} onChange={(e) => setTarget(e.target.value)} className={INPUT}>
                {open.map((c) => (
                  <option key={c.n} value={c.n}>
                    Case #{c.n}: {c.label} on {day(c.at)}
                    {c.reason ? ` (${c.reason.slice(0, 60)})` : ""}
                  </option>
                ))}
                <option value="minecraft">A ban from the official Minecraft server</option>
              </select>
            </Field>
            {view.cases
              .filter((c) => !c.canAppeal && c.why)
              .map((c) => (
                <p key={c.n} className="text-[13px] text-white/50">
                  Case #{c.n} ({c.label}): {c.why}
                </p>
              ))}
            {target === "minecraft" ? (
              <>
                <Field label="Your in-game name">
                  <input name="ign" required minLength={3} maxLength={16} pattern="[A-Za-z0-9_]{3,16}" className={INPUT} />
                </Field>
                <Field label="What the ban message said (optional)">
                  <input name="banText" maxLength={300} className={INPUT} />
                </Field>
              </>
            ) : null}
            {view.questions.map((q) => (
              <Field key={q.id} label={`${q.label}${q.required ? "" : " (optional)"}`}>
                <textarea name={q.id} rows={4} maxLength={q.max} required={q.required} className={AREA} />
              </Field>
            ))}
            <p className="text-[13px] leading-relaxed text-white/50">
              Only the mods (for the Minecraft server, its ops) and Ludovic read it. One appeal per action; another one 7 days after a decision (
              <Link href="/privacy" className={LINK}>
                privacy
              </Link>
              ).
            </p>
            <p className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={busy} className={PRIMARY}>
                Send my appeal
              </button>
              <Status text={status} />
            </p>
          </form>
        )}
        <button
          type="button"
          className={SECONDARY}
          onClick={() => {
            forget();
            window.location.reload();
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-32 pb-24 sm:pt-36 lg:px-10">
      <p className="text-sm font-medium text-white/60">
        Hub <span className="mx-1.5 text-white/30">·</span> Appeal
      </p>
      <h1 className="mt-3 mb-6 font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-white">Appeal a ban</h1>
      {body}
    </main>
  );
}
