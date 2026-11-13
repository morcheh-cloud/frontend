"use client"

import Link from "next/link"
import type { ReactNode } from "react"

import {
  bucketLabel,
  bucketOf,
  buckets,
  MultiLineChart,
  Tip,
} from "@/components/charts/time-chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useStoredChoice } from "@/hooks/useStoredChoice"
import { formatSize } from "@/lib/format"
import type { DockerHistoryPoint } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Segmented } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import { type HistoryRange, useProjectHistory } from "../api"
import { Quiet } from "./parts"
import { pct, rate } from "./project-stats"

const choices = ["live", "24h", "7d", "30d"] as const
type Choice = (typeof choices)[number]
const spans: Record<HistoryRange, number> = {
  "24h": 24 * 3_600_000,
  "7d": 7 * 24 * 3_600_000,
  "30d": 30 * 24 * 3_600_000,
}
const swatch = { brand: "bg-brand", quiet: "bg-muted-foreground" }

// The project's numbers over time: the last minutes from the live stream, or
// the recorded history (a point every 5 minutes, kept `stats_days`).
export function ProjectTrends({
  serverId,
  project,
  live,
  phone,
}: {
  serverId: string
  project: string
  // The live charts (last minutes), shown for "Live".
  live: ReactNode
  phone: boolean
}) {
  const [range, setRange] = useStoredChoice<Choice>(
    "morcheh.docker.project.range",
    choices,
  )
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-body-sm font-medium">Usage</h3>
        <div className="ms-auto">
          <Segmented
            label="Period"
            value={range}
            onChange={(v) => setRange(v as Choice)}
            items={[
              { value: "live", label: "Live" },
              { value: "24h", label: "24 h" },
              { value: "7d", label: "7 days" },
              { value: "30d", label: "30 days" },
            ]}
          />
        </div>
      </div>
      {range === "live" ? (
        live
      ) : (
        <Recorded
          serverId={serverId}
          project={project}
          range={range}
          phone={phone}
        />
      )}
    </section>
  )
}

function Recorded({
  serverId,
  project,
  range,
  phone,
}: {
  serverId: string
  project: string
  range: HistoryRange
  phone: boolean
}) {
  const query = useProjectHistory(serverId, project, range)
  const cardClass = cn(
    "flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-5",
    phone && "-mx-4 rounded-none border-x-0 p-4",
  )
  if (query.isPending)
    return (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Skeleton className="h-60 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    )
  if (query.isError)
    return (
      <div className={cardClass}>
        <Quiet>Couldn't load the history: {query.error.message}</Quiet>
      </div>
    )
  const h = query.data
  if (h.keep_days === 0)
    return (
      <div className={cardClass}>
        <p className="text-body-sm font-medium">History is off</p>
        <Quiet>
          Set Project history › Keep numbers for in{" "}
          <Link href="/containers/settings" className="text-brand underline">
            Container settings
          </Link>{" "}
          to keep a point every 5 minutes for each project.
        </Quiet>
      </div>
    )
  if (h.points.length < 2)
    return (
      <div className={cardClass}>
        <p className="text-body-sm font-medium">Not enough points yet</p>
        <Quiet>
          {h.recording
            ? "Recording: a point every 5 minutes. Come back in a little while."
            : "Points are recorded while the server's containers are being looked at (or its updates checked). Open Live for now."}
        </Quiet>
      </div>
    )

  const now = Date.now()
  const step = h.step * 1000
  const from = Math.floor((now - spans[range]) / step) * step
  const b = buckets(
    new Date(from).toISOString(),
    new Date(now).toISOString(),
    h.step,
  )
  const at: (DockerHistoryPoint | null)[] = b.starts.map(() => null)
  for (const pt of h.points) {
    const i = bucketOf(b, pt.at)
    if (i >= 0) at[i] = pt
  }
  const pick = (f: (p: DockerHistoryPoint) => number) =>
    at.map((p) => (p ? f(p) : null))
  const height = phone ? 150 : 180
  const title = (i: number) => bucketLabel(b, i)
  const card = (name: string, sub: string, chart: ReactNode) => (
    <div className={cardClass}>
      <div className="flex items-baseline gap-2">
        <p className="text-body-sm font-medium">{name}</p>
        <span className="text-caption text-ash">{sub}</span>
      </div>
      {chart}
    </div>
  )
  const none = (i: number) => (
    <Tip title={title(i)} rows={[{ label: "No point", value: "—" }]} />
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {card(
          "CPU",
          "average and peak · % of one core",
          <MultiLineChart
            buckets={b}
            series={[
              { key: "peak", values: pick((p) => p.cpu_max), tone: "peak" },
              { key: "cpu", values: pick((p) => p.cpu), tone: "brand" },
            ]}
            format={pct}
            height={height}
            label={`CPU over ${range}`}
            tooltip={(i) => {
              const p = at[i]
              if (!p) return none(i)
              return (
                <Tip
                  title={title(i)}
                  rows={[
                    {
                      label: "Average",
                      value: pct(p.cpu),
                      swatch: swatch.brand,
                    },
                    { label: "Peak", value: pct(p.cpu_max) },
                  ]}
                />
              )
            }}
          />,
        )}
        {card(
          "Memory",
          "average and peak",
          <MultiLineChart
            buckets={b}
            series={[
              { key: "peak", values: pick((p) => p.memory_max), tone: "peak" },
              { key: "mem", values: pick((p) => p.memory), tone: "brand" },
            ]}
            format={(v) => formatSize(v)}
            height={height}
            label={`Memory over ${range}`}
            tooltip={(i) => {
              const p = at[i]
              if (!p) return none(i)
              return (
                <Tip
                  title={title(i)}
                  rows={[
                    {
                      label: "Average",
                      value: formatSize(p.memory),
                      swatch: swatch.brand,
                    },
                    { label: "Peak", value: formatSize(p.memory_max) },
                  ]}
                />
              )
            }}
          />,
        )}
        {card(
          "Network",
          "in and out, per second",
          <MultiLineChart
            buckets={b}
            series={[
              { key: "tx", values: pick((p) => p.net_tx), tone: "quiet" },
              { key: "rx", values: pick((p) => p.net_rx), tone: "brand" },
            ]}
            format={rate}
            height={height}
            label={`Network over ${range}`}
            tooltip={(i) => {
              const p = at[i]
              if (!p) return none(i)
              return (
                <Tip
                  title={title(i)}
                  rows={[
                    {
                      label: "In",
                      value: rate(p.net_rx),
                      swatch: swatch.brand,
                    },
                    {
                      label: "Out",
                      value: rate(p.net_tx),
                      swatch: swatch.quiet,
                    },
                  ]}
                />
              )
            }}
          />,
        )}
        {card(
          "Containers",
          "running of all",
          <MultiLineChart
            buckets={b}
            series={[
              { key: "total", values: pick((p) => p.total), tone: "quiet" },
              { key: "running", values: pick((p) => p.running), tone: "brand" },
            ]}
            format={(v) => String(Math.round(v))}
            height={height}
            label={`Running containers over ${range}`}
            tooltip={(i) => {
              const p = at[i]
              if (!p) return none(i)
              return (
                <Tip
                  title={title(i)}
                  rows={[
                    {
                      label: "Running",
                      value: `${p.running} of ${p.total}`,
                      swatch: swatch.brand,
                    },
                    ...(p.unhealthy
                      ? [{ label: "Unhealthy", value: String(p.unhealthy) }]
                      : []),
                  ]}
                />
              )
            }}
          />,
        )}
      </div>
      <p className="text-caption text-ash max-md:px-0">
        {h.since && `Kept since ${timeAgo(h.since).toLowerCase()} · `}
        {h.keep_days} days are kept · a gap = no point recorded then
      </p>
    </div>
  )
}
