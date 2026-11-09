import Link from "next/link";
import { getMods } from "@/components/mods-data";
import { https, type ModProject } from "@/components/mods-logic";
import { MyMods, type OwnedProject } from "@/components/my-mods";
import { pageMetadata } from "@/components/site";

export const metadata = {
  ...pageMetadata({
    title: "Your mods on Horizon's registry",
    description: "The mods you submitted to Horizon's registry: their versions, whether they still build on the newest Nightly, and what waits for review.",
    path: "/mods/mine",
  }),
  robots: { index: false },
};

/** What Horizon a version is made for, from its `api` line (`native-1/<commit>/<mixins>`) or hook points. */
function madeFor(v: ModProject["versions"][number]): string {
  if (typeof v.hooks === "number") return `Any Horizon with hook points v${v.hooks}`;
  const pin = v.api?.startsWith("native-1/") ? v.api.split("/")[1] : "";
  if (pin) return `Horizon ${pin.slice(0, 7)}`;
  return v.api ? `Minecraft ${v.game}, API ${v.api}` : `Minecraft ${v.game}`;
}

function owned(p: ModProject): OwnedProject {
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    icon: https(p.icon),
    owners: p.owners ?? [],
    downloads: p.downloads ?? 0,
    versions: p.versions.map((v) => ({
      version: v.version,
      published: v.published ?? "",
      madeFor: madeFor(v),
      broken: v.broken_on?.[0] ?? null,
      native: p.kind === "native-mod",
    })),
  };
}

export default async function MyModsPage() {
  const projects = ((await getMods()) ?? []).filter((p) => p.owners?.length).map(owned);
  return (
    <main className="mx-auto w-full max-w-4xl px-6 pt-32 pb-24 sm:pt-36 lg:px-10">
      <Link href="/mods" className="text-sm font-medium text-white/60 transition-colors hover:text-white">
        ← Every mod
      </Link>
      <h1 className="mt-5 font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-white">Your mods</h1>
      <MyMods projects={projects} />
    </main>
  );
}
