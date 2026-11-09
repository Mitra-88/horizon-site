export type ModFile = { name: string; url: string; size: number; sha256: string };
export type ModVersion = {
  version: string;
  published?: string;
  changelog?: string;
  api?: string;
  game: string;
  side?: string;
  capabilities?: string[];
  requires?: { id: string; version: string }[];
  /** A native mod's hook points version: it builds on any Horizon that has them. */
  hooks?: number;
  /** The Horizon commits the registry's daily check found it doesn't build on, with the error. */
  broken_on?: { horizon: string; code: string }[];
  file: ModFile;
};
export type ModProject = {
  id: string;
  kind: string;
  name: string;
  summary?: string;
  description?: string;
  authors?: string[];
  owners?: string[];
  license: string;
  source?: string;
  icon?: string;
  key?: string;
  categories?: string[];
  tags?: string[];
  screenshots?: string[];
  versions: ModVersion[];
  downloads?: number;
  /** The GitHub stars of its `source` repository, read by the registry's publish job every hour. */
  stars?: number;
};
export type ModSummary = {
  id: string;
  kind: string;
  name: string;
  summary: string;
  authors: string[];
  downloads: number;
  /** Its GitHub stars: 0 when it has none or its source isn't a GitHub repository. */
  stars: number;
  version: string;
  icon: string;
  categories: string[];
  tags: string[];
};
export type Rating = { average: number; count: number };
export type Ratings = Record<string, Rating>;

export const REGISTRY = "https://github.com/horizon-rust/horizon-mods";
export const OFFICIAL_MODS = "https://playhorizon.dev/mods";
export const SUBMIT_URL = "/mods/submit";
export const POLICY_URL = "/mods/policy";

export const KINDS = [
  ["mod", "Mods"],
  ["native-mod", "Native mods"],
  ["modpack", "Modpacks"],
  ["resourcepack", "Resource packs"],
  ["shader", "Shader packs"],
  ["shaderpack", "Shader packs (shaders/ folder)"],
  ["datapack", "Data packs"],
] as const;

export const KIND_NAMES: Record<string, string> = {
  mod: "Mod",
  "native-mod": "Native mod",
  modpack: "Modpack",
  resourcepack: "Resource pack",
  shader: "Shader pack",
  shaderpack: "Shader pack (shaders/ folder)",
  datapack: "Data pack",
};

// Each kind's categories, as the registry checks them (horizon_mods::index::page::categories): a project picks 1 to 3.
const MOD_CATEGORIES = [
  "adventure",
  "decoration",
  "economy",
  "equipment",
  "food",
  "game-mechanics",
  "library",
  "magic",
  "management",
  "minigame",
  "mobs",
  "optimization",
  "social",
  "storage",
  "technology",
  "transportation",
  "utility",
  "worldgen",
];
const SHADER_CATEGORIES = [
  "cartoon",
  "fantasy",
  "realistic",
  "semi-realistic",
  "vanilla-like",
  "atmosphere",
  "bloom",
  "colored-lighting",
  "foliage",
  "path-tracing",
  "pbr",
  "reflections",
  "shadows",
  "potato",
  "low",
  "medium",
  "high",
  "screenshot",
];
export const CATEGORIES: Record<string, readonly string[]> = {
  mod: MOD_CATEGORIES,
  "native-mod": MOD_CATEGORIES,
  datapack: MOD_CATEGORIES,
  modpack: ["adventure", "challenging", "combat", "kitchen-sink", "lightweight", "magic", "multiplayer", "optimization", "quests", "technology"],
  resourcepack: [
    "8x",
    "16x",
    "32x",
    "48x",
    "64x",
    "128x",
    "256x",
    "512x",
    "audio",
    "blocks",
    "combat",
    "core-shaders",
    "decoration",
    "entities",
    "environment",
    "equipment",
    "fonts",
    "gui",
    "items",
    "locale",
    "models",
    "realistic",
    "simplistic",
    "themed",
    "tweaks",
    "utility",
    "vanilla-like",
  ],
  shader: SHADER_CATEGORIES,
  shaderpack: SHADER_CATEGORIES,
};

const CATEGORY_WORDS: Record<string, string> = {
  gui: "GUI",
  pbr: "PBR",
  worldgen: "World generation",
  "semi-realistic": "Semi-realistic",
  "vanilla-like": "Vanilla-like",
  "core-shaders": "Core shaders",
};
/** A category's slug as a label: "game-mechanics" reads "Game mechanics". */
export const categoryLabel = (slug: string) => CATEGORY_WORDS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");

export const CAPABILITIES: Record<string, string> = {
  "game-read": "see your position, health and the time",
  chat: "show you chat messages",
  hud: "draw text on your screen",
  storage: "save its own settings to disk",
  registries: "add blocks and items to your worlds",
};

export const SORTS = [
  ["downloads", "Most downloaded"],
  ["rating", "Best rated"],
  ["name", "Name"],
] as const;
export type Sort = (typeof SORTS)[number][0];

export const https = (url?: string) => (typeof url === "string" && url.startsWith("https://") ? url : "");

const strings = (list: unknown) => (Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : []);
const SLUG = /^[a-z0-9][a-z0-9-]{0,23}$/;
/** The project's categories that are its kind's, and its plain tags: the index may carry anything. */
export const categoriesOf = (p: ModProject) => strings(p.categories).filter((c) => CATEGORIES[p.kind]?.includes(c));
export const tagsOf = (p: ModProject) => strings(p.tags).filter((t) => SLUG.test(t));
/** Its screenshots, only from the registry's own Pages site (where it mirrors every image). */
export const screenshotsOf = (p: ModProject) => strings(p.screenshots).filter((u) => u.startsWith("https://horizon-rust.github.io/horizon-mods/"));

export const fileSize = (bytes: number) => (bytes >= 1 << 20 ? `${(bytes / (1 << 20)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** 950, 1.2k, 3.4M; `comma` writes the decimal mark as a comma (1,2k). */
export function count(n: number, comma = false) {
  const one = (x: number) => (comma ? x.toFixed(1).replace(".", ",") : x.toFixed(1));
  if (n < 1000) return String(n);
  if (n < 1e6) return `${one(n / 1e3)}k`;
  return `${one(n / 1e6)}M`;
}

export const safeDownloads = (n?: number) => (Number.isSafeInteger(n) && (n as number) > 0 ? (n as number) : 0);

/** `https://github.com/<owner>/<repo>` of a source on GitHub, else "": where its stars are. */
export function githubRepo(source?: string) {
  const m = /^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9_.-]{1,100})(?:[/?#]|$)/.exec(source ?? "");
  if (!m || m[2].startsWith(".")) return "";
  return `https://github.com/${m[1]}/${m[2].replace(/\.git$/, "")}`;
}

/** A project's GitHub stars, as the index gives them: 0 unless its source is a GitHub repository. */
export const starsOf = (p: Pick<ModProject, "stars" | "source">) => (githubRepo(p.source) ? safeDownloads(p.stars) : 0);

export const downloadsText = (n: number) => `${count(n)} download${n === 1 ? "" : "s"}`;

export function ratingOf(ratings: Ratings | null, id: string): Rating | null {
  const r = ratings?.[id];
  return r && Number.isFinite(r.average) && Number.isSafeInteger(r.count) && r.count > 0 ? r : null;
}

export function summarize(p: ModProject): ModSummary {
  return {
    id: p.id,
    kind: p.kind,
    name: p.name,
    summary: p.summary ?? "",
    authors: p.authors ?? [],
    downloads: safeDownloads(p.downloads),
    stars: starsOf(p),
    version: p.versions[0].version,
    icon: https(p.icon),
    categories: categoriesOf(p),
    tags: tagsOf(p),
  };
}

export function sorted(projects: ModSummary[], by: Sort, ratings: Ratings | null) {
  const avg = (p: ModSummary) => ratingOf(ratings, p.id)?.average ?? 0;
  const votes = (p: ModSummary) => ratingOf(ratings, p.id)?.count ?? 0;
  const name = (a: ModSummary, b: ModSummary) => a.name.localeCompare(b.name);
  const order = {
    downloads: (a: ModSummary, b: ModSummary) => b.downloads - a.downloads || name(a, b),
    rating: (a: ModSummary, b: ModSummary) => avg(b) - avg(a) || votes(b) - votes(a) || name(a, b),
    name,
  }[by];
  return [...projects].sort(order);
}

export function matches(p: ModSummary, kind: string, text: string, category = "") {
  if (kind !== "all" && p.kind !== kind) return false;
  if (category && !p.categories.includes(category)) return false;
  const hay = `${p.id} ${p.name} ${p.summary} ${p.authors.join(" ")} ${p.tags.join(" ")}`.toLowerCase();
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

export function apiLabel(api?: string) {
  if (!api) return "";
  const native = /^native-\d+\/([0-9a-f]{40})\//.exec(api);
  return native ? `made on Horizon ${native[1].slice(0, 7)}` : `API ${api}`;
}

/** Whether a native version builds on Horizon beyond the commit it was made on: the registry's daily check, or its hook points. */
export function buildsOn(v: ModVersion): { ok: boolean; text: string } | null {
  const broken = v.broken_on?.[0];
  if (broken) return { ok: false, text: `Doesn't build on Horizon ${broken.horizon.slice(0, 7)} (${broken.code})` };
  return v.hooks ? { ok: true, text: `Builds on every Horizon with native hook points v${v.hooks}` } : null;
}

const LOGIN = /^(?!-)(?!.*--)[A-Za-z0-9-]{1,39}(?<!-)$/;
export const owners = (p: ModProject) => (p.owners ?? []).filter((o) => LOGIN.test(o));

export const isOfficial = (p: ModProject) =>
  (p.authors ?? []).length === 1 && p.authors?.[0] === "Horizon" && /^https:\/\/github\.com\/horizon-rust\//.test(p.source ?? "");

export const installCommand = (id: string) => `horizon-launcher mods install --source horizon ${id}`;
