import { join } from "node:path";
import { Worker } from "node:worker_threads";
import type { CaptureSummary } from "../sharing.ts";
import { CaptureError } from "./errors.ts";

type ValidationReply = { summary: CaptureSummary } | { error: "invalid_capture" | "unsupported_format" };

export function validateCapture(bytes: Uint8Array): Promise<CaptureSummary> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(join(process.cwd(), "scripts/perf-validate.mjs"), {
      // Turbopack extends workerData, so keep the bytes inside a plain object.
      workerData: { bytes },
      resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16 },
    });
    const timer = setTimeout(() => {
      void worker.terminate();
      reject(new CaptureError("invalid_capture", 415));
    }, 10_000);
    worker.once("message", (reply: ValidationReply) => {
      clearTimeout(timer);
      void worker.terminate();
      if ("summary" in reply) resolve(reply.summary);
      else reject(new CaptureError(reply.error, reply.error === "unsupported_format" ? 422 : 415));
    });
    worker.once("error", (error) => {
      console.error("Capture validation worker failed", error);
      clearTimeout(timer);
      reject(new CaptureError("invalid_capture", 415));
    });
    worker.once("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new CaptureError("invalid_capture", 415));
    });
  });
}
