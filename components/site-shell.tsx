import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { getReleases, launcherBuild } from "@/components/github-releases";
import { getMessages, type Locale } from "@/components/i18n";
import { getShopStatus } from "@/components/shop-data";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

// The page around every page: one per language, since each language has its own root layout (app/(en), app/es) for
// its <html lang>. app/global-not-found.tsx draws it too.
export async function SiteShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [releases, shop] = await Promise.all([getReleases(), getShopStatus()]);
  return (
    <html
      lang={locale}
      className={`${geist.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader locale={locale} t={getMessages(locale).header} releaseIds={releases?.map((r) => r.id) ?? []} launcher={launcherBuild(releases)} shop={shop.open || shop.selling} />
        {children}
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
