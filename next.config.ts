import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // A self-contained server in .next/standalone, for the Docker image.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // Needed by turbopackRustReactCompiler, which only picks the implementation.
  reactCompiler: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
    turbopackRustReactCompiler: true,
    useOffline: true,
    turbopackGc: true,
    // lucide-react is optimized by default.
    optimizePackageImports: [
      "@xyflow/react",
      "@uiw/react-codemirror",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
    ],
    agentUpgrade: "security",
  },
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
