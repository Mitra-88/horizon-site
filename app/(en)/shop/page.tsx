import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getReleases, launcherBuild } from "@/components/github-releases";
import { LauncherLink } from "@/components/launcher-download";
import { PixelAurora } from "@/components/pixel-aurora";
import { FounderClaim } from "@/components/shop/claim";
import { Shop } from "@/components/shop/shop";
import { COSMETICS_API, getCatalogue, getShopArt, getShopStatus } from "@/components/shop-data";
import { Contact, NOT_OFFICIAL, PADDLE_BUYER_TERMS, SELLER } from "@/components/legal";
import { pageMetadata } from "@/components/site";

// Always there, with every price, before anyone types a name or signs in (Paddle's website review, Mojang's
// guidelines). Everything comes from the cosmetics service's catalogue (components/shop-data.ts): what's on sale, its
// prices per currency, the sets, the Supporter badge, and the founder claim while its window is open. The shop is
// here only; the launcher's Wardrobe shows what an account owns. Purchases check out on /shop/pay (Paddle.js); the
// free founder claim opens Paddle's overlay in place, as before. No countdowns, counts of buyers or pop-ups.

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getShopStatus();
  const meta = pageMetadata({
    title: "Shop · Horizon",
    description:
      "Cosmetics for Horizon, tried on your own skin in 3D before you buy. Only Horizon players see them, and they change nothing about how the game plays.",
    path: "/shop",
  });
  return shop.preview || !(shop.open || shop.selling) ? { ...meta, robots: { index: false, follow: false } } : meta;
}

// Paddle's client-side token (public by design), read at request time like /shop/pay does.
async function Claim({ open, endsLabel }: { open: boolean; endsLabel: string | null }) {
  await connection();
  const token = process.env.PADDLE_CLIENT_TOKEN?.trim() ?? "";
  return <FounderClaim api={COSMETICS_API} token={/^(live|test)_[A-Za-z0-9]{10,64}$/.test(token) ? token : null} open={open} endsLabel={endsLabel} />;
}

const LINK = "text-[#c4b5ff] underline decoration-[#c4b5ff]/40 underline-offset-4 transition-colors hover:text-white";

export default async function ShopPage() {
  const [shop, catalogue] = await Promise.all([getShopStatus(), getCatalogue()]);
  const [art, releases] = await Promise.all([getShopArt(catalogue.items), getReleases()]);
  const launcher = launcherBuild(releases);
  const endsAt = shop.open ? shop.endsAt : null;

  return (
    <main>
      <section aria-labelledby="shop-title" className="relative isolate overflow-hidden">
        <PixelAurora className="absolute top-0 left-0 -z-10 opacity-50" moonTop={84} />
        <div className="mx-auto w-full max-w-7xl px-6 pt-28 pb-16 sm:pt-36 sm:pb-20 lg:px-10">
          {catalogue.items.length > 0 ? (
            <Shop catalogue={catalogue} art={art} api={COSMETICS_API} claimOpen={endsAt !== null} />
          ) : (
            <>
              <h1 id="shop-title" className="font-display text-[clamp(2.5rem,6vw,4rem)] leading-none font-semibold tracking-[-0.04em] text-white">
                Shop
              </h1>
              <p className="mt-8 rounded-2xl bg-white/[0.06] p-6 text-[15px] text-white/70">Nothing is on sale right now. Come back soon.</p>
            </>
          )}
        </div>
      </section>

      {endsAt !== null && (
      <section id="claim" aria-labelledby="claim-title" className="scroll-mt-20">
        <div className="mx-auto w-full max-w-7xl px-6 pb-16 sm:pb-20 lg:px-10">
          <h2 id="claim-title" className="font-display text-[clamp(1.4rem,2.6vw,1.9rem)] leading-tight font-semibold tracking-[-0.02em] text-white">
            Claim the founder set
          </h2>
          <div className="mt-6 max-w-2xl">
            <Suspense fallback={<div className="h-[184px] rounded-2xl bg-white/[0.06]" />}>
              <Claim open endsLabel={lastDayShort(endsAt)} />
            </Suspense>
          </div>
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-white/55">
            This website never signs you in. If a page, a message or a mod asks for your password or for money to get the founder set, it isn&apos;t
            Horizon.
          </p>
        </div>
      </section>
      )}

      <section aria-label="Prices, who sells, and the rules">
        <div className="mx-auto w-full max-w-7xl px-6 pb-20 sm:pb-28 lg:px-10">
          <div className="max-w-3xl rounded-2xl bg-white/[0.03] p-5 text-[15px] leading-relaxed text-white/70 ring-1 ring-white/[0.08]">
            <p>
              <span className="font-medium text-white">Prices, and who sells.</span> Every price is on this page, and nobody signs in to see it.
              Cosmetics are made by {SELLER} and sold through Paddle.com, the merchant of record, under{" "}
              <a href={PADDLE_BUYER_TERMS} target="_blank" rel="noreferrer" className={LINK}>
                Paddle&apos;s buyer terms
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              . Read the{" "}
              <Link href="/terms" className={LINK}>
                terms of sale
              </Link>
              , the{" "}
              <Link href="/refunds" className={LINK}>
                refund policy
              </Link>{" "}
              and the{" "}
              <Link href="/privacy" className={LINK}>
                privacy policy
              </Link>
              . Questions about an order: <Contact />. Cosmetics are seen by Horizon players only and change nothing about how the game plays;
              wear them from the{" "}
              <LauncherLink build={launcher} className={LINK}>
                Horizon launcher
              </LauncherLink>
              &apos;s Wardrobe.
            </p>
            <p className="mt-3 font-medium text-white/80">{NOT_OFFICIAL}</p>
          </div>
          <p className="mt-8 text-[15px] text-white/60">
            Making blocky models is your thing?{" "}
            <Link href="/artists" className={LINK}>
              Horizon is looking for 3D artists
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}

function lastDayShort(endsAt: number) {
  const end = new Date(endsAt * 1000);
  const midnight = end.getUTCHours() === 0 && end.getUTCMinutes() === 0;
  return new Date((midnight ? endsAt - 1 : endsAt) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
}
