import type { MetadataRoute } from "next"

// A private admin panel: nothing here belongs in a search engine.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } }
}
