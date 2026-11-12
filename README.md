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
app/                    the routes: /, /hub, /mods, /mods/<id>, /mods/submit, /mods/mine, /mods/policy, /releases,
                        /benchmarks, /stats, /docs, /docs/<page>, /privacy, /apply, and the staff's
                        pages inside the hub: /hub/team, /hub/mod, /hub/sign-in, /hub/setup, /hub/staff-help
                        (the old /staff/* addresses redirect there; /hub/mod has a Cases tab: Kira's numbered mod
                        cases and appeals), and /hub/appeal: the appeal form for people banned from the Discord
                        server or the official Minecraft server (the link Kira DMs, or Discord sign-in; Kira's
                        appeal/* routes behind the same proxy; timeouts and quarantines are appealed on Discord)
app/api/                the registry and players proxies, release view counts, and an account's registry
                        submissions (/api/mod-submissions, read from horizon-mods' pull requests for /mods/mine)
app/staff/api/          the staff dashboards' proxy to Kira's service
app/data/               /data/roadmap.json and /data/journal.json, which Kira reads
app/sitemap.ts, robots.ts, manifest.ts, opengraph-image.tsx, llms.txt/, og/docs/
                        search and sharing: sitemap, robots, share cards, the summary for AI search
app/perf/, lib/perf/     /perf: the performance capture viewer (its own root layout; strings in messages/perf/)
vendor/perf/            the pinned reader bundle's provenance and checksums
components/             every section, page part and data loader
components/site.ts      the canonical address (SITE_URL), titles, descriptions and pageMetadata()
content/docs/           the player docs (*.md) and their navigation (nav.json)
content/benchmarks/     our benchmark runs
vendor/horizon-site/    the previous site's hub code, unchanged; it builds /data/journal.json
public/                 images, icons and /benchmarks.json
Dockerfile, railway.json   the Railway service
```

The `/docs/api/*` pages come from `docs/api/` in the game's repository, read from GitHub.

## The performance viewer

`/perf` opens `.hzperf` captures recorded by the game's `/profiler`, `horizon-ctl profile` or a server's `profile`
command. The file is read in the browser by the game's capture reader, built to WebAssembly: pick a file, paste or
drop one. Compare takes a second capture the same ways. The game's **[Open]** (and `horizon-perf open`) serves the
file once on 127.0.0.1 behind a random token and opens `/perf#local=http://127.0.0.1:<port>/<token>`: the viewer
checks the address has exactly that form, drops the fragment, fetches the file once and opens it like a dropped one.
Only `/perf`'s CSP allows `connect-src` to `http://127.0.0.1:*` and `http://localhost:*`. The Ticks, Spans, Functions, GPU, Memory, Network and World
tabs read the same capture.

The reader is not built here. `public/perf/horizon_perf.wasm` and its wrapper `lib/perf/generated/horizon_perf.js`
are checked in with the fonts and icon, so a build needs only Node. `vendor/perf/manifest.json` records the game
revision they were built from and each file's checksum; `vendor/perf/source.patch` holds any reader change that was
not committed when the bundle was imported. `npm run perf:check` verifies the bundle and runs before `dev` and
`build`. To update it, check out the game revision, then:

```sh
cargo xtask perf-wasm                                   # in the game repository
npm run perf:import -- /path/to/horizon /path/to/perf-wasm-output
npm test && npm run typecheck && npm run lint && npm run build
```

Import the wasm and its wrapper together. `npm test` runs the viewer's unit tests (`lib/perf/**/*.test.ts`).

### Sharing a capture

**Share** shows what a capture can contain and asks before uploading; it is the only upload, and a link opens at
`/perf/c/<id>`. The upload API keeps the original bytes in an S3-compatible bucket and its metadata in SQLite
(`node:sqlite`); both need persistent storage, backed up together.

| Method | Path | Result |
| --- | --- | --- |
| POST | `/api/perf/captures` | Validates the raw bytes, stores them unchanged; returns an id, a temporary link and a delete token |
| GET | `/api/perf/captures/<id>` | The original bytes, cached as immutable |
| GET | `/api/perf/captures/<id>/meta` | Size, creation, expiry, share state and a summary from the reader |
| POST | `/api/perf/captures/<id>/share` | Keeps it for `PERF_SHARED_DAYS`; needs `Authorization: Bearer <delete_token>` |
| DELETE | `/api/perf/captures/<id>` | Deletes it; needs the same token |
| POST | `/api/perf/sweep` | Removes expired or abandoned uploads; needs `Authorization: Bearer $PERF_SWEEP_TOKEN` |

An upload is validated by the same bundled reader in a worker, with a timeout and bounded inflation, at most two at a
time. Unshared uploads expire after an hour; sharing keeps one for 30 days from the first share. Expired links stop
answering at once; call the sweep endpoint every few minutes to free their bytes. New uploads stop at 90% of
`PERF_STORAGE_BYTES`, and shared captures are never evicted early. Replies: 415 not a capture, 422 a newer format,
413 too large, 403 wrong token, 507 storage full, 429 too many uploads. JSON replies are `no-store`.

| Variable | Default or requirement |
| --- | --- |
| `PERF_S3_ENDPOINT`, `PERF_S3_BUCKET` | Required |
| `PERF_S3_ACCESS_KEY`, `PERF_S3_SECRET_KEY` | Required |
| `PERF_S3_REGION` | `us-east-1` |
| `PERF_PUBLIC_URL` | The public origin for share links; falls back to `SITE_URL` |
| `PERF_DATABASE` | `.data/perf.sqlite` |
| `PERF_MAX_BYTES` | `67108864` (64 MiB per capture) |
| `PERF_STORAGE_BYTES` | `1073741824` (1 GiB of captures in all) |
| `PERF_SHARED_DAYS` | `30` |
| `PERF_HOURLY_UPLOADS` | `20` uploads per address an hour |
| `PERF_TRUST_PROXY` | `false`; `true` only behind a proxy that sets `X-Forwarded-For` (its last entry is the client) |
| `PERF_SWEEP_TOKEN` | Required by `/api/perf/sweep` |

Without the `PERF_S3_*` variables the viewer still opens local files; only the API answers 503.
`npm run test:api` runs the built standalone server (`.next/standalone`, with `public/` and `.next/static` copied in)
against the S3 endpoint in those variables: it uploads, reads, shares, deletes and rejects bad captures.

### Timing lows

The summary shows 1% and 0.1% lows for frames and ticks, and the mean of each slow tail. A low is 1000 divided by the
mean duration of the slowest `ceil(count × fraction)` frames or ticks; tick lows are work-based TPS capped at 20. The
count and the rounding are shown so a short capture is not read as a large sample. Captures from before the recorder
kept every duration (`SpanSummary.timing`) show the lows as unavailable: the viewer never estimates them.

## Where the data comes from

- **GitHub's API**: releases, contributors, the roadmap's issues and pull requests. Cached for about 15 minutes.
  `GITHUB_TOKEN` lifts the rate limit.
- **Fresh within a minute**: every GitHub loader carries a cache tag (`components/github-fresh.ts`: the game's main,
  its issues and pull requests, its releases, horizon-mods' main). Kira gets GitHub's organization webhook and calls
  `POST /api/revalidate` (`Authorization: Bearer $REVALIDATE_SECRET`, body `{"tags": [...]}`) for what changed; the
  tagged data expires at once and Kira loads the main pages again. Files of a main branch are read at its current
  commit (`rawMainUrl`), because raw.githubusercontent.com keeps a branch's files for five minutes. Without the call,
  each loader's own `cacheLife` applies, as before.
- **Through Kira**: `components/github-api.ts` sends the REST reads to `GITHUB_PROXY_URL` (Kira's allowlisted proxy),
  so revalidating on every change doesn't run into the 60 requests an hour this host gets without a token.
- **The game's `main`**: `README.md` (parity numbers), `roadmap/roadmap.json` (the hub) and `docs/api/*.md`.
- **The mod registry**: the index at horizon-rust.github.io/horizon-mods, ratings and submissions through
  `REGISTRY_UPSTREAM`.
- **The official server's market**: `/hub/market` reads Kira's `/smp/market.json` (the page the SMP mod writes on the server, read by Kira once a minute) through `/api/market`.
- **Telemetry**: the Players page reads `telemetry.playhorizon.dev` (or `TELEMETRY_URL`) through this site's server.
- **Cosmetics**: `/shop` (the founder set, free to claim in the launcher) reads `cosmetics.playhorizon.dev`'s
  `/v1/catalogue` and the items' files through this site's server, cached for a minute. The page, its nav entry and its
  sitemap line exist only while the service says the claim window is open; otherwise `/shop` is a 404. Nobody signs in
  on the site.

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
| `GITHUB_PROXY_URL` | `https://mcp.playhorizon.dev/github/proxy`: GitHub's REST API read through Kira (its GitHub App and ETag cache, with `REVALIDATE_SECRET` as the bearer), since this service has no GitHub token; when Kira doesn't answer, reads go to api.github.com directly |
| `REGISTRY_UPSTREAM` | The registry's submission service; `/api/mods/*` is proxied to it |
| `STAFF_UPSTREAM`, `STAFF_PROXY_KEY` | Kira's staff service and the key both sides hold; `/staff/api/*` is proxied to it |
| `RELEASE_VIEWS_SALT` | Salt for the hashed release views. Without it the server keeps one in `.data/` |
| `TELEMETRY_URL` | Optional, defaults to `https://telemetry.playhorizon.dev` |
| `KIRA_URL` | Optional, Kira's address for `/api/market`; defaults to `https://kira-production-500e.up.railway.app` |
| `SITE_URL` | Optional, defaults to `https://playhorizon.dev`; used for canonical links, the sitemap and share cards |
| `COSMETICS_UPSTREAM` | Optional, defaults to `https://cosmetics.playhorizon.dev`: the cosmetics service `/shop` reads (server side only). Point it at a local stand-in for development and tests only, never on production |
| `SHOP_PREVIEW` | `1` shows `/shop` with a sample seven-day claim window (from the start of the current hour) while the service's window is closed, for previews. Never set it on production (it is ignored where `RAILWAY_ENVIRONMENT_NAME` is `production`) |

Release view counts live in `.data/`, which is reset by every deploy unless a volume is mounted at `/app/.data`.

## Rules the site keeps

- The disclaimer, "Not an official Minecraft product. Not approved by or associated with
  Mojang or Microsoft.", is under the headline, in the phone menu, the footer and the 404 page.
- No Minecraft logo or wordmark; "Minecraft" appears only descriptively ("for Minecraft:
  Java Edition 26.3"). No game files are offered or linked.
- Parity is worded as what the harnesses compare, never as a percentage or a "100% parity" claim (decided
  2026-11-09); the parity section's numbers are where the project started.
- No cookies, analytics, trackers or third-party fonts and scripts.
- Motion stops under `prefers-reduced-motion`; nothing hijacks the scroll.

## Licences

Every asset is listed in [LEGAL.md](LEGAL.md).
