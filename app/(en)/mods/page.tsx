import { getMessages, languageAlternates } from "@/components/i18n";
import { ModsPage } from "@/components/mods-page";
import { pageMetadata } from "@/components/site";

const { meta } = getMessages("en").mods;

export const metadata = pageMetadata({ ...meta, path: "/mods", languages: languageAlternates("/mods") });

export default function Mods() {
  return <ModsPage locale="en" />;
}
