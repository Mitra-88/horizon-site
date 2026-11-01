import type { CSSProperties } from "react";
import { getContributors } from "@/components/contributors";
import { getReleases } from "@/components/github-releases";
import { getBoard, getHubIssues, getRoadmap } from "@/components/hub-data";
import { journalAnchor, journalFrom, REPO } from "@/components/hub-logic";
import { BoardPanel, ContributePanel, JournalPanel, OverviewPanel, RoadmapPanel } from "@/components/hub-panels";
import { HubShell } from "@/components/hub-shell";
import { PixelAurora } from "@/components/pixel-aurora";
import { pageMetadata } from "@/components/site";

export const metadata = pageMetadata({
  title: "Horizon hub: roadmap, progress and how to help",
  description:
    "Where Horizon is: what is being done now, what comes next, what shipped, and how to help, in plain words or in technical detail.",
  path: "/hub",
});

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

export default async function HubPage() {
  const [roadmap, issues, board, releases, contributors] = await Promise.all([
    getRoadmap(),
    getHubIssues(),
    getBoard(),
    getReleases(),
    getContributors(),
  ]);
  const live = new Map((issues ?? []).map((i) => [i.n, i]));
  const areas = roadmap ? roadmap.areas.filter((a) => roadmap.items.some((i) => i.area === a.id)) : [];
  const journal = roadmap ? journalFrom(releases ?? [], issues ?? [], roadmap) : [];

  const anchors: Record<string, string> = { "hub-contributors": "contribute", report: "contribute" };
  for (const s of roadmap?.statuses ?? []) anchors[s.id] = "roadmap";
  for (const i of roadmap?.items ?? []) anchors[i.id] = "roadmap";
  for (const e of journal) anchors[journalAnchor(e)] = "journal";
  const searchable = (roadmap?.items ?? []).map((i) => ({
    id: i.id,
    area: i.area,
    text: [i.title, i.plain, i.dev, ...(i.links ?? []), areas.find((a) => a.id === i.area)?.name ?? ""].join(" ").toLowerCase(),
  }));
  const version = releases?.find((r) => r.kind === "horizon")?.tag ?? "";

  return (
    <main>
      <section className="relative isolate overflow-hidden pt-36 pb-12 sm:pt-44 sm:pb-16">
        <PixelAurora moonTop={104} className="absolute top-0 left-0 -z-10" />
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          <p className="rise flex items-center text-sm font-medium text-white/60" style={delay(0)}>
            Hub
            <span aria-hidden className="mx-2 text-white/30">
              ·
            </span>
            Now, next and how to help
          </p>
          <h1
            className="rise mt-5 font-display text-[clamp(2.5rem,7vw,4.75rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-white"
            style={delay(80)}
          >
            <span className="block">Where Horizon</span>
            <span className="text-accent block pb-1">is going.</span>
          </h1>
          <p className="rise mt-6 max-w-2xl text-lg leading-relaxed text-white/70" style={delay(160)}>
            What is being done, what comes next, what shipped and where you can help. No dates: things are Now, Next or
            Later. Read it in plain words, or switch to the technical picture.
          </p>
        </div>
      </section>

      {roadmap ? (
        <HubShell areas={areas} anchors={anchors} items={searchable}>
          <OverviewPanel roadmap={roadmap} live={live} />
          <RoadmapPanel roadmap={roadmap} live={live} liveKnown={issues !== null} />
          <BoardPanel columns={board} roadmap={roadmap} />
          <JournalPanel entries={journal} roadmap={roadmap} />
          <ContributePanel roadmap={roadmap} contributors={contributors} live={live} version={version} />
        </HubShell>
      ) : (
        <div className="mx-auto w-full max-w-6xl px-6 pb-24 lg:px-10">
          <p className="max-w-xl text-[15px] leading-relaxed text-white/60">
            The roadmap couldn&apos;t be loaded from GitHub just now. It&apos;s in the repository as{" "}
            <a href={`https://github.com/${REPO}/blob/main/ROADMAP.md`} className="text-[#a98fff] underline underline-offset-4">
              ROADMAP.md
            </a>
            .
          </p>
        </div>
      )}
    </main>
  );
}
