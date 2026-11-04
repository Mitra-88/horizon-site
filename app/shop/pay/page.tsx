import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Contact, LINK, NOT_OFFICIAL, SELLER } from "@/components/legal";
import { PaddleCheckout } from "@/components/shop/paddle-checkout";
import { pageMetadata } from "@/components/site";

// Horizon's default payment link in Paddle (Checkout settings): every checkout the cosmetics service creates opens
// here as /shop/pay?_ptxn=txn_…. The client-side token (public by design) is read at request time from
// PADDLE_CLIENT_TOKEN (1Password Agents "Paddle client-side token"); without it the page says checkout is unavailable.

export const metadata = {
  ...pageMetadata({ title: "Checkout · Horizon", description: "Paddle's checkout for Horizon's cosmetics.", path: "/shop/pay" }),
  robots: { index: false, follow: false },
};

async function Checkout() {
  await connection();
  const token = process.env.PADDLE_CLIENT_TOKEN?.trim() ?? "";
  if (!/^(live|test)_[A-Za-z0-9]{10,64}$/.test(token))
    return <p className="mt-8 text-[15px] text-white/70">Checkout isn&apos;t available right now. Nothing was charged.</p>;
  return <PaddleCheckout token={token} sandbox={token.startsWith("test_")} />;
}

export default function PayPage() {
  return (
    <main>
      <section className="mx-auto w-full max-w-3xl px-6 pt-32 pb-20 text-[16px] leading-relaxed text-pretty text-white/70 sm:pt-40 sm:pb-28 lg:px-10">
        <p className="text-sm font-medium text-white/60">Checkout</p>
        <h1 className="mt-4 font-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.04] font-semibold tracking-[-0.035em] text-white">
          <span className="block">Horizon&apos;s cosmetics,</span>
          <span className="text-accent block pb-1">through Paddle.</span>
        </h1>
        <Suspense fallback={<p className="mt-8 text-[15px] text-white/70">Opening Paddle&apos;s checkout…</p>}>
          <Checkout />
        </Suspense>
        <p className="mt-8 text-[15px] text-white/60">
          Paddle.com is the merchant of record and takes the payment; {SELLER} makes the items. Read the{" "}
          <Link href="/terms" className={LINK}>
            terms of sale
          </Link>{" "}
          and the{" "}
          <Link href="/refunds" className={LINK}>
            refund policy
          </Link>
          . Questions: <Contact />.
        </p>
        <p className="mt-6 text-sm font-medium text-white/80">{NOT_OFFICIAL}</p>
      </section>
    </main>
  );
}
