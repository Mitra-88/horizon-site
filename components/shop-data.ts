import { cacheLife } from "next/cache";

// The founder shop reads Horizon's cosmetics service (horizon-rust/horizon-cosmetics, private) on the server. Only the
// claim calls it from the browser (components/shop/claim.tsx): the Minecraft name the buyer types, and the checkout.
// Nobody signs in here. The page and its nav entry exist only while the service says the founder set's claim window is open.

const UPSTREAM = (process.env.COSMETICS_UPSTREAM || "https://cosmetics.playhorizon.dev").replace(/\/+$/, "");
// What the browser calls for the claim (CORS allows this site only): always the production service.
export const COSMETICS_API = "https://cosmetics.playhorizon.dev";

// For previews only: shows the page with a sample window while the service's window isn't open. Ignored on Railway's
// production environment, so a stray variable there can't open the shop early. The sample window is as long as the
// real one: seven days from the start of the current hour. Production reads the service's own dates only.
const PREVIEW = process.env.SHOP_PREVIEW === "1" && process.env.RAILWAY_ENVIRONMENT_NAME !== "production";
const PREVIEW_DAYS = 7;

// What the founder set holds, as the launcher's Wardrobe sorts it. Launcher themes are free in the launcher's Settings
// and never part of the shop, so an item of any other slot is left out.
export type ShopSlot = "head" | "torso" | "back" | "shoulder" | "name_tag";
// `price`: what the shop shows before anyone signs in ("Free" for the founder set, else the service's price).
export type ShopItem = { id: string; hash: string; slot: ShopSlot; name: string; price: string; line?: string };
export type ShopStatus = { open: boolean; endsAt: number | null; items: ShopItem[]; preview: boolean };

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
const ID = /^[a-z0-9_]{1,48}$/;
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

async function upstream(path: string) {
  const res = await fetch(`${UPSTREAM}${path}`, { signal: AbortSignal.timeout(10_000), headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`The cosmetics service responded ${res.status} ${res.statusText}`);
  return (await res.json()) as unknown;
}

/** The service's `price` (`{amount: cents, currency}`) as the shop writes it; none: free. */
function priceLabel(price: unknown) {
  if (!obj(price) || typeof price.amount !== "number" || !Number.isFinite(price.amount) || price.amount <= 0) return "Free";
  const currency = typeof price.currency === "string" && /^[A-Z]{3}$/.test(price.currency) ? price.currency : "USD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price.amount / 100);
}

function readCatalogue(json: unknown): Omit<ShopStatus, "preview"> | null {
  if (!obj(json) || !obj(json.claim) || !Array.isArray(json.items)) return null;
  const claim = json.claim;
  const founder = Array.isArray(claim.items) ? claim.items.filter((i): i is string => typeof i === "string") : [];
  const items: ShopItem[] = [];
  for (const raw of json.items) {
    if (!obj(raw) || typeof raw.id !== "string" || !ID.test(raw.id) || !founder.includes(raw.id)) continue;
    if (typeof raw.hash !== "string" || !HASH.test(raw.hash) || !SLOTS.has(raw.slot as ShopSlot)) continue;
    const names = obj(raw.names) ? raw.names : {};
    const name = typeof names.en_us === "string" ? names.en_us.slice(0, 48) : raw.id;
    const lines = obj(raw.lines) ? raw.lines : {};
    const line = typeof lines.en_us === "string" && lines.en_us.trim() ? lines.en_us.trim().slice(0, 160) : undefined;
    items.push({ id: raw.id, hash: raw.hash, slot: raw.slot as ShopSlot, name, price: priceLabel(raw.price), ...(line ? { line } : {}) });
  }
  // The order the service gives the set in.
  items.sort((a, b) => founder.indexOf(a.id) - founder.indexOf(b.id));
  const endsAt = typeof claim.ends_at === "number" && Number.isFinite(claim.ends_at) ? claim.ends_at : null;
  return { open: claim.state === "open" && endsAt !== null, endsAt, items };
}

/** The founder set and its claim window; `open` is false when the service is down or answers anything unexpected. */
export async function getShopStatus(): Promise<ShopStatus> {
  "use cache";
  let live: Omit<ShopStatus, "preview"> | null = null;
  try {
    live = readCatalogue(await upstream("/v1/catalogue"));
    if (!live) throw new Error("The catalogue came back in a format this site doesn't read");
    cacheLife({ stale: 60, revalidate: 60, expire: 3600 });
  } catch (error) {
    console.error("Couldn't load the cosmetics catalogue:", error);
    cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  }
  if (live?.open) return { ...live, preview: false };
  if (PREVIEW && live?.items.length) {
    const start = Math.floor(Date.now() / 3_600_000) * 3600;
    return { open: true, endsAt: start + PREVIEW_DAYS * 86_400, items: live.items, preview: true };
  }
  return { open: false, endsAt: null, items: live?.items ?? [], preview: false };
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

/** The founder set's item files, for the page's 3D preview. Items that fail to load are left out. */
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
