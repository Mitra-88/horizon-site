"use client";

import { useEffect, useState } from "react";

type Me = { login: string; csrf: string };

export function ModRating({ id, owners }: { id: string; owners: string[] }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [mine, setMine] = useState<number | null>(null);
  const [closed, setClosed] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const path = `/api/mods/${encodeURIComponent(id)}`;

  useEffect(() => {
    fetch("/api/mods/me", { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) return setMe(null);
        if (!r.ok) throw new Error(String(r.status));
        const who = (await r.json()) as Me;
        setMe(who);
        const own = await fetch(`${path}/rating`, { credentials: "same-origin", cache: "no-store" });
        if (own.ok) setMine(((await own.json()) as { stars?: number | null }).stars ?? null);
      })
      .catch(() => setClosed(true));
  }, [path]);

  const rate = async (stars: number) => {
    if (!me || busy) return;
    setBusy(true);
    setStatus("");
    try {
      const r = await fetch(`${path}/rating`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": me.csrf },
        body: JSON.stringify({ stars }),
      });
      const json = (await r.json().catch(() => ({}))) as { stars?: number; average?: number; count?: number; error?: string };
      if (r.ok) {
        setMine(json.stars ?? stars);
        setStatus(json.average != null && json.count != null ? `Thanks. Now ${json.average.toFixed(1)} from ${json.count} rating${json.count === 1 ? "" : "s"}.` : "Thanks.");
      } else {
        setStatus(json.error || `The service answered ${r.status}.`);
      }
    } catch {
      setStatus("The service didn't answer. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  };

  let body;
  if (closed) body = <p className="text-[14px] text-white/55">Ratings aren&apos;t open right now.</p>;
  else if (me === undefined) body = <p className="text-[14px] text-white/45">Checking…</p>;
  else if (me === null)
    body = (
      <a
        href={`/api/mods/auth/login?back=/mods/${encodeURIComponent(id)}`}
        className="inline-flex h-9 items-center rounded-lg bg-white/10 px-3.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
      >
        Sign in with GitHub to rate
      </a>
    );
  else if (owners.some((o) => o.toLowerCase() === me.login.toLowerCase())) body = <p className="text-[14px] text-white/60">You publish it: players rate it.</p>;
  else
    body = (
      <div>
        <p className="text-[13px] text-white/50">{mine ? "Your rating" : "Rate it"}</p>
        <div role="group" aria-label="Your rating" className="mt-1.5 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={busy}
              aria-pressed={mine === n}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              onClick={() => rate(n)}
              className={`grid size-9 place-items-center rounded-lg text-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] ${
                n <= (mine ?? 0) ? "bg-[#f2c46b]/15 text-[#f2c46b]" : "bg-white/[0.06] text-white/30 hover:text-[#f2c46b]"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
    );

  return (
    <div className="rounded-2xl bg-[#18112c] p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold text-white">Rating</h2>
      <div className="mt-3">{body}</div>
      <p role="status" className="mt-2 text-[13px] text-white/55">
        {status}
      </p>
    </div>
  );
}
