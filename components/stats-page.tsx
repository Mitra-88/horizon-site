import { getMessages, rich, type Locale } from "@/components/i18n";
import { PixelFire } from "@/components/pixel-fire";
import { PlayersStats } from "@/components/players-stats";

const LINK = "text-[#c4b5ff] underline decoration-[#c4b5ff]/40 underline-offset-4 transition-colors hover:text-white";

export function StatsPage({ locale }: { locale: Locale }) {
  const t = getMessages(locale).stats;
  return (
    <main>
      <section className="relative isolate overflow-hidden">
        <PixelFire className="absolute top-0 left-0 -z-10" />
        <div className="mx-auto w-full max-w-6xl px-6 pt-32 pb-32 sm:pt-40 sm:pb-40 lg:px-10">
          <p className="text-sm font-medium text-white/60">
            {`${t.kicker} `}
            <span className="mx-1.5 text-white/30">·</span>
            {` ${t.kickerLive}`}
          </p>
          <h1 className="mt-4 font-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.04] font-semibold tracking-[-0.035em] text-white">
            <span className="block">{t.titleA}</span>
            <span className="text-accent block pb-1">{t.titleB}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">
            {rich(t.lead, {
              link: (text) => (
                <a href="https://playhorizon.dev/privacy#the-im-playing-ping" className={LINK}>
                  {text}
                </a>
              ),
            })}
          </p>
        </div>
      </section>
      <div className="mx-auto w-full max-w-6xl px-6 pb-24 lg:px-10">
        <PlayersStats t={t.live} numberLocale={locale} />
      </div>
    </main>
  );
}
