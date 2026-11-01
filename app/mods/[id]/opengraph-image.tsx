import { getMod } from "@/components/mods-data";
import { KIND_NAMES } from "@/components/mods-logic";
import { ogCard } from "@/components/og-card";

export const alt = "A project in the Horizon mod registry";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getMod(id);
  if (!p) return ogCard({ kicker: "Horizon mods", title: "Mods, modpacks and resource packs" });
  const authors = (p.authors ?? []).join(", ");
  return ogCard({
    kicker: `${KIND_NAMES[p.kind] ?? "Mod"} for Horizon`,
    title: p.name,
    footer: authors ? `By ${authors}` : "Reviewed before it was listed",
  });
}
