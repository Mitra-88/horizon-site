import en from "@/messages/en.json";

// The site's text, one JSON file per language in messages/. Import this from server components only: it holds every
// language's messages. Client components receive their strings as props and use the helpers in i18n-text.ts.

// The site's languages. English is the default and keeps its URLs; the others live under /<locale>/ (horizon-site#29).
export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];
export type Messages = typeof en;

const MESSAGES: Record<Locale, Messages> = { en };

// The BCP 47 tag that numbers and dates are written with.
export const NUMBER_LOCALE: Record<Locale, string> = { en: "en-US" };

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

export { format, rich } from "@/components/i18n-text";
