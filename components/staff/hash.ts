"use client";

import { useEffect, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("hashchange", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("hashchange", onChange);
  };
}

export function useHash() {
  return useSyncExternalStore(subscribe, () => window.location.hash, () => "");
}

export function tabFromHash(hash: string, ids: string[]) {
  const id = hash
    .slice(1)
    .replace(/^application-.*/, "applications")
    .replace(/^data-.*/, "data")
    .replace(/^inbox-.*/, "inbox");
  return ids.includes(id) ? id : ids[0];
}

export function selectTab(id: string) {
  if (window.location.hash !== `#${id}`) window.history.replaceState(null, "", `#${id}`);
  listeners.forEach((onChange) => onChange());
}

export function useScrollToHash(ready: boolean) {
  const hash = useHash();
  useEffect(() => {
    if (!ready || !/^#(application|inbox|data)-/.test(hash)) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    target.closest("details")?.setAttribute("open", "");
    target.scrollIntoView({ block: "start" });
  }, [ready, hash]);
}
