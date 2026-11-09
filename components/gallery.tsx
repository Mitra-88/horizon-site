import Image from "next/image";
import { getMessages, rich, type Locale } from "@/components/i18n";
import { HorizonLogo } from "@/components/icons";

const WIDE = "(min-width: 1024px) 44rem, 100vw";
const NARROW = "(min-width: 1024px) 22rem, (min-width: 640px) 50vw, 100vw";

// `alt` is the key of the picture's description in the messages (home.gallery.shots).
const SHOTS = [
  {
    src: "/media/nether.webp",
    label: "Crimson forest",
    alt: "nether",
    sizes: WIDE,
    className: "sm:col-span-2 lg:col-start-1 lg:row-span-2 lg:row-start-1",
  },
  {
    src: "/media/village-800.webp",
    label: "Savanna village",
    alt: "village",
    sizes: NARROW,
    className: "lg:col-start-3 lg:row-start-2",
  },
  {
    src: "/media/night-800.webp",
    label: "Village at night",
    alt: "night",
    sizes: NARROW,
    className: "lg:col-start-3 lg:row-start-3",
  },
  {
    src: "/media/underwater.webp",
    label: "Warm ocean",
    alt: "ocean",
    sizes: WIDE,
    className: "sm:col-span-2 sm:aspect-[21/9] lg:col-start-1 lg:row-start-3",
  },
] as const;

export function Gallery({ locale }: { locale: Locale }) {
  const t = getMessages(locale).home.gallery;
  return (
    <section id="gallery" aria-labelledby="gallery-title" className="scroll-mt-14 pb-16">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[auto_12rem_14rem]">
          <div className="reveal mb-6 sm:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:mb-0 lg:pl-4">
            <p className="flex items-center gap-2.5 text-sm font-medium text-white/60">
              {t.eyebrow}
              <HorizonLogo className="h-4 w-auto" />
              <span className="sr-only">Horizon</span>
            </p>
            <h2
              id="gallery-title"
              className="mt-5 font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-white"
            >
              {rich(t.title, { accent: (chunks) => <span className="text-accent">{chunks}</span> })}
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-pretty text-white/60">
              {t.lead}
            </p>
          </div>

          {SHOTS.map((shot) => (
            <figure
              key={shot.src}
              className={`reveal group relative aspect-video [clip-path:inset(0_round_1rem)] bg-white/[0.04] lg:aspect-auto ${shot.className}`}
            >
              <Image
                src={shot.src}
                alt={t.shots[shot.alt]}
                fill
                sizes={shot.sizes}
                className="object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.03]"
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
