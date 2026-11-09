import { BenchmarksPage } from "@/components/benchmarks-page";
import { getMessages, languageAlternates } from "@/components/i18n";
import { pageMetadata } from "@/components/site";

const { meta } = getMessages("en").benchmarks;

export const metadata = pageMetadata({ ...meta, path: "/benchmarks", languages: languageAlternates("/benchmarks") });

export default function Benchmarks() {
  return <BenchmarksPage locale="en" />;
}
