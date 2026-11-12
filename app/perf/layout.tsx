import type { Metadata } from "next";
import { SITE_URL } from "@/components/site";
import type { ReactNode } from "react";
import { t } from "@/lib/perf/i18n";
import { SiteShell } from "@/components/site-shell";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: t("meta.title"),
  icons: "/perf/horizon-64.png",
  description: t("meta.description"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <SiteShell locale="en">{children}</SiteShell>;
}
