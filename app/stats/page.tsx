import { PixelFire } from "@/components/pixel-fire";
import { PlayersStats } from "@/components/players-stats";
import { pageMetadata } from "@/components/site";

export const metadata = pageMetadata({
  title: "Horizon player count: how many play right now",
  description:
    "How many people play Horizon right now, its peaks and its history, from the anonymous ping every running game sends.",
  path: "/stats",
});

const LINK = "text-[#c4b5ff] underline decoration-[#c4b5ff]/40 underline-offset-4 transition-colors hover:text-white";

export default function StatsPage() {
  return (
    <main>
      <section className="relative isolate overflow-hidden">
        <PixelFire className="absolute top-0 left-0 -z-10" />
        <div className="mx-auto w-full max-w-6xl px-6 pt-32 pb-32 sm:pt-40 sm:pb-40 lg:px-10">
      <p className="text-sm font-medium text-white/60">
        Players <span className="mx-1.5 text-white/30">·</span> Live, every minute
      </p>
      <h1 className="mt-4 font-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.04] font-semibold tracking-[-0.035em] text-white">
        <span className="block">Who plays Horizon</span>
        <span className="text-accent block pb-1">right now.</span>
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
        Every running game sends an anonymous &ldquo;I&apos;m playing&rdquo; ping once a minute: no account, no address, nothing you do in the game (
        <a href="https://playhorizon.dev/privacy#the-im-playing-ping" className={LINK}>
          what it holds
        </a>
        ). The count below is exact, and the history keeps only totals.
      </p>
        </div>
      </section>
      <div className="mx-auto w-full max-w-6xl px-6 pb-24 lg:px-10">
        <PlayersStats />
      </div>
    </main>
  );
}
