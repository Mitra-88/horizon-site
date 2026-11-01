import { ogCard } from "@/components/og-card";

export const alt = "Horizon: Minecraft: Java Edition 26.3, rebuilt in Rust";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return ogCard({ kicker: "Minecraft: Java Edition 26.3, written in Rust", title: "The game you know,", accent: "rebuilt in Rust." });
}
