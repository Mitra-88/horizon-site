import type { Catalogue, Currency, ShopItem, ShopSet } from "@/components/shop-data";

// The basket's prices as the site shows them before the checkout, with the cosmetics service's own rules (the
// checkout's `total` is what Paddle charges): an item the account owns drops out; an item that is also inside a set in
// the same basket drops out; a set partly owned costs round(set × unowned / full) in that currency, the items' prices
// apart being `full`; the Supporter badge is granted once. The site only previews this; it never decides a price.

/** A price as the shop writes it: minor units in `currency`. */
export function formatPrice(minor: number, currency: Currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: currency === "CHF" ? "code" : "symbol" }).format(minor / 100);
}

export type Line =
  | { kind: "item"; id: string; name: string; amount: number; dropped?: "owned" | "in_set" }
  | { kind: "set"; id: string; name: string; amount: number; apart: number; owned: number; dropped?: "owned" }
  | { kind: "supporter"; id: string; name: string; amount: number; dropped?: "owned" };

export type Basket = { items: string[]; supporter: number | null };

/** round(set × unowned / full) with the service's integer math: (set·unowned + full/2) / full. */
export function setShare(set: number, unowned: number, full: number) {
  if (full <= 0) return 0;
  return Math.floor((set * unowned + Math.floor(full / 2)) / full);
}

export function setPrice(set: ShopSet, items: Map<string, ShopItem>, owned: ReadonlySet<string>, currency: Currency) {
  const price = set.prices[currency] ?? 0;
  let full = 0;
  let unowned = 0;
  let ownedCount = 0;
  for (const id of set.items) {
    const p = items.get(id)?.prices?.[currency] ?? 0;
    full += p;
    if (owned.has(id)) ownedCount++;
    else unowned += p;
  }
  const amount = ownedCount === 0 ? price : setShare(price, unowned, full);
  return { amount, apart: unowned, full, owned: ownedCount };
}

/** The currencies every price on sale has (the service gives all four, or the site offers fewer). */
export function usableCurrencies(c: Catalogue): Currency[] {
  return c.currencies.filter(
    (cur) =>
      c.items.every((i) => !i.prices || i.prices[cur] !== undefined) &&
      c.sets.every((s) => s.prices[cur] !== undefined) &&
      (!c.supporter || (c.supporter.min[cur] !== undefined && c.supporter.max[cur] !== undefined)),
  );
}

export function basketLines(basket: Basket, c: Catalogue, owned: ReadonlySet<string>, currency: Currency): { lines: Line[]; total: number } {
  const items = new Map(c.items.map((i) => [i.id, i]));
  const sets = new Map(c.sets.map((s) => [s.id, s]));
  const inSets = new Set(basket.items.flatMap((id) => sets.get(id)?.items ?? []));
  const lines: Line[] = [];
  for (const id of basket.items) {
    const set = sets.get(id);
    if (set) {
      const p = setPrice(set, items, owned, currency);
      lines.push({ kind: "set", id, name: set.name, amount: p.amount, apart: p.apart, owned: p.owned, ...(p.owned === set.items.length ? { dropped: "owned" as const } : {}) });
      continue;
    }
    const item = items.get(id);
    if (!item?.prices) continue;
    const dropped = owned.has(id) ? ("owned" as const) : inSets.has(id) ? ("in_set" as const) : undefined;
    lines.push({ kind: "item", id, name: item.name, amount: item.prices[currency] ?? 0, ...(dropped ? { dropped } : {}) });
  }
  if (basket.supporter !== null && c.supporter) {
    const name = items.get(c.supporter.item)?.name ?? "Supporter";
    lines.push({ kind: "supporter", id: c.supporter.item, name, amount: basket.supporter, ...(owned.has(c.supporter.item) ? { dropped: "owned" as const } : {}) });
  }
  const total = lines.reduce((sum, l) => sum + (l.dropped ? 0 : l.amount), 0);
  return { lines, total };
}

/** The currency a visitor most likely pays in, from the browser's language region and time zone. */
export function guessCurrency(available: Currency[], languages: readonly string[], timeZone: string): Currency {
  const has = (c: Currency) => available.includes(c);
  const region = languages.map((l) => l.split("-")[1]?.toUpperCase()).find(Boolean) ?? "";
  const EURO = new Set("AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK AD MC SM VA ME XK".split(" "));
  if ((region === "CH" || region === "LI" || timeZone === "Europe/Zurich") && has("CHF")) return "CHF";
  if ((region === "GB" || timeZone === "Europe/London") && has("GBP")) return "GBP";
  if ((EURO.has(region) || (!region && /^Europe\//.test(timeZone))) && has("EUR")) return "EUR";
  return "USD";
}
