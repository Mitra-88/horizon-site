export type Change = { section: string; text: string };
export type Nightly = { id: string; title: string; date: string; build: string; published: string; url: string; changes: Change[]; total: number };
export type Note = { version: string; published: string; items: string[]; url: string };
export type ModEntry = {
  id: string;
  kind: string;
  name: string;
  summary: string;
  authors: string[];
  downloads: number;
  icon?: string;
  version: string;
  license: string;
  capabilities: string[];
};
export type LauncherData = { launcherVersion: string; currentLauncher: string; nightlies: Nightly[]; notes: Note[]; mods: ModEntry[] };

export type World = { name: string; mode: string; last: string; size: string };
export type SavedServer = { name: string; address: string; players: string };
export type Pack = { name: string; on: boolean };
export type Shot = { src: string; name: string };
export type Edition = "rust" | "java";
export type Logo = { src: string; invert?: boolean; pixel?: boolean; bare?: boolean };
export type Instance = {
  id: string;
  name: string;
  mark: boolean;
  logo?: Logo;
  color?: string;
  group?: string;
  loader?: string;
  edition: Edition;
  version: string;
  java: string;
  mods: string[];
  played: string;
  last: string;
  worlds: World[];
  servers: SavedServer[];
  packs: Pack[];
  shots: Shot[];
};

export type View = "home" | "mods" | "servers" | "versions" | "notes" | "settings";
export const NAV: { id: View; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "mods", label: "Mods" },
  { id: "servers", label: "Servers" },
  { id: "versions", label: "Versions" },
  { id: "notes", label: "Patch notes" },
];

export const GAME_FOLDER = "~/.local/share/horizon";

export const LOGOS: Record<string, Logo> = {
  grass: { src: "/media/launcher/grass-block.webp", bare: true },
  java: { src: "/media/launcher/minecraft-java.webp" },
  neoforge: { src: "/media/launcher/neoforge.webp", pixel: true },
  fabric: { src: "/media/launcher/fabric.webp", pixel: true },
  quilt: { src: "/media/launcher/quilt.webp", pixel: true },
  forge: { src: "/media/launcher/forge.webp" },
};

export const ICON_COLORS = ["#6b4bff", "#3b82f6", "#14b8a6", "#22c55e", "#eab308", "#f97316", "#ef4444", "#8b8a99"];

export type McVersion = { id: string; kind: "release" | "snapshot" | "old"; date: string };
export const MC_VERSIONS: McVersion[] = [
  { id: "26.4 snapshot 3", kind: "snapshot", date: "2026-10-28" },
  { id: "26.4 snapshot 2", kind: "snapshot", date: "2026-10-21" },
  { id: "26.4 snapshot 1", kind: "snapshot", date: "2026-10-14" },
  { id: "26.3", kind: "release", date: "2026-09-15" },
  { id: "26.2", kind: "release", date: "2026-06-16" },
  { id: "26.1.2", kind: "release", date: "2026-04-09" },
  { id: "26.1.1", kind: "release", date: "2026-04-01" },
  { id: "26.1", kind: "release", date: "2026-03-24" },
  { id: "1.21.11", kind: "release", date: "2025-12-09" },
  { id: "1.21.10", kind: "old", date: "2025-10-07" },
  { id: "1.20.1", kind: "old", date: "2023-06-12" },
  { id: "1.16.5", kind: "old", date: "2021-01-15" },
  { id: "1.12.2", kind: "old", date: "2017-09-18" },
  { id: "1.8.9", kind: "old", date: "2015-12-09" },
];

export type LoaderId = "fabric" | "quilt" | "neoforge" | "forge";
export const LOADERS: { id: LoaderId; name: string; note: string }[] = [
  { id: "fabric", name: "Fabric", note: "Light and fast to update" },
  { id: "quilt", name: "Quilt", note: "Fabric mods run here too" },
  { id: "neoforge", name: "NeoForge", note: "The big modpacks' home" },
  { id: "forge", name: "Forge", note: "For older packs" },
];

export const JAVA_VERSIONS = [
  { id: "26.3", label: "Release 26.3", note: "Latest release" },
  { id: "26.2", label: "Release 26.2", note: "Release" },
  { id: "26.1", label: "Release 26.1", note: "Release" },
];
export const PLAYER = "Player46008";
export const playerHead = (name: string, size = 64) => `https://mc-heads.net/avatar/${encodeURIComponent(name)}/${size}`;

const SHOTS: Shot[] = [
  { src: "/media/bench/village.webp", name: "2026-10-17_19.04.12.png" },
  { src: "/media/underwater.webp", name: "2026-10-17_19.21.40.png" },
  { src: "/media/nether.webp", name: "2026-10-17_19.36.05.png" },
  { src: "/media/night-800.webp", name: "2026-10-17_20.02.51.png" },
];

const FALLBACK_NIGHTLY: Nightly = {
  id: "Nightly 2026-11-01 · c9d474d",
  title: "Nightly 2026-11-01 · c9d474d",
  date: "2026-11-01",
  build: "c9d474d",
  published: "2026-11-01T19:09:04Z",
  url: "https://github.com/horizon-rust/horizon/releases/tag/nightly",
  changes: [
    { section: "New", text: "Native mods can open custom menus" },
    { section: "New", text: "OptiFine entity models: packs' .jem files reshape mobs" },
    { section: "New", text: "Data packs and content mods: remove and replace recipes by filter" },
  ],
  total: 3,
};

const RELEASES = "https://github.com/horizon-rust/horizon/releases/tag/";

export const FALLBACK: LauncherData = {
  launcherVersion: "0.2.37",
  currentLauncher: "0.2.30",
  nightlies: [
    FALLBACK_NIGHTLY,
    { id: "Nightly 2026-10-31 · d91cab6", title: "Nightly 2026-10-31 · d91cab6", date: "2026-10-31", build: "d91cab6", published: "2026-10-31T16:58:38Z", url: `${RELEASES}nightly-2026-10-31`, changes: [], total: 0 },
    { id: "Nightly 2026-10-30 · 1da354b", title: "Nightly 2026-10-30 · 1da354b", date: "2026-10-30", build: "1da354b", published: "2026-10-30T16:31:56Z", url: `${RELEASES}nightly-2026-10-30`, changes: [], total: 0 },
  ],
  notes: [
    {
      version: "0.2.37",
      published: "2026-11-02T08:25:07Z",
      url: "https://github.com/horizon-rust/horizon/releases/tag/launcher%400.2.37",
      items: [
        "Native mod builds: no space in the Windows build folder",
        "Native builds: a dev profile for mod developers",
        "Launcher: import a game build you already have as its own version",
      ],
    },
  ],
  mods: [
    { id: "zoom", kind: "native-mod", name: "Zoom", summary: "Hold a key to zoom in; the mouse wheel zooms further while you hold it.", authors: ["Horizon"], downloads: 17862, version: "2.0.0", license: "MIT", capabilities: ["hud"] },
    { id: "fps_overlay", kind: "native-mod", name: "FPS Counter", summary: "Frames per second in a corner of the screen.", authors: ["Horizon"], downloads: 13845, version: "2.0.0", license: "MIT", capabilities: ["hud"] },
    { id: "minimap", kind: "native-mod", name: "Minimap", summary: "A map of the world around you in a corner of the screen.", authors: ["Horizon"], downloads: 10830, version: "2.0.0", license: "MIT", capabilities: ["game-read", "hud"] },
  ],
};

export function seedInstances(nightlies: Nightly[]): Instance[] {
  const at = (i: number) => (nightlies[Math.min(i, nightlies.length - 1)] ?? FALLBACK_NIGHTLY).id;
  return [
    {
      id: "horizon",
      name: "Horizon",
      mark: true,
      edition: "rust",
      version: at(1),
      java: "26.3",
      mods: ["minimap", "zoom", "fps_overlay", "treefall", "lookat", "mousetricks", "shulker_peek"],
      played: "41 hours",
      last: "2 hours ago",
      worlds: [
        { name: "Savanna village", mode: "Survival", last: "2 hours ago", size: "412 MB" },
        { name: "Hardcore, attempt 3", mode: "Hardcore", last: "Oct 28", size: "88 MB" },
        { name: "Seed 4815162342", mode: "Creative", last: "Oct 19", size: "31 MB" },
      ],
      servers: [
        { name: "Friday Night", address: "192.168.1.20", players: "3 of 10" },
        { name: "Tailnet survival", address: "anthony-pc.tail4f2a.ts.net", players: "Offline" },
      ],
      packs: [
        { name: "Faithful 32x", on: true },
        { name: "Bare Bones", on: false },
      ],
      shots: SHOTS,
    },
    {
      id: "native",
      name: "Native mods",
      mark: false,
      logo: LOGOS.grass,
      edition: "rust",
      version: at(0),
      java: "26.3",
      mods: ["veinminer", "carryblock", "biomecompass"],
      played: "3 hours",
      last: "Oct 31",
      worlds: [{ name: "Mod testing", mode: "Creative", last: "Oct 31", size: "12 MB" }],
      servers: [],
      packs: [],
      shots: SHOTS.slice(0, 1),
    },
    {
      id: "skyblock",
      name: "Skyblock",
      mark: false,
      logo: LOGOS.neoforge,
      loader: "NeoForge",
      edition: "java",
      version: at(0),
      java: "26.3",
      mods: ["recipes", "jei"],
      played: "",
      last: "",
      worlds: [],
      servers: [],
      packs: [],
      shots: [],
    },
  ];
}

export type Compat = "works" | "partly" | "none";
export type ModrinthEntry = { id: string; name: string; kind: string; compat: Compat; summary: string };

export const MODRINTH: ModrinthEntry[] = [
  { id: "faithful_32x", name: "Faithful 32x", kind: "Resource pack", compat: "works", summary: "Vanilla's textures, drawn again at twice the resolution." },
  { id: "bare_bones", name: "Bare Bones", kind: "Resource pack", compat: "works", summary: "Flat, simplified textures in the style of the trailers." },
  { id: "fresh_animations", name: "Fresh Animations", kind: "Resource pack", compat: "partly", summary: "Livelier mob animations. Horizon draws some of its models, the rest fall back to vanilla." },
  { id: "fabulously_optimized", name: "Fabulously Optimized", kind: "Modpack", compat: "partly", summary: "Its resource packs and options carry over. The Java mods inside it don't run." },
  { id: "complementary", name: "Complementary Shaders", kind: "Shader pack", compat: "none", summary: "Shader packs are removed for now. They come back later, written again from scratch." },
];

export const COMPAT_LABEL: Record<Compat, string> = { works: "Works", partly: "Partly", none: "Doesn't run" };

export type ServerState = "running" | "starting" | "stopped";
export type Server = {
  id: string;
  name: string;
  mode: string;
  world: string;
  state: ServerState;
  players: string[];
  max: number;
  up: number;
  tps: number;
  mspt: number;
  ram: number;
  chatter: number;
  console: string[];
};

export const BOOT_LINES = (stamp: string, world: string) => [
  `[${stamp} INFO] Starting Horizon server for Minecraft 26.3`,
  `[${stamp} INFO] Loading properties`,
  `[${stamp} INFO] Default game type: SURVIVAL`,
  `[${stamp} INFO] Preparing level "${world}"`,
  `[${stamp} INFO] Done (3.204s)! For help, type "help"`,
];

export const CHATTER = [
  "<pixelmoth> found a fortress at 212 64 -480",
  "Saving the game (this may take a moment!)",
  "Saved the game",
  "<oakleaf_> on my way, bringing beds",
  "pixelmoth has made the advancement [Hot Stuff]",
  `<${PLAYER}> meet at the portal in five`,
  "<oakleaf_> who took all the obsidian",
  `${PLAYER} has made the advancement [We Need to Go Deeper]`,
];

export const SEED_SERVERS: Server[] = [
  {
    id: "friday",
    name: "Friday Night",
    mode: "Survival",
    world: "Savanna village",
    state: "running",
    players: [PLAYER, "pixelmoth", "oakleaf_"],
    max: 10,
    up: 4320,
    tps: 20,
    mspt: 0.6,
    ram: 0.57,
    chatter: 0,
    console: [
      "[19:02:11 INFO] Starting Horizon server for Minecraft 26.3",
      "[19:02:11 INFO] Loading properties",
      "[19:02:12 INFO] Default game type: SURVIVAL",
      '[19:02:13 INFO] Preparing level "Savanna village"',
      '[19:02:15 INFO] Done (3.204s)! For help, type "help"',
      `[19:04:40 INFO] ${PLAYER} joined the game`,
      "[19:05:02 INFO] pixelmoth joined the game",
      "[19:05:31 INFO] <pixelmoth> evening. end tonight?",
      "[19:06:12 INFO] oakleaf_ joined the game",
    ],
  },
  {
    id: "build",
    name: "Build test",
    mode: "Creative",
    world: "Flat test",
    state: "stopped",
    players: [],
    max: 4,
    up: 0,
    tps: 20,
    mspt: 0.3,
    ram: 0.41,
    chatter: 0,
    console: [],
  },
];

export const ADDRESSES = { lan: "192.168.1.20", tailnet: "anthony-pc.tail4f2a.ts.net" };
