import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig = (phase: string): NextConfig => ({
  // Keep dev artifacts intact when a production build runs in the same checkout.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  reactStrictMode: true,
  experimental: {
    // These packages expose large barrel entry points; only bundle the
    // components imported by each route.
    optimizePackageImports: ["@react-three/drei", "recharts"],
  },
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Each project under app/(page_routes) was written independently; keep builds
  // unblocked by lint/type noise coming from the imported legacy code.
  eslint: { ignoreDuringBuilds: true },
});

export default nextConfig;
