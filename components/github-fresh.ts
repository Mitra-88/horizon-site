import { cacheLife, cacheTag } from "next/cache";
import { githubFetch } from "@/components/github-api";

// What the site reads from GitHub, by cache tag. Kira calls POST /api/revalidate with these tags when GitHub's
// webhook says they changed (a push to main, an issue or pull request, a release), so the pages follow within a
// minute; without that call each loader keeps its own cacheLife, as before.
export const TAGS = {
  main: "github:horizon:main", // files on the game's main (roadmap.json, docs/api, README), contributors
  issues: "github:horizon:issues", // the game's issues and pull requests (the hub, the journal)
  releases: "github:horizon:releases", // the game's releases
  mods: "github:horizon-mods:main", // horizon-mods' main (the mod policy, the registry index it publishes)
} as const;
export const REVALIDATE_TAGS: readonly string[] = Object.values(TAGS);

const tagOf = (repo: string) => (repo === "horizon-rust/horizon-mods" ? TAGS.mods : TAGS.main);

// The commit a repository's main points at. raw.githubusercontent.com caches a branch's files for five minutes, so
// files are read at this commit instead: once Kira revalidates the tag, the next read gets the files just pushed.
export async function mainSha(repo: string): Promise<string> {
  "use cache";
  cacheTag(tagOf(repo));
  try {
    const res = await githubFetch(`/repos/${repo}/commits/main`);
    const sha = res.ok ? String((await res.json())?.sha ?? "") : "";
    if (!res.ok || !/^[0-9a-f]{40}$/.test(sha)) throw new Error(`GitHub responded ${res.status} ${res.statusText}`);
    cacheLife({ stale: 300, revalidate: 900, expire: 86400 });
    return sha;
  } catch (error) {
    console.error(`Couldn't read main's commit for ${repo}:`, error);
    cacheLife("minutes");
    return "main";
  }
}

// A file of a repository's main, as raw.githubusercontent.com serves it at main's current commit.
export async function rawMainUrl(repo: string, path: string): Promise<string> {
  return `https://raw.githubusercontent.com/${repo}/${await mainSha(repo)}/${path}`;
}
