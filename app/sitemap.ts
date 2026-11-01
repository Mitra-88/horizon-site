import type { MetadataRoute } from "next";
import { getDocs } from "@/components/docs-data";
import { getReleases } from "@/components/github-releases";
import { getMods } from "@/components/mods-data";
import { absolute, SITE_URL } from "@/components/site";

const newest = (dates: (string | undefined)[]) => dates.filter((d): d is string => Boolean(d)).sort().at(-1);

const KEY_DOCS = new Set(["index", "install", "faq", "multiplayer", "hosting"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [docs, releases, mods] = await Promise.all([getDocs(), getReleases(), getMods()]);
  const released = releases?.[0]?.published;
  const modsUpdated = newest((mods ?? []).map((p) => p.versions[0]?.published));

  return [
    { url: SITE_URL, lastModified: released, changeFrequency: "daily", priority: 1 },
    { url: absolute("/releases"), lastModified: released, changeFrequency: "hourly", priority: 0.9 },
    { url: absolute("/benchmarks"), changeFrequency: "weekly", priority: 0.8 },
    { url: absolute("/mods"), lastModified: modsUpdated, changeFrequency: "daily", priority: 0.8 },
    { url: absolute("/hub"), changeFrequency: "daily", priority: 0.7 },
    { url: absolute("/stats"), changeFrequency: "hourly", priority: 0.5 },
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
    { url: absolute("/privacy"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
