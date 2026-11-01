import Link from "next/link";
import type { ReactNode } from "react";
import { GitHubIcon, HorizonMark, MicrosoftIcon, MojangIcon, RustIcon } from "@/components/icons";
import { GITHUB_URL } from "@/components/links";

const GITHUB_PRIVACY_URL = "https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement";

function Out({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-white/70 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-medium text-white/80">{children}</h2>;
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/[0.08]">
      <div className="mx-auto w-full max-w-6xl px-6 pt-14 pb-10 lg:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-16">
          <Link href="/" className="flex shrink-0 items-center gap-2 text-white">
            <HorizonMark className="size-8" />
            <span className="font-display text-[19px] font-semibold tracking-[-0.02em]">Horizon</span>
          </Link>
          <div className="flex max-w-xl items-center gap-4 md:flex-row-reverse md:text-right">
            <p className="text-[15px] leading-relaxed font-medium text-pretty text-white/80">
              Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
            </p>
            <span className="flex shrink-0 items-center gap-3 text-white/45">
              <MojangIcon className="size-6" />
              <MicrosoftIcon className="size-5" />
            </span>
          </div>
        </div>

        <div className="mt-12 grid gap-10 text-sm leading-relaxed text-pretty text-white/50 md:grid-cols-3 md:gap-12">
          <div>
            <Heading>Who makes it</Heading>
            <p className="mt-3">
              Horizon is made by Ludovic Marie; reach him through <Out href="https://lu4ovic.com">lu4ovic.com</Out>. This
              site is developed by Anthony S of <Out href="https://dezerx.com">DezerX</Out>, who is responsible for it. Horizon
              contains no Minecraft code, assets or data,
              and this site offers no game files: you need your own legally obtained copy of Minecraft: Java Edition.
              Minecraft is a trademark of Mojang Synergies AB.
            </p>
          </div>
          <div>
            <Heading>Licences</Heading>
            <p className="mt-3">
              Horizon&apos;s original work is under the <Out href={`${GITHUB_URL}/blob/main/LICENSE`}>MIT licence</Out>
              . The fonts are Geist and Geist Mono, under the{" "}
              <Out href="https://openfontlicense.org">SIL Open Font License</Out>. Every asset on this site is listed
              in LEGAL.md.
            </p>
          </div>
          <div>
            <Heading>Privacy</Heading>
            <p className="mt-3">
              This site sets no cookies, has no analytics or trackers and loads nothing from third parties except
              GitHub. When you open a release, the server keeps a one-way hash of your IP address so that release counts
              each visitor once; the address itself is never stored. To show the latest releases, patch notes, links and contributors, your browser asks
              api.github.com and raw.githubusercontent.com for them, and avatars.githubusercontent.com for the
              contributors&apos; pictures; <Out href={GITHUB_PRIVACY_URL}>GitHub&apos;s privacy statement</Out> covers
              those requests. The launcher sends nothing unless you allow it:{" "}
              <Out href={`${GITHUB_URL}/blob/main/docs/telemetry.md`}>what it can send, and how to delete it</Out>.
            </p>
            <p className="mt-3">
              <Link
                href="/privacy"
                className="font-medium text-white/80 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60"
              >
                Privacy policy
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/[0.08] pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            Made in the open, in Rust.
            <RustIcon className="size-4" />
          </p>
          <a href={GITHUB_URL} className="inline-flex items-center gap-2 transition-colors hover:text-white">
            <GitHubIcon className="size-4" />
            {GITHUB_URL.replace("https://github.com/", "")}
          </a>
        </div>
      </div>
    </footer>
  );
}
