"use client";

import { createContext, useContext, useEffect, useId, useMemo, useSyncExternalStore } from "react";
import type { LoggedQuery } from "@/lib/perf/query-text";
import type { Envelope, QueryRequest } from "@/lib/perf/types";

export type { LoggedQuery };

/** The queries the view on show ran, so any number can be checked against `horizon-perf query`. */
export class QueryLog {
  #entries = new Map<string, LoggedQuery>();
  #listeners = new Set<() => void>();
  #snapshot: readonly LoggedQuery[] = [];

  set(id: string, entry: LoggedQuery): void {
    this.#entries.set(id, entry);
    this.#changed();
  }

  delete(id: string): void {
    if (this.#entries.delete(id)) this.#changed();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  snapshot = (): readonly LoggedQuery[] => this.#snapshot;

  #changed(): void {
    this.#snapshot = [...this.#entries.values()];
    this.#listeners.forEach((listener) => listener());
  }
}

const Context = createContext<QueryLog | null>(null);

export const QueryLogProvider = Context.Provider;

const NONE: readonly LoggedQuery[] = [];

/** Every query the view on show has run. */
export function useLoggedQueries(): readonly LoggedQuery[] {
  const log = useContext(Context);
  return useSyncExternalStore(
    log ? log.subscribe : () => () => {},
    log ? log.snapshot : () => NONE,
    () => NONE,
  );
}

/** Records requests and their replies for as long as the caller shows them. */
export function useLogQueries(entries: readonly LoggedQuery[]): void {
  const log = useContext(Context);
  const id = useId();
  useEffect(() => {
    if (!log) return;
    const ids = entries.map((entry, at) => {
      log.set(`${id}:${at}`, entry);
      return `${id}:${at}`;
    });
    return () => ids.forEach((key) => log.delete(key));
  }, [log, id, entries]);
}

/** Records a request and its reply for as long as the caller shows them. */
export function useLogQuery(request: QueryRequest | null, reply: Envelope<unknown> | null): void {
  const entries = useMemo(() => (request ? [{ request, reply }] : []), [request, reply]);
  useLogQueries(entries);
}
