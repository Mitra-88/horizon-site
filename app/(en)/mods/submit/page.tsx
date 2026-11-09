import Link from "next/link";
import { ModSubmitForm } from "@/components/mod-submit-form";
import { getMods } from "@/components/mods-data";
import { https } from "@/components/mods-logic";
import { pageMetadata } from "@/components/site";

export const metadata = pageMetadata({
  title: "Submit a mod to the Horizon registry",
  description:
    "Submit a mod, a native mod, a modpack, a resource pack, a shader pack or a data pack made for Horizon. A reviewer reads it before it is listed.",
  path: "/mods/submit",
});

const LINK = "text-[#c4b5ff] underline decoration-[#c4b5ff]/40 underline-offset-4 transition-colors hover:text-white";

export default async function SubmitPage() {
  const known = ((await getMods()) ?? []).map((p) => ({ id: p.id, kind: p.kind, name: p.name, icon: https(p.icon) }));
  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-32 pb-24 sm:pt-36 lg:px-10">
      <Link href="/mods" className="text-sm font-medium text-white/60 transition-colors hover:text-white">
        ← Every mod
      </Link>
      <h1 className="mt-5 font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-white">Submit to the registry</h1>
      <p className="mt-5 text-lg leading-relaxed text-white/70">
        A content mod, a native mod, a modpack of registry mods, a resource pack, a shader pack or a data pack made for Horizon. The form checks the file
        and opens a pull request; a reviewer reads it, its source and the checks&apos; report, and merging publishes it to this site and the launcher.
      </p>
      <p className="mt-3 text-[15px] text-white/55">
        First time?{" "}
        <Link href="/docs/publish-a-mod" className={LINK}>
          Publish a mod
        </Link>{" "}
        walks through building, checking and signing the file, and{" "}
        <Link href="/docs/make-a-mod" className={LINK}>
          Make a mod
        </Link>{" "}
        starts from the beginning.
      </p>
      <div className="mt-10">
        <ModSubmitForm known={known} />
      </div>
    </main>
  );
}
