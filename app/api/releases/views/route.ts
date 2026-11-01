import { connection, type NextRequest } from "next/server";
import { getReleases } from "@/components/github-releases";
import { recordView, viewCounts } from "@/components/release-views";

const NO_STORE = { "Cache-Control": "no-store" };

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || forwarded || "";
}

export async function GET() {
  await connection();
  return Response.json({ views: await viewCounts() }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  const releases = await getReleases();
  if (!Number.isSafeInteger(id) || !releases?.some((r) => r.id === id)) {
    return Response.json({ error: "That isn't one of the listed releases." }, { status: 400, headers: NO_STORE });
  }
  const ip = clientIp(request);
  if (!ip) return Response.json({ error: "The request carried no address to count." }, { status: 400, headers: NO_STORE });
  return Response.json({ id, views: await recordView(id, ip) }, { headers: NO_STORE });
}
