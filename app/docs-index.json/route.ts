import { getDocs, sectionIndex } from "@/components/docs-data";

export async function GET() {
  const docs = await getDocs();
  return Response.json(sectionIndex(docs));
}
