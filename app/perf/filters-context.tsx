"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { HorizonPerf } from "@/lib/perf/generated/horizon_perf";
import { NO_FILTERS } from "@/lib/perf/filters";
import type { CaptureFilters, MarkPoint } from "@/lib/perf/filters";
import { probeOptions } from "@/lib/perf/tree-options";
import type { Ask, SampleOptions } from "@/lib/perf/tree-options";
import type { MarkRow } from "@/lib/perf/types";
import { QUERY_FILE } from "@/lib/perf/query-text";
import type { LoadedCapture } from "./use-capture";

const NO_OPTIONS: SampleOptions = { kinds: [], slow: false, groups: ["none"], threads: [], thread: null };

const MARK_LIMIT = 1000;

/** What every view reads of the shared filters, and what the bar offers to pick from. */
export interface FilterState {
  filters: CaptureFilters;
  setFilters: (next: CaptureFilters | ((current: CaptureFilters) => CaptureFilters)) => void;
  options: SampleOptions;
  marks: MarkPoint[];
  /** Seconds the side on show covers. */
  seconds: number;
}

const Context = createContext<FilterState>({
  filters: NO_FILTERS,
  setFilters: () => {},
  options: NO_OPTIONS,
  marks: [],
  seconds: 0,
});

export function useFilters(): FilterState {
  return useContext(Context);
}

interface Props {
  reader: HorizonPerf;
  capture: LoadedCapture;
  children: ReactNode;
}

function Provider({ reader, capture, children }: Props) {
  const [filters, setFilters] = useState<CaptureFilters>(NO_FILTERS);
  const options = useMemo(() => {
    const ask: Ask = <R,>(op: Parameters<Ask>[0], request: Parameters<Ask>[1]) =>
      reader.query<R>(capture.handle, { op, file: QUERY_FILE, filters: { side: capture.side, ...request } });
    try {
      const probed = probeOptions(ask);
      if (probed.slow) return probed;
      // The span table keeps slow ticks even in a capture without samples.
      const slowSpans = ask<unknown>("spans", { slow: true, limit: 1 });
      return { ...probed, slow: slowSpans.ok && slowSpans.rows.length > 0 };
    } catch {
      return NO_OPTIONS;
    }
  }, [reader, capture.handle, capture.side]);
  const marks = useMemo((): MarkPoint[] => {
    try {
      const reply = reader.query<MarkRow>(capture.handle, {
        op: "marks",
        file: QUERY_FILE,
        filters: { side: capture.side, limit: MARK_LIMIT },
      });
      return reply.ok ? reply.rows.map((row) => ({ name: row.name, t: row.t })) : [];
    } catch {
      return [];
    }
  }, [reader, capture.handle, capture.side]);
  const seconds = capture.meta.rows.find((row) => row.side === capture.side)?.seconds ?? 0;
  const value = useMemo(() => ({ filters, setFilters, options, marks, seconds }), [filters, options, marks, seconds]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Holds the filters of one capture and side: a different side or capture starts unfiltered. */
export function FiltersProvider(props: Props) {
  return <Provider key={`${props.capture.handle}:${props.capture.side}`} {...props} />;
}
