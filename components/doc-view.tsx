import Image from "next/image";
import Link from "next/link";
import type { Doc } from "@/components/docs-data";
import { DocsProse, DocsToc } from "@/components/docs-page-tools";
import { ChevronDownIcon } from "@/components/icons";
import { DISCORD_URL } from "@/components/links";

const REPO_URL = "https://github.com/horizon-rust/horizon";
const PARTNER_URL = "https://my.sculkhosting.com/ref/horizon";

function Partner() {
  return (
    <aside aria-label="Partner" className="mt-8">
      <a href={PARTNER_URL} target="_blank" rel="sponsored noopener" className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff]">
        <Image
          src="/media/sculk-banner.webp"
          width={1600}
          height={588}
          sizes="(min-width: 1280px) 600px, (min-width: 1024px) 690px, 100vw"
          alt="Sculk server hosting: your Minecraft server, 24/7 online, ready in about 60 seconds. Get my server, with the promo code HORIZON15."
          className="h-auto w-full"
        />
      </a>
      <p className="mt-2 text-xs text-white/40">Partner</p>
    </aside>
  );
}

function PagerLink({ doc, rel }: { doc: Doc | null; rel: "prev" | "next" }) {
  if (!doc) return <span className="hidden sm:block" />;
  return (
    <Link
      href={doc.path}
      prefetch
      rel={rel}
      className={`group block rounded-2xl bg-white/[0.04] px-5 py-4 transition-colors hover:bg-white/[0.07] ${rel === "next" ? "sm:text-right" : ""}`}
    >
      <span className="block text-[13px] text-white/45">{rel === "next" ? "Next" : "Previous"}</span>
      <span className="mt-1 block text-[16px] font-medium text-white group-hover:text-[#d4c9ff]">{doc.title}</span>
    </Link>
  );
}

export function DocView({ doc, prev, next }: { doc: Doc; prev: Doc | null; next: Doc | null }) {
  const toc = doc.headings.filter((h) => h.level === 2);
  const showToc = toc.length >= 4;
  return (
    <div className={showToc ? "xl:grid xl:grid-cols-[minmax(0,1fr)_11rem] xl:gap-10" : ""}>
      <article id="main" className="min-w-0 max-w-[44rem]">
        <nav aria-label="Breadcrumb" className="text-sm text-white/45">
          <Link href="/docs" className="hover:text-white">
            Docs
          </Link>
          <span aria-hidden className="mx-2 text-white/25">
            /
          </span>
          <span>{doc.group}</span>
        </nav>
        <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3rem)] leading-[1.06] font-semibold tracking-[-0.03em] text-white">{doc.title}</h1>
        {doc.lede && <p className="docs-lede mt-4 text-lg leading-relaxed text-pretty text-white/70" dangerouslySetInnerHTML={{ __html: doc.lede }} />}

        {showToc && (
          <details className="group mt-6 rounded-xl bg-white/[0.04] xl:hidden">
            <summary className="flex h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium text-white/80 [&::-webkit-details-marker]:hidden">
              On this page
              <ChevronDownIcon className="size-4 text-white/50 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="px-4 pb-3">
              {toc.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`} className="block py-1.5 text-sm text-white/60 hover:text-white">
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}

        {doc.slug === "hosting" && <Partner />}

        {doc.html && (
          <div className="mt-10">
            <DocsProse html={doc.html} />
          </div>
        )}

        <nav aria-label="Next and previous pages" className="mt-16 grid gap-3 sm:grid-cols-2">
          <PagerLink doc={prev} rel="prev" />
          <PagerLink doc={next} rel="next" />
        </nav>

        <p className="mt-8 text-sm leading-relaxed text-white/45">
          {doc.api && (
            <>
              <a href={`${REPO_URL}/blob/main/${doc.source}`} className="text-white/65 underline underline-offset-4 hover:text-white">
                Edit this page on GitHub
              </a>
              {" · "}
            </>
          )}
          Spotted something wrong?{" "}
          <a href={`${REPO_URL}/issues`} className="text-white/65 underline underline-offset-4 hover:text-white">
            Open an issue
          </a>{" "}
          or ask on{" "}
          <a href={DISCORD_URL} className="text-white/65 underline underline-offset-4 hover:text-white">
            Discord
          </a>
          .
        </p>
      </article>

      {showToc && (
        <div className="hidden xl:block">
          <DocsToc headings={toc} className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto" />
        </div>
      )}
    </div>
  );
}

export function DocSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the page" className="max-w-[44rem] motion-safe:animate-pulse">
      <div className="h-4 w-32 rounded bg-white/[0.06]" />
      <div className="mt-5 h-11 w-3/4 rounded-lg bg-white/[0.07]" />
      <div className="mt-6 space-y-3">
        <div className="h-4 w-full rounded bg-white/[0.05]" />
        <div className="h-4 w-11/12 rounded bg-white/[0.05]" />
        <div className="h-4 w-2/3 rounded bg-white/[0.05]" />
      </div>
      <div className="mt-12 space-y-3">
        <div className="h-4 w-full rounded bg-white/[0.04]" />
        <div className="h-4 w-full rounded bg-white/[0.04]" />
        <div className="h-4 w-4/5 rounded bg-white/[0.04]" />
      </div>
    </div>
  );
}
