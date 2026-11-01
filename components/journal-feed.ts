import { cacheLife } from "next/cache";
import { journalJson, slimIssue } from "@/vendor/horizon-site/hub.js";
import { isGame } from "@/vendor/horizon-site/versions.js";

const REPO = "horizon-rust/horizon";
const TIMEOUT = 15_000;
const FEED_LIFE = { stale: 300, revalidate: 600, expire: 3600 };
const FAILED_LIFE = { stale: 30, revalidate: 60, expire: 300 };

type RawRelease = { tag_name: string; draft: boolean; prerelease: boolean };
type RawIssue = Record<string, unknown>;
type Roadmap = { items: { links?: string[] }[] };

const githubHeaders = (): Record<string, string> => ({
  Accept: "application/vnd.github+json",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
});

async function github(url: string) {
  const res = await fetch(url, { headers: githubHeaders(), signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`${url}: ${res.status} from GitHub`);
  return res.json();
}

export async function roadmapText(): Promise<string | null> {
  "use cache";
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${REPO}/main/roadmap/roadmap.json`, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) throw new Error(`roadmap.json: ${res.status} from GitHub`);
    const text = await res.text();
    JSON.parse(text);
    cacheLife(FEED_LIFE);
    return text;
  } catch (error) {
    console.error("Couldn't load the roadmap:", error);
    cacheLife(FAILED_LIFE);
    return null;
  }
}

async function allReleases(): Promise<RawRelease[]> {
  const releases: RawRelease[] = [];
  for (let page = 1; page <= 5; page++) {
    const batch: RawRelease[] = await github(`https://api.github.com/repos/${REPO}/releases?per_page=100&page=${page}`);
    releases.push(...batch.filter((r) => !r.draft));
    if (batch.length < 100) break;
  }
  if (!releases.some((r) => isGame(r.tag_name) && !r.prerelease)) releases.push(await github(`https://api.github.com/repos/${REPO}/releases/latest`));
  return releases;
}

async function hubLive(roadmap: Roadmap) {
  const linked = new Set(roadmap.items.flatMap((i) => (i.links || []).map((l) => Number((l.match(/^#(\d+)$/) || [])[1])).filter(Boolean)));
  const urls = [1, 2, 3].map((p) => `https://api.github.com/repos/${REPO}/issues?state=open&per_page=100&page=${p}`);
  urls.push(`https://api.github.com/repos/${REPO}/issues?state=closed&sort=updated&direction=desc&per_page=100`);
  const list: ReturnType<typeof slimIssue>[] = [];
  for (const url of urls) list.push(...((await github(url)) as RawIssue[]).map(slimIssue));
  const missing = [...linked].filter((n) => !list.some((i) => i.n === n));
  if (missing.length && process.env.GITHUB_TOKEN) {
    const fields = missing
      .map((n) => `n${n}: issueOrPullRequest(number: ${n}) { ... on Issue { number title state stateReason url } ... on PullRequest { number title state isDraft mergedAt url } }`)
      .join(" ");
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: githubHeaders(),
      body: JSON.stringify({ query: `query { repository(owner: "horizon-rust", name: "horizon") { ${fields} } }` }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) throw new Error(`GraphQL: ${res.status} from GitHub`);
    const nodes = Object.values((await res.json()).data?.repository || {}).filter(Boolean) as Record<string, string | boolean | number | null>[];
    list.push(
      ...nodes.map((x) =>
        slimIssue({
          number: x.number,
          title: x.title,
          html_url: x.url,
          draft: x.isDraft,
          state: x.state === "OPEN" ? "open" : "closed",
          state_reason: x.stateReason === "NOT_PLANNED" ? "not_planned" : null,
          pull_request: "isDraft" in x ? { merged_at: x.mergedAt } : undefined,
        }),
      ),
    );
  }
  return list;
}

export async function journalText(): Promise<string | null> {
  "use cache";
  try {
    const text = await roadmapText();
    if (!text) throw new Error("the roadmap didn't load");
    const roadmap = JSON.parse(text) as Roadmap;
    const [releases, list] = await Promise.all([allReleases(), hubLive(roadmap)]);
    cacheLife(FEED_LIFE);
    return `${JSON.stringify(journalJson(releases, list, roadmap), null, 1)}\n`;
  } catch (error) {
    console.error("Couldn't build the journal:", error);
    cacheLife(FAILED_LIFE);
    return null;
  }
}

export function feedResponse(text: string | null) {
  const headers = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" };
  if (!text) return Response.json({ error: "GitHub didn't answer; try again in a minute." }, { status: 503, headers: { ...headers, "Retry-After": "60" } });
  return new Response(text, { headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}
