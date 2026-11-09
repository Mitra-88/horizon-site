// npm run i18n:unreviewed -- es [--count]
// Lists the entries of messages/<lang>.json that no Spanish (or other) speaker has checked yet. An entry is reviewed
// when messages/review/<lang>.json holds its key with exactly its present text; a later change makes it unreviewed
// again. The site never reads the review files. Only a person who speaks the language adds to them (horizon-site#29,
// the same rule as the game's docs/translations.md).
import { readFileSync } from "node:fs";

const [lang, flag] = process.argv.slice(2);
if (!lang) {
  console.error("usage: npm run i18n:unreviewed -- <lang> [--count]");
  process.exit(2);
}
const read = (path) => JSON.parse(readFileSync(new URL(`../messages/${path}`, import.meta.url), "utf8"));
const flat = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) => (typeof v === "object" ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]));

const english = Object.fromEntries(flat(read("en.json")));
const reviewed = Object.fromEntries(flat(read(`review/${lang}.json`)));
const open = flat(read(`${lang}.json`)).filter(([key, text]) => reviewed[key] !== text);

if (flag === "--count") console.log(`${lang}: ${open.length} unreviewed`);
else for (const [key, text] of open) console.log(`${key}\n  en: ${english[key]}\n  ${lang}: ${text}\n`);
