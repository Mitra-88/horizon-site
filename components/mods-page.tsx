import { getMessages, NUMBER_LOCALE, type Locale } from "@/components/i18n";
import { getModRatings, getMods } from "@/components/mods-data";
import { ModsList } from "@/components/mods-list";
import { OFFICIAL_MODS, summarize } from "@/components/mods-logic";

// The list's own words are translated; what the registry holds (names, summaries, authors) stays as its authors wrote it.
export async function ModsPage({ locale }: { locale: Locale }) {
  const t = getMessages(locale).mods;
  const [mods, ratings] = await Promise.all([getMods(), getModRatings()]);

  return (
    <main>
      <section className="pt-28 pb-16 sm:pt-32 sm:pb-20">
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          <h1 className="sr-only">{t.srTitle}</h1>
          {mods ? (
            <ModsList projects={mods.map(summarize)} ratings={ratings} t={t.list} numberLocale={NUMBER_LOCALE[locale]} />
          ) : (
            <div className="rounded-2xl bg-[#18112c] px-6 py-10">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">{t.unreachable.title}</h2>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/60">{t.unreachable.body}</p>
              <a href={OFFICIAL_MODS} className="mt-4 inline-flex text-sm font-medium text-[#c4b5ff] underline underline-offset-4 hover:text-white">
                {t.unreachable.link}
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
