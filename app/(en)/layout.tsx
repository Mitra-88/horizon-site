import { SiteShell } from "@/components/site-shell";
import { rootMetadata, VIEWPORT } from "@/components/site";
import "../globals.css";

export const metadata = rootMetadata("en");
export const viewport = VIEWPORT;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <SiteShell locale="en">{children}</SiteShell>;
}
