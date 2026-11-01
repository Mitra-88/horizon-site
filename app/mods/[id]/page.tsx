import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { markdown } from "@/components/docs-markdown";
import { DocsProse } from "@/components/docs-page-tools";
import { ShieldIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { ModDownload } from "@/components/mod-download";
import { ModRating } from "@/components/mod-rating";
import { getMod, getModRatings, getMods } from "@/components/mods-data";
import {
  CAPABILITIES,
  KIND_NAMES,
  POLICY_URL,
  REGISTRY,
  apiLabel,
  downloadsText,
  fileSize,
  https,
  installCommand,
  isOfficial,
  owners,
  ratingOf,
  safeDownloads,
  type ModProject,
} from "@/components/mods-logic";
import { ModIcon, Stars } from "@/components/mods-ui";
import { PixelAurora } from "@/components/pixel-aurora";
import { absolute, breadcrumbs, OPERATING_SYSTEMS, pageMetadata } from "@/components/site";

export async function generateStaticParams() {
  const mods = await getMods();
  return mods?.length ? mods.map((p) => ({ id: p.id })) : [{ id: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/mods/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = await getMod(id);
  if (!p) return { title: "Not in the registry · Horizon mods", robots: { index: false } };
  const kind = (KIND_NAMES[p.kind] ?? "Mod").toLowerCase();
  const authors = (p.authors ?? []).join(", ");
  const summary = p.summary ? `${p.summary.trim().replace(/[.!?]?$/, (end) => end || ".")} ` : "";
  return pageMetadata({
    title: `${p.name}: ${kind} for Horizon`,
    description: `${summary}A ${kind} for Horizon${authors ? ` by ${authors}` : ""}, reviewed before it was listed.`,
    path: `/mods/${p.id}`,
    image: { url: `/mods/${p.id}/opengraph-image`, width: 1200, height: 630, alt: `${p.name}, a ${kind} for Horizon` },
  });
}

function ModJsonLd({ p, rating }: { p: ModProject; rating: ReturnType<typeof ratingOf> }) {
  const v = p.versions[0];
  const path = `/mods/${p.id}`;
  return (
    <JsonLd
      data={{
        "@graph": [
          {
            "@type": "SoftwareApplication",
            name: p.name,
            description: p.summary,
            url: absolute(path),
            image: https(p.icon) || undefined,
            applicationCategory: "GameApplication",
            applicationSubCategory: KIND_NAMES[p.kind] ?? "Mod",
            operatingSystem: OPERATING_SYSTEMS,
            softwareRequirements: "Horizon",
            softwareVersion: v.version,
            dateModified: v.published,
            license: /^[\w.+-]+$/.test(p.license) ? `https://spdx.org/licenses/${p.license}.html` : p.license,
            author: (p.authors ?? []).map((name) => ({ "@type": "Person", name })),
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            isAccessibleForFree: true,
            interactionStatistic: {
              "@type": "InteractionCounter",
              interactionType: "https://schema.org/DownloadAction",
              userInteractionCount: safeDownloads(p.downloads),
            },
            ...(rating
              ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.average.toFixed(1), ratingCount: rating.count, bestRating: 5, worstRating: 1 } }
              : {}),
          },
          breadcrumbs([
            { name: "Mods", path: "/mods" },
            { name: p.name, path },
          ]),
        ],
      }}
    />
  );
}

const CODE = "rounded bg-white/[0.07] px-1 py-0.5 font-mono text-[0.88em] text-[#e7e1ff]";
const LINK = "text-[#c4b5ff] underline underline-offset-4 hover:text-white";

function Dot() {
  return (
    <span aria-hidden className="text-white/25">
      ·
    </span>
  );
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="font-display text-[1.6rem] leading-tight font-semibold tracking-[-0.02em] text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function byHand(kind: string): ReactNode {
  if (kind === "mod")
    return (
      <>
        put it in <code className={CODE}>horizon-mods/</code> beside <code className={CODE}>options.txt</code> in the game folder, then turn it on in the
        game: Options, then Mods
      </>
    );
  if (kind === "native-mod")
    return (
      <>
        unzip it into a folder, then build the game with it: <code className={CODE}>horizon-launcher native-build FOLDER --trust-native-code</code>. It
        plays in the Native mods instance
      </>
    );
  if (kind === "resourcepack")
    return (
      <>
        put it in <code className={CODE}>resourcepacks/</code> beside <code className={CODE}>options.txt</code>, then turn it on in Options, then Resource
        Packs
      </>
    );
  if (kind === "modpack") return "a modpack lists registry mods: install them one by one, or wait for the launcher to install modpacks";
  return "Horizon's own shader packs can't be installed yet";
}

function FileFacts({ p }: { p: ModProject }) {
  const v = p.versions[0];
  return (
    <div className="rounded-2xl bg-[#18112c] p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold text-white">File</h2>
      <dl className="mt-4 space-y-3 text-[14px]">
        <div>
          <dt className="text-white/45">Name</dt>
          <dd className="mt-0.5 break-all">
            <a href={https(v.file.url)} className={LINK}>
              {v.file.name}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-white/45">Size</dt>
          <dd className="mt-0.5 text-white/85">{fileSize(v.file.size)}</dd>
        </div>
        <div>
          <dt className="text-white/45">SHA-256</dt>
          <dd className="mt-1 font-mono text-[12px] leading-relaxed break-all text-[#e7e1ff]">{v.file.sha256}</dd>
        </div>
        {p.key && (
          <div>
            <dt className="text-white/45">Signing key</dt>
            <dd className="mt-1 font-mono text-[12px] leading-relaxed break-all text-[#e7e1ff]">{p.key}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function Publisher({ p }: { p: ModProject }) {
  const people = owners(p);
  return (
    <div className="rounded-2xl bg-[#18112c] p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold text-white">Publisher</h2>
      <dl className="mt-4 space-y-3 text-[14px]">
        {people.length > 0 && (
          <div>
            <dt className="text-white/45">Published by</dt>
            <dd className="mt-1.5 flex flex-wrap gap-x-3 gap-y-2">
              {people.map((o) => (
                <a key={o} href={`https://github.com/${o}`} className="inline-flex items-center gap-2 font-medium text-white/85 transition-colors hover:text-white">
                  <Image src={`https://avatars.githubusercontent.com/${o}?s=48`} alt="" width={24} height={24} unoptimized className="size-6 rounded-[6px]" />@{o}
                </a>
              ))}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-white/45">Signature</dt>
          <dd className="mt-1 flex items-start gap-1.5 text-white/85">
            {p.key ? (
              <>
                <ShieldIcon className="mt-0.5 size-4 shrink-0 text-[#8be0b4]" />
                Signed: every file is signed with the author&apos;s key
              </>
            ) : (
              "Unsigned: the file is pinned by its checksum, not signed"
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Links({ p }: { p: ModProject }) {
  const links = [
    https(p.source) && { href: https(p.source), label: "Source code" },
    { href: `${REGISTRY}/blob/main/mods/${p.id}.toml`, label: "Its entry in the registry" },
    { href: `${REGISTRY}/issues/new?template=report.yml&title=${encodeURIComponent(p.id)}`, label: "Report it" },
  ].filter((l): l is { href: string; label: string } => Boolean(l));
  return (
    <ul className="space-y-1 px-1 text-[14px]">
      {links.map((l) => (
        <li key={l.label}>
          <a href={l.href} className="group inline-flex items-center gap-1.5 py-1 font-medium text-[#c4b5ff] hover:text-white">
            {l.label}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

async function ModContent({ params }: Pick<PageProps<"/mods/[id]">, "params">) {
  const { id } = await params;
  const [p, ratings] = await Promise.all([getMod(id), getModRatings()]);
  if (!p) notFound();
  const v = p.versions[0];
  const rating = ratingOf(ratings, p.id);
  const authors = (p.authors ?? []).join(", ");
  const caps = v.capabilities ?? [];

  return (
    <main>
      <ModJsonLd p={p} rating={rating} />
      <section className="relative isolate overflow-hidden pt-32 pb-12 sm:pt-40 sm:pb-16">
        <PixelAurora moonTop={104} className="absolute top-0 left-0 -z-10" />
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          <Link href="/mods" className="group inline-flex items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white">
            <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">
              ←
            </span>
            Every mod
          </Link>
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <ModIcon id={p.id} icon={https(p.icon)} size={80} className="rounded-2xl" />
            <div className="max-w-2xl min-w-0">
              <p className="text-sm text-white/60">
                {KIND_NAMES[p.kind] ?? p.kind}
                {authors ? ` by ${authors}` : ""}
              </p>
              <h1 className="mt-2 font-display text-[clamp(2.25rem,5.5vw,3.75rem)] leading-[1.04] font-semibold tracking-[-0.035em] text-white">{p.name}</h1>
              {p.summary && <p className="mt-4 text-lg leading-relaxed text-white/70">{p.summary}</p>}
              <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/60">
                {rating ? <Stars rating={rating} className="text-white/75" /> : <span>No ratings yet</span>}
                <Dot />
                <span className="tabular-nums">{downloadsText(safeDownloads(p.downloads))}</span>
                <Dot />
                <span>Version {v.version}</span>
                <Dot />
                <span>{p.license}</span>
                {v.side && (
                  <>
                    <Dot />
                    <span>{v.side === "client" ? "Client side" : v.side}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0c0718] py-12 sm:py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-10">
          <div className="min-w-0">
            <p className="text-sm leading-relaxed text-white/55">
              {isOfficial(p)
                ? "Made by Horizon. "
                : `Made by ${authors || "its authors"}. Its authors own it and answer for it. Not made or endorsed by the Horizon project. `}
              <a href={POLICY_URL} className={LINK}>
                Mod policy
              </a>
            </p>
            {p.description && (
              <div className="mt-6">
                <DocsProse html={markdown(p.description)} />
              </div>
            )}

            {p.kind === "mod" && (
              <Part title="What it may do">
                {caps.length ? (
                  <ul className="space-y-2 text-[16px] text-white/75">
                    {caps.map((c) => (
                      <li key={c} className="flex gap-2.5">
                        <span aria-hidden className="text-[#a98fff]">
                          ·
                        </span>
                        {CAPABILITIES[c] ? `May ${CAPABILITIES[c]}` : `Uses the ${c} capability`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[16px] text-white/75">It asks for nothing beyond writing its own log.</p>
                )}
                <p className="mt-3 text-sm leading-relaxed text-white/50">
                  Mods run in a sandbox with no file, network or clock access. The game refuses a mod whose code uses more than this list.
                </p>
              </Part>
            )}

            {p.kind === "native-mod" && (
              <Part title="Native code">
                <p className="text-[16px] leading-relaxed text-white/70">
                  A native mod is Rust code that the launcher compiles into a game of its own, the Native mods instance. It is not sandboxed: it can do anything
                  you can on this computer. The launcher builds it only after a warning that names it, and a reviewer read its source before it was listed. Read
                  the source yourself before you build it.{" "}
                  <Link href="/docs/mods" className={LINK}>
                    How native mods work
                  </Link>
                </p>
              </Part>
            )}

            {(v.requires ?? []).length > 0 && (
              <Part title="Its mods">
                <ul className="space-y-2 text-[16px]">
                  {v.requires?.map((r) => (
                    <li key={r.id}>
                      <Link href={`/mods/${r.id}`} className={LINK}>
                        {r.id}
                      </Link>{" "}
                      <span className="text-white/50">{r.version}</span>
                    </li>
                  ))}
                </ul>
              </Part>
            )}

            <Part title="Versions">
              <ul className="divide-y divide-white/[0.06] rounded-2xl bg-[#18112c]">
                {p.versions.map((x) => (
                  <li key={x.version} className="px-5 py-4 sm:px-6">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold text-white">{x.version}</span>
                      <span className="text-sm text-white/50">
                        {[x.published, `for Minecraft ${x.game}`, apiLabel(x.api)].filter(Boolean).join(" · ")}
                      </span>
                    </p>
                    {x.changelog && (
                      <div className="mt-2 text-[15px]">
                        <DocsProse html={markdown(x.changelog)} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Part>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <ModDownload
              name={p.name}
              url={https(v.file.url)}
              fileName={v.file.name}
              size={fileSize(v.file.size)}
              version={v.version}
              command={installCommand(p.id)}
              signed={Boolean(p.key)}
              byHand={byHand(p.kind)}
            />
            <FileFacts p={p} />
            <Publisher p={p} />
            <ModRating id={p.id} owners={owners(p)} />
            <Links p={p} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function ModSkeleton() {
  return (
    <main>
      <section className="pt-32 pb-12 sm:pt-40 sm:pb-16">
        <div className="mx-auto flex w-full max-w-6xl gap-6 px-6 lg:px-10">
          <div className="size-20 shrink-0 rounded-2xl bg-white/[0.05]" />
          <div className="w-full max-w-xl space-y-3 pt-2">
            <div className="h-4 w-40 rounded bg-white/[0.05]" />
            <div className="h-12 w-3/4 rounded-lg bg-white/[0.06]" />
            <div className="h-5 w-full rounded bg-white/[0.04]" />
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ModPage({ params }: PageProps<"/mods/[id]">) {
  return (
    <Suspense fallback={<ModSkeleton />}>
      <ModContent params={params} />
    </Suspense>
  );
}
