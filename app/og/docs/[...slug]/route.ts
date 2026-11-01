import { getDoc } from "@/components/docs-data";
import { ogCard } from "@/components/og-card";

type Context = { params: Promise<{ slug: string[] }> };

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const found = await getDoc(slug.join("/"));
  if (!found) return new Response("Not found", { status: 404 });
  if (found.doc.slug === "index") return ogCard({ kicker: "Horizon docs", title: "Install, play, host", accent: "and mod Horizon." });
  return ogCard({ kicker: `Horizon docs · ${found.doc.group}`, title: found.doc.title });
}
