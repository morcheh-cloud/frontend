"use client"

import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  HeartPulse,
  Info,
  Maximize2,
  Waypoints,
  X,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, useState } from "react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import {
  type Buckets,
  bucketLabel,
  bucketOf,
  buckets,
  MultiLineChart,
  type Series,
  Tip,
} from "@/components/charts/time-chart"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type { DockerReport, DockerReportContainer } from "@/lib/services"
import { cn } from "@/lib/utils"
import { containerHref, Dot, envHref, stateMeta } from "./meta"
import { StackBar } from "./parts"
import {
  CPU_FLOOR,
  containerTone,
  pct,
  portLabel,
  rate,
  Spark,
  shareTone,
  upFor,
} from "./project-stats"
import { buildTopology, Topology } from "./topology"

// The Dashboard's report on one environment: totals, usage over time, who
// uses the most, the network map and every container's state and uptime.
// Everything comes from one request (`useDockerReport`).

const running = (c: DockerReportContainer) =>
  c.state === "running" || c.state === "restarting"

// Server share of the containers' CPU (the report adds up percent of one
// core).
const serverShare = (r: DockerReport, cpu: number) =>
  r.cpus > 0 ? cpu / r.cpus : cpu

function problemRank(c: DockerReportContainer) {
  const tone = containerTone(c)
  return tone === "destructive"
    ? 0
    : tone === "warning"
      ? 1
      : running(c)
        ? 2
        : 3
}

export function byAttention(
  a: DockerReportContainer,
  b: DockerReportContainer,
) {
  return (
    problemRank(a) - problemRank(b) ||
    b.cpu - a.cpu ||
    a.name.localeCompare(b.name)
  )
}

// "Up 3 days" / "Exited 2 hours ago".
export function uptimeText(c: DockerReportContainer) {
  if (running(c)) {
    const up = upFor(c.started_at)
    return up ? `Up ${up}` : "Up"
  }
  const label = stateMeta[c.state]?.label ?? c.state
  const ago = upFor(c.finished_at)
  return ago ? `${label} ${ago} ago` : label
}

// --- KPI tiles ---------------------------------------------------------------

function Tile({
  eyebrow,
  value,
  unit,
  children,
  tone,
}: {
  eyebrow: string
  value: ReactNode
  unit?: ReactNode
  children?: ReactNode
  tone?: "warning" | "destructive"
}) {
  return (
    <section
      aria-label={eyebrow}
      className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm"
    >
      <h2 className="font-label text-caption tracking-label text-ash uppercase">
        {eyebrow}
      </h2>
      <p className="flex min-w-0 items-baseline gap-1.5">
        <span
          className={cn(
            "text-heading leading-none font-light tabular-nums",
            tone === "warning" && "text-warning",
            tone === "destructive" && "text-destructive",
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="truncate text-body-sm text-muted-foreground">
            {unit}
          </span>
        )}
      </p>
      <div className="mt-auto min-h-8">{children}</div>
    </section>
  )
}

function Meter({ value }: { value: number }) {
  const tone = shareTone(value)
  return (
    <div className="flex h-8 flex-col justify-end gap-1.5">
      <span className="h-2 overflow-hidden rounded-full bg-muted">
        <span
          className={cn(
            "block h-full rounded-full",
            tone === "brand" && "bg-brand",
            tone === "warning" && "bg-warning",
            tone === "destructive" && "bg-destructive",
          )}
          style={{ width: `${Math.min(100, Math.max(1, value))}%` }}
        />
      </span>
    </div>
  )
}

export function reportCounts(r: DockerReport) {
  const list = r.containers
  const up = list.filter(running).length
  const checks = list.filter((c) => c.health !== "none")
  return {
    total: list.length,
    up,
    unhealthy: list.filter((c) => c.health === "unhealthy").length,
    healthy: checks.filter((c) => c.health === "healthy").length,
    checks: checks.length,
    failed: list.filter((c) => containerTone(c) === "destructive").length,
    restarts: list.reduce((n, c) => n + c.restarts, 0),
    restarted: list.filter((c) => c.restarts > 0).length,
  }
}

export function KpiTiles({ report: r }: { report: DockerReport }) {
  const n = reportCounts(r)
  const cpu = serverShare(r, r.cpu)
  const mem = r.host_memory > 0 ? (r.memory_used / r.host_memory) * 100 : 0
  const cpuHistory = r.history.map((p) => serverShare(r, p.cpu))
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
      <Tile eyebrow="Containers" value={n.up} unit={`of ${n.total} running`}>
        <div className="flex h-8 flex-col justify-end gap-1.5">
          <StackBar
            label="Containers"
            parts={[
              {
                value: n.up - n.failed,
                className: "bg-success",
                label: "running",
              },
              {
                value: n.failed,
                className: "bg-destructive",
                label: "failing",
              },
              {
                value: Math.max(0, n.total - n.up - n.failed),
                className: "bg-mist",
                label: "stopped",
              },
            ]}
          />
        </div>
      </Tile>
      <Tile
        eyebrow="Health"
        value={n.checks ? `${n.healthy}/${n.checks}` : "—"}
        unit={n.checks ? "healthy" : "no health checks"}
        tone={n.unhealthy ? "destructive" : undefined}
      >
        <p className="flex h-8 items-end gap-1.5 text-caption text-muted-foreground">
          <HeartPulse
            className={cn(
              "size-3.5 shrink-0",
              n.unhealthy ? "text-destructive" : "text-ash",
            )}
          />
          {n.unhealthy
            ? `${n.unhealthy} unhealthy`
            : n.failed
              ? `${n.failed} failing`
              : "Nothing failing"}
        </p>
      </Tile>
      <Tile
        eyebrow="CPU"
        value={r.first_sample && r.cpu === 0 ? "—" : pct(cpu)}
        unit={`of ${r.cpus} core${r.cpus === 1 ? "" : "s"}`}
        tone={cpu >= 90 ? "destructive" : cpu >= 80 ? "warning" : undefined}
      >
        <Spark
          values={cpuHistory}
          max={CPU_FLOOR}
          slots={40}
          tone={shareTone(cpu)}
        />
      </Tile>
      <Tile
        eyebrow="Memory"
        value={formatSize(r.memory_used)}
        unit={r.host_memory ? `of ${formatSize(r.host_memory)}` : undefined}
        tone={mem >= 90 ? "destructive" : mem >= 80 ? "warning" : undefined}
      >
        <Meter value={mem} />
      </Tile>
      <Tile eyebrow="Network" value={rate(r.net_rx_rate + r.net_tx_rate)}>
        <p className="flex h-8 items-end gap-3 text-caption text-muted-foreground tabular-nums">
          <span className="flex items-center gap-1">
            <ArrowDown className="size-3.5 text-brand" />
            {rate(r.net_rx_rate)}
          </span>
          <span className="flex items-center gap-1">
            <ArrowUp className="size-3.5 text-ash" />
            {rate(r.net_tx_rate)}
          </span>
        </p>
      </Tile>
      <Tile
        eyebrow="Restarts"
        value={n.restarts}
        unit={
          n.restarted
            ? `in ${n.restarted} container${n.restarted === 1 ? "" : "s"}`
            : undefined
        }
        tone={n.restarts > 0 ? "warning" : undefined}
      >
        <p className="flex h-8 items-end text-caption text-muted-foreground">
          {n.restarts
            ? "Since each one was created"
            : "None restarted by Docker"}
        </p>
      </Tile>
    </div>
  )
}

// --- Usage over time ---------------------------------------------------------

type Metric = "cpu" | "memory" | "network"
type Range = "live" | "day"

const metrics = [
  { value: "cpu", label: "CPU" },
  { value: "memory", label: "Memory" },
  { value: "network", label: "Network" },
] as const
const ranges = [
  { value: "live", label: "Live" },
  { value: "day", label: "24 hours" },
] as const

const LIVE_STEP = 10

function liveChart(r: DockerReport) {
  const at = Date.parse(r.at)
  const from = new Date(at - 120 * LIVE_STEP * 1000).toISOString()
  const b = buckets(
    from,
    new Date(at + LIVE_STEP * 1000).toISOString(),
    LIVE_STEP,
  )
  const empty = () => b.starts.map((): number | null => null)
  const cpu = empty()
  const memory = empty()
  const rx = empty()
  const tx = empty()
  for (const p of r.history) {
    const i = bucketOf(b, p.at)
    if (i < 0) continue
    cpu[i] = serverShare(r, p.cpu)
    memory[i] = p.memory
    rx[i] = p.net_rx
    tx[i] = p.net_tx
  }
  return { b, cpu, memory, rx, tx, cpuMax: null, memoryMax: null }
}

function dayChart(r: DockerReport) {
  const step = r.day_step || 900
  const at = Date.parse(r.at)
  const end = Math.ceil(at / (step * 1000)) * step * 1000
  const b = buckets(
    new Date(end - 24 * 3600 * 1000).toISOString(),
    new Date(end).toISOString(),
    step,
  )
  const empty = () => b.starts.map((): number | null => null)
  const cpu = empty()
  const cpuMax = empty()
  const memory = empty()
  const memoryMax = empty()
  const rx = empty()
  const tx = empty()
  for (const p of r.day) {
    const i = bucketOf(b, p.at)
    if (i < 0) continue
    cpu[i] = serverShare(r, p.cpu)
    cpuMax[i] = serverShare(r, p.cpu_max)
    memory[i] = p.memory
    memoryMax[i] = p.memory_max
    rx[i] = p.net_rx
    tx[i] = p.net_tx
  }
  return { b, cpu, memory, rx, tx, cpuMax, memoryMax }
}

const show = (v: number | null | undefined, f: (n: number) => string) =>
  v == null ? "—" : f(v)

export function UsageCard({
  report: r,
  phone,
}: {
  report: DockerReport
  phone?: boolean
}) {
  const [metric, setMetric] = useState<Metric>("cpu")
  const [range, setRange] = useState<Range>("live")
  const d = range === "live" ? liveChart(r) : dayChart(r)
  const filled = (range === "live" ? r.history : r.day).length
  let series: Series[]
  let format: (v: number) => string
  let max: number | undefined
  let tip: (i: number) => ReactNode
  const title = (b: Buckets, i: number) => bucketLabel(b, i)
  if (metric === "cpu") {
    series = [
      ...(d.cpuMax
        ? [{ key: "peak", values: d.cpuMax, tone: "peak" as const }]
        : []),
      { key: "cpu", values: d.cpu },
    ]
    format = (v) => `${Math.round(v)}%`
    max = 10
    tip = (i) => (
      <Tip
        title={title(d.b, i)}
        rows={[
          {
            label: d.cpuMax ? "Average" : "CPU",
            value: show(d.cpu[i], pct),
            swatch: "bg-brand",
          },
          ...(d.cpuMax
            ? [
                {
                  label: "Highest",
                  value: show(d.cpuMax[i], pct),
                  swatch: "bg-brand/35",
                },
              ]
            : []),
        ]}
      />
    )
  } else if (metric === "memory") {
    series = [
      ...(d.memoryMax
        ? [{ key: "peak", values: d.memoryMax, tone: "peak" as const }]
        : []),
      { key: "memory", values: d.memory },
    ]
    format = (v) => formatSize(v)
    max = undefined
    tip = (i) => (
      <Tip
        title={title(d.b, i)}
        rows={[
          {
            label: d.memoryMax ? "Average" : "Memory",
            value: show(d.memory[i], formatSize),
            swatch: "bg-brand",
          },
          ...(d.memoryMax
            ? [
                {
                  label: "Highest",
                  value: show(d.memoryMax[i], formatSize),
                  swatch: "bg-brand/35",
                },
              ]
            : []),
        ]}
      />
    )
  } else {
    series = [
      { key: "tx", values: d.tx, tone: "quiet" },
      { key: "rx", values: d.rx },
    ]
    format = (v) => rate(v)
    max = undefined
    tip = (i) => (
      <Tip
        title={title(d.b, i)}
        rows={[
          { label: "Received", value: show(d.rx[i], rate), swatch: "bg-brand" },
          {
            label: "Sent",
            value: show(d.tx[i], rate),
            swatch: "bg-muted-foreground",
          },
        ]}
      />
    )
  }
  const label = `${metrics.find((m) => m.value === metric)?.label} of every container, ${range === "live" ? "the last 20 minutes" : "the last 24 hours"}`
  return (
    <section
      aria-label="Usage"
      className={cn(
        "flex min-w-0 flex-col [contain:inline-size]",
        !phone && "rounded-2xl border border-border bg-card shadow-sm",
      )}
    >
      <header
        className={cn(
          "flex flex-wrap items-center gap-2",
          phone ? "px-4 pb-3" : "px-5 pt-4 pb-3",
        )}
      >
        {!phone && <h2 className="me-auto text-body-sm font-medium">Usage</h2>}
        <Segmented
          label="Measure"
          items={metrics}
          value={metric}
          onChange={setMetric}
        />
        <Segmented
          label="Period"
          items={ranges}
          value={range}
          onChange={setRange}
        />
      </header>
      <div className={cn(phone ? "px-2" : "px-3")}>
        {filled < 2 ? (
          <p className="flex h-52 items-center justify-center px-6 text-center text-body-sm text-muted-foreground">
            {range === "live"
              ? "Collecting: a point is added every few seconds while this page is open."
              : "No history yet: points are recorded every few minutes for compose projects."}
          </p>
        ) : (
          <MultiLineChart
            buckets={d.b}
            series={series}
            format={format}
            max={max}
            tooltip={tip}
            label={label}
            height={phone ? 180 : 220}
          />
        )}
      </div>
      <p
        className={cn(
          "flex items-center gap-1.5 text-caption text-ash",
          phone ? "px-4 pt-2" : "px-5 pt-1 pb-4",
        )}
      >
        <Info className="size-3.5 shrink-0" />
        {range === "live"
          ? `Every running container added up${metric === "cpu" ? ", as a share of the whole server" : ""}. Kept while someone looks at this server.`
          : "Compose projects only, 15-minute averages with the highest sample as the faint line."}
        {r.unmeasured > 0 &&
          ` ${r.unmeasured} container${r.unmeasured === 1 ? "" : "s"} not measured in the last pass.`}
      </p>
    </section>
  )
}

// --- Top consumers -----------------------------------------------------------

export function TopConsumers({
  report: r,
  server,
}: {
  report: DockerReport
  server: string
}) {
  const [by, setBy] = useState<"cpu" | "memory">("cpu")
  const list = r.containers
    .filter((c) => running(c) && c.measured)
    .sort((a, b) =>
      by === "cpu" ? b.cpu - a.cpu : b.memory_used - a.memory_used,
    )
    .slice(0, 6)
  return (
    <section
      aria-label="Busiest containers"
      className="flex min-w-0 flex-col rounded-2xl border border-border bg-card shadow-sm"
    >
      <header className="flex items-center gap-2 px-5 pt-4 pb-3">
        <h2 className="me-auto text-body-sm font-medium">Busiest</h2>
        <Segmented
          label="Sort by"
          items={[
            { value: "cpu", label: "CPU" },
            { value: "memory", label: "Memory" },
          ]}
          value={by}
          onChange={setBy}
        />
      </header>
      {list.length === 0 ? (
        <p className="px-5 pb-4 text-body-sm text-muted-foreground">
          Nothing measured yet.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {list.map((c) => {
            const share = serverShare(r, c.cpu)
            const memShare = c.memory_limit
              ? (c.memory_used / c.memory_limit) * 100
              : r.host_memory
                ? (c.memory_used / r.host_memory) * 100
                : 0
            return (
              <li key={c.id}>
                <Link
                  href={containerHref(server, c.name)}
                  className="grid grid-cols-[minmax(0,1fr)_5rem_4.5rem] items-center gap-3 px-5 py-2 outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-body-sm font-medium">
                      {c.name}
                    </span>
                    <span className="truncate text-caption text-ash">
                      {uptimeText(c)}
                    </span>
                  </span>
                  {by === "cpu" ? (
                    <Spark
                      values={c.cpu_history.map((v) => serverShare(r, v))}
                      max={CPU_FLOOR}
                      slots={30}
                      tone={shareTone(share)}
                      className="h-7"
                    />
                  ) : (
                    <Meter value={memShare} />
                  )}
                  <span className="text-end text-body-sm tabular-nums">
                    {by === "cpu" ? pct(share) : formatSize(c.memory_used)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-auto border-t border-border px-5 py-2.5 text-caption text-ash">
        CPU as a share of the whole server ({r.cpus} core
        {r.cpus === 1 ? "" : "s"})
      </p>
    </section>
  )
}

// --- Network map -------------------------------------------------------------

function MapNotice({ report: r }: { report: DockerReport }) {
  if (r.links_state === "read" && r.link_bytes) return null
  const text =
    r.links_state === "unavailable"
      ? r.links_note || "Connections between containers couldn't be read."
      : r.links_state === "partial"
        ? r.links_note || "Some containers' connections couldn't be read."
        : "Lines show open connections; their bytes need a login that can use sudo (nsenter and ss)."
  return (
    <p className="flex items-start gap-1.5 text-caption text-ash">
      <Info className="mt-px size-3.5 shrink-0" />
      {text}
    </p>
  )
}

function MapCounts({ report }: { report: DockerReport }) {
  const all = buildTopology(report, { stopped: true, phone: false }).counts
  return (
    <span className="text-caption text-muted-foreground tabular-nums">
      {all.networks} network{all.networks === 1 ? "" : "s"} · {all.links} link
      {all.links === 1 ? "" : "s"} · {all.connections} connection
      {all.connections === 1 ? "" : "s"}
    </span>
  )
}

export function TopologyCard({
  report,
  server,
}: {
  report: DockerReport
  server: string
}) {
  const [stopped, setStopped] = useState<"running" | "all">("running")
  return (
    <section
      aria-label="Network map"
      className="flex min-w-0 flex-col rounded-2xl border border-border bg-card shadow-sm [contain:inline-size]"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-4 pb-3">
        <h2 className="text-body-sm font-medium">Network map</h2>
        <MapCounts report={report} />
        <span className="flex-1" />
        <Segmented
          label="Containers on the map"
          items={[
            { value: "running", label: "Running" },
            { value: "all", label: "All" },
          ]}
          value={stopped}
          onChange={setStopped}
        />
        <Link
          href={envHref(server, "/containers/networks")}
          className="flex items-center gap-0.5 text-caption text-muted-foreground outline-none hover:text-brand focus-visible:text-brand"
        >
          Networks
          <ChevronRight className="size-3.5 rtl:rotate-180" />
        </Link>
      </header>
      <div className="h-[34rem] border-y border-border">
        <Topology
          report={report}
          server={server}
          phone={false}
          stopped={stopped === "all"}
        />
      </div>
      <div className="px-5 py-2.5">
        <MapNotice report={report} />
        {report.links_state === "read" && report.link_bytes && (
          <p className="text-caption text-ash">
            Hover a container to follow its lines; click it to open it.
          </p>
        )}
      </div>
    </section>
  )
}

// Phones: a row on the dashboard opens the map full screen, where a finger
// can pan and pinch.
export function PhoneMapRow({
  report,
  server,
}: {
  report: DockerReport
  server: string
}) {
  const [open, setOpen] = useOpen("docker-network-map")
  const all = buildTopology(report, { stopped: false, phone: true }).counts
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-start active:bg-muted"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
          <Waypoints className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body font-medium">Network map</span>
          <span className="truncate text-caption text-muted-foreground">
            {all.containers} running · {all.networks} network
            {all.networks === 1 ? "" : "s"} · {all.links} link
            {all.links === 1 ? "" : "s"}
          </span>
        </span>
        <Maximize2 className="size-4 shrink-0 text-ash" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal
          aria-label="Network map"
          className="fixed inset-0 z-50 flex flex-col bg-background pt-[env(safe-area-inset-top)]"
        >
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border ps-4 pe-1">
            <h2 className="min-w-0 flex-1 truncate text-body font-medium">
              Network map
            </h2>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X />
            </Button>
          </div>
          <div className="relative min-h-0 flex-1">
            <Topology
              report={report}
              server={server}
              phone
              stopped={false}
              interactive
            />
          </div>
          <div className="shrink-0 border-t border-border px-4 pt-2 pb-[calc(--spacing(2)+env(safe-area-inset-bottom))]">
            <MapNotice report={report} />
          </div>
        </div>
      )}
    </>
  )
}

// --- Containers: state and uptime --------------------------------------------

const PAGE = 12

function Ports({ c }: { c: DockerReportContainer }) {
  const list = [...new Set(c.ports.filter((p) => p.public > 0).map(portLabel))]
  if (!list.length) {
    const inner = c.listening.slice(0, 3)
    return inner.length ? (
      <span className="font-mono text-caption tracking-normal text-ash">
        {inner.map((p) => `:${p}`).join(" ")}
      </span>
    ) : (
      <span className="text-ash">—</span>
    )
  }
  return (
    <span className="font-mono text-caption tracking-normal">
      {list.slice(0, 2).join(" ")}
      {list.length > 2 && <span className="text-ash"> +{list.length - 2}</span>}
    </span>
  )
}

function StateCell({ c }: { c: DockerReportContainer }) {
  const tone = containerTone(c)
  const label = stateMeta[c.state]?.label ?? c.state
  const extra = c.oom_killed
    ? "out of memory"
    : !running(c) && c.exit_code
      ? `code ${c.exit_code}`
      : c.health !== "none"
        ? c.health
        : ""
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-body-sm">
      <Dot tone={tone} />
      <span className="truncate">
        {label}
        {extra && (
          <span
            className={cn(
              "text-muted-foreground",
              tone === "destructive" && "text-destructive",
              tone === "warning" && "text-warning",
            )}
          >
            {" "}
            · {extra}
          </span>
        )}
      </span>
    </span>
  )
}

export function ContainersReport({
  report: r,
  server,
}: {
  report: DockerReport
  server: string
}) {
  const [all, setAll] = useState(false)
  const list = [...r.containers].sort(byAttention)
  const shown = all ? list : list.slice(0, PAGE)
  return (
    <section
      aria-label="Containers"
      className="flex min-w-0 flex-col rounded-2xl border border-border bg-card shadow-sm [contain:inline-size]"
    >
      <header className="flex items-center gap-2 px-5 pt-4 pb-3">
        <h2 className="text-body-sm font-medium">State and uptime</h2>
        <span className="text-caption text-muted-foreground tabular-nums">
          {list.length}
        </span>
        <Link
          href={envHref(server, "/containers/list")}
          className="ms-auto flex items-center gap-0.5 text-caption text-muted-foreground outline-none hover:text-brand focus-visible:text-brand"
        >
          All containers
          <ChevronRight className="size-3.5 rtl:rotate-180" />
        </Link>
      </header>
      <div className="@container overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead className="border-y border-border bg-subtle text-start text-caption text-muted-foreground">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-start [&>th]:font-medium [&>th:first-child]:ps-5 [&>th:last-child]:pe-5">
              <th>Container</th>
              <th>State</th>
              <th>Uptime</th>
              <th className="text-end">Restarts</th>
              <th className="w-32">CPU</th>
              <th className="hidden @3xl:table-cell">Memory</th>
              <th className="hidden @4xl:table-cell">Network</th>
              <th className="hidden @5xl:table-cell">Ports</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((c) => {
              const share = serverShare(r, c.cpu)
              const on = running(c) && c.measured
              return (
                <tr
                  key={c.id}
                  className={cn(
                    "align-middle hover:bg-muted/40 [&>td]:px-3 [&>td]:py-2 [&>td:first-child]:ps-5 [&>td:last-child]:pe-5",
                    !running(c) && "text-muted-foreground",
                  )}
                >
                  <td className="max-w-72">
                    <Link
                      href={containerHref(server, c.name)}
                      className="flex min-w-0 flex-col outline-none hover:text-brand focus-visible:text-brand"
                    >
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="truncate font-mono text-caption tracking-normal text-ash">
                        {c.image}
                      </span>
                    </Link>
                  </td>
                  <td>
                    <StateCell c={c} />
                  </td>
                  <td className="whitespace-nowrap tabular-nums">
                    {uptimeText(c)}
                  </td>
                  <td
                    className={cn(
                      "text-end tabular-nums",
                      c.restarts > 0 && "text-warning",
                    )}
                  >
                    {c.restarts}
                  </td>
                  <td>
                    {on ? (
                      <span className="flex items-center gap-2">
                        <Spark
                          values={c.cpu_history.map((v) => serverShare(r, v))}
                          max={CPU_FLOOR}
                          slots={30}
                          tone={shareTone(share)}
                          className="h-6 w-16"
                        />
                        <span className="tabular-nums">{pct(share)}</span>
                      </span>
                    ) : (
                      <span className="text-ash">—</span>
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap tabular-nums @3xl:table-cell">
                    {on ? (
                      <>
                        {formatSize(c.memory_used)}
                        {c.memory_limit > 0 && (
                          <span className="text-ash">
                            {" "}
                            / {formatSize(c.memory_limit)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-ash">—</span>
                    )}
                  </td>
                  <td className="hidden text-caption whitespace-nowrap tabular-nums @4xl:table-cell">
                    {on ? (
                      <span className="flex flex-col">
                        <span>↓ {rate(c.net_rx_rate)}</span>
                        <span className="text-ash">
                          ↑ {rate(c.net_tx_rate)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-ash">—</span>
                    )}
                  </td>
                  <td className="hidden @5xl:table-cell">
                    <Ports c={c} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {list.length > PAGE && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          className="border-t border-border px-5 py-2.5 text-start text-caption text-muted-foreground outline-none hover:text-brand focus-visible:text-brand"
        >
          {all ? "Show fewer" : `Show all ${list.length}`}
        </button>
      )}
    </section>
  )
}

// --- Phone pieces ------------------------------------------------------------

export function PhoneKpis({ report: r }: { report: DockerReport }) {
  const n = reportCounts(r)
  const cpu = serverShare(r, r.cpu)
  const mem = r.host_memory > 0 ? (r.memory_used / r.host_memory) * 100 : 0
  const items = [
    {
      key: "containers",
      label: "Running",
      value: `${n.up}/${n.total}`,
      tone: n.failed ? "destructive" : undefined,
    },
    {
      key: "cpu",
      label: "CPU",
      value: pct(cpu),
      tone: cpu >= 80 ? "warning" : undefined,
    },
    {
      key: "memory",
      label: "Memory",
      value: `${Math.round(mem)}%`,
      tone: mem >= 80 ? "warning" : undefined,
    },
    {
      key: "net",
      label: "Network",
      value: rate(r.net_rx_rate + r.net_tx_rate),
      tone: undefined,
    },
  ] as const
  return (
    <div className="flex flex-col gap-3 border-y border-border p-4">
      <div className="grid grid-cols-4 gap-2">
        {items.map((i) => (
          <div key={i.key} className="flex min-w-0 flex-col">
            <span className="font-label text-[11px] tracking-label text-ash uppercase">
              {i.label}
            </span>
            <span
              className={cn(
                "truncate text-subheading font-light tabular-nums",
                i.tone === "warning" && "text-warning",
                i.tone === "destructive" && "text-destructive",
              )}
            >
              {i.value}
            </span>
          </div>
        ))}
      </div>
      <Spark
        values={r.history.map((p) => serverShare(r, p.cpu))}
        max={CPU_FLOOR}
        slots={40}
        tone={shareTone(cpu)}
      />
    </div>
  )
}

export function PhoneContainerRows({
  report: r,
  server,
  limit = 8,
}: {
  report: DockerReport
  server: string
  limit?: number
}) {
  const list = [...r.containers].sort(byAttention).slice(0, limit)
  return (
    <>
      {list.map((c) => (
        <li key={c.id}>
          <Link
            href={containerHref(server, c.name)}
            className="flex min-h-14 items-center gap-3 px-4 py-2 active:bg-muted"
          >
            <Dot tone={containerTone(c)} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body font-medium">{c.name}</span>
              <span className="truncate text-caption text-muted-foreground">
                {uptimeText(c)}
                {c.restarts > 0 && ` · ${c.restarts} restarts`}
              </span>
            </span>
            {running(c) && c.measured && (
              <span className="shrink-0 text-body-sm text-muted-foreground tabular-nums">
                {pct(serverShare(r, c.cpu))}
              </span>
            )}
            <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
          </Link>
        </li>
      ))}
    </>
  )
}

export function ReportLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  )
}
