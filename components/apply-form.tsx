"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { api } from "@/components/staff/api";
import { AREA, CARD, Field, INPUT, LINK, PRIMARY, SECONDARY, Status } from "@/components/staff/ui";

type Question = { id: string; label: string; short?: boolean; max: number; required?: boolean };
type Invite = { name?: string; role: string; roleName: string; expiresAt: string | number; questions: Question[] };

const KEY = "apply:token";
const never = () => () => {};

function readToken() {
  try {
    if (window.location.hash.length > 1) {
      sessionStorage.setItem(KEY, window.location.hash.slice(1));
      window.history.replaceState(null, "", "/apply");
    }
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function forget() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

export function ApplyForm() {
  const token = useSyncExternalStore(never, readToken, () => null);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<Invite>("POST", "apply/peek", { token }).then(setInvite, (e: Error) => {
      forget();
      setError(e.message);
    });
  }, [token]);

  useEffect(() => {
    if (invite) document.title = `Apply for ${invite.roleName} · Horizon`;
  }, [invite]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!invite || !token) return;
    const form = e.currentTarget;
    const answers = Object.fromEntries(invite.questions.map((q) => [q.id, (form.elements.namedItem(q.id) as HTMLInputElement | HTMLTextAreaElement).value]));
    setBusy(true);
    setStatus("Sending…");
    try {
      await api("POST", "apply/submit", { token, answers });
      forget();
      setSent(true);
    } catch (err) {
      setStatus((err as Error).message);
      setBusy(false);
    }
  };

  const title = invite ? `Apply for ${invite.roleName}` : "Apply to help run Horizon";
  let body;
  if (sent) {
    body = (
      <div className="space-y-6">
        <p className="text-lg leading-relaxed text-white/75">
          Sent, thank you. The members who vote on it will read it over the next few days; Kira DMs you the answer on Discord.
        </p>
        <Link href="/hub" className={SECONDARY}>
          Back to the hub
        </Link>
      </div>
    );
  } else if (token === null || (token && !invite && !error)) {
    body = <p className="text-lg text-white/70">Checking your link…</p>;
  } else if (!token) {
    body = (
      <p className="max-w-2xl text-lg leading-relaxed text-white/70">
        To apply for Support or Mod, run <code className="font-mono text-[#e7e1ff]">/apply</code> on Horizon&apos;s Discord server: Kira DMs you a link to this form.
      </p>
    );
  } else if (error || !invite) {
    body = <p className="max-w-2xl text-lg leading-relaxed text-white/70">{error}</p>;
  } else {
    body = (
      <>
        <p className="max-w-2xl text-lg leading-relaxed text-white/70">
          {invite.name ? (
            <>
              As <strong className="text-white">{invite.name}</strong> on Discord.{" "}
            </>
          ) : null}
          Take your time: the link works once, until{" "}
          {new Date(invite.expiresAt).toLocaleString([], { weekday: "long", hour: "2-digit", minute: "2-digit" })}.
          {invite.role === "team" && (
            <>
              {" "}
              If you linked your GitHub account with <code className="font-mono text-[#e7e1ff]">/link-github</code> and proved it with{" "}
              <code className="font-mono text-[#e7e1ff]">/verify-github</code>, your merged pull requests in Horizon are shown with your application.
            </>
          )}
        </p>
        <form onSubmit={submit} className={`${CARD} mt-8 max-w-3xl space-y-5`}>
          {invite.questions.map((q) => (
            <Field key={q.id} label={`${q.label}${q.required ? "" : " (optional)"}`}>
              {q.short ? (
                <input name={q.id} maxLength={q.max} required={q.required} className={INPUT} />
              ) : (
                <textarea name={q.id} rows={5} maxLength={q.max} required={q.required} className={AREA} />
              )}
            </Field>
          ))}
          <p className="text-[13px] leading-relaxed text-white/50">
            Only the members who vote on applications for this role and Ludovic read it. Your answers are deleted 90 days after the decision (
            <Link href="/privacy" className={LINK}>
              privacy
            </Link>
            ).
          </p>
          <p className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy} className={PRIMARY}>
              Send my application
            </button>
            <Status text={status} />
          </p>
        </form>
      </>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-32 pb-24 sm:pt-36 lg:px-10">
      <p className="text-sm font-medium text-white/60">
        Apply <span className="mx-1.5 text-white/30">·</span> Support, Mod
      </p>
      <h1 className="mt-3 mb-6 font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-white">{title}</h1>
      {body}
    </main>
  );
}
