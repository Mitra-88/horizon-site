# Horizon's website

Live at **https://playhorizon.dev**. The game, the launcher and their developer docs are in
[horizon-rust/horizon](https://github.com/horizon-rust/horizon); this repository is only the site.

The site is a Next.js 16 app (App Router with Cache Components, React 19, Tailwind CSS 4), designed and developed by
Anthony S of [DezerX](https://dezerx.com).

## Working on it

You need Node 22 or newer.

```sh
git clone https://github.com/horizon-rust/horizon-site && cd horizon-site
npm ci
npm run dev                      # http://localhost:3000
npm run build && npm start       # the production build, as Railway runs it
npm run lint
```

- **A push to `main` goes live.** Railway builds the `Dockerfile` and deploys https://playhorizon.dev within a few
  minutes of every push to `main`. If the build or the healthcheck fails, the previous version stays online. For
  anything bigger than a typo, push a branch and open a pull request first.

## Layout

```
app/                    the routes: /, /hub, /mods, /mods/<id>, /mods/submit, /mods/policy, /releases,
                        /benchmarks, /stats, /docs, /docs/<page>, /privacy, /apply, and the staff's
                        pages inside the hub: /hub/team, /hub/mod, /hub/sign-in, /hub/setup, /hub/staff-help
                        (the old /staff/* addresses redirect there)
app/api/                the registry and players proxies, and release view counts
app/staff/api/          the staff dashboards' proxy to Kira's service
app/data/               /data/roadmap.json and /data/journal.json, which Kira reads
app/sitemap.ts, robots.ts, manifest.ts, opengraph-image.tsx, llms.txt/, og/docs/
                        search and sharing: sitemap, robots, share cards, the summary for AI search
components/             every section, page part and data loader
components/site.ts      the canonical address (SITE_URL), titles, descriptions and pageMetadata()
content/docs/           the player docs (*.md) and their navigation (nav.json)
content/benchmarks/     our benchmark runs
vendor/horizon-site/    the previous site's hub code, unchanged; it builds /data/journal.json
public/                 images, icons and /benchmarks.json
Dockerfile, railway.json   the Railway service
```

The `/docs/api/*` pages come from `docs/api/` in the game's repository, read from GitHub.

## Where the data comes from

- **GitHub's API**: releases, contributors, the roadmap's issues and pull requests. Cached for about 15 minutes.
  `GITHUB_TOKEN` lifts the rate limit.
- **Fresh within a minute**: every GitHub loader carries a cache tag (`components/github-fresh.ts`: the game's main,
  its issues and pull requests, its releases, horizon-mods' main). Kira gets GitHub's organization webhook and calls
  `POST /api/revalidate` (`Authorization: Bearer $REVALIDATE_SECRET`, body `{"tags": [...]}`) for what changed; the
  tagged data expires at once and Kira loads the main pages again. Files of a main branch are read at its current
  commit (`rawMainUrl`), because raw.githubusercontent.com keeps a branch's files for five minutes. Without the call,
  each loader's own `cacheLife` applies, as before.
- **The game's `main`**: `README.md` (parity numbers), `roadmap/roadmap.json` (the hub) and `docs/api/*.md`.
- **The mod registry**: the index at horizon-rust.github.io/horizon-mods, ratings and submissions through
  `REGISTRY_UPSTREAM`.
- **Telemetry**: the Players page reads `telemetry.playhorizon.dev` (or `TELEMETRY_URL`) through this site's server.

## Kira's feeds

`/data/roadmap.json` is the game repository's `roadmap/roadmap.json` as it is. `/data/journal.json` is built by
`journalJson()` in `vendor/horizon-site/hub.js`, the previous site's code, from the same GitHub requests the previous
build made. Kira posts each entry id once, so the ids must not change: leave `vendor/` and
`components/journal-feed.ts` alone unless Kira is changed with them. When GitHub does not answer, both feeds answer
503 instead of a partial feed.

## Environment

Railway service variables:

| Variable | What it does |
| --- | --- |
| `GITHUB_TOKEN` | Lifts GitHub's rate limit at build and at run time |
| `REVALIDATE_SECRET` | The bearer token Kira sends to `POST /api/revalidate` (1Password `Site revalidate secret`; the same value is Kira's `KIRA_SITE_REVALIDATE_SECRET`). Without it the route answers 404 |
| `REGISTRY_UPSTREAM` | The registry's submission service; `/api/mods/*` is proxied to it |
| `STAFF_UPSTREAM`, `STAFF_PROXY_KEY` | Kira's staff service and the key both sides hold; `/staff/api/*` is proxied to it |
| `RELEASE_VIEWS_SALT` | Salt for the hashed release views. Without it the server keeps one in `.data/` |
| `TELEMETRY_URL` | Optional, defaults to `https://telemetry.playhorizon.dev` |
| `SITE_URL` | Optional, defaults to `https://playhorizon.dev`; used for canonical links, the sitemap and share cards |

Release view counts live in `.data/`, which is reset by every deploy unless a volume is mounted at `/app/.data`.

## Rules the site keeps

- The disclaimer, "Not an official Minecraft product. Not approved by or associated with
  Mojang or Microsoft.", is under the headline, in the phone menu, the footer and the 404 page.
- No Minecraft logo or wordmark; "Minecraft" appears only descriptively ("for Minecraft:
  Java Edition 26.3"). No game files are offered or linked.
- Parity is worded as the README words it: 100% of what the harnesses compare.
- No cookies, analytics, trackers or third-party fonts and scripts.
- Motion stops under `prefers-reduced-motion`; nothing hijacks the scroll.

## Licences

Every asset is listed in [LEGAL.md](LEGAL.md).
