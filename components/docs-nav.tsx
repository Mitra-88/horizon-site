"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { DocIndexEntry } from "@/components/docs-data";
import { DocsSearch } from "@/components/docs-search";
import { ChevronDownIcon } from "@/components/icons";

export type DocsNavGroup = { group: string; items: { path: string; title: string }[] };

export function DocsNav({ groups, index }: { groups: DocsNavGroup[]; index: DocIndexEntry[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  if (open && openedAt !== pathname) {
    setOpen(false);
    setOpenedAt(pathname);
  }
  const current = groups.flatMap((g) => g.items).find((i) => i.path === pathname);

  return (
    <aside className="relative z-20 lg:sticky lg:top-28 lg:self-start">
      <DocsSearch index={index} onNavigate={() => setOpen(false)} />

      <button
        type="button"
        aria-expanded={open}
        aria-controls="docs-nav-list"
        onClick={() => {
          setOpen((o) => !o);
          setOpenedAt(pathname);
        }}
        className="mt-3 flex h-11 w-full items-center justify-between rounded-lg bg-white/[0.04] px-3.5 text-left text-sm text-white/80 lg:hidden"
      >
        <span>
          <span className="text-white/45">Docs menu</span>
          {current && <span className="ml-2 font-medium text-white">{current.title}</span>}
        </span>
        <ChevronDownIcon className={`size-4 text-white/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <nav id="docs-nav-list" aria-label="Documentation" className={`${open ? "block" : "hidden"} mt-4 pb-2 lg:mt-6 lg:block lg:max-h-[calc(100vh-12.5rem)] lg:overflow-y-auto lg:pr-2 lg:[scrollbar-width:thin]`}>
        {groups.map(({ group, items }) => (
          <div key={group} className="mt-6 first:mt-0">
            <p className="px-2.5 text-[13px] font-medium text-white/40">{group}</p>
            <ul className="mt-1.5 space-y-0.5">
              {items.map((item) => {
                const active = item.path === pathname;
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      prefetch
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-lg px-2.5 py-1.5 text-[14px] leading-snug transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] ${
                        active ? "bg-white/[0.07] font-medium text-white" : "text-white/60 hover:text-white"
                      }`}
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
