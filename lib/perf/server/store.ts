import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CaptureMetadata, CaptureSummary, ShareReply, UploadReply } from "../sharing.ts";
import { CAPTURE_ID } from "../sharing.ts";
import type { CaptureConfig } from "./config.ts";
import { CaptureError } from "./errors.ts";
import type { CaptureObjects } from "./objects.ts";

interface CaptureRow {
  id: string;
  bytes: number;
  created: number;
  expires: number;
  shared: number;
  token_hash: string;
  summary: string;
  state: "pending" | "active" | "deleting";
}

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
const randomId = () => [...randomBytes(10)].map((byte) => alphabet[byte & 31]).join("");

export class CaptureStore {
  readonly db: DatabaseSync;

  readonly config: CaptureConfig;
  private readonly objects: CaptureObjects;
  private readonly now: () => number;

  constructor(config: CaptureConfig, objects: CaptureObjects, now: () => number = Date.now) {
    this.config = config;
    this.objects = objects;
    this.now = now;
    if (config.database !== ":memory:") mkdirSync(dirname(config.database), { recursive: true });
    this.db = new DatabaseSync(config.database);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS captures (
        id TEXT PRIMARY KEY, bytes INTEGER NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL,
        shared INTEGER NOT NULL, token_hash TEXT NOT NULL, summary TEXT NOT NULL, state TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS captures_expiry ON captures(expires);
      CREATE TABLE IF NOT EXISTS attempts (ip TEXT NOT NULL, time INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS attempts_time ON attempts(time);
    `);
  }

  private transaction<T>(run: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const value = run();
      this.db.exec("COMMIT");
      return value;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  attempt(ip: string): void {
    this.transaction(() => {
      this.db.prepare("DELETE FROM attempts WHERE time <= ?").run(this.now() - 3_600_000);
      const count = this.db.prepare("SELECT COUNT(*) AS n FROM attempts WHERE ip = ?").get(digest(ip))?.n;
      if (Number(count) >= this.config.hourlyUploads) throw new CaptureError("rate_limited", 429);
      this.db.prepare("INSERT INTO attempts VALUES (?, ?)").run(digest(ip), this.now());
    });
  }

  private row(id: string): CaptureRow {
    if (!CAPTURE_ID.test(id)) throw new CaptureError("not_found", 404);
    const row = this.db.prepare("SELECT * FROM captures WHERE id = ?").get(id) as unknown as CaptureRow | undefined;
    if (!row || row.state !== "active" || row.expires <= this.now()) throw new CaptureError("not_found", 404);
    return row;
  }

  private metadata(row: CaptureRow): CaptureMetadata {
    return {
      id: row.id, bytes: row.bytes, created_utc: new Date(row.created).toISOString(),
      expires_utc: new Date(row.expires).toISOString(), shared: Boolean(row.shared),
      summary: JSON.parse(row.summary) as CaptureSummary,
    };
  }

  private authorize(row: CaptureRow, token: string): void {
    if (!timingSafeEqual(Buffer.from(row.token_hash, "hex"), Buffer.from(digest(token), "hex"))) {
      throw new CaptureError("forbidden", 403);
    }
  }

  async upload(bytes: Uint8Array, summary: CaptureSummary): Promise<UploadReply> {
    if (bytes.length > this.config.maxBytes) throw new CaptureError("too_large", 413);
    const token = randomBytes(32).toString("base64url");
    const row: CaptureRow = {
      id: randomId(), bytes: bytes.length, created: this.now(), expires: this.now() + 3_600_000,
      shared: 0, token_hash: digest(token), summary: JSON.stringify(summary), state: "pending",
    };
    this.transaction(() => {
      const used = Number(this.db.prepare("SELECT COALESCE(SUM(bytes), 0) AS n FROM captures").get()?.n);
      if (used + bytes.length >= this.config.storageBytes * 0.9) throw new CaptureError("storage_full", 507);
      this.db.prepare("INSERT INTO captures VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(row.id, row.bytes, row.created, row.expires, row.shared, row.token_hash, row.summary, row.state);
    });
    try {
      await this.objects.put(row.id, bytes);
      this.db.prepare("UPDATE captures SET state = 'active' WHERE id = ?").run(row.id);
    } catch (error) {
      this.db.prepare("UPDATE captures SET state = 'deleting' WHERE id = ?").run(row.id);
      throw error;
    }
    return { ...this.meta(row.id), url: `${this.config.publicUrl}/perf/c/${row.id}`, delete_token: token };
  }

  meta(id: string): CaptureMetadata {
    return this.metadata(this.row(id));
  }

  async read(id: string): Promise<Uint8Array> {
    this.row(id);
    return this.objects.get(id);
  }

  share(id: string, token: string): ShareReply {
    return this.transaction(() => {
      const row = this.row(id);
      this.authorize(row, token);
      const expires = row.shared ? row.expires : this.now() + this.config.sharedDays * 86_400_000;
      this.db.prepare("UPDATE captures SET shared = 1, expires = ? WHERE id = ?").run(expires, id);
      return { id, url: `${this.config.publicUrl}/perf/c/${id}`, shared: true, expires_utc: new Date(expires).toISOString() };
    });
  }

  async delete(id: string, token: string): Promise<void> {
    this.transaction(() => {
      this.authorize(this.row(id), token);
      this.db.prepare("UPDATE captures SET state = 'deleting' WHERE id = ?").run(id);
    });
    await this.remove(id);
  }

  private async remove(id: string): Promise<void> {
    await this.objects.delete(id);
    this.db.prepare("DELETE FROM captures WHERE id = ? AND state = 'deleting'").run(id);
  }

  async sweep(): Promise<number> {
    const rows = this.transaction(() => {
      this.db.prepare("UPDATE captures SET state = 'deleting' WHERE expires <= ? OR (state = 'pending' AND created < ?)").run(this.now(), this.now() - 300_000);
      return this.db.prepare("SELECT id FROM captures WHERE state = 'deleting'").all() as { id: string }[];
    });
    let deleted = 0;
    for (const row of rows) {
      await this.remove(row.id);
      deleted++;
    }
    return deleted;
  }

  close(): void {
    this.db.close();
  }
}
