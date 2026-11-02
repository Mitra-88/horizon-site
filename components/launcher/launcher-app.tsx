"use client";

import {
  ArrowDown01Icon,
  Copy01Icon,
  Delete02Icon,
  FavouriteIcon,
  Folder01Icon,
  Globe02Icon,
  Link01Icon,
  MoreVerticalIcon,
  PencilEdit02Icon,
  PlusSignIcon,
  Search01Icon,
  SlidersHorizontalIcon,
  Tick02Icon,
  Upload04Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { HorizonScene } from "@/components/horizon-scene";
import { DiscordIcon as DiscordLogo } from "@/components/icons";
import {
  BOOT_LINES,
  CHATTER,
  GAME_FOLDER,
  LOADERS,
  NAV,
  PLAYER,
  playerHead,
  SEED_SERVERS,
  type Edition,
  seedInstances,
  type Instance,
  type LauncherData,
  type Server,
  type View,
} from "@/components/launcher/launcher-data";
import { InstanceModal, iconFields, type Draft } from "@/components/launcher/instance-modal";
import { ServerModal } from "@/components/launcher/server-modal";
import { Bar, Dot, Icon, ICON_BUTTON, Mark, MicrosoftLogo, POPOVER, SOLID, Tabs } from "@/components/launcher/launcher-ui";
import {
  HomeView,
  InstanceIcon,
  ModsView,
  NotesView,
  ServersView,
  SettingsView,
  VersionsView,
  type Api,
  TASK_LABEL,
  type Launch,
  type Prefs,
  type Settings,
  type Task,
  type TaskKind,
} from "@/components/launcher/launcher-views";
import { DISCORD_URL, SPONSOR_URL } from "@/components/links";

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [16, 8, 0].map((shift) => {
    const v = ((n >> shift) & 255) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const DEFAULT_SETTINGS: Settings = { glass: 0.06, blur: 24, accent: "#6b4bff" };
const LAUNCHER_PREFS: Partial<Prefs> = { language: "System", whilePlaying: "stay", opening: true };
const MENU_ROW = "flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[14px] transition-colors hover:bg-white/[0.07] disabled:pointer-events-none disabled:opacity-40";
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "instance";
const SIDE_LINK = "flex h-9 items-center gap-2.5 rounded-[12px] px-2 text-[14px] text-white/75 transition-colors hover:bg-white/[0.05] hover:text-white";
const stampFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const stamp = () => stampFormat.format(Date.now());

function gameScript(instance: Instance, world: string | null, data: LauncherData) {
  if (instance.edition === "java") {
    return [
      { at: 0, line: `[launcher] Minecraft ${instance.java} · Java 25 (Mojang runtime) · -Xmx4G` },
      { at: 0.1, line: "[launcher] checking 4,213 libraries and assets" },
      { at: 0.3, line: "[launcher] every file matches Mojang's hashes" },
      { at: 0.45, line: `[Render thread/INFO]: Setting user: ${PLAYER}` },
      { at: 0.58, line: "[Render thread/INFO]: Backend library: LWJGL version 3.3.6" },
      { at: 0.7, line: "[Render thread/INFO]: Reloading ResourceManager: vanilla" },
      { at: 0.84, line: "[Render thread/INFO]: Sound engine started" },
      { at: 1, line: world ? `[Server thread/INFO]: ${PLAYER} joined the game` : "[Render thread/INFO]: Title screen ready" },
    ];
  }
  const nightly = data.nightlies.find((n) => n.id === instance.version) ?? data.nightlies[0];
  const mods = instance.mods.map((id) => {
    const mod = data.mods.find((m) => m.id === id);
    return mod ? `${id} ${mod.version}` : id;
  });
  return [
    { at: 0, line: `INFO horizon: ${nightly?.title ?? "Horizon"}` },
    { at: 0.06, line: "INFO horizon::gpu: Vulkan 1.3.296 · AMD Radeon RX 7800 XT (RADV NAVI32)" },
    { at: 0.12, line: "INFO horizon::files: checking the prepared 26.3 files" },
    { at: 0.3, line: "INFO horizon::files: 4,812 textures and 1,906 models ready in 0.41 s" },
    { at: 0.44, line: mods.length ? `INFO horizon::mods: ${mods.length} loaded: ${mods.join(", ")}` : "INFO horizon::mods: none, playing vanilla" },
    { at: 0.58, line: "INFO horizon::audio: PipeWire · 48 kHz stereo" },
    { at: 0.72, line: "INFO horizon::window: Wayland · 2560x1440 at 165 Hz · borderless" },
    { at: 0.86, line: world ? `INFO horizon::world: loading "${world}"` : "INFO horizon::ui: title screen" },
    { at: 1, line: world ? `INFO horizon::world: joined "${world}" in 0.86 s` : "INFO horizon::ui: ready in 0.31 s" },
  ];
}

function reply(server: Server, command: string) {
  const [head, ...rest] = command.replace(/^\//, "").split(/\s+/);
  switch (head) {
    case "list":
      return `There are ${server.players.length} of a max of ${server.max} players online: ${server.players.join(", ")}`;
    case "say":
      return `[Server] ${rest.join(" ")}`;
    case "time":
      return rest[0] === "set" ? `Set the time to ${rest[1] === "night" ? 13000 : rest[1] === "day" ? 1000 : (rest[1] ?? 0)}` : "Unknown or incomplete command";
    case "weather":
      return `Set the weather to ${rest[0] ?? "clear"}`;
    case "op":
      return rest[0] ? `Made ${rest[0]} a server operator` : "Unknown or incomplete command";
    case "save-all":
      return "Saved the game";
    case "help":
      return "list, say, time set, weather, op, save-all";
    default:
      return `Unknown or incomplete command: ${head}`;
  }
}

type Command = { id: string; label: string; hint: string; run: () => void };

function Palette({ build, onClose }: { build: (query: string) => Command[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const q = query.trim().toLowerCase();
  const list = build(q)
    .filter((c) => !q || c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q))
    .slice(0, 8);
  const run = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    c.run();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(list.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(list[index]);
    }
  };
  return (
    <div className="fixed inset-0 z-30 bg-[#07050f]/50 backdrop-blur-xl" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search the launcher"
        onMouseDown={(e) => e.stopPropagation()}
        className="hzl-glass rounded-[20px] hzl-pop mx-auto mt-[14vh] w-[min(560px,calc(100%-32px))] p-2"
      >
        <label className="flex h-12 items-center gap-3 px-3 text-white/55">
          <Icon icon={Search01Icon} />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={onKey}
            placeholder="Play, install a mod, open a page"
            aria-label="Search"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none"
          />
          <span className="text-[12px] text-white/40">Esc</span>
        </label>
        <ul className="max-h-[50vh] overflow-y-auto pt-1">
          {list.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => run(c)}
                className={`rounded-[12px] flex h-11 w-full items-center justify-between gap-4 px-3 text-left text-[14px] ${i === index ? "bg-white/[0.1]" : ""}`}
              >
                <span className="truncate">{c.label}</span>
                <span className="shrink-0 text-[13px] text-white/50">{c.hint}</span>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="px-3 py-4 text-[14px] text-white/60">Nothing matches &ldquo;{query}&rdquo;.</li>}
        </ul>
      </div>
    </div>
  );
}

export function LauncherApp({ data }: { data: LauncherData }) {
  const [view, setView] = useState<View>("home");
  const [instances, setInstances] = useState<Instance[]>(() => seedInstances(data.nightlies));
  const [selected, setSelected] = useState("horizon");
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [task, setTask] = useState<Task | null>(null);
  const [selfUpdate, setSelfUpdate] = useState(0.02);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [profiles, setProfiles] = useState<string[]>([PLAYER, "pixelmoth"]);
  const [profile, setProfile] = useState(PLAYER);
  const [profileMenu, setProfileMenu] = useState(false);
  const [serverModal, setServerModal] = useState(false);
  const [prefs, setPrefsState] = useState<Prefs>({
    autoUpdate: true,
    cleanOld: true,
    native: true,
    noAi: false,
    opening: true,
    whilePlaying: "stay",
    language: "System",
    proxy: "",
    args: "",
  });
  const [message, setMessage] = useState<{ id: number; text: string } | null>(null);
  const [palette, setPalette] = useState(false);
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; id: string } | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number; confirm: boolean } | null>(null);
  const [servers, setServers] = useState<Server[]>(SEED_SERVERS);
  const [serverId, setServerId] = useState(SEED_SERVERS[0].id);
  const [installed, setInstalled] = useState<string[]>(() => [...new Set(seedInstances(data.nightlies).map((i) => i.version))]);
  const [installing, setInstalling] = useState<string | null>(null);
  const [hideShots, setHideShots] = useState(false);

  const instance = instances.find((i) => i.id === selected) ?? instances[0];
  const newest = data.nightlies[0];

  const say = useCallback((text: string) => setMessage({ id: Date.now(), text }), []);
  const setSettings = (patch: Partial<Settings>) => setSettingsState((s) => ({ ...s, ...patch }));
  const setPrefs = (patch: Partial<Prefs>) => setPrefsState((p) => ({ ...p, ...patch }));

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), 4200);
    return () => window.clearTimeout(id);
  }, [message]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setModal(null);
        setMenu(null);
        setPalette((open) => !open);
      } else if (e.key === "Escape") {
        setPalette(false);
        setModal(null);
        setMenu(null);
        setProfileMenu(false);
        setServerModal(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selfDone = selfUpdate >= 1;
  useEffect(() => {
    if (selfDone) return;
    const id = window.setInterval(() => {
      const step = 0.004 + Math.random() * 0.01;
      setSelfUpdate((p) => Math.min(1, p + step));
    }, 400);
    return () => window.clearInterval(id);
  }, [selfDone]);

  const phase = launch?.phase;
  const launchKey = launch?.key;
  useEffect(() => {
    if (!phase || phase === "running") return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setLaunch((prev) => {
        if (!prev || prev.phase === "running") return prev;
        const progress = Math.min(1, prev.progress + 0.021);
        if (progress >= 1) return { ...prev, progress: 1, phase: "running", startedAt: now };
        return { ...prev, progress, phase: progress < 0.36 ? "checking" : "starting" };
      });
    }, 70);
    return () => window.clearInterval(id);
  }, [phase, launchKey]);

  const startedAt = launch?.phase === "running" ? launch.startedAt : null;
  useEffect(() => {
    if (startedAt === null) return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const taskKey = task ? `${task.instanceId}:${task.kind}` : null;
  useEffect(() => {
    if (!taskKey) return;
    const id = window.setInterval(() => {
      setTask((prev) => (!prev || prev.progress >= 1 ? prev : { ...prev, progress: Math.min(1, prev.progress + 0.025) }));
    }, 60);
    return () => window.clearInterval(id);
  }, [taskKey]);

  const taskDone = task !== null && task.progress >= 1;
  useEffect(() => {
    if (!taskDone || !task) return;
    const finished = task;
    const id = window.setTimeout(() => {
      if (finished.kind === "update" && newest) {
        setInstances((list) => list.map((i) => (i.id === finished.instanceId ? { ...i, version: newest.id } : i)));
        setInstalled((list) => (list.includes(newest.id) ? list : [...list, newest.id]));
        say(`Updated to ${newest.title}. Your worlds stay where they are.`);
      } else if (finished.kind === "prepare") {
        say("Prepared for Minecraft 26.3 · 4,812 textures and 1,906 models");
      } else {
        say("Every Minecraft file matches Mojang's hashes");
      }
      setTask(null);
    }, 250);
    return () => window.clearTimeout(id);
  }, [taskDone, task, newest, say]);

  const anyRunning = servers.some((s) => s.state === "running");
  useEffect(() => {
    if (!anyRunning) return;
    const id = window.setInterval(() => {
      const at = stamp();
      const jitter = Math.random();
      setServers((list) =>
        list.map((s) =>
          s.state !== "running"
            ? s
            : {
                ...s,
                up: s.up + 4,
                tps: jitter > 0.85 ? 19.9 : 20,
                mspt: 0.5 + Math.round(jitter * 4) / 10,
                ram: Math.round((0.55 + jitter * 0.06) * 100) / 100,
                chatter: s.chatter + 1,
                console: s.players.length ? [...s.console, `[${at} INFO] ${CHATTER[s.chatter % CHATTER.length]}`].slice(-200) : s.console,
              },
        ),
      );
    }, 4000);
    return () => window.clearInterval(id);
  }, [anyRunning]);

  const start = (target: Instance, world: string | null) => {
    setSelected(target.id);
    setView("home");
    setElapsed(0);
    setLaunch({ key: Date.now(), instanceId: target.id, world, phase: "checking", progress: 0, startedAt: 0, script: gameScript(target, world, data) });
  };

  const stop = () => {
    if (!launch) return;
    const name = instances.find((i) => i.id === launch.instanceId)?.name ?? "Horizon";
    setLaunch(null);
    say(`${name} closed after ${elapsed < 60 ? `${elapsed} s` : `${Math.floor(elapsed / 60)} min`}`);
  };

  const switchProfile = (name: string) => {
    setProfile(name);
    say(`Playing as ${name}`);
  };

  const patchInstance = (patch: (i: Instance) => Instance) => setInstances((list) => list.map((i) => (i.id === instance.id ? patch(i) : i)));

  const toggleMod = (id: string) => {
    const mod = data.mods.find((m) => m.id === id);
    const on = instance.mods.includes(id);
    patchInstance((i) => ({ ...i, mods: on ? i.mods.filter((m) => m !== id) : [...i.mods, id] }));
    say(on ? `Removed ${mod?.name ?? id} from ${instance.name}` : `Installed ${mod?.name ?? id} ${mod?.version ?? ""} in ${instance.name}`);
  };

  const togglePack = (name: string) => patchInstance((i) => ({ ...i, packs: i.packs.map((p) => (p.name === name ? { ...p, on: !p.on } : p)) }));

  const setVersion = (id: string) => {
    patchInstance((i) => ({ ...i, version: id }));
    if (!installed.includes(id)) setInstalled((list) => [...list, id]);
    say(`${instance.name} now plays ${data.nightlies.find((n) => n.id === id)?.title ?? id}`);
  };

  const patchServer = (id: string, patch: (s: Server) => Server) => setServers((list) => list.map((s) => (s.id === id ? patch(s) : s)));

  const bootServer = (id: string, delay: number) =>
    window.setTimeout(() => {
      const at = stamp();
      patchServer(id, (s) => ({ ...s, state: "running", up: 0, console: [...s.console, ...BOOT_LINES(at, s.world)].slice(-200) }));
    }, delay);

  const api: Api = {
    data,
    instances,
    instance,
    launch,
    elapsed,
    play: (world) => start(instance, world ?? null),
    stop,
    toggleMod,
    togglePack,
    setVersion,
    setJava: (id) => {
      patchInstance((i) => ({ ...i, java: id }));
      say(`${instance.name} now plays Minecraft ${id}`);
    },
    setEdition: (edition: Edition) => patchInstance((i) => ({ ...i, edition })),
    task,
    hideShots,
    setHideShots,
    startTask: (kind: TaskKind) => setTask({ instanceId: instance.id, kind, progress: 0 }),
    go: setView,
    say,
    settings,
    setSettings,
    prefs,
    setPrefs,
    resetLauncher: () => {
      setSettingsState(DEFAULT_SETTINGS);
      setPrefs(LAUNCHER_PREFS);
      say("Launcher settings are back to their defaults");
    },
    profile,
    profiles,
    setProfile: switchProfile,
    addProfile: (name) => {
      setProfiles((list) => [...list, name]);
      setProfile(name);
      say(`Added ${name} and switched to it`);
    },
    removeProfile: (name) => {
      setProfiles((list) => list.filter((p) => p !== name));
      say(`Removed ${name}`);
    },
    servers,
    serverId,
    setServerId,
    startServer: (id) => {
      patchServer(id, (s) => ({ ...s, state: "starting" }));
      bootServer(id, 1800);
    },
    stopServer: (id) => {
      const at = stamp();
      patchServer(id, (s) => ({ ...s, state: "stopped", console: [...s.console, `[${at} INFO] Stopping the server`, `[${at} INFO] Saving worlds`, `[${at} INFO] Stopped`] }));
    },
    restartServer: (id) => {
      const at = stamp();
      patchServer(id, (s) => ({ ...s, state: "starting", console: [...s.console, `[${at} INFO] Restarting`] }));
      bootServer(id, 2200);
    },
    runCommand: (id, command) => {
      const at = stamp();
      patchServer(id, (s) => ({ ...s, console: [...s.console, `> ${command}`, `[${at} INFO] ${reply(s, command)}`].slice(-200) }));
    },
    addServer: () => setServerModal(true),
    installed,
    installing,
    installVersion: (id) => {
      setInstalling(id);
      window.setTimeout(() => {
        setInstalled((list) => [...list, id]);
        setInstalling(null);
        say(`Installed ${data.nightlies.find((n) => n.id === id)?.title ?? id}`);
      }, 1400);
    },
    removeVersion: (id) => {
      setInstalled((list) => list.filter((v) => v !== id));
      say(`Removed ${data.nightlies.find((n) => n.id === id)?.title ?? id}. Your worlds stay where they are.`);
    },
  };

  const buildCommands = (q: string): Command[] => [
    ...instances.map((i) => ({ id: `play-${i.id}`, label: `Play ${i.name}`, hint: "Instance", run: () => start(i, null) })),
    ...NAV.map((v) => ({ id: `go-${v.id}`, label: `Open ${v.label}`, hint: "Page", run: () => setView(v.id) })),
    { id: "go-settings", label: "Open Settings", hint: "Page", run: () => setView("settings") },
    { id: "new", label: "New instance", hint: "Instance", run: () => setModal({ mode: "create" }) },
    { id: "folder", label: "Open the game folder", hint: GAME_FOLDER, run: () => say(`Opened ${GAME_FOLDER}`) },
    ...(q.length >= 2
      ? data.mods
          .filter((m) => m.name.toLowerCase().includes(q))
          .slice(0, 4)
          .map((m) => ({
            id: `mod-${m.id}`,
            label: `${instance.mods.includes(m.id) ? "Remove" : "Install"} ${m.name}`,
            hint: `Mod · ${instance.name}`,
            run: () => toggleMod(m.id),
          }))
      : []),
  ];

  const groupNames = [...new Set(instances.map((i) => i.group).filter((g): g is string => !!g))];
  const sections = [{ name: "", items: instances.filter((i) => !i.group) }, ...groupNames.map((g) => ({ name: g, items: instances.filter((i) => i.group === g) }))];
  const menuTarget = menu ? instances.find((i) => i.id === menu.id) : undefined;

  const saveDraft = (draft: Draft) => {
    const loader = draft.kind === "modded" ? LOADERS.find((l) => l.id === draft.loader)?.name : undefined;
    const fields = {
      name: draft.name,
      group: draft.group.trim() || undefined,
      edition: draft.kind === "horizon" ? ("rust" as const) : ("java" as const),
      java: draft.kind === "horizon" ? "26.3" : draft.mc,
      loader,
      ...iconFields(draft.icon),
    };
    if (draft.kind === "horizon") setInstalled((list) => (list.includes(draft.nightly) ? list : [...list, draft.nightly]));
    if (modal?.mode === "edit") {
      const id = modal.id;
      setInstances((list) => list.map((i) => (i.id === id ? { ...i, ...fields, version: draft.kind === "horizon" ? draft.nightly : i.version } : i)));
      say(`Saved ${draft.name}`);
    } else {
      const base = draft.kind === "horizon" && draft.start === "copy" ? instance : null;
      const created: Instance = {
        id: `instance-${Date.now()}`,
        version: draft.kind === "horizon" ? draft.nightly : (newest?.id ?? instance.version),
        mods: base ? [...base.mods] : [],
        played: "",
        last: "",
        worlds: base ? [...base.worlds] : [],
        servers: base ? [...base.servers] : [],
        packs: base ? [...base.packs] : [],
        shots: [],
        ...fields,
      };
      setInstances((list) => [...list, created]);
      setSelected(created.id);
      setView("home");
      say(`Created ${draft.name}`);
    }
    setModal(null);
  };

  const duplicateInstance = (id: string) => {
    const source = instances.find((i) => i.id === id);
    if (!source) return;
    const copy: Instance = { ...source, id: `${source.id}-${Date.now()}`, name: `${source.name} copy`, played: "", last: "", shots: [], mark: source.mark };
    setInstances((list) => {
      const at = list.findIndex((i) => i.id === id);
      return [...list.slice(0, at + 1), copy, ...list.slice(at + 1)];
    });
    setSelected(copy.id);
    say(`Duplicated ${source.name}, mods and worlds included`);
  };

  const removeInstance = (id: string) => {
    const gone = instances.find((i) => i.id === id);
    const left = instances.filter((i) => i.id !== id);
    if (!gone || left.length === 0) return;
    setInstances(left);
    if (selected === id) setSelected(left[0].id);
    if (launch?.instanceId === id) setLaunch(null);
    say(`Deleted ${gone.name}`);
  };

  const statusOf = (i: Instance) => {
    if (launch?.instanceId === i.id) return launch.phase === "running" ? { tone: "live" as const, text: "Running" } : { tone: "busy" as const, text: "Starting" };
    if (task?.instanceId === i.id) return { tone: "busy" as const, text: TASK_LABEL[task.kind] };
    if (i.edition === "java") return { tone: "live" as const, text: i.loader ? `${i.loader} · Java ${i.java}` : `Java Edition ${i.java}` };
    if (newest && i.version !== newest.id) return { tone: "accent" as const, text: "Update available" };
    return i.played ? { tone: "live" as const, text: "Ready" } : { tone: "off" as const, text: "Not played yet" };
  };

  const style = {
    "--tint": settings.glass,
    "--blur": `${settings.blur}px`,
    "--accent": settings.accent,
    "--on-accent": luminance(settings.accent) > 0.4 ? "#100a1f" : "#ffffff",
  } as CSSProperties;

  return (
    <div style={style} className="hzl fixed inset-0 z-[100] flex bg-[#0a0919]">
      <div aria-hidden className="fixed inset-0 isolate">
        <HorizonScene className="absolute inset-0" wideSun={{ x: 0.72, scale: 1.1, rise: 0.1 }} />
        <div
          className="absolute inset-0 transition-[opacity,background-color] duration-700"
          style={{
            background: `color-mix(in oklab, ${settings.accent} 58%, #767676)`,
            mixBlendMode: "color",
            opacity: settings.accent.toLowerCase() === DEFAULT_SETTINGS.accent ? 0 : 1,
          }}
        />
      </div>

      <aside className="hzl-glass relative my-3.5 ml-3.5 hidden w-[248px] shrink-0 flex-col overflow-hidden rounded-[20px] lg:flex">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-[13px] font-medium text-white/60">Instances</span>
          <button type="button" aria-label="New instance" title="New instance" onClick={() => setModal({ mode: "create" })} className={`${ICON_BUTTON} size-7`}>
            <Icon icon={PlusSignIcon} size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2.5">
          {sections.map(
            (section) =>
              section.items.length > 0 && (
                <div key={section.name || "ungrouped"}>
                  {section.name && <p className="px-2 pt-4 pb-1.5 text-[12px] font-medium text-white/45">{section.name}</p>}
                  <ul className="space-y-1">
                    {section.items.map((i) => {
                      const s = statusOf(i);
                      const open = menu?.id === i.id;
                      return (
                        <li key={i.id} className="relative">
                          <button
                            type="button"
                            aria-current={i.id === instance.id ? "true" : undefined}
                            onClick={() => {
                              setSelected(i.id);
                              setView("home");
                            }}
                            className={`flex w-full items-center gap-3 rounded-[12px] p-2 pr-10 text-left transition-colors ${i.id === instance.id ? "bg-white/[0.1]" : "hover:bg-white/[0.05]"}`}
                          >
                            <InstanceIcon instance={i} size={38} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-semibold">{i.name}</span>
                              <span className="flex items-center gap-1.5 truncate text-[12.5px] text-white/65">
                                <Dot tone={s.tone} />
                                {s.text}
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Options for ${i.name}`}
                            aria-haspopup="menu"
                            aria-expanded={open}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenu(open ? null : { id: i.id, x: rect.right + 12, y: Math.min(rect.top - 8, window.innerHeight - 330), confirm: false });
                            }}
                            className={`absolute top-1/2 right-1.5 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-[9px] transition-colors hover:bg-white/[0.1] hover:text-white ${
                              open ? "bg-white/[0.1] text-white" : "text-white/45"
                            }`}
                          >
                            <Icon icon={MoreVerticalIcon} size={18} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ),
          )}
        </div>
        <div className="px-2.5 pt-4 pb-3">
          <div className="rounded-[12px] bg-white/[0.07] p-3.5">
            <p className="flex items-baseline justify-between text-[14px] font-semibold">
              Launcher {data.launcherVersion}
              {!selfDone && <span className="text-[13px] font-normal text-white/60 tabular-nums">{Math.round(selfUpdate * 100)}%</span>}
            </p>
            {selfDone ? (
              <button type="button" onClick={() => say(`Restarted into launcher ${data.launcherVersion}`)} className={`${SOLID} mt-3 h-8 w-full text-[13px]`}>
                Restart to update
              </button>
            ) : (
              <Bar value={selfUpdate} className="mt-2.5" />
            )}
          </div>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex h-10 items-center justify-center gap-2.5 rounded-[12px] bg-[#5865f2] text-[14px] font-semibold text-white transition-colors hover:bg-[#4752c4]"
          >
            <DiscordLogo className="size-[18px]" />
            Join the Discord
          </a>
          <nav aria-label="Links" className="mt-2 flex flex-col">
            <a href={SPONSOR_URL} target="_blank" rel="noreferrer" className={SIDE_LINK}>
              <Icon icon={FavouriteIcon} size={17} />
              Sponsor
            </a>
            <Link href="/" className={SIDE_LINK}>
              <Icon icon={Globe02Icon} size={17} />
              Website
            </Link>
          </nav>
          <p className="px-2 pt-2 text-[12px] text-white/45">Launcher {data.currentLauncher}</p>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 px-4 pt-3.5 sm:px-6 lg:px-8">
          <Mark className="size-6 shrink-0 lg:hidden" />
          <div className="hzl-glass min-w-0 rounded-[14px] p-1 xl:shrink-0">
            <Tabs
              label="Launcher"
              value={view}
              onChange={setView}
              options={NAV.map((n) => ({ id: n.id, label: n.label }))}
            />
          </div>
          <p aria-live="polite" className="hidden min-w-0 flex-1 truncate pl-4 text-right text-[13px] text-white/70 xl:block">
            {message?.text}
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 xl:ml-2">
            <div className="relative hidden sm:block">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={profileMenu}
                onClick={() => setProfileMenu((o) => !o)}
                className={`flex h-11 items-center gap-2.5 rounded-[12px] pr-3 pl-2 backdrop-blur-xl transition-colors ${profileMenu ? "bg-white/[0.12]" : "bg-white/[0.06] hover:bg-white/[0.09]"}`}
              >
                <Image src={playerHead(profile)} alt="" width={26} height={26} unoptimized className="size-[26px] rounded-[7px] [image-rendering:pixelated]" />
                <span className="text-left leading-tight">
                  <span className="block text-[14px] font-semibold">{profile}</span>
                  <span className="block text-[12px] text-white/55">Offline</span>
                </span>
                <Icon icon={ArrowDown01Icon} size={16} className={`ml-1 text-white/50 transition-transform ${profileMenu ? "rotate-180" : ""}`} />
              </button>
              {profileMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileMenu(false)} />
                  <ul role="menu" aria-label="Switch player" className={`${POPOVER} absolute top-full right-0 z-20 mt-2 w-[250px]`}>
                    {profiles.map((p) => (
                      <li key={p}>
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={p === profile}
                          onClick={() => {
                            setProfileMenu(false);
                            switchProfile(p);
                          }}
                          className="flex h-12 w-full items-center gap-3 rounded-[10px] px-2.5 text-left transition-colors hover:bg-white/[0.07]"
                        >
                          <Image src={playerHead(p)} alt="" width={30} height={30} unoptimized className="size-[30px] rounded-[8px] [image-rendering:pixelated]" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium">{p}</span>
                            <span className="block text-[12px] text-white/50">Offline</span>
                          </span>
                          {p === profile && <Icon icon={Tick02Icon} size={16} className="text-(--accent-soft)" />}
                        </button>
                      </li>
                    ))}
                    <li className="mt-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setProfileMenu(false);
                          setView("settings");
                        }}
                        className={MENU_ROW}
                      >
                        <Icon icon={UserIcon} size={17} className="text-white/60" />
                        Manage accounts
                      </button>
                    </li>
                  </ul>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => say("Microsoft sign-in is waiting on Mojang's approval")}
              className="hidden h-11 items-center gap-2.5 rounded-[12px] bg-white/[0.08] px-4 text-[14px] font-medium transition-colors hover:bg-white/[0.14] md:inline-flex"
            >
              <MicrosoftLogo className="size-4" />
              Sign in with Microsoft
            </button>
            <button
              type="button"
              aria-label="Settings"
              aria-pressed={view === "settings"}
              title="Settings"
              onClick={() => setView(view === "settings" ? "home" : "settings")}
              className={`${ICON_BUTTON} size-10 ${view === "settings" ? "bg-white/[0.12] text-white" : ""}`}
            >
              <Icon icon={SlidersHorizontalIcon} size={19} />
            </button>
          </div>
        </header>

        <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 sm:px-6 lg:hidden">
          {instances.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => {
                setSelected(i.id);
                setView("home");
              }}
              className={`rounded-[12px] flex shrink-0 items-center gap-2 py-1.5 pr-3.5 pl-1.5 text-[13px] font-medium backdrop-blur-md ${i.id === instance.id ? "bg-white/[0.16]" : "bg-[#100a1f]/70 text-white/75"}`}
            >
              <InstanceIcon instance={i} size={26} />
              {i.name}
            </button>
          ))}
        </div>

        <main className={`min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 ${view === "settings" ? "pb-24 lg:pb-3.5" : "pb-24"}`}>
          {view === "home" && <HomeView api={api} />}
          {view === "mods" && <ModsView api={api} />}
          {view === "servers" && <ServersView api={api} />}
          {view === "versions" && <VersionsView api={api} />}
          {view === "notes" && <NotesView api={api} />}
          {view === "settings" && <SettingsView api={api} />}
        </main>
      </div>

      {message && (
        <p role="status" className="hzl-float rounded-[20px] hzl-pop fixed inset-x-4 bottom-4 z-20 px-4 py-3 text-[13px] xl:hidden">
          {message.text}
        </p>
      )}

      {palette && <Palette build={buildCommands} onClose={() => setPalette(false)} />}
      {menu && menuTarget && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenu(null)} />
          <ul role="menu" aria-label={`${menuTarget.name} options`} className={`${POPOVER} fixed z-40 w-[250px]`} style={{ left: menu.x, top: Math.max(8, menu.y) }}>
            {[
              { id: "edit", label: "Edit…", icon: PencilEdit02Icon, run: () => setModal({ mode: "edit", id: menuTarget.id }) },
              { id: "duplicate", label: "Duplicate", icon: Copy01Icon, run: () => duplicateInstance(menuTarget.id) },
              { id: "folder", label: "Open folder", icon: Folder01Icon, run: () => say(`Opened ${GAME_FOLDER}/instances/${menuTarget.id}`) },
              { id: "export", label: "Export…", icon: Upload04Icon, run: () => say(`Exported ${menuTarget.name} as ${slug(menuTarget.name)}.mrpack`) },
              { id: "shortcut", label: "Create a desktop shortcut", icon: Link01Icon, run: () => say(`Created a shortcut for ${menuTarget.name} on the desktop`) },
            ].map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(null);
                    item.run();
                  }}
                  className={MENU_ROW}
                >
                  <Icon icon={item.icon} size={17} className="text-white/60" />
                  {item.label}
                </button>
              </li>
            ))}
            <li className="mt-1">
              <button
                type="button"
                role="menuitem"
                disabled={instances.length < 2}
                onClick={() => {
                  if (!menu.confirm) return setMenu({ ...menu, confirm: true });
                  setMenu(null);
                  removeInstance(menuTarget.id);
                }}
                className={`${MENU_ROW} text-[#ff8a8a] hover:bg-[#ff6b6b]/12`}
              >
                <Icon icon={Delete02Icon} size={17} />
                {menu.confirm ? "Click again to delete" : "Delete…"}
              </button>
            </li>
          </ul>
        </>
      )}

      {serverModal && (
        <ServerModal
          player={profile}
          instances={instances}
          say={say}
          onClose={() => setServerModal(false)}
          onCreate={(draft) => {
            const id = `server-${draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${servers.length + 1}`;
            setServers((list) => [
              ...list,
              {
                id,
                name: draft.name,
                mode: draft.mode,
                world: draft.world.kind === "copy" ? draft.world.name : "New world",
                state: "stopped",
                players: [],
                max: draft.max,
                up: 0,
                tps: 20,
                mspt: 0.4,
                ram: 0.48,
                chatter: 0,
                console: [],
              },
            ]);
            setServerId(id);
            setServerModal(false);
            say(`Created ${draft.name}: ${draft.mode.toLowerCase()}, ${draft.difficulty.toLowerCase()}, ${draft.access === "friends" ? "friends only" : "open to anyone with the address"}`);
          }}
        />
      )}

      {modal && (
        <InstanceModal
          data={data}
          editing={modal.mode === "edit" ? (instances.find((i) => i.id === modal.id) ?? null) : null}
          selected={instance}
          groups={groupNames}
          say={say}
          onClose={() => setModal(null)}
          onSave={saveDraft}
        />
      )}
    </div>
  );
}
