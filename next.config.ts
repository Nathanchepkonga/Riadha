import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Port-forwarding tunnels (VS Code / Dev Tunnels) serve the dev server from *.devtunnels.ms.
const TUNNEL_HOSTS = ["**.devtunnels.ms"];

const nextConfig: NextConfig = {
  // Dev-only assets (HMR, chunks) may be requested from 127.0.0.1 (a second, independent login for
  // testing) and through a port-forwarding tunnel.
  allowedDevOrigins: ["127.0.0.1", ...TUNNEL_HOSTS],
  // FFmpeg binaries are located relative to these packages at runtime, so they must not be bundled.
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
  experimental: {
    serverActions: {
      // Photos and logos go through Server Actions (two 8MB images at most per form). Videos use the
      // chunked upload API in src/app/api/videos instead, so this stays small.
      bodySizeLimit: "20mb",
      // Dev Tunnels rewrites the request's Origin to localhost:3000 while forwarding the tunnel host,
      // which Next's CSRF check rejects. Trust those origins in development only; production keeps
      // the default same-origin rule.
      ...(isDev && { allowedOrigins: ["localhost:3000", "127.0.0.1:3000", ...TUNNEL_HOSTS] }),
    },
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=()" },
    ];
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
    }
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
