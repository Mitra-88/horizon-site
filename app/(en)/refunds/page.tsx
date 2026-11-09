import Link from "next/link";
import { Contact, LegalPage, LINK, Out, PADDLE_BUYER_TERMS, Part } from "@/components/legal";
import { pageMetadata } from "@/components/site";

export const metadata = pageMetadata({
  title: "Refunds · Horizon",
  description: "Horizon's cosmetics: a refund within 14 days for any reason, through Paddle, and what happens to the item.",
  path: "/refunds",
});

export default function RefundsPage() {
  return (
    <LegalPage
      kicker="Refunds"
      title="Changed your mind?"
      accent="14 days, any reason."
      intro={
        <p>
          How refunds work for Horizon&apos;s cosmetics. Paddle.com is the merchant of record for every order and makes every refund, under{" "}
          <Out href={PADDLE_BUYER_TERMS}>Paddle&apos;s buyer terms</Out>; this page is Horizon&apos;s own promise on top of them.
        </p>
      }
    >
      <Part title="In short">
        <ul className="list-disc space-y-2 pl-5 marker:text-white/30">
          <li>Within 14 days of buying, you get a full refund for any reason, even if you already wore the item.</li>
          <li>After 14 days, you get one if the item never reached your account or doesn&apos;t work in Horizon and we can&apos;t fix it.</li>
          <li>Free items, like the founder set, cost nothing, so there is nothing to refund.</li>
        </ul>
      </Part>

      <Part title="How to ask">
        <p>
          Answer the receipt email Paddle sent you, or look up your order at paddle.net, and ask for a refund. You can also write to us (
          <Contact />) with the order number (it starts with <span className="font-mono text-[0.92em] text-white/80">txn_</span> and is in the
          launcher&apos;s purchase history). Paddle sends the money back the way you paid; banks usually take 5 to 10 working days.
        </p>
      </Part>

      <Part title="What happens to the item">
        <p>
          A refunded item is taken off your Minecraft account, and other players stop seeing it. The same goes for an order disputed with the bank (a
          chargeback). If the dispute ends in the order&apos;s favour, the item comes back.
        </p>
      </Part>

      <Part title="Your legal rights">
        <p>
          In the EU, the UK and many other places, consumers may withdraw from an online purchase within 14 days. For digital items you agree to get
          at once, that right can end when the item is delivered. Horizon&apos;s 14-day refund doesn&apos;t depend on that: you get it either way.
          Nothing here takes away a right the law gives you.
        </p>
        <p>
          See also the <Link href="/terms" className={LINK}>terms of sale</Link>.
        </p>
        <p className="text-sm text-white/45">Last updated on 4 November 2026.</p>
      </Part>
    </LegalPage>
  );
}
