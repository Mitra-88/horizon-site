import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocSkeleton, DocView } from "@/components/doc-view";
import { getDoc, getDocsNav } from "@/components/docs-data";
import { DocJsonLd, docMetadata } from "@/components/docs-seo";

export async function generateStaticParams() {
  const nav = await getDocsNav();
  return nav.flatMap((g) => g.pages.filter((slug) => slug !== "index").map((slug) => ({ slug: slug.split("/") })));
}

export async function generateMetadata({ params }: PageProps<"/docs/[...slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await getDoc(slug.join("/"));
  if (!found) return { title: "Not found · Horizon docs", robots: { index: false } };
  return docMetadata(found.doc);
}

async function DocContent({ params }: Pick<PageProps<"/docs/[...slug]">, "params">) {
  const { slug } = await params;
  const found = await getDoc(slug.join("/"));
  if (!found || found.doc.slug === "index") notFound();
  return (
    <>
      <DocJsonLd doc={found.doc} />
      <DocView {...found} />
    </>
  );
}

export default function DocPage({ params }: PageProps<"/docs/[...slug]">) {
  return (
    <Suspense fallback={<DocSkeleton />}>
      <DocContent params={params} />
    </Suspense>
  );
}
