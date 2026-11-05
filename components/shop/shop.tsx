"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { Catalogue, Currency, ItemArt, ShopItem, ShopSet, ShopSlot } from "@/components/shop-data";
import { SkinFace } from "@/components/shop/claim";
import { basketLines, formatPrice, guessCurrency, setPrice, usableCurrencies, type Basket } from "@/components/shop/pricing";
import { itemTextures, skinTexture } from "@/components/shop/renderer";
import { Thumb, useShopGL, Viewer, type Focus } from "@/components/shop/view3d";

// The shop on playhorizon.dev: your own skin in 3D, wearing what you try on. Type a Minecraft name and the cosmetics
// service looks it up at Mojang (its skin, slim or wide arms, what it owns); nobody signs in. Every price is the
// catalogue's, shown before anything is typed. The basket checks out in one Paddle transaction on /shop/pay, where
// Paddle.js lives. Calm on purpose: no timers, counts of buyers, scarcity or pop-ups.

export const SLOT_LABEL: Record<ShopSlot, string> = {
  head: "Head",
  torso: "Shirt",
  back: "Back",
  shoulder: "Shoulder pet",
  name_tag: "Name tag",
  companion: "Companion",
  trail: "Trail",
  aura: "Aura",
};

type Player = { uuid: string; name: string; skin: string | null; slim: boolean; owned: Set<string> };

const NAME = /^[A-Za-z0-9_]{1,16}$/;
const TXN = /^txn_[a-z0-9]{26}$/;
const SAVED = "horizon-shop:name";
const CURRENCY = "horizon-shop:currency";

const BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#6b4bff] px-4 text-[15px] font-medium text-white transition-colors outline-none hover:bg-[#7a5dff] focus-visible:ring-2 focus-visible:ring-[#a98fff] disabled:cursor-not-allowed disabled:opacity-60";
const QUIET =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-white/[0.08] px-4 text-[15px] font-medium text-white transition-colors outline-none hover:bg-white/[0.14] focus-visible:ring-2 focus-visible:ring-[#a98fff] disabled:cursor-not-allowed disabled:opacity-60";
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
  owned: "That account already owns everything in the basket.",
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
  // What the model wears: one item per slot. It starts with the first set (or the founder set) on.
  const [trying, setTrying] = useState<Partial<Record<ShopSlot, string>>>(() => {
    const first = catalogue.sets[0]?.items ?? catalogue.items.filter((i) => i.founder).map((i) => i.id);
    const out: Partial<Record<ShopSlot, string>> = {};
    for (const id of first) {
      const item = catalogue.items.find((i) => i.id === id);
      if (item) out[item.slot] = id;
    }
    return out;
  });
  const [focus, setFocus] = useState<{ at: Focus; n: number }>({ at: "all", n: 0 });
  const [basket, setBasket] = useState<Basket>({ items: [], supporter: null });

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
  const worn = (Object.values(trying) as string[]).map((id) => artById.get(id)).filter((a): a is ItemArt => !!a);
  const tagItem = (Object.entries(trying) as [ShopSlot, string][]).find(([slot]) => slot === "name_tag")?.[1];
  const tagArt = tagItem ? artById.get(tagItem) : undefined;

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
  const takeOff = (slot: ShopSlot) =>
    setTrying((t) => {
      const next = { ...t };
      delete next[slot];
      return next;
    });

  const add = (id: string) =>
    setBasket((b) => {
      if (b.items.includes(id)) return b;
      const set = catalogue.sets.find((s) => s.id === id);
      // A set takes the place of its own items already in the basket.
      const rest = set ? b.items.filter((i) => !set.items.includes(i)) : b.items;
      return { ...b, items: [...rest, id] };
    });
  const remove = (id: string) => setBasket((b) => (id === catalogue.supporter?.item ? { ...b, supporter: null } : { ...b, items: b.items.filter((i) => i !== id) }));
  const inBasket = (id: string) => basket.items.includes(id) || basket.items.some((b) => catalogue.sets.find((s) => s.id === b)?.items.includes(id));

  const price = (minor: number) => formatPrice(minor, currency);
  const groups = collectionGroups(catalogue);
  const wornLabel = worn.length ? `Your player wearing ${worn.map((a) => items.get(a.id)?.name ?? a.id).join(", ")}.` : "Your player, wearing nothing from the shop.";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
      {/* The viewer, and who it shows. */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div id="viewer" className="scroll-mt-24 overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08]">
          <div className="relative h-[min(68svh,520px)] min-h-[340px] bg-[radial-gradient(120%_90%_at_50%_100%,rgb(107_75_255/0.22),transparent_60%)]">
            <Viewer skin={shownSkin} slim={slim} worn={worn} focus={focus.at} focusKey={focus.n} tag={<NameTag name={me?.name ?? "You"} art={tagArt} big />} label={wornLabel} />
            {gl && !shownSkin && <div aria-hidden className="absolute inset-0 animate-pulse bg-white/[0.03] motion-reduce:animate-none" />}
          </div>
          {worn.length > 0 && (
            <ul aria-label="What your player is trying on" className="flex flex-wrap gap-1.5 border-t border-white/[0.06] px-3 py-3">
              {(Object.entries(trying) as [ShopSlot, string][]).map(([slot, id]) => (
                <li key={slot}>
                  <button type="button" onClick={() => takeOff(slot)} className={`${SMALL} bg-white/[0.06] text-white/80 hover:bg-white/[0.1] hover:text-white`}>
                    {items.get(id)?.name ?? id}
                    <span aria-hidden className="text-white/45">
                      ×
                    </span>
                    <span className="sr-only">: take it off</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-white/[0.06] p-4 backdrop-blur-xl sm:p-5">
          {me ? (
            <div className="flex items-center gap-3">
              <SkinFace skin={me.skin} name={me.name} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[19px] leading-tight font-semibold text-white">{me.name}</p>
                <p className="text-sm text-white/55">{me.owned.size ? `Owns ${me.owned.size} item${me.owned.size === 1 ? "" : "s"} from the shop` : "Your skin, as the game draws it"}</p>
              </div>
              <button type="button" onClick={forget} className={`${SMALL} text-white/70 hover:bg-white/[0.06] hover:text-white`}>
                Change
              </button>
            </div>
          ) : (
            <form onSubmit={find} noValidate>
              <label htmlFor="shop-name" className="font-display text-[17px] font-semibold text-white">
                See it on your skin
              </label>
              <p className="mt-1 text-sm text-white/60">Your Minecraft: Java Edition name. No sign-in: the skin comes from Mojang&apos;s public profile.</p>
              <div className="mt-3 flex gap-2">
                <input
                  id="shop-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  maxLength={16}
                  placeholder="e.g. Notch"
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? "shop-name-error" : undefined}
                  className={INPUT}
                />
                <button type="submit" className={BUTTON} disabled={finding || !name.trim()}>
                  {finding ? "Looking…" : "Show me"}
                </button>
              </div>
              {nameError && (
                <p id="shop-name-error" role="alert" className="mt-2 text-sm text-[#ffb4a8]">
                  {nameError}
                </p>
              )}
            </form>
          )}
          {selling && currencies.length > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
              <label htmlFor="shop-currency" className="text-sm text-white/60">
                Prices in
              </label>
              <select
                id="shop-currency"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value as Currency);
                  store.set(CURRENCY, e.target.value);
                }}
                className="h-9 rounded-lg bg-white/[0.08] px-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff]"
              >
                {currencies.map((c) => (
                  <option key={c} value={c} className="bg-[#120c24]">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
          {(basket.items.length > 0 || basket.supporter !== null) && (
            <a href="#basket" className={`${QUIET} mt-4 w-full`}>
              Basket: {basket.items.length + (basket.supporter !== null ? 1 : 0)} · {price(basketLines(basket, catalogue, owned, currency).total)}
            </a>
          )}
        </div>
      </div>

      {/* The cards. */}
      <div className="min-w-0">
        {groups.map((g) => (
          <section key={g.id} aria-labelledby={`c-${g.id}`} className="mb-14 last:mb-0">
            <h2 id={`c-${g.id}`} className="font-display text-[clamp(1.6rem,3.5vw,2.25rem)] leading-tight font-semibold tracking-[-0.03em] text-white">
              {g.name}
            </h2>
            {g.line && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/65">{g.line}</p>}
            {g.sets.length > 0 && (
              <ul className="mt-6 grid gap-3">
                {g.sets.map((s) => (
                  <SetCard
                    key={s.id}
                    set={s}
                    items={items}
                    art={artById}
                    owned={owned}
                    currency={currency}
                    skin={shownSkin}
                    slim={slim}
                    added={basket.items.includes(s.id)}
                    onTry={() => tryOn(s.items, "all")}
                    onAdd={() => add(s.id)}
                  />
                ))}
              </ul>
            )}
            <ul className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-3">
              {g.items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  art={artById.get(item.id)}
                  price={item.prices ? price(item.prices[currency] ?? item.prices.USD!) : item.price}
                  owned={owned.has(item.id)}
                  wearing={trying[item.slot] === item.id}
                  added={inBasket(item.id)}
                  skin={shownSkin}
                  slim={slim}
                  name={me?.name ?? "You"}
                  claimOpen={claimOpen}
                  onTry={() => (trying[item.slot] === item.id ? takeOff(item.slot) : tryOn([item.id], item.slot))}
                  onAdd={item.prices ? () => add(item.id) : undefined}
                />
              ))}
            </ul>
          </section>
        ))}

        {catalogue.supporter && items.get(catalogue.supporter.item) && (
          <SupporterCard
            item={items.get(catalogue.supporter.item)!}
            art={artById.get(catalogue.supporter.item)}
            min={catalogue.supporter.min[currency] ?? catalogue.supporter.min.USD!}
            max={catalogue.supporter.max[currency] ?? catalogue.supporter.max.USD!}
            currency={currency}
            owned={owned.has(catalogue.supporter.item)}
            amount={basket.supporter}
            name={me?.name ?? "You"}
            onTry={() => tryOn([catalogue.supporter!.item], "name_tag")}
            onAdd={(amount) => setBasket((b) => ({ ...b, supporter: amount }))}
          />
        )}

        {selling && (
          <Checkout
            api={api}
            catalogue={catalogue}
            basket={basket}
            currency={currency}
            me={me}
            onRemove={remove}
          />
        )}
      </div>
    </div>
  );
}

type Group = { id: string; name: string; line?: string; sets: ShopSet[]; items: ShopItem[] };

/** Cards by collection, in the catalogue's order; the founder set after them (while its claim is open). */
function collectionGroups(c: Catalogue): Group[] {
  const groups: Group[] = c.collections.map((col) => ({ id: col.id, name: col.name, line: col.line, sets: [], items: [] }));
  const byId = new Map(groups.map((g) => [g.id, g]));
  const other: Group = { id: "more", name: groups.length ? "More" : "The shop", sets: [], items: [] };
  const founder: Group = { id: "founder", name: "The founder set", line: "Free for the players who were here first, while the claim below is open.", sets: [], items: [] };
  for (const s of c.sets) (byId.get(s.collection ?? "") ?? other).sets.push(s);
  for (const i of c.items) {
    if (i.supporter) continue;
    if (i.founder) founder.items.push(i);
    else (byId.get(i.collection ?? "") ?? other).items.push(i);
  }
  return [...groups, other, founder].filter((g) => g.sets.length || g.items.length);
}

// ── cards ──

function ItemCard(props: {
  item: ShopItem;
  art?: ItemArt;
  price: string;
  owned: boolean;
  wearing: boolean;
  added: boolean;
  skin: string | null;
  slim: boolean;
  name: string;
  claimOpen: boolean;
  onTry: () => void;
  onAdd?: () => void;
}) {
  const { item, art } = props;
  return (
    <li className={`flex flex-col rounded-2xl bg-white/[0.06] p-2 ring-1 backdrop-blur-xl ${props.wearing ? "ring-[#a98fff]" : "ring-white/[0.06]"}`}>
      <button type="button" onClick={props.onTry} aria-pressed={props.wearing} className="group block rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff]">
        <span className="relative block aspect-square overflow-hidden rounded-xl bg-[#0b0718]/70">
          {item.slot === "name_tag" ? (
            <span className="flex h-full items-center justify-center">
              <NameTag name={props.name} art={art} />
            </span>
          ) : (
            art && <Thumb items={[art]} slot={item.slot} skin={props.skin} slim={props.slim} label={`${item.name} on your player`} />
          )}
          <span className="absolute right-2 bottom-2 rounded-md bg-black/50 px-2 py-1 text-[12px] font-medium text-white/85 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {props.wearing ? "Take off" : "Try on"}
          </span>
        </span>
        <span className="block px-1.5 pt-2.5">
          <span className="block font-display text-[16px] leading-tight font-semibold text-white">{item.name}</span>
          <span className="mt-0.5 block text-[13px] text-white/55">{SLOT_LABEL[item.slot]}</span>
        </span>
      </button>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-1.5 pt-2 pb-1">
        <span className="text-[15px] font-medium text-white tabular-nums">{props.owned ? <span className="text-white/60">Owned</span> : item.founder ? (props.claimOpen ? "Free" : "") : props.price}</span>
        {props.onAdd && !props.owned ? (
          props.added ? (
            <a href="#basket" className={`${SMALL} px-2 text-[#c4b5ff] hover:text-white`}>
              Added
            </a>
          ) : (
            <button type="button" onClick={props.onAdd} className={`${SMALL} bg-[#6b4bff] text-white hover:bg-[#7a5dff]`}>
              Add<span className="sr-only"> {item.name} to the basket</span>
            </button>
          )
        ) : item.founder && !props.owned ? (
          <a href="#claim" className={`${SMALL} text-[#c4b5ff] hover:text-white`}>
            Claim
          </a>
        ) : null}
      </div>
      {item.line && <p className="hidden px-1.5 pb-1.5 text-[13px] leading-relaxed text-white/55 sm:block">{item.line}</p>}
    </li>
  );
}

function SetCard(props: {
  set: ShopSet;
  items: Map<string, ShopItem>;
  art: Map<string, ItemArt>;
  owned: ReadonlySet<string>;
  currency: Currency;
  skin: string | null;
  slim: boolean;
  added: boolean;
  onTry: () => void;
  onAdd: () => void;
}) {
  const { set, currency } = props;
  const p = setPrice(set, props.items, props.owned, currency);
  const all = p.owned === set.items.length;
  const art = set.items.map((id) => props.art.get(id)).filter((a): a is ItemArt => !!a && props.items.get(a.id)?.slot !== "name_tag");
  const fmt = (m: number) => formatPrice(m, currency);
  return (
    <li className="grid gap-4 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/[0.06] backdrop-blur-xl sm:grid-cols-[180px_minmax(0,1fr)] sm:p-4">
      <button type="button" onClick={props.onTry} className="group relative block aspect-[4/5] overflow-hidden rounded-xl bg-[#0b0718]/70 outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] sm:aspect-auto sm:h-full sm:min-h-[220px]">
        <Thumb items={art} skin={props.skin} slim={props.slim} whole label={`Your player wearing the ${set.name}`} />
        <span className="absolute right-2 bottom-2 rounded-md bg-black/50 px-2 py-1 text-[12px] font-medium text-white/85">Try the set</span>
      </button>
      <div className="flex min-w-0 flex-col">
        <p className="text-[13px] font-medium text-white/55">Set · {set.items.length} items</p>
        <h3 className="mt-1 font-display text-[22px] leading-tight font-semibold tracking-[-0.01em] text-white">{set.name}</h3>
        {set.line && <p className="mt-1.5 text-[14px] leading-relaxed text-white/65">{set.line}</p>}
        <ul className="mt-3 grid gap-1 text-[14px]">
          {set.items.map((id) => {
            const item = props.items.get(id);
            const mine = props.owned.has(id);
            return (
              <li key={id} className="flex justify-between gap-3 text-white/75">
                <span className={mine ? "text-white/45 line-through decoration-white/30" : ""}>{item?.name ?? id}</span>
                <span className="text-white/55 tabular-nums">{mine ? "Owned" : item?.prices?.[currency] !== undefined ? fmt(item.prices[currency]!) : ""}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
          <div>
            {all ? (
              <p className="font-display text-[20px] font-semibold text-white/60">You own all of it</p>
            ) : (
              <>
                <p className="font-display text-[22px] leading-none font-semibold text-white tabular-nums">{fmt(p.amount)}</p>
                <p className="mt-1 text-[13px] text-white/55">
                  {fmt(p.apart)} apart{p.owned ? `, without the ${p.owned === 1 ? "item" : `${p.owned} items`} you own` : ""}
                </p>
              </>
            )}
          </div>
          {!all &&
            (props.added ? (
              <a href="#basket" className={`${QUIET} h-10`}>
                In basket
              </a>
            ) : (
              <button type="button" onClick={props.onAdd} className={`${BUTTON} h-10`}>
                Add the set
              </button>
            ))}
        </div>
      </div>
    </li>
  );
}

function SupporterCard(props: {
  item: ShopItem;
  art?: ItemArt;
  min: number;
  max: number;
  currency: Currency;
  owned: boolean;
  amount: number | null;
  name: string;
  onTry: () => void;
  onAdd: (amount: number) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fmt = (m: number) => formatPrice(m, props.currency);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const raw = text.trim().replace(",", ".");
    const value = raw ? Math.round(Number(raw) * 100) : props.min;
    if (!Number.isFinite(value) || value < props.min || value > props.max) return setError(`Any amount from ${fmt(props.min)} to ${fmt(props.max)}.`);
    setError(null);
    props.onAdd(value);
  };
  return (
    <section aria-labelledby="supporter-title" className="mb-14 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/[0.06] backdrop-blur-xl sm:p-6">
      <div className="grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
        <button type="button" onClick={props.onTry} className="flex aspect-[16/9] items-center justify-center rounded-xl bg-[#0b0718]/70 outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] sm:aspect-square">
          <NameTag name={props.name} art={props.art} big />
          <span className="sr-only">Try the {props.item.name} on</span>
        </button>
        <div>
          <p className="text-[13px] font-medium text-white/55">Name tag · pay what you want</p>
          <h2 id="supporter-title" className="mt-1 font-display text-[24px] leading-tight font-semibold tracking-[-0.01em] text-white">
            {props.item.name}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-white/70">
            {props.item.line ?? "A badge after your name for the players who help pay for Horizon."} One payment, from {fmt(props.min)}. Every amount gets the
            same badge.
          </p>
          {props.owned ? (
            <p className="mt-4 text-[15px] text-white/60">This account has the badge already. Thank you.</p>
          ) : (
            <form onSubmit={submit} noValidate className="mt-4 flex flex-wrap items-start gap-2">
              <label htmlFor="supporter-amount" className="sr-only">
                Amount in {props.currency}
              </label>
              <div className="relative">
                <input
                  id="supporter-amount"
                  inputMode="decimal"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={(props.min / 100).toFixed(2)}
                  aria-invalid={!!error}
                  aria-describedby={error ? "supporter-error" : undefined}
                  className={`${INPUT} w-36 pr-14 tabular-nums`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-white/45">{props.currency}</span>
              </div>
              <button type="submit" className={BUTTON}>
                {props.amount !== null ? "Change the amount" : "Add to the basket"}
              </button>
              {props.amount !== null && <p className="w-full text-sm text-[#c4b5ff]">In the basket: {fmt(props.amount)}.</p>}
              {error && (
                <p id="supporter-error" role="alert" className="w-full text-sm text-[#ffb4a8]">
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// ── the basket and its checkout: in the page, never a pop-up ──

function Checkout({ api, catalogue, basket, currency, me, onRemove }: { api: string; catalogue: Catalogue; basket: Basket; currency: Currency; me: Player | null; onRemove: (id: string) => void }) {
  const [gift, setGift] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [friend, setFriend] = useState<Player | null>(null);
  const [mineName, setMineName] = useState("");
  const [mine, setMine] = useState<Player | null>(null);
  const [busy, setBusy] = useState<"finding" | "paying" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const recipient = gift ? friend : (me ?? mine);
  const owned = recipient?.owned ?? new Set<string>();
  const { lines, total } = basketLines(basket, catalogue, owned, currency);
  const fmt = (m: number) => formatPrice(m, currency);
  const empty = lines.length === 0;

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
    if (!recipient) return;
    setBusy("paying");
    setError(null);
    try {
      const ids = [...basket.items, ...(basket.supporter !== null && catalogue.supporter ? [catalogue.supporter.item] : [])];
      const { ok, body } = await call(api, "/v1/web/checkout", {
        method: "POST",
        body: JSON.stringify({ name: recipient.name, items: ids, currency, ...(basket.supporter !== null ? { amount: basket.supporter } : {}), ...(gift ? { gift: true } : {}) }),
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
    <section id="basket" aria-labelledby="basket-title" className="scroll-mt-24 rounded-2xl bg-white/[0.06] p-4 backdrop-blur-xl sm:p-6">
      <h2 id="basket-title" className="font-display text-[clamp(1.5rem,3vw,2rem)] leading-tight font-semibold tracking-[-0.02em] text-white">
        Your basket
      </h2>
      {empty ? (
        <p className="mt-2 text-[15px] text-white/60">Empty. Add an item or a set; you pay once for everything in it.</p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-white/[0.06]">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className={`truncate text-[15px] ${l.dropped ? "text-white/45" : "text-white"}`}>
                    {l.name}
                    {l.kind === "set" && <span className="text-white/45"> · set</span>}
                  </p>
                  {l.dropped && <p className="text-[13px] text-white/45">{l.dropped === "owned" ? `${recipient?.name ?? "This account"} owns it: not charged` : "In a set above: not charged twice"}</p>}
                  {l.kind === "set" && !l.dropped && l.owned > 0 && <p className="text-[13px] text-white/45">Without the {l.owned === 1 ? "item" : `${l.owned} items`} already owned</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className={`text-[15px] tabular-nums ${l.dropped ? "text-white/40 line-through" : "text-white"}`}>{fmt(l.amount)}</span>
                  <button type="button" onClick={() => onRemove(l.id)} className={`${SMALL} px-2 text-white/50 hover:bg-white/[0.06] hover:text-white`}>
                    <span aria-hidden>×</span>
                    <span className="sr-only">Remove {l.name}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-baseline justify-between border-t border-white/[0.1] pt-3">
            <span className="text-[15px] text-white/70">Total</span>
            <span className="font-display text-[24px] font-semibold text-white tabular-nums">{fmt(total)}</span>
          </div>
          <p className="mt-1 text-[13px] text-white/45">
            {currency === "USD" ? "US sales tax is added where a state charges it." : "VAT included where it applies."} Paddle&apos;s checkout shows the final amount
            before you pay.
          </p>

          <div className="mt-5 grid gap-3">
            <label className="flex cursor-pointer items-center gap-3 text-[15px] text-white">
              <input
                type="checkbox"
                checked={gift}
                onChange={(e) => {
                  setGift(e.target.checked);
                  setError(null);
                }}
                className="size-5 accent-[#6b4bff]"
              />
              This is a gift
            </label>
            {gift ? (
              friend ? (
                <Recipient player={friend} note="gets the items, with a note that they're a gift." onChange={() => setFriend(null)} />
              ) : (
                <NameForm id="gift-name" label="Your friend's Minecraft name" value={friendName} onChange={setFriendName} onSubmit={(e) => findFor(e, "friend")} busy={busy === "finding"} />
              )
            ) : me ? (
              <Recipient player={me} note="gets the items." />
            ) : mine ? (
              <Recipient player={mine} note="gets the items." onChange={() => setMine(null)} />
            ) : (
              <NameForm id="mine-name" label="Your Minecraft name: the items go to this account" value={mineName} onChange={setMineName} onSubmit={(e) => findFor(e, "mine")} busy={busy === "finding"} />
            )}
          </div>

          <p className="mt-5 rounded-xl bg-white/[0.04] px-4 py-3 text-[15px] leading-relaxed text-white ring-1 ring-white/[0.08]">
            Ask whoever pays before you buy. Refunds within 14 days for any reason.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-[15px] text-[#ffb4a8]">
              {error}
            </p>
          )}
          <button type="button" onClick={pay} disabled={!recipient || total <= 0 || busy !== null} className={`${BUTTON} mt-4 h-12 w-full`}>
            {busy === "paying" ? "Opening Paddle's checkout…" : total > 0 ? `Pay ${fmt(total)} with Paddle` : "Nothing to pay"}
          </button>
          <p className="mt-2 text-[13px] text-white/45">Paddle&apos;s checkout opens on the next page. It asks for an email for the receipt; this site asks for nothing else.</p>
        </>
      )}
    </section>
  );
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
