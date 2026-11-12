"use client"

import { Activity } from "lucide-react"
import type { ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type {
  DockerContainerDetails,
  DockerStats,
  Server,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty } from "../../servers/[id]/components/parts"
import { Meter } from "../../servers/[id]/components/resources"
import { STATS_HISTORY, useContainerStats } from "../api"

function pct(n: number) {
  return `${n < 10 ? n.toFixed(1) : Math.round(n)}%`
}

function rate(n: number) {
  return `${formatSize(Math.max(0, n))}/s`
}

// A small line of the last minute and a half; `max` fixes the top (percent).
function Spark({
  values,
  max,
  className,
}: {
  values: number[]
  max?: number
  className?: string
}) {
  const w = 120
  const h = 32
  if (values.length < 2)
    return <div className={cn("h-8 w-full", className)} aria-hidden />
  const top = max ?? Math.max(...values, 1)
  const step = w / (STATS_HISTORY - 1)
  const start = w - (values.length - 1) * step
  const pts = values.map(
    (v, i) =>
      `${(start + i * step).toFixed(1)},${(h - (Math.min(v, top) / top) * (h - 2) - 1).toFixed(1)}`,
  )
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("h-8 w-full text-brand", className)}
      aria-hidden
    >
      <polygon
        points={`${start.toFixed(1)},${h} ${pts.join(" ")} ${w},${h}`}
        className="fill-brand/10"
      />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Tile({
  label,
  value,
  sub,
  children,
  phone,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  children?: ReactNode
  phone: boolean
}) {
  if (phone)
    return (
      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-body-sm text-muted-foreground">{label}</span>
          <span className="ms-auto text-body font-medium tabular-nums">
            {value}
          </span>
        </div>
        {sub && (
          <p className="text-caption text-muted-foreground tabular-nums">
            {sub}
          </p>
        )}
        {children}
      </div>
    )
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5">
      <span className="text-body-sm text-muted-foreground">{label}</span>
      <span className="text-subheading font-medium tabular-nums">{value}</span>
      {sub && (
        <p className="text-caption text-muted-foreground tabular-nums">{sub}</p>
      )}
      {children}
    </div>
  )
}

// Live CPU, memory, network and disk use of one running container.
export function ContainerStats({
  server,
  c,
  phone,
}: {
  server: Server
  c: DockerContainerDetails
  phone: boolean
}) {
  const running = c.state === "running"
  const s = useContainerStats(server.id, c.id, running)

  if (!running)
    return (
      <Empty
        icon={Activity}
        title="It isn't running"
        body="Live numbers show while the container runs."
        className="mt-6"
      />
    )
  if (s.end && !s.now)
    return (
      <Empty
        icon={Activity}
        title="Couldn't read its numbers"
        body={s.end.detail ?? s.end.reason}
        className="mt-6"
      />
    )
  if (!s.now)
    return (
      <div
        className={cn(
          "grid gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3",
          phone && "px-4 pt-4",
        )}
      >
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    )

  const n: DockerStats = s.now
  const h = s.history
  const cores = n.cpus || 1
  // Docker counts 100% per core: show the share of what it may use.
  const cpuShare = n.cpu / cores
  const memShare = n.memory_limit ? (n.memory_used / n.memory_limit) * 100 : 0
  const limited = c.memory_limit > 0

  const tiles = (
    <>
      <Tile
        phone={phone}
        label="CPU"
        value={pct(n.cpu)}
        sub={
          c.cpus
            ? `Limited to ${c.cpus} CPU${c.cpus === 1 ? "" : "s"}`
            : `Of one core · the server has ${cores}`
        }
      >
        <Meter value={Math.min(100, cpuShare)} label="CPU use" />
        <Spark values={h.map((x) => x.cpu)} />
      </Tile>
      <Tile
        phone={phone}
        label="Memory"
        value={formatSize(n.memory_used)}
        sub={
          limited
            ? `${pct(memShare)} of its ${formatSize(n.memory_limit)} limit`
            : `No limit · ${pct(memShare)} of the server's ${formatSize(n.memory_limit)}`
        }
      >
        <Meter value={Math.min(100, memShare)} label="Memory use" />
        <Spark values={h.map((x) => x.memory_used)} />
      </Tile>
      <Tile
        phone={phone}
        label="Network"
        value={
          <span className="flex gap-3 text-body-sm @lg:text-body">
            <span title="Received">↓ {rate(n.net_rx_rate)}</span>
            <span title="Sent">↑ {rate(n.net_tx_rate)}</span>
          </span>
        }
        sub={`${formatSize(n.net_rx)} in · ${formatSize(n.net_tx)} out since it started`}
      >
        <Spark values={h.map((x) => x.net_rx_rate + x.net_tx_rate)} />
      </Tile>
      <Tile
        phone={phone}
        label="Disk"
        value={
          <span className="flex gap-3 text-body-sm @lg:text-body">
            <span title="Read">R {rate(n.read_rate)}</span>
            <span title="Written">W {rate(n.write_rate)}</span>
          </span>
        }
        sub={`${formatSize(n.block_read)} read · ${formatSize(n.block_write)} written`}
      >
        <Spark values={h.map((x) => x.read_rate + x.write_rate)} />
      </Tile>
      <Tile
        phone={phone}
        label="Processes"
        value={n.pids}
        sub={c.pids_limit > 0 ? `Up to ${c.pids_limit}` : undefined}
      >
        <Spark values={h.map((x) => x.pids)} />
      </Tile>
    </>
  )

  const caption = (
    <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
      {s.live ? (
        <span className="size-1.5 animate-pulse rounded-full bg-success" />
      ) : null}
      {s.live
        ? `Live · ${new Date(n.time).toLocaleTimeString(undefined, { hour12: false })}`
        : s.end
          ? (s.end.detail ?? "Stopped")
          : "Reconnecting…"}
      <span className="text-ash">· the last 90 seconds</span>
    </p>
  )

  if (phone)
    return (
      <div className="flex flex-col pt-3">
        <div className="px-4 pb-2">{caption}</div>
        <div className="divide-y divide-border border-y border-border">
          {tiles}
        </div>
      </div>
    )
  return (
    <div className="flex flex-col gap-3">
      {caption}
      <div className="grid gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3">
        {tiles}
      </div>
    </div>
  )
}
