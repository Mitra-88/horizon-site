import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { getReleases, launcherBuild } from "@/components/github-releases";
import { DownloadIcon } from "@/components/icons";
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

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="rounded-2xl bg-white/[0.06] p-6 backdrop-blur-xl">
      <span aria-hidden className="inline-flex size-8 items-center justify-center rounded-lg bg-[#6b4bff]/25 font-display text-[15px] font-semibold text-[#d9ceff]">
        {n}
      </span>
      <h3 className="mt-4 font-display text-[19px] leading-tight font-semibold tracking-[-0.01em] text-white">{title}</h3>
      <div className="mt-2 text-[15px] leading-relaxed text-white/70">{children}</div>
    </li>
  );
}

// Paddle's client-side token (public by design), read at request time like /shop/pay does.
async function Claim({ open, endsLabel }: { open: boolean; endsLabel: string | null }) {
  await connection();
  const token = process.env.PADDLE_CLIENT_TOKEN?.trim() ?? "";
  return <FounderClaim api={COSMETICS_API} token={/^(live|test)_[A-Za-z0-9]{10,64}$/.test(token) ? token : null} open={open} endsLabel={endsLabel} />;
}

function Fact({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-display text-[17px] font-semibold text-white">{title}</dt>
      <dd className="mt-1.5 text-[15px] leading-relaxed text-white/70">{children}</dd>
    </div>
  );
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
        <PixelAurora className="absolute top-0 left-0 -z-10 opacity-70" moonTop={150} />
        <div className="mx-auto w-full max-w-6xl px-6 pt-32 pb-16 sm:pt-40 sm:pb-20 lg:px-10">
          <p className="text-sm font-medium text-white/60">Shop</p>
          <h1 id="shop-title" className="mt-4 font-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.04] font-semibold tracking-[-0.035em] text-white">
            {shop.selling ? (
              <>
                <span className="block">Try it on</span>
                <span className="text-accent block pb-1">your own skin.</span>
              </>
            ) : (
              <>
                <span className="block">The founder set</span>
                <span className="text-accent block pb-1">is free.</span>
              </>
            )}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            {shop.selling
              ? "Cosmetics for Horizon players: type your Minecraft name, turn your player around and see what each item looks like on you before you buy. Prices are what you pay; nothing is random, and nothing leaves the shop."
              : "Four things for the players who were here first: a cap, a T-shirt, a backpack and a name tag. Type your Minecraft name to see them on your own skin, then claim them below; they're yours to keep."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-white/60">
            {endsAt !== null && (
              <span>
                The founder set is free (0 CHF) to claim until <span className="text-white">{lastDayLong(endsAt)}</span>.
              </span>
            )}
            <LauncherLink build={launcher} className={LINK}>
              <span className="inline-flex items-center gap-1.5">
                <DownloadIcon className="size-4" />
                Wear them in the Horizon launcher
              </span>
            </LauncherLink>
          </div>

          {catalogue.items.length > 0 ? (
            <div className="mt-12">
              <Shop catalogue={catalogue} art={art} api={COSMETICS_API} claimOpen={endsAt !== null} />
            </div>
          ) : (
            <p className="mt-12 rounded-2xl bg-white/[0.06] p-6 text-[15px] text-white/70">Nothing is on sale right now. Come back soon.</p>
          )}
        </div>
      </section>

      {endsAt !== null && (
      <section id="claim" aria-labelledby="claim-title" className="scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20 lg:px-10">
          <p className="text-sm font-medium text-white/60">Claim it</p>
          <h2 id="claim-title" className="mt-3 font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-tight font-semibold tracking-[-0.03em] text-white">
            Here, in three steps.
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
            <Suspense fallback={<div className="h-[184px] rounded-2xl bg-white/[0.06]" />}>
              <Claim open endsLabel={lastDayShort(endsAt)} />
            </Suspense>
            <ol className="grid gap-3">
              <Step n={1} title="Name your account">
                Type the Minecraft: Java Edition name the set goes to, and check it&apos;s your skin&apos;s face that shows.
              </Step>
              <Step n={2} title="A free checkout">
                Paddle&apos;s checkout opens on this page: an email for the receipt and your country, nothing to pay (0 CHF).
              </Step>
              <Step n={3} title="Wear it in the launcher">
                Open <span className="text-white">Wardrobe</span> in the{" "}
                <LauncherLink build={launcher} className={LINK}>
                  Horizon launcher
                </LauncherLink>
                , signed in with that account: the set is there.
              </Step>
            </ol>
          </div>
          <p className="mt-6 max-w-3xl rounded-2xl bg-white/[0.03] p-5 text-[15px] leading-relaxed text-white/70 ring-1 ring-white/[0.08]">
            <span className="font-medium text-white">This website never signs you in.</span> It only needs your Minecraft name, and the founder set
            costs nothing. If a page, a message or a mod asks for your password or for money to get it, it isn&apos;t Horizon.
          </p>
        </div>
      </section>
      )}

      <section aria-labelledby="facts-title">
        <div className="mx-auto w-full max-w-6xl px-6 pb-20 sm:pb-28 lg:px-10">
          <h2 id="facts-title" className="font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-tight font-semibold tracking-[-0.03em] text-white">
            Good to know
          </h2>
          <dl className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
            <Fact title="Who sees it">
              Horizon players near you, in every world and on every server. Other clients see a normal player: servers receive nothing, and the game&apos;s
              protocol doesn&apos;t change.
            </Fact>
            <Fact title="What it changes">How you look. Nothing about how the game plays.</Fact>
            <Fact title="Bound to your account">
              What you buy or claim belongs to the Minecraft account named at the checkout, on every computer it signs in to. It&apos;s yours to keep, and
              nothing ever leaves the shop.
            </Fact>
            <Fact title="Gifts">
              Tick <span className="text-white">This is a gift</span> and type a friend&apos;s Minecraft name: the items go to that account, and anything it
              already owns drops out of the price. The receipt and any refund stay with you.
            </Fact>
            <Fact title="Refunds">
              Within 14 days, for any reason: write to <Contact /> or reply to Paddle&apos;s receipt. The items leave the account when the money comes back.
            </Fact>
            <Fact title="Hide it">
              <span className="text-white">Show my cosmetics</span> in the Wardrobe turns yours off for everyone. You can hide other players&apos; cosmetics too,
              in the launcher or in the game&apos;s options.
            </Fact>
            <Fact title="What Horizon keeps">
              For your Minecraft account: the items you own and since when, what you wear, whether you hid them, and your orders&apos; numbers. Paddle keeps the
              payment; this site keeps nothing.
            </Fact>
            {endsAt !== null && (
              <Fact title={`After ${lastDayShort(endsAt)}`}>The founder set retires for good: it won&apos;t be offered again, and it will never be sold.</Fact>
            )}
          </dl>
          <div className="mt-14 max-w-3xl rounded-2xl bg-white/[0.03] p-5 text-[15px] leading-relaxed text-white/70 ring-1 ring-white/[0.08]">
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
              . Questions about an order: <Contact />. The launcher&apos;s Wardrobe lists everything you claimed or bought.
            </p>
            <p className="mt-3 font-medium text-white/80">{NOT_OFFICIAL}</p>
          </div>
          <p className="mt-14 text-[15px] text-white/60">
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

function lastDayLong(endsAt: number) {
  const end = new Date(endsAt * 1000);
  const midnight = end.getUTCHours() === 0 && end.getUTCMinutes() === 0;
  const date = new Date((midnight ? endsAt - 1 : endsAt) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return midnight ? date : `${date}, ${end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

function lastDayShort(endsAt: number) {
  const end = new Date(endsAt * 1000);
  const midnight = end.getUTCHours() === 0 && end.getUTCMinutes() === 0;
  return new Date((midnight ? endsAt - 1 : endsAt) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
}
