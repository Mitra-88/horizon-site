"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { GitHubIcon, HorizonMark, MenuIcon, XIcon } from "@/components/icons";
import type { LauncherBuild } from "@/components/github-releases";
import { LauncherLink } from "@/components/launcher-download";
import { GITHUB_URL } from "@/components/links";
import { useUnseenCount } from "@/components/release-seen";

const NAV = [
  { label: "About", href: "/#about" },
  { label: "Hub", href: "/hub" },
  { label: "Benchmarks", href: "/benchmarks" },
  { label: "Mods", href: "/mods" },
  { label: "Releases", href: "/releases" },
  { label: "Docs", href: "/docs" },
  { label: "Players", href: "/stats" },
];

const NAV_LINK = "inline-flex items-center gap-1.5 transition-colors hover:text-white";

const subscribe = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};

export function SiteHeader({ releaseIds = [], launcher = null }: { releaseIds?: number[]; launcher?: LauncherBuild | null }) {
  const scrolled = useSyncExternalStore(
    subscribe,
    () => window.scrollY > 8,
    () => false,
  );
  const unseen = useUnseenCount(releaseIds);
  const pathname = usePathname();
  const isCurrent = (href: string) => !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuOpen && menuPath !== pathname) {
    setMenuOpen(false);
    setMenuPath(pathname);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter] duration-300 ${
        menuOpen ? "bg-[#100a1f]" : scrolled ? "bg-[#100a1f]/75 backdrop-blur-md" : ""
      }`}
    >
      <div className="mx-auto flex h-18 w-full max-w-6xl items-center gap-12 px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2 text-white">
          <HorizonMark className="size-8" />
          <span className="font-display text-[19px] font-semibold tracking-[-0.02em]">Horizon</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 text-sm text-white/65 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              className={isCurrent(item.href) ? `${NAV_LINK} text-white` : NAV_LINK}
            >
              {item.label}
              {item.href === "/releases" && unseen > 0 && (
                <>
                  <span
                    aria-hidden
                    className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#a98fff] px-1 text-[10px] leading-none font-semibold text-background tabular-nums shadow-[0_0_10px_rgba(169,143,255,0.7)]"
                  >
                    {unseen > 9 ? "9+" : unseen}
                  </span>
                  <span className="sr-only">, {unseen} new</span>
                </>
              )}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <a
            href={GITHUB_URL}
            className="hidden h-9 items-center gap-2 px-3 text-sm text-white/65 transition-colors hover:text-white sm:inline-flex"
          >
            <GitHubIcon className="size-4" />
            GitHub
          </a>
          <LauncherLink
            build={launcher}
            className="inline-flex h-9 items-center rounded-lg bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            Download
          </LauncherLink>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close the menu" : "Open the menu"}
            onClick={() => {
              setMenuOpen((o) => !o);
              setMenuPath(pathname);
            }}
            className="ml-1 inline-flex size-9 items-center justify-center rounded-lg bg-white/[0.06] text-white/80 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            {menuOpen ? <XIcon className="size-[18px]" /> : <MenuIcon className="size-[18px]" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Main" className="mx-auto h-[calc(100dvh-4.5rem)] w-full max-w-6xl overflow-y-auto px-6 pt-2 pb-6 lg:hidden">
          <ul className="grid gap-0.5">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isCurrent(item.href) ? "page" : undefined}
                  className={`flex h-12 items-center justify-between rounded-lg px-3 text-[17px] transition-colors hover:bg-white/[0.05] ${
                    isCurrent(item.href) ? "bg-white/[0.06] text-white" : "text-white/75"
                  }`}
                >
                  {item.label}
                  {item.href === "/releases" && unseen > 0 && <span className="text-sm text-[#c4b5ff]">{unseen > 9 ? "9+" : unseen} new</span>}
                </Link>
              </li>
            ))}
            <li>
              <a href={GITHUB_URL} className="flex h-12 items-center gap-2.5 rounded-lg px-3 text-[17px] text-white/75 transition-colors hover:bg-white/[0.05]">
                <GitHubIcon className="size-4" />
                GitHub
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
