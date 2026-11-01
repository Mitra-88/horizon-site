"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

export function DocsProse({ html }: { html: string }) {
  const [announce, setAnnounce] = useState("");

  const onClick = async (e: MouseEvent<HTMLDivElement>) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-copy]");
    if (!button) return;
    const code = button.parentElement?.querySelector("code");
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.textContent ?? "");
      button.textContent = "Copied";
      setAnnounce("Copied to the clipboard");
    } catch {
      window.getSelection()?.selectAllChildren(code);
      button.textContent = "Selected";
      setAnnounce("Selected, press Ctrl+C to copy");
    }
    setTimeout(() => {
      button.textContent = "Copy";
      setAnnounce("");
    }, 1600);
  };

  return (
    <>
      <div className="docs-prose" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </>
  );
}

const OFFSET = 140;

export function DocsToc({ headings, className = "" }: { headings: { id: string; text: string }[]; className?: string }) {
  const [active, setActive] = useState(headings[0]?.id ?? "");
  const frame = useRef(0);

  useEffect(() => {
    const update = () => {
      frame.current = 0;
      let current = headings[0]?.id ?? "";
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top <= OFFSET) current = h.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = headings.at(-1)?.id ?? current;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame.current) frame.current = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame.current);
    };
  }, [headings]);

  return (
    <nav aria-label="On this page" className={className}>
      <p className="text-[13px] font-medium text-white/40">On this page</p>
      <ul className="mt-3 space-y-0.5">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={h.id === active ? "location" : undefined}
              className={`block rounded-md py-1 text-[13px] leading-snug transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#a98fff] ${
                h.id === active ? "text-white" : "text-white/50 hover:text-white/85"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
