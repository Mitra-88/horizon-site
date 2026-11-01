import { createHmac, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const FILE = process.env.RELEASE_VIEWS_FILE || join(process.cwd(), ".data", "release-views.json");
const SALT_FILE = join(dirname(FILE), "release-views.salt");

type Store = { views: Record<string, Record<string, 1>> };

let store: Store | null = null;
let stamp = 0;
let legacySalt = "";
let salt: Promise<string> | null = null;
let queue: Promise<unknown> = Promise.resolve();

const modified = () => stat(FILE).then((s) => s.mtimeMs, () => 0);

async function load(): Promise<Store> {
  try {
    const json = JSON.parse(await readFile(FILE, "utf8"));
    if (json && json.views && typeof json.views === "object") {
      if (typeof json.salt === "string") legacySalt = json.salt;
      return { views: json.views };
    }
  } catch {}
  return { views: {} };
}

async function opened() {
  const changed = await modified();
  if (!store || changed !== stamp) {
    store = await load();
    stamp = changed;
  }
  return store;
}

function secret() {
  if (process.env.RELEASE_VIEWS_SALT) return Promise.resolve(process.env.RELEASE_VIEWS_SALT);
  return (salt ??= (async () => {
    try {
      const kept = (await readFile(SALT_FILE, "utf8")).trim();
      if (kept.length >= 32) return kept;
    } catch {}
    const fresh = legacySalt || randomBytes(32).toString("hex");
    await mkdir(dirname(SALT_FILE), { recursive: true });
    try {
      await writeFile(SALT_FILE, fresh, { mode: 0o600, flag: "wx" });
      return fresh;
    } catch {
      return (await readFile(SALT_FILE, "utf8")).trim();
    }
  })());
}

async function save(s: Store) {
  await mkdir(dirname(FILE), { recursive: true });
  const temp = `${FILE}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(s), { mode: 0o600 });
  await rename(temp, FILE);
  stamp = await modified();
}

const visitor = async (ip: string) =>
  createHmac("sha256", await secret())
    .update(ip)
    .digest("base64url")
    .slice(0, 22);

export async function viewCounts(): Promise<Record<string, number>> {
  const s = await opened();
  return Object.fromEntries(Object.entries(s.views).map(([id, seen]) => [id, Object.keys(seen).length]));
}

export function recordView(id: number, ip: string): Promise<number> {
  const run = queue.then(async () => {
    const s = await opened();
    const who = await visitor(ip);
    const seen = (s.views[String(id)] ??= {});
    if (!seen[who]) {
      seen[who] = 1;
      await save(s);
    }
    return Object.keys(seen).length;
  });
  queue = run.catch(() => undefined);
  return run;
}
