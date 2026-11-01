"use client"

import {
  ArrowDown,
  ArrowUp,
  Clock,
  Cpu,
  HardDrive,
  type LucideIcon,
  MemoryStick,
  Network,
  TriangleAlert,
} from "lucide-react"
import { type PointerEvent, type ReactNode, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { formatDuration, formatSize } from "@/lib/format"
import type { Disk, Stats, StatsProblem } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  CPU_WINDOW_MS,
  type CpuSample,
  unsupported,
  useServerStats,
} from "../api"
import { useServerPage } from "./server-page"

const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: "medium" })
const bootFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})
const count = new Intl.NumberFormat()

function percent(n: number) {
  return `${n < 10 ? n.toFixed(1) : Math.round(n)}%`
}

function share(used: number, total: number) {
  return total > 0 ? (used / total) * 100 : 0
}

// Above these a resource is getting tight; the meter turns warning, then
// destructive, and says so in words.
const tone = (n: number) => (n >= 90 ? "critical" : n >= 80 ? "high" : "ok")

// ---- Desktop ----

// A row of live tiles above the overview cards: uptime, CPU, memory, the root
// disk and network. Live (a sample a second) while the tab is visible.
export function DesktopResources() {
  const { server } = useServerPage()
  const { enabled, stats, cpu, problem, live } = useServerStats(server)
  if (!enabled) return null

  if (!stats && problem) return <StatsError problem={problem} />
  if (!stats) {
    return (
      <Tiles>
        {["Uptime", "CPU", "Memory", "Disk", "Network"].map((label) => (
          <div
            key={label}
            className={cn(
              "h-40 rounded-2xl border border-border bg-card p-6",
              label === "CPU" && "@xl:col-span-2",
            )}
          >
            <p className="text-body-sm text-muted-foreground">{label}</p>
            <Skeleton className="mt-3 h-8 w-20" />
            <Skeleton className="mt-4 h-2 w-full" />
          </div>
        ))}
      </Tiles>
    )
  }

  const mem = stats.memory
  const memUsed = share(mem.used_bytes, mem.total_bytes)
  const root = stats.disks[0]

  return (
    <Tiles
      updated={
        <Freshness live={live && !problem} problem={problem} stats={stats} />
      }
    >
      <Tile
        icon={Clock}
        label="Uptime"
        value={formatDuration(stats.uptime_seconds)}
        caption={
          <>
            <p>Booted {bootFormat.format(new Date(stats.booted_at))}</p>
            <p>{count.format(stats.processes)} tasks</p>
          </>
        }
      />
      <Tile
        icon={Cpu}
        label="CPU"
        wide
        value={percent(stats.cpu.usage_percent)}
        chart={<Sparkline samples={cpu} />}
        caption={<CpuCaption stats={stats} />}
      />
      <Tile
        icon={MemoryStick}
        label="Memory"
        value={percent(memUsed)}
        chart={<Meter value={memUsed} label="Memory used" />}
        caption={
          <>
            <Tight value={memUsed}>
              {formatSize(mem.used_bytes)} of {formatSize(mem.total_bytes)}
            </Tight>
            <p>
              {formatSize(mem.cached_bytes)} cache ·{" "}
              {mem.swap_total_bytes
                ? `swap ${formatSize(mem.swap_used_bytes)} of ${formatSize(mem.swap_total_bytes)}`
                : "no swap"}
            </p>
          </>
        }
      />
      {root ? (
        <Tile
          icon={HardDrive}
          label={`Disk ${root.mount}`}
          value={percent(root.used_percent)}
          chart={
            <Meter value={root.used_percent} label={`${root.mount} used`} />
          }
          caption={<DiskCaption disk={root} short />}
        />
      ) : (
        <Tile
          icon={HardDrive}
          label="Disk"
          value="—"
          caption="No disks found"
        />
      )}
      <Tile
        icon={Network}
        label="Network"
        value={
          <span className="flex flex-col gap-1 text-subheading font-normal">
            <Rate dir="down" bytes={stats.network.rx_bytes_per_sec} />
            <Rate dir="up" bytes={stats.network.tx_bytes_per_sec} />
          </span>
        }
        caption={
          <p>
            Since boot: {formatSize(stats.network.rx_bytes_total)} in,{" "}
            {formatSize(stats.network.tx_bytes_total)} out
          </p>
        }
      />
    </Tiles>
  )
}

function Tiles({
  updated,
  children,
}: {
  updated?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mb-4" aria-label="Resources">
      <div className="mb-3 flex h-6 items-center justify-between gap-2">
        <h2 className="font-label text-caption tracking-label text-ash uppercase">
          Resources
        </h2>
        {updated && (
          <p className="text-caption text-ash tabular-nums">{updated}</p>
        )}
      </div>
      <div className="grid grid-flow-row-dense gap-4 @xl:grid-cols-2 @2xl:grid-cols-3 @7xl:grid-cols-6">
        {children}
      </div>
    </section>
  )
}

function Tile({
  icon: Icon,
  label,
  value,
  chart,
  caption,
  wide,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  chart?: ReactNode
  caption: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-border bg-card p-6",
        wide && "@xl:col-span-2",
      )}
    >
      <p className="flex items-center gap-2 truncate text-body-sm text-muted-foreground">
        <Icon className="size-4 shrink-0 text-ash" />
        <span className="truncate">{label}</span>
      </p>
      <div className="mt-2 text-heading font-light tabular-nums">{value}</div>
      {chart && <div className="mt-3">{chart}</div>}
      <div className="mt-auto space-y-0.5 pt-3 text-caption text-muted-foreground tabular-nums">
        {caption}
      </div>
    </div>
  )
}

// Every mount, for servers with more than the root disk.
export function DiskList({ disks }: { disks: Disk[] }) {
  return (
    <ul className="space-y-4">
      {disks.map((disk) => (
        <li key={disk.mount} className="text-body-sm">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate font-mono text-caption">
              {disk.mount}
            </span>
            <span className="shrink-0 tabular-nums">
              {percent(disk.used_percent)}
            </span>
          </div>
          <Meter value={disk.used_percent} label={`${disk.mount} used`} />
          <div className="mt-1.5 text-caption text-muted-foreground tabular-nums">
            <DiskCaption disk={disk} />
          </div>
        </li>
      ))}
    </ul>
  )
}

// ---- Phone ----

// The same numbers as list rows, for the phone overview's grouped list.
export function MobileResources() {
  const { server } = useServerPage()
  const { enabled, stats, problem, live } = useServerStats(server)
  if (!enabled) return null

  if (!stats && problem) {
    return (
      <li className="px-4 py-3">
        <StatsError problem={problem} bare />
      </li>
    )
  }
  if (!stats) {
    return ["Uptime", "CPU", "Memory", "Disk"].map((label) => (
      <li
        key={label}
        className="flex min-h-11 items-center justify-between gap-4 px-4 py-2.5 text-body"
      >
        <span className="text-muted-foreground">{label}</span>
        <Skeleton className="h-4 w-16" />
      </li>
    ))
  }

  const mem = stats.memory
  const memUsed = share(mem.used_bytes, mem.total_bytes)
  return (
    <>
      {(!live || problem) && (
        <li className="px-4 py-2 text-caption text-ash tabular-nums">
          <Freshness live={false} problem={problem} stats={stats} />
        </li>
      )}
      <Row label="Uptime" value={formatDuration(stats.uptime_seconds)} />
      <Row
        label="CPU"
        value={percent(stats.cpu.usage_percent)}
        meter={stats.cpu.usage_percent}
        meterLabel="CPU busy"
        caption={<CpuCaption stats={stats} />}
      />
      <Row
        label="Memory"
        value={percent(memUsed)}
        meter={memUsed}
        meterLabel="Memory used"
        caption={
          <Tight value={memUsed}>
            {formatSize(mem.used_bytes)} of {formatSize(mem.total_bytes)}
          </Tight>
        }
      />
      {stats.disks.map((disk) => (
        <Row
          key={disk.mount}
          label={
            stats.disks.length > 1 ? (
              <span className="font-mono text-body-sm">{disk.mount}</span>
            ) : (
              "Disk"
            )
          }
          value={percent(disk.used_percent)}
          meter={disk.used_percent}
          meterLabel={`${disk.mount} used`}
          caption={<DiskCaption disk={disk} />}
        />
      ))}
      <Row
        label="Network"
        value={
          <span className="flex items-center gap-3">
            <Rate dir="down" bytes={stats.network.rx_bytes_per_sec} />
            <Rate dir="up" bytes={stats.network.tx_bytes_per_sec} />
          </span>
        }
      />
    </>
  )
}

function Row({
  label,
  value,
  meter,
  meterLabel,
  caption,
}: {
  label: ReactNode
  value: ReactNode
  meter?: number
  meterLabel?: string
  caption?: ReactNode
}) {
  return (
    <li className="px-4 py-2.5 text-body">
      <div className="flex min-h-6 items-center justify-between gap-4">
        <span className="min-w-0 truncate text-muted-foreground">{label}</span>
        <span className="shrink-0 tabular-nums">{value}</span>
      </div>
      {meter != null && (
        <Meter value={meter} label={meterLabel ?? "Used"} className="mt-2" />
      )}
      {caption && (
        <div className="mt-1.5 text-caption text-muted-foreground tabular-nums">
          {caption}
        </div>
      )}
    </li>
  )
}

// ---- Pieces ----

function CpuCaption({ stats }: { stats: Stats }) {
  const { cpu } = stats
  return (
    <>
      <p title="Load average over 1, 5 and 15 minutes">
        Load {cpu.load1.toFixed(2)} · {cpu.load5.toFixed(2)} ·{" "}
        {cpu.load15.toFixed(2)}
      </p>
      <p>
        {cpu.cores} {cpu.cores === 1 ? "core" : "cores"}
        {cpu.iowait_percent >= 1 &&
          ` · ${percent(cpu.iowait_percent)} I/O wait`}
        {cpu.steal_percent >= 1 && ` · ${percent(cpu.steal_percent)} steal`}
      </p>
    </>
  )
}

function DiskCaption({ disk, short }: { disk: Disk; short?: boolean }) {
  return (
    <Tight value={disk.used_percent} full>
      {formatSize(disk.used_bytes)} of {formatSize(disk.total_bytes)}
      {disk.type && !short && ` · ${disk.type}`}
    </Tight>
  )
}

// A caption line that names a tight resource in words too, so the meter's
// color is never the only signal.
function Tight({
  value,
  full,
  children,
}: {
  value: number
  full?: boolean
  children: ReactNode
}) {
  const level = tone(value)
  return (
    <p className="flex items-center gap-1">
      {level !== "ok" && (
        <>
          <TriangleAlert
            className={cn(
              "size-3.5 shrink-0",
              level === "critical" ? "text-destructive" : "text-warning",
            )}
          />
          <span className="font-medium text-foreground">
            {level === "critical"
              ? full
                ? "Almost full"
                : "Very high"
              : "High"}
          </span>
          ·
        </>
      )}
      <span className="min-w-0 truncate">{children}</span>
    </p>
  )
}

function Rate({ dir, bytes }: { dir: "up" | "down"; bytes: number }) {
  const Icon = dir === "down" ? ArrowDown : ArrowUp
  return (
    <span
      className="inline-flex items-center gap-1"
      title={dir === "down" ? "Received" : "Sent"}
    >
      <Icon className="size-4 shrink-0 text-ash" />
      {formatSize(bytes)}/s
    </span>
  )
}

export function Meter({
  value,
  label,
  className,
}: {
  value: number
  label: string
  className?: string
}) {
  const level = tone(value)
  return (
    // biome-ignore lint/a11y/useSemanticElements: a native <meter> can't be styled the same in every browser
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={cn(
        "h-2 overflow-hidden rounded-full",
        level === "critical"
          ? "bg-destructive/15"
          : level === "high"
            ? "bg-warning/15"
            : "bg-brand-soft",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          level === "critical"
            ? "bg-destructive"
            : level === "high"
              ? "bg-warning"
              : "bg-brand",
        )}
        style={{ width: `${Math.min(100, Math.max(value, 0))}%` }}
      />
    </div>
  )
}

// CPU over the last few minutes on a fixed 0–100% scale, newest at the end.
// Hovering reads out a sample.
function Sparkline({ samples }: { samples: CpuSample[] }) {
  const [hover, setHover] = useState<CpuSample | null>(null)
  const end = samples.at(-1)?.at ?? 0
  const start = end - CPU_WINDOW_MS
  const x = (s: CpuSample) => ((s.at - start) / CPU_WINDOW_MS) * 100
  const y = (s: CpuSample) => 100 - Math.min(100, s.percent)

  if (samples.length < 2) {
    return (
      <div className="flex h-10 items-end">
        <div className="h-0.5 w-full rounded-full bg-brand-soft" />
      </div>
    )
  }

  const line = samples.map((s) => `${x(s)},${y(s)}`).join(" ")
  const first = samples[0]
  const area = `${x(first)},100 ${line} 100,100`

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect()
    const at = start + ((e.clientX - box.left) / box.width) * CPU_WINDOW_MS
    let best = samples[0]
    for (const s of samples) {
      if (Math.abs(s.at - at) < Math.abs(best.at - at)) best = s
    }
    setHover(best)
  }

  return (
    <div
      className="relative h-10"
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
      role="img"
      aria-label={`CPU over the last ${CPU_WINDOW_MS / 60000} minutes, now ${percent(samples.at(-1)?.percent ?? 0)}`}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden
      >
        {/* The window's baseline, so a short history reads as "so far". */}
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
          points={line}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="stroke-brand"
        />
      </svg>
      {hover && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-mist"
            style={{ left: `${x(hover)}%` }}
          />
          <div
            className="pointer-events-none absolute size-2 -translate-1/2 rounded-full bg-brand ring-2 ring-card"
            style={{ left: `${x(hover)}%`, top: `${y(hover)}%` }}
          />
          <div
            className="pointer-events-none absolute bottom-full mb-1 -translate-x-1/2 rounded-lg border border-border bg-card px-2 py-1 text-caption whitespace-nowrap shadow-md"
            style={{ left: `${Math.min(85, Math.max(15, x(hover)))}%` }}
          >
            <span className="font-medium">{percent(hover.percent)}</span>{" "}
            <span className="text-muted-foreground">
              {timeFormat.format(hover.at)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// "Live · 12:04:31", or how old the numbers are while the stream is down.
function Freshness({
  live,
  problem,
  stats,
}: {
  live: boolean
  problem?: StatsProblem
  stats: Stats
}) {
  const at = timeFormat.format(new Date(stats.collected_at))
  if (live) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-brand motion-safe:animate-pulse" />
        Live · {at}
      </span>
    )
  }
  return <span title={problem?.detail}>Reconnecting… · last {at}</span>
}

function StatsError({
  problem,
  bare,
}: {
  problem: StatsProblem
  bare?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-body-sm",
        !bare && "mb-4 rounded-2xl border border-border bg-card px-5 py-3",
      )}
    >
      <TriangleAlert className="size-4 shrink-0 text-ash" />
      <p className="min-w-0 flex-1 text-muted-foreground">
        {unsupported(problem)
          ? "Live resource usage is only available for Linux servers."
          : `Couldn't read resource usage: ${problem.detail}`}
      </p>
      {problem.retrying && (
        <span className="shrink-0 text-caption text-ash">Retrying…</span>
      )}
    </div>
  )
}
