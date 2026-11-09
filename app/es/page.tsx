import { HomePage } from "@/components/home-page";
import { getMessages, languageAlternates } from "@/components/i18n";
import { pageMetadata } from "@/components/site";

const { meta } = getMessages("es");

export const metadata = pageMetadata({ title: meta.title, description: meta.description, path: "/es", locale: "es", languages: languageAlternates("/") });

export default function Home() {
  return <HomePage locale="es" />;
}
