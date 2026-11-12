import type { ContextFilter, ContextKey, Envelope, GroupRow, QueryOp, RequestFilters, SampleKind } from "./types";

export type { ContextKey };

/** Which samples the reader can weigh, in the order they are offered. */
export const SAMPLE_KINDS: readonly SampleKind[] = ["cpu", "running", "waiting", "wall", "alloc", "live"];

/** How the tree is drawn: as lines to open, or as a flame graph. */
export type ViewKind = "list" | "flame";

/** What the tree is divided by before it is a tree. */
export type GroupKind = "none" | "thread" | "span" | "entity" | "block" | "chunk" | "dimension";

export const GROUP_KINDS: readonly GroupKind[] = ["none", "thread", "span", "entity", "block", "chunk", "dimension"];

/** The contexts a sample can carry; a node's weight can be split by each. */
export const CONTEXT_KEYS: readonly ContextKey[] = ["span", "entity", "block", "chunk", "dim"];

const CONTEXT_OF: Record<Exclude<GroupKind, "none" | "thread">, ContextKey> = {
  span: "span",
  entity: "entity",
  block: "block",
  chunk: "chunk",
  dimension: "dim",
};

/** The filters of a samples query: the selection, the thread, and what a group narrowed it to. */
export interface SampleFilters {
  select: SampleKind;
  slow?: boolean;
  thread?: string;
  where?: ContextFilter;
}

export function sampleFilters(select: SampleKind, slow: boolean, thread: string | null): SampleFilters {
  return { select, ...(slow ? { slow } : {}), ...(thread === null ? {} : { thread }) };
}

/** The filters of the samples inside one group of a `group` reply; a group without a context cannot be narrowed to. */
export function groupScope(group: GroupKind, row: Pick<GroupRow, "key" | "label">): Partial<SampleFilters> | null {
  if (group === "none" || row.key === null) return null;
  if (group === "thread") return { thread: row.label };
  return { where: { [CONTEXT_OF[group]]: [row.key] } };
}

/** What a capture's samples can be shown as. */
export interface SampleOptions {
  /** The sample kinds the capture has samples of. */
  kinds: SampleKind[];
  /** Whether the samples of slow ticks or frames alone are there. */
  slow: boolean;
  groups: GroupKind[];
  /** The threads with samples, when there is more than one to pick from. */
  threads: string[];
  /** The thread a query without one reads. */
  thread: string | null;
}

export type Ask = <R>(op: QueryOp, filters: RequestFilters) => Envelope<R>;

/** Probes the capture with the queries the tree itself runs: an option is offered only when it answers with samples. */
export function probeOptions(ask: Ask): SampleOptions {
  const kinds: SampleKind[] = [];
  let thread: string | null = null;
  for (const kind of SAMPLE_KINDS) {
    const reply = ask<unknown>("tree", { ...sampleFilters(kind, false, null), depth: 0, limit: 1 });
    if (!reply.ok || (reply.selection?.samples ?? 0) === 0) continue;
    kinds.push(kind);
    thread ??= reply.selection?.thread ?? null;
  }
  const groups: GroupKind[] = ["none"];
  let threads: string[] = [];
  let slow = false;
  if (kinds.length > 0) {
    const filters = sampleFilters(kinds[0], false, null);
    const slowReply = ask<unknown>("tree", { ...sampleFilters(kinds[0], true, null), depth: 0, limit: 1 });
    slow = slowReply.ok && (slowReply.selection?.samples ?? 0) > 0;
    const rowsOf = (by: string) => {
      const reply = ask<GroupRow>("group", { ...filters, by, limit: 50 });
      return reply.ok ? reply.rows : [];
    };
    const named = rowsOf("thread");
    if (named.length > 1) {
      threads = named.map((row) => row.label);
      groups.push("thread");
    }
    for (const kind of GROUP_KINDS) {
      if (kind === "none" || kind === "thread") continue;
      if (rowsOf(kind).some((row) => row.key !== null)) groups.push(kind);
    }
  }
  return { kinds, slow, groups, threads, thread };
}
