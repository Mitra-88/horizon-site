import type { MetadataRoute } from "next";
import { getDocs } from "@/components/docs-data";
import { getReleases } from "@/components/github-releases";
import { languageAlternates, LOCALES } from "@/components/i18n";
import { localePath } from "@/components/i18n-text";
import { getMods } from "@/components/mods-data";
import { getShopStatus } from "@/components/shop-data";
import { absolute } from "@/components/site";

const newest = (dates: (string | undefined)[]) => dates.filter((d): d is string => Boolean(d)).sort().at(-1);

const url = (path: string) => absolute(path).replace(/\/$/, "");

// A page that exists in every language: one entry per language, each listing all of them (hreflang).
type Entry = MetadataRoute.Sitemap[number];
function inEveryLanguage(path: string, entry: Omit<Entry, "url">): Entry[] {
  const languages = Object.fromEntries(Object.entries(languageAlternates(path) ?? {}).map(([l, p]) => [l, url(p)]));
  return LOCALES.map((locale) => ({
    ...entry,
    url: url(localePath(locale, path)),
    ...(locale !== "en" && entry.priority !== undefined ? { priority: Math.round(entry.priority * 9) / 10 } : {}),
    alternates: { languages },
  }));
}

const KEY_DOCS = new Set(["index", "install", "faq", "multiplayer", "hosting"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [docs, releases, mods, shop] = await Promise.all([getDocs(), getReleases(), getMods(), getShopStatus()]);
  const released = releases?.[0]?.published;
  const modsUpdated = newest((mods ?? []).map((p) => p.versions[0]?.published));

  return [
    ...inEveryLanguage("/", { lastModified: released, changeFrequency: "daily", priority: 1 }),
    ...inEveryLanguage("/releases", { lastModified: released, changeFrequency: "hourly", priority: 0.9 }),
    ...inEveryLanguage("/benchmarks", { changeFrequency: "weekly", priority: 0.8 }),
    ...inEveryLanguage("/mods", { lastModified: modsUpdated, changeFrequency: "daily", priority: 0.8 }),
    { url: absolute("/hub"), changeFrequency: "daily", priority: 0.7 },
    ...inEveryLanguage("/stats", { changeFrequency: "hourly", priority: 0.5 }),
    ...docs.map((doc) => ({
      url: absolute(doc.path),
      changeFrequency: "weekly" as const,
      priority: KEY_DOCS.has(doc.slug) ? 0.8 : 0.6,
    })),
    ...(mods ?? []).map((p) => ({
      url: absolute(`/mods/${p.id}`),
      lastModified: p.versions[0]?.published,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    { url: absolute("/mods/policy"), changeFrequency: "monthly", priority: 0.3 },
    ...((shop.open || shop.selling) && !shop.preview ? [{ url: absolute("/shop"), changeFrequency: "weekly" as const, priority: 0.6 }] : []),
    { url: absolute("/terms"), changeFrequency: "yearly" as const, priority: 0.2 },
    { url: absolute("/refunds"), changeFrequency: "yearly" as const, priority: 0.2 },
    ...inEveryLanguage("/artists", { changeFrequency: "monthly", priority: 0.4 }),
    { url: absolute("/privacy"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
