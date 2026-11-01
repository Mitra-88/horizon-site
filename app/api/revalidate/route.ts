import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { REVALIDATE_TAGS } from "@/components/github-fresh";

// POST /api/revalidate, called by Kira when GitHub's webhook says something the site shows changed.
// Authorization: Bearer <REVALIDATE_SECRET>; body { "tags": [...] } with tags from components/github-fresh.ts.
// The tagged data expires at once: the next request reads GitHub again (Kira then loads the main pages once).
// No REVALIDATE_SECRET, no route.
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

function authorized(header: string | null, secret: string) {
  const got = Buffer.from(header?.startsWith("Bearer ") ? header.slice(7).trim() : "");
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!secret) return json({ error: "not found" }, 404);
  if (!authorized(request.headers.get("authorization"), secret)) return json({ error: "unauthorized" }, 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "not JSON" }, 400);
  }
  const asked = (body as { tags?: unknown })?.tags;
  const tags = Array.isArray(asked) ? [...new Set(asked.filter((t): t is string => typeof t === "string" && REVALIDATE_TAGS.includes(t)))] : [];
  if (!tags.length) return json({ error: "no known tags", known: REVALIDATE_TAGS }, 400);
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return json({ revalidated: tags });
}
