import NotFound from "@/app/(en)/not-found";
import { SiteShell } from "@/components/site-shell";
import { rootMetadata, VIEWPORT } from "@/components/site";
import "./globals.css";

// Addresses that match no page. Each language has its own root layout (horizon-site#29), so Next.js draws this page
// outside them; it is the same 404 page as app/(en)/not-found.tsx, which notFound() inside a page shows.
export const metadata = rootMetadata("en");
export const viewport = VIEWPORT;

export default function GlobalNotFound() {
  return (
    <SiteShell locale="en">
      <NotFound />
    </SiteShell>
  );
}
