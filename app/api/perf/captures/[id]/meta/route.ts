import { captureMetadata } from "@/lib/perf/server/api";


export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return captureMetadata((await context.params).id);
}
