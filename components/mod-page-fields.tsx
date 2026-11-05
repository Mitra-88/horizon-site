"use client";

// A project's page fields, shared by the submit form and "Edit project": the same limits the registry's service
// checks (horizon_mods::index::page), checked here first so the submitter sees each problem beside its field.
import Image from "next/image";
import { useEffect, useId, useMemo, useRef, type ReactNode } from "react";
import { CATEGORIES, categoryLabel } from "@/components/mods-logic";
import { AREA, GHOST_SM, INPUT } from "@/components/staff/ui";

export const DESCRIPTION_MIN = 50;
export const DESCRIPTION_MAX = 10_000;
export const MAX_CATEGORIES = 3;
export const MAX_TAGS = 10;
export const MAX_SHOTS = 8;
const ICON_BYTES = 256 << 10;
const ICON_SIDE = [64, 1024];
const SHOT_BYTES = 1 << 20;
const SHOT_MIN = [320, 180];
const SHOT_MAX = [3840, 2160];
const TAG = /^[a-z0-9][a-z0-9-]{0,23}$/;
const REFUSED_TAG_WORDS = ["casino", "gambl", "slot-machine", "lottery", "betting", "jackpot", "roulette", "poker"];

export const descriptionLength = (text: string) => [...text.trim()].length;

export function descriptionProblem(text: string) {
  const n = descriptionLength(text);
  if (n < DESCRIPTION_MIN) return `Write at least ${DESCRIPTION_MIN} characters: what it does and how to use it (${n} so far).`;
  if (n > DESCRIPTION_MAX) return `At most ${DESCRIPTION_MAX.toLocaleString("en")} characters: this is ${n.toLocaleString("en")}.`;
  return "";
}

export const categoriesProblem = (picked: string[]) => (picked.length ? "" : `Pick 1 to ${MAX_CATEGORIES} categories.`);

/** The tags typed, split on commas and spaces, lowercased, without repeats; and what is wrong with them. */
export function parseTags(text: string) {
  const tags = [...new Set(text.toLowerCase().split(/[\s,]+/).filter(Boolean))];
  const bad = tags.find((t) => !TAG.test(t));
  const gambling = tags.find((t) => REFUSED_TAG_WORDS.some((w) => t.includes(w)));
  let problem = "";
  if (tags.length > MAX_TAGS) problem = `At most ${MAX_TAGS} tags: there are ${tags.length}.`;
  else if (bad) problem = `“${bad}”: a tag is a-z, 0-9 and -, starts with a letter or digit, and is at most 24 characters.`;
  else if (gambling) problem = `“${gambling}”: the registry lists nothing about gambling.`;
  return { tags, problem };
}

type Picture = { format: "png" | "jpeg"; width: number; height: number };

/** A PNG's or a JPEG's format and size from its header, as the service reads it; null for anything else. */
function pictureOf(b: Uint8Array): Picture | null {
  const be16 = (i: number) => (b[i] << 8) | b[i + 1];
  const be32 = (i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length >= 24 && png.every((x, i) => b[i] === x) && String.fromCharCode(...b.subarray(12, 16)) === "IHDR")
    return { format: "png", width: be32(16), height: be32(20) };
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let at = 2;
  while (at + 9 < b.length) {
    while (b[at] === 0xff && b[at + 1] === 0xff) at++;
    if (b[at] !== 0xff) return null;
    const marker = b[at + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { format: "jpeg", width: be16(at + 7), height: be16(at + 5) };
    const length = be16(at + 2);
    if (length < 2) return null;
    at += 2 + length;
  }
  return null;
}

async function read(file: File) {
  try {
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

/** What is wrong with an icon, or "". */
export async function iconProblem(file: File) {
  if (file.size > ICON_BYTES) return `${file.name} is ${Math.ceil(file.size / 1024)} KiB: an icon is at most 256 KiB.`;
  const bytes = await read(file);
  if (!bytes) return `Your browser can't read ${file.name} any more: pick it again.`;
  const p = pictureOf(bytes);
  if (p?.format !== "png") return `${file.name} isn't a PNG: the icon is a square PNG.`;
  if (p.width !== p.height || p.width < ICON_SIDE[0] || p.width > ICON_SIDE[1])
    return `${file.name} is ${p.width}×${p.height}: make it square, ${ICON_SIDE[0]} to ${ICON_SIDE[1]} pixels a side.`;
  return "";
}

/** What is wrong with a screenshot, or "". */
export async function shotProblem(file: File) {
  if (file.size > SHOT_BYTES) return `${file.name} is ${(file.size / (1 << 20)).toFixed(1)} MiB: a screenshot is at most 1 MiB.`;
  const bytes = await read(file);
  if (!bytes) return `Your browser can't read ${file.name} any more: pick it again.`;
  const p = pictureOf(bytes);
  if (!p) return `${file.name} isn't a PNG or a JPEG.`;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(p.format === "png" ? ["png"] : ["jpg", "jpeg"]).includes(ext)) return `${file.name} is a ${p.format.toUpperCase()}: name it .${p.format === "png" ? "png" : "jpg"}.`;
  if (p.width < SHOT_MIN[0] || p.height < SHOT_MIN[1] || p.width > SHOT_MAX[0] || p.height > SHOT_MAX[1])
    return `${file.name} is ${p.width}×${p.height}: from ${SHOT_MIN.join("×")} to ${SHOT_MAX.join("×")} pixels.`;
  return "";
}

const HINT = "mt-1.5 block text-[13px] leading-relaxed text-white/45";
const LABEL = "mb-1.5 block text-[13px] font-medium text-white/70";

export function Problem({ id, text }: { id: string; text?: string }) {
  return text ? (
    <span id={id} data-problem className="mt-1.5 block text-[13px] leading-relaxed text-[#f7b2a8]">
      {text}
    </span>
  ) : null;
}

export function DescriptionField({ value, onChange, problem }: { value: string; onChange: (v: string) => void; problem?: string }) {
  const id = useId();
  const n = descriptionLength(value);
  return (
    <label className="block">
      <span className={LABEL}>Description</span>
      <textarea
        name="description"
        rows={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(problem)}
        aria-describedby={`${id}-count ${id}-problem`}
        className={AREA}
      />
      <span id={`${id}-count`} className={`${HINT} flex justify-between gap-3`}>
        <span>Markdown: what it does, how to use it, what it needs.</span>
        <span className={`tabular-nums ${n > DESCRIPTION_MAX || (n > 0 && n < DESCRIPTION_MIN) ? "text-[#f7b2a8]" : ""}`}>
          {n.toLocaleString("en")} / {DESCRIPTION_MAX.toLocaleString("en")}
          {n < DESCRIPTION_MIN ? `, at least ${DESCRIPTION_MIN}` : ""}
        </span>
      </span>
      <Problem id={`${id}-problem`} text={problem} />
    </label>
  );
}

const CHIP = "inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] disabled:cursor-not-allowed disabled:opacity-40";

export function CategoriesField({ kind, value, onChange, problem }: { kind: string; value: string[]; onChange: (v: string[]) => void; problem?: string }) {
  const id = useId();
  const list = CATEGORIES[kind] ?? [];
  const toggle = (c: string) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  return (
    <fieldset aria-describedby={`${id}-problem`}>
      <legend className={LABEL}>
        Categories <span className="font-normal text-white/45">(1 to {MAX_CATEGORIES})</span>
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {list.map((c) => {
          const on = value.includes(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              disabled={!on && value.length >= MAX_CATEGORIES}
              onClick={() => toggle(c)}
              className={`${CHIP} ${on ? "bg-white text-[#100a1f]" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white"}`}
            >
              {categoryLabel(c)}
            </button>
          );
        })}
      </div>
      <Problem id={`${id}-problem`} text={problem} />
    </fieldset>
  );
}

export function TagsField({ value, onChange, problem }: { value: string; onChange: (v: string) => void; problem?: string }) {
  const id = useId();
  return (
    <label className="block">
      <span className={LABEL}>
        Tags <span className="font-normal text-white/45">(optional, up to {MAX_TAGS})</span>
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="bosses, dungeons"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={Boolean(problem)}
        aria-describedby={`${id}-problem`}
        className={INPUT}
      />
      <span className={HINT}>Separated by commas: lowercase words, digits and -.</span>
      <Problem id={`${id}-problem`} text={problem} />
    </label>
  );
}

const FILE = "block w-full text-sm text-white/70 file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:text-sm file:font-medium file:text-white hover:file:bg-white/15";

function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}

export function IconField({
  file,
  onChange,
  current,
  problem,
  hint,
}: {
  file: File | null;
  onChange: (f: File | null, problem: string) => void;
  current?: string;
  problem?: string;
  hint: ReactNode;
}) {
  const id = useId();
  const preview = useObjectUrl(file);
  const shown = preview || current;
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        Icon
      </label>
      <div className="flex items-center gap-4">
        {shown ? (
          <Image src={shown} alt="The icon" width={64} height={64} unoptimized className="size-16 shrink-0 rounded-xl bg-[#221a3a] object-cover [image-rendering:pixelated]" />
        ) : (
          <span aria-hidden className="size-16 shrink-0 rounded-xl border border-dashed border-white/15" />
        )}
        <input
          id={id}
          type="file"
          accept="image/png"
          aria-invalid={Boolean(problem)}
          aria-describedby={`${id}-problem`}
          onChange={async (e) => {
            const f = e.target.files?.[0] ?? null;
            onChange(f, f ? await iconProblem(f) : "");
          }}
          className={FILE}
        />
      </div>
      <span className={HINT}>{hint}</span>
      <Problem id={`${id}-problem`} text={problem} />
    </div>
  );
}

/** A screenshot on the page: one the project has (its registry `path`), or a new upload (`file`). */
export type Shot = { key: string; url: string; path?: string; file?: File };

export function ScreenshotsField({ shots, onChange, problem }: { shots: Shot[]; onChange: (s: Shot[], problem: string) => void; problem?: string }) {
  const id = useId();
  const urls = useRef<string[]>([]);
  useEffect(() => {
    const made = urls.current;
    return () => made.forEach((u) => URL.revokeObjectURL(u));
  }, []);
  const move = (i: number, by: number) => {
    const next = [...shots];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next, "");
  };
  const add = async (files: File[]) => {
    const room = MAX_SHOTS - shots.length;
    const problems: string[] = [];
    const added: Shot[] = [];
    for (const f of files) {
      const p = await shotProblem(f);
      if (p) problems.push(p);
      else if (added.length < room) added.push({ key: `${f.name}-${f.size}-${f.lastModified}-${Math.random()}`, url: URL.createObjectURL(f), file: f });
      else problems.push(`${f.name}: at most ${MAX_SHOTS} screenshots.`);
    }
    urls.current.push(...added.map((s) => s.url));
    onChange([...shots, ...added], problems.join(" "));
  };
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        Screenshots <span className="font-normal text-white/45">(optional, up to {MAX_SHOTS})</span>
      </label>
      {shots.length > 0 && (
        <ol className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shots.map((s, i) => (
            <li key={s.key} className="min-w-0">
              <span className="relative block aspect-video overflow-hidden rounded-lg bg-[#221a3a]">
                <Image src={s.url} alt={`Screenshot ${i + 1}`} fill unoptimized sizes="12rem" className="object-cover" />
              </span>
              <span className="mt-1 flex items-center justify-between gap-1">
                <span className="text-[12px] text-white/45 tabular-nums">{i + 1}</span>
                <span className="flex">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move screenshot ${i + 1} earlier`} className={GHOST_SM}>
                    ←
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === shots.length - 1} aria-label={`Move screenshot ${i + 1} later`} className={GHOST_SM}>
                    →
                  </button>
                  <button type="button" onClick={() => onChange(shots.filter((x) => x !== s), "")} aria-label={`Remove screenshot ${i + 1}`} className={GHOST_SM}>
                    ×
                  </button>
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
      <input
        id={id}
        type="file"
        multiple
        accept="image/png,image/jpeg"
        disabled={shots.length >= MAX_SHOTS}
        aria-describedby={`${id}-problem`}
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) await add(files);
        }}
        className={FILE}
      />
      <span className={HINT}>PNG or JPEG, at most 1 MiB each, from 320×180 to 3840×2160 pixels. They show in this order.</span>
      <Problem id={`${id}-problem`} text={problem} />
    </div>
  );
}
