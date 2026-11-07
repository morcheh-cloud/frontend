import type { Buckets, StripState } from "@/components/charts/time-chart"

// Shared by every Insights tab (storage, servers, databases).

export const insightRanges = ["24h", "7d", "30d"] as const
export type InsightsRange = (typeof insightRanges)[number]

export const rangeLabels = {
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
} as const satisfies Record<InsightsRange, string>

// Buckets line up with this browser's days (the backend bins in its zone).
export const timeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return undefined
  }
}

// Connection checks per bucket: count, failures, response time of the ones
// that got through (null = none did).
export type Series = {
  checks: number[]
  failures: number[]
  latency: (number | null)[]
  latencyMax: number[]
}

export const emptySeries = (n: number): Series => ({
  checks: Array(n).fill(0),
  failures: Array(n).fill(0),
  latency: Array(n).fill(null),
  latencyMax: Array(n).fill(0),
})

// Adds one bucket's checks to a series and to the all-items total, whose
// latency is weighted by the checks that got through (finish with
// `averageLatency`).
export function addChecks(
  s: Series,
  all: Series,
  weight: number[],
  i: number,
  p: { checks: number; failures: number; latency: number | null; max: number },
) {
  s.checks[i] += p.checks
  s.failures[i] += p.failures
  all.checks[i] += p.checks
  all.failures[i] += p.failures
  const online = p.checks - p.failures
  if (online > 0 && p.latency !== null) {
    s.latency[i] = p.latency
    s.latencyMax[i] = Math.max(s.latencyMax[i], p.max)
    all.latency[i] = (all.latency[i] ?? 0) + p.latency * online
    weight[i] += online
    all.latencyMax[i] = Math.max(all.latencyMax[i], p.max)
  }
}

export function averageLatency(all: Series, weight: number[]) {
  all.latency = all.latency.map((v, i) =>
    v === null || !weight[i] ? null : v / weight[i],
  )
}

export function stripState(checks: number, failures: number): StripState {
  if (!checks) return "none"
  if (!failures) return "ok"
  return failures >= checks ? "down" : "some"
}

export const stripOf = (s: Series) =>
  s.checks.map((c, i) => stripState(c, s.failures[i]))

// "30 minutes", "4 hours", "a day".
export function bucketEach(b: Buckets) {
  const minutes = b.size / 60_000
  if (minutes >= 1440) return "a day"
  if (minutes >= 60) return `${minutes / 60} hours`
  return `${minutes} minutes`
}

export function formatPercent(share: number) {
  const p = share * 100
  if (p >= 99.995) return "100%"
  if (p >= 99) return `${p.toFixed(2)}%`
  return `${p.toFixed(1)}%`
}

// A 0–100 value, as resources come: "42%", "7.5%".
export function formatPct(p: number) {
  return p >= 10 || p === 0 ? `${Math.round(p)}%` : `${p.toFixed(1)}%`
}

export function formatMs(ms: number) {
  if (ms >= 10_000) return `${(ms / 1000).toFixed(0)} s`
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`
  // Local databases answer in under a millisecond: "0.4 ms", not "0 ms".
  if (ms < 10) return `${Number(ms.toFixed(1))} ms`
  return `${Math.round(ms)} ms`
}

export function formatCount(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(n)
}

// Rates like queries per second: "0.94", "12", "1.2K".
export function formatRate(n: number) {
  if (n === 0) return "0"
  if (n < 10) return n.toFixed(n < 1 ? 2 : 1)
  return formatCount(n)
}

// "1 file", "1.2K files".
export function countOf(n: number, noun: string) {
  return `${formatCount(n)} ${noun}${n === 1 ? "" : "s"}`
}

// "+1.2 GB", "−340 MB", "No change".
export function formatGrowth(bytes: number, size: (b: number) => string) {
  if (bytes === 0) return "No change"
  return `${bytes > 0 ? "+" : "−"}${size(Math.abs(bytes))}`
}

// At this pace, days until `free` bytes are gone (null = not filling up, or
// too little history to say).
export function daysUntilFull(
  first: number,
  last: number,
  from: string,
  to: string,
  free: number,
) {
  const seconds = (Date.parse(to) - Date.parse(from)) / 1000
  if (seconds < 3600 || last <= first || free <= 0) return null
  const days = free / ((last - first) / seconds) / 86_400
  return days > 365 ? null : days
}

export function formatDays(days: number) {
  if (days < 1) return "within a day"
  const d = Math.round(days)
  return `in about ${d} ${d === 1 ? "day" : "days"}`
}
