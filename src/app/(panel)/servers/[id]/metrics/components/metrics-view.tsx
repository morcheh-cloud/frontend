"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  BellOff,
  BellPlus,
  ChartLine,
  CircleAlert,
  Plus,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { alertRuleKeys, useServerAlertRules } from "@/app/(panel)/alerts/api"
import { AlertEventList } from "@/app/(panel)/alerts/components/events-list"
import { MutesNotice } from "@/app/(panel)/alerts/components/mutes"
import {
  RuleActionsProvider,
  useRuleActions,
} from "@/app/(panel)/alerts/components/rule-actions"
import {
  FiringNotice,
  RulesList,
} from "@/app/(panel)/alerts/components/rules-list"
import {
  alertsHref,
  byRuleState,
  formatValue,
  type Metric,
  metricOf,
  presets,
  targetOf,
} from "@/app/(panel)/alerts/components/rules-meta"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { useServerCan } from "@/app/(panel)/servers/components/permissions"
import {
  type Buckets,
  bucketLabel,
  bucketOf,
  buckets,
  type Guide,
  Legend,
  MultiLineChart,
  type Series,
  Tip,
} from "@/components/charts/time-chart"
import { Section } from "@/components/insights/parts"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatDuration, formatSize } from "@/lib/format"
import type { AlertRule, ServerMetrics } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty, Loading, Segmented } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import {
  type MetricRange,
  metricKeys,
  metricRanges,
  useMetricFilters,
  useServerMetrics,
} from "../api"

// A server's metrics over time (sampled by the backend, kept 30 days), the
// alert rules that watch it, drawn as lines on the charts, and what they sent.

export function MetricsView() {
  const { server, phone } = useServerPage()
  const router = useRouter()
  const can = useServerCan()
  return (
    <RuleActionsProvider
      phone={phone}
      canMute={can(server, "operator")}
      activity={(r) =>
        router.push(alertsHref("/alerts", { tab: "activity", rule: r.id }))
      }
    >
      <Content />
    </RuleActionsProvider>
  )
}

const rangeLabels: Record<MetricRange, string> = {
  "1h": "1 hour",
  "6h": "6 hours",
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
}

function Content() {
  const { server, phone } = useServerPage()
  const [{ range }, setFilters] = useMetricFilters()
  const metrics = useServerMetrics(server.id, range)
  const rules = useServerAlertRules(server.id)
  const queryClient = useQueryClient()
  const a = useRuleActions()

  const data = metrics.data
  const list = [...(rules.data ?? [])].sort(byRuleState)
  const watching = list.filter((r) => r.enabled)
  const busy = metrics.isFetching || rules.isFetching
  const here = { id: server.id, name: server.name }

  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      onClick={() => {
        queryClient.invalidateQueries({ queryKey: metricKeys.all })
        queryClient.invalidateQueries({ queryKey: alertRuleKeys.all })
      }}
    >
      <RefreshCw className={cn(busy && "animate-spin")} />
    </Button>
  )
  const add = a.can && (
    <Button
      size={phone ? "icon-lg" : "default"}
      className="md:h-9"
      aria-label="New alert rule"
      onClick={() => a.create({ server: here })}
    >
      <Plus />
      {!phone && "New alert rule"}
    </Button>
  )
  const mute = a.canMute && (
    <Button
      variant="outline"
      size={phone ? "icon" : "default"}
      className="max-md:size-11 md:h-9"
      aria-label="Mute alerts on this server"
      onClick={() =>
        a.mute({ target: { kind: "server", id: server.id, name: server.name } })
      }
    >
      <BellOff />
      {!phone && "Mute"}
    </Button>
  )
  const ranges = (
    <Segmented
      label="Time range"
      items={metricRanges.map((r) => ({
        value: r,
        label: phone ? r : rangeLabels[r],
      }))}
      value={range}
      onChange={(r) => setFilters({ range: r === "24h" ? null : r })}
    />
  )
  const caption = data && <Sampling data={data} />

  let charts: ReactNode
  if (metrics.isPending) {
    charts = <Loading phone={phone} />
  } else if (metrics.isError && !data) {
    charts = (
      <Empty
        icon={CircleAlert}
        title="Couldn't load the metrics"
        body={metrics.error.message}
        action={
          <Button
            variant="outline"
            className="max-md:h-11"
            onClick={() => metrics.refetch()}
          >
            Try again
          </Button>
        }
      />
    )
  } else if (data && data.points.length === 0) {
    charts = <NoSamples data={data} range={range} />
  } else if (data) {
    charts = <Charts data={data} rules={watching} />
  }

  return (
    <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
      {phone ? (
        <div className="flex flex-col gap-2 px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="-my-1 min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto py-1">
              {ranges}
            </div>
            {refresh}
            {mute}
            {add}
          </div>
          {caption}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {ranges}
          {caption}
          <div className="ms-auto flex shrink-0 items-center gap-2">
            {refresh}
            {mute}
            {add}
          </div>
        </div>
      )}

      {list.length > 0 && (
        <div className={cn(phone && "px-4 pb-3")}>
          <FiringNotice rules={list} targetId={server.id} />
        </div>
      )}
      <MutesNotice
        serverId={server.id}
        canEnd={a.canMute}
        className={cn(phone && "mx-4 mb-3")}
      />

      {charts}

      <Section
        phone={phone}
        title="Alert rules"
        caption={
          list.length
            ? "The rules that watch this server. Their limits show on the charts."
            : "Get a message when this server needs a look."
        }
        className={cn(phone && "border-t")}
      >
        {rules.isPending ? null : list.length ? (
          <div className={cn(phone && "-mx-4 -mb-5")}>
            <RulesList rules={list} phone={phone} targetId={server.id} />
          </div>
        ) : (
          <QuickStart here={here} />
        )}
      </Section>

      <Section
        phone={phone}
        title="Recent alerts"
        actions={
          <Button
            variant="ghost"
            className="max-md:h-11"
            render={<Link href={alertsHref("/alerts", { tab: "activity" })} />}
            nativeButton={false}
          >
            All activity
          </Button>
        }
      >
        <div className={cn(phone && "-mx-4 -mb-5")}>
          <AlertEventList
            serverId={server.id}
            limit={20}
            phone={phone}
            emptyText="No rule has fired on this server yet."
          />
        </div>
      </Section>
    </div>
  )
}

// "Sampled every 1m · 20 seconds ago", or why nothing new comes in.
function Sampling({ data }: { data: ServerMetrics }) {
  const off = data.sample_seconds === 0
  const at = data.latest?.at
  const stale =
    !off &&
    at &&
    Date.now() - Date.parse(at) > Math.max(3 * data.sample_seconds, 180) * 1000
  if (off || stale) {
    return (
      <p className="flex items-center gap-1.5 text-caption text-warning">
        <CircleAlert className="size-3.5 shrink-0" />
        {off
          ? "Sampling is off on this Morcheh"
          : `No new sample since ${timeAgo(at ?? null)}`}
      </p>
    )
  }
  return (
    <p className="text-caption text-ash">
      Sampled every {formatDuration(data.sample_seconds)}
      {at && ` · last ${timeAgo(at)}`}
    </p>
  )
}

function NoSamples({ data, range }: { data: ServerMetrics; range: string }) {
  if (data.sample_seconds === 0) {
    return (
      <Empty
        icon={ChartLine}
        title="Sampling is off"
        body="Morcheh keeps metrics only while its sampler runs. Whoever runs Morcheh can turn it on with SERVER_SAMPLE_INTERVAL (for example 1m)."
      />
    )
  }
  return (
    <Empty
      icon={ChartLine}
      title={data.latest ? `Nothing in the last ${range}` : "No samples yet"}
      body={
        data.latest
          ? `The newest sample is from ${timeAgo(data.latest.at)}. Pick a longer range, or check that the server is reachable.`
          : `The first sample comes within ${formatDuration(data.sample_seconds)} of the server being reachable. Only Linux servers are sampled.`
      }
    />
  )
}

// Rules with nothing set up yet: one tap starts the common ones here.
function QuickStart({ here }: { here: { id: string; name: string } }) {
  const a = useRuleActions()
  const { phone } = useServerPage()
  if (!a.can) {
    return (
      <p className="text-body-sm text-muted-foreground">
        No rule watches this server.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {presets
        .filter((p) => targetOf(p.metric) === "server")
        .map((p) => {
          const Icon = metricOf(p.metric).icon
          return (
            <Button
              key={p.key}
              variant="outline"
              className={cn(phone ? "h-11" : "h-9")}
              onClick={() => a.create({ preset: p, server: here })}
            >
              <Icon />
              {p.name}
            </Button>
          )
        })}
    </div>
  )
}

// --- Charts ---

type Col = (number | null)[]

function model(m: ServerMetrics) {
  const b = buckets(m.from, m.to, m.bucket_seconds)
  const col = (): Col => Array.from(b.starts, () => null)
  const s = {
    cpu: col(),
    cpuMax: col(),
    iowait: col(),
    load: col(),
    loadMax: col(),
    memory: col(),
    memoryMax: col(),
    swap: col(),
    rx: col(),
    rxMax: col(),
    tx: col(),
    txMax: col(),
  }
  const mbit = (v: number) => (v * 8) / 1e6
  let swap = false
  for (const p of m.points) {
    const i = bucketOf(b, p.t)
    if (i < 0) continue
    s.cpu[i] = p.cpu
    s.cpuMax[i] = p.cpu_max
    s.iowait[i] = p.iowait
    s.load[i] = p.load
    s.loadMax[i] = p.load_max
    s.memory[i] = p.memory
    s.memoryMax[i] = p.memory_max
    s.swap[i] = p.swap
    s.rx[i] = mbit(p.rx)
    s.rxMax[i] = mbit(p.rx_max)
    s.tx[i] = mbit(p.tx)
    s.txMax[i] = mbit(p.tx_max)
    if (p.swap > 0) swap = true
  }
  if ((m.latest?.swap_total ?? 0) > 0) swap = true
  const disks = m.disks
    .map((d) => {
      const values = col()
      for (const p of d.points) {
        const i = bucketOf(b, p.t)
        if (i >= 0) values[i] = p.percent
      }
      return { mount: d.mount, values, last: d.points.at(-1) }
    })
    .sort((x, y) =>
      x.mount === "/"
        ? -1
        : y.mount === "/"
          ? 1
          : (y.last?.percent ?? 0) - (x.last?.percent ?? 0),
    )
  // Peaks only differ from the average when a bucket holds several samples.
  const peaks = m.bucket_seconds > m.sample_seconds
  return { b, s, swap, disks, peaks }
}

// An enabled rule's limit as a line on its chart. `main` = the chart's own
// metric, labelled by value alone; others carry the metric's name.
function guidesFor(
  rules: AlertRule[],
  wanted: Metric[],
  main: Metric,
  mount?: string,
): Guide[] {
  return rules
    .filter(
      (r) =>
        (wanted as string[]).includes(r.metric) &&
        (mount === undefined || !r.mount || r.mount === mount),
    )
    .map((r) => {
      const value =
        r.metric === "net_rx" || r.metric === "net_tx"
          ? (r.threshold * 8) / 1e6
          : r.threshold
      const text = formatValue(r.metric, r.threshold).replace(" per core", "")
      return {
        value,
        label: r.metric === main ? text : `${metricOf(r.metric).label} ${text}`,
        tone: r.severity === "critical" ? "destructive" : "warning",
      }
    })
}

const pct = (v: number) => `${Math.round(v)}%`
const pctTip = (v: number | null) =>
  v === null ? "No data" : `${v.toFixed(v < 10 ? 1 : 0)}%`
const loadFmt = (v: number) => v.toFixed(v < 10 ? 2 : 1)
const loadTip = (v: number | null) => (v === null ? "No data" : loadFmt(v))
const mbitFmt = (v: number) =>
  v >= 1000
    ? `${(v / 1000).toFixed(1)} Gbit/s`
    : `${v.toFixed(v < 10 ? 1 : 0)} Mbit/s`
const mbitTip = (v: number | null) => (v === null ? "No data" : mbitFmt(v))

const swatch = {
  brand: "bg-brand",
  quiet: "bg-muted-foreground",
  peak: "bg-brand/35",
}

function Charts({ data, rules }: { data: ServerMetrics; rules: AlertRule[] }) {
  const { phone } = useServerPage()
  const { b, s, swap, disks, peaks } = model(data)
  const latest = data.latest
  const height = phone ? 160 : 200

  const cpuSeries: Series[] = [
    ...(peaks
      ? [{ key: "peak", values: s.cpuMax, tone: "peak" as const }]
      : []),
    { key: "iowait", values: s.iowait, tone: "quiet" },
    { key: "cpu", values: s.cpu },
  ]
  const memorySeries: Series[] = [
    ...(swap ? [{ key: "swap", values: s.swap, tone: "quiet" as const }] : []),
    { key: "memory", values: s.memory },
  ]
  const loadSeries: Series[] = [
    ...(peaks
      ? [{ key: "peak", values: s.loadMax, tone: "peak" as const }]
      : []),
    { key: "load", values: s.load },
  ]
  const netSeries: Series[] = [
    { key: "tx", values: s.tx, tone: "quiet" },
    { key: "rx", values: s.rx },
  ]

  return (
    <div className="@container">
      <div className="grid gap-4 max-md:gap-0 @4xl:grid-cols-2">
        <ChartCard
          title="CPU"
          now={latest && pct(latest.cpu)}
          metric="cpu"
          legend={[
            { label: "Average", swatch: swatch.brand },
            ...(peaks
              ? [{ label: "Busiest moment", swatch: swatch.peak }]
              : []),
            { label: "I/O wait", swatch: swatch.quiet },
          ]}
        >
          <MultiLineChart
            buckets={b}
            series={cpuSeries}
            guides={guidesFor(rules, ["cpu", "iowait"], "cpu")}
            max={100}
            format={pct}
            height={height}
            label="CPU use over time"
            tooltip={(i) => (
              <Tip
                title={bucketLabel(b, i)}
                rows={[
                  {
                    label: "Average",
                    value: pctTip(s.cpu[i]),
                    swatch: swatch.brand,
                  },
                  ...(peaks
                    ? [
                        {
                          label: "Busiest",
                          value: pctTip(s.cpuMax[i]),
                          swatch: swatch.peak,
                        },
                      ]
                    : []),
                  {
                    label: "I/O wait",
                    value: pctTip(s.iowait[i]),
                    swatch: swatch.quiet,
                  },
                ]}
              />
            )}
          />
        </ChartCard>

        <ChartCard
          title="Memory"
          now={
            latest &&
            latest.mem_total > 0 &&
            `${formatSize(latest.mem_used)} of ${formatSize(latest.mem_total)}`
          }
          metric="memory"
          legend={[
            { label: "Memory", swatch: swatch.brand },
            ...(swap ? [{ label: "Swap", swatch: swatch.quiet }] : []),
          ]}
        >
          <MultiLineChart
            buckets={b}
            series={memorySeries}
            guides={guidesFor(rules, ["memory", "swap"], "memory")}
            max={100}
            format={pct}
            height={height}
            label="Memory use over time"
            tooltip={(i) => (
              <Tip
                title={bucketLabel(b, i)}
                rows={[
                  {
                    label: "Memory",
                    value: pctTip(s.memory[i]),
                    swatch: swatch.brand,
                  },
                  ...(peaks
                    ? [{ label: "Highest", value: pctTip(s.memoryMax[i]) }]
                    : []),
                  ...(swap
                    ? [
                        {
                          label: "Swap",
                          value: pctTip(s.swap[i]),
                          swatch: swatch.quiet,
                        },
                      ]
                    : []),
                ]}
              />
            )}
          />
        </ChartCard>

        <ChartCard
          title="Load per core"
          now={
            latest &&
            latest.cores > 0 &&
            `${loadFmt(latest.load1 / latest.cores)} · ${latest.cores} ${latest.cores === 1 ? "core" : "cores"}`
          }
          metric="load"
          hint="Above 1 means work is waiting for a free core."
          legend={
            peaks
              ? [
                  { label: "Average", swatch: swatch.brand },
                  { label: "Highest", swatch: swatch.peak },
                ]
              : undefined
          }
        >
          <MultiLineChart
            buckets={b}
            series={loadSeries}
            guides={[...guidesFor(rules, ["load"], "load")]}
            max={1}
            format={loadFmt}
            height={height}
            label="Load per core over time"
            tooltip={(i) => (
              <Tip
                title={bucketLabel(b, i)}
                rows={[
                  {
                    label: "Average",
                    value: loadTip(s.load[i]),
                    swatch: swatch.brand,
                  },
                  ...(peaks
                    ? [
                        {
                          label: "Highest",
                          value: loadTip(s.loadMax[i]),
                          swatch: swatch.peak,
                        },
                      ]
                    : []),
                ]}
              />
            )}
          />
        </ChartCard>

        <ChartCard
          title="Network"
          now={
            latest &&
            `↓ ${mbitFmt((latest.rx * 8) / 1e6)} · ↑ ${mbitFmt((latest.tx * 8) / 1e6)}`
          }
          metric="net_rx"
          legend={[
            { label: "Download", swatch: swatch.brand },
            { label: "Upload", swatch: swatch.quiet },
          ]}
        >
          <MultiLineChart
            buckets={b}
            series={netSeries}
            guides={guidesFor(rules, ["net_rx", "net_tx"], "net_rx")}
            format={mbitFmt}
            height={height}
            label="Network traffic over time"
            tooltip={(i) => (
              <Tip
                title={bucketLabel(b, i)}
                rows={[
                  {
                    label: "Download",
                    value: mbitTip(s.rx[i]),
                    swatch: swatch.brand,
                  },
                  ...(peaks
                    ? [{ label: "Fastest", value: mbitTip(s.rxMax[i]) }]
                    : []),
                  {
                    label: "Upload",
                    value: mbitTip(s.tx[i]),
                    swatch: swatch.quiet,
                  },
                  ...(peaks
                    ? [{ label: "Fastest", value: mbitTip(s.txMax[i]) }]
                    : []),
                ]}
              />
            )}
          />
        </ChartCard>

        {disks.length > 0 && (
          <ChartCard
            title={disks.length === 1 ? "Disk" : "Disks"}
            metric="disk"
            className="@4xl:col-span-2"
          >
            <div className="grid gap-x-6 gap-y-5 @4xl:grid-cols-2 @7xl:grid-cols-3">
              {disks.map((d) => (
                <DiskChart
                  key={d.mount}
                  b={b}
                  disk={d}
                  guides={guidesFor(rules, ["disk"], "disk", d.mount)}
                />
              ))}
            </div>
          </ChartCard>
        )}
      </div>
    </div>
  )
}

function DiskChart({
  b,
  disk,
  guides,
}: {
  b: Buckets
  disk: {
    mount: string
    values: Col
    last?: { used: number; total: number; percent: number }
  }
  guides: Guide[]
}) {
  const a = useRuleActions()
  const { server } = useServerPage()
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="truncate font-mono text-body-sm font-medium">
          {disk.mount}
        </span>
        {disk.last && (
          <span className="truncate text-caption text-muted-foreground tabular-nums">
            {pct(disk.last.percent)} · {formatSize(disk.last.used)} of{" "}
            {formatSize(disk.last.total)}
          </span>
        )}
        {a.can && (
          <Button
            variant="link"
            className="ms-auto h-auto shrink-0 p-0 text-caption max-md:min-h-11"
            onClick={() =>
              a.create({
                metric: "disk",
                mount: disk.mount,
                server: { id: server.id, name: server.name },
              })
            }
          >
            Alert
          </Button>
        )}
      </div>
      <MultiLineChart
        buckets={b}
        series={[{ key: "disk", values: disk.values }]}
        guides={guides}
        max={100}
        format={pct}
        height={140}
        label={`Use of ${disk.mount} over time`}
        tooltip={(i) => (
          <Tip
            title={bucketLabel(b, i)}
            rows={[{ label: disk.mount, value: pctTip(disk.values[i]) }]}
          />
        )}
      />
    </div>
  )
}

// One chart in a card: title, the value right now, an "alert on this" button.
function ChartCard({
  title,
  now,
  hint,
  metric,
  legend,
  className,
  children,
}: {
  title: string
  now?: ReactNode
  hint?: string
  metric: Metric
  legend?: { label: string; swatch: string }[]
  className?: string
  children: ReactNode
}) {
  const { phone, server } = useServerPage()
  const a = useRuleActions()
  const alert = a.can && (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="max-md:size-11"
            aria-label={`New alert on ${title}`}
            onClick={() =>
              a.create({
                metric,
                server: { id: server.id, name: server.name },
              })
            }
          />
        }
      >
        <BellPlus />
      </TooltipTrigger>
      <TooltipContent>Alert on {title}</TooltipContent>
    </Tooltip>
  )
  return (
    <Section
      phone={phone}
      title={title}
      caption={
        now || hint ? (
          <>
            {now && <span className="tabular-nums">Now {now}</span>}
            {now && hint && " · "}
            {hint}
          </>
        ) : undefined
      }
      actions={alert}
      className={className}
    >
      <div className="flex flex-col gap-3">
        {children}
        {legend && legend.length > 1 && <Legend items={legend} />}
      </div>
    </Section>
  )
}
