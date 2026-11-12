import { shareCapture } from "@/lib/perf/server/api";


export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return shareCapture(request, (await context.params).id);
}
