import { getMessages, languageAlternates } from "@/components/i18n";
import { ReleasesPage } from "@/components/releases-page";
import { pageMetadata } from "@/components/site";

const { meta } = getMessages("en").releases;

export const metadata = pageMetadata({ ...meta, path: "/releases", languages: languageAlternates("/releases") });

export default function Releases() {
  return <ReleasesPage locale="en" />;
}
