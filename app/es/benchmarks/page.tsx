import { BenchmarksPage } from "@/components/benchmarks-page";
import { getMessages, languageAlternates } from "@/components/i18n";
import { pageMetadata } from "@/components/site";

const { meta } = getMessages("es").benchmarks;

export const metadata = pageMetadata({ ...meta, path: "/es/benchmarks", locale: "es", languages: languageAlternates("/benchmarks") });

export default function Benchmarks() {
  return <BenchmarksPage locale="es" />;
}
