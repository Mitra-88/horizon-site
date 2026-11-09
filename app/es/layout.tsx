import { SiteShell } from "@/components/site-shell";
import { rootMetadata, VIEWPORT } from "@/components/site";
import "../globals.css";

// Spanish pages (horizon-site#29): their own root layout, for <html lang="es">. A page joins when its text is translated
// (TRANSLATED_PATHS in components/i18n-text.ts); other /es/... addresses are 404s.
export const metadata = rootMetadata("es");
export const viewport = VIEWPORT;

export default function SpanishLayout({ children }: LayoutProps<"/es">) {
  return <SiteShell locale="es">{children}</SiteShell>;
}
