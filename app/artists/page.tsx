import type { ReactNode } from "react";
import { DiscordIcon } from "@/components/icons";
import { DISCORD_URL } from "@/components/links";
import { pageMetadata } from "@/components/site";

export const metadata = pageMetadata({
  title: "3D artists · Horizon",
  description:
    "Horizon welcomes 3D artists to make cosmetics for its players: hats, back items, shoulder pets, trails and emotes in a blocky style. Say hello on Discord.",
  path: "/artists",
});

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

export default function ArtistsPage() {
  return (
    <main>
      <article className="mx-auto w-full max-w-3xl px-6 pt-32 pb-20 text-[16px] leading-relaxed text-pretty text-white/70 sm:pt-40 sm:pb-28 lg:px-10">
        <p className="text-sm font-medium text-white/60">3D artists</p>
        <h1 className="mt-4 font-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.04] font-semibold tracking-[-0.035em] text-white">
          <span className="block">We&apos;re looking for</span>
          <span className="text-accent block pb-1">3D artists.</span>
        </h1>
        <p className="mt-6 text-lg text-white/70">
          Horizon welcomes 3D artists to make cosmetics for Horizon players: things players wear and carry that other Horizon players see in every
          world and on every server. If you like making small, blocky models, we&apos;d like to hear from you.
        </p>

        <Part title="What we'd make together">
          <ul className="list-disc space-y-2 pl-5 marker:text-white/30">
            <li>Hats and other head pieces.</li>
            <li>Back items, such as backpacks or rigid wings.</li>
            <li>Small pets that ride on a player&apos;s shoulder.</li>
            <li>Auras and trails made of a few particles.</li>
            <li>Emotes: short animations for the player&apos;s own model.</li>
          </ul>
          <p>Cosmetics only change how a player looks, never how the game plays.</p>
        </Part>

        <Part title="What fits">
          <ul className="list-disc space-y-2 pl-5 marker:text-white/30">
            <li>Low-poly models in Minecraft&apos;s blocky style, built from a few dozen cubes, with small pixel textures (16 to 64 pixels).</li>
            <li>Your own designs. No copies of Minecraft&apos;s mobs and items, or of anyone else&apos;s work.</li>
            <li>Art for every age, that still reads at a distance.</li>
            <li>No capes, or anything that hangs from the shoulders like one.</li>
            <li>Blockbench is welcome. Animation is a plus, not a requirement.</li>
          </ul>
        </Part>

        <Part title="Get in touch">
          <p>
            Join Horizon&apos;s Discord and say you&apos;re a 3D artist, with a few pieces you&apos;ve made: links or pictures are fine. If you&apos;d rather
            write privately, write through{" "}
            <a href={CONTACT_URL} target="_blank" rel="noreferrer" className={LINK}>
              lu4ovic.com
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            .
          </p>
          <p className="pt-2">
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2.5 rounded-xl bg-[#5865f2] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#4752c4]"
            >
              <DiscordIcon className="size-5" />
              Join the Discord
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </Part>
      </article>
    </main>
  );
}
