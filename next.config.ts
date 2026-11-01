import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["202.61.226.46"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/u/**", search: "?v=4" }],
  },
  experimental: {
    agentFeedback: true,
  },
  async redirects() {
    return [
      { source: "/:path*", has: [{ type: "host", value: "[^.]+\\.up\\.railway\\.app" }], destination: "https://playhorizon.dev/:path*", permanent: true },
      { source: "/server", destination: "/docs/hosting", permanent: true },
      { source: "/server.html", destination: "/docs/hosting", permanent: true },
      { source: "/roadmap", destination: "/hub#roadmap", permanent: true },
      // The staff dashboards moved into the hub (2026-11-01). Browsers keep the #fragment of old setup links across the redirect.
      { source: "/staff", destination: "/hub/sign-in", permanent: true },
      { source: "/staff/help", destination: "/hub/staff-help", permanent: true },
      { source: "/staff/:view(team|mod|setup)", destination: "/hub/:view", permanent: true },
    ];
  },
  async headers() {
    const privateHeaders = [
      { key: "Cache-Control", value: "no-store" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "X-Content-Type-Options", value: "nosniff" },
    ];
    return [
      { source: "/staff/:path*", headers: privateHeaders },
      { source: "/hub/:view(team|mod|sign-in|setup|staff-help)", headers: privateHeaders },
      { source: "/apply", headers: privateHeaders },
      { source: "/mods/submit", headers: [{ key: "X-Frame-Options", value: "DENY" }, { key: "Content-Security-Policy", value: "frame-ancestors 'none'" }] },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
