import type { NextConfig } from "next";

// basePath for GitHub Pages project sites (https://<user>.github.io/<repo>/).
// Set NEXT_PUBLIC_BASE_PATH=/repo-name in your GitHub Actions env (or .env).
// For a custom domain or user/org page (https://<user>.github.io/), leave empty.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // Static HTML export — deployable to GitHub Pages (no server runtime needed;
  // signaling goes through a public MQTT broker over WebSocket).
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
