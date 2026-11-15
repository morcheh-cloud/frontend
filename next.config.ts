import type { NextConfig } from "next"

// Sections whose tabs became pages of their own (`?tab=x` → `/section/x`),
// so old links, bookmarks and backend messages still land right.
const tabPages = Object.entries({
  "/storage": { storages: "list", syncs: "syncs", migrations: "migrations" },
  "/vms": { nodes: "nodes", storage: "storage", clusters: "clusters" },
  "/cloud": { servers: "servers" },
  "/dns": { servers: "servers" },
  "/applications": {
    installed: "installed",
    updates: "updates",
    activity: "activity",
  },
  "/ansible": { modules: "modules", runs: "runs" },
  "/scripts": { runs: "runs" },
  "/monitoring": { incidents: "incidents" },
  "/alerts": { channels: "channels", activity: "activity" },
  "/recordings": { recordings: "list", "sign-ins": "sign-ins" },
}).flatMap(([source, tabs]) =>
  Object.entries(tabs).map(([tab, page]) => ({
    source,
    has: [{ type: "query" as const, key: "tab", value: tab }],
    destination: `${source}/${page}`,
    permanent: true,
  })),
)

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
      { source: "/uptime", destination: "/monitoring", permanent: true },
      {
        source: "/uptime/:path*",
        destination: "/monitoring/:path*",
        permanent: true,
      },
      {
        source: "/servers/:id/uptime",
        destination: "/servers/:id/monitors",
        permanent: true,
      },
      {
        source: "/help/uptime",
        destination: "/help/monitoring",
        permanent: true,
      },
      ...tabPages,
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
