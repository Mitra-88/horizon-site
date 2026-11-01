"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { XIcon } from "@/components/icons";

const KEY = "horizon:partners-hidden";
const listeners = new Set<() => void>();
let hiddenThisVisit = false;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function isHidden() {
  if (hiddenThisVisit) return true;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function hide() {
  hiddenThisVisit = true;
  try {
    localStorage.setItem(KEY, "1");
  } catch {
  }
  listeners.forEach((onChange) => onChange());
}

export function PartnersGate({ children }: { children: ReactNode }) {
  const hidden = useSyncExternalStore(subscribe, isHidden, () => false);
  return hidden ? null : children;
}

export function HideButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={hide} aria-label="Hide this partner" className={className}>
      <XIcon className="size-4" />
    </button>
  );
}
