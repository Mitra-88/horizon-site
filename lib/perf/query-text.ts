// A request as the text someone checks a number with: the JSON the reader was given, and the `horizon-perf query` line that asks the same.
import type { ContextFilter, Envelope, QueryRequest, RequestFilters } from "./types";

/** A query that was run, with the reply it got. */
export interface LoggedQuery {
  request: QueryRequest;
  reply: Envelope<unknown> | null;
}

/** What queries call the open capture: the replies echo it, so it is never the real file name. */
export const QUERY_FILE = "capture";

export function requestJson(request: QueryRequest): string {
  return JSON.stringify(request, null, 2);
}

export function replyJson(reply: unknown): string {
  return JSON.stringify(reply, null, 2);
}

/** `entity=e:zombie,entity=e:husk`: a repeated key is an OR. */
function wherePairs(where: ContextFilter): string {
  return Object.entries(where)
    .flatMap(([key, values]) => (values ?? []).map((value) => `${key}=${value}`))
    .join(",");
}

const VALUE_FLAGS: readonly [keyof RequestFilters, string][] = [
  ["side", "--side"],
  ["thread", "--thread"],
  ["select", "--select"],
  ["from", "--from"],
  ["to", "--to"],
  ["limit", "--limit"],
  ["worst", "--worst"],
  ["over", "--over"],
  ["every", "--every"],
  ["min_mb", "--min-mb"],
  ["by", "--by"],
  ["match", "--match"],
  ["depth", "--depth"],
  ["min_pct", "--min-pct"],
];

function quote(text: string): string {
  return /^[\w:./=,{}+-]+$/.test(text) ? text : `'${text.replaceAll("'", "'\\''")}'`;
}

/** The command line for a request; `stats` and `self_share` are the web view's own and have no flag. */
export function cliLine(request: QueryRequest, file = "CAPTURE.hzperf"): string {
  const filters = request.filters ?? {};
  const parts = ["horizon-perf", "query", request.op, ...(request.args ?? []).map(quote), file];
  for (const [key, flag] of VALUE_FLAGS) {
    const value = filters[key];
    if (value !== undefined) parts.push(flag, quote(String(value)));
  }
  if (filters.names && filters.names.length > 0) parts.push("--names", quote(filters.names.join(",")));
  if (filters.where && Object.keys(filters.where).length > 0) parts.push("--where", quote(wherePairs(filters.where)));
  if (filters.slow) parts.push("--slow");
  if (filters.diff) parts.push("--diff");
  return parts.join(" ");
}

/** What names a request in a list: its op and ids. */
export function queryLabel(request: QueryRequest): string {
  return [request.op, ...(request.args ?? [])].join(" ");
}
