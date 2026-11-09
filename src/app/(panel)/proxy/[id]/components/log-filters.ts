"use client"

import { parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs"

// The proxy page's Logs tab: which log, how it's shown, and the raw view's
// own filters. A site's table reuses the site editor's request filters.

// The proxy's own log is "proxy" in the URL; a site is its id.
export const OWN_LOG = "proxy"
export const lineChoices = [100, 200, 500, 1000, 2000]
export const logViews = ["table", "raw"] as const
export type LogView = (typeof logViews)[number]
export const errorLevels = ["all", "error", "warn", "notice"] as const
export type ErrorLevel = (typeof errorLevels)[number]

export const proxyLogParsers = {
  site: parseAsString.withDefault(OWN_LOG),
  log: parseAsString.withDefault("access"),
  lines: parseAsInteger.withDefault(500),
  view: parseAsStringLiteral(logViews).withDefault("table"),
  level: parseAsStringLiteral(errorLevels).withDefault("all"),
}
