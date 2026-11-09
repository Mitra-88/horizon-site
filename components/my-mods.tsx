"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ModIcon } from "@/components/mods-ui";
import { KIND_NAMES, SUBMIT_URL } from "@/components/mods-logic";

/** A version as "Your mods" lists it: what Horizon it is made for and, for the newest, whether it still builds. */
export type OwnedVersion = {
  version: string;
  published: string;
  madeFor: string;
  broken: { horizon: string; code: string } | null;
  native: boolean;
};

/** A listed project, with the owners the index names, for "Your mods". */
export type OwnedProject = {
  id: string;
  name: string;
  kind: string;
  icon: string;
  owners: string[];
  downloads: number;
  versions: OwnedVersion[];
};

/** A pull request the submission form opened for the signed-in account (`submitted-by` in its body). */
type Submission = { number: number; title: string; state: string; merged: boolean; url: string; created: string };

const BUTTON =
  "inline-flex h-9 items-center rounded-lg bg-white/10 px-3.5 text-sm font-medium text-white transition-colors outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#a98fff]";
const PRIMARY =
  "inline-flex h-11 items-center rounded-lg bg-white px-4 text-[15px] font-medium text-[#100a1f] transition-colors outline-none hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-[#a98fff]";
const CARD = "rounded-2xl bg-[#18112c] px-5 py-5 sm:px-6";
const LOGIN = "/api/mods/auth/login?back=/mods/mine";

function Status({ v }: { v: OwnedVersion }) {
  if (v.broken) {
    return (
      <span className="text-[#f07a6a]" title={`The registry's daily check: ${v.broken.code} on Horizon ${v.broken.horizon.slice(0, 7)}`}>
        Doesn&apos;t build on the newest Nightly ({v.broken.code})
      </span>
    );
  }
  return v.native ? <span className="text-[#8be0b4]">Builds on the newest Nightly</span> : null;
}

function Project({ p }: { p: OwnedProject }) {
  const [newest, ...older] = p.versions;
  return (
    <article className={CARD}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <ModIcon id={p.id} icon={p.icon} size={56} className="shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-semibold tracking-[-0.01em] text-white">
            <Link href={`/mods/${encodeURIComponent(p.id)}`} className="hover:underline">
              {p.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-white/55">
            {KIND_NAMES[p.kind] ?? p.kind} · {p.downloads.toLocaleString("en-US")} downloads · <span className="font-mono">{p.id}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/mods/${encodeURIComponent(p.id)}/edit`} className={BUTTON}>
            Edit page
          </Link>
          <Link href={`${SUBMIT_URL}?id=${encodeURIComponent(p.id)}`} className={BUTTON}>
            Submit an update
          </Link>
        </div>
      </div>
      <table className="mt-5 w-full text-left text-[14px]">
        <caption className="sr-only">{p.name}&apos;s versions</caption>
        <thead className="text-[12px] tracking-wide text-white/45 uppercase">
          <tr>
            <th className="py-1.5 pr-4 font-medium">Version</th>
            <th className="py-1.5 pr-4 font-medium">Published</th>
            <th className="hidden py-1.5 pr-4 font-medium sm:table-cell">Made for</th>
            <th className="py-1.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="text-white/75">
          {[newest, ...older].map((v, i) => (
            <tr key={v.version} className="border-t border-white/[0.06]">
              <td className="py-2 pr-4 font-mono text-white">{v.version}</td>
              <td className="py-2 pr-4 whitespace-nowrap">{v.published || "—"}</td>
              <td className="hidden py-2 pr-4 sm:table-cell">{v.madeFor}</td>
              <td className="py-2">{i === 0 ? <Status v={v} /> : <span className="text-white/40">Older version</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function Submissions({ title, list, open }: { title: string; list: Submission[]; open: boolean }) {
  if (!list.length) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">{title}</h2>
      <ul className="mt-4 space-y-2">
        {list.map((s) => (
          <li key={s.number} className={`${CARD} flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between`}>
            <span className="text-[15px] text-white">{s.title}</span>
            <span className="flex items-center gap-3 text-sm text-white/55">
              <span className={open ? "text-[#f2c46b]" : s.merged ? "text-[#8be0b4]" : "text-white/45"}>
                {open ? "Waiting for review" : s.merged ? "Published" : "Closed"}
              </span>
              <span>{s.created}</span>
              <a href={s.url} className="font-medium text-[#c4b5ff] underline underline-offset-4 hover:text-white">
                #{s.number}
              </a>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The signed-in account's projects (the index's owners, as "Edit project" decides them) and its submissions. */
export function MyMods({ projects }: { projects: OwnedProject[] }) {
  const [login, setLogin] = useState<string | null | undefined>(undefined);
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);

  useEffect(() => {
    fetch("/api/mods/me", { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => {
        const me = r.ok ? ((await r.json()) as { login?: string }) : {};
        setLogin(typeof me.login === "string" ? me.login : null);
      })
      .catch(() => setLogin(null));
  }, []);

  useEffect(() => {
    if (!login) return;
    fetch(`/api/mod-submissions?login=${encodeURIComponent(login)}`, { cache: "no-store" })
      .then(async (r) => setSubmissions(r.ok ? ((await r.json()) as Submission[]) : []))
      .catch(() => setSubmissions([]));
  }, [login]);

  if (login === undefined) return <p className="mt-8 text-white/55">Checking who you are…</p>;
  if (login === null) {
    return (
      <div className={`${CARD} mt-8 py-8`}>
        <p className="max-w-xl text-[15px] leading-relaxed text-white/70">
          Sign in with the GitHub account you submit with to see your mods, their versions and the submissions waiting for review. The site reads
          only your public profile.
        </p>
        <a href={LOGIN} className={`${PRIMARY} mt-5`}>
          Sign in with GitHub
        </a>
      </div>
    );
  }

  const me = login.toLowerCase();
  const owned = projects.filter((p) => p.owners.some((o) => o.toLowerCase() === me));
  const open = (submissions ?? []).filter((s) => s.state === "open");
  const done = (submissions ?? []).filter((s) => s.state !== "open");

  return (
    <div className="mt-8">
      <p className="text-[15px] text-white/60">
        Signed in as <strong className="text-white">{login}</strong>.
      </p>
      <Submissions title="Waiting for review" list={open} open />
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">Listed</h2>
          <Link href={SUBMIT_URL} className={PRIMARY}>
            Submit a new one
          </Link>
        </div>
        {owned.length ? (
          <div className="mt-4 space-y-4">
            {owned.map((p) => (
              <Project key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[15px] text-white/60">
            Nothing listed with {login} among its owners yet. A submission shows here once a reviewer merges it.
          </p>
        )}
      </section>
      <Submissions title="Earlier submissions" list={done.slice(0, 20)} open={false} />
    </div>
  );
}
