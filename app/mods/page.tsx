import { getModRatings, getMods } from "@/components/mods-data";
import { ModsList } from "@/components/mods-list";
import { OFFICIAL_MODS, summarize } from "@/components/mods-logic";
import { pageMetadata } from "@/components/site";

export const metadata = pageMetadata({
  title: "Horizon mods, modpacks and resource packs",
  description:
    "Mods, modpacks and resource packs made for Horizon. Each one was reviewed before it was listed, and the launcher checks every file before it installs it.",
  path: "/mods",
});

export default async function ModsPage() {
  const [mods, ratings] = await Promise.all([getMods(), getModRatings()]);

  return (
    <main>
      <section className="pt-28 pb-16 sm:pt-32 sm:pb-20">
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          <h1 className="sr-only">Horizon mods</h1>
          {mods ? (
            <ModsList projects={mods.map(summarize)} ratings={ratings} />
          ) : (
            <div className="rounded-2xl bg-[#18112c] px-6 py-10">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-white">The registry didn&apos;t answer</h2>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/60">
                The list of mods couldn&apos;t be loaded just now. It will try again in a minute, or you can browse it on the official site.
              </p>
              <a href={OFFICIAL_MODS} className="mt-4 inline-flex text-sm font-medium text-[#c4b5ff] underline underline-offset-4 hover:text-white">
                Mods on playhorizon.dev
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
