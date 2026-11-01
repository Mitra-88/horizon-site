import Image from "next/image";
import { ChipIcon, CodeIcon, DriveIcon, ExternalLinkIcon, HorizonLogo } from "@/components/icons";
import { CONTRIBUTORS_URL } from "@/components/links";

const POINTS = [
  {
    icon: DriveIcon,
    title: "Your own copy",
    body: "Install Java Edition with the official launcher and play 26.3 once. Horizon builds its resources from those files on your machine, and never downloads or shares game files.",
  },
  {
    icon: ChipIcon,
    title: "Native on three platforms",
    body: "Linux, macOS on Apple Silicon and Windows. Worlds come from a Rust port of the vanilla generators, drawn with vanilla's block models, lighting, sky and fog.",
  },
  {
    icon: CodeIcon,
    title: "Open source",
    body: "Horizon's code is MIT. It contains no Minecraft code, assets or data; those belong to Mojang and Microsoft under the Minecraft EULA.",
  },
];

export function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-14 pt-8 pb-8">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
        <div className="grid lg:grid-cols-[minmax(0,25rem)_3rem_minmax(0,1fr)_3rem_23rem]">
          <div className="reveal relative z-20 lg:col-start-1 lg:row-start-1">
            <p className="flex items-center gap-2.5 text-sm font-medium text-white/60">
              What it is
              <HorizonLogo className="h-4 w-auto" />
            </p>
            <h2
              id="about-title"
              className="mt-5 font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-white"
            >
              Same inputs, identical outputs.
            </h2>
          </div>

          <div className="reveal relative z-20 mt-5 lg:col-span-3 lg:col-start-1 lg:row-start-2 lg:mt-0 lg:pt-8">
            <p className="text-lg leading-relaxed text-pretty text-white/65">
              Horizon, sometimes called Minecraft Rust Edition, rebuilds Minecraft: Java Edition 26.3 in Rust, one
              subsystem at a time, and holds every piece to the same inputs as the vanilla game until the outputs are
              identical.
            </p>
            <a
              href={CONTRIBUTORS_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium text-[#a98fff] underline decoration-[#a98fff]/40 underline-offset-4 transition-colors hover:text-[#c4b5ff] hover:decoration-[#c4b5ff]"
            >
              Visit contributors
              <ExternalLinkIcon className="size-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>

          <div
            className="reveal relative mt-10 h-[15rem] overflow-hidden [clip-path:inset(0_round_1rem)] sm:h-[17rem] lg:col-span-3 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:h-auto"
          >
            <Image
              src="/about-wallpaper.jpg"
              alt="A Minecraft windmill above a field of lavender"
              fill
              sizes="(min-width: 1024px) 39rem, 100vw"
              className="-scale-x-100 object-cover object-[30%_center]"
            />
          </div>

          <div
            aria-hidden
            className="relative z-10 hidden rounded-tr-2xl bg-background lg:col-span-2 lg:col-start-3 lg:row-start-2 lg:block"
          >
            <span className="absolute -top-4 left-0 size-4 bg-[radial-gradient(circle_at_100%_0,transparent_16px,var(--background)_16.5px)]" />
            <span className="absolute bottom-0 left-full size-4 bg-[radial-gradient(circle_at_100%_0,transparent_16px,var(--background)_16.5px)]" />
          </div>
        </div>

        <ul className="mt-10 grid gap-10 md:grid-cols-3">
          {POINTS.map((point) => (
            <li key={point.title} className="reveal">
              <h3 className="flex items-center gap-2.5 text-lg font-medium text-white">
                <point.icon className="size-5 shrink-0" />
                {point.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-pretty text-white/60">{point.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
