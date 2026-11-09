import { createElement, Fragment, type ReactNode } from "react";

// The languages and message helpers, with no messages in them, so client components can use them without shipping the
// JSON files.

// English is the default and keeps its URLs; the others live under /<locale>/ (horizon-site#29).
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

// The pages that exist in every language, by their English path. A page joins when its text is translated.
export const TRANSLATED_PATHS = ["/", "/releases", "/benchmarks", "/mods", "/stats", "/artists"];

// A page's English path from its path in any language: "/es" → "/", "/es/releases" → "/releases".
export function englishPath(pathname: string): string {
  const [, first, ...rest] = pathname.split("/");
  return LOCALES.includes(first as Locale) && first !== "en" ? `/${rest.join("/")}` : pathname;
}

// Where a link to an English path goes in `locale`: its translation when there is one, else the English page.
// Keeps a #fragment: ("es", "/#about") → "/es#about".
export function localePath(locale: Locale, href: string): string {
  const [path, hash] = href.split("#");
  if (locale === "en" || !TRANSLATED_PATHS.includes(path)) return href;
  return `/${locale}${path === "/" ? "" : path}${hash === undefined ? "" : `#${hash}`}`;
}

// The same page in another language, or that language's home page when the page has no translation.
export function switchPath(target: Locale, pathname: string): string {
  const english = englishPath(pathname);
  return localePath(target, TRANSLATED_PATHS.includes(english) ? english : "/");
}

// "{n} new" with { n: 3 } → "3 new".
export function format(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (all, name: string) => (name in values ? String(values[name]) : all));
}

// Like format, but each value stays its own text node, as JSX's `{a} text {b}` renders: the browser shapes text
// node by node, so joining them into one string moves glyphs by a fraction of a pixel.
export function formatParts(text: string, values: Record<string, string | number>): (string | number)[] {
  const out: (string | number)[] = [];
  let last = 0;
  for (const m of text.matchAll(/\{(\w+)\}/g)) {
    if (!(m[1] in values)) continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(values[m[1]]);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Tag = (chunks: string) => ReactNode;

// Renders a message with tag markers through the component's own elements:
// rich("Written in <rust>Rust</rust>", { rust: (c) => <a href=…>{c}</a> }). `<br/>` style markers take no text.
export function rich(text: string, tags: Record<string, Tag>): ReactNode {
  const parts: ReactNode[] = [];
  const marker = /<(\w+)\/>|<(\w+)>([\s\S]*?)<\/\2>/g;
  let last = 0;
  for (let match = marker.exec(text); match; match = marker.exec(text)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const name = match[1] ?? match[2];
    const render = tags[name];
    if (!render) throw new Error(`No element for <${name}> in "${text}"`);
    parts.push(createElement(Fragment, { key: parts.length }, render(match[3] ?? "")));
    last = marker.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
