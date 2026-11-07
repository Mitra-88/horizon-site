"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Catalogue, Currency, ItemArt, ShopItem, ShopSet, ShopSlot } from "@/components/shop-data";
import { SkinFace } from "@/components/shop/claim";
import { formatPrice, guessCurrency, setPrice, usableCurrencies } from "@/components/shop/pricing";
import { itemTextures, skinTexture } from "@/components/shop/renderer";
import { Thumb, useShopGL, Viewer, type Focus } from "@/components/shop/view3d";

// The shop on playhorizon.dev, laid out like a game's item shop: the season's pack first, then rows of big tiles (the
// item itself, its name, its price). A tile opens its detail: your own skin in 3D wearing it, and Buy or Gift. Type a
// Minecraft name and the cosmetics service looks it up at Mojang (its skin, slim or wide arms, what it owns); nobody
// signs in. Every price is the catalogue's, shown before anything is typed. One offer checks out in one Paddle
// transaction on /shop/pay, where Paddle.js lives. Calm on purpose: no timers, counts of buyers, scarcity or pop-ups
// (the detail opens only when a tile is clicked).

export const SLOT_LABEL: Record<ShopSlot, string> = {
  head: "Head",
  torso: "Shirt",
  back: "Back",
  shoulder: "Shoulder pet",
  name_tag: "Name tag",
  companion: "Companion",
  trail: "Trail",
  aura: "Aura",
  emote: "Emote",
};

/** The every-item list's headings, in the Wardrobe's order. */
const SLOT_GROUP: [ShopSlot, string][] = [
  ["head", "Headwear"],
  ["torso", "Shirts"],
  ["back", "On your back"],
  ["shoulder", "Shoulder pets"],
  ["companion", "Companions"],
  ["trail", "Trails"],
  ["aura", "Auras"],
  ["emote", "Emotes"],
  ["name_tag", "Name tags"],
];

type Player = { uuid: string; name: string; skin: string | null; slim: boolean; owned: Set<string> };

const NAME = /^[A-Za-z0-9_]{1,16}$/;
const TXN = /^txn_[a-z0-9]{26}$/;
const SAVED = "horizon-shop:name";
const CURRENCY = "horizon-shop:currency";

const BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#6b4bff] px-4 text-[15px] font-medium text-white transition-colors outline-none hover:bg-[#7a5dff] focus-visible:ring-2 focus-visible:ring-[#a98fff] disabled:cursor-not-allowed disabled:opacity-60";
const QUIET =
  "inline-flex h-11 shrink-0 items-center whitespace-nowrap justify-center gap-2 rounded-[10px] bg-white/[0.08] px-4 text-[15px] font-medium text-white transition-colors outline-none hover:bg-white/[0.14] focus-visible:ring-2 focus-visible:ring-[#a98fff] disabled:cursor-not-allowed disabled:opacity-60";
const SMALL = "inline-flex h-9 shrink-0 items-center whitespace-nowrap justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff]";
const INPUT =
  "h-11 w-full rounded-[10px] bg-white/[0.08] px-4 text-[16px] text-white outline-none placeholder:text-white/35 focus:bg-white/[0.11] focus-visible:ring-2 focus-visible:ring-[#a98fff]";

const MESSAGES: Record<string, string> = {
  player: "No Minecraft: Java Edition account has that name. Check the spelling.",
  name: "A Minecraft name has 1 to 16 letters, digits or underscores.",
  slow_down: "Too many tries in a row. Wait a minute, then try again.",
  busy: "The shop is busy. Try again in a moment.",
  mojang: "Mojang's profile service didn't answer. Try again in a moment.",
  paddle: "Paddle couldn't start the checkout. Nothing was charged; try again in a moment.",
  sales_off: "The shop isn't selling right now. Nothing was charged.",
  owned: "That account already owns all of it.",
  amount: "The Supporter amount is outside what the shop takes.",
  currency: "The shop doesn't take that currency. Pick another one.",
};
const UNREACHABLE = "Horizon's shop couldn't be reached. Check your connection and try again.";
const errorText = (body: Record<string, unknown>) => (typeof body.error === "string" && MESSAGES[body.error]) || UNREACHABLE;

async function call(api: string, path: string, init?: RequestInit): Promise<{ ok: boolean; body: Record<string, unknown> }> {
  const res = await fetch(`${api}${path}`, { ...init, cache: "no-store", headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}) } });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, body };
}

async function lookUp(api: string, name: string): Promise<Player | string> {
  if (!NAME.test(name)) return MESSAGES.name;
  try {
    const { ok, body } = await call(api, `/v1/players/${encodeURIComponent(name)}`);
    if (!ok || typeof body.uuid !== "string" || typeof body.name !== "string") return errorText(body);
    const owned = Array.isArray(body.owned) ? body.owned.filter((i): i is string => typeof i === "string") : [];
    return { uuid: body.uuid, name: body.name, skin: typeof body.skin === "string" ? body.skin : null, slim: body.slim === true, owned: new Set(owned) };
  } catch {
    return UNREACHABLE;
  }
}

const store = {
  get(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      // A private window: nothing is remembered.
    }
  },
};

// ── the name tag, as other Horizon players see it: the name, the badge after it, a line under it ──

export function NameTag({ name, art, big = false }: { name: string; art?: ItemArt; big?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-[0.35em] bg-black/45 px-[0.45em] pt-[0.15em] pb-[0.2em] font-mono leading-none whitespace-nowrap text-white ${big ? "text-[17px]" : "text-[13px]"}`}
      style={{ borderBottom: `${big ? 2 : 2}px solid ${art?.tagLine ?? "transparent"}` }}
    >
      {name}
      {art && (
        // eslint-disable-next-line @next/next/no-img-element -- a data: URL of a 16×16 badge, drawn pixel for pixel
        <img src={`data:image/png;base64,${art.texture}`} alt="" className="size-[1em] [image-rendering:pixelated]" />
      )}
    </span>
  );
}

// ── the page's client part ──

/** What a tile opens: the season's pack, a look, one item, or the Supporter badge. */
type Offer = { kind: "pack" | "look"; set: ShopSet } | { kind: "item"; item: ShopItem } | { kind: "supporter"; item: ShopItem };
const offerId = (o: Offer) => ("set" in o ? o.set.id : o.item.id);

// A tile's colour: a faint light per slot (per look for the looks) over the site's dark.
const SLOT_TONE: Record<ShopSlot, string> = {
  head: "#f59e0b",
  torso: "#f43f5e",
  back: "#4ade80",
  shoulder: "#fb923c",
  companion: "#2dd4bf",
  trail: "#60a5fa",
  aura: "#facc15",
  emote: "#a78bfa",
  name_tag: "#94a3b8",
};
const LOOK_TONES = ["#f59e0b", "#38bdf8", "#4ade80", "#f472b6", "#a78bfa"];
const tone = (hex: string, strength = 0.24) =>
  `radial-gradient(130% 85% at 50% 15%, ${hex}${Math.round(strength * 255)
    .toString(16)
    .padStart(2, "0")}, transparent 70%), linear-gradient(180deg, #1c1436, #0c0819)`;
const slotOrder = (slot: ShopSlot) => SLOT_GROUP.findIndex(([s]) => s === slot);

export function Shop({ catalogue, art, api, claimOpen }: { catalogue: Catalogue; art: ItemArt[]; api: string; claimOpen: boolean }) {
  const gl = useShopGL();
  const artById = useMemo(() => new Map(art.map((a) => [a.id, a])), [art]);
  const items = useMemo(() => new Map(catalogue.items.map((i) => [i.id, i])), [catalogue.items]);
  const currencies = useMemo(() => usableCurrencies(catalogue), [catalogue]);
  const selling = catalogue.items.some((i) => i.prices || i.supporter);

  // The player: the name typed (remembered on this browser only), its skin and what it owns.
  const [me, setMe] = useState<Player | null>(null);
  const [name, setName] = useState("");
  const [finding, setFinding] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [skin, setSkin] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [offer, setOffer] = useState<Offer | null>(null);

  // The remembered name and currency, after the first paint (the server renders USD and Horizon's stand-in skin).
  useEffect(() => {
    const t = window.setTimeout(() => {
      const saved = store.get(CURRENCY) as Currency | null;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      setCurrency(saved && currencies.includes(saved) ? saved : guessCurrency(currencies, navigator.languages ?? [navigator.language], tz));
      const n = store.get(SAVED);
      if (n && NAME.test(n)) {
        setName(n);
        lookUp(api, n).then((p) => typeof p !== "string" && setMe(p));
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [api, currencies]);

  // Textures: the skin (Horizon's stand-in until a name is found), then every item's.
  const skinUrl = me?.skin ?? null;
  useEffect(() => {
    if (!gl) return;
    let live = true;
    skinTexture(gl, skinUrl)
      .catch(() => skinTexture(gl, null))
      .then((k) => live && setSkin(k));
    return () => {
      live = false;
    };
  }, [gl, skinUrl]);
  useEffect(() => {
    if (!gl) return;
    let live = true;
    itemTextures(gl, art).then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [gl, art]);

  const find = async (e: FormEvent) => {
    e.preventDefault();
    const wanted = name.trim();
    setFinding(true);
    setNameError(null);
    const p = await lookUp(api, wanted);
    setFinding(false);
    if (typeof p === "string") return setNameError(p);
    setMe(p);
    store.set(SAVED, p.name);
  };
  const forget = () => {
    setMe(null);
    setName("");
    store.set(SAVED, null);
  };

  const owned = me?.owned ?? new Set<string>();
  const slim = me?.slim ?? false;
  const shownSkin = ready ? skin : null;
  const you = me?.name ?? "You";
  const fmt = (m: number) => formatPrice(m, currency);
  const minSupport = catalogue.supporter ? (catalogue.supporter.min[currency] ?? catalogue.supporter.min.USD!) : 0;
  /** What a tile says under its name: its price, or that the account owns it. */
  const itemLabel = (item: ShopItem) => {
    if (owned.has(item.id)) return "Owned";
    if (item.founder) return claimOpen ? "Free" : "";
    if (item.supporter) return catalogue.supporter ? `From ${fmt(minSupport)}` : "";
    const p = item.prices?.[currency] ?? item.prices?.USD;
    return p !== undefined ? fmt(p) : "";
  };
  const setLabel = (set: ShopSet) => {
    const p = setPrice(set, items, owned, currency);
    return p.owned === set.items.length ? "Owned" : fmt(p.amount);
  };

  const groups = collectionGroups(catalogue);
  const hero = groups.find((g) => g.pack);
  const supporter = catalogue.supporter ? items.get(catalogue.supporter.item) : undefined;
  const supporterTitle = catalogue.collections.find((c) => c.id === supporter?.collection)?.name ?? "Support Horizon";
  const looksOf = (set: ShopSet) => groups.find((g) => g.pack?.id === set.id)?.sets ?? [];

  const itemTile = (item: ShopItem) => (
    <Tile key={item.id} title={item.name} price={itemLabel(item)} background={tone(SLOT_TONE[item.slot])} onOpen={() => setOffer(item.supporter ? { kind: "supporter", item } : { kind: "item", item })}>
      <ItemPicture item={item} art={artById.get(item.id)} skin={shownSkin} slim={slim} name={you} raise={0.08} />
    </Tile>
  );
  const setTile = (set: ShopSet, i: number) => {
    const { worn, emote } = lookArt(set, items, artById);
    return (
      <Tile key={set.id} title={set.name} price={setLabel(set)} background={tone(LOOK_TONES[i % LOOK_TONES.length], 0.3)} tall big onOpen={() => setOffer({ kind: "look", set })}>
        <Thumb items={worn} emote={emote} skin={shownSkin} slim={slim} whole raise={0.05} label={`${set.name} on ${me ? me.name : "your player"}`} />
      </Tile>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <h1 id="shop-title" className="font-display text-[clamp(2.5rem,6vw,4rem)] leading-none font-semibold tracking-[-0.04em] text-white">
          Shop
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {me ? (
            <div className="flex h-11 items-center gap-2.5 rounded-[10px] bg-white/[0.08] pr-1 pl-2">
              <SkinFace skin={me.skin} name={me.name} size={28} />
              <span className="text-[15px] font-medium text-white">{me.name}</span>
              <button type="button" onClick={forget} className={`${SMALL} text-white/65 hover:bg-white/[0.08] hover:text-white`}>
                Change<span className="sr-only"> the Minecraft name</span>
              </button>
            </div>
          ) : (
            <form onSubmit={find} noValidate className="flex gap-2">
              <label htmlFor="shop-name" className="sr-only">
                Your Minecraft name, to see everything on your own skin
              </label>
              <input
                id="shop-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={16}
                placeholder="Your Minecraft name"
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "shop-name-error" : undefined}
                className={`${INPUT} w-[min(13rem,52vw)]`}
              />
              <button type="submit" className={QUIET} disabled={finding || !name.trim()}>
                {finding ? "Looking…" : "Show me"}
              </button>
            </form>
          )}
          {selling && currencies.length > 1 && (
            <select
              aria-label="Currency"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value as Currency);
                store.set(CURRENCY, e.target.value);
              }}
              className="h-11 rounded-[10px] bg-white/[0.08] px-3 text-[15px] text-white outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff]"
            >
              {currencies.map((c) => (
                <option key={c} value={c} className="bg-[#120c24]">
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {nameError && (
        <p id="shop-name-error" role="alert" className="mt-3 text-right text-sm text-[#ffb4a8]">
          {nameError}
        </p>
      )}

      {hero?.pack && (
        <Hero
          pack={hero.pack}
          collection={hero.name}
          looks={hero.sets}
          items={items}
          art={artById}
          skin={shownSkin}
          slim={slim}
          price={setLabel(hero.pack)}
          onOpen={() => setOffer({ kind: "pack", set: hero.pack! })}
        />
      )}

      {groups.map((g) => (
        <div key={g.id}>
          {(g.sets.length > 0 || (g.pack && g !== hero)) && (
            <Row id={`looks-${g.id}`} title={g.pack ? "Looks" : g.name} looks>
              {[...(g.pack && g !== hero ? [g.pack] : []), ...g.sets].map(setTile)}
            </Row>
          )}
          {g.items.length > 0 && (
            <Row id={`c-${g.id}`} title={g.name}>
              {[...g.items].sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot)).map(itemTile)}
            </Row>
          )}
        </div>
      ))}

      {supporter && (
        <Row id="supporter-title" title={supporterTitle}>
          {itemTile(supporter)}
        </Row>
      )}

      <Detail
        offer={offer}
        looks={offer && "set" in offer ? looksOf(offer.set) : []}
        onClose={() => setOffer(null)}
        catalogue={catalogue}
        items={items}
        art={artById}
        me={me}
        skin={shownSkin}
        slim={slim}
        currency={currency}
        api={api}
        claimOpen={claimOpen}
        onClaim={() => {
          setOffer(null);
          window.setTimeout(() => document.getElementById("claim")?.scrollIntoView(), 0);
        }}
      />
    </div>
  );
}

// ── tiles ──

function Row({ id, title, looks = false, children }: { id: string; title: string; looks?: boolean; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-14 sm:mt-16">
      <h2 id={id} className="font-display text-[clamp(1.4rem,2.6vw,1.9rem)] leading-tight font-semibold tracking-[-0.02em] text-white">
        {title}
      </h2>
      <ul
        className={
          looks
            ? "-mx-6 mt-4 grid snap-x snap-mandatory auto-cols-[76%] grid-flow-col gap-3 overflow-x-auto px-6 pt-1 pb-2 [scrollbar-width:none] sm:mx-0 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0"
            : "mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5"
        }
      >
        {children}
      </ul>
    </section>
  );
}

const LIFT =
  "transition-[translate,box-shadow] duration-200 ease-out hover:-translate-y-1.5 hover:shadow-[0_22px_44px_-14px_rgb(0_0_0/0.85),0_0_0_1px_rgb(255_255_255/0.16)] focus-visible:-translate-y-1.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0";

/** A big tile: the thing itself, its name and its price, nothing else. */
function Tile({ title, price, background, tall = false, big = false, onOpen, children }: { title: string; price: string; background: string; tall?: boolean; big?: boolean; onOpen: () => void; children: ReactNode }) {
  return (
    <li className="snap-start">
      <button
        type="button"
        onClick={onOpen}
        aria-label={price ? `${title}, ${price}` : title}
        aria-haspopup="dialog"
        className={`group relative block w-full overflow-hidden rounded-2xl text-left shadow-[0_0_0_1px_rgb(255_255_255/0.07)] outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] ${LIFT}`}
        style={{ background }}
      >
        <span className={`block ${tall ? "aspect-[3/4]" : "aspect-[4/5]"}`}>{children}</span>
        <span className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-8 sm:px-4 ${big ? "pb-4" : "pb-3"}`}>
          <span className={`block truncate font-display leading-tight font-semibold text-white ${big ? "text-[22px]" : "text-[16px] sm:text-[17px]"}`}>{title}</span>
          {price && <span className={`mt-0.5 block font-medium text-white/80 tabular-nums ${big ? "text-[17px]" : "text-[15px]"}`}>{price}</span>}
        </span>
      </button>
    </li>
  );
}

/** An item's picture: on the player (or alone, for what floats), a still at an emote's fullest move, a name tag as is. */
function ItemPicture({ item, art, skin, slim, name, small = false, raise = 0 }: { item: ShopItem; art?: ItemArt; skin: string | null; slim: boolean; name: string; small?: boolean; raise?: number }) {
  if (item.slot === "name_tag")
    return (
      <span className={`flex h-full items-center justify-center ${raise ? "pb-12" : ""}`}>
        <span className={small ? "scale-75" : "scale-[1.35] sm:scale-150"}>
          <NameTag name={name} art={art} big />
        </span>
      </span>
    );
  if (!art) return null;
  if (item.slot === "emote") return <Thumb items={[]} slot="emote" emote={art} skin={skin} slim={slim} raise={raise} label={`${item.name}, played by your player`} />;
  return <Thumb items={[art]} slot={item.slot} skin={skin} slim={slim} raise={raise} label={`${item.name} on your player`} />;
}

/** The season's pack, first on the page: its looks side by side, its name, its price, one button. */
function Hero(props: {
  pack: ShopSet;
  collection: string;
  looks: ShopSet[];
  items: Map<string, ShopItem>;
  art: Map<string, ItemArt>;
  skin: string | null;
  slim: boolean;
  price: string;
  onOpen: () => void;
}) {
  const { pack } = props;
  const shown = props.looks.length ? props.looks : [pack];
  return (
    <section
      aria-labelledby="pack-title"
      className="relative mt-8 overflow-hidden rounded-3xl shadow-[0_0_0_1px_rgb(255_255_255/0.09)]"
      style={{ background: "radial-gradient(80% 110% at 70% 0%, #f59e0b40, transparent 70%), radial-gradient(60% 90% at 0% 100%, #6b4bff3a, transparent 70%), linear-gradient(180deg, #24163a, #0d0920)" }}
    >
      <div className="grid lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        <button
          type="button"
          onClick={props.onOpen}
          aria-hidden
          tabIndex={-1}
          className="relative block h-[clamp(320px,80vw,460px)] cursor-pointer outline-none lg:order-2 lg:h-[600px]"
        >
          {/* The looks side by side, a little over each other (their pictures are see-through round the player). */}
          {shown.map((look, i) => {
            const { worn, emote } = lookArt(look, props.items, props.art);
            const width = shown.length === 1 ? 100 : 46;
            const left = shown.length === 1 ? 0 : (i * (100 - width)) / (shown.length - 1);
            return (
              <span key={look.id} className="absolute inset-y-0 block" style={{ left: `${left}%`, width: `${width}%`, zIndex: i === 1 ? 2 : 1 }}>
                <Thumb items={worn} emote={emote} skin={props.skin} slim={props.slim} whole label={look.name} />
              </span>
            );
          })}
        </button>
        <div className="flex flex-col justify-end p-6 pt-2 sm:p-10 lg:order-1 lg:pt-10">
          <p className="text-[15px] font-medium tracking-wide text-[#fcd38a]">{props.collection}</p>
          <h2 id="pack-title" className="mt-2 font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-white">
            {pack.name}
          </h2>
          <p className="mt-6 font-display text-[clamp(1.75rem,3vw,2.25rem)] leading-none font-semibold text-white tabular-nums">{props.price}</p>
          <button type="button" onClick={props.onOpen} aria-haspopup="dialog" className={`${BUTTON} mt-6 h-12 self-start px-7 text-[16px]`}>
            See the pack
          </button>
        </div>
      </div>
    </section>
  );
}

// ── the detail: the live 3D preview, what an offer holds, Buy and Gift ──

type DetailProps = {
  offer: Offer | null;
  looks: ShopSet[];
  onClose: () => void;
  catalogue: Catalogue;
  items: Map<string, ShopItem>;
  art: Map<string, ItemArt>;
  me: Player | null;
  skin: string | null;
  slim: boolean;
  currency: Currency;
  api: string;
  claimOpen: boolean;
  onClaim: () => void;
};

function Detail(props: DetailProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const { offer } = props;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (offer && !d.open) d.showModal();
    if (!offer && d.open) d.close();
    if (!offer) return;
    // The page under the sheet stays where it was.
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, [offer]);
  return (
    <dialog
      ref={ref}
      onClose={props.onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      aria-labelledby="detail-title"
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-[#0f0a1f] p-0 text-white backdrop:bg-black/75 backdrop:backdrop-blur-sm sm:m-auto sm:h-[min(880px,calc(100dvh-48px))] sm:w-[min(1240px,calc(100vw-48px))] sm:rounded-3xl sm:shadow-[0_0_0_1px_rgb(255_255_255/0.1),0_40px_120px_-20px_rgb(0_0_0/0.9)]"
    >
      {offer && <DetailBody key={offerId(offer)} {...props} offer={offer} close={() => ref.current?.close()} />}
    </dialog>
  );
}

function DetailBody(props: DetailProps & { offer: Offer; close: () => void }) {
  const { offer, items, art } = props;
  const set = "set" in offer ? offer.set : null;
  const single = "item" in offer ? offer.item : null;
  const members = set ? set.items.map((id) => items.get(id)).filter((i): i is ShopItem => !!i) : [];

  // What the player wears: one item per slot. A pack starts on its first look; a look and an item on themselves.
  const [trying, setTrying] = useState<Partial<Record<ShopSlot, string>>>(() => {
    const ids = offer.kind === "pack" && props.looks.length ? props.looks[0].items : set ? set.items : [single!.id];
    const out: Partial<Record<ShopSlot, string>> = {};
    for (const id of ids) {
      const item = items.get(id);
      if (item && !out[item.slot]) out[item.slot] = id;
    }
    return out;
  });
  const [focus, setFocus] = useState<{ at: Focus; n: number }>({ at: single && single.slot !== "name_tag" ? single.slot : "all", n: 0 });
  const tryOn = (ids: string[], at: Focus) => {
    setTrying((t) => {
      const next = { ...t };
      for (const id of ids) {
        const item = items.get(id);
        if (item) next[item.slot] = id;
      }
      return next;
    });
    setFocus((f) => ({ at, n: f.n + 1 }));
  };

  const worn = (Object.entries(trying) as [ShopSlot, string][])
    .filter(([slot]) => slot !== "emote")
    .map(([, id]) => art.get(id))
    .filter((a): a is ItemArt => !!a);
  const playing = trying.emote ? art.get(trying.emote) : undefined;
  const tagArt = trying.name_tag ? art.get(trying.name_tag) : undefined;
  const you = props.me?.name ?? "You";
  const title = set ? set.name : single!.name;
  const label =
    (worn.length ? `Your player wearing ${worn.map((a) => items.get(a.id)?.name ?? a.id).join(", ")}.` : "Your player.") +
    (playing ? ` Playing the ${items.get(playing.id)?.name ?? playing.id} emote.` : "");
  const eyebrow =
    offer.kind === "pack" ? `${set!.items.length} items` : offer.kind === "look" ? `Look · ${set!.items.length} items` : offer.kind === "supporter" ? "Name tag · pay what you want" : SLOT_LABEL[single!.slot];

  return (
    <div className="relative h-full overflow-y-auto lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:overflow-hidden">
      <button
        type="button"
        onClick={props.close}
        className="absolute top-3 right-3 z-10 inline-flex size-11 items-center justify-center rounded-full bg-black/45 text-[22px] leading-none text-white/85 outline-none hover:bg-black/65 hover:text-white focus-visible:ring-2 focus-visible:ring-[#a98fff]"
      >
        <span aria-hidden>×</span>
        <span className="sr-only">Close</span>
      </button>
      <div className="relative h-[58svh] bg-[radial-gradient(110%_80%_at_50%_100%,rgb(107_75_255/0.28),transparent_65%)] lg:h-full">
        <Viewer skin={props.skin} slim={props.slim} worn={worn} emote={playing} focus={focus.at} focusKey={focus.n} tag={<NameTag name={you} art={tagArt} big />} label={label} />
      </div>
      <div className="flex min-h-0 flex-col lg:overflow-hidden">
        <div className="p-5 pb-0 sm:p-8 sm:pb-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-6">
          <p className="pr-12 text-[14px] font-medium text-white/55">{eyebrow}</p>
          <h2 id="detail-title" className="mt-1 pr-12 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-white">
            {title}
          </h2>
          {single?.line && <p className="mt-3 text-[15px] leading-relaxed text-white/65">{single.line}</p>}

          {offer.kind === "pack" && props.looks.length > 0 && (
            <MiniTiles label="Wear a look">
              {props.looks.map((look, i) => {
                const on = look.items.every((id) => Object.values(trying).includes(id) || items.get(id)?.slot === "name_tag" || !art.get(id));
                const { worn: lw, emote } = lookArt(look, items, art);
                return (
                  <Mini key={look.id} name={look.name.replace(/ look$/i, "")} on={on} background={tone(LOOK_TONES[i % LOOK_TONES.length], 0.3)} onClick={() => tryOn(look.items, "all")} tall>
                    <Thumb items={lw} emote={emote} skin={props.skin} slim={props.slim} whole label={look.name} />
                  </Mini>
                );
              })}
            </MiniTiles>
          )}
          {members.length > 0 && (
            <MiniTiles label={offer.kind === "pack" ? "Everything in it" : "In this look"} many>
              {[...members]
                .sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot))
                .map((item) => (
                  <Mini key={item.id} name={item.name} on={trying[item.slot] === item.id} background={tone(SLOT_TONE[item.slot], 0.2)} onClick={() => tryOn([item.id], item.slot === "name_tag" ? "all" : item.slot)}>
                    <ItemPicture item={item} art={art.get(item.id)} skin={props.skin} slim={props.slim} name={you} small />
                  </Mini>
                ))}
            </MiniTiles>
          )}

        </div>
        <div className="shrink-0 p-5 pt-8 sm:p-8 lg:border-t lg:border-white/[0.07] lg:pt-6">
          <BuyBox {...props} />
        </div>
      </div>
    </div>
  );
}

function MiniTiles({ label, many = false, children }: { label: string; many?: boolean; children: ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-[13px] font-medium tracking-wide text-white/50 uppercase">{label}</h3>
      <ul className={`mt-2.5 grid gap-2 ${many ? "grid-cols-4 sm:grid-cols-5 lg:grid-cols-4" : "grid-cols-3"}`}>{children}</ul>
    </div>
  );
}

function Mini({ name, on, background, tall = false, onClick, children }: { name: string; on: boolean; background: string; tall?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={on}
        title={name}
        className={`block w-full overflow-hidden rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] ${on ? "shadow-[0_0_0_2px_#a98fff]" : "shadow-[0_0_0_1px_rgb(255_255_255/0.08)] hover:shadow-[0_0_0_1px_rgb(255_255_255/0.25)]"}`}
        style={{ background }}
      >
        <span className={`block ${tall ? "aspect-[3/4]" : "aspect-square"}`} aria-hidden>
          {children}
        </span>
        <span className="block truncate px-1.5 py-1 text-[12px] font-medium text-white/80">
          {name}
          <span className="sr-only">: try it on</span>
        </span>
      </button>
    </li>
  );
}

// ── Buy and Gift: one offer, one Paddle checkout ──

function BuyBox({ offer, catalogue, items, me, currency, api, claimOpen, onClaim }: DetailProps & { offer: Offer }) {
  const [gift, setGift] = useState(false);
  const [mineName, setMineName] = useState("");
  const [mine, setMine] = useState<Player | null>(null);
  const [friendName, setFriendName] = useState("");
  const [friend, setFriend] = useState<Player | null>(null);
  const [amountText, setAmountText] = useState("");
  const [busy, setBusy] = useState<"finding" | "paying" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const fmt = (m: number) => formatPrice(m, currency);

  const recipient = gift ? friend : (me ?? mine);
  const owned = recipient?.owned ?? (gift ? new Set<string>() : (me?.owned ?? new Set<string>()));
  const id = offerId(offer);

  // The founder set is claimed, never bought: its own flow lower on the page.
  if (offer.kind === "item" && offer.item.founder) {
    return owned.has(id) ? (
      <p className="font-display text-[28px] font-semibold text-white/60">Owned</p>
    ) : claimOpen ? (
      <div>
        <p className="font-display text-[clamp(2rem,4vw,2.5rem)] leading-none font-semibold text-white">Free</p>
        <button type="button" onClick={onClaim} className={`${BUTTON} mt-5 h-12 w-full`}>
          Claim the founder set
        </button>
      </div>
    ) : null;
  }

  // What it costs `recipient` (minor units), and whether it owns all of it already.
  let amount: number | null = null;
  let all = false;
  let without = 0;
  const support = offer.kind === "supporter" ? catalogue.supporter : null;
  const min = support ? (support.min[currency] ?? support.min.USD!) : 0;
  const max = support ? (support.max[currency] ?? support.max.USD!) : 0;
  if (offer.kind === "pack" || offer.kind === "look") {
    const p = setPrice(offer.set, items, owned, currency);
    amount = p.amount;
    all = p.owned === offer.set.items.length;
    without = p.owned;
  } else if (support) {
    const raw = amountText.trim().replace(",", ".");
    amount = raw ? Math.round(Number(raw) * 100) : min;
    all = owned.has(id);
  } else {
    amount = offer.kind === "item" ? (offer.item.prices?.[currency] ?? null) : null;
    all = owned.has(id);
  }
  if (amount === null) return null;
  const amountOk = !support || (Number.isFinite(amount) && amount >= min && amount <= max);

  const findFor = async (e: FormEvent, who: "friend" | "mine") => {
    e.preventDefault();
    setBusy("finding");
    setError(null);
    const p = await lookUp(api, (who === "friend" ? friendName : mineName).trim());
    setBusy(null);
    if (typeof p === "string") return setError(p);
    if (who === "friend") setFriend(p);
    else setMine(p);
  };

  const pay = async () => {
    if (!recipient || amount === null) return;
    if (!amountOk) return setError(`Any amount from ${fmt(min)} to ${fmt(max)}.`);
    setBusy("paying");
    setError(null);
    try {
      const { ok, body } = await call(api, "/v1/web/checkout", {
        method: "POST",
        body: JSON.stringify({ name: recipient.name, items: [id], currency, ...(support ? { amount } : {}), ...(gift ? { gift: true } : {}) }),
      });
      const txn = typeof body.transaction_id === "string" && TXN.test(body.transaction_id) ? body.transaction_id : null;
      if (!ok || !txn || body.uuid !== recipient.uuid) {
        setBusy(null);
        return setError(errorText(body));
      }
      // Paddle.js runs on /shop/pay, the account's default payment link, which opens this transaction's checkout.
      router.push(`/shop/pay?_ptxn=${txn}`);
    } catch {
      setBusy(null);
      setError(UNREACHABLE);
    }
  };

  return (
    <div>
      {all ? (
        <p className="font-display text-[clamp(2rem,4vw,2.5rem)] leading-none font-semibold text-white/60">{recipient && gift ? `${recipient.name} owns it` : "Owned"}</p>
      ) : (
        <p className="font-display text-[clamp(2rem,4vw,2.5rem)] leading-none font-semibold text-white tabular-nums">
          {support && !amountText.trim() ? <span className="text-[0.55em] font-medium text-white/60">From </span> : null}
          {Number.isFinite(amount) ? fmt(amount) : fmt(min)}
        </p>
      )}
      {!all && without > 0 && <p className="mt-1.5 text-[14px] text-white/55">Without what {recipient?.name ?? "you"} already own{recipient ? "s" : ""}</p>}

      {support && !all && (
        <div className="mt-4 flex items-center gap-3">
          <label htmlFor="supporter-amount" className="text-[15px] text-white/70">
            Your amount
          </label>
          <div className="relative">
            <input
              id="supporter-amount"
              inputMode="decimal"
              value={amountText}
              onChange={(e) => {
                setAmountText(e.target.value);
                setError(null);
              }}
              placeholder={(min / 100).toFixed(2)}
              className={`${INPUT} w-36 pr-14 tabular-nums`}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-white/45">{currency}</span>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3">
        {gift ? (
          friend ? (
            <Recipient player={friend} note="gets it, as a gift." onChange={() => setFriend(null)} />
          ) : (
            <NameForm id="gift-name" label="Your friend's Minecraft name" value={friendName} onChange={setFriendName} onSubmit={(e) => findFor(e, "friend")} busy={busy === "finding"} />
          )
        ) : me ? (
          <Recipient player={me} note="gets it." />
        ) : mine ? (
          <Recipient player={mine} note="gets it." onChange={() => setMine(null)} />
        ) : (
          <NameForm id="mine-name" label="Your Minecraft name: it goes to this account" value={mineName} onChange={setMineName} onSubmit={(e) => findFor(e, "mine")} busy={busy === "finding"} />
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={pay} disabled={!recipient || all || busy !== null} className={`${BUTTON} h-12 flex-1 text-[16px]`}>
          {busy === "paying" ? "Opening Paddle…" : gift ? "Buy as a gift" : "Buy"}
        </button>
        <button
          type="button"
          onClick={() => {
            setGift(!gift);
            setError(null);
          }}
          aria-pressed={gift}
          className={`${QUIET} h-12 px-5 text-[16px]`}
        >
          {gift ? "For me" : "Gift"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[15px] text-[#ffb4a8]">
          {error}
        </p>
      )}
      <p className="mt-4 text-[15px] leading-relaxed text-white">Ask whoever pays before you buy. Refunds within 14 days for any reason.</p>
      <p className="mt-1 text-[13px] text-white/45">
        {currency === "USD" ? "US sales tax is added where a state charges it." : "VAT included where it applies."} Paddle&apos;s checkout shows the final amount.
      </p>
    </div>
  );
}

// `pack`: the collection's pack, shown first; `sets` are then the looks inside it.
type Group = { id: string; name: string; line?: string; pack?: ShopSet; sets: ShopSet[]; items: ShopItem[] };

/** Cards by collection, in the catalogue's order; the founder set after them (while its claim is open). */
function collectionGroups(c: Catalogue): Group[] {
  const groups: Group[] = c.collections.map((col) => ({ id: col.id, name: col.name, line: col.line, sets: [], items: [] }));
  const byId = new Map(groups.map((g) => [g.id, g]));
  const packs = new Map(c.collections.filter((col) => col.pack).map((col) => [col.pack!, col.id]));
  const other: Group = { id: "more", name: groups.length ? "More" : "The shop", sets: [], items: [] };
  const founder: Group = { id: "founder", name: "The founder set", line: "Free for the players who were here first, while the claim below is open.", sets: [], items: [] };
  for (const s of c.sets) {
    const g = byId.get(s.collection ?? "") ?? other;
    if (packs.get(s.id) === g.id) g.pack = s;
    else g.sets.push(s);
  }
  for (const i of c.items) {
    if (i.supporter) continue;
    if (i.founder) founder.items.push(i);
    else (byId.get(i.collection ?? "") ?? other).items.push(i);
  }
  return [...groups, other, founder].filter((g) => g.pack || g.sets.length || g.items.length);
}

/** What a set's picture shows: its worn items (one per slot; a name tag is drawn by the page) and its first emote. */
function lookArt(set: ShopSet, items: Map<string, ShopItem>, art: Map<string, ItemArt>) {
  const worn: ItemArt[] = [];
  const taken = new Set<ShopSlot>();
  let emote: ItemArt | undefined;
  for (const id of set.items) {
    const a = art.get(id);
    const slot = items.get(id)?.slot;
    if (!a || !slot || slot === "name_tag") continue;
    if (slot === "emote") emote ??= a;
    else if (!taken.has(slot)) {
      taken.add(slot);
      worn.push(a);
    }
  }
  return { worn, emote };
}

function Recipient({ player, note, onChange }: { player: Player; note: string; onChange?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
      <SkinFace skin={player.skin} name={player.name} size={36} />
      <p className="min-w-0 flex-1 text-[15px] text-white/70">
        <span className="font-medium text-white">{player.name}</span> {note}
      </p>
      {onChange && (
        <button type="button" onClick={onChange} className={`${SMALL} text-white/70 hover:bg-white/[0.06] hover:text-white`}>
          Change
        </button>
      )}
    </div>
  );
}

function NameForm({ id, label, value, onChange, onSubmit, busy }: { id: string; label: ReactNode; value: string; onChange: (v: string) => void; onSubmit: (e: FormEvent) => void; busy: boolean }) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor={id} className="text-sm text-white/70">
        {label}
      </label>
      <div className="mt-1.5 flex gap-2">
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={16} className={INPUT} />
        <button type="submit" className={QUIET} disabled={busy || !value.trim()}>
          {busy ? "Looking…" : "Find"}
        </button>
      </div>
    </form>
  );
}
