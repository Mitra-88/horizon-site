import { join } from "node:path";

export interface CaptureConfig {
  database: string;
  publicUrl: string;
  maxBytes: number;
  storageBytes: number;
  sharedDays: number;
  hourlyUploads: number;
  trustProxy: boolean;
}

function positive(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

export function captureConfig(): CaptureConfig {
  const publicUrl = process.env.PERF_PUBLIC_URL ?? process.env.SITE_URL;
  if (!publicUrl || !/^https?:\/\//.test(publicUrl)) throw new Error("PERF_PUBLIC_URL must be an absolute HTTP URL");
  return {
    database: process.env.PERF_DATABASE ?? join(process.cwd(), ".data/perf.sqlite"),
    publicUrl: new URL(publicUrl).origin,
    maxBytes: positive("PERF_MAX_BYTES", 64 * 1024 * 1024),
    storageBytes: positive("PERF_STORAGE_BYTES", 1024 * 1024 * 1024),
    sharedDays: positive("PERF_SHARED_DAYS", 30),
    hourlyUploads: positive("PERF_HOURLY_UPLOADS", 20),
    trustProxy: process.env.PERF_TRUST_PROXY === "true",
  };
}
