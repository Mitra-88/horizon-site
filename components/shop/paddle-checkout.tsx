"use client";

import { useEffect, useState } from "react";

// Paddle.js on Horizon's default payment link: the launcher opens /shop/pay?_ptxn=txn_… for a checkout the cosmetics
// service created, and Paddle.js opens that transaction's overlay by itself. Nothing here grants anything: Paddle's
// webhook tells the cosmetics service, which grants the items.

type PaddleEvent = { name?: string };
type PaddleJs = {
  Environment: { set: (env: string) => void };
  Initialize: (options: { token: string; checkout?: { settings?: Record<string, unknown> }; eventCallback?: (e: PaddleEvent) => void }) => void;
};

const SCRIPT = "https://cdn.paddle.com/paddle/v2/paddle.js";

type State = "loading" | "open" | "done" | "closed" | "none" | "failed" | "refused";

export function PaddleCheckout({ token, sandbox }: { token: string; sandbox: boolean }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let finished = false;
    const start = () => {
      const paddle = (window as unknown as { Paddle?: PaddleJs }).Paddle;
      if (!paddle) return setState("failed");
      if (sandbox) paddle.Environment.set("sandbox");
      paddle.Initialize({
        token,
        checkout: { settings: { displayMode: "overlay", theme: "dark", locale: "en" } },
        eventCallback: (e) => {
          if (e.name === "checkout.loaded") setState("open");
          if (e.name === "checkout.completed") {
            finished = true;
            setState("done");
          }
          if (e.name === "checkout.closed" && !finished) setState("closed");
          if (e.name === "checkout.error" && !finished) setState("refused");
        },
      });
    };
    const load = () => {
      if (!new URLSearchParams(window.location.search).has("_ptxn")) return setState("none");
      if (document.querySelector(`script[src="${SCRIPT}"]`)) return start();
      const script = document.createElement("script");
      script.src = SCRIPT;
      script.async = true;
      script.onload = start;
      script.onerror = () => setState("failed");
      document.head.appendChild(script);
    };
    // After the first paint: the page reads its address only in the browser.
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [token, sandbox]);

  const text: Record<State, [string, string]> = {
    loading: ["Opening Paddle's checkout…", "It opens over this page."],
    open: ["Paddle's checkout is open.", "Follow it to the end; your items arrive in the launcher about a minute later."],
    done: ["Done, thank you.", "Go back to the launcher: your items appear in the Wardrobe within a minute. Paddle emails you the receipt."],
    closed: ["The checkout was closed.", "Nothing was charged. Start again from the launcher's Wardrobe whenever you like."],
    none: ["Nothing to check out here.", "Purchases and claims start in the launcher's Wardrobe, which opens this page for you."],
    refused: ["Paddle couldn't open this checkout.", "Nothing was charged. Start again from the launcher's Wardrobe; if it happens again, write to us."],
    failed: ["Paddle's checkout couldn't load.", "Check your connection or turn off what blocks cdn.paddle.com, then reload this page."],
  };
  const [title, line] = text[state];
  return (
    <div role="status" aria-live="polite" className="mt-8 rounded-2xl bg-white/[0.06] p-6 backdrop-blur-xl">
      <p className="font-display text-[22px] leading-tight font-semibold tracking-[-0.01em] text-white">{title}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-white/70">{line}</p>
    </div>
  );
}
