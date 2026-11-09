"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { switchPath, type Locale } from "@/components/i18n-text";

type Language = { locale: Locale; name: string };

// The footer's links to the same page in the other languages (horizon-site#29). The path is runtime data, so it is read
// inside <Suspense> as the header does; the fallback links to each language's home page.
export function LanguageSwitch({ languages, className }: { languages: Language[]; className: string }) {
  return (
    <Suspense fallback={<Links languages={languages} className={className} pathname="/" />}>
      <LinksAtPath languages={languages} className={className} />
    </Suspense>
  );
}

function LinksAtPath(props: { languages: Language[]; className: string }) {
  return <Links {...props} pathname={usePathname()} />;
}

function Links({ languages, className, pathname }: { languages: Language[]; className: string; pathname: string }) {
  return languages.map(({ locale, name }) => (
    <a key={locale} href={switchPath(locale, pathname)} hrefLang={locale} lang={locale} className={className}>
      {name}
    </a>
  ));
}
