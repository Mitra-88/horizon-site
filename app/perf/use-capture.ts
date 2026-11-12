"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HorizonPerf } from "@/lib/perf/generated/horizon_perf";
import { mergeFilters, wireFilters } from "@/lib/perf/filters";
import type { Envelope, MetaRow, QueryOp, QueryRequest, RequestFilters, Side } from "@/lib/perf/types";
import { t } from "@/lib/perf/i18n";
import { QUERY_FILE } from "@/lib/perf/query-text";
import { useFilters } from "./filters-context";
import { useLogQuery } from "./query-log";

export { QUERY_FILE };

export interface LoadedCapture {
  handle: number;
  name: string;
  file: File;
  meta: Envelope<MetaRow>;
  /** The side the panels show: the server when the capture has one, else the client. */
  side: Side;
  sides: Side[];
}

/** What a comparison needs of a capture. */
export type CaptureRef = Pick<LoadedCapture, "handle" | "name">;

/** A query failure is a sentence; a failure of the wasm call itself has a code and a message. */
export function replyError(error: string | { message?: string } | undefined): string {
  return (typeof error === "string" ? error : error?.message) ?? t("error.queryFailed");
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Loads the reader once, and opens captures with it. A capture lives in the wasm's memory only. */
export function useReader() {
  const [reader, setReader] = useState<HorizonPerf | null>(null);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [capture, setCapture] = useState<LoadedCapture | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openHandle = useRef<number | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const { HorizonPerf } = await import("@/lib/perf/generated/horizon_perf");
        const loaded = await HorizonPerf.load("/perf/horizon_perf.wasm");
        if (live) setReader(loaded);
      } catch (failure) {
        if (live) setReaderError(message(failure));
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const open = useCallback(
    async (file: File, name: string) => {
      if (!reader) {
        setError(t("error.readerLoading"));
        return;
      }
      setLoading(true);
      setError(null);
      let handle: number | null = null;
      try {
        const bytes = await file.arrayBuffer();
        handle = reader.open(bytes);
        const meta = reader.query<MetaRow>(handle, { op: "meta", file: QUERY_FILE });
        if (!meta.ok) throw new Error(meta.error ? replyError(meta.error) : t("error.metaFailed"));
        const sides = meta.rows.map((row) => row.side);
        const side: Side = sides.includes("server") ? "server" : (sides[0] ?? "client");
        if (openHandle.current !== null) reader.close(openHandle.current);
        openHandle.current = handle;
        setCapture({ handle, name, file, meta, side, sides });
      } catch (failure) {
        if (handle !== null) reader.close(handle);
        setCapture(null);
        setError(message(failure));
      } finally {
        setLoading(false);
      }
    },
    [reader],
  );

  const close = useCallback(() => {
    if (reader && openHandle.current !== null) reader.close(openHandle.current);
    openHandle.current = null;
    setCapture(null);
    setError(null);
  }, [reader]);

  const showSide = useCallback((side: Side) => {
    setCapture((current) => (current ? { ...current, side } : current));
  }, []);

  return { reader, readerError, capture, loading, error, open, close, showSide };
}

export interface Rows<R> {
  rows: R[];
  error: string | null;
  reply: Envelope<R> | null;
  /** Exactly what the reader was asked. */
  request: QueryRequest;
}

/** Runs a request, logging it for the view's query menu. */
function useQuery<R>(
  reader: HorizonPerf,
  capture: LoadedCapture,
  request: QueryRequest,
  enabled: boolean,
): Rows<R> {
  const key = JSON.stringify(request);
  const result = useMemo((): Rows<R> => {
    const asked = JSON.parse(key) as QueryRequest;
    if (!enabled) return { rows: [], error: null, reply: null, request: asked };
    try {
      const reply = reader.query<R>(capture.handle, asked);
      return reply.ok
        ? { rows: reply.rows, error: null, reply, request: asked }
        : { rows: [], error: replyError(reply.error), reply, request: asked };
    } catch (failure) {
      return { rows: [], error: message(failure), reply: null, request: asked };
    }
  }, [reader, capture.handle, key, enabled]);
  useLogQuery(enabled ? result.request : null, result.reply);
  return result;
}

/** One query's rows for the side on show, narrowed by the filters the op reads; `filters` and `args` compare by value, and `enabled` false skips it. */
export function useRows<R>(
  reader: HorizonPerf,
  capture: LoadedCapture,
  op: QueryOp,
  filters: RequestFilters = {},
  enabled = true,
  args: readonly string[] = [],
): Rows<R> {
  const shared = useFilters().filters;
  const request: QueryRequest = {
    op,
    ...(args.length > 0 ? { args: [...args] } : {}),
    file: QUERY_FILE,
    filters: mergeFilters({ side: capture.side, ...wireFilters(shared, op) }, filters),
  };
  return useQuery<R>(reader, capture, request, enabled);
}

/** Like `useRows`, but ignoring the shared filters: for what the filters are picked from. */
export function useWholeRows<R>(
  reader: HorizonPerf,
  capture: LoadedCapture,
  op: QueryOp,
  filters: RequestFilters = {},
  enabled = true,
  args: readonly string[] = [],
): Rows<R> {
  const request: QueryRequest = {
    op,
    ...(args.length > 0 ? { args: [...args] } : {}),
    file: QUERY_FILE,
    filters: { side: capture.side, ...filters },
  };
  return useQuery<R>(reader, capture, request, enabled);
}
