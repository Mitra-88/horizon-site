// The memory op names its snapshots only in the error of a label it does not have; this reads them from there.
import type { Envelope, MemoryChange } from "./types";

/** A label no snapshot has, to ask the reader which it does have. */
export const UNKNOWN_LABEL = "\u0000";

/** The snapshot labels in a `no memory snapshot labelled X; labels: a, b` error, in capture order. */
export function snapshotLabels(reply: Envelope<unknown>): string[] {
  const text = typeof reply.error === "string" ? reply.error : (reply.error?.message ?? "");
  const found = /; labels: (.*)$/.exec(text);
  return found ? found[1].split(", ").filter((label) => label !== "") : [];
}

/** The snapshots to compare when none are picked: the first and the last, the reader's own default. */
export function defaultPair(labels: readonly string[]): [string, string] | null {
  return labels.length >= 2 ? [labels[0], labels[labels.length - 1]] : null;
}

/** The change as a signed megabyte figure's sign, for colouring: growth is the worse direction. */
export function changeTone(change: MemoryChange): "grew" | "shrank" | "same" {
  return change[3] > 0 ? "grew" : change[3] < 0 ? "shrank" : "same";
}
