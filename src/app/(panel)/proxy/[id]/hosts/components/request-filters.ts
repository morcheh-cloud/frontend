"use client"

import {
  createSerializer,
  parseAsInteger,
  parseAsIsoDateTime,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import type { ReportRange, RequestQuery } from "../../../api"
import { tabParser } from "./editor-tabs"

// The Logs tab's filters live in the URL, so a link (from the Report, or
// pasted to a colleague) opens the same list.

export const requestRanges = ["15m", "1h", "6h", "24h", "7d"] as const
export type RequestRange = (typeof requestRanges)[number]

export const requestRangeLabels: Record<RequestRange, string> = {
  "15m": "Last 15 minutes",
  "1h": "Last hour",
  "6h": "Last 6 hours",
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
}

export const statusClasses = [
  "all",
  "2xx",
  "3xx",
  "4xx",
  "5xx",
  "errors",
] as const
export type StatusClass = (typeof statusClasses)[number]

export const requestParsers = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(statusClasses).withDefault("all"),
  // Exact codes ("404", "502,504"); wins over `status`.
  code: parseAsString.withDefault(""),
  range: parseAsStringLiteral(requestRanges).withDefault("1h"),
  // A range of its own; `until` empty = up to now (and live).
  since: parseAsIsoDateTime,
  until: parseAsIsoDateTime,
  method: parseAsString.withDefault(""),
  path: parseAsString.withDefault(""),
  ip: parseAsString.withDefault(""),
  domain: parseAsString.withDefault(""),
  // Slower than this many ms.
  slow: parseAsInteger.withDefault(0),
}

export type RequestFilters = {
  q: string
  status: StatusClass
  code: string
  range: RequestRange
  since: Date | null
  until: Date | null
  method: string
  path: string
  ip: string
  domain: string
  slow: number
}

export function useRequestFilters() {
  return useQueryStates(requestParsers, {
    history: "replace",
    scroll: false,
  })
}

// The report's own range, apart from the list's.
export const reportRangeParser = parseAsStringLiteral([
  "1h",
  "24h",
  "7d",
  "30d",
] as const satisfies readonly ReportRange[]).withDefault("24h")

const serializeLogs = createSerializer({ ...requestParsers, tab: tabParser })

// This site's Logs tab with these filters ("" = the page itself).
export function logsHref(
  pathname: string,
  filters: Partial<RequestFilters>,
): string {
  return serializeLogs(pathname, { tab: "logs", ...filters })
}

export function toRequestQuery(f: RequestFilters, limit: number): RequestQuery {
  const status = f.code.trim()
    ? f.code.replace(/\s+/g, "")
    : f.status === "all"
      ? undefined
      : f.status === "errors"
        ? "4xx,5xx"
        : f.status
  return {
    range: f.since ? undefined : f.range,
    from: f.since?.toISOString(),
    to: f.since && f.until ? f.until.toISOString() : undefined,
    q: f.q.trim() || undefined,
    status,
    method: f.method || undefined,
    path: f.path.trim() || undefined,
    ip: f.ip.trim() || undefined,
    domain: f.domain || undefined,
    min_ms: f.slow > 0 ? f.slow : undefined,
    limit,
  }
}

// The filters beyond search, status and time, as removable pills.
export function extraFilters(f: RequestFilters) {
  const out: { key: keyof RequestFilters; label: string }[] = []
  if (f.code.trim()) out.push({ key: "code", label: `Status ${f.code}` })
  if (f.method) out.push({ key: "method", label: f.method })
  if (f.path.trim()) out.push({ key: "path", label: `Path has ${f.path}` })
  if (f.ip.trim()) out.push({ key: "ip", label: `From ${f.ip}` })
  if (f.domain) out.push({ key: "domain", label: f.domain })
  if (f.slow > 0) out.push({ key: "slow", label: `Slower than ${f.slow} ms` })
  return out
}
