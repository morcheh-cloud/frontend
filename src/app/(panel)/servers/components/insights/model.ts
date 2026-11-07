import { type Buckets, bucketOf, buckets } from "@/components/charts/time-chart"
import {
  addChecks,
  averageLatency,
  emptySeries,
  type Series,
  stripOf,
} from "@/components/insights/format"
import type { ServerInsight, ServerInsights } from "@/lib/services"

// One value per bucket; null = nothing read then.
type Line = (number | null)[]

export type Resources = {
  samples: number[]
  cpu: Line
  cpuMax: Line
  mem: Line
  memMax: Line
  disk: Line
  rx: Line
  tx: Line
  load: Line
}

const emptyResources = (n: number): Resources => ({
  samples: Array(n).fill(0),
  cpu: Array(n).fill(null),
  cpuMax: Array(n).fill(null),
  mem: Array(n).fill(null),
  memMax: Array(n).fill(null),
  disk: Array(n).fill(null),
  rx: Array(n).fill(null),
  tx: Array(n).fill(null),
  load: Array(n).fill(null),
})

export type ServerModel = ServerInsight & {
  series: Series
  strip: ReturnType<typeof stripOf>
  res: Resources
}

export type Model = {
  buckets: Buckets
  servers: ServerModel[]
  all: Series
  // Every sampled server: CPU/memory/disk averaged, network summed.
  allRes: Resources
  sampled: boolean
  totals: {
    online: number
    checks: number
    failures: number
    latency: number | null
    cpu: number | null
    cpuMax: number | null
    mem: number | null
    memMax: number | null
    fullest: ServerModel | null
  }
}

const max = (a: number | null, b: number) => (a === null ? b : Math.max(a, b))

export function buildModel(data: ServerInsights): Model {
  const b = buckets(data.from, data.to, data.bucket_seconds)
  const n = b.starts.length
  const all = emptySeries(n)
  const weight: number[] = Array(n).fill(0)
  const series = new Map(data.servers.map((s) => [s.id, emptySeries(n)]))
  const res = new Map(data.servers.map((s) => [s.id, emptyResources(n)]))

  for (const p of data.checks) {
    const i = bucketOf(b, p.t)
    const s = series.get(p.server_id)
    if (i < 0 || !s) continue
    addChecks(s, all, weight, i, {
      checks: p.checks,
      failures: p.failures,
      latency: p.latency_avg,
      max: p.latency_max,
    })
  }
  averageLatency(all, weight)

  // All servers: sums first, then the averages are divided by the servers
  // read in that bucket.
  const allRes = emptyResources(n)
  const count: number[] = Array(n).fill(0)
  for (const p of data.resources) {
    const i = bucketOf(b, p.t)
    const r = res.get(p.server_id)
    if (i < 0 || !r || !p.samples) continue
    r.samples[i] += p.samples
    r.cpu[i] = p.cpu_avg
    r.cpuMax[i] = p.cpu_max
    r.mem[i] = p.mem_avg
    r.memMax[i] = p.mem_max
    r.disk[i] = p.disk_max
    r.rx[i] = p.rx_avg
    r.tx[i] = p.tx_avg
    r.load[i] = p.load_avg
    count[i]++
    allRes.samples[i] += p.samples
    allRes.cpu[i] = (allRes.cpu[i] ?? 0) + p.cpu_avg
    allRes.mem[i] = (allRes.mem[i] ?? 0) + p.mem_avg
    allRes.disk[i] = (allRes.disk[i] ?? 0) + p.disk_max
    allRes.load[i] = (allRes.load[i] ?? 0) + p.load_avg
    allRes.cpuMax[i] = max(allRes.cpuMax[i], p.cpu_max)
    allRes.memMax[i] = max(allRes.memMax[i], p.mem_max)
    allRes.rx[i] = (allRes.rx[i] ?? 0) + p.rx_avg
    allRes.tx[i] = (allRes.tx[i] ?? 0) + p.tx_avg
  }
  for (const key of ["cpu", "mem", "disk", "load"] as const) {
    allRes[key] = allRes[key].map((v, i) =>
      v === null || !count[i] ? null : v / count[i],
    )
  }

  const servers = data.servers.map((s): ServerModel => {
    const sr = series.get(s.id) ?? emptySeries(n)
    return {
      ...s,
      series: sr,
      strip: stripOf(sr),
      res: res.get(s.id) ?? emptyResources(n),
    }
  })

  const checks = servers.reduce((sum, s) => sum + s.checks, 0)
  const failures = servers.reduce((sum, s) => sum + s.failures, 0)
  let latency = 0
  let answered = 0
  for (const s of servers) {
    if (s.latency_avg === null) continue
    latency += s.latency_avg * (s.checks - s.failures)
    answered += s.checks - s.failures
  }
  const read = servers.flatMap((s) => (s.resources ? [s.resources] : []))
  const avg = (f: (r: (typeof read)[0]) => number) =>
    read.length ? read.reduce((sum, r) => sum + f(r), 0) / read.length : null
  const peak = (f: (r: (typeof read)[0]) => number) =>
    read.length ? Math.max(...read.map(f)) : null
  const fullest = servers.reduce<ServerModel | null>(
    (best, s) =>
      s.latest &&
      (!best?.latest ||
        s.latest.disk_max_percent > best.latest.disk_max_percent)
        ? s
        : best,
    null,
  )

  return {
    buckets: b,
    servers,
    all,
    allRes,
    sampled: read.length > 0,
    totals: {
      online: servers.filter((s) => s.status === "online").length,
      checks,
      failures,
      latency: answered ? latency / answered : null,
      cpu: avg((r) => r.cpu_avg),
      cpuMax: peak((r) => r.cpu_max),
      mem: avg((r) => r.mem_avg),
      memMax: peak((r) => r.mem_max),
      fullest,
    },
  }
}
