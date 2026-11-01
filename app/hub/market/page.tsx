import Link from "next/link";
import { MarketBoard } from "@/components/market-board";
import { PixelAurora } from "@/components/pixel-aurora";
import { pageMetadata } from "@/components/site";

export const metadata = pageMetadata({
  title: "The Official Horizon SMP's market: live prices and charts",
  description:
    "Item prices on the Official Horizon SMP, moved by what players buy and sell: buy and sell prices, their change over an hour and a day, volumes and charts.",
  path: "/hub/market",
});

const LINK = "text-[#c4b5ff] underline decoration-[#c4b5ff]/40 underline-offset-4 transition-colors hover:text-white";

export default function MarketPage() {
  return (
    <main>
      <section className="relative isolate overflow-hidden pt-36 pb-12 sm:pt-44 sm:pb-16">
        <PixelAurora moonTop={104} className="absolute top-0 left-0 -z-10" />
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          <p className="flex items-center text-sm font-medium text-white/60">
            <Link href="/hub" className="hover:text-white">
              Hub
            </Link>
            <span aria-hidden className="mx-2 text-white/30">
              ·
            </span>
            Official Horizon SMP
          </p>
          <h1 className="mt-5 font-display text-[clamp(2.5rem,7vw,4.75rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-white">
            <span className="block">The server&apos;s</span>
            <span className="text-accent block pb-1">market.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            On the Official Horizon SMP (play.playhorizon.dev) prices move with what players sell and buy, once a minute, and drift back
            toward their base between trades. Every trade pays a small tax to the server&apos;s Treasury. In game, <code>/market</code> shows
            the same prices and gives a chart as a map. See also the server&apos;s{" "}
            <Link href="/stats#official" className={LINK}>
              player count
            </Link>
            .
          </p>
        </div>
      </section>
      <div className="mx-auto w-full max-w-6xl px-6 pb-24 lg:px-10">
        <MarketBoard />
      </div>
    </main>
  );
}
