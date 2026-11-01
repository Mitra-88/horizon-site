"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { ApiError, api, setCsrf, type Dashboard, type Who } from "@/components/staff/api";
import { ModDashboard } from "@/components/staff/mod";
import { TeamDashboard } from "@/components/staff/team";
import { CARD, Field, GHOST_SM, INPUT, LINK, PRIMARY, SECONDARY_SM, Status } from "@/components/staff/ui";

const NAMES: Record<Dashboard, string> = { team: "Team", mod: "Moderation" };
const TITLES: Record<string, [string, string]> = {
  team: ["Team", "Team dashboard"],
  mod: ["Moderation", "Moderation dashboard"],
  setup: ["Staff", "Your staff password"],
  help: ["Help", "How this works"],
  "": ["Horizon Team and Mods", "Staff dashboards"],
};
const isDashboard = (v: string): v is Dashboard => v === "team" || v === "mod";
const never = () => () => {};

function readSetupToken() {
  try {
    if (window.location.hash.length > 1) {
      sessionStorage.setItem("staff:setup", window.location.hash.slice(1));
      window.history.replaceState(null, "", "/staff/setup");
    }
    return sessionStorage.getItem("staff:setup") ?? "";
  } catch {
    return "";
  }
}

function forgetSetupToken() {
  try {
    sessionStorage.removeItem("staff:setup");
  } catch {}
}

function Header({ view, message }: { view: string; message?: string }) {
  const [kicker, title] = TITLES[view] ?? TITLES[""];
  return (
    <div className="mb-8">
      <p className="text-sm font-medium text-white/60">
        Staff <span className="mx-1.5 text-white/30">·</span> {kicker}
      </p>
      <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-white">{title}</h1>
      {message && (
        <p role="status" className="mt-4 text-lg text-white/70">
          {message}
        </p>
      )}
    </div>
  );
}

function Login({ onSignedIn }: { onSignedIn: (who: Who) => void }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("username") as HTMLInputElement).value;
    const password = form.elements.namedItem("password") as HTMLInputElement;
    setBusy(true);
    setStatus("Signing in…");
    try {
      const who = await api<Who>("POST", "login", { name, password: password.value });
      setCsrf(who.csrf);
      form.reset();
      setStatus("");
      onSignedIn(who);
    } catch (err) {
      setStatus((err as Error).message);
      password.select();
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-labelledby="sign-in" className="max-w-md">
      <h2 id="sign-in" className="sr-only">
        Sign in
      </h2>
      <p className="text-[15px] leading-relaxed text-white/65">
        For the Horizon Team and the Mods. Your username is your Discord username. No password yet, or forgot it? Run <code className="font-mono text-[#e7e1ff]">/staff password</code> on
        Discord: Kira DMs you a link to set one.
      </p>
      <form onSubmit={submit} className={`${CARD} mt-6 space-y-4`}>
        <Field label="Discord username">
          <input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={64} className={INPUT} autoFocus />
        </Field>
        <Field label="Password">
          <input name="password" type="password" autoComplete="current-password" required maxLength={200} className={INPUT} />
        </Field>
        <p className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className={PRIMARY}>
            Sign in
          </button>
          <Status text={status} />
        </p>
      </form>
    </section>
  );
}

function Setup() {
  const router = useRouter();
  const token = useSyncExternalStore(never, readSetupToken, () => null);
  const [link, setLink] = useState<{ name: string; expiresAt: string | number } | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<{ name: string; expiresAt: string | number }>("POST", "setup/peek", { token }).then(setLink, (e: Error) => {
      forgetSetupToken();
      setError(e.message);
    });
  }, [token]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const again = (form.elements.namedItem("again") as HTMLInputElement).value;
    if (password !== again) return setStatus("The two passwords differ.");
    setBusy(true);
    setStatus("Saving…");
    try {
      const signed = await api<Who>("POST", "setup", { token, password });
      forgetSetupToken();
      setCsrf(signed.csrf);
      form.reset();
      router.replace(`/staff/${signed.dashboards[0] ?? ""}`);
    } catch (err) {
      setStatus((err as Error).message);
      setBusy(false);
    }
  };

  if (token === null) return <p className="text-sm text-white/50">Checking your link…</p>;
  const intro = !token
    ? "This page needs the link Kira DMs you. Run /staff password on Discord to get one."
    : error || (!link ? "Checking your link…" : null);
  if (intro) return <p className="max-w-xl text-[15px] leading-relaxed text-white/70">{intro}</p>;
  return (
    <section aria-labelledby="set-password" className="max-w-md">
      <h2 id="set-password" className="sr-only">
        Set your password
      </h2>
      <p className="text-[15px] leading-relaxed text-white/70">
        For <strong className="text-white">{link!.name}</strong>: the link works once and expires{" "}
        {new Date(link!.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
      </p>
      <form onSubmit={submit} className={`${CARD} mt-6 space-y-4`}>
        <input name="username" autoComplete="username" defaultValue={link!.name} hidden readOnly />
        <Field label="New password (12 characters or more)">
          <input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={200} className={INPUT} autoFocus />
        </Field>
        <Field label="The same again">
          <input name="again" type="password" autoComplete="new-password" required minLength={12} maxLength={200} className={INPUT} />
        </Field>
        <p className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className={PRIMARY}>
            Set it and sign in
          </button>
          <Status text={status} />
        </p>
      </form>
    </section>
  );
}

function HelpList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-white/70 marker:text-white/30">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Help() {
  const h2 = "mt-10 scroll-mt-28 font-display text-2xl font-semibold tracking-[-0.02em] text-white";
  const code = "font-mono text-[#e7e1ff]";
  return (
    <section className="max-w-3xl">
      <p className="text-lg leading-relaxed text-white/70">
        The Horizon Team and the Mods run these two dashboards together. Here is how they work.{" "}
        <Link href="/staff" className={LINK}>
          Back to the dashboards
        </Link>
        .
      </p>
      <h2 id="sign-in" className={h2}>
        Signing in
      </h2>
      <HelpList
        items={[
          <>
            Run <code className={code}>/staff password</code> on Horizon&apos;s Discord: Kira DMs you a link that works once, for 30 minutes. Choose a password of 12
            characters or more.
          </>,
          <>
            Sign in with your Discord username. Forgot your password? Run <code className={code}>/staff password</code> again: the new one replaces it.
          </>,
          "A session ends after 12 hours without use, and after 7 days at most. “Sign out everywhere” ends every session you have. If you lose the Team or Mod role, your sessions end at once.",
        ]}
      />
      <h2 id="applications" className={h2}>
        Applications and the vote
      </h2>
      <HelpList
        items={[
          <>
            <strong className="text-white">Who votes.</strong> Team applications: the Team. Mod applications: the Mods. Support applications: the Mods and the Team. Nobody
            votes on their own application, and you can recuse yourself.
          </>,
          <>
            <strong className="text-white">Your vote.</strong> For, Against or Abstain. Against needs a short comment. You can change your vote until the vote closes.
          </>,
          <>
            <strong className="text-white">Blind until you vote.</strong> You see the others&apos; votes and comments only once you have voted, or when the vote closes, so
            nobody just follows the crowd. Ludovic doesn&apos;t vote: while a vote runs he sees only the counts and the Against comments, without names.
          </>,
          <>
            <strong className="text-white">Enough votes.</strong> An active voter is someone who signed in or acted here in the last 30 days. A vote needs at least 2 votes,
            and at least 40% of the active voters. With fewer than 2 active voters, Ludovic decides.
          </>,
          <>
            <strong className="text-white">Passing.</strong> At least two thirds of the For and Against votes are For (abstentions don&apos;t count either way), with enough
            votes.
          </>,
          <>
            <strong className="text-white">How long.</strong> 72 hours from the first vote, or less once every active voter has voted. Without enough votes it gets 48 more
            hours once; after that it goes to Ludovic.
          </>,
          <>
            <strong className="text-white">Verified contributors</strong> (GitHub linked and proved on Discord) are listed first, with their merged pull requests.
          </>,
        ]}
      />
      <h2 id="veto" className={h2}>
        Ludovic&apos;s veto
      </h2>
      <HelpList
        items={[
          "Ludovic can veto any application at any time, while it is voted on or after it passed. A veto declines it; no reason is needed.",
          "When a vote passes, Kira DMs him and a 12-hour window opens. If he does nothing, the role is given when it ends and the person gets a DM. He can also approve at once.",
          "After a role is given he can still take it back from the dashboard: a normal removal, written in the log.",
          "A Team acceptance gives only the Discord role. Access to the GitHub organisation is Ludovic's to give, by hand.",
        ]}
      />
      <h2 id="log" className={h2}>
        What is stored, and for how long
      </h2>
      <HelpList
        items={[
          "Every vote, change, recusal, veto and decision is written in a log that can't be edited. Voters and Ludovic see it under “More” on each application.",
          "The applicant only gets a polite yes or no in their DMs: never the votes, the comments or who voted. After a no, they can apply again in 14 days.",
          <>
            <strong className="text-white">Your password:</strong> only a scrypt hash, never the password itself; nobody can read it back.{" "}
            <strong className="text-white">Sessions:</strong> only until they end (above).
          </>,
          <>
            <strong className="text-white">Links Kira DMs:</strong> a password link works once, for 30 minutes; an application link once, for a day.
          </>,
          <>
            <strong className="text-white">Applications:</strong> answers, vote comments and GitHub details are deleted 90 days after the decision; only the role, the
            outcome and the date stay (
            <Link href="/privacy" className={LINK}>
              privacy
            </Link>
            ).
          </>,
          <>
            <strong className="text-white">Statistics:</strong> daily counts only, kept 120 days: no messages, nothing from anyone&apos;s private DMs.
          </>,
          <>
            <strong className="text-white">The board, the roadmap notes and the decisions:</strong> kept until the Team removes them; decisions are never deleted, only
            withdrawn.
          </>,
        ]}
      />
    </section>
  );
}

function Signed({ view, who, onSignedOut }: { view: Dashboard; who: Who; onSignedOut: (all: boolean) => void }) {
  return (
    <>
      <div className="mb-8 flex flex-col gap-4 rounded-2xl bg-[#18112c] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Dashboards" className="flex gap-1">
          {who.dashboards.length > 1 &&
            who.dashboards.map((d) => (
              <Link
                key={d}
                href={`/staff/${d}`}
                aria-current={d === view ? "page" : undefined}
                className={`inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-medium transition-colors ${
                  d === view ? "bg-white text-[#100a1f]" : "text-white/65 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {NAMES[d]}
              </Link>
            ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-white/60">Signed in as {who.name}</span>
          <button type="button" onClick={() => onSignedOut(false)} className={SECONDARY_SM}>
            Sign out
          </button>
          <button type="button" onClick={() => onSignedOut(true)} className={GHOST_SM}>
            Sign out everywhere
          </button>
        </div>
      </div>
      {!who.dashboards.includes(view) ? (
        <p className="text-lg text-white/70">
          This dashboard is for the {view === "team" ? "Horizon Team" : "Mods"}.{" "}
          {who.dashboards.map((d, i) => (
            <span key={d}>
              {i > 0 && " or "}
              <Link href={`/staff/${d}`} className={LINK}>
                Open the {NAMES[d]} dashboard
              </Link>
            </span>
          ))}
          .
        </p>
      ) : view === "team" ? (
        <TeamDashboard who={who} />
      ) : (
        <ModDashboard who={who} />
      )}
    </>
  );
}

export function StaffApp({ view }: { view: string }) {
  const router = useRouter();
  const [who, setWho] = useState<Who | null | undefined>(undefined);
  const [message, setMessage] = useState("");
  const needsSession = view !== "setup" && view !== "help";

  useEffect(() => {
    if (!needsSession) return;
    api<Who>("GET", "me").then(
      (w) => {
        setCsrf(w.csrf);
        setWho(w);
      },
      (e: ApiError) => {
        if (e.status === 401) setWho(null);
        else setMessage(e.message);
      },
    );
  }, [needsSession]);

  useEffect(() => {
    if (who && !isDashboard(view) && who.dashboards[0]) router.replace(`/staff/${who.dashboards[0]}`);
  }, [who, view, router]);

  useEffect(() => {
    const [, title] = TITLES[view] ?? TITLES[""];
    document.title = `${title} · Horizon`;
  }, [view]);

  const signOut = async (all: boolean) => {
    try {
      await api("POST", all ? "logout-all" : "logout");
    } catch {}
    setCsrf("");
    setWho(null);
    setMessage(all ? "Signed out on every device." : "Signed out.");
  };

  let body: ReactNode;
  if (view === "help") body = <Help />;
  else if (view === "setup") body = <Setup />;
  else if (message && who === undefined) body = null;
  else if (who === undefined) body = <p className="text-sm text-white/50">Checking your session…</p>;
  else if (who === null)
    body = (
      <Login
        onSignedIn={(w) => {
          setMessage("");
          setWho(w);
        }}
      />
    );
  else if (!isDashboard(view)) body = <p className="text-sm text-white/50">Opening your dashboard…</p>;
  else body = <Signed view={view} who={who} onSignedOut={signOut} />;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-32 pb-24 sm:pt-36 lg:px-10">
      <Header view={view} message={message} />
      {body}
    </main>
  );
}
