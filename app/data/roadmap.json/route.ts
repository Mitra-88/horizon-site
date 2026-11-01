import { feedResponse, roadmapText } from "@/components/journal-feed";

export async function GET() {
  return feedResponse(await roadmapText());
}
