import { type Buckets, bucketOf, buckets } from "@/components/charts/time-chart"
import {
  addChecks,
  averageLatency,
  emptySeries,
  type Series,
  stripOf,
} from "@/components/insights/format"
import type { DatabaseInsight, DatabaseInsights } from "@/lib/services"

type Line = (number | null)[]

export type Load = {
  qps: Line
  connections: Line
  maxConnections: Line
  size: Line
}

const emptyLoad = (n: number): Load => ({
  qps: Array(n).fill(null),
  connections: Array(n).fill(null),
  maxConnections: Array(n).fill(null),
  size: Array(n).fill(null),
})

export type DatabaseModel = DatabaseInsight & {
  series: Series
  strip: ReturnType<typeof stripOf>
  load: Load
  // Bytes added since the start of the range (null = one measurement).
  growth: number | null
}

export type Model = {
  buckets: Buckets
  databases: DatabaseModel[]
  all: Series
  // Every database together: queries and connections summed.
  allLoad: Load
  totals: {
    online: number
    watched: number
    samples: number
    failures: number
    latency: number | null
    qps: number | null
    size: number | null
    sized: number
    growth: number | null
    problems: number
  }
}

const add = (a: number | null, b: number | null) =>
  b === null ? a : (a ?? 0) + b

export const needsLook = (d: DatabaseInsight) =>
  !d.paused &&
  (d.status !== "online" || d.health === "warning" || d.health === "critical")

export function buildModel(data: DatabaseInsights): Model {
  const b = buckets(data.from, data.to, data.bucket_seconds)
  const n = b.starts.length
  const all = emptySeries(n)
  const weight: number[] = Array(n).fill(0)
  const series = new Map(data.databases.map((d) => [d.id, emptySeries(n)]))
  const load = new Map(data.databases.map((d) => [d.id, emptyLoad(n)]))
  const allLoad = emptyLoad(n)

  for (const p of data.series) {
    const i = bucketOf(b, p.t)
    const s = series.get(p.database_id)
    const l = load.get(p.database_id)
    if (i < 0 || !s || !l) continue
    addChecks(s, all, weight, i, {
      checks: p.samples,
      failures: p.failures,
      latency: p.latency_avg,
      max: p.latency_max,
    })
    l.qps[i] = p.qps
    l.connections[i] = p.connections
    l.maxConnections[i] = p.max_connections
    l.size[i] = p.size_bytes
    allLoad.qps[i] = add(allLoad.qps[i], p.qps)
    allLoad.connections[i] = add(allLoad.connections[i], p.connections)
    allLoad.maxConnections[i] = add(
      allLoad.maxConnections[i],
      p.max_connections,
    )
    allLoad.size[i] = add(allLoad.size[i], p.size_bytes)
  }
  averageLatency(all, weight)

  const databases = data.databases.map((d): DatabaseModel => {
    const sr = series.get(d.id) ?? emptySeries(n)
    return {
      ...d,
      series: sr,
      strip: stripOf(sr),
      load: load.get(d.id) ?? emptyLoad(n),
      growth:
        d.size_first !== null && d.size_last !== null
          ? d.size_last - d.size_first
          : null,
    }
  })

  const watched = databases.filter((d) => !d.paused)
  let latency = 0
  let answered = 0
  for (const d of databases) {
    if (d.latency_avg === null) continue
    latency += d.latency_avg * (d.samples - d.failures)
    answered += d.samples - d.failures
  }
  const sized = databases.filter((d) => d.size_bytes !== null)
  const growths = databases.flatMap((d) =>
    d.growth === null ? [] : [d.growth],
  )
  const qps = databases.flatMap((d) => (d.qps_avg === null ? [] : [d.qps_avg]))

  return {
    buckets: b,
    databases,
    all,
    allLoad,
    totals: {
      online: watched.filter((d) => d.status === "online").length,
      watched: watched.length,
      samples: databases.reduce((sum, d) => sum + d.samples, 0),
      failures: databases.reduce((sum, d) => sum + d.failures, 0),
      latency: answered ? latency / answered : null,
      qps: qps.length ? qps.reduce((a, v) => a + v, 0) : null,
      size: sized.length
        ? sized.reduce((sum, d) => sum + (d.size_bytes ?? 0), 0)
        : null,
      sized: sized.length,
      growth: growths.length ? growths.reduce((a, g) => a + g, 0) : null,
      problems: databases.filter(needsLook).length,
    },
  }
}
