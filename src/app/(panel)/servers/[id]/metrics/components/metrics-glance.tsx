"use client"

import { ChevronRight, CircleAlert } from "lucide-react"
import Link from "next/link"

import { useServerAlertRules } from "@/app/(panel)/alerts/api"
import { ruleState } from "@/app/(panel)/alerts/components/rules-meta"
import type { MetricPoint, Server, ServerMetrics } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useServerMetrics } from "../api"

// The last 24 hours on a server's Overview: CPU, memory and root disk as
// small lines with their average and peak, linking to the Metrics tab.

type Key = "cpu" | "memory" | "disk"
type Line = { key: Key; label: string; avg: number; peak: number; now: number }

const keys: { key: Key; label: string; peak: keyof MetricPoint }[] = [
  { key: "cpu", label: "CPU", peak: "cpu_max" },
  { key: "memory", label: "Memory", peak: "memory_max" },
  { key: "disk", label: "Disk /", peak: "disk_max" },
]

const pct = (n: number) => `${Math.round(n)}%`

function linesOf(m: ServerMetrics): Line[] {
  return keys.map(({ key, label, peak }) => {
    const pts = m.points
    const avg = pts.reduce((sum, p) => sum + p[key], 0) / pts.length
    const top = Math.max(...pts.map((p) => Number(p[peak]) || p[key]))
    return { key, label, avg, peak: top, now: pts.at(-1)?.[key] ?? 0 }
  })
}

const tone = (n: number) =>
  n >= 90 ? "text-destructive" : n >= 80 ? "text-warning" : undefined

// Usable only when the server is sampled and has samples in the range.
export function useMetricsGlance(server: Server) {
  const q = useServerMetrics(server.id, "24h")
  const m = q.data
  const ok = !!m && m.sample_seconds > 0 && m.points.length > 1
  return ok ? m : undefined
}

function useFiring(serverId: string) {
  const rules = useServerAlertRules(serverId).data ?? []
  return rules.filter((r) => r.enabled && ruleState(r) === "firing").length
}

export const metricsTabHref = (id: string) => `/servers/${id}/metrics`

// Desktop: the card body (the Overview draws the card).
export function MetricsGlance({
  server,
  data,
}: {
  server: Server
  data: ServerMetrics
}) {
  const firing = useFiring(server.id)
  return (
    <div className="flex flex-col gap-4">
      {linesOf(data).map((l) => (
        <div
          key={l.key}
          className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3"
        >
          <span className="text-body-sm text-muted-foreground">{l.label}</span>
          <Spark data={data} k={l.key} label={l.label} />
          <span className="text-end text-body-sm tabular-nums">
            <span className={cn("font-medium", tone(l.now))}>{pct(l.now)}</span>
            <span className="text-caption text-ash">
              {" "}
              avg {pct(l.avg)} · peak {pct(l.peak)}
            </span>
          </span>
        </div>
      ))}
      {firing > 0 && (
        <Link
          href={metricsTabHref(server.id)}
          className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-body-sm text-destructive"
        >
          <CircleAlert className="size-4 shrink-0" />
          {firing === 1
            ? "1 alert rule is firing"
            : `${firing} alert rules are firing`}
          <ChevronRight className="ms-auto size-4 shrink-0 rtl:rotate-180" />
        </Link>
      )}
    </div>
  )
}

// Phone: list rows for the Overview's grouped list.
export function MetricsGlanceRows({
  server,
  data,
}: {
  server: Server
  data: ServerMetrics
}) {
  const firing = useFiring(server.id)
  return (
    <>
      {linesOf(data).map((l) => (
        <li
          key={l.key}
          className="flex min-h-11 items-center gap-3 px-4 py-2.5 text-body"
        >
          <span className="w-20 shrink-0 text-muted-foreground">{l.label}</span>
          <Spark data={data} k={l.key} label={l.label} className="h-6 flex-1" />
          <span className="shrink-0 text-end tabular-nums">
            <span className={cn(tone(l.now))}>{pct(l.now)}</span>
            <span className="block text-caption text-ash">
              peak {pct(l.peak)}
            </span>
          </span>
        </li>
      ))}
      <li>
        <Link
          href={metricsTabHref(server.id)}
          className="flex min-h-12 items-center gap-3 px-4 py-2 outline-none active:bg-muted"
        >
          <span className="min-w-0 flex-1 truncate text-body text-brand">
            Metrics and alerts
          </span>
          {firing > 0 && (
            <span className="rounded-full bg-destructive px-1.5 text-caption font-medium text-white tabular-nums">
              {firing}
            </span>
          )}
          <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
        </Link>
      </li>
    </>
  )
}

// One metric over the range, 0–100% scale, with a faint peak line.
function Spark({
  data,
  k,
  label,
  className,
}: {
  data: ServerMetrics
  k: Key
  label: string
  className?: string
}) {
  const from = Date.parse(data.from)
  const span = Math.max(1, Date.parse(data.to) - from)
  const x = (p: MetricPoint) => ((Date.parse(p.t) - from) / span) * 100
  const y = (v: number) => 100 - Math.min(100, Math.max(0, v))
  const peakKey = `${k}_max` as const
  const line = data.points.map((p) => `${x(p)},${y(p[k])}`).join(" ")
  const peak = data.points.map((p) => `${x(p)},${y(p[peakKey])}`).join(" ")
  const first = data.points[0]
  const last = data.points.at(-1) ?? first
  const area = `${x(first)},100 ${line} ${x(last)},100`
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn("h-8 w-full overflow-visible", className)}
      role="img"
      aria-label={`${label} over the last 24 hours`}
    >
      <line
        x1={0}
        y1={100}
        x2={100}
        y2={100}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        className="stroke-border"
      />
      <polygon points={area} className="fill-brand-soft" />
      <polyline
        points={peak}
        fill="none"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        className="stroke-brand/30"
      />
      <polyline
        points={line}
        fill="none"
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="stroke-brand"
      />
    </svg>
  )
}
