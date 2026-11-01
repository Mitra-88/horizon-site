import { feedResponse, journalText } from "@/components/journal-feed";

export async function GET() {
  return feedResponse(await journalText());
}
