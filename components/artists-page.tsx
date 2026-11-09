import type { ReactNode } from "react";
import { getMessages, rich, type Locale } from "@/components/i18n";
import { DiscordIcon } from "@/components/icons";
import { DISCORD_URL } from "@/components/links";

const CONTACT_URL = "https://lu4ovic.com/#contact";
const LINK = "text-[#c4b5ff] underline decoration-[#c4b5ff]/40 underline-offset-4 transition-colors hover:text-white";

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-[1.6rem] leading-tight font-semibold tracking-[-0.02em] text-white">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function ArtistsPage({ locale }: { locale: Locale }) {
  const t = getMessages(locale).artists;
  return (
    <main>
      <article className="mx-auto w-full max-w-3xl px-6 pt-32 pb-20 text-[16px] leading-relaxed text-pretty text-white/70 sm:pt-40 sm:pb-28 lg:px-10">
        <p className="text-sm font-medium text-white/60">{t.kicker}</p>
        <h1 className="mt-4 font-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.04] font-semibold tracking-[-0.035em] text-white">
          <span className="block">{t.titleA}</span>
          <span className="text-accent block pb-1">{t.titleB}</span>
        </h1>
        <p className="mt-6 text-lg text-white/70">{t.lead}</p>

        <Part title={t.make.title}>
          <ul className="list-disc space-y-2 pl-5 marker:text-white/30">
            {t.make.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>{t.make.note}</p>
        </Part>

        <Part title={t.fits.title}>
          <ul className="list-disc space-y-2 pl-5 marker:text-white/30">
            {t.fits.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Part>

        <Part title={t.contact.title}>
          <p>
            {rich(t.contact.body, {
              link: (text) => (
                <a href={CONTACT_URL} target="_blank" rel="noreferrer" className={LINK}>
                  {text}
                  <span className="sr-only">{t.newTab}</span>
                </a>
              ),
            })}
          </p>
          <p className="pt-2">
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2.5 rounded-xl bg-[#5865f2] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#4752c4]"
            >
              <DiscordIcon className="size-5" />
              {t.contact.discord}
              <span className="sr-only">{t.newTab}</span>
            </a>
          </p>
        </Part>
      </article>
    </main>
  );
}
