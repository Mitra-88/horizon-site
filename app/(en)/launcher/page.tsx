import type { Metadata } from "next";
import { getReleases, launcherBuild, type Release } from "@/components/github-releases";
import { LauncherApp } from "@/components/launcher/launcher-app";
import { FALLBACK, type Change, type LauncherData, type ModEntry, type Nightly, type Note } from "@/components/launcher/launcher-data";
import { getMods } from "@/components/mods-data";
import type { ModProject } from "@/components/mods-logic";
import "./launcher.css";

export const metadata: Metadata = {
  title: "Launcher · Horizon",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

const tidy = (line: string) => {
  const text = line
    .replace(/\s*\([^)]*#\d+[^)]*\)/g, "")
    .replace(/^(feat|fix|chore|docs|perf|refactor)(\([^)]*\))?:\s*/i, "")
    .replace(/`/g, "")
    .trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

function changesFrom(markdown: string): Change[] {
  const changes: Change[] = [];
  let section = "Changes";
  for (const line of markdown.split("\n")) {
    const heading = /^#{2,4}\s+(.+)/.exec(line);
    if (heading) {
      section = heading[1].trim();
      continue;
    }
    if (!/^\s*[-*] /.test(line) || /^contributors$/i.test(section)) continue;
    const text = tidy(line.replace(/^\s*[-*] /, ""));
    if (text) changes.push({ section, text });
  }
  return changes;
}

function nightliesFrom(releases: Release[]): Nightly[] {
  const seen = new Set<string>();
  const list: Nightly[] = [];
  for (const r of releases) {
    if (r.kind !== "nightly" || seen.has(r.title)) continue;
    const match = /Nightly (\d{4}-\d{2}-\d{2}) · (\w+)/.exec(r.title);
    if (!match) continue;
    seen.add(r.title);
    const changes = changesFrom(r.notes);
    list.push({ id: r.title, title: r.title, date: match[1], build: match[2], published: r.published, url: r.url, changes: changes.slice(0, 14), total: changes.length });
  }
  return list.slice(0, 6);
}

function notesFrom(releases: Release[]): Note[] {
  return releases
    .filter((r) => r.kind === "launcher")
    .slice(0, 5)
    .map((r) => ({
      version: r.tag.replace(/^launcher@/, ""),
      published: r.published,
      url: r.url,
      items: r.notes
        .split("\n")
        .filter((l) => /^\s*[-*] /.test(l))
        .map((l) => tidy(l.replace(/^\s*[-*] /, "")))
        .filter(Boolean)
        .slice(0, 5),
    }))
    .filter((n) => n.items.length > 0);
}

function modsFrom(projects: ModProject[]): ModEntry[] {
  return projects
    .map((p) => ({
      id: p.id,
      kind: p.kind,
      name: p.name,
      summary: p.summary ?? "",
      authors: p.authors?.length ? p.authors : (p.owners ?? []),
      downloads: p.downloads ?? 0,
      icon: p.icon,
      version: p.versions[0].version,
      license: p.license,
      capabilities: p.versions[0].capabilities ?? [],
    }))
    .sort((a, b) => b.downloads - a.downloads);
}

export default async function LauncherPage() {
  const [releases, projects] = await Promise.all([getReleases(), getMods()]);
  const nightlies = releases ? nightliesFrom(releases) : [];
  const notes = releases ? notesFrom(releases) : [];
  const mods = projects ? modsFrom(projects) : [];
  const launchers = releases?.filter((r) => r.kind === "launcher") ?? [];
  const data: LauncherData = {
    launcherVersion: launcherBuild(releases)?.version ?? FALLBACK.launcherVersion,
    currentLauncher: launchers.length > 1 ? launchers[Math.min(6, launchers.length - 1)].tag.replace(/^launcher@/, "") : FALLBACK.currentLauncher,
    nightlies: nightlies.length ? nightlies : FALLBACK.nightlies,
    notes: notes.length ? notes : FALLBACK.notes,
    mods: mods.length ? mods : FALLBACK.mods,
  };
  return <LauncherApp data={data} />;
}
