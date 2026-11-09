import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModEditForm } from "@/components/mod-edit-form";
import { getMod, getMods } from "@/components/mods-data";
import { KIND_NAMES, categoriesOf, https, owners, screenshotsOf, tagsOf } from "@/components/mods-logic";

export async function generateStaticParams() {
  const mods = await getMods();
  return mods?.length ? mods.map((p) => ({ id: p.id })) : [{ id: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/mods/[id]/edit">): Promise<Metadata> {
  const { id } = await params;
  const p = await getMod(id);
  return { title: p ? `Edit ${p.name} · Horizon mods` : "Not in the registry · Horizon mods", robots: { index: false } };
}

async function EditContent({ params }: Pick<PageProps<"/mods/[id]/edit">, "params">) {
  const { id } = await params;
  const p = await getMod(id);
  if (!p) notFound();
  return (
    <>
      <Link href={`/mods/${p.id}`} className="text-sm font-medium text-white/60 transition-colors hover:text-white">
        ← {p.name}
      </Link>
      <h1 className="mt-5 font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-white">Edit {p.name}</h1>
      <p className="mt-4 text-lg leading-relaxed text-white/70">
        Its page on this site and in the launcher: {KIND_NAMES[p.kind]?.toLowerCase() ?? p.kind}, version {p.versions[0].version}.
      </p>
      <div className="mt-10">
        <ModEditForm
          project={{
            id: p.id,
            kind: p.kind,
            name: p.name,
            summary: p.summary ?? "",
            description: p.description ?? "",
            authors: p.authors ?? [],
            owners: owners(p),
            license: p.license,
            source: https(p.source),
            icon: https(p.icon),
            categories: categoriesOf(p),
            tags: tagsOf(p),
            screenshots: screenshotsOf(p),
          }}
        />
      </div>
    </>
  );
}

export default function EditPage({ params }: PageProps<"/mods/[id]/edit">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-32 pb-24 sm:pt-36 lg:px-10">
      <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
        <EditContent params={params} />
      </Suspense>
    </main>
  );
}
