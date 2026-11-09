import { About } from "@/components/about";
import { Community } from "@/components/community";
import { Contributors } from "@/components/contributors";
import { Gallery } from "@/components/gallery";
import { getReleases } from "@/components/github-releases";
import { Hero } from "@/components/hero";
import { getMessages, type Locale } from "@/components/i18n";
import { JsonLd } from "@/components/json-ld";
import { DOWNLOAD_URL, GITHUB_URL } from "@/components/links";
import { Parity } from "@/components/parity";
import {
  absolute,
  ALTERNATE_NAMES,
  APP_ID,
  AUTHOR,
  OPERATING_SYSTEMS,
  ORGANIZATION_ID,
  SAME_AS,
  SITE_NAME,
  SITE_URL,
  WEBSITE_ID,
} from "@/components/site";
import { Sponsor } from "@/components/sponsor";

const SCREENSHOTS = ["/media/nether.webp", "/media/village-800.webp", "/media/night-800.webp", "/media/underwater.webp"];

// The home page in each language: app/(en)/page.tsx and app/es/page.tsx.
export async function HomePage({ locale }: { locale: Locale }) {
  const { meta } = getMessages(locale);
  const releases = await getReleases();
  const game = releases?.find((r) => r.kind === "horizon");

  return (
    <main>
      <JsonLd
        data={{
          "@graph": [
            {
              "@type": "WebSite",
              "@id": WEBSITE_ID,
              url: SITE_URL,
              name: SITE_NAME,
              alternateName: ALTERNATE_NAMES,
              description: meta.description,
              inLanguage: locale,
              publisher: { "@id": ORGANIZATION_ID },
            },
            {
              "@type": "Organization",
              "@id": ORGANIZATION_ID,
              name: SITE_NAME,
              url: SITE_URL,
              logo: absolute("/icon-512.png"),
              founder: AUTHOR,
              sameAs: SAME_AS,
            },
            {
              "@type": "SoftwareApplication",
              "@id": APP_ID,
              name: SITE_NAME,
              alternateName: ALTERNATE_NAMES,
              description: meta.description,
              url: SITE_URL,
              applicationCategory: "GameApplication",
              applicationSubCategory: "Minecraft: Java Edition client",
              operatingSystem: OPERATING_SYSTEMS,
              softwareVersion: game?.tag.replace(/^\D+/, ""),
              softwareRequirements: "A legally obtained copy of Minecraft: Java Edition 26.3",
              downloadUrl: absolute(DOWNLOAD_URL),
              releaseNotes: absolute("/releases"),
              screenshot: SCREENSHOTS.map(absolute),
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              isAccessibleForFree: true,
              license: "https://opensource.org/license/mit",
              author: AUTHOR,
              publisher: { "@id": ORGANIZATION_ID },
              sameAs: [GITHUB_URL],
            },
          ],
        }}
      />
      <Hero locale={locale} />
      <About locale={locale} />
      <Sponsor locale={locale} />
      <Community locale={locale} />
      <Gallery locale={locale} />
      <Contributors locale={locale} />
      <Parity locale={locale} />
    </main>
  );
}
