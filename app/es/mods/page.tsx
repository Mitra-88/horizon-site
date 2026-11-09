import { getMessages, languageAlternates } from "@/components/i18n";
import { ModsPage } from "@/components/mods-page";
import { pageMetadata } from "@/components/site";

const { meta } = getMessages("es").mods;

export const metadata = pageMetadata({ ...meta, path: "/es/mods", locale: "es", languages: languageAlternates("/mods") });

export default function Mods() {
  return <ModsPage locale="es" />;
}
