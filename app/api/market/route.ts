import type { NextRequest } from "next/server";

// The official server's market and economy pages, as Kira serves them (GET /smp/market.json, /smp/economy.json:
// read from the server once a minute). Read-only; cached a minute.
const KIRA = (process.env.KIRA_URL || "https://kira-production-500e.up.railway.app").replace(/\/+$/, "");
const FILES = new Set(["market", "economy"]);
const HEADERS = { "Cache-Control": "public, max-age=60, s-maxage=60", "X-Content-Type-Options": "nosniff" };

function refuse(status: number, error: string) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get("file") ?? "market";
  if (!FILES.has(file)) return refuse(400, "Unknown file.");
  try {
    const res = await fetch(`${KIRA}/smp/${file}.json`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return refuse(502, "The server's market isn't available right now.");
    const data: unknown = await res.json();
    if (!data || typeof data !== "object" || (data as { schema?: unknown }).schema !== 1) {
      return refuse(502, "The server's market answered in an unknown format.");
    }
    return Response.json(data, { headers: HEADERS });
  } catch {
    return refuse(502, "The server's market isn't available right now.");
  }
}
