import type { ReactNode } from "react";

// Who sells Horizon's cosmetics, and how to reach him about a purchase. Shared by /shop, /terms, /refunds and /privacy.
export const SELLER = "Ludovic Marie";
export const SELLER_PLACE = "Switzerland";
// Mojang's Usage Guidelines ask for an email (not a chat or forum) wherever items are sold.
// TODO(Ludovic): no playhorizon.dev address exists yet (no MX record). Set one here, e.g. a Porkbun forward.
export const CONTACT_EMAIL: string | null = null;
export const CONTACT_PAGE = "https://lu4ovic.com/#contact";
export const NOT_OFFICIAL = "NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.";
export const PADDLE_BUYER_TERMS = "https://www.paddle.com/legal/checkout-buyer-terms";
export const PADDLE_PRIVACY = "https://www.paddle.com/legal/privacy";

export const LINK = "text-[#c4b5ff] underline decoration-[#c4b5ff]/40 underline-offset-4 transition-colors hover:text-white";

export function Out({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={LINK}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** How to write about a purchase: the email once it exists, the contact page until then. */
export function Contact() {
  if (CONTACT_EMAIL)
    return (
      <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
        {CONTACT_EMAIL}
      </a>
    );
  return <Out href={CONTACT_PAGE}>lu4ovic.com</Out>;
}

export function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-[1.6rem] leading-tight font-semibold tracking-[-0.02em] text-white">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** A legal page, laid out as the privacy page is. */
export function LegalPage({ kicker, title, accent, intro, children }: { kicker: string; title: string; accent: string; intro: ReactNode; children: ReactNode }) {
  return (
    <main>
      <article className="mx-auto w-full max-w-3xl px-6 pt-32 pb-20 text-[16px] leading-relaxed text-pretty text-white/70 sm:pt-40 sm:pb-28 lg:px-10">
        <p className="text-sm font-medium text-white/60">{kicker}</p>
        <h1 className="mt-4 font-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.04] font-semibold tracking-[-0.035em] text-white">
          <span className="block">{title}</span>
          <span className="text-accent block pb-1">{accent}</span>
        </h1>
        <div className="mt-6 text-lg text-white/70">{intro}</div>
        {children}
        <p className="mt-12 text-sm font-medium text-white/80">{NOT_OFFICIAL}</p>
      </article>
    </main>
  );
}
