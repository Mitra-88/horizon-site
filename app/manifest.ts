import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/components/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Horizon: Minecraft Java Edition rewritten in Rust",
    short_name: "Horizon",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "browser",
    background_color: "#100a1f",
    theme_color: "#100a1f",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
  };
}
