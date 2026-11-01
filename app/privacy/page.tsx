import Link from "next/link";
import type { ReactNode } from "react";
import { pageMetadata } from "@/components/site";

export const metadata = pageMetadata({
  title: "Privacy · Horizon",
  description:
    "What this website keeps about you, and what it doesn't: no cookies for visitors, no analytics, and one hashed count of release views.",
  path: "/privacy",
});

const LINK = "text-[#c4b5ff] underline decoration-[#c4b5ff]/40 underline-offset-4 transition-colors hover:text-white";

function Out({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={LINK}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-[1.6rem] leading-tight font-semibold tracking-[-0.02em] text-white">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Key({ children }: { children: ReactNode }) {
  return <code className="rounded bg-white/[0.07] px-1 py-0.5 font-mono text-[0.88em] text-[#e7e1ff]">{children}</code>;
}

export default function PrivacyPage() {
  return (
    <main>
      <article className="mx-auto w-full max-w-3xl px-6 pt-32 pb-20 text-[16px] leading-relaxed text-pretty text-white/70 sm:pt-40 sm:pb-28 lg:px-10">
        <p className="text-sm font-medium text-white/60">Privacy</p>
        <h1 className="mt-4 font-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.04] font-semibold tracking-[-0.035em] text-white">
          <span className="block">This site keeps</span>
          <span className="text-accent block pb-1">almost nothing.</span>
        </h1>
        <p className="mt-6 text-lg text-white/70">
          What this website keeps about you, and what it doesn&apos;t. The Horizon launcher and game have their own rules, set by the Horizon project:
          they are on <Out href="https://playhorizon.dev/privacy">Horizon&apos;s privacy page</Out>.
        </p>

        <Part title="In short">
          <ul className="list-disc space-y-2 pl-5 marker:text-white/30">
            <li>No cookies for visitors. Signing in, as a staff member or to submit or rate a mod, sets one session cookie.</li>
            <li>No analytics, trackers or ads.</li>
            <li>One thing is kept on the server: a one-way hash of your IP address when you open a release, so each release counts each visitor once.</li>
            <li>A few choices you make stay in your own browser, and never leave it.</li>
          </ul>
        </Part>

        <Part title="Release views">
          <p>
            Each release on <Link href="/releases" className={LINK}>Releases</Link> shows how many people opened it. When you open one, the server turns
            your IP address into a one-way hash, using a secret key that stays on the server, and keeps that hash next to the release. The address itself
            is never stored, and the hash can&apos;t be turned back into it. The same address opening the same release again counts once.
          </p>
          <p>
            The hashes are used only to keep those counts, are not linked to anything else, and are never shared. Only the number of views is shown.
          </p>
        </Part>

        <Part title="What stays in your browser">
          <p>The site remembers three choices in your browser&apos;s local storage. They stay on your device and are never sent to the server:</p>
          <ul className="list-disc space-y-2 pl-5 marker:text-white/30">
            <li>
              <Key>horizon:seen-releases</Key>: which releases you have opened, so the list can mark new ones.
            </li>
            <li>
              <Key>horizon:partners-hidden</Key>: that you hid the partner banner.
            </li>
            <li>
              <Key>hub:detail</Key>: whether the Hub reads in simple or technical words.
            </li>
          </ul>
          <p>Clearing this site&apos;s data in your browser removes them.</p>
        </Part>

        <Part title="What your browser loads from GitHub">
          <p>
            Contributors&apos; and mod authors&apos; pictures come from avatars.githubusercontent.com, mod icons from horizon-rust.github.io, and every
            download from github.com. Those requests go from your browser to GitHub, and{" "}
            <Out href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement">GitHub&apos;s privacy statement</Out> covers
            them. Nothing else on this site is loaded from another company.
          </p>
        </Part>

        <Part title="Signing in">
          <p>
            The staff dashboards and the mod registry&apos;s sign-in are run by the Horizon project&apos;s own services; this site only passes your requests on
            to them. Signing in to the dashboards sets an HttpOnly session cookie from Kira, Horizon&apos;s Discord bot, that ends after 12 hours without use
            and 7 days at most. Signing in with GitHub to submit or rate a mod sets the registry&apos;s session cookie for 12 hours, or until you sign out. Both
            go only to the service that set them, and the Horizon project is responsible for what those services keep.
          </p>
        </Part>

        <Part title="What the server fetches">
          <p>
            To show releases, the roadmap, contributors and mods, the server fetches them from GitHub, from Horizon&apos;s mod registry and from the
            registry&apos;s ratings. The Players page&apos;s counts come from Horizon&apos;s telemetry server through this site&apos;s server too, so your
            browser never contacts it. Those requests carry nothing about you.
          </p>
        </Part>

        <Part title="The launcher, the game and Discord">
          <p>
            What the Horizon launcher and game can send, the &ldquo;I&apos;m playing&rdquo; ping, the mod registry&apos;s sign-in and Horizon&apos;s Discord
            are run by the Horizon project, and Ludovic Marie is responsible for them. Read{" "}
            <Out href="https://playhorizon.dev/privacy">Horizon&apos;s privacy page</Out> for what they keep, and write through{" "}
            <Out href="https://lu4ovic.com/#contact">lu4ovic.com</Out> about it.
          </p>
        </Part>

        <Part title="Who is responsible, and your rights">
          <p>
            This website is developed and run by Anthony S of <Out href="https://dezerx.com">DezerX</Out>, who is responsible for what it keeps. You can ask
            what it holds about you, or have it deleted, through dezerx.com. Because only a hash of your address is kept, include the IP address you used,
            so your entry can be found. You can also complain to the data protection authority where you live.
          </p>
          <p className="text-sm text-white/45">Last updated on 31 October 2026.</p>
        </Part>
      </article>
    </main>
  );
}
