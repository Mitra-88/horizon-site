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

## Rules

- Branch work in a worktree under `.claude/worktrees/<name>`; keep the main checkout on `main`.
- The site's rules (disclaimer, no Minecraft logo, no trackers, reduced motion): README "Rules the site keeps".
- Agents' PRs start with `> 🤖 Opened by Ludovic's AI agent (Claude), not by Ludovic himself.`, comments with
  `🤖 Agent:`; commits end with a `Co-Authored-By:` line for the agent.
- Never commit Mojang's files, secrets, or `.next/` and `.data/`.
