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
  // Security headers on every page. The panel can never be framed
  // (clickjacking), plugins and <base> injection are off, panel URLs (server
  // ids, paths) never leak to the sites it links to, and powerful browser
  // features nobody uses are denied. HSTS only takes effect over https.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), hid=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
        ],
      },
    ]
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
