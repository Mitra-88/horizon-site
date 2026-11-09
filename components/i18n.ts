import { LOCALES, localePath, TRANSLATED_PATHS, type Locale } from "@/components/i18n-text";
import en from "@/messages/en.json";
import es from "@/messages/es.json";

// The site's text, one JSON file per language in messages/. Import this from server components only: it holds every
// language's messages. Client components receive their strings as props and use the helpers in i18n-text.ts.

export type Messages = typeof en;
export { LOCALES, type Locale };

// es.json must have every key en.json has: a missing one fails the type check.
const MESSAGES: Record<Locale, Messages> = { en, es: es satisfies Messages };

// The BCP 47 tag that numbers and dates are written with.
export const NUMBER_LOCALE: Record<Locale, string> = { en: "en-US", es: "es-ES" };

// og:locale.
export const OG_LOCALE: Record<Locale, string> = { en: "en_US", es: "es_ES" };

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

// hreflang links for a page that exists in every language: { en: "/", es: "/es", "x-default": "/" }.
export function languageAlternates(path: string): Record<string, string> | undefined {
  if (!TRANSLATED_PATHS.includes(path)) return undefined;
  return { ...Object.fromEntries(LOCALES.map((l) => [l, localePath(l, path)])), "x-default": path };
}

export { format, rich } from "@/components/i18n-text";
