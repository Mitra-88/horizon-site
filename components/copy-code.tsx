"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, TagIcon } from "@/components/icons";

const CONFETTI = ["#5cc9f2", "#86d8f6", "#ffffff", "#ff9ec4", "#f2c46b"];

function burst(from: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = from.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  for (let i = 0; i < 36; i++) {
    const piece = document.createElement("span");
    const size = 5 + Math.round(Math.random() * 4);
    Object.assign(piece.style, {
      position: "fixed",
      left: `${x - size / 2}px`,
      top: `${y - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      background: CONFETTI[i % CONFETTI.length],
      pointerEvents: "none",
      zIndex: "60",
    });
    document.body.appendChild(piece);
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const speed = 90 + Math.random() * 130;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;
    const spin = (Math.random() - 0.5) * 720;
    const animation = piece.animate(
      [
        { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx * 1.35}px, ${dy + 160}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 1000 + Math.random() * 500, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)" },
    );
    animation.onfinish = () => piece.remove();
  }
}

export function CopyCode({ code, className = "" }: { code: string; className?: string }) {
  const codeRef = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<"idle" | "copied" | "selected">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2200);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async (button: HTMLButtonElement) => {
    try {
      await navigator.clipboard.writeText(code);
      setState("copied");
      burst(button);
    } catch {
      if (codeRef.current) window.getSelection()?.selectAllChildren(codeRef.current);
      setState("selected");
    }
  };

  const Icon = state === "copied" ? CheckIcon : TagIcon;
  const message = state === "copied" ? "Coupon copied to clipboard" : state === "selected" ? "Selected: press Ctrl+C to copy" : "";

  return (
    <span className="relative inline-flex">
      <button type="button" onClick={(e) => copy(e.currentTarget)} aria-label={`Copy code ${code}`} className={className}>
        <Icon className="size-[18px] shrink-0" />
        <span ref={codeRef}>
          {code}
        </span>
      </button>
      <span
        aria-hidden
        className={`pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg bg-white px-3 py-1.5 text-[13px] font-medium whitespace-nowrap text-[#03131b] transition-all duration-200 ${
          message ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        }`}
      >
        {message || "Coupon copied to clipboard"}
      </span>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </span>
  );
}
