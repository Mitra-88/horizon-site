import type { CaptureErrorCode, CaptureErrorReply } from "../sharing.ts";

export class CaptureError extends Error {
  readonly code: CaptureErrorCode;
  readonly status: number;

  constructor(code: CaptureErrorCode, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export function jsonResponse(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

export async function apiResponse(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof CaptureError)) console.error("Capture API failed", error);
    const failure = error instanceof CaptureError ? error : new CaptureError("unavailable", 503);
    const reply: CaptureErrorReply = { error: { code: failure.code, message: failure.code } };
    const response = jsonResponse(reply, failure.status);
    if (failure.status === 429) response.headers.set("Retry-After", "3600");
    return response;
  }
}
