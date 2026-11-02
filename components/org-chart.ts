import { cacheLife } from "next/cache";

// The hub's People tab: who runs Horizon, as the Discord server's roles say, top to bottom. Kira builds it from its
// member cache and serves it as GET /staff.json (kira's src/org-chart.js: names, roles, Discord avatars, and GitHub
// logins only where they are confirmed). A role given on Discord shows here within about ten minutes, no deploy.
const KIRA = (process.env.KIRA_URL || "https://kira-production-500e.up.railway.app").replace(/\/+$/, "");

export type OrgPerson = { name: string; username: string; avatar: string | null; github: string | null; job: string | null };
export type OrgTier = { key: string; post: string; people: OrgPerson[] };

const TIER_KEYS = ["owner", "team", "chiefmod", "mod", "support"];
// next.config.ts lets next/image load these two forms only.
const AVATAR = /^https:\/\/cdn\.discordapp\.com\/(avatars\/\d{5,25}\/\w{1,64}\.png\?size=128|embed\/avatars\/\d\.png)$/;
const LOGIN = /^[a-z\d](?:[a-z\d-]{0,38})$/i;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function getOrgChart(): Promise<OrgTier[] | null> {
  "use cache";
  try {
    const res = await fetch(`${KIRA}/staff.json`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Kira responded ${res.status} ${res.statusText}`);
    const body: { tiers?: { key?: unknown; post?: unknown; people?: Record<string, unknown>[] }[] } = await res.json();
    const tiers = (body.tiers ?? [])
      .filter((t) => TIER_KEYS.includes(String(t.key)))
      .map((t) => ({
        key: String(t.key),
        post: text(t.post, 40),
        people: (t.people ?? []).map((p) => {
          const avatar = text(p.avatar, 200);
          const github = text(p.github, 39);
          return {
            name: text(p.name, 64) || text(p.username, 64),
            username: text(p.username, 64),
            avatar: AVATAR.test(avatar) ? avatar : null,
            github: LOGIN.test(github) ? github : null,
            job: text(p.job, 80) || null,
          };
        }),
      }));
    if (!tiers.length) throw new Error("no tiers");
    cacheLife({ stale: 300, revalidate: 600, expire: 86400 });
    return tiers;
  } catch (error) {
    console.error("Couldn't load the org chart from Kira:", error);
    cacheLife("minutes");
    return null;
  }
}
