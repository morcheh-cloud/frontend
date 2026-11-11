import {
  Activity,
  Bell,
  Cpu,
  Gauge,
  Globe,
  HeartPulse,
  ListChecks,
  type LucideIcon,
} from "lucide-react"
import { createSerializer } from "nuqs"

import { count, errorTone, rate } from "@/app/(panel)/proxy/components/live"
import { serversPageTab } from "@/app/(panel)/servers/components/page-tab"
import type { StripState } from "@/components/charts/time-chart"
import {
  formatMs,
  formatPct,
  formatPercent,
  type InsightsRange,
  stripOf,
} from "@/components/insights/format"
import type { Home, Tally } from "../api"
import type { HomeLive } from "../live"
import type { Tone } from "./card"

// The six numbers across the top of Home (a scrolling row on phones). Each
// one links to the page that explains it.

export type Kpi = {
  key: string
  label: string
  icon: LucideIcon
  href: string
  // null = still loading.
  value: string | null
  sub: string
  tone?: Tone
  spark?: number[]
  sparkTone?: "brand" | "destructive" | "muted"
  strip?: StripState[]
  tally?: Tally
}

const serverTab = createSerializer(serversPageTab)
export const insightsHref = (range: InsightsRange = "24h") =>
  serverTab("/servers", { tab: "insights", range })

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`

const present = (xs: (number | null)[]) =>
  xs.filter((x): x is number => x !== null)

export function kpis(home: Home, live: HomeLive): Kpi[] {
  const m = live.model
  const loading = live.modelPending && !m
  const t = m?.totals
  const online = m?.servers.filter((s) => s.status === "online") ?? []
  const sampled = online.flatMap((s) => (s.latest ? [s.latest] : []))
  const avg = (f: (r: (typeof sampled)[number]) => number) =>
    sampled.length ? sampled.reduce((a, r) => a + f(r), 0) / sampled.length : 0
  const cpuNow = avg((r) => r.cpu_percent)
  const memNow = avg((r) =>
    r.mem_total_bytes ? (100 * r.mem_used_bytes) / r.mem_total_bytes : 0,
  )

  const list: Kpi[] = [
    {
      key: "availability",
      label: "Availability",
      icon: Activity,
      href: insightsHref(),
      value: loading
        ? null
        : t?.checks
          ? formatPercent(1 - t.failures / t.checks)
          : "—",
      sub: m
        ? `${t?.online ?? 0} of ${m.servers.length} online · 24h`
        : "Server checks · 24h",
      tone: t?.failures ? "warning" : undefined,
      strip: m ? stripOf(m.all) : undefined,
    },
    {
      key: "latency",
      label: "Response time",
      icon: Gauge,
      href: insightsHref(),
      value: loading ? null : t?.latency != null ? formatMs(t.latency) : "—",
      sub: "SSH answer, average · 24h",
      spark: m ? present(m.all.latency) : undefined,
    },
    {
      key: "cpu",
      label: "Fleet CPU",
      icon: Cpu,
      href: insightsHref(),
      value: loading ? null : sampled.length ? formatPct(cpuNow) : "—",
      sub: sampled.length
        ? `Memory ${formatPct(memNow)} · ${plural(sampled.length, "server")}`
        : "Not sampled yet",
      tone: cpuNow >= 90 ? "destructive" : cpuNow >= 80 ? "warning" : undefined,
      spark: m ? present(m.allRes.cpu) : undefined,
    },
    monitorsKpi(home, live),
    alertsKpi(live),
    live.hasProxies ? trafficKpi(live) : tasksKpi(home),
  ]
  return list
}

function monitorsKpi(home: Home, live: HomeLive): Kpi {
  const ms = live.monitors ?? []
  const counted = ms.filter((x) => !x.paused && x.uptime_24h != null)
  const tally = home.tallies.uptime
  if (!live.monitorsPending && ms.length === 0) {
    return {
      key: "monitors",
      label: "Uptime",
      icon: HeartPulse,
      href: "/uptime/new",
      value: "—",
      sub: "Add a monitor to watch a website",
    }
  }
  const avg = counted.length
    ? counted.reduce((a, x) => a + (x.uptime_24h ?? 0), 0) / counted.length
    : null
  return {
    key: "monitors",
    label: "Uptime",
    icon: HeartPulse,
    href: "/uptime",
    value: live.monitorsPending ? null : avg === null ? "—" : uptime(avg),
    sub: tally
      ? `${tally.ok} up${tally.bad ? ` · ${tally.bad} down` : ""}${
          tally.warn ? ` · ${tally.warn} slow` : ""
        }`
      : "Monitors · 24h",
    tone: tally?.bad ? "destructive" : tally?.warn ? "warning" : undefined,
    tally,
  }
}

const uptime = (p: number) =>
  p >= 99.995 ? "100%" : p >= 99 ? `${p.toFixed(2)}%` : `${p.toFixed(1)}%`

function alertsKpi(live: HomeLive): Kpi {
  const a = live.alerts
  return {
    key: "alerts",
    label: "Alerts firing",
    icon: Bell,
    href: "/alerts",
    value: String(a.firing),
    sub: a.critical
      ? `${a.critical} critical`
      : a.rules
        ? `${plural(a.rules, "rule")} watching`
        : "No alert rules yet",
    tone: a.critical ? "destructive" : a.firing ? "warning" : undefined,
    tally: a.rules
      ? {
          total: a.rules,
          ok: Math.max(0, a.rules - a.firing),
          warn: a.firing - a.critical,
          bad: a.critical,
          idle: 0,
        }
      : undefined,
  }
}

function trafficKpi(live: HomeLive): Kpi {
  const tr = live.traffic
  const tone = tr ? errorTone(tr.errors, tr.total) : "muted"
  return {
    key: "traffic",
    label: "Requests / min",
    icon: Globe,
    href: "/proxy",
    value: tr ? count(tr.now) : null,
    sub: tr
      ? `${rate(tr.errors, tr.total)} server errors · 30 min`
      : "Web traffic",
    tone: tone === "muted" ? undefined : tone,
    spark: tr?.requests,
    sparkTone: tone === "destructive" ? "destructive" : "brand",
  }
}

function tasksKpi(home: Home): Kpi {
  return {
    key: "tasks",
    label: "Tasks running",
    icon: ListChecks,
    href: "/tasks",
    value: String(home.activeJobs),
    sub: home.activeJobs ? "In the background" : "Nothing running now",
  }
}
