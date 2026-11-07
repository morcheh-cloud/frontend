import {
  type Buckets,
  bucketOf,
  buckets,
  type StripState,
} from "@/components/charts/time-chart"
import {
  addChecks,
  averageLatency,
  emptySeries,
  type Series,
  stripOf,
} from "@/components/insights/format"

export {
  countOf,
  formatCount,
  formatGrowth,
  formatMs,
  formatPercent,
  rangeLabels,
  type Series,
} from "@/components/insights/format"

import type {
  StorageActivityPoint,
  StorageInsight,
  StorageInsights,
  StorageUsagePoint,
} from "@/lib/services"

export type ActivityKind = StorageActivityPoint["kind"]

export const activityKinds: { kind: ActivityKind; label: string }[] = [
  { kind: "transfer", label: "Transfers" },
  { kind: "sync", label: "Cron job syncs" },
  { kind: "backup", label: "Database backups" },
]

export type StorageModel = StorageInsight & {
  series: Series
  strip: StripState[]
  history: StorageUsagePoint[]
  // Used bytes added since the start of the range (null = one measurement).
  growth: number | null
}

export type ActivityBucket = Record<
  ActivityKind,
  { ok: number; failed: number; bytes: number; files: number }
>

export type Model = {
  buckets: Buckets
  storages: StorageModel[]
  // All storages together: latency weighted by online checks.
  all: Series
  activity: ActivityBucket[]
  totals: {
    online: number
    checks: number
    failures: number
    used: number
    measured: number
    growth: number | null
    runs: number
    failed: number
    bytes: number
    byKind: Record<
      ActivityKind,
      { ok: number; failed: number; bytes: number; files: number }
    >
  }
}

const emptyKinds = () =>
  ({
    transfer: { ok: 0, failed: 0, bytes: 0, files: 0 },
    sync: { ok: 0, failed: 0, bytes: 0, files: 0 },
    backup: { ok: 0, failed: 0, bytes: 0, files: 0 },
  }) satisfies ActivityBucket

export function buildModel(data: StorageInsights): Model {
  const b = buckets(data.from, data.to, data.bucket_seconds)
  const n = b.starts.length
  const all = emptySeries(n)
  const allWeight: number[] = Array(n).fill(0)
  const byId = new Map<string, Series>()
  for (const s of data.storages) byId.set(s.id, emptySeries(n))

  for (const p of data.latency) {
    const i = bucketOf(b, p.t)
    const s = byId.get(p.storage_id)
    if (i < 0 || !s) continue
    addChecks(s, all, allWeight, i, {
      checks: p.checks,
      failures: p.failures,
      latency: p.latency_avg,
      max: p.latency_max,
    })
  }
  averageLatency(all, allWeight)

  const activity: ActivityBucket[] = b.starts.map(emptyKinds)
  const byKind = emptyKinds()
  for (const p of data.activity) {
    const i = bucketOf(b, p.t)
    const into = [byKind[p.kind], i >= 0 ? activity[i][p.kind] : null]
    for (const k of into) {
      if (!k) continue
      k.ok += p.ok
      k.failed += p.failed
      k.bytes += p.bytes
      k.files += p.files
    }
  }

  const history = new Map<string, StorageUsagePoint[]>()
  for (const u of data.usage) {
    const list = history.get(u.storage_id) ?? []
    list.push(u)
    history.set(u.storage_id, list)
  }

  const storages = data.storages.map((s): StorageModel => {
    const sr = byId.get(s.id) ?? emptySeries(n)
    const h = history.get(s.id) ?? []
    const growth =
      h.length > 1 ? h[h.length - 1].used_bytes - h[0].used_bytes : null
    return {
      ...s,
      series: sr,
      strip: stripOf(sr),
      history: h,
      growth,
    }
  })

  const kinds = Object.values(byKind)
  const growths = storages.flatMap((s) => (s.growth === null ? [] : [s.growth]))
  return {
    buckets: b,
    storages,
    all,
    activity,
    totals: {
      online: storages.filter((s) => s.status === "online").length,
      checks: storages.reduce((sum, s) => sum + s.checks, 0),
      failures: storages.reduce((sum, s) => sum + s.failures, 0),
      used: storages.reduce((sum, s) => sum + (s.usage?.used_bytes ?? 0), 0),
      measured: storages.filter((s) => s.usage).length,
      growth: growths.length ? growths.reduce((a, g) => a + g, 0) : null,
      runs: kinds.reduce((sum, k) => sum + k.ok + k.failed, 0),
      failed: kinds.reduce((sum, k) => sum + k.failed, 0),
      bytes: kinds.reduce((sum, k) => sum + k.bytes, 0),
      byKind,
    },
  }
}
