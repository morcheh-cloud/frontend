import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // A self-contained server in .next/standalone, for the Docker image.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // Network map moved out of Servers; keep old links and bookmarks working.
  async redirects() {
    return [
      { source: "/servers/network", destination: "/network", permanent: true },
    ]
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
