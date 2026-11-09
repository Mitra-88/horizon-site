import type { CSSProperties } from "react";
import { getReleases, RELEASES_URL, type Release, type ReleaseKind } from "@/components/github-releases";
import { HorizonScene } from "@/components/horizon-scene";
import { DownloadIcon, ExternalLinkIcon, GitHubIcon, MoonIcon } from "@/components/icons";
import { ReleaseItem, ReleaseList, ReleaseViews } from "@/components/release-seen";
import { pageMetadata } from "@/components/site";

export const metadata = pageMetadata({
  title: "Download the Horizon launcher: releases and nightlies",
  description:
    "Download the Horizon launcher for Windows, macOS and Linux. Every game, launcher and nightly release, with its notes and downloads, straight from GitHub.",
  path: "/releases",
});

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

const KINDS: { kind: ReleaseKind; label: string; chip: string }[] = [
  { kind: "horizon", label: "Horizon", chip: "bg-[#6b4bff]/25 text-[#d4c9ff]" },
  { kind: "launcher", label: "Launcher", chip: "bg-white/10 text-white/80" },
  {
    kind: "nightly",
    label: "Nightly",
    chip: "bg-[linear-gradient(100deg,#1d1444,#4a1d63)] text-[#e9dcff] shadow-[0_0_12px_-2px_rgba(169,143,255,0.45)] ring-1 ring-[#a98fff]/25 ring-inset",
  },
];

function KindChip({ kind }: { kind: ReleaseKind }) {
  const { label, chip } = KINDS.find((k) => k.kind === kind)!;
  return (
    <span className={`inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${chip}`}>
      {kind === "nightly" && <MoonIcon fill="currentColor" strokeWidth={0} className="size-3 text-[#ffe9a8]" />}
      {label}
    </span>
  );
}

const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const when = (iso: string) => `${day.format(new Date(iso))} · ${clock.format(new Date(iso))} UTC`;

const fileSize = (bytes: number) =>
  bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : bytes >= 1e3 ? `${Math.round(bytes / 1e3)} KB` : `${bytes} B`;

function splitTitle(title: string) {
  const i = title.indexOf(": ");
  return i > 0 ? { name: title.slice(0, i), headline: title.slice(i + 2) } : { name: title, headline: null };
}

function Dot() {
  return (
    <span aria-hidden className="mx-2 text-white/30">
      ·
    </span>
  );
}

function ReleaseSummary({ release }: { release: Release }) {
  const { name, headline } = splitTitle(release.title);
  return (
    <>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <KindChip kind={release.kind} />
        <span className="text-[17px] font-medium text-white transition-colors group-data-seen:text-white/55">{name}</span>
      </span>
      {headline && (
        <span className="mt-1.5 block text-[15px] text-pretty text-white/65 group-data-seen:text-white/45">{headline}</span>
      )}
      <span className="mt-1.5 block text-sm text-white/40">
        <time dateTime={release.published}>{when(release.published)}</time>
        <Dot />
        {release.tag}
        <ReleaseViews id={release.id} />
      </span>
    </>
  );
}

function ReleaseBody({ release }: { release: Release }) {
  return (
    <>
      {release.notesHtml ? (
        <div className="release-notes" dangerouslySetInnerHTML={{ __html: release.notesHtml }} />
      ) : (
        <p className="text-[15px] text-white/50">No notes for this release.</p>
      )}

      {release.assets.length > 0 && (
        <div className="mt-7">
          <h3 className="text-sm font-medium text-white/80">Downloads</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {release.assets.map((a) => (
              <li key={a.name}>
                <a
                  href={a.url}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/[0.12] hover:text-white"
                >
                  <DownloadIcon className="size-4" />
                  {a.name}
                  <span className="text-white/40">{fileSize(a.size)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <a
        href={release.url}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#a98fff] underline decoration-[#a98fff]/40 underline-offset-4 transition-colors hover:text-[#c4b5ff]"
      >
        View on GitHub
        <ExternalLinkIcon className="size-3.5" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </>
  );
}

export default async function ReleasesPage() {
  const releases = await getReleases();

  return (
    <main>
      <section className="relative isolate flex min-h-[85svh] flex-col overflow-hidden">
        <HorizonScene className="absolute inset-0 -z-10" wideSun={{ x: 0.74, scale: 1.5, rise: 0.6 }} />
        <div aria-hidden className="h-18 shrink-0" />

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pt-12 pb-10 lg:px-10 lg:pt-28">
          <div className="max-w-2xl">
            <p className="rise flex items-center text-sm font-medium text-white/60" style={delay(0)}>
              Releases
              <Dot />
              <span className="inline-flex items-center gap-2">
                <GitHubIcon className="size-3.5" />
                horizon-rust/horizon
              </span>
            </p>
            <h1
              className="rise mt-5 font-display text-[clamp(2.5rem,7vw,4.75rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-white"
              style={delay(80)}
            >
              <span className="block">Every release,</span>
              <span className="text-accent block pb-1">as it ships.</span>
            </h1>
            <p className="rise mt-6 max-w-xl text-lg leading-relaxed text-white/70" style={delay(160)}>
              Horizon, its launcher and the nightly builds, straight from GitHub. Open one to read its notes; the
              ones you&apos;ve opened are marked as seen.
            </p>
            <div className="rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center" style={delay(240)}>
              <a
                href="#all-releases"
                className="inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] bg-[#6b4bff] px-5 text-[15px] font-medium text-white transition-colors hover:bg-[#7a5dff]"
              >
                Browse releases
              </a>
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] bg-white/[0.08] px-5 text-[15px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/[0.14]"
              >
                <GitHubIcon className="size-[17px]" />
                All releases on GitHub
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          </div>
        </div>

        <div aria-hidden className="h-[clamp(180px,30svh,320px)] shrink-0 lg:h-[clamp(130px,16svh,220px)]" />
      </section>

      <section id="all-releases" aria-labelledby="all-releases-title" className="scroll-mt-20 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          <p className="text-sm font-medium text-white/60">Changelog</p>
          <h2
            id="all-releases-title"
            className="mt-5 font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-white"
          >
            {releases ? `The latest ${releases.length} releases.` : "Releases are on GitHub."}
          </h2>

          {releases ? (
            <div className="mt-10">
              <ReleaseList entries={releases.map((r) => ({ id: r.id, kind: r.kind }))}>
                {releases.map((r) => (
                  <li key={r.id} data-kind={r.kind} className="border-b border-white/[0.08]">
                    <ReleaseItem id={r.id} summary={<ReleaseSummary release={r} />}>
                      <ReleaseBody release={r} />
                    </ReleaseItem>
                  </li>
                ))}
              </ReleaseList>
            </div>
          ) : (
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
              GitHub couldn&apos;t be reached just now. Every release is listed on{" "}
              <a href={RELEASES_URL} className="text-[#a98fff] underline underline-offset-4">
                the releases page on GitHub
              </a>
              .
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
