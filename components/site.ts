import type { Metadata } from "next";
import { DISCORD_URL, GITHUB_URL } from "@/components/links";

export const SITE_URL = (process.env.SITE_URL || "https://playhorizon.dev").replace(/\/+$/, "");
export const SITE_HOST = new URL(SITE_URL).host;
export const SITE_NAME = "Horizon";
export const SITE_TITLE = "Horizon: Minecraft Rust Edition, Java 26.3 rewritten in Rust";
export const SITE_DESCRIPTION =
  "Minecraft: Java Edition 26.3 rewritten in Rust. Free, open source and tested against vanilla. Get the Horizon launcher for Windows, macOS and Linux.";
export const ALTERNATE_NAMES = ["Minecraft Rust Edition", "Horizon Minecraft", "Horizon launcher"];
export const KEYWORDS = [
  "Minecraft Rust Edition",
  "Minecraft in Rust",
  "Minecraft rewritten in Rust",
  "Horizon Minecraft",
  "Horizon launcher",
  "Rust Minecraft client",
  "Minecraft Java Edition 26.3",
  "Minecraft without Java",
  "Minecraft server in Rust",
  "open source Minecraft client",
];
export const OPERATING_SYSTEMS = "Windows x64, macOS 11 or later on Apple Silicon, Linux x86-64";
export const AUTHOR = { "@type": "Person", name: "Ludovic Marie", url: "https://lu4ovic.com" } as const;
export const SAME_AS = [GITHUB_URL, "https://github.com/horizon-rust", DISCORD_URL];

export const absolute = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export function fitDescription(text: string, max = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const sentence = clean.slice(0, max).match(/^.*[.!?](?=\s)/)?.[0];
  if (sentence && sentence.length >= max * 0.6) return sentence;
  return `${clean.slice(0, max - 1).replace(/[\s,;:]+\S*$/, "")}…`;
}

export const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Horizon: Minecraft: Java Edition 26.3, rebuilt in Rust" };

type PageSeo = { title: string; description: string; path: string; type?: "website" | "article"; image?: typeof OG_IMAGE };

export function pageMetadata({ title, description, path, type = "website", image = OG_IMAGE }: PageSeo): Metadata {
  const text = fitDescription(description);
  return {
    title,
    description: text,
    alternates: { canonical: path },
    openGraph: { type, siteName: SITE_NAME, locale: "en_US", url: path, title, description: text, images: [image] },
    twitter: { card: "summary_large_image", title, description: text, images: [image] },
  };
}

export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: absolute(item.path) })),
  };
}

export const WEBSITE_ID = `${SITE_URL}/#website`;
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const APP_ID = `${SITE_URL}/#horizon`;
