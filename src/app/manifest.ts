import type { MetadataRoute } from "next"
import { themeColors } from "@/lib/theme-script"

// Lets phones install the panel as an app (home-screen icon, own window).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Morche",
    short_name: "Morche",
    description:
      "Manage and monitor your servers and the services running on them.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: themeColors.light,
    theme_color: themeColors.light,
    categories: ["productivity", "utilities", "developer tools"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
