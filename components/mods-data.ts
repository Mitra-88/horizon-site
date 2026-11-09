import { cacheLife, cacheTag } from "next/cache";
import { githubFetch } from "@/components/github-api";
import { rawMainUrl, TAGS } from "@/components/github-fresh";
import { KINDS, type ModProject, type Ratings } from "@/components/mods-logic";

const INDEX_URL = "https://horizon-rust.github.io/horizon-mods/index.json";
function ratingsUrl() {
  const upstream = process.env.REGISTRY_UPSTREAM;
  if (!upstream) return "https://playhorizon.dev/api/mods/ratings";
  return new URL("/api/mods/ratings", /^https?:\/\//.test(upstream) ? upstream : `http://${upstream}`).toString();
}
const SCHEMA = 1;
const FRESH = { stale: 300, revalidate: 900, expire: 86400 };
const KNOWN = new Set<string>(KINDS.map(([k]) => k));

function readIndex(index: unknown): ModProject[] | null {
  if (!index || typeof index !== "object") return null;
  const { schema, projects } = index as { schema?: number; projects?: unknown };
  if (typeof schema !== "number" || schema > SCHEMA || !Array.isArray(projects)) return null;
  return projects.filter(
    (p): p is ModProject =>
      p &&
      typeof p === "object" &&
      KNOWN.has(p.kind) &&
      typeof p.name === "string" &&
      /^[a-z0-9_]{1,64}$/.test(p.id) &&
      Array.isArray(p.versions) &&
      p.versions.length > 0 &&
      typeof p.versions[0]?.file?.name === "string",
  );
}

export async function getMods(): Promise<ModProject[] | null> {
  "use cache";
  cacheTag(TAGS.mods);
  try {
    const res = await fetch(INDEX_URL);
    if (!res.ok) throw new Error(`The registry responded ${res.status} ${res.statusText}`);
    const projects = readIndex(await res.json());
    if (!projects) throw new Error("The registry's index is in a format this site doesn't read");
    cacheLife(FRESH);
    return projects;
  } catch (error) {
    console.error("Couldn't load the mod registry:", error);
    cacheLife("minutes");
    return null;
  }
}

export async function getModRatings(): Promise<Ratings | null> {
  "use cache";
  try {
    const res = await fetch(ratingsUrl());
    if (!res.ok) throw new Error(`The ratings service responded ${res.status} ${res.statusText}`);
    const json = await res.json();
    if (!json || typeof json.projects !== "object") throw new Error("The ratings came back in an unknown format");
    cacheLife(FRESH);
    return json.projects as Ratings;
  } catch (error) {
    console.error("Couldn't load the mod ratings:", error);
    cacheLife("minutes");
    return null;
  }
}

export async function getMod(id: string) {
  const mods = await getMods();
  return mods?.find((p) => p.id === id) ?? null;
}


/** A pull request the submission form opened for an account, as "Your mods" lists it. */
export type Submission = { number: number; title: string; state: string; merged: boolean; url: string; created: string };

/**
 * The registry pull requests the submission form opened for `login`, newest first: the form writes
 * `<!-- submitted-by: <login> -->` into each one's body. GitHub's search matches words, so the body is checked again.
 */
export async function getSubmissions(login: string): Promise<Submission[] | null> {
  "use cache";
  cacheTag(TAGS.mods);
  const marker = `<!-- submitted-by: ${login.toLowerCase()} -->`;
  const query = `repo:horizon-rust/horizon-mods is:pr in:body "submitted-by: ${login}"`;
  try {
    const res = await githubFetch(`/search/issues?q=${encodeURIComponent(query)}&sort=created&order=desc&per_page=50`);
    if (!res.ok) throw new Error(`GitHub responded ${res.status} ${res.statusText}`);
    const { items } = (await res.json()) as {
      items?: { number: number; title: string; state: string; html_url: string; created_at: string; body?: string; pull_request?: { merged_at?: string | null } }[];
    };
    cacheLife({ stale: 60, revalidate: 120, expire: 3600 });
    return (items ?? [])
      .filter((i) => (i.body ?? "").toLowerCase().includes(marker))
      .map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        merged: Boolean(i.pull_request?.merged_at),
        url: i.html_url,
        created: i.created_at.slice(0, 10),
      }));
  } catch (error) {
    console.error(`Couldn't load the submissions of ${login}:`, error);
    cacheLife("seconds");
    return null;
  }
}

export async function getModPolicy(): Promise<string | null> {
  "use cache";
  cacheTag(TAGS.mods);
  try {
    const res = await fetch(await rawMainUrl("horizon-rust/horizon-mods", "MOD-POLICY.md"), { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`GitHub responded ${res.status} ${res.statusText}`);
    const text = await res.text();
    cacheLife({ stale: 900, revalidate: 3600, expire: 86400 });
    return text;
  } catch (error) {
    console.error("Couldn't load the mod policy:", error);
    cacheLife("minutes");
    return null;
  }
}
