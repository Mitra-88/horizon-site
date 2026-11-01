import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_HOST } from "@/components/site";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const DEFAULT_FOOTER = "Free and open source · Windows, macOS and Linux";

let assets: Promise<[Buffer, Buffer, string]> | null = null;

function loadAssets() {
  assets ??= Promise.all([
    readFile(join(process.cwd(), "assets/fonts/BricolageGrotesque-SemiBold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/BricolageGrotesque-Medium.ttf")),
    readFile(join(process.cwd(), "public/about-wallpaper.jpg")).then((jpg) => `data:image/jpeg;base64,${jpg.toString("base64")}`),
  ]);
  return assets;
}

type Card = { kicker: string; title: string; accent?: string; footer?: string };

export async function ogCard({ kicker, title, accent, footer = DEFAULT_FOOTER }: Card) {
  const [semibold, medium, photo] = await loadAssets();
  const length = title.length + (accent?.length ?? 0);
  const fontSize = length > 60 ? 60 : length > 40 ? 70 : 84;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#100a1f", color: "#ffffff", fontFamily: "Bricolage" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: OG_WIDTH,
            height: OG_HEIGHT,
            backgroundImage: `url(${photo})`,
            backgroundSize: `${OG_WIDTH}px ${OG_HEIGHT}px`,
            backgroundRepeat: "no-repeat",
          }}
        />
        <div style={{ position: "absolute", top: 0, left: 0, width: OG_WIDTH, height: OG_HEIGHT, background: "rgba(16, 10, 31, 0.8)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "64px 72px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width={52} height={52} viewBox="0 0 16 16">
              <path fill="#ffffff" d="M4 3h2v4H4zM10 3h2v4h-2z" />
              <path fill="#ffffff" fillOpacity={0.4} d="M4 8h2v4H4zM10 8h2v4h-2z" />
              <path fill="#a98fff" d="M1 7h14v1H1z" />
            </svg>
            <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: -0.8 }}>Horizon</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
            <span style={{ fontSize: 30, fontWeight: 500, color: "rgba(255, 255, 255, 0.7)" }}>{kicker}</span>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 18, fontSize, fontWeight: 600, lineHeight: 1.04, letterSpacing: -fontSize * 0.035 }}>
              <span>{title}</span>
              {accent ? <span style={{ color: "#a98fff" }}>{accent}</span> : null}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, fontWeight: 500, color: "rgba(255, 255, 255, 0.6)" }}>
            <span>{footer}</span>
            <span>{SITE_HOST}</span>
          </div>
        </div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: [
        { name: "Bricolage", data: semibold, weight: 600, style: "normal" },
        { name: "Bricolage", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
