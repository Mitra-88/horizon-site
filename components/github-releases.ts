import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/components/github-fresh";
import { GITHUB_URL } from "@/components/links";

const REPO = "horizon-rust/horizon";

export const RELEASES_URL = `${GITHUB_URL}/releases`;

export const RELEASE_LIMIT = 40;

export type ReleaseKind = "horizon" | "launcher" | "nightly";
export type ReleaseAsset = { name: string; size: number; url: string };
export type Release = {
  id: number;
  tag: string;
  title: string;
  kind: ReleaseKind;
  published: string;
  url: string;
  notes: string;
  notesHtml: string;
  assets: ReleaseAsset[];
};

type GitHubRelease = {
  id: number;
  tag_name: string;
  name: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  html_url: string;
  body?: string | null;
  body_html?: string;
  assets: { name: string; size: number; browser_download_url: string }[];
};

const kindOf = (r: GitHubRelease): ReleaseKind =>
  r.tag_name.startsWith("launcher@") ? "launcher" : r.prerelease || r.tag_name.startsWith("nightly") ? "nightly" : "horizon";

export async function getReleases(): Promise<Release[] | null> {
  "use cache";
  cacheTag(TAGS.releases);
  const headers: Record<string, string> = { Accept: "application/vnd.github.full+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  let releases: GitHubRelease[];
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=${RELEASE_LIMIT + 10}`, { headers });
    if (!res.ok) throw new Error(`GitHub responded ${res.status} ${res.statusText}`);
    releases = await res.json();
  } catch (error) {
    console.error(`Couldn't load releases for ${REPO}:`, error);
    cacheLife("minutes");
    return null;
  }

  cacheLife({ stale: 300, revalidate: 900, expire: 86400 });
  return releases
    .filter((r): r is GitHubRelease & { published_at: string } => !r.draft && r.published_at !== null)
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .slice(0, RELEASE_LIMIT)
    .map((r) => ({
      id: r.id,
      tag: r.tag_name,
      title: r.name || r.tag_name,
      kind: kindOf(r),
      published: r.published_at,
      url: r.html_url,
      notes: r.body ?? "",
      notesHtml: r.body_html ?? "",
      assets: r.assets.map((a) => ({ name: a.name, size: a.size, url: a.browser_download_url })),
    }));
}

export type DesktopOs = "windows" | "macos" | "linux";
export type LauncherBuild = { version: string; files: Partial<Record<DesktopOs, { url: string; size: number }>> };

const LAUNCHER_FILES: Record<DesktopOs, RegExp> = {
  windows: /windows-x64\.zip$/i,
  macos: /macos-arm64\.dmg$/i,
  linux: /linux-x86_64\.tar\.gz$/i,
};

export function launcherBuild(releases: Release[] | null): LauncherBuild | null {
  const release = releases?.find((r) => r.kind === "launcher");
  if (!release) return null;
  const files: LauncherBuild["files"] = {};
  for (const os of Object.keys(LAUNCHER_FILES) as DesktopOs[]) {
    const asset = release.assets.find((a) => LAUNCHER_FILES[os].test(a.name));
    if (asset) files[os] = { url: asset.url, size: asset.size };
  }
  return { version: release.tag.replace(/^launcher@/, ""), files };
}
