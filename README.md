# Horizon's website

Live at **https://playhorizon.dev**. The game, the launcher and their developer docs are in
[ludovic111/horizon](https://github.com/ludovic111/horizon) (public); this repository (private) is only the site.

A landing page, a Releases page, a Benchmarks page and a documentation section in Horizon's design language (`docs/design-system.md`), with the tokens of
`crates/horizon-theme` (generated into the game repository's `crates/horizon-theme/tokens.css` by
`cargo run -p xtask -- tokens`, and read from there at build time):
the Blocks look: Pixelify Sans headings over Geist text, Horizon's purple in a light and a dark
appearance (the system's, or the toggle's), square panels with an outline, a bevel and a lip, a
stone texture and a pixel landscape drawn in code (`scripts/art.mjs`), and short, eased motion. A headline and the download, then a scroll through what it is, the screenshots, the parity grid, the launcher, the newest
releases, the community links and the contributors. Plain HTML, CSS and JavaScript; no framework and
no runtime dependencies.

Home, Releases, Benchmarks and every Docs page share the header and phone menu rendered by
`build.mjs`, with the same links, theme switch and Download button.

## Working on it

You need Node 22 or newer; nothing to install for the site itself.

```sh
git clone https://github.com/ludovic111/horizon-site && cd horizon-site
node build.mjs && node serve.mjs     # build dist/ and open http://localhost:4173
node --test src/ scripts/            # the tests; run them before you push
```

- **A push to `main` goes live.** Railway rebuilds and deploys https://playhorizon.dev within a few minutes of every
  push to `main`. If the build fails (a broken docs link, a missing image, an error in `build.mjs`), the previous
  version stays online and nothing breaks; fix it and push again. For anything bigger than a typo, push a branch and
  open a pull request first.
- **Some content isn't in this repository.** The parity table and harness count (the game's `README.md`), the
  Discord and Sponsor links (`launcher/links.json`), the API pages under `/docs/api` (`docs/api/`), the colours and
  spacing (`crates/horizon-theme/tokens.css`) and the hub's roadmap (`roadmap/roadmap.json`) come from
  [ludovic111/horizon](https://github.com/ludovic111/horizon) at build time. Change them there; the site redeploys
  by itself when they change on its `main`.
- **Content-Security-Policy.** The site is served with a strict CSP (`Caddyfile`). Inline `<script>` and `<style>`
  blocks in the page templates are fine: the build hashes each one and the server allows exactly those. Inline event
  handlers (`onclick="…"`), `style="…"` attributes and `javascript:` links are blocked: use a class and the
  stylesheet, or a listener in the page's script. Every script, style, font and image comes from this site; the only
  other origins allowed are GitHub (API, raw files, avatars), the mod registry's index and the telemetry server. A new
  origin needs a change to the CSP in the `Caddyfile`, and the site loads no third-party scripts, fonts or trackers.

## Layout

```
build.mjs          renders dist/ (no dependencies)
docs/*.md          the documentation, one Markdown file per page: "# Title", a lede paragraph, then sections
docs/nav.json      the order of the pages and the groups of the left navigation
serve.mjs          a tiny static server for local checks
src/index.html     the page, with {{placeholders}} build.mjs fills
src/404.html       the not-found page
src/privacy.html   what the launcher can send when players allow it, retention, deletion (/privacy)
src/releases.html  every release, newest first, with what it adds and fixes, its notes and downloads (/releases)
src/benchmarks.html Horizon against vanilla 26.3 on our machines, the hardware picker, players' results (/benchmarks)
src/hub.html       the hub (/hub, /roadmap redirects to its Roadmap tab): Overview, Roadmap, Kanban, Journal, Contribute, a Simple / Technical switch
src/mods.html      the registry's list (/mods) and a page per project (/mods/<id>), one template
src/docs.html      the template of every documentation page (/docs/...), with its left navigation
src/style.css      every style, on top of the tokens
src/main.js        the home page: download buttons, recent releases, links, contributors, nav, tabs, lightbox, motion
src/chrome.js      the light/dark switch, the phone menu and GitHub fetching, shared by the pages
src/releases-page.js  the Releases page: the channel filter and the refresh from GitHub
src/mods.js        the registry's markup (list, project page, submit form), shared by build and page; mods-page.js: the filter, the search, the refresh; mods-submit.js: the form's sign-in and sending
src/benchmarks-page.js  the Benchmarks page: players' results from the telemetry server, the picker
src/docs-page.js    the Docs pages: the shared theme switch and phone menu
src/bench.js       the Benchmarks tables, shared by build and page
src/hardware.js    the spec table estimates use (GPU TFLOPS and bandwidth, CPU single-thread score)
src/estimate.js    estimates for unmeasured hardware from the nearest measured machine
src/markdown.js    a small Markdown renderer (escapes everything), shared by build and page
src/releases.js    the home page's "Recently added" and the Releases page's markup, shared by build and page
src/contributors.js the contributors' filtering and markup, shared by build and page
src/hub.js         the hub's roadmap, board and journal from the game repository's roadmap/roadmap.json, GitHub's issues and the releases, shared by build and page; /data/journal.json
src/hub-page.js    the hub page: tabs by #hash, the Simple / Technical switch (localStorage), the area filter, live states
src/fixtures/roadmap.json  a snapshot of the roadmap for the hub's tests (the build reads the live one)
public/            fonts, screenshots, icons, og.png, robots.txt, benchmarks.json: copied as is (sitemap.xml is written by the build)
data/benchmarks/   our raw benchmark reports (tools/perf_bench.py) and fleet.json, the list scripts/benchmarks.mjs reads
scripts/benchmarks.mjs  benchmark reports -> public/benchmarks.json (ours, and players' groups of 3+ installs)
scripts/assets.mjs rebuilds public/ from the repo (fonts to WOFF2, images to WebP, the pixel art)
scripts/art.mjs    draws the stone tile and the hero's landscape (PNG, one pixel per texel)
scripts/shots.mjs  Playwright screenshots at every width, and og.png
Dockerfile, Caddyfile, railway.json   the Railway service
LEGAL.md           every asset, its source and licence
shots/             (gitignored) full-page screenshots at 360–1920 px, a 1250×700 window, the open phone menu
```

## What comes from where

- **Built in** (`build.mjs`): Horizon's registry (`/mods`, one page per project) from the index ludovic111/horizon-mods
  publishes (`HORIZON_MOD_INDEX=<file>` builds from a test index; docs/api/mod-index.md); the parity table, its score, harness count and audit date,
  all from the game's `README.md`; the documentation pages (`/docs`) from `docs/` here; the Discord and Sponsor links
  from the game's `launcher/links.json`; the design tokens from its `crates/horizon-theme/tokens.css`; the hub's roadmap
  from its `roadmap/roadmap.json` (also served as `/data/roadmap.json`, which Kira reads); the latest releases and the contributors (`/repos/ludovic111/horizon/contributors`,
  bots left out, the owner first), when GitHub answers; without an answer the build still succeeds and
  the Contributors block and its menu entries stay hidden until the page loads them. The game's files come from its `main` on GitHub, all from
  the same commit (`HORIZON_CHECKOUT=<path>` reads a local checkout instead). The build
  fails if the README has no parity table, so a broken README never deploys.
- **Fetched by the page**: the registry's index (a project merged after the build shows at once), the releases (the download button picks the newest
  `launcher-v*` release's asset for the visitor's OS, the home page lists the newest game releases, and
  the Releases page reloads its list when GitHub has a newer release), players' benchmark results
  (`GET https://telemetry.playhorizon.dev/v1/benchmarks/summary`, 3-second timeout), the contributors (avatars come from `avatars.githubusercontent.com`),
  and `links.json` from `main`. Each
  falls back to what was built in, and the download button to the releases page.

## The documentation

`docs/<slug>.md` becomes `/docs/<slug>` (`index.md` is `/docs/`). Write for players first, then hosters,
then contributors; plain words, short paragraphs; claim only what players can download today, and
mark merged-but-unreleased things "next release". `{{HARNESSES}}` and `{{PERCENT}}` are filled from
the README. A line holding only `![caption](/media/...)` becomes a figure (the file must be in
`public/media/`); links to other pages are `/docs/<slug>#heading`. The build checks every link
between pages and every image, and fails with the list when one is broken. `/server`
redirects to `/docs/hosting`.

The API portal is the repository's `docs/api/`, not a copy: `nav.json` lists its README as `api` (`/docs/api`) and
its pages as `api/<page>` (`/docs/api/<page>`), read from the game's `main` on GitHub like the README.
Links between its pages become the site's, every other relative link goes to the file on GitHub, and the same link
check applies. Markdown tables render as tables. The other developer docs in `docs/` stay on GitHub and are linked
from the Contributing page.

## Run it locally

```sh
node build.mjs && node serve.mjs     # http://localhost:4173
node --test src/ scripts/            # the tests (npm test)
HORIZON_CHECKOUT=../horizon node build.mjs   # against a local checkout of the game (unmerged README, docs/api, roadmap)
```

Asset and screenshot scripts need the dev dependencies (sharp, wawoff2, Playwright):

```sh
npm install
GITHUB_TOKEN=$(gh auth token) node build.mjs   # optional token: bakes the releases past the API rate limit
npm run assets     # after a font, screenshot or logo changes in the game's repo (../horizon or HORIZON_CHECKOUT)
npm run shots      # shots/*.png (gitignored; SHOTS=dir to write elsewhere) and public/og.png
```

The screenshots are not committed: full-page PNGs at a dozen widths weigh about 17 MB.
Running text stays under 80 characters a line; on 360–430 px phones the narrowest paragraphs
fall to about 26–35, which is what that width allows. `npm run shots` also reports horizontal overflow, tap targets under 44 px on touch widths
and characters per line, for 360 to 1920 px wide and a 1250×700 window.

## Railway

Railway project `horizon-site`, service `site`, environment `production`. It deploys `main` of this repository on
every push (Railway's GitHub integration, root directory `/`), and answers on https://playhorizon.dev. Its
`*.up.railway.app` address redirects there with a 301 (the Caddyfile), so search engines index
one URL; the page also names it as canonical, in its Open Graph tags and in `sitemap.xml`.
Railway's healthcheck reaches `$PORT` under its own host name and is served normally.

`railway.json` selects the Dockerfile: a Node stage runs `build.mjs` (reading the game's files from its `main`), and
a Caddy stage serves `dist/` on `$PORT` with compression, cache headers, a strict
Content-Security-Policy and the 404 page. When the files the site reads change on the game's `main` (`README.md`,
`launcher/links.json`, `docs/api/`, `roadmap/roadmap.json`, `crates/horizon-theme/tokens.css`), a watcher runs
`railway redeploy --from-source`, so the site rebuilds from the new files (for now a loop on the maintainer's machine
every 10 minutes; later the game repository's `site-redeploy.yml` workflow, with a project token scoped to this
environment). No variables are needed; an optional
`GITHUB_TOKEN` (read-only, public repos) lets the build bake the releases even when
GitHub's anonymous rate limit is hit. `REGISTRY_UPSTREAM`
(`horizon-mod-registry.railway.internal:8080`) sends `/api/mods/*` to the registry's submission
service (`crates/horizon-mod-registry` in the game's repository); unset, `/mods/submit` says the form isn't open.

## Rules the site keeps

- The disclaimer, "Not an official Minecraft product. Not approved by or associated with
  Mojang or Microsoft.", is under the headline, in the phone menu, the footer and the 404 page.
- No Minecraft logo or wordmark; "Minecraft" appears only descriptively ("for Minecraft:
  Java Edition 26.3"). No game files are offered or linked.
- Parity is worded as the README words it: 100% of what the harnesses compare.
- No cookies, analytics, trackers or third-party fonts and scripts.
- Motion stops under `prefers-reduced-motion`; nothing hijacks the scroll.

## Benchmarks

`public/benchmarks.json` is what the Benchmarks page shows: `{ format: "horizon-benchmark-summary", version: 1,
generated, min_installs, groups }`, one group per GPU, CPU, render distance and game (`horizon`, `vanilla`) with
`medians` (`avg_fps`, `low_1pct_fps`, `p95_ms`, `world_ms`, `chunk_load_ms`, `rss_peak_mb`, `rss_steady_mb`).
Groups `"source": "us"` are our runs (with the machine, date, version and the four scenes); groups `"source":
"players"` come from players' `benchmark` uploads (docs/telemetry.md) and need at least `min_installs` (3)
different installs. The telemetry server's `GET /v1/benchmarks/summary` answers in the same shape; the page asks it
for players' groups and keeps the baked ones when it doesn't answer. The rules are in `scripts/benchmarks.mjs`, with
a fixture set (`scripts/fixtures/benchmarks/`) the server's test shares.

To publish new measurements: run `tools/perf_bench.py` for Horizon and vanilla on a machine (docs/benchmark.md), copy
the reports into `data/benchmarks/`, list them in `data/benchmarks/fleet.json`, then
`node scripts/benchmarks.mjs --ours data/benchmarks/fleet.json`.
