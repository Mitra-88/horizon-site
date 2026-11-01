import type { NextRequest } from "next/server";
import { proxy } from "@/components/upstream-proxy";

type Context = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, { params }: Context) {
  const { path } = await params;
  return proxy(request, {
    upstream: process.env.REGISTRY_UPSTREAM,
    ready: true,
    prefix: "/api/mods",
    segments: path,
    methods: ["GET", "POST"],
    forward: ["accept", "content-type", "cookie", "user-agent", "x-csrf-token"],
    maxBody: 70 * 1024 * 1024,
    buffer: false,
    timeoutMs: 180_000,
    closed: "The registry's service isn't open right now.",
  });
}

export const GET = handle;
export const POST = handle;
