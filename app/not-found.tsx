import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 pt-32 pb-24 sm:pt-40 lg:px-10">
      <p className="text-sm font-medium text-white/60">404</p>
      <h1 className="mt-4 font-display text-[clamp(2.25rem,6vw,4rem)] leading-[1.04] font-semibold tracking-[-0.035em] text-white">
        <span className="block">Nothing</span>
        <span className="text-accent block pb-1">at this address.</span>
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">The page moved, or never was. These are the places most people look for.</p>
      <p className="mt-8 flex flex-wrap gap-2">
        <Link href="/" className="inline-flex h-11 items-center rounded-lg bg-white px-5 text-[15px] font-medium text-[#100a1f] transition-colors hover:bg-white/90">
          Back home
        </Link>
        <Link href="/docs" className="inline-flex h-11 items-center rounded-lg bg-white/10 px-5 text-[15px] font-medium text-white transition-colors hover:bg-white/15">
          The docs
        </Link>
        <Link href="/mods" className="inline-flex h-11 items-center rounded-lg bg-white/10 px-5 text-[15px] font-medium text-white transition-colors hover:bg-white/15">
          Mods
        </Link>
      </p>
    </main>
  );
}
