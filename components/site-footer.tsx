import Link from "next/link";
import type { ReactNode } from "react";
import { GitHubIcon, HorizonMark, MicrosoftIcon, MojangIcon, RustIcon } from "@/components/icons";
import { getMessages, LOCALES, rich, type Locale } from "@/components/i18n";
import { localePath } from "@/components/i18n-text";
import { LanguageSwitch } from "@/components/language-switch";
import { GITHUB_URL } from "@/components/links";

// Paddle's website review and Mojang's guidelines want these reachable from every page.
const LEGAL = [
  { href: "/privacy", key: "privacy" },
  { href: "/terms", key: "terms" },
  { href: "/refunds", key: "refunds" },
  { href: "/shop", key: "shop" },
] as const;

const LEGAL_LINK =
  "font-medium text-white/80 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60";

const GITHUB_PRIVACY_URL = "https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement";

function Out({ href, newTab, children }: { href: string; newTab: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-white/70 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60"
    >
      {children}
      <span className="sr-only"> {newTab}</span>
    </a>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-medium text-white/80">{children}</h2>;
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const { common, footer: t } = getMessages(locale);
  const out = (href: string) =>
    function OutLink(chunks: string) {
      return (
        <Out href={href} newTab={common.newTab}>
          {chunks}
        </Out>
      );
    };
  return (
    <footer className="mt-auto border-t border-white/[0.08]">
      <div className="mx-auto w-full max-w-6xl px-6 pt-14 pb-10 lg:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-16">
          <Link href={localePath(locale, "/")} className="flex shrink-0 items-center gap-2 text-white">
            <HorizonMark className="size-8" />
            <span className="font-display text-[19px] font-semibold tracking-[-0.02em]">Horizon</span>
          </Link>
          <div className="flex max-w-xl items-center gap-4 md:flex-row-reverse md:text-right">
            <p className="text-[15px] leading-relaxed font-medium text-pretty text-white/80">{t.disclaimer}</p>
            <span className="flex shrink-0 items-center gap-3 text-white/45">
              <MojangIcon className="size-6" />
              <MicrosoftIcon className="size-5" />
            </span>
          </div>
        </div>

        <div className="mt-12 grid gap-10 text-sm leading-relaxed text-pretty text-white/50 md:grid-cols-3 md:gap-12">
          <div>
            <Heading>{t.whoTitle}</Heading>
            <p className="mt-3">{rich(t.who, { lu4ovic: out("https://lu4ovic.com"), dezerx: out("https://dezerx.com") })}</p>
          </div>
          <div>
            <Heading>{t.licencesTitle}</Heading>
            <p className="mt-3">
              {rich(t.licences, { mit: out(`${GITHUB_URL}/blob/main/LICENSE`), ofl: out("https://openfontlicense.org") })}
            </p>
          </div>
          <div>
            <Heading>{t.privacyTitle}</Heading>
            <p className="mt-3">
              {rich(t.privacy, { github: out(GITHUB_PRIVACY_URL), telemetry: out(`${GITHUB_URL}/blob/main/docs/telemetry.md`) })}
            </p>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {LEGAL.map(({ href, key }) => (
                <Link key={href} href={href} className={LEGAL_LINK}>
                  {t.legal[key]}
                </Link>
              ))}
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/[0.08] pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            {t.madeInRust}
            <RustIcon className="size-4" />
          </p>
          {/* One line on every width, so the language links add no height (horizon-site#29). */}
          <div className="flex items-center gap-4">
            <LanguageSwitch
              languages={LOCALES.filter((l) => l !== locale).map((l) => ({ locale: l, name: getMessages(l).languageName }))}
              className="transition-colors hover:text-white"
            />
            <a href={GITHUB_URL} className="inline-flex items-center gap-2 transition-colors hover:text-white">
              <GitHubIcon className="size-4" />
              {GITHUB_URL.replace("https://github.com/", "")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
