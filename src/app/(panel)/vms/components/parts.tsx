"use client"

import { TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import {
  type Buckets,
  bucketLabel,
  MultiLineChart,
} from "@/components/charts/time-chart"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsPhone } from "@/hooks/useIsPhone"
import { formatSize } from "@/lib/format"
import type { PVEProblem } from "@/lib/services"
import { cn } from "@/lib/utils"

import { Notices, Segmented } from "../../servers/[id]/components/parts"
import { Meter } from "../../servers/[id]/components/resources"
import type { Timeframe } from "../api"

// A side sheet on desktop, a full bottom sheet on phones.
export function VmLayer({
  open,
  onOpenChange,
  title,
  description,
  footer,
  wide = false,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  footer?: ReactNode
  wide?: boolean
  children: ReactNode
}) {
  const phone = useIsPhone()
  if (phone) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        footer={footer}
        full
      >
        <div className="px-2">
          {description && (
            <p className="-mt-1 mb-4 text-body-sm text-muted-foreground">
              {description}
            </p>
          )}
          {children}
        </div>
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent
        className={cn(
          "w-full gap-0",
          wide
            ? "data-[side=right]:sm:max-w-3xl"
            : "data-[side=right]:sm:max-w-xl",
        )}
      >
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="flex items-center gap-2 border-t border-border px-6 py-4">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// A meter with "used of total" under it; a dash when there is no limit.
export function Usage({
  used,
  total,
  label,
  bytes = true,
  className,
}: {
  used: number
  total: number
  label: string
  bytes?: boolean
  className?: string
}) {
  if (!total) return <span className="text-ash">—</span>
  const pct = Math.min(100, (used / total) * 100)
  return (
    <div className={cn("w-32 min-w-24", className)}>
      <Meter value={pct} label={label} />
      <div className="mt-1 text-caption whitespace-nowrap text-muted-foreground tabular-nums">
        {bytes
          ? `${formatSize(used)} of ${formatSize(total)}`
          : `${Math.round(pct)}%`}
      </div>
    </div>
  )
}

// CPU as a share of what it has (Proxmox gives 0–1 of its own cores).
export function CpuUsage({
  cpu,
  cores,
  className,
}: {
  cpu: number
  cores: number
  className?: string
}) {
  const pct = Math.min(100, cpu * 100)
  return (
    <div className={cn("w-28 min-w-24", className)}>
      <Meter value={pct} label="CPU" />
      <div className="mt-1 text-caption whitespace-nowrap text-muted-foreground tabular-nums">
        {pct < 1 && pct > 0 ? "<1" : Math.round(pct)}% of {cores}{" "}
        {cores === 1 ? "core" : "cores"}
      </div>
    </div>
  )
}

// "Couldn't read Lab cluster: …" for each cluster that didn't answer.
export function ClusterProblems({
  problems,
  className,
}: {
  problems: PVEProblem[]
  className?: string
}) {
  return (
    <Notices
      className={className}
      notes={problems.map((p) => ({
        key: p.cluster_id,
        warn: true,
        title: `Couldn't read ${p.cluster_name}`,
        body: p.message,
      }))}
    />
  )
}

// ---- charts over Proxmox's rrd points

export const timeframes: readonly { value: Timeframe; label: string }[] = [
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
]

export function TimeframePicker({
  value,
  onChange,
}: {
  value: Timeframe
  onChange: (tf: Timeframe) => void
}) {
  return (
    <Segmented
      label="Period"
      items={timeframes}
      value={value}
      onChange={onChange}
    />
  )
}

type Point = Record<string, number>

function bucketsOf(points: Point[]): Buckets {
  const starts = points.map((p) => (p.time ?? 0) * 1000)
  const size = starts.length > 1 ? starts[1] - starts[0] : 60_000
  return { starts, size }
}

const col = (points: Point[], key: string) =>
  points.map((p) => (key in p && Number.isFinite(p[key]) ? p[key] : null))

const pct = (v: number) => `${Math.round(v)}%`
const rate = (v: number) => `${formatSize(v)}/s`

function Card({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border p-4 max-md:rounded-none max-md:border-x-0 md:p-5">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-body-sm font-medium">{title}</h3>
        {aside && (
          <span className="ms-auto text-caption text-muted-foreground tabular-nums">
            {aside}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function Swatch({ tone, label }: { tone: "brand" | "quiet"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-block h-0.5 w-3 rounded-full",
          tone === "brand" ? "bg-brand" : "bg-muted-foreground",
        )}
      />
      {label}
    </span>
  )
}

// CPU, memory, network and disk activity for a machine or a node.
export function RrdCharts({
  points,
  kind,
  loading,
}: {
  points: Point[]
  kind: "guest" | "node"
  loading?: boolean
}) {
  if (loading && points.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {["CPU", "Memory", "Network", "Disk"].map((t) => (
          <div
            key={t}
            className="h-64 animate-pulse rounded-2xl border border-border bg-subtle"
          />
        ))}
      </div>
    )
  }
  if (points.length === 0) {
    return (
      <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
        <TriangleAlert className="size-4" />
        Proxmox has no numbers for this period yet.
      </p>
    )
  }
  const b = bucketsOf(points)
  const cpu = col(points, "cpu").map((v) => (v == null ? null : v * 100))
  const memKey = kind === "node" ? "memused" : "mem"
  const memMax = kind === "node" ? "memtotal" : "maxmem"
  const mem = col(points, memKey)
  const memTotal = Math.max(0, ...col(points, memMax).map((v) => v ?? 0))
  const netin = col(points, "netin")
  const netout = col(points, "netout")
  const last = points[points.length - 1]
  const at = (i: number) => bucketLabel(b, i)

  const charts = [
    <Card
      key="cpu"
      title="CPU"
      aside={last.maxcpu ? `${last.maxcpu} cores` : undefined}
    >
      <MultiLineChart
        buckets={b}
        series={[{ key: "cpu", values: cpu }]}
        max={100}
        format={pct}
        label="CPU use"
        height={160}
        tooltip={(i) => (
          <>
            <div className="text-caption text-ash">{at(i)}</div>
            <div className="font-medium">
              {cpu[i] == null ? "—" : `${cpu[i]?.toFixed(1)}%`}
            </div>
          </>
        )}
      />
    </Card>,
    <Card
      key="mem"
      title="Memory"
      aside={memTotal ? `of ${formatSize(memTotal)}` : undefined}
    >
      <MultiLineChart
        buckets={b}
        series={[{ key: "mem", values: mem }]}
        max={memTotal || undefined}
        format={formatSize}
        label="Memory in use"
        height={160}
        tooltip={(i) => (
          <>
            <div className="text-caption text-ash">{at(i)}</div>
            <div className="font-medium">
              {mem[i] == null ? "—" : formatSize(mem[i] ?? 0)}
            </div>
          </>
        )}
      />
    </Card>,
    <Card
      key="net"
      title="Network"
      aside={
        <span className="flex gap-3">
          <Swatch tone="brand" label="In" />
          <Swatch tone="quiet" label="Out" />
        </span>
      }
    >
      <MultiLineChart
        buckets={b}
        series={[
          { key: "out", values: netout, tone: "quiet" },
          { key: "in", values: netin },
        ]}
        format={rate}
        label="Network traffic"
        height={160}
        tooltip={(i) => (
          <>
            <div className="text-caption text-ash">{at(i)}</div>
            <div className="font-medium">In {rate(netin[i] ?? 0)}</div>
            <div className="font-medium">Out {rate(netout[i] ?? 0)}</div>
          </>
        )}
      />
    </Card>,
  ]

  if (kind === "guest") {
    const read = col(points, "diskread")
    const write = col(points, "diskwrite")
    charts.push(
      <Card
        key="disk"
        title="Disk"
        aside={
          <span className="flex gap-3">
            <Swatch tone="brand" label="Read" />
            <Swatch tone="quiet" label="Write" />
          </span>
        }
      >
        <MultiLineChart
          buckets={b}
          series={[
            { key: "write", values: write, tone: "quiet" },
            { key: "read", values: read },
          ]}
          format={rate}
          label="Disk activity"
          height={160}
          tooltip={(i) => (
            <>
              <div className="text-caption text-ash">{at(i)}</div>
              <div className="font-medium">Read {rate(read[i] ?? 0)}</div>
              <div className="font-medium">Write {rate(write[i] ?? 0)}</div>
            </>
          )}
        />
      </Card>,
    )
  } else {
    const load = col(points, "loadavg")
    const io = col(points, "iowait").map((v) => (v == null ? null : v * 100))
    charts.push(
      <Card
        key="load"
        title="Load"
        aside={
          <span className="flex gap-3">
            <Swatch tone="brand" label="Load average" />
          </span>
        }
      >
        <MultiLineChart
          buckets={b}
          series={[{ key: "load", values: load }]}
          format={(v) => v.toFixed(1)}
          label="Load average"
          height={160}
          tooltip={(i) => (
            <>
              <div className="text-caption text-ash">{at(i)}</div>
              <div className="font-medium">
                Load {(load[i] ?? 0).toFixed(2)}
              </div>
              <div className="text-muted-foreground">
                Waiting on disks {(io[i] ?? 0).toFixed(1)}%
              </div>
            </>
          )}
        />
      </Card>,
    )
  }
  return <div className="grid gap-4 max-md:gap-0 md:grid-cols-2">{charts}</div>
}
