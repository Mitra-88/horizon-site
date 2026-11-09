# horizon-site: playhorizon.dev

The website of Horizon (Minecraft: Java Edition 26.3 rewritten in Rust). The game, the launcher and their developer
docs are in [horizon-rust/horizon](https://github.com/horizon-rust/horizon), called "the game's repository" below.
[README.md](README.md) has the layout, the data sources, Kira's feeds and the environment; this page is the short map
for agents.

## Build and test

```sh
npm ci
npm run dev                  # http://localhost:3000
npm run build && npm start   # the production build
npm run lint
```

Next.js 16 with Cache Components: data loaders use `"use cache"` with `cacheLife`. Read the guide in
`node_modules/next/dist/docs/` before writing Next.js code; this version differs from older ones. Metadata files
(`opengraph-image`, `icon`) cannot live under a catch-all segment such as `app/docs/[...slug]`: Turbopack stops the
dev server. Doc share cards are served by `app/og/docs/[...slug]/route.ts` instead.

## Where the data comes from

- **The game's `main` on GitHub**: `README.md` (parity numbers), `roadmap/roadmap.json` (the hub, and
  `/data/roadmap.json`, which Kira reads), `docs/api/*.md` (the `/docs/api` pages). Change those in the game's
  repository, never here.
- **GitHub's API**: releases, contributors, the roadmap's issues and pull requests. Each loader has a cache tag (`components/github-fresh.ts`) that Kira revalidates through `POST /api/revalidate` when GitHub's webhook says it changed.
- **Other services**: the mod registry (`REGISTRY_UPSTREAM`), Kira's staff service (`STAFF_UPSTREAM`), the telemetry
  server (`telemetry.playhorizon.dev`).
- **This repository**: the pages (`app/`, `components/`), the player docs (`content/docs/`), our benchmark runs
  (`content/benchmarks/`, `public/benchmarks.json`), assets (`public/`).

## Kira's journal

`/data/journal.json` is built by `vendor/horizon-site/hub.js` (the previous site's code, unchanged) from the same
GitHub requests the previous build made. Kira posts each entry id once: never change how ids are made or which
entries the feed holds without changing Kira with it.

## Deploy

Railway project `horizon-site`, service `site`, environment `production`: every push to `main` here goes live within
minutes (Dockerfile: `next build`, then `next start` on `$PORT`). When the files above change on the game's `main`,
the site is redeployed from source: for now by `~/code/horizon-parity/tools/site_redeploy_watch.sh` on the Mac mini
(every 10 minutes), later by the game repository's `site-redeploy.yml` workflow. A failed build keeps the previous
deployment live. After a deploy, check https://playhorizon.dev (/, /hub, /mods, /docs, /releases, /benchmarks,
/data/roadmap.json, /data/journal.json).

## Text and translations

The text of the header, the footer, the 404 page and the home page lives in `messages/<lang>.json` (`en.json` is the
reference; `es.json` must have every key, `tsc` checks it), read through `components/i18n.ts` (`getMessages`, `rich`
for text with links in it, `format` for `{values}`). Client components get their strings as props and use
`components/i18n-text.ts`, which ships no JSON. Plan, routes and what stays English: horizon-site#29.

- English keeps its URLs under `app/(en)/`; Spanish pages live in `app/es/`, each a few lines rendering the same
  component with `locale="es"`. Each language has its own root layout (`components/site-shell.tsx`) for `<html lang>`;
  `app/global-not-found.tsx` serves addresses that match nothing.
- A page joins a language when its text is translated: add its English path to `TRANSLATED_PATHS`
  (`components/i18n-text.ts`), its `app/es/` file and `languages: languageAlternates(path)` in both pages' metadata.
  Header links, the footer's language links, hreflang and the sitemap follow.
- Machine translations start **unreviewed**: `messages/review/<lang>.json` holds the entries a speaker checked, with
  the text they checked; `npm run i18n:unreviewed -- es` lists the rest. Only a person who speaks the language adds to
  a review file (reports come through #translations on Discord).
- A translation never changes the layout: if a string is too long for its place, shorten the wording. Moving text
  must not change the rendered English page: compare the built HTML and screenshots before and after.

## Rules

- Branch work in a worktree under `.claude/worktrees/<name>`; keep the main checkout on `main`.
- The site's rules (disclaimer, no Minecraft logo, no trackers, reduced motion): README "Rules the site keeps".
- Agents' PRs start with `> 🤖 Opened by Ludovic's AI agent (Claude), not by Ludovic himself.`, comments with
  `🤖 Agent:`; commits end with a `Co-Authored-By:` line for the agent.
- Never commit Mojang's files, secrets, or `.next/` and `.data/`.
