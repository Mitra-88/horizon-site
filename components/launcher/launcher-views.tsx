"use client";

import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  ColorPickerIcon,
  ComputerTerminal01Icon,
  AiChat02Icon,
  ComputerIcon,
  Copy01Icon,
  DashboardSquare01Icon,
  Delete02Icon,
  Download04Icon,
  EarthIcon,
  Folder01Icon,
  GameController01Icon,
  Globe02Icon,
  InformationCircleIcon,
  MoreHorizontalIcon,
  PlayIcon,
  PlusSignIcon,
  PuzzleIcon,
  RefreshIcon,
  Search01Icon,
  StopIcon,
  Tick02Icon,
  UserAdd01Icon,
  UserIcon,
  UserMultiple02Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ADDRESSES,
  COMPAT_LABEL,
  GAME_FOLDER,
  JAVA_VERSIONS,
  MODRINTH,
  PLAYER,
  playerHead,
  type Edition,
  type Instance,
  type LauncherData,
  type Logo,
  type ModEntry,
  type Server,
  type View,
} from "@/components/launcher/launcher-data";
import {
  BIG_ICON,
  CARD_NOTE,
  CARD_TITLE,
  Dot,
  Glass,
  Icon,
  ICON_BUTTON,
  MarkTile,
  MicrosoftLogo,
  PLAY,
  POPOVER,
  QUIET,
  ROW,
  Slider,
  SOLID,
  Tabs,
  Toggle,
} from "@/components/launcher/launcher-ui";
import { CAPABILITIES } from "@/components/mods-logic";
import { ModIcon } from "@/components/mods-ui";

export type Phase = "checking" | "starting" | "running";
export type Launch = { key: number; instanceId: string; world: string | null; phase: Phase; progress: number; startedAt: number; script: { at: number; line: string }[] };
export type Settings = { glass: number; blur: number; accent: string };
export type Prefs = {
  autoUpdate: boolean;
  cleanOld: boolean;
  native: boolean;
  noAi: boolean;
  opening: boolean;
  whilePlaying: "stay" | "minimise";
  language: string;
  proxy: string;
  args: string;
};
export type TaskKind = "update" | "prepare" | "verify";
export type Task = { instanceId: string; kind: TaskKind; progress: number };
export const TASK_LABEL: Record<TaskKind, string> = { update: "Updating", prepare: "Preparing", verify: "Verifying" };

export type Api = {
  data: LauncherData;
  instances: Instance[];
  instance: Instance;
  launch: Launch | null;
  elapsed: number;
  play: (world?: string) => void;
  stop: () => void;
  toggleMod: (id: string) => void;
  togglePack: (name: string) => void;
  setVersion: (id: string) => void;
  setJava: (id: string) => void;
  setEdition: (edition: Edition) => void;
  hideShots: boolean;
  setHideShots: (hidden: boolean) => void;
  task: Task | null;
  startTask: (kind: TaskKind) => void;
  go: (view: View) => void;
  say: (text: string) => void;
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  prefs: Prefs;
  setPrefs: (patch: Partial<Prefs>) => void;
  resetLauncher: () => void;
  profile: string;
  profiles: string[];
  setProfile: (name: string) => void;
  addProfile: (name: string) => void;
  removeProfile: (name: string) => void;
  servers: Server[];
  serverId: string;
  setServerId: (id: string) => void;
  startServer: (id: string) => void;
  stopServer: (id: string) => void;
  restartServer: (id: string) => void;
  runCommand: (id: string, command: string) => void;
  addServer: () => void;
  installed: string[];
  installing: string | null;
  installVersion: (id: string) => void;
  removeVersion: (id: string) => void;
};

const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const dayTime = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("en");

export const formatDay = (iso: string) => day.format(new Date(iso));
export const duration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m}:${String(s).padStart(2, "0")}`;
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const shotLook = (hidden: boolean) => (hidden ? "scale-110 blur-2xl" : "group-hover:scale-[1.04]");

function PrivacyToggle({ api }: { api: Api }) {
  const hidden = api.hideShots;
  return (
    <button
      type="button"
      aria-pressed={hidden}
      aria-label={hidden ? "Show screenshots" : "Blur screenshots"}
      title={hidden ? "Show screenshots" : "Blur screenshots for privacy"}
      onClick={() => api.setHideShots(!hidden)}
      className={`${ICON_BUTTON} size-8 ${hidden ? "bg-white/[0.1] text-white" : ""}`}
    >
      <Icon icon={hidden ? ViewOffSlashIcon : ViewIcon} size={17} />
    </button>
  );
}

const tileRadius = (size: number) => Math.round(size * 0.26);

export function LogoIcon({ logo, size }: { logo: Logo; size: number }) {
  if (logo.bare) {
    return <Image src={logo.src} alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />;
  }
  return (
    <Image
      src={logo.src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 object-cover ${logo.invert ? "invert" : ""} ${logo.pixel ? "[image-rendering:pixelated]" : ""}`}
      style={{ width: size, height: size, borderRadius: tileRadius(size) }}
    />
  );
}

export function ColorTile({ color, label, size }: { color: string; label: string; size: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center font-display leading-none font-semibold text-white"
      style={{ width: size, height: size, borderRadius: tileRadius(size), background: color, fontSize: Math.round(size * 0.46) }}
    >
      {label.trim().charAt(0).toUpperCase() || "H"}
    </span>
  );
}

export function InstanceIcon({ instance, size }: { instance: Instance; size: number }) {
  if (instance.mark) return <MarkTile size={size} />;
  if (instance.color) return <ColorTile color={instance.color} label={instance.name} size={size} />;
  if (instance.logo) return <LogoIcon logo={instance.logo} size={size} />;
  return <PixelIcon id={instance.id} size={size} />;
}

export function PixelIcon({ id, icon, size }: { id: string; icon?: string; size: number }) {
  return (
    <ModIcon id={id} icon={icon} size={size} />
  );
}

function PageHead({ title, note, children }: { title: string; note?: string; children?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-5 pt-10 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-[clamp(2.25rem,3.6vw,3rem)] leading-none font-semibold tracking-[-0.035em]">{title}</h1>
        {note && <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.55] text-white/70">{note}</p>}
      </div>
      {children}
    </div>
  );
}

function useStickToBottom(length: number) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [length]);
  return ref;
}

function Logs({ lines, className = "" }: { lines: string[]; className?: string }) {
  const ref = useStickToBottom(lines.length);
  return (
    <div ref={ref} className={`hzl-mono rounded-[12px] overflow-y-auto bg-black/25 p-4 text-[12px] leading-[1.75] text-white/75 ${className}`}>
      {lines.map((line, i) => (
        <p key={i} className="hzl-line break-words whitespace-pre-wrap">
          {line}
        </p>
      ))}
    </div>
  );
}

type MenuItem = { id: string; label: string; note: string; locked?: boolean; run: () => void };

const MENU_ITEM = "flex w-full flex-col rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-white/[0.07] disabled:pointer-events-none disabled:opacity-40";
const ON_TOUCH = "[@media(hover:none)]:opacity-100";

function MenuList({ label, items, onClose, className = "" }: { label: string; items: MenuItem[]; onClose: () => void; className?: string }) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <ul role="menu" aria-label={label} className={`${POPOVER} absolute top-full z-20 mt-2 w-[290px] ${className}`}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              role="menuitem"
              disabled={item.locked}
              onClick={() => {
                onClose();
                item.run();
              }}
              className={MENU_ITEM}
            >
              <span className="text-[14px] font-medium">{item.label}</span>
              <span className="truncate text-[12px] text-white/55">{item.note}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function PlayGroup({ api }: { api: Api }) {
  const [open, setOpen] = useState(false);
  const { instance, launch, task, data } = api;
  const mine = launch?.instanceId === instance.id ? launch : null;
  const job = task?.instanceId === instance.id ? task : null;
  const newest = data.nightlies[0];
  const current = data.nightlies.find((n) => n.id === instance.version);
  const running = mine?.phase === "running";
  const busy = !!job || (!!mine && !running);
  const behind = instance.edition === "rust" && !!newest && instance.version !== newest.id;
  const pct = Math.round((job ? job.progress : (mine?.progress ?? 0)) * 100);
  const progressLabel = job ? TASK_LABEL[job.kind] : mine?.phase === "checking" ? "Checking" : "Starting";

  const main = running
    ? { label: "Stop", icon: StopIcon, run: api.stop }
    : behind
      ? { label: "Update", icon: Download04Icon, run: () => api.startTask("update") }
      : { label: "Play", icon: PlayIcon, run: () => api.play() };

  const command = `horizon-launcher play --instance ${instance.id}`;
  const items: MenuItem[] = [
    instance.edition === "rust"
      ? { id: "prepare", label: "Prepare again", note: "Read 26.3's files from your own copy", locked: running || busy, run: () => api.startTask("prepare") }
      : { id: "verify", label: "Verify game files", note: `Check Minecraft ${instance.java} against Mojang's hashes`, locked: running || busy, run: () => api.startTask("verify") },
    ...(behind ? [{ id: "skip", label: "Play without updating", note: `Stay on Nightly · ${current?.build ?? ""}`, locked: running || busy, run: () => api.play() }] : []),
    { id: "shortcut", label: "Create a desktop shortcut", note: "Starts this instance in one click", run: () => api.say(`Created a shortcut for ${instance.name} on the desktop`) },
    {
      id: "command",
      label: "Copy the launch command",
      note: command,
      run: () => {
        navigator.clipboard?.writeText(command).catch(() => {});
        api.say(`Copied ${command}`);
      },
    },
  ];

  return (
    <div className="relative w-full sm:w-[200px]">
      <div
        className={`relative flex h-14 items-center overflow-hidden rounded-[14px] transition-[filter] ${
          busy ? "bg-(--accent)/35" : running ? "bg-white/[0.14] hover:brightness-125" : "bg-(--accent) text-(--on-accent) hover:brightness-110"
        }`}
      >
        {busy ? (
          <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={progressLabel} className="flex h-full flex-1 items-center justify-center pr-10">
            <span className="absolute inset-y-0 left-0 bg-(--accent) transition-[width] duration-100" style={{ width: `${pct}%` }} />
            <span className="relative text-[16px] font-semibold tabular-nums">
              {progressLabel} {pct}%
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={main.run}
            title={behind && !running ? `Update to ${newest?.title}` : undefined}
            className="flex h-full flex-1 items-center justify-center gap-2.5 pr-10 text-[18px] font-semibold"
          >
            <Icon icon={main.icon} size={20} />
            {main.label}
          </button>
        )}
        <button
          type="button"
          aria-label="More play options"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`absolute right-2 inline-flex size-10 items-center justify-center rounded-[10px] transition-colors hover:bg-black/20 ${open ? "bg-black/20" : ""}`}
        >
          <Icon icon={MoreHorizontalIcon} size={20} />
        </button>
      </div>
      {open && <MenuList label="Play options" items={items} onClose={() => setOpen(false)} className="left-0" />}
    </div>
  );
}

function FolderGroup({ api }: { api: Api }) {
  const [open, setOpen] = useState(false);
  const { instance } = api;
  const instanceFolder = `${GAME_FOLDER}/instances/${instance.id}`;
  const items: MenuItem[] = [
    { id: "instance", label: "Open the instance folder", note: instanceFolder, run: () => api.say(`Opened ${instanceFolder}`) },
    { id: "game", label: "Open the game folder", note: `${GAME_FOLDER} · worlds, options and logs`, run: () => api.say(`Opened ${GAME_FOLDER}`) },
    { id: "shots", label: "Open the screenshots folder", note: plural(instance.shots.length, "screenshot", "screenshots"), run: () => api.say(`Opened ${instanceFolder}/screenshots`) },
    { id: "minecraft", label: "Choose the Minecraft folder", note: "~/.minecraft · found by itself", run: () => api.say("Minecraft folder unchanged: ~/.minecraft") },
  ];
  const reveal = open
    ? "mr-2 w-9 opacity-100 bg-white/[0.1]"
    : "w-0 opacity-0 group-hover:mr-2 group-hover:w-9 group-hover:opacity-100 focus-visible:mr-2 focus-visible:w-9 focus-visible:opacity-100 [@media(hover:none)]:mr-2 [@media(hover:none)]:w-9 [@media(hover:none)]:opacity-100";
  return (
    <div className="group relative">
      <div className="flex h-14 items-center rounded-[14px] bg-white/[0.08] text-white/80 transition-colors hover:bg-white/[0.12]">
        <button type="button" aria-label="Open the instance folder" title="Folder" onClick={items[0].run} className="inline-flex size-14 items-center justify-center rounded-[14px] transition-colors hover:text-white">
          <Icon icon={Folder01Icon} size={21} />
        </button>
        <button
          type="button"
          aria-label="Folder options"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex h-10 items-center justify-center overflow-hidden rounded-[10px] transition-[width,opacity,margin,background-color] duration-200 hover:bg-white/[0.1] hover:text-white ${reveal}`}
        >
          <Icon icon={MoreHorizontalIcon} size={20} />
        </button>
      </div>
      {open && <MenuList label="Folders" items={items} onClose={() => setOpen(false)} className="left-0" />}
    </div>
  );
}

function VersionPicker({ api }: { api: Api }) {
  const [open, setOpen] = useState(false);
  const { instance, data } = api;
  const rust = instance.edition === "rust";
  const current = data.nightlies.find((n) => n.id === instance.version) ?? data.nightlies[0];
  const java = JAVA_VERSIONS.find((v) => v.id === instance.java) ?? JAVA_VERSIONS[0];
  const options = rust
    ? data.nightlies.map((n, i) => ({
        id: n.id,
        label: `Nightly · ${n.build}`,
        note: `${formatDay(n.published)}${i === 0 ? " · newest" : ""}${api.installed.includes(n.id) ? "" : " · not installed"}`,
      }))
    : JAVA_VERSIONS.map((v) => ({ id: v.id, label: v.label, note: v.note }));
  const selected = rust ? instance.version : instance.java;
  return (
    <div className="relative w-full sm:w-auto">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-full min-w-[220px] items-center justify-between gap-6 rounded-[14px] bg-white/[0.08] px-4 text-left transition-colors hover:bg-white/[0.12]"
      >
        <span>
          <span className="block text-[12px] text-white/55">Version</span>
          <span className="block text-[15px] font-medium">{rust ? `Nightly · ${current?.build}` : java.label}</span>
        </span>
        <Icon icon={ArrowDown01Icon} size={18} className={`text-white/60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul role="listbox" aria-label="Version" className={`${POPOVER} absolute top-full left-0 z-20 mt-2 w-[300px]`}>
            {options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.id === selected}
                  onClick={() => {
                    if (rust) api.setVersion(o.id);
                    else api.setJava(o.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-white/[0.07]"
                >
                  <span>
                    <span className="block text-[14px] font-medium">{o.label}</span>
                    <span className="block text-[12px] text-white/55">{o.note}</span>
                  </span>
                  {o.id === selected && <Icon icon={Tick02Icon} size={17} className="text-(--accent-soft)" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function JoinFriend({ api }: { api: Api }) {
  const [code, setCode] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    api.say(`Invite ${code.trim().slice(0, 10)} accepted, joining pixelmoth`);
    api.play("pixelmoth's world");
    setCode("");
  };
  return (
    <form onSubmit={submit} className="relative w-full xl:w-[340px]">
      <Icon icon={UserAdd01Icon} size={19} className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-white/60" />
      <input
        id="invite"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        aria-label="Join a friend with an invite code"
        placeholder="Paste a friend's invite code"
        className="h-14 w-full rounded-[14px] bg-white/[0.06] pr-[84px] pl-12 text-[14px] outline-none backdrop-blur-xl transition-colors focus:bg-white/[0.09]"
      />
      <button type="submit" disabled={!code.trim()} className={`${QUIET} absolute top-1/2 right-2 h-10 -translate-y-1/2`}>
        Join
      </button>
    </form>
  );
}

function TabbedPanel({ tabs, children }: { tabs: ReactNode; children: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [shape, setShape] = useState<string | null>(null);
  useEffect(() => {
    const box = wrap.current;
    const tab = strip.current;
    if (!box || !tab) return;
    const observer = new ResizeObserver(() => {
      const tw = box.offsetWidth;
      const th = box.offsetHeight;
      const w = tab.offsetWidth;
      const h = tab.offsetHeight;
      setShape(
        tw - w < 36
          ? "inset(0 round 20px)"
          : `path('M0 18A18 18 0 0 1 18 0L${w - 18} 0A18 18 0 0 1 ${w} 18L${w} ${h - 16}A16 16 0 0 0 ${w + 16} ${h}L${tw - 20} ${h}A20 20 0 0 1 ${tw} ${h + 20}L${tw} ${th - 20}A20 20 0 0 1 ${tw - 20} ${th}L20 ${th}A20 20 0 0 1 0 ${th - 20}Z')`,
      );
    });
    observer.observe(box);
    observer.observe(tab);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={wrap} className="relative mt-12">
      <div
        aria-hidden
        className={`hzl-glass absolute inset-0 transition-opacity duration-300 ${shape ? "opacity-100" : "opacity-0"}`}
        style={{ clipPath: shape ?? undefined }}
      />
      <div ref={strip} className="relative w-fit max-w-[calc(100%-36px)] px-2 pt-2 pb-1">
        {tabs}
      </div>
      <div className="relative p-2">{children}</div>
    </div>
  );
}

type HomeTab = "overview" | "mods" | "worlds" | "multiplayer" | "packs" | "screenshots";

export function HomeView({ api }: { api: Api }) {
  const { instance, launch } = api;
  const [tab, setTab] = useState<HomeTab>("overview");
  const mine = launch?.instanceId === instance.id ? launch : null;

  return (
    <div key={instance.id} className="hzl-pop">
      <div className="flex flex-col gap-8 pt-12 sm:pt-16 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <Tabs
            label="Edition"
            size="sm"
            value={instance.edition}
            onChange={api.setEdition}
            options={[
              { id: "rust", label: "Rust Edition", icon: <MarkTile size={18} /> },
              {
                id: "java",
                label: "Java Edition",
                icon: <Image src="/media/launcher/minecraft-java.webp" alt="" width={18} height={18} className="rounded-[5px]" />,
              },
            ]}
          />
          <h1 className="mt-5 flex items-center gap-4">
            <InstanceIcon instance={instance} size={56} />
            <span className="truncate font-display text-[clamp(2.75rem,5vw,4rem)] leading-none font-semibold tracking-[-0.035em]">{instance.name}</span>
          </h1>
          <p className="mt-4 text-[15px] text-white/80">
            {mine?.phase === "running"
              ? `Playing${mine.world ? ` in ${mine.world}` : ""} for ${duration(api.elapsed)} now. Have fun!`
              : instance.played
                ? `You've played for ${instance.played}! Last played ${instance.last}.`
                : "You haven't played this one yet. Press Play to start."}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            <PlayGroup api={api} />
            <VersionPicker api={api} />
            <button type="button" aria-label="Mods" title="Mods" onClick={() => setTab("mods")} className={BIG_ICON}>
              <Icon icon={PuzzleIcon} size={21} />
            </button>
            <FolderGroup api={api} />
          </div>
        </div>
        <JoinFriend api={api} />
      </div>

      <TabbedPanel
        tabs={
          <Tabs
            label="Instance"
            value={tab}
            onChange={setTab}
            options={[
              { id: "overview", label: "Overview", icon: <Icon icon={DashboardSquare01Icon} size={16} /> },
              { id: "mods", label: "Mods", count: instance.mods.length, icon: <Icon icon={PuzzleIcon} size={16} /> },
              { id: "worlds", label: "Worlds", count: instance.worlds.length, icon: <Icon icon={EarthIcon} size={16} /> },
              { id: "multiplayer", label: "Multiplayer", count: instance.servers.length, icon: <Icon icon={UserMultiple02Icon} size={16} /> },
              { id: "packs", label: "Packs", count: instance.packs.length },
              { id: "screenshots", label: "Screenshots", count: instance.shots.length },
            ]}
          />
        }
      >
        <div key={tab} className="hzl-pop min-h-[340px] px-1 pt-2 pb-1">
          {tab === "overview" && <Overview api={api} onShots={() => setTab("screenshots")} />}
          {tab === "mods" && <InstanceMods api={api} />}
          {tab === "worlds" && <Worlds api={api} />}
          {tab === "multiplayer" && <Multiplayer api={api} />}
          {tab === "packs" && <Packs api={api} />}
          {tab === "screenshots" && <Screenshots api={api} />}
        </div>
      </TabbedPanel>
    </div>
  );
}

function PatchLog({ api }: { api: Api }) {
  const { instance, data } = api;
  const nightly = data.nightlies.find((n) => n.id === instance.version) ?? data.nightlies[0];
  const note = data.notes[0];
  const rust = instance.edition === "rust" && nightly && nightly.changes.length > 0;
  const changes = rust ? nightly.changes : (note?.items ?? []).map((text) => ({ section: "Launcher", text }));
  const sections = [...new Set(changes.map((c) => c.section))];
  const hidden = rust ? nightly.total - nightly.changes.length : 0;
  return (
    <section className="flex flex-col rounded-[14px] bg-white/[0.04] p-4 max-lg:max-h-[420px] lg:absolute lg:inset-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={CARD_TITLE}>Patch log</h3>
        <button type="button" onClick={() => api.go("notes")} className="text-[13px] text-white/60 transition-colors hover:text-white">
          All notes
        </button>
      </div>
      <p className={CARD_NOTE}>
        {rust ? `${nightly.title} · ${formatDay(nightly.published)}` : note ? `Launcher ${note.version} · ${formatDay(note.published)}` : "No notes yet"}
      </p>
      <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {sections.map((section) => (
          <div key={section}>
            {sections.length > 1 && <h4 className="text-[13px] font-medium text-white/55">{section}</h4>}
            <ul className="mt-1.5 space-y-1.5 text-[14px] leading-[1.5] text-white/80">
              {changes
                .filter((c) => c.section === section)
                .map((c) => (
                  <li key={c.text} className="flex gap-2.5">
                    <span aria-hidden className="mt-[9px] size-[5px] shrink-0 rounded-full bg-white/40" />
                    {c.text}
                  </li>
                ))}
            </ul>
          </div>
        ))}
        {hidden > 0 && nightly && (
          <a href={nightly.url} target="_blank" rel="noreferrer" className="inline-block text-[13px] font-medium text-(--accent-soft) transition-colors hover:text-white">
            {plural(hidden, "more change", "more changes")} on GitHub
          </a>
        )}
      </div>
    </section>
  );
}

function Overview({ api, onShots }: { api: Api; onShots: () => void }) {
  const { instance, launch } = api;
  const mine = launch?.instanceId === instance.id ? launch : null;
  const log = mine ? mine.script.filter((s) => s.at <= mine.progress).map((s) => s.line) : [];
  const many = instance.shots.length >= 3;
  return (
    <div className="flex flex-col gap-5">
      {mine && (
        <section className="px-3">
          <div className="flex items-baseline justify-between">
            <h3 className={CARD_TITLE}>Game log</h3>
            <span className="text-[13px] text-white/55">{plural(log.length, "line", "lines")}</span>
          </div>
          <Logs lines={log} className="mt-3 max-h-[200px]" />
        </section>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 px-3">
          <div className="flex h-8 items-center justify-between gap-3">
            <h3 className={CARD_TITLE}>
              Screenshots <span className="font-normal text-white/45 tabular-nums">{instance.shots.length || ""}</span>
            </h3>
            {instance.shots.length > 0 && (
              <div className="flex items-center gap-2">
                <PrivacyToggle api={api} />
                <button type="button" onClick={onShots} className="text-[13px] text-white/60 transition-colors hover:text-white">
                  See all
                </button>
              </div>
            )}
          </div>
          {instance.shots.length > 0 ? (
            <div className={`mt-3 grid gap-2 ${many ? "aspect-[8/3] grid-cols-3 grid-rows-2" : "grid-cols-2"}`}>
              {instance.shots.slice(0, 3).map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={onShots}
                  aria-label={`Screenshot ${s.name}`}
                  className={`group relative overflow-hidden rounded-[12px] ${many ? (i === 0 ? "col-span-2 row-span-2" : "") : "aspect-video"}`}
                >
                  <Image
                    src={s.src}
                    alt=""
                    fill
                    sizes={i === 0 ? "(min-width: 1024px) 40vw, 66vw" : "(min-width: 1024px) 20vw, 33vw"}
                    className={`object-cover transition-[filter,scale] duration-300 ${shotLook(api.hideShots)}`}
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[14px] text-white/60">No screenshots yet. Press F2 in the game.</p>
          )}
        </section>
        <div className="relative min-w-0 lg:min-h-[340px]">
          <PatchLog api={api} />
        </div>
      </div>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-3 py-10 text-[14px] text-white/60">{children}</p>;
}

function InstanceMods({ api }: { api: Api }) {
  const { instance, data } = api;
  if (instance.mods.length === 0) {
    return (
      <Empty>
        No mods in {instance.name} yet.{" "}
        <button type="button" onClick={() => api.go("mods")} className="font-medium text-white underline-offset-4 hover:underline">
          Find mods
        </button>
      </Empty>
    );
  }
  return (
    <>
      <div className="flex items-center justify-between px-3 pb-2">
        <p className="text-[13px] text-white/60">
          {plural(instance.mods.length, "mod", "mods")} in {instance.name}
        </p>
        <button type="button" onClick={() => api.go("mods")} className={QUIET}>
          <Icon icon={PlusSignIcon} size={16} />
          Find mods
        </button>
      </div>
      <ul>
        {instance.mods.map((id) => {
          const mod = data.mods.find((m) => m.id === id);
          return (
            <li key={id} className={`${ROW} group`}>
              <PixelIcon id={id} icon={mod?.icon} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{mod?.name ?? id}</span>
                <span className="block truncate text-[13px] text-white/55">{mod ? `${mod.version} · ${mod.authors[0] ?? ""}` : "Local mod"}</span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${mod?.name ?? id}`}
                onClick={() => api.toggleMod(id)}
                className={`${ICON_BUTTON} opacity-0 group-hover:opacity-100 focus-visible:opacity-100 ${ON_TOUCH}`}
              >
                <Icon icon={Delete02Icon} size={17} />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Worlds({ api }: { api: Api }) {
  const { instance } = api;
  if (instance.worlds.length === 0) return <Empty>No worlds yet. Make one in the game and it shows up here.</Empty>;
  return (
    <ul>
      {instance.worlds.map((w) => (
        <li key={w.name}>
          <button type="button" onClick={() => api.play(w.name)} className={`${ROW} group`}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{w.name}</span>
              <span className="block truncate text-[13px] text-white/55">
                {w.mode} · {w.last}
              </span>
            </span>
            <span className="text-[13px] text-white/55 tabular-nums group-hover:hidden">{w.size}</span>
            <span className="hidden items-center gap-1 text-[13px] font-medium group-hover:inline-flex">
              Play
              <Icon icon={ArrowRight01Icon} size={15} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Multiplayer({ api }: { api: Api }) {
  const { instance } = api;
  if (instance.servers.length === 0) return <Empty>No servers saved in this instance.</Empty>;
  return (
    <ul>
      {instance.servers.map((s) => (
        <li key={s.name} className={ROW}>
          <Dot tone={s.players === "Offline" ? "off" : "live"} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium">{s.name}</span>
            <span className="block truncate text-[13px] text-white/55">
              {s.address} · {s.players}
            </span>
          </span>
          <button type="button" disabled={s.players === "Offline"} onClick={() => api.play(s.name)} className={QUIET}>
            Join
          </button>
        </li>
      ))}
    </ul>
  );
}

function Packs({ api }: { api: Api }) {
  const { instance } = api;
  if (instance.packs.length === 0) return <Empty>No resource packs. Find them on the Mods page under Modrinth.</Empty>;
  return (
    <ul>
      {instance.packs.map((p) => (
        <li key={p.name} className={ROW}>
          <PixelIcon id={p.name} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium">{p.name}</span>
            <span className="block truncate text-[13px] text-white/55">Resource pack · {p.on ? "on" : "off"}</span>
          </span>
          <Toggle on={p.on} onChange={() => api.togglePack(p.name)} label={`Use ${p.name}`} />
        </li>
      ))}
    </ul>
  );
}

function Screenshots({ api }: { api: Api }) {
  const { instance } = api;
  if (instance.shots.length === 0) return <Empty>No screenshots yet. Press F2 in the game.</Empty>;
  return (
    <div className="px-3">
      <div className="flex h-8 items-center justify-between">
        <p className="text-[13px] text-white/60">{plural(instance.shots.length, "screenshot", "screenshots")}</p>
        <PrivacyToggle api={api} />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
        {instance.shots.map((s) => (
          <figure key={s.name} className="group">
            <div className="relative aspect-video overflow-hidden rounded-[12px]">
              <Image
                src={s.src}
                alt={`Screenshot ${s.name}`}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                className={`object-cover transition-[filter,scale] duration-300 ${shotLook(api.hideShots)}`}
              />
            </div>
            <figcaption className="truncate pt-2 text-[12px] text-white/60">{s.name}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

type Source = "horizon" | "modrinth" | "curseforge";

export function ModsView({ api }: { api: Api }) {
  const { data, instance } = api;
  const [source, setSource] = useState<Source>("horizon");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string>(data.mods[0]?.id ?? "");
  const [pack, setPack] = useState<string>(MODRINTH[0].id);
  const [packs, setPacks] = useState<string[]>([]);
  const q = query.trim().toLowerCase();
  const mods = data.mods.filter((m) => !q || `${m.name} ${m.summary} ${m.authors.join(" ")}`.toLowerCase().includes(q));
  const results = MODRINTH.filter((m) => !q || `${m.name} ${m.summary} ${m.kind}`.toLowerCase().includes(q));
  const mod = data.mods.find((m) => m.id === picked) ?? mods[0];
  const entry = MODRINTH.find((m) => m.id === pack) ?? MODRINTH[0];

  return (
    <>
      <PageHead title="Mods" note={`Everything you install goes into ${instance.name}. Pick another instance on the left to fill that one.`}>
        <Tabs
          label="Source"
          size="sm"
          value={source}
          onChange={setSource}
          options={[
            { id: "horizon", label: "Horizon" },
            { id: "modrinth", label: "Modrinth" },
            { id: "curseforge", label: "CurseForge", disabled: true, hint: "soon" },
          ]}
        />
      </PageHead>
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <Glass className="p-2">
          <label className="rounded-[12px] m-1 mb-2 flex h-11 items-center gap-2.5 bg-white/[0.07] px-3.5 text-white/55 focus-within:bg-white/[0.11]">
            <Icon icon={Search01Icon} size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={source === "horizon" ? `Search ${data.mods.length} Horizon mods` : "Search resource packs and modpacks"}
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none"
              aria-label="Search mods"
            />
          </label>
          <ul className="max-h-[calc(100dvh-300px)] min-h-[240px] overflow-y-auto">
            {source === "horizon"
              ? mods.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => setPicked(m.id)} className={`${ROW} ${mod?.id === m.id ? "bg-white/[0.1]" : ""}`}>
                      <PixelIcon id={m.id} icon={m.icon} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="truncate text-[14px] font-medium">{m.name}</span>
                          <span className="truncate text-[13px] text-white/50">{m.authors[0]}</span>
                        </span>
                        <span className="block truncate text-[13px] text-white/60">{m.summary}</span>
                      </span>
                      <span className="hidden text-[13px] text-white/50 tabular-nums sm:block">{compact.format(m.downloads)}</span>
                      <span className="flex w-5 justify-center text-(--live)">{instance.mods.includes(m.id) && <Icon icon={Tick02Icon} size={17} />}</span>
                    </button>
                  </li>
                ))
              : results.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => setPack(m.id)} className={`${ROW} ${entry.id === m.id ? "bg-white/[0.1]" : ""}`}>
                      <PixelIcon id={m.id} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="truncate text-[14px] font-medium">{m.name}</span>
                          <span className="truncate text-[13px] text-white/50">{m.kind}</span>
                        </span>
                        <span className="block truncate text-[13px] text-white/60">{m.summary}</span>
                      </span>
                      <span className={`text-[13px] font-medium ${m.compat === "works" ? "text-(--live)" : m.compat === "partly" ? "text-(--warn)" : "text-white/40"}`}>
                        {COMPAT_LABEL[m.compat]}
                      </span>
                    </button>
                  </li>
                ))}
            {source === "horizon" && mods.length === 0 && <li className="px-4 py-6 text-[14px] text-white/60">Nothing matches &ldquo;{query}&rdquo;.</li>}
          </ul>
        </Glass>

        <Glass className="p-6 lg:sticky lg:top-0">
          {source === "horizon" && mod ? (
            <ModDetail mod={mod} api={api} />
          ) : (
            <div key={entry.id} className="hzl-pop">
              <PixelIcon id={entry.id} size={64} />
              <h2 className="mt-5 font-display text-[24px] leading-tight font-semibold tracking-[-0.02em]">{entry.name}</h2>
              <p className="mt-1 text-[13px] text-white/55">{entry.kind} on Modrinth</p>
              <p className="mt-4 text-[14px] leading-[1.6] text-white/70">{entry.summary}</p>
              <p className={`mt-4 text-[14px] font-medium ${entry.compat === "works" ? "text-(--live)" : entry.compat === "partly" ? "text-(--warn)" : "text-white/55"}`}>
                {COMPAT_LABEL[entry.compat]} in Horizon
              </p>
              <button
                type="button"
                disabled={entry.compat === "none"}
                onClick={() => {
                  setPacks((list) => (list.includes(entry.id) ? list.filter((p) => p !== entry.id) : [...list, entry.id]));
                  api.say(packs.includes(entry.id) ? `Removed ${entry.name}` : `Downloaded ${entry.name}, checked against Modrinth's checksum`);
                }}
                className={`${packs.includes(entry.id) ? QUIET : SOLID} mt-6 h-11 w-full`}
              >
                {packs.includes(entry.id) ? "Remove" : entry.kind === "Modpack" ? "Import as an instance" : "Install"}
              </button>
            </div>
          )}
        </Glass>
      </div>
    </>
  );
}

function ModDetail({ mod, api }: { mod: ModEntry; api: Api }) {
  const on = api.instance.mods.includes(mod.id);
  const can = mod.capabilities.map((c) => CAPABILITIES[c]).filter(Boolean);
  return (
    <div key={mod.id} className="hzl-pop">
      <PixelIcon id={mod.id} icon={mod.icon} size={64} />
      <h2 className="mt-5 font-display text-[24px] leading-tight font-semibold tracking-[-0.02em]">{mod.name}</h2>
      <p className="mt-1 text-[13px] text-white/55">
        by {mod.authors.join(", ")} · {mod.version} · {mod.license}
      </p>
      <p className="mt-4 text-[14px] leading-[1.6] text-white/75">{mod.summary}</p>
      {can.length > 0 && (
        <p className="mt-4 text-[14px] leading-[1.6] text-white/90">
          It can {can.length === 1 ? can[0] : `${can.slice(0, -1).join(", ")} and ${can[can.length - 1]}`}.
        </p>
      )}
      {mod.kind === "native-mod" && (
        <p className="mt-4 text-[13px] leading-[1.55] text-white/55">
          A native mod is code. It builds into a game of its own, only when you say so. The first build downloads Rust and takes 20 to 30 minutes.
        </p>
      )}
      <p className="mt-4 text-[13px] text-white/55 tabular-nums">{whole.format(mod.downloads)} downloads</p>
      <button type="button" onClick={() => api.toggleMod(mod.id)} className={`${on ? QUIET : SOLID} mt-6 h-11 w-full`}>
        {on ? `Remove from ${api.instance.name}` : `Install in ${api.instance.name}`}
      </button>
    </div>
  );
}

export function ServersView({ api }: { api: Api }) {
  const server = api.servers.find((s) => s.id === api.serverId) ?? api.servers[0];
  const [command, setCommand] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    api.runCommand(server.id, command.trim());
    setCommand("");
  };
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    api.say(`Copied ${text}`);
  };
  const running = server.state === "running";

  return (
    <>
      <PageHead title="Servers" note="Host a world for your friends with buttons and no commands. The same program runs on a VPS." />
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Glass key={server.id} className="hzl-pop p-6">
          <p className="flex items-center gap-2 text-[13px] text-white/75">
            <Dot tone={running ? "live" : server.state === "starting" ? "busy" : "off"} />
            {running ? `Running · up ${duration(server.up)}` : server.state === "starting" ? "Starting" : "Stopped"}
          </p>
          <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h2 className="truncate font-display text-[clamp(2rem,3.4vw,2.75rem)] leading-none font-semibold tracking-[-0.035em]">{server.name}</h2>
              <p className="mt-3 text-[14px] text-white/70 tabular-nums">
                {running
                  ? `${server.players.length} of ${server.max} players · ${server.tps.toFixed(1)} TPS · ${server.mspt.toFixed(1)} ms a tick · ${server.ram.toFixed(2)} GB`
                  : `${server.mode} · ${server.world} · up to ${server.max} players`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {running ? (
                <>
                  <button type="button" onClick={() => api.restartServer(server.id)} className={`${QUIET} h-11 px-5`}>
                    Restart
                  </button>
                  <button type="button" onClick={() => api.stopServer(server.id)} className={`${SOLID} h-11 px-6`}>
                    Stop
                  </button>
                </>
              ) : (
                <button type="button" disabled={server.state === "starting"} onClick={() => api.startServer(server.id)} className={`${PLAY} h-11 px-7 text-[15px]`}>
                  Start
                </button>
              )}
            </div>
          </div>

          <div className="mt-6">
            {server.console.length > 0 ? (
              <Logs lines={server.console} className="h-[320px]" />
            ) : (
              <div className="rounded-[12px] flex h-[320px] flex-col items-start justify-center gap-2 bg-black/25 p-6 text-[14px] text-white/60">
                <Icon icon={ComputerTerminal01Icon} size={22} />
                The console shows up here once the server starts.
              </div>
            )}
            <form onSubmit={submit} className="rounded-[12px] mt-2 flex h-11 items-center gap-2 bg-white/[0.07] pr-1.5 pl-4 focus-within:bg-white/[0.11]">
              <span className="hzl-mono text-[13px] text-white/40">/</span>
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                disabled={!running}
                placeholder={running ? "Type a command, like list or time set day" : "Start the server to send commands"}
                aria-label="Server command"
                className="hzl-mono h-full min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none disabled:cursor-not-allowed"
              />
              <button type="submit" disabled={!running || !command.trim()} className={`${QUIET} h-8 px-3 text-[13px]`}>
                Send
              </button>
            </form>
          </div>
        </Glass>

        <div className="flex flex-col gap-2.5">
          <Glass className="p-2">
            <ul>
              {api.servers.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => api.setServerId(s.id)} className={`${ROW} ${s.id === server.id ? "bg-white/[0.1]" : ""}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{s.name}</span>
                      <span className="block truncate text-[13px] text-white/55">
                        {s.state === "running" ? `${s.players.length} of ${s.max} online` : s.state === "starting" ? "Starting" : `${s.mode} · stopped`}
                      </span>
                    </span>
                    <Dot tone={s.state === "running" ? "live" : s.state === "starting" ? "busy" : "off"} />
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={api.addServer} className={`${ROW} text-[14px] text-white/70 hover:text-white`}>
                  <Icon icon={PlusSignIcon} size={16} />
                  Create a server
                </button>
              </li>
            </ul>
          </Glass>

          <Glass className="flex flex-col gap-6 p-5">
            <div>
              <h3 className="text-[13px] font-medium text-white/70">On this network</h3>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="truncate text-[22px] font-medium tracking-[-0.02em] tabular-nums">{ADDRESSES.lan}</span>
                <button type="button" aria-label="Copy the network address" onClick={() => copy(ADDRESSES.lan)} className={ICON_BUTTON}>
                  <Icon icon={Copy01Icon} size={17} />
                </button>
              </div>
              <p className="mt-1 text-[13px] leading-[1.5] text-white/55">Friends on the same Wi-Fi: Multiplayer, Add server, paste.</p>
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-white/70">Over the internet</h3>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="truncate text-[15px] font-medium">{ADDRESSES.tailnet}</span>
                <button type="button" aria-label="Copy the Tailscale address" onClick={() => copy(ADDRESSES.tailnet)} className={ICON_BUTTON}>
                  <Icon icon={Copy01Icon} size={17} />
                </button>
              </div>
              <p className="mt-1 text-[13px] leading-[1.5] text-white/55">Through Tailscale. Only the friends you invite can reach it.</p>
            </div>
            {running && (
              <div>
                <h3 className="text-[13px] font-medium text-white/70">Online now</h3>
                <ul className="mt-3 space-y-2.5 text-[14px]">
                  {server.players.map((p) => (
                    <li key={p} className="flex items-center gap-3">
                      <Image src={playerHead(p, 64)} alt="" width={28} height={28} unoptimized className="size-7 shrink-0 rounded-[7px] [image-rendering:pixelated]" />
                      <span className="min-w-0 flex-1 truncate">{p}</span>
                      <span className="text-[13px] text-white/50">{p === PLAYER ? "Operator" : "Friend"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Glass>
        </div>
      </div>
    </>
  );
}

export function VersionsView({ api }: { api: Api }) {
  const { data, instances } = api;
  return (
    <>
      <PageHead title="Versions" note="Horizon's Nightly builds, newest first. Your worlds live in the game folder, so removing a version never touches them.">
        <label className="flex items-center gap-3 text-[14px] text-white/85">
          Install new versions automatically
          <Toggle on={api.prefs.autoUpdate} onChange={(autoUpdate) => api.setPrefs({ autoUpdate })} label="Install new versions automatically" />
        </label>
      </PageHead>
      <div className="flex flex-col gap-2.5">
        {data.nightlies.map((n, i) => {
          const users = instances.filter((x) => x.version === n.id).map((x) => x.name);
          const has = api.installed.includes(n.id);
          const busy = api.installing === n.id;
          return (
            <Glass key={n.id} className="flex items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.01em]">
                  <span className="truncate">{n.title}</span>
                  {i === 0 && (
                    <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-normal text-white/70">
                      <Dot tone="accent" />
                      Newest
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-[13px] text-white/60">
                  {formatDay(n.published)}, {dayTime.format(new Date(n.published))} UTC
                  {users.length > 0 ? ` · played by ${users.join(", ")}` : has ? " · installed" : ""}
                </p>
              </div>
              {busy ? (
                <span className="text-[13px] text-white/60">Installing</span>
              ) : has ? (
                <button
                  type="button"
                  disabled={users.length > 0}
                  title={users.length > 0 ? "An instance plays this version" : "Remove this version"}
                  aria-label={`Remove ${n.title}`}
                  onClick={() => api.removeVersion(n.id)}
                  className={`${ICON_BUTTON} disabled:pointer-events-none disabled:opacity-30`}
                >
                  <Icon icon={Delete02Icon} size={17} />
                </button>
              ) : (
                <button type="button" onClick={() => api.installVersion(n.id)} className={QUIET}>
                  Install
                </button>
              )}
            </Glass>
          );
        })}
      </div>
    </>
  );
}

export function NotesView({ api }: { api: Api }) {
  const { data } = api;
  return (
    <>
      <PageHead title="Patch notes" note={`Launcher ${data.launcherVersion} is the newest. The launcher updates itself and says Restart when it's ready.`} />
      <div className="flex flex-col gap-2.5">
        {data.notes.map((note) => (
          <Glass key={note.version} className="p-6">
            <h2 className="text-[16px] font-semibold tracking-[-0.01em]">
              Launcher {note.version} <span className="font-normal text-white/55">· {formatDay(note.published)}</span>
            </h2>
            <ul className="mt-3 space-y-1.5 text-[14px] leading-[1.55] text-white/75">
              {note.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="mt-[9px] size-[5px] shrink-0 bg-white/40" />
                  {item}
                </li>
              ))}
            </ul>
          </Glass>
        ))}
      </div>
    </>
  );
}

function SettingRow({ title, note, lead, stacked, children }: { title: string; note?: string; lead?: ReactNode; stacked?: boolean; children?: ReactNode }) {
  return (
    <div className={`flex gap-4 rounded-[14px] px-4 py-4 ${stacked ? "flex-col" : "flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-10"}`}>
      <div className="flex min-w-0 items-center gap-3.5">
        {lead}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h3>
          {note && <p className="mt-1 max-w-[68ch] text-[13px] leading-[1.5] text-white/60">{note}</p>}
        </div>
      </div>
      {children && <div className={stacked ? "w-full" : "flex shrink-0 items-center gap-2"}>{children}</div>}
    </div>
  );
}

const SECTIONS: { id: string; title: string; icon: IconSvgElement }[] = [
  { id: "account", title: "Account", icon: UserIcon },
  { id: "updates", title: "Updates", icon: RefreshIcon },
  { id: "launcher", title: "Launcher", icon: ComputerIcon },
  { id: "network", title: "Network", icon: Globe02Icon },
  { id: "game", title: "Game", icon: GameController01Icon },
  { id: "ai", title: "AI", icon: AiChat02Icon },
  { id: "about", title: "About", icon: InformationCircleIcon },
];

function SettingsSection({ id, children }: { id: string; children: ReactNode }) {
  const meta = SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
  return (
    <section id={`settings-${id}`} data-section={id} aria-label={meta.title} className="scroll-mt-4">
      <div className="hzl-glass rounded-[20px] p-2">{children}</div>
    </section>
  );
}

const ACCENTS = ["#6b4bff", "#2563eb", "#0f766e", "#15803d", "#c2410c", "#dc2626", "#be185d"];
const WIDE_FIELD = "h-11 w-full max-w-[560px] rounded-[12px] bg-white/[0.07] px-4 text-[14px] outline-none transition-colors placeholder:text-white/40 focus:bg-white/[0.11]";
const swatch = (on: boolean) => `relative inline-flex size-9 items-center justify-center rounded-[10px] transition-colors ${on ? "bg-white/[0.18]" : "hover:bg-white/[0.08]"}`;

function AboutTile({ lead, title, note, children }: { lead: ReactNode; title: string; note: string; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-[14px] bg-white/[0.045] p-5">
      {lead}
      <p className="mt-4 text-[15px] font-semibold">{title}</p>
      <p className="mt-0.5 truncate text-[13px] text-white/60">{note}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function SettingsView({ api }: { api: Api }) {
  const { settings, setSettings, prefs, setPrefs, data } = api;
  const [offline, setOffline] = useState("");
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const [active, setActive] = useState("account");
  const validName = /^[A-Za-z0-9_]{3,16}$/.test(offline);
  const custom = !ACCENTS.includes(settings.accent.toLowerCase());

  const pane = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = pane.current;
    const scrollers = [list?.closest("main"), list].filter((el): el is HTMLElement => !!el);
    if (!list) return;
    const onScroll = (e: Event) => {
      const scroller = e.currentTarget as HTMLElement;
      if (scroller.scrollHeight <= scroller.clientHeight) return;
      const nodes = [...list.querySelectorAll<HTMLElement>("[data-section]")];
      if (nodes.length === 0) return;
      const top = scroller.getBoundingClientRect().top;
      const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
      let current = nodes[0].dataset.section ?? "account";
      if (atEnd) current = nodes[nodes.length - 1].dataset.section ?? current;
      else for (const n of nodes) if (n.getBoundingClientRect().top - top <= scroller.clientHeight * 0.3) current = n.dataset.section ?? current;
      setActive(current);
    };
    scrollers.forEach((el) => el.addEventListener("scroll", onScroll, { passive: true }));
    return () => scrollers.forEach((el) => el.removeEventListener("scroll", onScroll));
  }, []);

  const onHex = (value: string) => {
    setHexDraft(value);
    const hex = value.trim().startsWith("#") ? value.trim() : `#${value.trim()}`;
    if (/^#[0-9a-f]{6}$/i.test(hex)) setSettings({ accent: hex.toLowerCase() });
  };

  return (
    <div className="lg:flex lg:h-full lg:flex-col">
      <PageHead title="Settings" note="Accounts, updates, and the launcher itself." />
      <div className="grid gap-3 pb-10 lg:min-h-0 lg:flex-1 lg:grid-cols-[210px_minmax(0,1fr)] lg:pb-0">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="hzl-glass space-y-1 rounded-[20px] p-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={active === s.id ? "true" : undefined}
                  onClick={() => {
                    setActive(s.id);
                    document.getElementById(`settings-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`flex h-10 w-full items-center gap-3 rounded-[12px] px-3 text-left text-[14px] transition-colors ${
                    active === s.id ? "bg-white/[0.12] font-medium text-white" : "text-white/65 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <Icon icon={s.icon} size={17} className={active === s.id ? "text-(--accent-soft)" : ""} />
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div ref={pane} className="min-w-0 space-y-4 lg:min-h-0 lg:overflow-y-auto lg:rounded-[20px] lg:pb-2 lg:[scrollbar-width:none]">
          <SettingsSection id="account">
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-5">
                  <Image
                    src={playerHead(api.profile, 128)}
                    alt=""
                    width={80}
                    height={80}
                    unoptimized
                    className="size-20 shrink-0 rounded-[20px] [image-rendering:pixelated]"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-display text-[32px] leading-none font-semibold tracking-[-0.03em]">{api.profile}</p>
                    <p className="mt-2.5 flex items-center gap-2 text-[14px] text-white/65">
                      <Dot tone="off" />
                      Offline · single player and LAN worlds
                    </p>
                  </div>
                </div>

                <h4 className="mt-8 text-[13px] font-medium text-white/60">Offline names</h4>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {api.profiles.map((p) => {
                    const active = p === api.profile;
                    return (
                      <li key={p} className={`flex h-11 items-center rounded-[12px] transition-colors ${active ? "bg-white/[0.14]" : "bg-white/[0.05] hover:bg-white/[0.08]"}`}>
                        <button type="button" aria-pressed={active} onClick={() => api.setProfile(p)} className="flex h-full items-center gap-2.5 pr-3 pl-1.5 text-[14px] font-medium">
                          <Image src={playerHead(p, 64)} alt="" width={30} height={30} unoptimized className="size-[30px] rounded-[8px] [image-rendering:pixelated]" />
                          {p}
                          {active && <Icon icon={Tick02Icon} size={16} className="text-(--accent-soft)" />}
                        </button>
                        {!active && (
                          <button
                            type="button"
                            aria-label={`Remove ${p}`}
                            onClick={() => api.removeProfile(p)}
                            className="mr-1.5 inline-flex size-7 items-center justify-center rounded-[8px] text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white"
                          >
                            <Icon icon={Cancel01Icon} size={14} />
                          </button>
                        )}
                      </li>
                    );
                  })}
                  <li>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!validName || api.profiles.includes(offline)) return;
                        api.addProfile(offline);
                        setOffline("");
                      }}
                      className="flex h-11 items-center rounded-[12px] bg-white/[0.05] pr-1.5 focus-within:bg-white/[0.08]"
                    >
                      <input
                        value={offline}
                        onChange={(e) => setOffline(e.target.value)}
                        placeholder="Add a name"
                        aria-label="New offline name, 3 to 16 letters"
                        maxLength={16}
                        className="h-full w-[150px] bg-transparent px-3.5 text-[14px] outline-none placeholder:text-white/40"
                      />
                      <button type="submit" disabled={!validName || api.profiles.includes(offline)} className={`${QUIET} h-8 px-3 text-[13px]`}>
                        Add
                      </button>
                    </form>
                  </li>
                </ul>
                <p className="mt-3 text-[13px] leading-[1.5] text-white/50">3 to 16 letters, numbers or underscores. Switch names from the top bar too. Online servers don&apos;t take offline names.</p>
              </div>

              <div className="flex flex-col rounded-[16px] bg-white/[0.045] p-6">
                <MicrosoftLogo className="size-9" />
                <h4 className="mt-5 font-display text-[22px] leading-tight font-semibold tracking-[-0.02em]">Play online with your Microsoft account</h4>
                <p className="mt-2 text-[14px] leading-[1.55] text-white/65">
                  Sign in with the account that owns Minecraft: Java Edition. Your name and skin come along to online servers, like in other launchers.
                </p>
                <button
                  type="button"
                  onClick={() => api.say("Microsoft sign-in is waiting on Mojang's approval")}
                  className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-[12px] bg-white text-[15px] font-semibold text-[#100a1f] transition-opacity hover:opacity-90"
                >
                  <MicrosoftLogo className="size-[18px]" />
                  Sign in with Microsoft
                </button>
                <p className="mt-3 text-[12px] leading-[1.5] text-white/45">Microsoft&apos;s own page opens in your browser. Horizon never sees your password.</p>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection id="updates">
            <SettingRow title="Install new versions automatically" note="Your selected version only changes if you were playing the newest one.">
              <Toggle on={prefs.autoUpdate} onChange={(autoUpdate) => setPrefs({ autoUpdate })} label="Install new versions automatically" />
            </SettingRow>
            <SettingRow title="Delete old versions automatically" note="Keeps the 2 newest, the one in use and the ones your instances use. Deleted versions install again from the Versions page.">
              <Toggle on={prefs.cleanOld} onChange={(cleanOld) => setPrefs({ cleanOld })} label="Delete old versions automatically" />
            </SettingRow>
          </SettingsSection>

          <SettingsSection id="launcher">
            <SettingRow title="Accent colour" note="Colours the buttons, the switches and the sky. Pick one, or type any hex colour.">
              <div className="flex flex-wrap items-center gap-1">
                {ACCENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={settings.accent.toLowerCase() === c}
                    aria-label={`Accent ${c}`}
                    onClick={() => {
                      setHexDraft(null);
                      setSettings({ accent: c });
                    }}
                    className={swatch(settings.accent.toLowerCase() === c)}
                  >
                    <span className="size-6 rounded-[7px]" style={{ background: c }} />
                  </button>
                ))}
                <label className={`${swatch(custom)} cursor-pointer`} title="Any colour">
                  {custom ? <span className="size-6 rounded-[7px]" style={{ background: settings.accent }} /> : <Icon icon={ColorPickerIcon} size={18} className="text-white/70" />}
                  <input
                    type="color"
                    value={settings.accent}
                    onChange={(e) => {
                      setHexDraft(null);
                      setSettings({ accent: e.target.value });
                    }}
                    aria-label="Pick any colour"
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
                <input
                  value={hexDraft ?? settings.accent}
                  onChange={(e) => onHex(e.target.value)}
                  onBlur={() => setHexDraft(null)}
                  spellCheck={false}
                  maxLength={7}
                  aria-label="Accent hex colour"
                  className="ml-1 h-9 w-[96px] rounded-[10px] bg-white/[0.07] px-3 text-[13px] font-medium tabular-nums outline-none transition-colors focus:bg-white/[0.11]"
                />
              </div>
            </SettingRow>
            <SettingRow title="Glass" note="How light the frosted panels and menus are.">
              <Slider label="Glass lightness" value={Math.round(settings.glass * 100)} min={0} max={16} onChange={(v) => setSettings({ glass: v / 100 })} format={(v) => `${v}%`} />
            </SettingRow>
            <SettingRow title="Blur" note="How frosted the panels are.">
              <Slider label="Blur" value={settings.blur} min={0} max={48} onChange={(blur) => setSettings({ blur })} format={(v) => `${v} px`} />
            </SettingRow>
            <SettingRow title="Language" note="System follows your computer's language: English here. A string not translated yet shows in English.">
              <div className="relative">
                <select
                  value={prefs.language}
                  onChange={(e) => setPrefs({ language: e.target.value })}
                  aria-label="Language"
                  className="h-10 appearance-none rounded-[10px] bg-white/[0.07] pr-10 pl-3.5 text-[14px] outline-none transition-colors hover:bg-white/[0.1] [&>option]:bg-[#16102a]"
                >
                  {["System", "English", "Deutsch", "Español", "Français", "Polski", "Türkçe"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                <Icon icon={ArrowDown01Icon} size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-white/55" />
              </div>
            </SettingRow>
            <SettingRow title="While playing" note={prefs.whilePlaying === "stay" ? "The launcher stays open while you play." : "The launcher hides while you play and comes back when the game closes."}>
              <div className="rounded-[12px] bg-white/[0.05] p-1">
                <Tabs
                  label="While playing"
                  size="sm"
                  value={prefs.whilePlaying}
                  onChange={(whilePlaying) => setPrefs({ whilePlaying })}
                  options={[
                    { id: "stay", label: "Stay" },
                    { id: "minimise", label: "Minimise" },
                  ]}
                />
              </div>
            </SettingRow>
            <SettingRow title="Show the opening" note="The wordmark, while the release list loads.">
              <Toggle on={prefs.opening} onChange={(opening) => setPrefs({ opening })} label="Show the opening" />
            </SettingRow>
            <SettingRow title="Reset the launcher's look" note="Accent colour, glass, blur, language and the options above go back to how Horizon ships.">
              <button
                type="button"
                onClick={() => {
                  setHexDraft(null);
                  api.resetLauncher();
                }}
                className={`${QUIET} h-10`}
              >
                <Icon icon={RefreshIcon} size={16} />
                Reset to defaults
              </button>
            </SettingRow>
          </SettingsSection>

          <SettingsSection id="network">
            <SettingRow stacked title="Proxy" note="Downloads, sign-ins and updates go through this HTTP proxy. Empty means none: HTTPS_PROXY is used instead when the launcher was started with one.">
              <input value={prefs.proxy} onChange={(e) => setPrefs({ proxy: e.target.value })} placeholder="For example http://127.0.0.1:7890" aria-label="Proxy" className={WIDE_FIELD} />
            </SettingRow>
          </SettingsSection>

          <SettingsSection id="game">
            <SettingRow stacked title="Game arguments" note="Extra arguments for the game, passed through as-is. Applies the next time the game starts.">
              <input value={prefs.args} onChange={(e) => setPrefs({ args: e.target.value })} placeholder="For example --server-thread" aria-label="Game arguments" className={WIDE_FIELD} />
            </SettingRow>
            <SettingRow title="Native mods" note="Experimental. Builds the native mods you trust into a game of their own.">
              <Toggle on={prefs.native} onChange={(native) => setPrefs({ native })} label="Native mods" />
            </SettingRow>
          </SettingsSection>

          <SettingsSection id="ai">
            <SettingRow title="No AI" note="Hides and turns off every AI feature: agent control of the launcher and the game, horizon-ctl and the MCP servers.">
              <Toggle on={prefs.noAi} onChange={(noAi) => setPrefs({ noAi })} label="No AI" />
            </SettingRow>
          </SettingsSection>

          <SettingsSection id="about">
            <div className="grid gap-2 sm:grid-cols-3">
              <AboutTile lead={<MarkTile size={42} />} title="Horizon" note={data.nightlies[0]?.title ?? "Nightly"}>
                <p className="flex items-center gap-2 text-[13px] text-(--live)">
                  <Dot tone="live" />
                  Up to date
                </p>
              </AboutTile>
              <AboutTile
                lead={
                  <span className="inline-flex size-[42px] items-center justify-center rounded-[11px] bg-white/[0.08] text-white/80">
                    <Icon icon={ComputerIcon} size={21} />
                  </span>
                }
                title="Launcher"
                note={`${data.launcherVersion} · up to date`}
              >
                <button type="button" onClick={() => api.say(`Launcher ${data.launcherVersion} is the newest`)} className={`${QUIET} h-9`}>
                  Check now
                </button>
              </AboutTile>
              <AboutTile
                lead={
                  <span className="inline-flex size-[42px] items-center justify-center rounded-[11px] bg-white/[0.08] text-white/80">
                    <Icon icon={Folder01Icon} size={21} />
                  </span>
                }
                title="Data folder"
                note="~/.local/share/horizon-launcher"
              >
                <button type="button" onClick={() => api.say("Opened ~/.local/share/horizon-launcher")} className={`${QUIET} h-9`}>
                  Open
                </button>
              </AboutTile>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
