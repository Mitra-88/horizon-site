import { cacheLife } from "next/cache";
import { formatPrice } from "@/components/shop/pricing";

// The shop reads Horizon's cosmetics service (horizon-rust/horizon-cosmetics, private) on the server: the catalogue
// (items, sets, prices per currency, the founder claim's window) and the item files. The browser calls it only for
// what one visitor does: the Minecraft name they type (its skin and what it owns) and the checkout. Nobody signs in
// here. Every price comes from the catalogue; an item without prices isn't on sale and shows no price or Buy button.

const UPSTREAM = (process.env.COSMETICS_UPSTREAM || "https://cosmetics.playhorizon.dev").replace(/\/+$/, "");
const PRODUCTION = process.env.RAILWAY_ENVIRONMENT_NAME === "production";
// What the browser calls (CORS allows this site only): the production service, except in a local preview.
export const COSMETICS_API = (!PRODUCTION && process.env.COSMETICS_BROWSER_API) || "https://cosmetics.playhorizon.dev";

// For previews only: shows the page with a sample window while the service's window isn't open. Ignored on Railway's
// production environment, so a stray variable there can't open the shop early. The sample window is as long as the
// real one: seven days from the start of the current hour. Production reads the service's own dates only.
const PREVIEW = process.env.SHOP_PREVIEW === "1" && !PRODUCTION;
const PREVIEW_DAYS = 7;
// The service's preview key (1Password Agents "Horizon shop preview key"): a collection the service still hides. Never
// on production: there the catalogue shows what is on sale, and nothing else.
const PREVIEW_KEY = !PRODUCTION && /^[A-Za-z0-9_-]{8,128}$/.test(process.env.SHOP_PREVIEW_KEY ?? "") ? process.env.SHOP_PREVIEW_KEY! : null;

// What the shop holds, as the launcher's Wardrobe sorts it. Launcher themes are free in the launcher's Settings and
// never part of the shop, so an item of any other slot is left out.
export type ShopSlot = "head" | "torso" | "back" | "shoulder" | "name_tag";
export const CURRENCIES = ["USD", "EUR", "CHF", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];
/** Minor units (cents), the amount the buyer sees, per currency. */
export type Prices = Partial<Record<Currency, number>>;
// `price`: the label shown before anyone signs in ("Free" for the founder set, else the USD price).
export type ShopItem = {
  id: string;
  hash: string;
  slot: ShopSlot;
  name: string;
  price: string;
  line?: string;
  prices?: Prices;
  collection?: string;
  founder?: boolean;
  supporter?: boolean;
};
export type ShopSet = { id: string; name: string; line?: string; items: string[]; prices: Prices; collection?: string };
export type ShopCollection = { id: string; name: string; line?: string };
export type Supporter = { item: string; min: Prices; max: Prices };
export type ShopStatus = { open: boolean; endsAt: number | null; items: ShopItem[]; preview: boolean; selling: boolean };
export type Catalogue = {
  currencies: Currency[];
  /** Everything a card shows: items on sale, the Supporter badge, and the founder set while its claim is open. */
  items: ShopItem[];
  sets: ShopSet[];
  collections: ShopCollection[];
  supporter: Supporter | null;
};

// The item file, as horizon's `crates/horizon-cosmetics` reads it (docs/cosmetics.md in the game's repository).
export type Vec3 = [number, number, number];
export type ArtCube = { origin: Vec3; size: Vec3; uv: [number, number]; inflate: number; mirror: boolean };
// `bone`: a top-level part may ride another bone than the item's (a shirt's sleeves on the arms), under the same attachment.
export type ArtPart = { name: string; pivot: Vec3; rotation: Vec3; cubes: ArtCube[]; children: ArtPart[]; bone?: string };
export type ArtAnimation = { part: string; motion: "swing" | "bob" | "spin"; axis: 0 | 1 | 2; amplitude: number; period: number; phase: number };
export type ItemArt = {
  id: string;
  bone: string;
  attach: { offset: Vec3; rotation: Vec3; scale: number };
  texture: string; // base64 PNG
  parts: ArtPart[];
  animations: ArtAnimation[];
  tagLine?: string;
};

const SLOTS = new Set<ShopSlot>(["head", "torso", "back", "shoulder", "name_tag"]);
const ID = /^[a-z0-9_]{1,64}$/;
const HASH = /^[0-9a-f]{1,64}$/;
const COLOUR = /^#[0-9a-f]{6}$/i;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const BONES = new Set(["head", "body", "left_arm", "right_arm", "left_leg", "right_leg"]);

type Json = Record<string, unknown>;
const obj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const vec3 = (v: unknown, limit = 64): Vec3 =>
  Array.isArray(v) && v.length === 3 ? (v.map((x) => clamp(num(x), -limit, limit)) as Vec3) : [0, 0, 0];
const english = (v: unknown, max: number) => (obj(v) && typeof v.en_us === "string" && v.en_us.trim() ? v.en_us.trim().slice(0, max) : undefined);

async function upstream(path: string) {
  const res = await fetch(`${UPSTREAM}${path}`, { signal: AbortSignal.timeout(10_000), headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`The cosmetics service responded ${res.status} ${res.statusText}`);
  return (await res.json()) as unknown;
}

/** Prices per currency: whole minor units from 1 to 100,000 (1,000.00), in the currencies the site knows. */
function readPrices(v: unknown): Prices | undefined {
  if (!obj(v)) return undefined;
  const out: Prices = {};
  for (const c of CURRENCIES) {
    const a = v[c];
    if (typeof a === "number" && Number.isInteger(a) && a > 0 && a <= 100_000) out[c] = a;
  }
  return out.USD !== undefined ? out : undefined;
}


type Read = { claim: Omit<ShopStatus, "preview" | "selling" | "items">; founder: string[]; catalogue: Catalogue };

function readCatalogue(json: unknown): Read | null {
  if (!obj(json) || !obj(json.claim) || !Array.isArray(json.items)) return null;
  const claim = json.claim;
  const founder = Array.isArray(claim.items) ? claim.items.filter((i): i is string => typeof i === "string") : [];
  const endsAt = typeof claim.ends_at === "number" && Number.isFinite(claim.ends_at) ? claim.ends_at : null;
  const open = claim.state === "open" && endsAt !== null;
  const sales = json.sales === true;
  const items: ShopItem[] = [];
  for (const raw of json.items) {
    if (!obj(raw) || typeof raw.id !== "string" || !ID.test(raw.id)) continue;
    if (typeof raw.hash !== "string" || !HASH.test(raw.hash) || !SLOTS.has(raw.slot as ShopSlot)) continue;
    const isFounder = founder.includes(raw.id);
    const supporter = raw.supporter === true;
    const prices = sales && !isFounder ? readPrices(raw.prices) : undefined;
    // Shown: an item on sale, the Supporter badge (while the service offers it), the founder set's items.
    if (!isFounder && !prices && !supporter) continue;
    const collection = typeof raw.collection === "string" && ID.test(raw.collection) ? raw.collection : undefined;
    items.push({
      id: raw.id,
      hash: raw.hash,
      slot: raw.slot as ShopSlot,
      name: english(raw.names, 48) ?? raw.id,
      price: prices ? formatPrice(prices.USD!, "USD") : "Free",
      ...(english(raw.lines, 200) ? { line: english(raw.lines, 200) } : {}),
      ...(prices ? { prices } : {}),
      ...(collection ? { collection } : {}),
      ...(isFounder ? { founder: true } : {}),
      ...(supporter ? { supporter: true } : {}),
    });
  }
  const sp = obj(json.supporter) ? json.supporter : null;
  const supporterItem = sp && typeof sp.item === "string" ? items.find((i) => i.id === sp.item && i.supporter) : undefined;
  const min = sp ? readPrices(sp.min) : undefined;
  const max = sp ? readPrices(sp.max) : undefined;
  const supporter = sales && supporterItem && min && max ? { item: supporterItem.id, min, max } : null;
  const shown = items.filter((i) => (i.founder ? open || PREVIEW : i.supporter ? supporter?.item === i.id : true));
  for (const i of shown) if (i.supporter && supporter) i.price = `From ${formatPrice(supporter.min.USD!, "USD")}`;
  const known = new Set(shown.filter((i) => i.prices).map((i) => i.id));
  const sets: ShopSet[] = [];
  for (const raw of Array.isArray(json.sets) && sales ? json.sets : []) {
    if (!obj(raw) || typeof raw.id !== "string" || !ID.test(raw.id) || !Array.isArray(raw.items)) continue;
    const ids = raw.items.filter((i): i is string => typeof i === "string");
    const prices = readPrices(raw.prices);
    if (!prices || ids.length < 2 || !ids.every((i) => known.has(i))) continue;
    const collection = typeof raw.collection === "string" && ID.test(raw.collection) ? raw.collection : undefined;
    sets.push({
      id: raw.id,
      name: english(raw.names, 64) ?? raw.id,
      items: ids,
      prices,
      ...(english(raw.lines, 200) ? { line: english(raw.lines, 200) } : {}),
      ...(collection ? { collection } : {}),
    });
  }
  const collections: ShopCollection[] = [];
  for (const raw of Array.isArray(json.collections) ? json.collections : [])
    if (obj(raw) && typeof raw.id === "string" && ID.test(raw.id))
      collections.push({ id: raw.id, name: english(raw.names, 48) ?? raw.id, ...(english(raw.lines, 240) ? { line: english(raw.lines, 240) } : {}) });
  const currencies = (Array.isArray(json.currencies) ? json.currencies : ["USD"]).filter((c): c is Currency => CURRENCIES.includes(c as Currency));
  // The founder set in the order the service gives it, after everything else.
  shown.sort((a, b) => Number(!!a.founder) - Number(!!b.founder) || founder.indexOf(a.id) - founder.indexOf(b.id));
  return {
    claim: { open, endsAt },
    founder,
    catalogue: { currencies: currencies.includes("USD") ? currencies : ["USD", ...currencies], items: shown, sets, collections, supporter },
  };
}

const EMPTY: Catalogue = { currencies: ["USD"], items: [], sets: [], collections: [], supporter: null };

async function loadCatalogue(): Promise<Read | null> {
  "use cache";
  try {
    const live = readCatalogue(await upstream(PREVIEW_KEY ? `/v1/catalogue?preview=${encodeURIComponent(PREVIEW_KEY)}` : "/v1/catalogue"));
    if (!live) throw new Error("The catalogue came back in a format this site doesn't read");
    cacheLife({ stale: 60, revalidate: 60, expire: 3600 });
    return live;
  } catch (error) {
    console.error("Couldn't load the cosmetics catalogue:", error);
    cacheLife({ stale: 60, revalidate: 60, expire: 300 });
    return null;
  }
}

/** The founder set's claim window, and whether anything is on sale; `open` is false when the service is down. */
export async function getShopStatus(): Promise<ShopStatus> {
  const live = await loadCatalogue();
  const founder = live?.catalogue.items.filter((i) => i.founder) ?? [];
  const selling = live?.catalogue.items.some((i) => i.prices || i.supporter) ?? false;
  if (live?.claim.open) return { ...live.claim, items: founder, preview: false, selling };
  if (PREVIEW && live) {
    // Founder items are listed only while the window is open: the preview window shows them from the raw list.
    const start = Math.floor(Date.now() / 3_600_000) * 3600;
    return { open: true, endsAt: start + PREVIEW_DAYS * 86_400, items: founder, preview: true, selling };
  }
  return { open: false, endsAt: null, items: [], preview: false, selling };
}

/** What the shop's cards show. */
export async function getCatalogue(): Promise<Catalogue> {
  return (await loadCatalogue())?.catalogue ?? EMPTY;
}

function readPart(raw: unknown, depth: number, count: { parts: number; cubes: number }): ArtPart | null {
  if (!obj(raw) || depth > 6 || ++count.parts > 17) return null;
  const cubes: ArtCube[] = [];
  for (const c of Array.isArray(raw.cubes) ? raw.cubes : []) {
    if (!obj(c) || ++count.cubes > 21) continue;
    const uv = Array.isArray(c.uv) && c.uv.length === 2 ? (c.uv.map((x) => clamp(num(x), 0, 64)) as [number, number]) : ([0, 0] as [number, number]);
    cubes.push({ origin: vec3(c.origin), size: vec3(c.size).map((s) => Math.abs(s)) as Vec3, uv, inflate: clamp(num(c.inflate), -4, 4), mirror: c.mirror === true });
  }
  const children = (Array.isArray(raw.children) ? raw.children : []).map((p) => readPart(p, depth + 1, count)).filter((p): p is ArtPart => p !== null);
  const bone = depth === 0 && typeof raw.bone === "string" && BONES.has(raw.bone) ? { bone: raw.bone } : {};
  return { name: typeof raw.name === "string" ? raw.name.slice(0, 48) : "", pivot: vec3(raw.pivot), rotation: vec3(raw.rotation, 360), cubes, children, ...bone };
}

function readArt(json: unknown, id: string): ItemArt | null {
  if (!obj(json) || json.id !== id || !obj(json.texture) || typeof json.texture.png !== "string") return null;
  const png = json.texture.png;
  if (png.length > 65_536 || !BASE64.test(png)) return null;
  const count = { parts: 0, cubes: 0 };
  const parts = (Array.isArray(json.parts) ? json.parts : []).map((p) => readPart(p, 0, count)).filter((p): p is ArtPart => p !== null);
  const attach = obj(json.attach) ? json.attach : {};
  const animations: ArtAnimation[] = [];
  for (const a of Array.isArray(json.animations) ? json.animations : []) {
    if (!obj(a) || typeof a.part !== "string" || !["swing", "bob", "spin"].includes(a.motion as string)) continue;
    const axis = ["x", "y", "z"].indexOf(a.axis as string);
    if (axis < 0) continue;
    animations.push({
      part: a.part,
      motion: a.motion as ArtAnimation["motion"],
      axis: axis as 0 | 1 | 2,
      amplitude: clamp(num(a.amplitude), -45, 45),
      period: clamp(num(a.period, 40), 4, 1200),
      phase: num(a.phase),
    });
  }
  const line = obj(json.tag) && typeof json.tag.line === "string" && COLOUR.test(json.tag.line) ? json.tag.line : undefined;
  return {
    id,
    bone: typeof json.bone === "string" && BONES.has(json.bone) ? json.bone : "head",
    attach: { offset: vec3(attach.offset), rotation: vec3(attach.rotation, 360), scale: clamp(num(attach.scale, 1), 0.05, 2) },
    texture: png,
    parts,
    animations,
    ...(line ? { tagLine: line } : {}),
  };
}

/** The item files, for the page's 3D previews. Items that fail to load are left out. */
export async function getShopArt(items: ShopItem[]): Promise<ItemArt[]> {
  "use cache";
  const art = await Promise.all(
    items.map(async (item) => {
      try {
        return readArt(await upstream(`/v1/items/${item.id}?hash=${item.hash}`), item.id);
      } catch (error) {
        console.error(`Couldn't load the item ${item.id}:`, error);
        return null;
      }
    }),
  );
  const loaded = art.filter((a): a is ItemArt => a !== null);
  // An item file never changes for one hash; ask again soon only when one didn't arrive.
  cacheLife(loaded.length === items.length ? { stale: 300, revalidate: 3600, expire: 86400 } : { stale: 60, revalidate: 60, expire: 300 });
  return loaded;
}
