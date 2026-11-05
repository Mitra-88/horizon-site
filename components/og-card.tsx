import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import { SITE_HOST } from "@/components/site";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const DEFAULT_FOOTER = "Free and open source · Windows, macOS and Linux";
const MAX_ICON_BYTES = 512 * 1024;
const ALLOWED_ICON_HOSTS = new Set([
  "horizon-rust.github.io",
  "cdn.modrinth.com",
  "raw.githubusercontent.com",
  "media.forgecdn.net",
]);

let assets: Promise<[Buffer, Buffer, string]> | null = null;

function loadAssets() {
  assets ??= Promise.all([
    readFile(join(process.cwd(), "assets/fonts/BricolageGrotesque-SemiBold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/BricolageGrotesque-Medium.ttf")),
    readFile(join(process.cwd(), "public/about-wallpaper.jpg")).then((jpg) => `data:image/jpeg;base64,${jpg.toString("base64")}`),
  ]);
  return assets;
}

function detectImageMime(buffer: Buffer): "image/png" | "image/jpeg" | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  return null;
}

async function readBodyWithCap(res: Response, maxBytes: number): Promise<Buffer | null> {
  if (!res.body) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

export async function loadIcon(url?: string): Promise<string | null> {
  "use cache";
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    cacheLife("minutes");
    return null;
  }

  if (parsed.protocol !== "https:" || !ALLOWED_ICON_HOSTS.has(parsed.hostname.toLowerCase())) {
    cacheLife("hours");
    return null;
  }

  try {
    const res = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      cacheLife("minutes");
      return null;
    }

    const rawContentType = res.headers.get("content-type")?.toLowerCase() || "";
    const [contentType] = rawContentType.split(";").map((s) => s.trim());
    if (contentType !== "image/png" && contentType !== "image/jpeg") {
      cacheLife("minutes");
      return null;
    }

    const contentLength = res.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_ICON_BYTES) {
      cacheLife("minutes");
      return null;
    }

    const buffer = await readBodyWithCap(res, MAX_ICON_BYTES);
    if (!buffer) {
      cacheLife("minutes");
      return null;
    }

    const mime = detectImageMime(buffer);
    if (!mime || mime !== contentType) {
      cacheLife("minutes");
      return null;
    }

    cacheLife("hours");
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    cacheLife("minutes");
    return null;
  }
}

type Card = { kicker: string; title: string; accent?: string; footer?: string; icon?: string };

export async function ogCard({ kicker, title, accent, footer = DEFAULT_FOOTER, icon }: Card) {
  const [[semibold, medium, photo], iconData] = await Promise.all([loadAssets(), loadIcon(icon)]);
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
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            {iconData ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={iconData}
                width={128}
                height={128}
                alt=""
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: 24,
                  border: "2px solid rgba(255, 255, 255, 0.2)",
                  backgroundColor: "rgba(34, 26, 58, 0.8)",
                  objectFit: "cover",
                }}
              />
            ) : null}
            <div style={{ display: "flex", flexDirection: "column", maxWidth: iconData ? 840 : 1000 }}>
              <span style={{ fontSize: 30, fontWeight: 500, color: "rgba(255, 255, 255, 0.7)" }}>{kicker}</span>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 18, fontSize, fontWeight: 600, lineHeight: 1.04, letterSpacing: -fontSize * 0.035 }}>
                <span>{title}</span>
                {accent ? <span style={{ color: "#a98fff" }}>{accent}</span> : null}
              </div>
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
