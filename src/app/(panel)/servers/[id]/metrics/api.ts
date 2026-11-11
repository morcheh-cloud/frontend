"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createSerializer, parseAsStringLiteral, useQueryStates } from "nuqs"

import { api } from "@/lib/api"

// A server's sampled metrics (CPU, memory, load, disks, network) over a range.

export const metricRanges = ["1h", "6h", "24h", "7d", "30d"] as const
export type MetricRange = (typeof metricRanges)[number]

export const metricKeys = {
  all: ["server-metrics"] as const,
  range: (id: string, range: MetricRange) =>
    ["server-metrics", id, range] as const,
}

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export function useServerMetrics(id: string, range: MetricRange) {
  return useQuery({
    queryKey: metricKeys.range(id, range),
    queryFn: () => api.servers.getServerMetrics(id, { range, tz: timeZone() }),
    // Switching range keeps the old charts until the new ones arrive.
    placeholderData: keepPreviousData,
    refetchInterval: range === "1h" ? 30_000 : 60_000,
  })
}

const filters = {
  range: parseAsStringLiteral(metricRanges).withDefault("24h"),
}

export function useMetricFilters() {
  return useQueryStates(filters, { history: "replace" })
}

export const metricsHref = createSerializer(filters)
