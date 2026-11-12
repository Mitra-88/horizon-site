// The game's `horizon-perf open` serves a capture once on loopback and links here as `#local=<url>`.
const LOCAL_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost"]);
const LOCAL_PATH = /^\/[0-9a-f]{32}$/;

export type LocalFailure = "expired" | "denied";

export class LocalCaptureError extends Error {
  readonly failure: LocalFailure;

  constructor(failure: LocalFailure) {
    super(failure);
    this.failure = failure;
  }
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** The `local=` value of a URL fragment, or null when there is none. */
export function localParam(hash: string): string | null {
  return new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash).get("local");
}

/** The address when it has exactly the form the game offers, else null. */
export function localCaptureUrl(raw: string | null): string | null {
  if (!raw || /[?#@\\\s]/.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const ok =
    url.protocol === "http:" &&
    LOCAL_HOSTS.has(url.hostname) &&
    url.port !== "" &&
    url.username === "" &&
    url.password === "" &&
    url.search === "" &&
    url.hash === "" &&
    LOCAL_PATH.test(url.pathname) &&
    url.href === raw;
  return ok ? raw : null;
}

async function accessDenied(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: "local-network-access" as PermissionName });
    return status.state === "denied";
  } catch {
    return false;
  }
}

const INIT: RequestInit = { cache: "no-store", mode: "cors", credentials: "omit" };

/** Fetches the offered capture; a refusal is `denied` when the browser says local network access was refused, else `expired`. */
export async function fetchLocalCapture(url: string, fetcher: FetchLike = (u, init) => fetch(u, init)): Promise<ArrayBuffer> {
  let response: Response;
  try {
    // Chrome's Local Network Access hint; a browser that rejects the value gets one more try without it.
    response = await fetcher(url, { ...INIT, targetAddressSpace: "loopback" } as RequestInit).catch(() => fetcher(url, INIT));
  } catch {
    throw new LocalCaptureError((await accessDenied()) ? "denied" : "expired");
  }
  if (!response.ok) throw new LocalCaptureError("expired");
  return response.arrayBuffer();
}

export const LOCAL_NAME = "local.hzperf";

/** Fetches the offered capture and hands it to `open` as a file, the way a dropped one is opened. */
export async function loadLocalCapture(
  url: string,
  open: (file: File, name: string) => Promise<void>,
  fetcher?: FetchLike,
): Promise<void> {
  const bytes = await fetchLocalCapture(url, fetcher);
  await open(new File([bytes], LOCAL_NAME, { type: "application/vnd.horizon.perf" }), LOCAL_NAME);
}
