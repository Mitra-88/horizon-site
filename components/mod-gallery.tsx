"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const BUTTON =
  "inline-flex size-10 items-center justify-center rounded-lg bg-white/10 text-lg text-white transition-colors outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-[#a98fff]";

/** A project's screenshots: a strip that scrolls on phones, a grid on wider screens, each opening full size. */
export function ModGallery({ name, shots }: { name: string; shots: string[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const alt = (i: number) => `Screenshot ${i + 1} of ${shots.length} of ${name}`;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  const step = (by: number) => setOpen((i) => (i === null ? i : (i + by + shots.length) % shots.length));

  return (
    <>
      <ul className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0">
        {shots.map((src, i) => (
          <li key={src} className="w-[85%] shrink-0 snap-start sm:w-auto">
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`${alt(i)}: open full size`}
              className="relative block aspect-video w-full overflow-hidden rounded-xl bg-[#18112c] outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff]"
            >
              <Image
                src={src}
                alt={alt(i)}
                fill
                unoptimized
                loading="lazy"
                sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 85vw"
                className="object-cover transition-transform duration-300 hover:scale-[1.02] motion-reduce:transition-none"
              />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        aria-label={open === null ? "Screenshot" : alt(open)}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === e.currentTarget && setOpen(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/85"
      >
        {open !== null && (
          <div className="flex w-[min(92vw,90rem)] flex-col gap-3 p-2">
            <div className="relative h-[min(78vh,calc(92vw*9/16))] w-full">
              <Image src={shots[open]} alt={alt(open)} fill unoptimized sizes="92vw" className="object-contain" />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-white/70">
              <span className="tabular-nums">
                {open + 1} / {shots.length}
              </span>
              <span className="flex gap-2">
                {shots.length > 1 && (
                  <>
                    <button type="button" onClick={() => step(-1)} aria-label="Previous screenshot" className={BUTTON}>
                      ←
                    </button>
                    <button type="button" onClick={() => step(1)} aria-label="Next screenshot" className={BUTTON}>
                      →
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setOpen(null)} aria-label="Close" className={BUTTON} autoFocus>
                  ×
                </button>
              </span>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
