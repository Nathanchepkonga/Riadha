import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Port-forwarding tunnels (VS Code / Dev Tunnels) serve the dev server from *.devtunnels.ms.
const TUNNEL_HOSTS = ["**.devtunnels.ms"];

const nextConfig: NextConfig = {
  // Dev-only assets (HMR, chunks) may be requested from 127.0.0.1 (a second, independent login for
  // testing) and through a port-forwarding tunnel.
  allowedDevOrigins: ["127.0.0.1", ...TUNNEL_HOSTS],
  experimental: {
    serverActions: {
      // Highlight videos are uploaded through Server Actions (60MB cap enforced in lib/storage).
      bodySizeLimit: "64mb",
      // Dev Tunnels rewrites the request's Origin to localhost:3000 while forwarding the tunnel host,
      // which Next's CSRF check rejects. Trust those origins in development only; production keeps
      // the default same-origin rule.
      ...(isDev && { allowedOrigins: ["localhost:3000", "127.0.0.1:3000", ...TUNNEL_HOSTS] }),
    },
  },
};

export default nextConfig;
