import type { NextRequest } from "next/server";
import { clientIp, proxy } from "@/components/upstream-proxy";

type Context = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, { params }: Context) {
  const { path } = await params;
  return proxy(request, {
    upstream: process.env.STAFF_UPSTREAM,
    ready: Boolean(process.env.STAFF_PROXY_KEY),
    prefix: "/staff/api",
    segments: path,
    methods: ["GET", "POST"],
    forward: ["accept", "content-type", "cookie", "user-agent", "x-staff-csrf"],
    inject: (r) => ({ "x-staff-proxy-key": process.env.STAFF_PROXY_KEY ?? "", "x-staff-client-ip": clientIp(r) }),
    maxBody: 256 * 1024,
    buffer: true,
    timeoutMs: 20_000,
    closed: "The dashboards are closed right now.",
  });
}

export const GET = handle;
export const POST = handle;
