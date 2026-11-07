"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Meter } from "@/app/(panel)/servers/[id]/components/resources"
import {
  bucketLabel,
  ColumnChart,
  Legend,
  LineChart,
  Tip,
} from "@/components/charts/time-chart"
import {
  daysUntilFull,
  formatCount,
  formatDays,
  formatGrowth,
  formatMs,
  formatPct,
  formatPercent,
  type InsightsRange,
  rangeLabels,
} from "@/components/insights/format"
import {
  AvailabilitySection,
  BarList,
  EventList,
  InsightsError,
  InsightsLoading,
  ItemPicker,
  Quiet,
  RangeControls,
  ResponseTimeSection,
  Section,
  Tiles,
  usePicked,
} from "@/components/insights/parts"
import { formatSize } from "@/lib/format"
import type { ServerInsights } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useServerInsights } from "../../api"
import { OsTile, StatusDot, statusMeta } from "../meta"
import { useServersPageTab } from "../page-tab"
import { buildModel, type Model, type ServerModel } from "./model"

type Status = keyof typeof statusMeta
const statusOf = (s: string): Status =>
  s in statusMeta ? (s as Status) : "unknown"

// Servers | Insights, at the start of the page's top row.
export function ServersTabs() {
  const [{ tab }, setTab] = useServersPageTab()
  return (
    <Segmented
      label="Show"
      value={tab}
      onChange={(tab) => setTab({ tab })}
      items={[
        { value: "servers", label: "Servers" },
        { value: "insights", label: "Insights" },
      ]}
    />
  )
}

function useInsights() {
  const [{ range }, setTab] = useServersPageTab()
  const query = useServerInsights(range)
  const model = useMemo(
    () => (query.data ? buildModel(query.data) : null),
    [query.data],
  )
  return {
    range,
    setRange: (range: InsightsRange) => setTab({ range }),
    query,
    model,
  }
}

export function ServerInsightsControls({ phone }: { phone: boolean }) {
  const { range, setRange, query } = useInsights()
  return (
    <RangeControls
      range={range}
      onChange={setRange}
      query={query}
      phone={phone}
    />
  )
}

// The desktop page while the Insights tab is on.
export function ServerInsightsDesktop() {
  return (
    <section className="flex w-full min-w-0 flex-col gap-4 px-6 pt-5 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <ServersTabs />
        <ServerInsightsControls phone={false} />
      </div>
      <ServerInsightsBody phone={false} />
    </section>
  )
}

export function ServerInsightsBody({ phone }: { phone: boolean }) {
  const { range, query, model } = useInsights()

  if (query.isPending) return <InsightsLoading phone={phone} />
  if (!model || !query.data)
    return <InsightsError error={query.error} onRetry={() => query.refetch()} />
  if (model.servers.length === 0)
    return <Quiet>No servers in this workspace yet.</Quiet>

  return (
    <div
      className={cn(
        "flex flex-col transition-opacity",
        phone ? "pb-6" : "gap-4",
        query.isPlaceholderData && "opacity-60",
      )}
    >
      <Headline model={model} range={range} phone={phone} />
      <Availability model={model} phone={phone} />
      <div className={cn(!phone && "grid gap-4 xl:grid-cols-2")}>
        <ResponseTimeSection
          buckets={model.buckets}
          items={model.servers}
          all={model.all}
          noun="servers"
          phone={phone}
        />
        <ResourcesChart model={model} data={query.data} phone={phone} />
      </div>
      <Disks model={model} data={query.data} range={range} phone={phone} />
      <div className={cn(!phone && "grid gap-4 xl:grid-cols-2")}>
        <Changes data={query.data} model={model} phone={phone} />
        <Busiest model={model} phone={phone} />
      </div>
    </div>
  )
}

function Headline({
  model,
  range,
  phone,
}: {
  model: Model
  range: InsightsRange
  phone: boolean
}) {
  const t = model.totals
  const count = model.servers.length
  const down = count - t.online
  const disk = t.fullest?.latest
  return (
    <Tiles
      phone={phone}
      className="lg:grid-cols-3 2xl:grid-cols-6"
      tiles={[
        {
          label: "Online",
          value: `${t.online} of ${count}`,
          note: down ? `${down} not online` : "All of them",
          warn: down > 0,
        },
        {
          label: "Uptime",
          value: t.checks
            ? formatPercent((t.checks - t.failures) / t.checks)
            : "—",
          note: t.checks
            ? `${formatCount(t.checks)} checks in ${rangeLabels[range]}`
            : "No checks yet",
        },
        {
          label: "Avg response",
          value: t.latency === null ? "—" : formatMs(t.latency),
          note: "SSH connection check",
        },
        {
          label: "CPU",
          value: t.cpu === null ? "—" : formatPct(t.cpu),
          note:
            t.cpuMax === null
              ? "Not read yet"
              : `Average · peak ${formatPct(t.cpuMax)}`,
          warn: (t.cpu ?? 0) >= 80,
        },
        {
          label: "Memory",
          value: t.mem === null ? "—" : formatPct(t.mem),
          note:
            t.memMax === null
              ? "Not read yet"
              : `Average · peak ${formatPct(t.memMax)}`,
          warn: (t.mem ?? 0) >= 80,
        },
        {
          label: "Fullest disk",
          value: disk ? formatPct(disk.disk_max_percent) : "—",
          note:
            disk && t.fullest
              ? `${t.fullest.name} · ${disk.disk_max_mount}`
              : "Not read yet",
          warn: (disk?.disk_max_percent ?? 0) >= 80,
        },
      ]}
    />
  )
}

function ServerName({
  server: s,
  phone,
}: {
  server: ServerModel
  phone?: boolean
}) {
  const status = statusOf(s.status)
  return (
    <Link
      href={`/servers/${s.id}`}
      className="flex min-w-0 items-center gap-2.5 outline-none hover:text-brand focus-visible:text-brand"
    >
      <OsTile
        os={{
          id: s.os_id,
          name: s.os_name,
          arch: "",
          family: "",
          kernel: "",
          version: "",
        }}
        className={cn("shrink-0 rounded-md", phone ? "size-8" : "size-7")}
      />
      <span className="truncate font-medium">{s.name}</span>
      <StatusDot status={status} className="shrink-0" />
      <span className="sr-only">{statusMeta[status].label}</span>
    </Link>
  )
}

function Availability({ model, phone }: { model: Model; phone: boolean }) {
  return (
    <AvailabilitySection
      buckets={model.buckets}
      noun="Server"
      columns={["Avg", "Slowest"]}
      phone={phone}
      rows={model.servers.map((s) => ({
        id: s.id,
        label: s.name,
        name: <ServerName server={s} phone={phone} />,
        series: s.series,
        strip: s.strip,
        uptime: s.uptime,
        values: [
          s.latency_avg === null ? "—" : formatMs(s.latency_avg),
          s.latency_max === null ? "—" : formatMs(s.latency_max),
        ],
        caption:
          s.latency_avg === null
            ? "Didn't answer in this range"
            : `Avg ${formatMs(s.latency_avg)} · slowest ${formatMs(s.latency_max ?? 0)}`,
      }))}
    />
  )
}

type View = "cpu" | "mem" | "disk" | "net"

const rate = (v: number) => `${formatSize(v)}/s`

function ResourcesChart({
  model,
  data,
  phone,
}: {
  model: Model
  data: ServerInsights
  phone: boolean
}) {
  const [view, setView] = useState<View>("cpu")
  const sampled = model.servers.filter((s) => s.resources)
  const { item, value, setPicked } = usePicked(sampled)
  const r = item?.res ?? model.allRes
  const b = model.buckets
  const who = item?.name ?? "all servers"
  const minutes = Math.round(data.sample_seconds / 60)

  const percent = (avg: (number | null)[], peak: (number | null)[]) => (
    <LineChart
      buckets={b}
      values={avg}
      max={100}
      format={formatPct}
      label={`${view === "cpu" ? "CPU" : view === "mem" ? "Memory" : "Fullest disk"} of ${who}`}
      tooltip={(i) => (
        <Tip
          title={bucketLabel(b, i)}
          rows={
            avg[i] === null
              ? [{ label: "Read", value: "Not read" }]
              : [
                  {
                    label: view === "disk" ? "Used" : "Average",
                    value: formatPct(avg[i] ?? 0),
                  },
                  ...(view !== "disk" && peak[i] !== null
                    ? [{ label: "Peak", value: formatPct(peak[i] ?? 0) }]
                    : []),
                  ...(view === "cpu" && r.load[i] !== null
                    ? [{ label: "Load", value: (r.load[i] ?? 0).toFixed(2) }]
                    : []),
                ]
          }
        />
      )}
    />
  )

  return (
    <Section
      title="Resources"
      caption={
        item
          ? `Read every ${minutes} minutes while the server is online.`
          : `Average across the servers read (network: their total). Read every ${minutes} minutes.`
      }
      actions={
        sampled.length > 0 && (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              phone && "w-full",
            )}
          >
            <Segmented
              label="Show"
              value={view}
              onChange={setView}
              items={[
                { value: "cpu", label: "CPU" },
                { value: "mem", label: phone ? "RAM" : "Memory" },
                { value: "disk", label: "Disk" },
                { value: "net", label: phone ? "Net" : "Network" },
              ]}
            />
            <div className={cn(phone && "w-full")}>
              <ItemPicker
                items={sampled}
                value={value}
                onChange={setPicked}
                phone={phone}
                label="Server"
                allLabel="All servers"
              />
            </div>
          </div>
        )
      }
      phone={phone}
    >
      {!data.sample_seconds ? (
        <Quiet>Reading resources is turned off on this Morcheh server.</Quiet>
      ) : sampled.length === 0 ? (
        <Quiet>
          Resources are read from online Linux servers every {minutes} minutes.
          Nothing read in this range yet.
        </Quiet>
      ) : view === "cpu" ? (
        percent(r.cpu, r.cpuMax)
      ) : view === "mem" ? (
        percent(r.mem, r.memMax)
      ) : view === "disk" ? (
        percent(r.disk, r.disk)
      ) : (
        <>
          <div className="mb-3">
            <Legend
              items={[
                { label: "In", swatch: "bg-brand" },
                { label: "Out", swatch: "bg-brand/40" },
              ]}
            />
          </div>
          <ColumnChart
            buckets={b}
            stacks={[
              {
                key: "rx",
                fill: "fill-brand",
                values: r.rx.map((v) => v ?? 0),
              },
              {
                key: "tx",
                fill: "fill-brand/40",
                values: r.tx.map((v) => v ?? 0),
              },
            ]}
            format={rate}
            label={`Network of ${who}`}
            tooltip={(i) => (
              <Tip
                title={bucketLabel(b, i)}
                rows={
                  r.rx[i] === null
                    ? [{ label: "Read", value: "Not read" }]
                    : [
                        { label: "In", value: rate(r.rx[i] ?? 0) },
                        { label: "Out", value: rate(r.tx[i] ?? 0) },
                      ]
                }
              />
            )}
          />
        </>
      )}
    </Section>
  )
}

function Disks({
  model,
  data,
  range,
  phone,
}: {
  model: Model
  data: ServerInsights
  range: InsightsRange
  phone: boolean
}) {
  const rows = model.servers
    .flatMap((s) => {
      const l = s.latest
      if (!l?.disk_total_bytes) return []
      // The main disk is / when there is one: then use df's Use% (it leaves
      // out reserved blocks), so the bar matches `df -h` and the tile above.
      const root = l.disk_max_mount === "/"
      const percent = root
        ? l.disk_max_percent
        : (l.disk_used_bytes / l.disk_total_bytes) * 100
      const r = s.resources
      const growth = r ? r.disk_last - r.disk_first : null
      const days = r
        ? daysUntilFull(
            r.disk_first,
            r.disk_last,
            r.first_at,
            r.last_at,
            l.disk_total_bytes - l.disk_used_bytes,
          )
        : null
      return [{ s, l, root, percent, growth, days }]
    })
    .sort((a, b) => b.percent - a.percent)

  return (
    <Section
      title="Disks"
      caption="The main filesystem of each server (/ or the largest), and how fast it's filling."
      phone={phone}
    >
      {rows.length === 0 ? (
        <Quiet>
          {data.sample_seconds
            ? "No disk has been read yet."
            : "Reading resources is turned off on this Morcheh server."}
        </Quiet>
      ) : (
        <ul className={cn("divide-y divide-border", phone ? "-mx-4" : "-mx-2")}>
          {rows.map(({ s, l, root, percent, growth, days }) => {
            const other =
              !root && l.disk_max_mount && l.disk_max_percent > percent + 0.5
                ? `Fullest: ${l.disk_max_mount} at ${formatPct(l.disk_max_percent)}`
                : null
            const note = [
              growth !== null && growth !== 0
                ? `${formatGrowth(growth, formatSize)} in ${rangeLabels[range]}`
                : null,
              days !== null ? `full ${formatDays(days)}` : null,
              other,
            ].filter(Boolean)
            return (
              <li
                key={s.id}
                className={cn(
                  "flex items-center gap-3 py-3",
                  phone ? "px-4" : "px-2",
                )}
              >
                <div className="min-w-0 flex-1 text-body-sm">
                  <div className="flex items-baseline gap-3">
                    <ServerName server={s} phone={phone} />
                    <span className="ms-auto shrink-0 tabular-nums">
                      {formatPct(percent)}
                    </span>
                  </div>
                  <Meter
                    value={percent}
                    label={`${s.name} disk ${formatPct(percent)} used`}
                    className="mt-2 h-1.5"
                  />
                  <div className="mt-1 flex flex-wrap gap-x-2 text-caption text-ash">
                    <span className="tabular-nums">
                      {formatSize(l.disk_used_bytes)} of{" "}
                      {formatSize(l.disk_total_bytes)}
                    </span>
                    {note.map((n) => (
                      <span
                        key={n}
                        className={cn(
                          n?.startsWith("full ") &&
                            days !== null &&
                            days < 14 &&
                            "text-warning",
                        )}
                      >
                        · {n}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

function Changes({
  data,
  model,
  phone,
}: {
  data: ServerInsights
  model: Model
  phone: boolean
}) {
  const names = new Map(model.servers.map((s) => [s.id, s.name]))
  return (
    <Section
      title="Status changes"
      caption="When a server went down or came back."
      phone={phone}
    >
      {data.events.length === 0 ? (
        <Quiet>No server changed status in this range.</Quiet>
      ) : (
        <EventList
          phone={phone}
          events={data.events.map((e) => {
            const to = statusOf(e.status)
            return {
              key: `${e.server_id}-${e.at}`,
              dot: <StatusDot status={to} />,
              title: (
                <>
                  <span className="font-medium">
                    {names.get(e.server_id) ?? "Server"}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {statusMeta[statusOf(e.prev_status)].label} →{" "}
                    {statusMeta[to].label}
                  </span>
                </>
              ),
              detail: e.message,
              at: e.at,
            }
          })}
        />
      )}
    </Section>
  )
}

function Busiest({ model, phone }: { model: Model; phone: boolean }) {
  const rows = model.servers
    .flatMap((s) => (s.resources ? [{ s, r: s.resources }] : []))
    .sort((a, b) => b.r.cpu_avg - a.r.cpu_avg)
    .slice(0, 6)
  return (
    <Section
      title="Busiest servers"
      caption="By average CPU over the range."
      phone={phone}
    >
      {rows.length === 0 ? (
        <Quiet>No server's resources were read in this range.</Quiet>
      ) : (
        <BarList
          phone={phone}
          rows={rows.map(({ s, r }) => ({
            id: s.id,
            name: s.name,
            href: `/servers/${s.id}`,
            value: formatPct(r.cpu_avg),
            share: r.cpu_avg / 100,
            note: `Peak ${formatPct(r.cpu_max)} · memory ${formatPct(r.mem_avg)}${
              s.latest?.cores
                ? ` · ${s.latest.cores} ${s.latest.cores === 1 ? "core" : "cores"}`
                : ""
            }`,
          }))}
        />
      )}
    </Section>
  )
}
