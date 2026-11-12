import type { CaptureKind } from "./types.ts";

export const CAPTURE_TYPE = "application/vnd.horizon.perf";
export const CAPTURE_ID = /^[a-z2-7]{10}$/;

export interface CaptureSummary {
  kind: CaptureKind;
  seconds: number;
  version: string;
}

export interface CaptureMetadata {
  id: string;
  bytes: number;
  created_utc: string;
  expires_utc: string;
  shared: boolean;
  summary: CaptureSummary;
}

export interface UploadReply extends CaptureMetadata {
  url: string;
  delete_token: string;
}

export interface ShareReply {
  id: string;
  url: string;
  shared: true;
  expires_utc: string;
}

export type CaptureErrorCode = "invalid_capture" | "unsupported_format" | "too_large" | "not_found" | "forbidden" | "storage_full" | "rate_limited" | "unavailable";

export interface CaptureErrorReply {
  error: { code: CaptureErrorCode; message: string };
}

export function captureId(link: string, origin: string): string | null {
  try {
    const url = new URL(link, origin);
    const match = /^\/perf\/c\/([a-z2-7]{10})\/?$/.exec(url.pathname);
    return url.origin === new URL(origin).origin ? match?.[1] ?? null : null;
  } catch {
    return null;
  }
}
