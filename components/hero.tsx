import Image from "next/image";
import type { CSSProperties } from "react";
import { FrameRateComparison } from "@/components/frame-rate-comparison";
import { HorizonScene } from "@/components/horizon-scene";
import { DownloadIcon, GitHubIcon, LinuxIcon, RustIcon, WindowsIcon } from "@/components/icons";
import { getReleases, launcherBuild } from "@/components/github-releases";
import { LauncherLink, LauncherMeta } from "@/components/launcher-download";
import { GITHUB_URL, RUST_WIKI_URL } from "@/components/links";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

function Dot({ className = "mx-2" }: { className?: string }) {
  return (
    <span aria-hidden className={`text-white/30 ${className}`}>
      ·
    </span>
  );
}

export async function Hero() {
  const launcher = launcherBuild(await getReleases());
  return (
    <section className="relative isolate flex min-h-svh flex-col overflow-hidden">
      <HorizonScene className="absolute inset-0 -z-10" />
      <div aria-hidden className="h-18 shrink-0" />

      <div className="mx-auto grid w-full max-w-6xl flex-1 content-center items-start gap-x-16 gap-y-16 px-6 pt-12 pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center lg:px-10 xl:gap-x-20">
        <div className="@container max-w-2xl">
          <p className="rise flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm font-medium text-white/60" style={delay(0)}>
            <span className="inline-flex items-center gap-2">
              <Image src="/minecraft.webp" alt="" width={64} height={71} className="h-[18px] w-auto" />
              Minecraft: Java Edition 26.3
            </span>
            <Dot className="hidden sm:inline" />
            <span className="inline-flex items-center gap-2">
              <RustIcon className="size-4" />
              <span>
                Written in{" "}
                <a
                  href={RUST_WIKI_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/80 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60"
                >
                  Rust
                </a>
              </span>
            </span>
          </p>

          <h1
            className="rise mt-5 font-display text-[clamp(2rem,10.4cqi,4.75rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-white"
            style={delay(80)}
          >
            <span className="sr-only">Horizon: </span>
            <span className="block">The game you know,</span>
            <span className="text-accent block pb-1">rebuilt in Rust.</span>
          </h1>

          <p className="rise mt-6 max-w-xl text-lg leading-relaxed text-white/70" style={delay(160)}>
            The Minecraft: Java Edition 26.3 client and its game logic, rewritten in Rust and checked against the
            vanilla game by 281 differential harnesses.
          </p>

          <div className="rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center" style={delay(240)}>
            <LauncherLink
              build={launcher}
              className="inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] bg-[#6b4bff] px-5 text-[15px] font-medium text-white transition-colors hover:bg-[#7a5dff]"
            >
              <DownloadIcon className="size-[18px]" />
              Download the launcher
            </LauncherLink>
            <a
              href={GITHUB_URL}
              className="inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] bg-white/[0.08] px-5 text-[15px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/[0.14]"
            >
              <GitHubIcon className="size-[17px]" />
              View on GitHub
            </a>
          </div>

          <div className="rise mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-white/50" style={delay(300)}>
            <span className="flex items-center gap-4">
              <LauncherLink build={launcher} os="windows" className="inline-flex items-center gap-2 text-white/75 transition-colors hover:text-white">
                <WindowsIcon className="size-3.5" />
                Windows
              </LauncherLink>
              <LauncherLink build={launcher} os="linux" className="inline-flex items-center gap-2 text-white/75 transition-colors hover:text-white">
                <LinuxIcon className="size-4" />
                Linux
              </LauncherLink>
            </span>
            <span className="basis-full whitespace-nowrap sm:basis-auto">
              <Dot className="mr-2 hidden sm:inline" />
              <LauncherMeta build={launcher} dot={<Dot />} />
            </span>
          </div>
        </div>

        <FrameRateComparison />
      </div>

      <div aria-hidden className="h-[clamp(180px,30svh,320px)] shrink-0" />
    </section>
  );
}
