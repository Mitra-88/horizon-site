import { getMessages, languageAlternates } from "@/components/i18n";
import { ReleasesPage } from "@/components/releases-page";
import { pageMetadata } from "@/components/site";

const { meta } = getMessages("es").releases;

export const metadata = pageMetadata({ ...meta, path: "/es/releases", locale: "es", languages: languageAlternates("/releases") });

export default function Releases() {
  return <ReleasesPage locale="es" />;
}
