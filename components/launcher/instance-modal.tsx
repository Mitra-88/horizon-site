"use client";

import { Cancel01Icon, Image01Icon, Package01Icon, PlusSignIcon, PuzzleIcon, Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  GAME_FOLDER,
  ICON_COLORS,
  LOADERS,
  LOGOS,
  MC_VERSIONS,
  type Instance,
  type LauncherData,
  type LoaderId,
} from "@/components/launcher/launcher-data";
import { Icon, ICON_BUTTON, MarkTile, PLAY, QUIET } from "@/components/launcher/launcher-ui";
import { formatDay, InstanceIcon, LogoIcon, PixelIcon } from "@/components/launcher/launcher-views";

export type Kind = "horizon" | "vanilla" | "modded";
export type Draft = {
  kind: Kind;
  name: string;
  group: string;
  icon: string;
  nightly: string;
  start: "empty" | "copy";
  mc: string;
  loader: LoaderId;
};

const KINDS: { id: Kind; title: string; note: string }[] = [
  { id: "horizon", title: "Horizon", note: "Minecraft rebuilt in Rust, with Horizon mods" },
  { id: "vanilla", title: "Vanilla", note: "Minecraft as Mojang ships it" },
  { id: "modded", title: "Modded", note: "Fabric, Quilt, NeoForge or Forge" },
];

const LOGO_ICONS: [string, string][] = [
  ["grass", "Grass block"],
  ["java", "Minecraft"],
  ["neoforge", "NeoForge"],
  ["fabric", "Fabric"],
  ["quilt", "Quilt"],
  ["forge", "Forge"],
];

const loaderName = (id: LoaderId) => LOADERS.find((l) => l.id === id)?.name ?? "Fabric";

export function defaultName(draft: Draft) {
  if (draft.kind === "vanilla") return `Vanilla ${draft.mc}`;
  if (draft.kind === "modded") return `${loaderName(draft.loader)} ${draft.mc}`;
  return "My Horizon";
}

export function draftFrom(instance: Instance | null, data: LauncherData): Draft {
  const nightly = data.nightlies[0]?.id ?? "";
  if (!instance) return { kind: "horizon", name: "", group: "", icon: "mark", nightly, start: "empty", mc: "26.3", loader: "fabric" };
  const logoKey = Object.keys(LOGOS).find((k) => LOGOS[k].src === instance.logo?.src);
  const loader = (LOADERS.find((l) => l.name === instance.loader)?.id ?? "fabric") as LoaderId;
  return {
    kind: instance.edition === "rust" ? "horizon" : instance.loader ? "modded" : "vanilla",
    name: instance.name,
    group: instance.group ?? "",
    icon: instance.mark ? "mark" : instance.color ? `color:${instance.color}` : logoKey ? `logo:${logoKey}` : "auto",
    nightly: instance.version || nightly,
    start: "empty",
    mc: instance.java,
    loader,
  };
}

export function iconFields(icon: string): Pick<Instance, "mark" | "logo" | "color"> {
  if (icon === "mark") return { mark: true, logo: undefined, color: undefined };
  if (icon.startsWith("color:")) return { mark: false, logo: undefined, color: icon.slice(6) };
  if (icon.startsWith("logo:")) return { mark: false, logo: LOGOS[icon.slice(5)], color: undefined };
  return { mark: false, logo: undefined, color: undefined };
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <h3 className="text-[13px] font-medium text-white/60">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

const FIELD_LG = "h-12 w-full rounded-[12px] bg-white/[0.06] px-4 text-[15px] outline-none transition-colors placeholder:text-white/35 hover:bg-white/[0.08] focus:bg-white/[0.1]";
const CHOICE = "rounded-[16px] text-left transition-colors";
const chosen = (on: boolean) => (on ? "bg-white/[0.12]" : "bg-white/[0.04] hover:bg-white/[0.07]");

export function InstanceModal({
  data,
  editing,
  selected,
  groups,
  onSave,
  onClose,
  say,
}: {
  data: LauncherData;
  editing: Instance | null;
  selected: Instance;
  groups: string[];
  onSave: (draft: Draft) => void;
  onClose: () => void;
  say: (text: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(editing, data));
  const [named, setNamed] = useState(!!editing);
  const [iconPicked, setIconPicked] = useState(!!editing);
  const [query, setQuery] = useState("");
  const [snapshots, setSnapshots] = useState(false);
  const [old, setOld] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) nameInput.current?.focus();
  }, [editing]);

  const patch = (next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next }));
  const name = named ? draft.name : defaultName(draft);
  const icon = iconPicked ? draft.icon : draft.kind === "horizon" ? "mark" : draft.kind === "vanilla" ? "logo:grass" : `logo:${draft.loader}`;
  const pickIcon = (next: string) => {
    setIconPicked(true);
    patch({ icon: next });
  };
  const preview: Instance = {
    id: name || "new",
    name: name || "New instance",
    edition: draft.kind === "horizon" ? "rust" : "java",
    version: draft.nightly,
    java: draft.mc,
    mods: [],
    played: "",
    last: "",
    worlds: [],
    servers: [],
    packs: [],
    shots: [],
    ...iconFields(icon),
  };
  const nightly = data.nightlies.find((n) => n.id === draft.nightly) ?? data.nightlies[0];
  const summary =
    draft.kind === "horizon"
      ? `Horizon · Nightly · ${nightly?.build ?? ""}`
      : draft.kind === "vanilla"
        ? `Vanilla · Minecraft ${draft.mc}`
        : `${loaderName(draft.loader)} · Minecraft ${draft.mc}`;
  const q = query.trim().toLowerCase();
  const versions = MC_VERSIONS.filter((v) => (v.kind === "release" || (v.kind === "snapshot" && snapshots) || (v.kind === "old" && old)) && (!q || v.id.includes(q)));
  const title = editing ? `Edit ${editing.name}` : draft.kind === "horizon" ? "A new Horizon instance" : draft.kind === "vanilla" ? "A new vanilla instance" : "A new modded instance";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ ...draft, icon, name: name.trim() || "New instance" });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6">
      <div aria-hidden className="absolute inset-0 bg-[#07050f]/50 backdrop-blur-xl" onMouseDown={onClose} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="instance-title"
        onSubmit={submit}
        className="hzl-glass hzl-pop relative flex h-full max-h-[820px] w-full max-w-[1180px] flex-col overflow-y-auto rounded-[28px] md:flex-row md:overflow-hidden"
      >
        <aside className="flex shrink-0 flex-col bg-white/[0.035] p-6 md:w-[340px] md:overflow-y-auto md:p-7">
          <p className="text-[13px] font-medium text-white/55">{editing ? "Edit instance" : "New instance"}</p>
          <div className="mt-6 flex items-center gap-4 md:block">
            <InstanceIcon instance={preview} size={88} />
            <div className="min-w-0 md:mt-5">
              <p className="truncate font-display text-[30px] leading-[1.05] font-semibold tracking-[-0.03em]">{preview.name}</p>
              <p className="mt-2 text-[14px] text-white/65">
                {summary}
                {draft.group.trim() ? ` · ${draft.group.trim()}` : ""}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[13px] leading-[1.55] text-white/50">
            {draft.kind === "horizon"
              ? "Its own worlds and packs. Your options and player name come along."
              : "Play downloads the game from Mojang the first time, with the Java it needs."}
          </p>

          <div role="radiogroup" aria-label="Instance type" className="mt-8 space-y-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={draft.kind === k.id}
                onClick={() => patch({ kind: k.id })}
                className={`flex w-full items-center gap-3.5 p-3 ${CHOICE} ${chosen(draft.kind === k.id)}`}
              >
                {k.id === "horizon" ? (
                  <MarkTile size={42} />
                ) : k.id === "vanilla" ? (
                  <LogoIcon logo={LOGOS.grass} size={42} />
                ) : (
                  <span className="inline-flex size-[42px] shrink-0 items-center justify-center rounded-[11px] bg-white/[0.08] text-white/85">
                    <Icon icon={PuzzleIcon} size={21} />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold">{k.title}</span>
                  <span className="block text-[13px] leading-snug text-white/55">{k.note}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-auto pt-8">
            <button
              type="button"
              onClick={() => say("Pick a .mrpack, a CurseForge .zip, or a Prism or MultiMC instance folder")}
              className="inline-flex h-10 items-center gap-2.5 rounded-[10px] px-2 text-[14px] text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <Icon icon={Package01Icon} size={18} />
              Import a modpack…
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 md:px-9 md:pt-8">
            <div className="min-w-0">
              <h2 id="instance-title" className="truncate font-display text-[clamp(1.6rem,2.4vw,2.1rem)] leading-tight font-semibold tracking-[-0.03em]">
                {title}
              </h2>
              <p className="mt-1.5 text-[14px] text-white/60">
                {editing ? "Changes apply the next time it starts. Worlds stay where they are." : "Pick what it plays, then give it a name and an icon."}
              </p>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className={ICON_BUTTON}>
              <Icon icon={Cancel01Icon} size={18} />
            </button>
          </header>

          <div key={draft.kind} className="hzl-pop flex-1 space-y-9 px-6 pb-8 md:overflow-y-auto md:px-9">
            {draft.kind === "horizon" ? (
              <>
                <Section title="Version">
                  <ul role="listbox" aria-label="Horizon version" className="max-h-[248px] overflow-y-auto rounded-[16px] bg-white/[0.04] p-1.5">
                    {data.nightlies.map((n, i) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={draft.nightly === n.id}
                          onClick={() => patch({ nightly: n.id })}
                          className={`flex w-full items-center gap-4 rounded-[12px] px-4 py-3 text-left transition-colors ${draft.nightly === n.id ? "bg-white/[0.11]" : "hover:bg-white/[0.05]"}`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold">Nightly · {n.build}</span>
                            <span className="block text-[13px] text-white/55">{formatDay(n.published)}</span>
                          </span>
                          {i === 0 && <span className="text-[13px] text-(--accent-soft)">Newest</span>}
                          <span className="flex w-5 justify-center text-(--accent-soft)">{draft.nightly === n.id && <Icon icon={Tick02Icon} size={18} />}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Section>
                {!editing && (
                  <Section title="Start from">
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {[
                        { id: "empty" as const, title: "Empty", note: "A fresh game folder" },
                        { id: "copy" as const, title: `A copy of ${selected.name}`, note: "Its mods, worlds and options" },
                      ].map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          aria-pressed={draft.start === o.id}
                          onClick={() => patch({ start: o.id })}
                          className={`flex items-center gap-3 p-4 ${CHOICE} ${chosen(draft.start === o.id)}`}
                        >
                          {o.id === "copy" ? (
                            <InstanceIcon instance={selected} size={36} />
                          ) : (
                            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.08] text-white/70">
                              <Icon icon={PlusSignIcon} size={18} />
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-semibold">{o.title}</span>
                            <span className="block text-[13px] text-white/55">{o.note}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </Section>
                )}
              </>
            ) : (
              <>
                <Section
                  title="Minecraft version"
                  aside={
                    <div className="flex gap-1.5">
                      {[
                        { label: "Snapshots", on: snapshots, set: setSnapshots },
                        { label: "Old", on: old, set: setOld },
                      ].map((f) => (
                        <button
                          key={f.label}
                          type="button"
                          aria-pressed={f.on}
                          onClick={() => f.set(!f.on)}
                          className={`h-8 rounded-[10px] px-3 text-[13px] transition-colors ${f.on ? "bg-white/[0.14] font-medium text-white" : "text-white/65 hover:text-white"}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  }
                >
                  <label className="relative mb-2.5 block">
                    <Icon icon={Search01Icon} size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-white/45" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search versions" aria-label="Search versions" className={`${FIELD_LG} pl-11`} />
                  </label>
                  <ul role="listbox" aria-label="Minecraft version" className="max-h-[264px] overflow-y-auto rounded-[16px] bg-white/[0.04] p-1.5">
                    {versions.map((v) => (
                      <li key={v.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={draft.mc === v.id}
                          onClick={() => patch({ mc: v.id })}
                          className={`flex w-full items-center gap-4 rounded-[12px] px-4 py-2.5 text-left transition-colors ${draft.mc === v.id ? "bg-white/[0.11]" : "hover:bg-white/[0.05]"}`}
                        >
                          <span className="w-40 shrink-0 text-[15px] font-semibold tabular-nums">{v.id}</span>
                          <span className="flex-1 text-[13px] text-white/55">
                            {v.kind === "snapshot" ? "Snapshot" : "Release"} · {v.date}
                          </span>
                          <span className="flex w-5 justify-center text-(--accent-soft)">{draft.mc === v.id && <Icon icon={Tick02Icon} size={18} />}</span>
                        </button>
                      </li>
                    ))}
                    {versions.length === 0 && <li className="px-4 py-6 text-[14px] text-white/55">No version matches &ldquo;{query}&rdquo;.</li>}
                  </ul>
                </Section>

                {draft.kind === "modded" && (
                  <Section title="Loader">
                    <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                      {LOADERS.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          aria-pressed={draft.loader === l.id}
                          onClick={() => patch({ loader: l.id })}
                          className={`flex flex-col items-start gap-3 p-4 ${CHOICE} ${chosen(draft.loader === l.id)}`}
                        >
                          <LogoIcon logo={LOGOS[l.id]} size={40} />
                          <span>
                            <span className="block text-[15px] font-semibold">{l.name}</span>
                            <span className="block text-[13px] leading-snug text-white/55">{l.note}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-2.5 text-[13px] text-white/50">Installs the newest stable {loaderName(draft.loader)} for Minecraft {draft.mc}.</p>
                  </Section>
                )}
              </>
            )}

            <Section title="Name and group">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <input
                  ref={nameInput}
                  value={name}
                  onChange={(e) => {
                    setNamed(true);
                    patch({ name: e.target.value });
                  }}
                  placeholder="My instance"
                  aria-label="Name"
                  className={FIELD_LG}
                />
                <input
                  value={draft.group}
                  onChange={(e) => patch({ group: e.target.value })}
                  placeholder="No group"
                  aria-label="Group"
                  list="instance-groups"
                  className={FIELD_LG}
                />
                <datalist id="instance-groups">
                  {groups.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>
            </Section>

            <Section title="Icon">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "auto", label: "Made from the name", render: <PixelIcon id={name || "new"} size={40} /> },
                  { id: "mark", label: "Horizon", render: <MarkTile size={40} /> },
                  ...LOGO_ICONS.map(([k, label]) => ({ id: `logo:${k}`, label, render: <LogoIcon logo={LOGOS[k]} size={40} /> })),
                ].map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={icon === o.id}
                    title={o.label}
                    aria-label={`Icon: ${o.label}`}
                    onClick={() => pickIcon(o.id)}
                    className={`inline-flex size-[52px] items-center justify-center rounded-[15px] transition-colors ${icon === o.id ? "bg-white/[0.16]" : "hover:bg-white/[0.07]"}`}
                  >
                    {o.render}
                  </button>
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {ICON_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={icon === `color:${c}`}
                    aria-label={`Colour ${c}`}
                    onClick={() => pickIcon(`color:${c}`)}
                    className={`inline-flex size-[52px] items-center justify-center rounded-[15px] transition-colors ${icon === `color:${c}` ? "bg-white/[0.16]" : "hover:bg-white/[0.07]"}`}
                  >
                    <span className="inline-flex size-10 items-center justify-center rounded-[10px] font-display text-[18px] font-semibold text-white" style={{ background: c }}>
                      {(name || "N").trim().charAt(0).toUpperCase()}
                    </span>
                  </button>
                ))}
                <button type="button" onClick={() => say("Pick a PNG, JPEG or WebP for the icon")} className={`${QUIET} ml-1.5 h-10`}>
                  <Icon icon={Image01Icon} size={17} />
                  Choose image…
                </button>
              </div>
              <p className="mt-3 text-[13px] text-white/50">Block and item icons come from your prepared game files once a version is prepared.</p>
            </Section>
          </div>

          <footer className="flex flex-col-reverse gap-3 bg-white/[0.03] px-6 py-5 sm:flex-row sm:items-center sm:justify-between md:px-9">
            <p className="truncate text-[13px] text-white/50">
              {editing ? `${GAME_FOLDER}/instances/${editing.id}` : `Makes a folder in ${GAME_FOLDER}/instances`}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} className="h-12 rounded-[12px] px-5 text-[15px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white">
                Cancel
              </button>
              <button type="submit" className={`${PLAY} h-12 px-8 text-[15px]`}>
                {editing ? "Save changes" : "Create instance"}
              </button>
            </div>
          </footer>
        </section>
      </form>
    </div>
  );
}
