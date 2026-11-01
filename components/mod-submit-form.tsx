"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { KINDS } from "@/components/mods-logic";
import { AREA, CARD, Field, GHOST_SM, INPUT, LINK, PRIMARY } from "@/components/staff/ui";

const API = "/api/mods";
const REGISTRY = "https://github.com/horizon-rust/horizon-mods";
const MAX_FILE = 64 << 20;
const EXTENSIONS: Record<string, string> = { hmod: "mod", hnmod: "native-mod", hpack: "modpack", zip: "resourcepack" };

type Me = { login: string; csrf: string };
type Result = { ok: true; url: string } | { ok: false; message: string } | { pending: true };

function Hint({ children }: { children: ReactNode }) {
  return <span className="mt-1.5 block text-[13px] leading-relaxed text-white/45">{children}</span>;
}

const code = "font-mono text-[#e7e1ff]";

export function ModSubmitForm() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [closed, setClosed] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);

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

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.files?.[0]?.name ?? "";
    const kind = EXTENSIONS[name.split(".").pop() ?? ""];
    const kindField = control("kind");
    if (kind && kindField) kindField.value = kind;
    const m = name.match(/^([a-z0-9_]{1,64})-([A-Za-z0-9][A-Za-z0-9._-]*)\.(hmod|hnmod|hpack|zip)$/);
    if (m) {
      const id = control("id");
      const version = control("version");
      if (id && !id.value) id.value = m[1];
      if (version && !version.value) version.value = m[2];
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!me) return;
    const f = e.currentTarget;
    const v = (name: string) => ((f.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "").trim();
    const picked = (f.elements.namedItem("file") as HTMLInputElement).files?.[0];
    const sig = (f.elements.namedItem("signature") as HTMLInputElement).files?.[0];
    if (!picked) return setResult({ ok: false, message: "Pick the file to submit." });
    if (picked.size > MAX_FILE) return setResult({ ok: false, message: `${picked.name} is over 64 MB, the registry's limit.` });
    const again = (name: string) =>
      `Your browser can't read ${name} any more: it changed, moved or is open in another program since you picked it (a new build?). Pick it again, then submit.`;
    let bytes: ArrayBuffer;
    let signature = "";
    try {
      bytes = await picked.arrayBuffer();
    } catch {
      return setResult({ ok: false, message: again(picked.name) });
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
      id: v("id"),
      kind: v("kind"),
      name: v("name"),
      summary: v("summary"),
      description: (f.elements.namedItem("description") as HTMLTextAreaElement).value,
      authors: v("authors")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      license: v("license"),
      source: v("source"),
      icon: optional(v("icon")),
      key: optional(v("key")),
      signature: optional(signature.trim()),
      version: v("version"),
      game: v("game"),
      changelog: (f.elements.namedItem("changelog") as HTMLTextAreaElement).value,
    };
    const body = new FormData();
    body.append("entry", JSON.stringify(entry));
    body.append("file", new Blob([bytes], { type: picked.type }), picked.name);
    setBusy(true);
    setResult({ pending: true });
    try {
      const r = await fetch(`${API}/submit`, { method: "POST", body, credentials: "same-origin", headers: { "X-CSRF-Token": me.csrf } });
      const json = (await r.json().catch(() => ({}))) as { pull_request?: string; error?: string };
      if (r.ok && /^https:\/\/github\.com\/[^\s"'<>]+$/.test(json.pull_request ?? "")) {
        setResult({ ok: true, url: json.pull_request! });
        f.reset();
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
              <select name="kind" defaultValue="mod" className={INPUT}>
                {KINDS.map(([k, label]) => (
                  <option key={k} value={k} disabled={k === "shader"}>
                    {label.replace(/s$/, "")}
                    {k === "shader" ? " (opens with Horizon's own shader format)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="File">
              <input
                name="file"
                type="file"
                accept=".hmod,.hnmod,.hpack,.zip"
                required
                onChange={onFile}
                className="block w-full text-sm text-white/70 file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:text-sm file:font-medium file:text-white hover:file:bg-white/15"
              />
              <Hint>
                A .hmod, a native mod&apos;s .hnmod, a .hpack or a resource pack .zip, at most 64 MB. Run <code className={code}>cargo horizon-mod check</code> on it first.
              </Hint>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Id">
                <input name="id" required pattern="[a-z0-9_]{1,64}" placeholder="my_mod" autoComplete="off" className={INPUT} />
              </Field>
              <Field label="Version">
                <input name="version" required pattern="[A-Za-z0-9][A-Za-z0-9._\-]{0,63}" placeholder="1.0.0" className={INPUT} />
              </Field>
              <Field label="For Minecraft">
                <input name="game" required defaultValue="26.3" className={INPUT} />
              </Field>
            </div>
            <p className="-mt-1 text-[13px] text-white/45">The id is its manifest&apos;s id: a-z, 0-9 and _. A resource pack&apos;s is yours to pick.</p>
            <Field label="What changed">
              <textarea name="changelog" rows={3} className={AREA} />
              <Hint>Markdown.</Hint>
            </Field>
          </fieldset>

          <fieldset className={`${CARD} space-y-4`}>
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
            <Field label="Description">
              <textarea name="description" rows={6} className={AREA} />
              <Hint>Markdown.</Hint>
            </Field>
            <Field label="Authors">
              <input name="authors" placeholder="Alice, Bob" className={INPUT} />
              <Hint>Separated by commas.</Hint>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Source code">
                <input name="source" required type="url" pattern="https://.*" placeholder="https://github.com/you/your-mod" className={INPUT} />
                <Hint>Reviewers read it: the file must be built from it.</Hint>
              </Field>
              <Field label="Icon">
                <input name="icon" type="url" pattern="https://.*" placeholder="https://…/icon.png" className={INPUT} />
                <Hint>Optional, a square PNG.</Hint>
              </Field>
            </div>
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
                accept=".minisig"
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
