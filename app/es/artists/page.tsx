import { ArtistsPage } from "@/components/artists-page";
import { getMessages, languageAlternates } from "@/components/i18n";
import { pageMetadata } from "@/components/site";

const { meta } = getMessages("es").artists;

export const metadata = pageMetadata({ ...meta, path: "/es/artists", locale: "es", languages: languageAlternates("/artists") });

export default function Artists() {
  return <ArtistsPage locale="es" />;
}
