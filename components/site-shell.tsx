import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
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
export function SiteShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <html
      lang={locale}
      className={`${geist.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={<SiteHeader locale={locale} t={getMessages(locale).header} />}>
          <SiteNavigation locale={locale} />
        </Suspense>
        {children}
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}

async function SiteNavigation({ locale }: { locale: Locale }) {
  const [releases, shop] = await Promise.all([getReleases(), getShopStatus()]);
  return <SiteHeader locale={locale} t={getMessages(locale).header} releaseIds={releases?.map((release) => release.id) ?? []} launcher={launcherBuild(releases)} shop={shop.open || shop.selling} />;
}
