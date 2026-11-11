"use client"

import { Cpu } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Meter } from "@/app/(panel)/servers/[id]/components/resources"
import type { ServerModel } from "@/app/(panel)/servers/components/insights/model"
import { statusMeta } from "@/app/(panel)/servers/components/meta"
import { formatPct } from "@/components/insights/format"
import { Skeleton } from "@/components/ui/skeleton"
import { useStoredChoice } from "@/hooks/useStoredChoice"
import { formatSize } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { HomeLive } from "../live"
import { Blank, Card, CardLink } from "./card"
import { insightsHref } from "./kpis"

// Every server as one square, coloured by how busy it is right now: the
// whole fleet at a glance, the busiest ones listed beside it.

const metrics = ["cpu", "memory", "disk"] as const
type Metric = (typeof metrics)[number]

const metricItems = [
  { value: "cpu", label: "CPU" },
  { value: "memory", label: "Memory" },
  { value: "disk", label: "Disk" },
] as const

export function usageOf(s: ServerModel, metric: Metric): number | null {
  const r = s.latest
  if (!r || s.status !== "online") return null
  if (metric === "cpu") return r.cpu_percent
  if (metric === "memory")
    return r.mem_total_bytes ? (100 * r.mem_used_bytes) / r.mem_total_bytes : 0
  return r.disk_max_percent
}

function cellClass(v: number | null, status: string) {
  if (status === "unknown") return "bg-muted"
  if (status !== "online")
    return "bg-destructive/15 ring-1 ring-destructive/40 ring-inset"
  if (v === null) return "bg-muted"
  if (v >= 90) return "bg-destructive"
  if (v >= 80) return "bg-warning"
  if (v >= 60) return "bg-brand"
  if (v >= 40) return "bg-brand/70"
  if (v >= 20) return "bg-brand/45"
  return "bg-brand/20"
}

function detailOf(s: ServerModel, metric: Metric) {
  const r = s.latest
  if (s.status !== "online")
    return statusMeta[s.status as keyof typeof statusMeta]?.label ?? s.status
  if (!r) return "Not sampled yet"
  if (metric === "cpu")
    return `CPU ${formatPct(r.cpu_percent)} · load ${r.load1.toFixed(2)} on ${r.cores} ${r.cores === 1 ? "core" : "cores"}`
  if (metric === "memory")
    return `Memory ${formatSize(r.mem_used_bytes)} of ${formatSize(r.mem_total_bytes)}`
  return `Disk ${formatPct(r.disk_max_percent)} on ${r.disk_max_mount || "/"}`
}

export function FleetCard({
  live,
  className,
}: {
  live: HomeLive
  className?: string
}) {
  const [metric, setMetric] = useStoredChoice("morcheh.home.fleet", metrics)
  const [focus, setFocus] = useState<string | null>(null)
  const servers = live.model?.servers ?? []
  const label = metricItems.find((m) => m.value === metric)?.label ?? ""
  const ranked = servers
    .map((s) => ({ s, v: usageOf(s, metric) }))
    .filter((x): x is { s: ServerModel; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v)
  const average = ranked.length
    ? ranked.reduce((a, x) => a + x.v, 0) / ranked.length
    : null
  const hot = ranked.filter((x) => x.v >= 80).length
  const focused = servers.find((s) => s.id === focus)

  return (
    <Card
      title="Server resources"
      caption={
        average !== null
          ? `${label} ${formatPct(average)} on average${hot ? ` · ${hot} above 80%` : ""}`
          : undefined
      }
      className={className}
      action={
        <>
          <Segmented
            label="Measure"
            items={metricItems}
            value={metric}
            onChange={setMetric}
          />
          <CardLink href={insightsHref()}>Insights</CardLink>
        </>
      }
    >
      {live.modelPending && !live.model ? (
        <div className="grid gap-6 p-5 md:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : servers.length === 0 ? (
        <Blank
          icon={<Cpu className="size-5" strokeWidth={1.75} />}
          text="Each server's CPU, memory and disk show here once it's online."
        />
      ) : (
        <div className="grid gap-x-8 gap-y-5 p-5 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-3">
            <ul
              aria-label={`${label} per server`}
              className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1.5"
              onMouseLeave={() => setFocus(null)}
            >
              {servers.map((s) => {
                const v = usageOf(s, metric)
                return (
                  <li key={s.id}>
                    <Link
                      href={`/servers/${s.id}/metrics`}
                      aria-label={`${s.name}: ${detailOf(s, metric)}`}
                      onMouseEnter={() => setFocus(s.id)}
                      onFocus={() => setFocus(s.id)}
                      onBlur={() => setFocus(null)}
                      className={cn(
                        "block aspect-square rounded-md transition-transform outline-none hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50",
                        cellClass(v, s.status),
                      )}
                    />
                  </li>
                )
              })}
            </ul>
            <p className="min-h-10 text-caption text-muted-foreground">
              {focused ? (
                <>
                  <span className="font-medium text-foreground">
                    {focused.name}
                  </span>
                  <br />
                  {detailOf(focused, metric)}
                </>
              ) : (
                <ScaleLegend />
              )}
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-label text-caption tracking-label text-ash uppercase">
              Busiest
            </p>
            {ranked.length === 0 ? (
              <p className="py-3 text-body-sm text-muted-foreground">
                Not sampled yet. Online Linux servers report every minute.
              </p>
            ) : (
              <ul className="flex flex-col">
                {ranked.slice(0, 5).map(({ s, v }) => (
                  <li key={s.id}>
                    <Link
                      href={`/servers/${s.id}/metrics`}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 outline-none hover:bg-subtle focus-visible:bg-muted"
                    >
                      <span className="w-28 min-w-0 shrink-0 truncate text-body-sm">
                        {s.name}
                      </span>
                      <Meter
                        value={v}
                        label={`${s.name} ${label}`}
                        className="min-w-0 flex-1"
                      />
                      <span className="w-12 shrink-0 text-end text-caption text-muted-foreground tabular-nums">
                        {formatPct(v)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function ScaleLegend() {
  const steps = ["bg-brand/20", "bg-brand/45", "bg-brand/70", "bg-brand"]
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="flex items-center gap-1">
        Idle
        {steps.map((c) => (
          <span key={c} className={cn("size-2.5 rounded-[3px]", c)} />
        ))}
        Busy
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-[3px] bg-warning" />
        80%+
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-[3px] bg-destructive" />
        90%+
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-[3px] bg-destructive/15 ring-1 ring-destructive/40 ring-inset" />
        Offline
      </span>
    </span>
  )
}
