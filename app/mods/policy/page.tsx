import Link from "next/link";
import { markdown } from "@/components/docs-markdown";
import { DocsProse } from "@/components/docs-page-tools";
import { getModPolicy } from "@/components/mods-data";
import { pageMetadata } from "@/components/site";

export const metadata = pageMetadata({
  title: "Mod policy · Horizon mods",
  description:
    "Who owns and answers for the projects in Horizon's registry, what authors promise, and how to ask for a takedown.",
  path: "/mods/policy",
});

const SOURCE = "https://github.com/horizon-rust/horizon-mods/blob/main/MOD-POLICY.md";
const LINK = "text-[#c4b5ff] underline decoration-[#c4b5ff]/40 underline-offset-4 transition-colors hover:text-white";

export default async function PolicyPage() {
  const policy = await getModPolicy();
  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-32 pb-24 sm:pt-36 lg:px-10">
      <Link href="/mods" className="text-sm font-medium text-white/60 transition-colors hover:text-white">
        ← Every mod
      </Link>
      <h1 className="mt-5 font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-white">Mod policy</h1>
      <div className="mt-8">
        {policy ? (
          <DocsProse html={markdown(policy.replace(/^#\s.*\n+/, ""))} />
        ) : (
          <p className="text-lg text-white/70">
            Read it in the registry:{" "}
            <a href={SOURCE} className={LINK}>
              MOD-POLICY.md
            </a>
            .
          </p>
        )}
      </div>
      <p className="mt-10 text-sm leading-relaxed text-white/50">
        The source of this page:{" "}
        <a href={SOURCE} className={LINK}>
          MOD-POLICY.md
        </a>
        . To ask for a takedown:{" "}
        <a href="https://github.com/horizon-rust/horizon-mods/issues/new?template=takedown.yml" className={LINK}>
          the takedown form
        </a>
        , or privately through{" "}
        <a href="https://lu4ovic.com/#contact" className={LINK}>
          lu4ovic.com
        </a>
        .
      </p>
    </main>
  );
}
