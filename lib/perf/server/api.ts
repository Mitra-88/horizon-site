import { createHash, timingSafeEqual } from "node:crypto";
import { CAPTURE_TYPE } from "../sharing.ts";
import { captureConfig } from "./config.ts";
import { apiResponse, CaptureError, jsonResponse } from "./errors.ts";
import { S3CaptureObjects } from "./objects.ts";
import { CaptureStore } from "./store.ts";
import { validateCapture } from "./validation.ts";

let store: CaptureStore | undefined;
let validating = 0;

function captures(): CaptureStore {
  return store ??= new CaptureStore(captureConfig(), new S3CaptureObjects());
}

function bearer(request: Request): string {
  return /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? "";
}

async function body(request: Request, max: number): Promise<Uint8Array> {
  const length = Number(request.headers.get("content-length"));
  if (length > max) throw new CaptureError("too_large", 413);
  if (!request.body) throw new CaptureError("invalid_capture", 415);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) throw new CaptureError("too_large", 413);
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks, size);
}

export function uploadCapture(request: Request): Promise<Response> {
  return apiResponse(async () => {
    const type = request.headers.get("content-type")?.split(";")[0].trim();
    if (type !== CAPTURE_TYPE && type !== "application/octet-stream") throw new CaptureError("invalid_capture", 415);
    const storage = captures();
    const forwarded = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
    storage.attempt(storage.config.trustProxy ? forwarded ?? "unknown" : "local");
    if (validating >= 2) throw new CaptureError("unavailable", 503);
    validating++;
    try {
      const bytes = await body(request, storage.config.maxBytes);
      const summary = await validateCapture(bytes);
      return jsonResponse(await storage.upload(bytes, summary), 201);
    } finally {
      validating--;
    }
  });
}

export function readCapture(id: string): Promise<Response> {
  return apiResponse(async () => {
    const bytes = await captures().read(id);
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": CAPTURE_TYPE,
      "Content-Disposition": `attachment; filename="${id}.hzperf"`,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    } });
  });
}

export function captureMetadata(id: string): Promise<Response> {
  return apiResponse(async () => jsonResponse(captures().meta(id)));
}

export function shareCapture(request: Request, id: string): Promise<Response> {
  return apiResponse(async () => jsonResponse(captures().share(id, bearer(request))));
}

export function deleteCapture(request: Request, id: string): Promise<Response> {
  return apiResponse(async () => {
    await captures().delete(id, bearer(request));
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  });
}

export function sweepCaptures(request: Request): Promise<Response> {
  return apiResponse(async () => {
    const secret = process.env.PERF_SWEEP_TOKEN;
    const digest = (text: string) => createHash("sha256").update(text).digest();
    if (!secret || !timingSafeEqual(digest(secret), digest(bearer(request)))) throw new CaptureError("forbidden", 403);
    return jsonResponse({ deleted: await captures().sweep() });
  });
}
