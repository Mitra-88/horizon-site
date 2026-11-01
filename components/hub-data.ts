import { cacheLife, cacheTag } from "next/cache";
import { rawMainUrl, TAGS } from "@/components/github-fresh";
import { boardFrom, REPO, slimIssue, type HubIssue, type Roadmap } from "@/components/hub-logic";

const headers = (): Record<string, string> => ({
  Accept: "application/vnd.github+json",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
});

const FRESH = { stale: 300, revalidate: 900, expire: 86400 };

export async function getRoadmap(): Promise<Roadmap | null> {
  "use cache";
  cacheTag(TAGS.main);
  try {
    const res = await fetch(await rawMainUrl(REPO, "roadmap/roadmap.json"));
    if (!res.ok) throw new Error(`GitHub responded ${res.status} ${res.statusText}`);
    const roadmap: Roadmap = await res.json();
    cacheLife(FRESH);
    return roadmap;
  } catch (error) {
    console.error(`Couldn't load the roadmap for ${REPO}:`, error);
    cacheLife("minutes");
    return null;
  }
}

export async function getHubIssues(): Promise<HubIssue[] | null> {
  "use cache";
  cacheTag(TAGS.issues);
  const list: HubIssue[] = [];
  try {
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(`https://api.github.com/repos/${REPO}/issues?state=open&per_page=100&page=${page}`, { headers: headers() });
      if (!res.ok) throw new Error(`GitHub responded ${res.status} ${res.statusText}`);
      const batch = await res.json();
      list.push(...batch.map(slimIssue));
      if (batch.length < 100) break;
    }
    const res = await fetch(`https://api.github.com/repos/${REPO}/issues?state=closed&sort=updated&direction=desc&per_page=100`, { headers: headers() });
    if (!res.ok) throw new Error(`GitHub responded ${res.status} ${res.statusText}`);
    list.push(...(await res.json()).map(slimIssue));
  } catch (error) {
    console.error(`Couldn't load the issues for ${REPO}:`, error);
    cacheLife("minutes");
    return null;
  }
  cacheLife(FRESH);
  return [...new Map(list.map((i) => [i.n, i])).values()];
}

export async function getBoard() {
  "use cache";
  cacheTag(TAGS.main, TAGS.issues);
  const [issues, roadmap] = await Promise.all([getHubIssues(), getRoadmap()]);
  if (!issues || !roadmap) {
    cacheLife("minutes");
    return null;
  }
  cacheLife(FRESH);
  return boardFrom(issues, roadmap);
}
