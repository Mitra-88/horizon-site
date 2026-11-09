import Link from "next/link";
import { getMessages } from "@/components/i18n";

export default function NotFound() {
  const t = getMessages("en").notFound;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 pt-32 pb-24 sm:pt-40 lg:px-10">
      <p className="text-sm font-medium text-white/60">404</p>
      <h1 className="mt-4 font-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.04] font-semibold tracking-[-0.035em] text-white">
        <span className="block">{t.title}</span>
        <span className="text-accent block pb-1">{t.titleAccent}</span>
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">{t.body}</p>
      <p className="mt-8 flex flex-wrap gap-2">
        <Link href="/" className="inline-flex h-11 items-center rounded-lg bg-white px-5 text-[15px] font-medium text-[#100a1f] transition-colors hover:bg-white/90">
          {t.home}
        </Link>
        <Link href="/docs" className="inline-flex h-11 items-center rounded-lg bg-white/10 px-5 text-[15px] font-medium text-white transition-colors hover:bg-white/15">
          {t.docs}
        </Link>
        <Link href="/mods" className="inline-flex h-11 items-center rounded-lg bg-white/10 px-5 text-[15px] font-medium text-white transition-colors hover:bg-white/15">
          {t.mods}
        </Link>
      </p>
    </main>
  );
}
