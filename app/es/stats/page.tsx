import { getMessages, languageAlternates } from "@/components/i18n";
import { pageMetadata } from "@/components/site";
import { StatsPage } from "@/components/stats-page";

const { meta } = getMessages("es").stats;

export const metadata = pageMetadata({ ...meta, path: "/es/stats", locale: "es", languages: languageAlternates("/stats") });

export default function Stats() {
  return <StatsPage locale="es" />;
}
