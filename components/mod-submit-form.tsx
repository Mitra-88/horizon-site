"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  CategoriesField,
  DescriptionField,
  IconField,
  Problem,
  ScreenshotsField,
  TagsField,
  categoriesProblem,
  descriptionProblem,
  parseTags,
  type Shot,
} from "@/components/mod-page-fields";
import { CATEGORIES, KIND_NAMES, KINDS, type ModProject } from "@/components/mods-logic";
import { AREA, CARD, Field, GHOST_SM, INPUT, LINK, PRIMARY, SECONDARY_SM } from "@/components/staff/ui";
import { zipKind } from "@/components/zip-kind";

const API = "/api/mods";
const REGISTRY = "https://github.com/horizon-rust/horizon-mods";
const INDEX = "https://horizon-rust.github.io/horizon-mods/index.json";
const MAX_FILE = 64 << 20;
// Each extension and the kinds it can be. A .zip is one of three: the form reads its folders, or asks.
const EXTENSIONS: Record<string, string[]> = {
  hmod: ["mod"],
  hnmod: ["native-mod"],
  hpack: ["modpack"],
  hshader: ["shader"],
  zip: ["resourcepack", "datapack", "shaderpack"],
};
const KIND_OPTIONS: Record<string, string> = {
  mod: "Mod (.hmod)",
  "native-mod": "Native mod (.hnmod)",
  modpack: "Modpack (.hpack)",
  resourcepack: "Resource pack (.zip)",
  shader: "Shader pack (.hshader, Horizon's own format)",
  shaderpack: "Shader pack (.zip with a shaders/ folder)",
  datapack: "Data pack (.zip)",
};
const ZIP_KINDS = "a Resource pack, a Data pack or a Shader pack (shaders/ folder)";

/** A project the registry lists: a submission with its id adds a version to it. */
export type KnownProject = { id: string; kind: string; name: string; icon: string };

type Me = { login: string; csrf: string };
type Result = { ok: true; url: string } | { ok: false; message: string } | { pending: true };
type Problems = Partial<Record<"file" | "kind" | "description" | "categories" | "tags" | "icon" | "shots" | "own", string>>;
const extension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

function Hint({ children }: { children: ReactNode }) {
  return <span className="mt-1.5 block text-[13px] leading-relaxed text-white/45">{children}</span>;
}

const code = "font-mono text-[#e7e1ff]";

export function ModSubmitForm({ known }: { known: KnownProject[] }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [closed, setClosed] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState("mod");
  const [id, setId] = useState("");
  const [zipNote, setZipNote] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [icon, setIcon] = useState<File | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [ownWork, setOwnWork] = useState(false);
  const [problems, setProblems] = useState<Problems>({});
  const [filled, setFilled] = useState("");
  const existing = known.find((p) => p.id === id.trim());

  const pickKind = (k: string) => {
    setKind(k);
    setCategories((c) => c.filter((x) => CATEGORIES[k]?.includes(x)));
    setProblems((p) => ({ ...p, kind: undefined, categories: undefined }));
  };

  // Fills the page fields from the project's current page, so a new version doesn't replace them with blanks.
  const fillFromPage = async () => {
    setFilled("Loading its page…");
    try {
      const index = (await (await fetch(INDEX, { cache: "no-store" })).json()) as { projects?: ModProject[] };
      const p = index.projects?.find((x) => x.id === existing?.id);
      if (!p) return setFilled("Its page couldn't be found in the registry's index.");
      const set = (name: string, value?: string) => {
        const c = control(name);
        if (c) c.value = value ?? "";
      };
      set("name", p.name);
      set("summary", p.summary);
      set("authors", (p.authors ?? []).join(", "));
      set("license", p.license);
      set("source", p.source);
      pickKind(p.kind);
      setDescription(p.description ?? "");
      setCategories((p.categories ?? []).filter((c) => CATEGORIES[p.kind]?.includes(c)));
      setTags((p.tags ?? []).join(", "));
      setFilled(`Filled in from ${p.name}'s page: change what you want.`);
    } catch {
      setFilled("The registry's index didn't answer: fill the fields in by hand.");
    }
  };

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

  const signOut = async () => {
    await fetch(`${API}/auth/logout`, { method: "POST", credentials: "same-origin" }).catch(() => {});
    setMe(null);
  };

  const control = (name: string) => form.current?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    const name = picked?.name ?? "";
    const kinds = EXTENSIONS[extension(name)];
    setProblems((p) => ({ ...p, file: undefined, kind: undefined }));
    setZipNote("");
    const m = name.match(/^([a-z0-9_]{1,64})-([A-Za-z0-9][A-Za-z0-9._-]*)\.(hmod|hnmod|hpack|zip|hshader)$/);
    if (m) {
      const version = control("version");
      if (!id) setId(m[1]);
      if (version && !version.value) version.value = m[2];
    }
    if (!picked || !kinds) return;
    if (kinds.length === 1) return pickKind(kinds[0]);
    const sniffed = await zipKind(picked);
    if (sniffed) {
      pickKind(sniffed);
      setZipNote(`It reads as a ${KIND_NAMES[sniffed].toLowerCase()}: the kind is set to that. Change it if that's wrong.`);
    } else {
      if (!kinds.includes(kind)) setKind("");
      setZipNote(`Which kind of .zip is it? Pick ${ZIP_KINDS} under Kind.`);
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!me) return;
    const f = e.currentTarget;
    const v = (name: string) => ((f.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "").trim();
    const picked = (f.elements.namedItem("file") as HTMLInputElement).files?.[0];
    const sig = (f.elements.namedItem("signature") as HTMLInputElement).files?.[0];
    const found: Problems = {};
    const kinds = picked ? EXTENSIONS[extension(picked.name)] : undefined;
    if (!picked) found.file = "Pick the file to submit.";
    else if (!kinds) found.file = `${picked.name} isn't a .hmod, .hnmod, .hpack, .hshader or .zip.`;
    else if (picked.size > MAX_FILE) found.file = `${picked.name} is over 64 MB, the registry's limit.`;
    else if (!kinds.includes(kind))
      found.kind = kinds.length > 1 ? `A .zip is ${ZIP_KINDS}: pick which.` : `A .${extension(picked.name)} is a ${KIND_NAMES[kinds[0]].toLowerCase()}: pick that kind.`;
    found.description = descriptionProblem(description);
    found.categories = categoriesProblem(categories);
    const parsed = parseTags(tags);
    found.tags = parsed.problem;
    if (problems.icon) found.icon = problems.icon;
    else if (!icon && !existing) found.icon = "Upload an icon: a square PNG, 64 to 1024 pixels, at most 256 KiB.";
    if (kind === "shaderpack" && !ownWork) found.own = "A shaders/-folder pack is listed only by its author, under a licence that lets the registry hand it out.";
    if (Object.values(found).some(Boolean)) {
      setProblems(found);
      setResult({ ok: false, message: "Some fields need a change: they are marked above." });
      requestAnimationFrame(() => form.current?.querySelector("[data-problem]")?.scrollIntoView({ block: "center", behavior: "smooth" }));
      return;
    }
    setProblems({});
    if (sig && !sig.name.toLowerCase().endsWith(".minisig"))
      return setResult({ ok: false, message: `${sig.name} isn't a .minisig signature.` });
    if (!picked) return;
    const again = (name: string) =>
      `Your browser can't read ${name} any more: it changed, moved or is open in another program since you picked it (a new build?). Pick it again, then submit.`;
    let bytes: ArrayBuffer;
    let signature = "";
    const images: [string, File, ArrayBuffer][] = [];
    try {
      bytes = await picked.arrayBuffer();
    } catch {
      return setResult({ ok: false, message: again(picked.name) });
    }
    for (const [part, image] of [...(icon ? [["icon", icon] as const] : []), ...shots.flatMap((s) => (s.file ? [["screenshot", s.file] as const] : []))]) {
      try {
        images.push([part, image, await image.arrayBuffer()]);
      } catch {
        return setResult({ ok: false, message: again(image.name) });
      }
    }
    if (sig) {
      try {
        signature = await sig.text();
      } catch {
        return setResult({ ok: false, message: again(sig.name) });
      }
    }
    const optional = (s: string) => s || undefined;
    const entry = {
      id: id.trim(),
      kind,
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
      own_work: kind === "shaderpack" && ownWork,
      key: optional(v("key")),
      signature: optional(signature.trim()),
      version: v("version"),
      game: v("game"),
      changelog: (f.elements.namedItem("changelog") as HTMLTextAreaElement).value,
    };
    const body = new FormData();
    body.append("entry", JSON.stringify(entry));
    for (const [part, image, data] of images) body.append(part, new Blob([data], { type: image.type }), image.name);
    body.append("file", new Blob([bytes], { type: picked.type }), picked.name);
    setBusy(true);
    setResult({ pending: true });
    try {
      const r = await fetch(`${API}/submit`, { method: "POST", body, credentials: "same-origin", headers: { "X-CSRF-Token": me.csrf } });
      const json = (await r.json().catch(() => ({}))) as { pull_request?: string; error?: string };
      if (r.ok && /^https:\/\/github\.com\/[^\s"'<>]+$/.test(json.pull_request ?? "")) {
        setResult({ ok: true, url: json.pull_request! });
        f.reset();
        setId("");
        setDescription("");
        setCategories([]);
        setTags("");
        setIcon(null);
        setShots([]);
        setOwnWork(false);
        setZipNote("");
        setFilled("");
      } else {
        setResult({ ok: false, message: json.error || `The service answered ${r.status}.` });
      }
    } catch {
      setResult({ ok: false, message: "The service didn't answer: check your connection, then try again in a minute." });
    } finally {
      setBusy(false);
    }
  };

  let auth: ReactNode;
  if (closed) {
    auth = (
      <p className="text-[15px] text-white/65">
        The form isn&apos;t open right now. You can{" "}
        <a href={REGISTRY} className={LINK}>
          open a pull request by hand
        </a>
        .
      </p>
    );
  } else if (me === undefined) {
    auth = <p className="text-sm text-white/50">Checking whether you are signed in…</p>;
  } else if (me === null) {
    auth = (
      <div className="space-y-3">
        <p className="text-[15px] text-white/65">Sign in to submit: reviewers and updates go through your GitHub account.</p>
        <a href={`${API}/auth/login?back=/mods/submit`} className={PRIMARY}>
          Sign in with GitHub
        </a>
        <p className="text-[13px] text-white/45">It only reads your public profile: your GitHub name goes on the pull request and in the project&apos;s owners.</p>
      </div>
    );
  } else {
    auth = (
      <p className="flex flex-wrap items-center gap-2 text-[15px] text-white/65">
        Signed in as <strong className="text-white">{me.login}</strong>.
        <button type="button" onClick={signOut} className={GHOST_SM}>
          Sign out
        </button>
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div aria-live="polite">{auth}</div>
      {me && !closed && (
        <form ref={form} onSubmit={submit} className="space-y-8">
          <fieldset className={`${CARD} space-y-4`}>
            <legend className="sr-only">The file</legend>
            <h2 className="font-display text-xl font-semibold text-white">The file</h2>
            <Field label="Kind">
              <select name="kind" value={kind} onChange={(e) => pickKind(e.target.value)} className={INPUT} aria-invalid={Boolean(problems.kind)}>
                {kind === "" && (
                  <option value="" disabled>
                    Pick the kind
                  </option>
                )}
                {KINDS.map(([k]) => (
                  <option key={k} value={k}>
                    {KIND_OPTIONS[k]}
                  </option>
                ))}
              </select>
              <Problem id="kind-problem" text={problems.kind} />
            </Field>
            <Field label="File">
              <input
                name="file"
                type="file"
                // iOS greys out files whose extension it has no type for (.hmod…): application/octet-stream lets
                // any file through there, and submit checks the extension.
                accept=".hmod,.hnmod,.hpack,.zip,.hshader,application/zip,application/octet-stream"
                required
                onChange={onFile}
                aria-invalid={Boolean(problems.file)}
                className="block w-full text-sm text-white/70 file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:text-sm file:font-medium file:text-white hover:file:bg-white/15"
              />
              {zipNote && <span className="mt-1.5 block text-[13px] text-white/70">{zipNote}</span>}
              <Problem id="file-problem" text={problems.file} />
              <Hint>
                A .hmod, a native mod&apos;s .hnmod, a .hpack, a .hshader, or a .zip: a resource pack, a data pack (<code className={code}>pack.mcmeta</code> and{" "}
                <code className={code}>data/</code>) or a shader pack with a <code className={code}>shaders/</code> folder. At most 64 MB. Run{" "}
                <code className={code}>cargo horizon-mod check</code> on a mod first. A .hshader is what <code className={code}>horizon-shader pack</code> makes (
                <Link href="/docs/api/shaders" className={LINK}>
                  Horizon&apos;s own format
                </Link>
                ).
              </Hint>
            </Field>
            {kind === "shaderpack" && (
              <label className="flex items-start gap-3 text-[14px] leading-relaxed text-white/70">
                <input
                  type="checkbox"
                  checked={ownWork}
                  onChange={(e) => {
                    setOwnWork(e.target.checked);
                    setProblems((p) => ({ ...p, own: undefined }));
                  }}
                  aria-invalid={Boolean(problems.own)}
                  className="mt-1 size-4 accent-[#a98fff]"
                />
                <span>
                  I made this pack and its licence allows Horizon&apos;s registry to distribute it.
                  <Problem id="own-problem" text={problems.own} />
                </span>
              </label>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Id">
                <input
                  name="id"
                  required
                  pattern="[a-z0-9_]{1,64}"
                  placeholder="my_mod"
                  autoComplete="off"
                  value={id}
                  onChange={(e) => {
                    setId(e.target.value);
                    setFilled("");
                  }}
                  className={INPUT}
                />
              </Field>
              <Field label="Version">
                <input name="version" required pattern="[A-Za-z0-9][A-Za-z0-9._\-]{0,63}" placeholder="1.0.0" className={INPUT} />
              </Field>
              <Field label="For Minecraft">
                <input name="game" required defaultValue="26.3" className={INPUT} />
              </Field>
            </div>
            <p className="-mt-1 text-[13px] text-white/45">The id is its manifest&apos;s id: a-z, 0-9 and _. A pack&apos;s is yours to pick.</p>
            {existing && (
              <div className="flex flex-col items-start gap-3 rounded-xl bg-white/[0.04] px-4 py-3 text-[14px] text-white/70 sm:flex-row sm:items-center">
                <span className="min-w-0 flex-1">
                  <strong className="text-white">{existing.name}</strong> is listed: this adds a version, and the page fields you send replace its page.
                  {filled && <span className="mt-1 block text-[13px] text-white/55">{filled}</span>}
                </span>
                <button type="button" onClick={fillFromPage} className={SECONDARY_SM}>
                  Fill in from its page
                </button>
              </div>
            )}
            <Field label="What changed">
              <textarea name="changelog" rows={3} className={AREA} />
              <Hint>Markdown.</Hint>
            </Field>
          </fieldset>

          <fieldset className={`${CARD} space-y-5`}>
            <legend className="sr-only">Its page</legend>
            <h2 className="font-display text-xl font-semibold text-white">Its page</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input name="name" required maxLength={64} className={INPUT} />
              </Field>
              <Field label="Licence">
                <input name="license" required placeholder="MIT" className={INPUT} />
              </Field>
            </div>
            <Field label="Summary">
              <input name="summary" required maxLength={160} className={INPUT} />
              <Hint>One line for the list.</Hint>
            </Field>
            <DescriptionField
              value={description}
              onChange={(d) => {
                setDescription(d);
                if (problems.description) setProblems((p) => ({ ...p, description: descriptionProblem(d) }));
              }}
              problem={problems.description}
            />
            {kind ? (
              <CategoriesField
                kind={kind}
                value={categories}
                onChange={(c) => {
                  setCategories(c);
                  setProblems((p) => ({ ...p, categories: undefined }));
                }}
                problem={problems.categories}
              />
            ) : (
              <p className="text-[13px] text-white/45">Pick the kind above to see its categories.</p>
            )}
            <TagsField
              value={tags}
              onChange={(t) => {
                setTags(t);
                setProblems((p) => ({ ...p, tags: parseTags(t).problem }));
              }}
              problem={problems.tags}
            />
            <Field label="Authors">
              <input name="authors" placeholder="Alice, Bob" className={INPUT} />
              <Hint>Separated by commas.</Hint>
            </Field>
            <Field label="Source code">
              <input name="source" required type="url" pattern="https://.*" placeholder="https://github.com/you/your-mod" className={INPUT} />
              <Hint>Reviewers read it: the file must be built from it.</Hint>
            </Field>
            <IconField
              file={icon}
              onChange={(f, problem) => {
                setIcon(problem ? null : f);
                setProblems((p) => ({ ...p, icon: problem || undefined }));
              }}
              problem={problems.icon}
              current={existing?.icon}
              hint={
                existing
                  ? "Optional for a new version: it keeps its icon unless you upload one. A square PNG, 64 to 1024 pixels, at most 256 KiB."
                  : "A square PNG, 64 to 1024 pixels, at most 256 KiB. It is kept in the registry."
              }
            />
            <ScreenshotsField
              shots={shots}
              onChange={(s, problem) => {
                setShots(s);
                setProblems((p) => ({ ...p, shots: problem || undefined }));
              }}
              problem={problems.shots}
            />
            {existing && <Hint>New screenshots come after its current ones.</Hint>}
          </fieldset>

          <fieldset className={`${CARD} space-y-4`}>
            <legend className="sr-only">Signature</legend>
            <h2 className="font-display text-xl font-semibold text-white">Signature</h2>
            <p className="text-[14px] leading-relaxed text-white/60">
              Optional, and recommended: with your{" "}
              <a href="https://jedisct1.github.io/minisign/" className={LINK}>
                minisign
              </a>{" "}
              key on the project, every later version must be signed with it, so nobody else can publish an update in your name.
            </p>
            <Field label="Public key">
              <input name="key" placeholder="RW…" autoComplete="off" className={INPUT} />
              <Hint>A new project&apos;s. Changing a published project&apos;s key is a pull request by hand.</Hint>
            </Field>
            <Field label="Signature">
              <input
                name="signature"
                type="file"
                accept=".minisig,application/octet-stream,text/plain"
                className="block w-full text-sm text-white/70 file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:text-sm file:font-medium file:text-white hover:file:bg-white/15"
              />
              <Hint>The file&apos;s .minisig.</Hint>
            </Field>
          </fieldset>

          <label className="flex items-start gap-3 text-[14px] leading-relaxed text-white/70">
            <input type="checkbox" required className="mt-1 size-4 accent-[#a98fff]" />
            <span>
              I made it, or I may publish it under this licence, and its source is at the address above. I accept the{" "}
              <Link href="/mods/policy" className={LINK}>
                mod policy
              </Link>{" "}
              and I am responsible for this project.
            </span>
          </label>

          <p>
            <button type="submit" disabled={busy} className={PRIMARY}>
              Submit for review
            </button>
          </p>
          <div role="status" aria-live="polite">
            {result && "pending" in result && <p className="text-sm text-white/60">Checking the file and opening the pull request…</p>}
            {result && "ok" in result && result.ok && (
              <p className="text-lg text-white/80">
                Submitted. Follow the review in{" "}
                <a href={result.url} rel="noreferrer" className={LINK}>
                  its pull request
                </a>
                : the checks&apos; report is there, and reviewers answer there.
              </p>
            )}
            {result && "ok" in result && !result.ok && <p className="rounded-xl bg-[#f07a6a]/10 px-4 py-3 text-sm text-[#f7b2a8]">{result.message}</p>}
          </div>
        </form>
      )}
    </div>
  );
}
