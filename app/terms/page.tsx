import Link from "next/link";
import { Contact, LegalPage, LINK, Out, PADDLE_BUYER_TERMS, Part, SELLER, SELLER_PLACE } from "@/components/legal";
import { pageMetadata } from "@/components/site";

export const metadata = pageMetadata({
  title: "Terms of sale · Horizon",
  description:
    "The terms for Horizon's cosmetics: what you get, who sells them (Paddle, for Ludovic Marie), prices, delivery, refunds, and what cosmetics never are.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage
      kicker="Terms of sale"
      title="What you get"
      accent="when you get a cosmetic."
      intro={
        <p>
          These terms cover the cosmetics of the Horizon launcher and game, free or paid, from the <Link href="/shop" className={LINK}>shop</Link> or
          the launcher&apos;s Wardrobe. By claiming or buying one, you agree to them.
        </p>
      }
    >
      <Part title="Who sells them">
        <p>
          Horizon and its cosmetics are made by {SELLER}, an individual in {SELLER_PLACE} (sole proprietor, trading as Horizon). Orders are processed
          by Paddle.com, the merchant of record for every order: Paddle sells the item to you and handles payment, tax, receipts and refunds, under{" "}
          <Out href={PADDLE_BUYER_TERMS}>Paddle&apos;s buyer terms</Out>. These terms add what is specific to Horizon&apos;s cosmetics.
        </p>
        <p>
          Questions about an order, an item or these terms: <Contact />. For a payment or a receipt, you can also answer Paddle&apos;s receipt email or
          go to paddle.net.
        </p>
      </Part>

      <Part title="What a cosmetic is">
        <ul className="list-disc space-y-2 pl-5 marker:text-white/30">
          <li>
            A licence to show a visual item (a hat, a backpack, a shirt, a name tag, …) on your Minecraft account, in the Horizon launcher and game.
            It&apos;s personal and can&apos;t be sold, traded or transferred, and it isn&apos;t a property right in the item.
          </li>
          <li>Visual only. It changes nothing about how the game plays and gives no advantage.</li>
          <li>Seen by Horizon players. Other clients and servers see a normal player.</li>
          <li>No capes, nothing that looks like one, no random rewards (no loot boxes), no virtual currency, nothing with real-world value.</li>
          <li>
            Bound to the Minecraft account you were signed in with when you claimed or bought it, on every computer you sign in to. Horizon keeps
            it for as long as it runs the cosmetics service.
          </li>
        </ul>
      </Part>

      <Part title="Prices">
        <p>
          Every price is on the <Link href="/shop" className={LINK}>shop page</Link> and in the launcher, before you sign in. The founder set is free
          (0 CHF). Paddle shows the final price, with any sales tax or VAT for your country, before you confirm, and charges nothing else.
        </p>
      </Part>

      <Part title="Delivery">
        <p>
          You claim or buy in the launcher, signed in with your Microsoft account. The item is on your account as soon as Paddle confirms the order,
          usually within a minute; you can wear it from the Wardrobe. If it doesn&apos;t arrive, write to us with the order number from Paddle&apos;s
          receipt.
        </p>
      </Part>

      <Part title="Refunds">
        <p>
          You can ask for a refund within 14 days, for any reason: the <Link href="/refunds" className={LINK}>refund policy</Link> says how. A refunded
          item, or one whose payment is disputed with the bank (a chargeback), is taken off your account.
        </p>
      </Part>

      <Part title="Under 18">
        <p>
          If you&apos;re under 18, ask a parent or guardian before you buy anything: they need to agree to the purchase and to these terms. Free
          items need no payment details.
        </p>
      </Part>

      <Part title="Changes, and when it ends">
        <p>
          Horizon may change how an item looks, to fix or improve it, or retire an item from sale; what you own stays yours. If Horizon ever stops
          its cosmetics service, it will say so at least 30 days ahead. Misusing the service (fraud, a chargeback for an order you received,
          attacking the service) can lose you access to your cosmetics.
        </p>
      </Part>

      <Part title="Law">
        <p>
          Swiss law applies, without taking away any protection the law of the country you live in gives you as a consumer. Horizon is open source;
          its code is under the MIT licence, and these terms are about cosmetics only.
        </p>
        <p className="text-sm text-white/45">Last updated on 4 November 2026.</p>
      </Part>
    </LegalPage>
  );
}
