"use client";

// "Edit project": an owner changes the page (no new version). The service checks ownership by GitHub ID and opens a
// pull request labelled owner-edit; this page only shows the link to it.
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  CategoriesField,
  DescriptionField,
  IconField,
  ScreenshotsField,
  TagsField,
  categoriesProblem,
  descriptionProblem,
  parseTags,
  type Shot,
} from "@/components/mod-page-fields";
import { CARD, Field, GHOST_SM, INPUT, LINK, PRIMARY } from "@/components/staff/ui";

const API = "/api/mods";
const PAGES = "https://horizon-rust.github.io/horizon-mods/";

/** The page fields of a listed project, as the index has them. */
export type EditableProject = {
  id: string;
  kind: string;
  name: string;
  summary: string;
  description: string;
  authors: string[];
  owners: string[];
  license: string;
  source: string;
  icon: string;
  categories: string[];
  tags: string[];
  screenshots: string[];
};

type Me = { login: string; csrf: string };
type Result = { ok: true; url: string } | { ok: false; message: string } | { pending: true };
type Problems = Partial<Record<"description" | "categories" | "tags" | "icon" | "shots", string>>;

function Hint({ children }: { children: ReactNode }) {
  return <span className="mt-1.5 block text-[13px] leading-relaxed text-white/45">{children}</span>;
}

// The service keeps the listed screenshots in the order sent and adds uploads after them.
const keptFirst = (shots: Shot[]) => [...shots.filter((s) => s.path), ...shots.filter((s) => !s.path)];

export function ModEditForm({ project: p }: { project: EditableProject }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [closed, setClosed] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState(p.description);
  const [categories, setCategories] = useState(p.categories);
  const [tags, setTags] = useState(p.tags.join(", "));
  const [icon, setIcon] = useState<File | null>(null);
  const [shots, setShots] = useState<Shot[]>(() =>
    p.screenshots.filter((u) => u.startsWith(PAGES)).map((url) => ({ key: url, url, path: url.slice(PAGES.length) })),
  );
  const [problems, setProblems] = useState<Problems>({});
  const owner = me ? p.owners.some((o) => o.toLowerCase() === me.login.toLowerCase()) : false;

  useEffect(() => {
    fetch(`${API}/me`, { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) return setMe(null);
        if (!r.ok) throw new Error(String(r.status));
        const data = (await r.json()) as Me;
        if (typeof data.login !== "string") throw new Error("bad answer");
        setMe(data);
      })
      .catch(() => setClosed(true));
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!me) return;
    const f = e.currentTarget;
    const v = (name: string) => ((f.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "").trim();
    const parsed = parseTags(tags);
    const found: Problems = {
      description: descriptionProblem(description),
      categories: categoriesProblem(categories),
      tags: parsed.problem,
      icon: problems.icon,
    };
    if (Object.values(found).some(Boolean)) {
      setProblems(found);
      setResult({ ok: false, message: "Some fields need a change: they are marked above." });
      requestAnimationFrame(() => f.querySelector("[data-problem]")?.scrollIntoView({ block: "center", behavior: "smooth" }));
      return;
    }
    setProblems({});
    const entry = {
      id: p.id,
      kind: p.kind,
      edit: true,
      name: v("name"),
      summary: v("summary"),
      description,
      authors: v("authors")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      license: v("license"),
      source: v("source"),
      categories,
      tags: parsed.tags,
      screenshots: shots.flatMap((s) => (s.path ? [s.path] : [])),
    };
    const body = new FormData();
    body.append("entry", JSON.stringify(entry));
    try {
      for (const [part, file] of [...(icon ? [["icon", icon] as const] : []), ...shots.flatMap((s) => (s.file ? [["screenshot", s.file] as const] : []))])
        body.append(part, new Blob([await file.arrayBuffer()], { type: file.type }), file.name);
    } catch {
      return setResult({ ok: false, message: "Your browser can't read one of the images any more: pick it again, then send." });
    }
    setBusy(true);
    setResult({ pending: true });
    try {
      const r = await fetch(`${API}/submit`, { method: "POST", body, credentials: "same-origin", headers: { "X-CSRF-Token": me.csrf } });
      const json = (await r.json().catch(() => ({}))) as { pull_request?: string; error?: string };
      if (r.ok && /^https:\/\/github\.com\/[^\s"'<>]+$/.test(json.pull_request ?? "")) setResult({ ok: true, url: json.pull_request! });
      else setResult({ ok: false, message: json.error || `The service answered ${r.status}.` });
    } catch {
      setResult({ ok: false, message: "The service didn't answer: check your connection, then try again in a minute." });
    } finally {
      setBusy(false);
    }
  };

  if (closed)
    return <p className="text-[15px] text-white/65">Editing isn&apos;t open right now. Try again in a few minutes.</p>;
  if (me === undefined) return <p className="text-sm text-white/50">Checking whether you are signed in…</p>;
  if (me === null)
    return (
      <div className="space-y-3">
        <p className="text-[15px] text-white/65">Sign in with the GitHub account that owns {p.name} to edit its page.</p>
        <a href={`${API}/auth/login?back=/mods/${encodeURIComponent(p.id)}/edit`} className={PRIMARY}>
          Sign in with GitHub
        </a>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-8">
      <p className="flex flex-wrap items-center gap-2 text-[15px] text-white/65">
        Signed in as <strong className="text-white">{me.login}</strong>.
        <button
          type="button"
          onClick={async () => {
            await fetch(`${API}/auth/logout`, { method: "POST", credentials: "same-origin" }).catch(() => {});
            setMe(null);
          }}
          className={GHOST_SM}
        >
          Sign out
        </button>
      </p>
      {!owner && (
        <p className="rounded-xl bg-[#f2c46b]/10 px-4 py-3 text-sm leading-relaxed text-[#f6dca3]">
          {p.name}&apos;s owners are {p.owners.map((o) => `@${o}`).join(", ") || "not listed"}. Only they can edit its page: the service will refuse this
          account.
        </p>
      )}
      <fieldset className={`${CARD} space-y-5`}>
        <legend className="sr-only">Its page</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input name="name" required maxLength={64} defaultValue={p.name} className={INPUT} />
          </Field>
          <Field label="Licence">
            <input name="license" required defaultValue={p.license} className={INPUT} />
          </Field>
        </div>
        <Field label="Summary">
          <input name="summary" required maxLength={160} defaultValue={p.summary} className={INPUT} />
          <Hint>One line for the list.</Hint>
        </Field>
        <DescriptionField
          value={description}
          onChange={(d) => {
            setDescription(d);
            if (problems.description) setProblems((x) => ({ ...x, description: descriptionProblem(d) }));
          }}
          problem={problems.description}
        />
        <CategoriesField
          kind={p.kind}
          value={categories}
          onChange={(c) => {
            setCategories(c);
            setProblems((x) => ({ ...x, categories: undefined }));
          }}
          problem={problems.categories}
        />
        <TagsField
          value={tags}
          onChange={(t) => {
            setTags(t);
            setProblems((x) => ({ ...x, tags: parseTags(t).problem }));
          }}
          problem={problems.tags}
        />
        <Field label="Authors">
          <input name="authors" defaultValue={p.authors.join(", ")} className={INPUT} />
          <Hint>Separated by commas.</Hint>
        </Field>
        <Field label="Source code">
          <input name="source" required type="url" pattern="https://.*" defaultValue={p.source} className={INPUT} />
        </Field>
        <IconField
          file={icon}
          current={p.icon}
          onChange={(file, problem) => {
            setIcon(problem ? null : file);
            setProblems((x) => ({ ...x, icon: problem || undefined }));
          }}
          problem={problems.icon}
          hint="Leave it to keep the current icon. A square PNG, 64 to 1024 pixels, at most 256 KiB."
        />
        <ScreenshotsField
          shots={shots}
          onChange={(s, problem) => {
            setShots(keptFirst(s));
            setProblems((x) => ({ ...x, shots: problem || undefined }));
          }}
          problem={problems.shots}
        />
        <Hint>New screenshots come after the ones it keeps.</Hint>
      </fieldset>
      <p className="text-[14px] leading-relaxed text-white/55">
        No new version: this changes the page only. A reviewer reads the change in a pull request, and the page updates when it is merged. A new file goes
        through{" "}
        <Link href="/mods/submit" className={LINK}>
          the submit form
        </Link>
        .
      </p>
      <p>
        <button type="submit" disabled={busy} className={PRIMARY}>
          Send the change
        </button>
      </p>
      <div role="status" aria-live="polite">
        {result && "pending" in result && <p className="text-sm text-white/60">Opening the pull request…</p>}
        {result && "ok" in result && result.ok && (
          <p className="text-lg text-white/80">
            Sent. Follow the review in{" "}
            <a href={result.url} rel="noreferrer" className={LINK}>
              its pull request
            </a>
            : the page changes when it is merged.
          </p>
        )}
        {result && "ok" in result && !result.ok && <p className="rounded-xl bg-[#f07a6a]/10 px-4 py-3 text-sm text-[#f7b2a8]">{result.message}</p>}
      </div>
    </form>
  );
}
