"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { togglePin } from "@/lib/perf/pins";
import type { LoadedCapture } from "./use-capture";

/** The fields pinned to the time chart, shared by every view of the capture. */
export interface Pins {
  fields: readonly string[];
  toggle: (field: string) => void;
  has: (field: string) => boolean;
  clear: () => void;
  /** Seconds between the chart's points; null lets the window decide. */
  every: number | null;
  setEvery: (every: number | null) => void;
}

const NONE: Pins = { fields: [], toggle: () => {}, has: () => false, clear: () => {}, every: null, setEvery: () => {} };

const Context = createContext<Pins>(NONE);

export function usePins(): Pins {
  return useContext(Context);
}

function Provider({ children }: { children: ReactNode }) {
  const [fields, setFields] = useState<readonly string[]>([]);
  const [every, setEvery] = useState<number | null>(null);
  const value = useMemo<Pins>(
    () => ({
      fields,
      toggle: (field) => setFields((current) => togglePin(current, field)),
      has: (field) => fields.includes(field),
      clear: () => setFields([]),
      every,
      setEvery,
    }),
    [fields, every],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Pins start empty for each capture and side. */
export function PinsProvider({ capture, children }: { capture: LoadedCapture; children: ReactNode }) {
  return <Provider key={`${capture.handle}:${capture.side}`}>{children}</Provider>;
}
