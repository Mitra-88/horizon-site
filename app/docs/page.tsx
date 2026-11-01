import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocView } from "@/components/doc-view";
import { getDoc } from "@/components/docs-data";
import { DocJsonLd, docMetadata } from "@/components/docs-seo";

export async function generateMetadata(): Promise<Metadata> {
  const found = await getDoc("index");
  if (!found) return { title: "Horizon docs" };
  return docMetadata(found.doc);
}

export default async function DocsIndexPage() {
  const found = await getDoc("index");
  if (!found) notFound();
  return (
    <>
      <DocJsonLd doc={found.doc} />
      <DocView {...found} />
    </>
  );
}
