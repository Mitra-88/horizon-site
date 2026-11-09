import { createElement, Fragment, type ReactNode } from "react";

// Message helpers with no messages in them, so client components can use them without shipping the JSON files.

// "{n} new" with { n: 3 } → "3 new".
export function format(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (all, name: string) => (name in values ? String(values[name]) : all));
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
