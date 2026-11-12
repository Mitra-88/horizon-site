import { deleteCapture, readCapture } from "@/lib/perf/server/api";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return readCapture((await context.params).id);
}

export async function DELETE(request: Request, context: Context) {
  return deleteCapture(request, (await context.params).id);
}
