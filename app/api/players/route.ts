import type { NextRequest } from "next/server";

const TELEMETRY = process.env.TELEMETRY_URL || "https://telemetry.playhorizon.dev";
const RANGES = new Set(["24h", "7d", "30d", "all"]);
const SERIES = new Set(["players", "official"]);
const HEADERS = { "Cache-Control": "public, max-age=30, s-maxage=30", "X-Content-Type-Options": "nosniff" };

function refuse(status: number, error: string) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const view = q.get("view");
  let path: string;
  if (view === "live") path = "/v1/live";
  else if (view === "history") {
    const range = q.get("range") ?? "24h";
    const series = q.get("series") ?? "players";
    if (!RANGES.has(range) || !SERIES.has(series)) return refuse(400, "Unknown range or series.");
    path = `/v1/live/history?range=${range}&series=${series}`;
  } else return refuse(400, "Unknown view.");

  try {
    const res = await fetch(`${TELEMETRY}${path}`, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!res.ok) return refuse(502, "The telemetry server doesn't answer right now.");
    const data: unknown = await res.json();
    if (!data || typeof data !== "object") return refuse(502, "The telemetry server answered in an unknown format.");
    return Response.json(data, { headers: HEADERS });
  } catch {
    return refuse(502, "The telemetry server doesn't answer right now.");
  }
}
