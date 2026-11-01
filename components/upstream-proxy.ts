import type { NextRequest } from "next/server";

export type ProxyOptions = {
  upstream: string | undefined;
  ready: boolean;
  prefix: string;
  segments: string[];
  methods: string[];
  forward: string[];
  inject?: (request: NextRequest) => Record<string, string>;
  maxBody: number;
  buffer: boolean;
  timeoutMs: number;
  closed: string;
};

const SEGMENT = /^[A-Za-z0-9_~-][A-Za-z0-9._~-]*$/;
const PASS_BACK = ["content-type", "content-disposition", "retry-after", "www-authenticate"];
const SECURITY: Record<string, string> = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

export function clientIp(request: NextRequest) {
  return request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

export function publicHost(request: NextRequest) {
  return request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || request.nextUrl.host;
}

export function publicProto(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return forwarded === "http" || forwarded === "https" ? forwarded : request.nextUrl.protocol.replace(":", "");
}

function refuse(status: number, error: string, extra: Record<string, string> = {}) {
  return Response.json({ error }, { status, headers: { ...SECURITY, ...extra } });
}

function upstreamBase(upstream: string) {
  return new URL(/^https?:\/\//.test(upstream) ? upstream : `http://${upstream}`);
}

function sameSite(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === publicHost(request);
  } catch {
    return false;
  }
}

function location(value: string, base: URL) {
  try {
    const url = new URL(value, base);
    return url.host === base.host ? `${url.pathname}${url.search}${url.hash}` : url.toString();
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest, o: ProxyOptions) {
  if (!o.methods.includes(request.method)) return refuse(405, "That method isn't allowed here.", { Allow: o.methods.join(", ") });
  if (!o.segments.length || o.segments.length > 8 || !o.segments.every((s) => SEGMENT.test(s) && s.length <= 100)) return refuse(404, "not found");
  if (!o.upstream || !o.ready) return refuse(503, o.closed);
  const writing = request.method !== "GET" && request.method !== "HEAD";
  if (writing && !sameSite(request)) return refuse(403, "Requests from other sites are refused.");

  let base: URL;
  let target: URL;
  try {
    base = upstreamBase(o.upstream);
    target = new URL(`${o.prefix}/${o.segments.join("/")}`, base);
    target.search = request.nextUrl.search;
  } catch {
    return refuse(503, o.closed);
  }

  const headers = new Headers();
  for (const name of o.forward) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("x-forwarded-for", clientIp(request));
  headers.set("x-forwarded-host", publicHost(request));
  headers.set("x-forwarded-proto", publicProto(request));
  for (const [name, value] of Object.entries(o.inject?.(request) ?? {})) headers.set(name, value);

  let body: BodyInit | null = null;
  if (writing) {
    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > o.maxBody) return refuse(413, "That request is too large.");
    if (o.buffer) {
      const bytes = await request.arrayBuffer();
      if (bytes.byteLength > o.maxBody) return refuse(413, "That request is too large.");
      body = bytes;
    } else {
      body = request.body;
    }
  }

  let response: Response;
  try {
    response = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(o.timeoutMs),
      ...(body instanceof ReadableStream ? { duplex: "half" } : {}),
    } as RequestInit);
  } catch {
    return refuse(502, o.closed);
  }

  const out = new Headers(SECURITY);
  for (const name of PASS_BACK) {
    const value = response.headers.get(name);
    if (value) out.set(name, value);
  }
  const moved = response.headers.get("location");
  if (moved) {
    const safe = location(moved, base);
    if (safe) out.set("location", safe);
  }
  for (const cookie of response.headers.getSetCookie()) out.append("set-cookie", cookie);
  return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, statusText: response.statusText, headers: out });
}
