"use client"

import { ScanSearch } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Meter } from "@/app/(panel)/servers/[id]/components/resources"
import {
  StatusDot,
  statusMeta,
  timeAgo,
} from "@/app/(panel)/servers/components/meta"
import {
  bucketLabel,
  ColumnChart,
  Legend,
  Tip,
} from "@/components/charts/time-chart"
import {
  AvailabilitySection,
  BarList,
  EventList,
  InsightsError,
  InsightsLoading,
  Quiet,
  RangeControls,
  ResponseTimeSection,
  Section,
  Tiles,
} from "@/components/insights/parts"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type { StorageInsights } from "@/lib/services"
import { cn } from "@/lib/utils"
import { type InsightsRange, useStorageInsights } from "../../api"
import { useStoragePageFilters } from "../filters"
import { type Protocol, ProtocolTile } from "../meta"
import {
  activityKinds,
  buildModel,
  countOf,
  formatCount,
  formatGrowth,
  formatMs,
  formatPercent,
  type Model,
  rangeLabels,
  type StorageModel,
} from "./model"
import { diskNote, MeasureButton, useMeasure } from "./parts"
import { UsageLayer } from "./usage-layer"

type Status = keyof typeof statusMeta
const statusOf = (s: string): Status =>
  s in statusMeta ? (s as Status) : "unknown"

export function useInsights() {
  const [{ range }] = useStoragePageFilters()
  const query = useStorageInsights(range)
  const model = useMemo(
    () => (query.data ? buildModel(query.data) : null),
    [query.data],
  )
  return { range, query, model }
}

export function InsightsControls({ phone }: { phone: boolean }) {
  const [{ range }, setFilters] = useStoragePageFilters()
  const { query, model } = useInsights()
  const measure = useMeasure()
  const measurable = (model?.storages ?? []).filter(
    (s) =>
      s.status === "online" && measure.can(s) && !measure.running.has(s.id),
  )
  return (
    <RangeControls
      range={range}
      onChange={(range) => setFilters({ range })}
      query={query}
      phone={phone}
    >
      {!phone && measurable.length > 0 && (
        <Button
          variant="outline"
          onClick={() => {
            for (const s of measurable) measure.start(s, true)
          }}
        >
          <ScanSearch />
          Measure all
        </Button>
      )}
    </RangeControls>
  )
}

export function InsightsBody({ phone }: { phone: boolean }) {
  const { range, query, model } = useInsights()
  const [layerOpen, setLayerOpen] = useOpen("storage-usage")
  const [layerId, setLayerId] = useState<string | null>(null)
  const openUsage = (id: string) => {
    setLayerId(id)
    setLayerOpen(true)
  }

  if (query.isPending) return <InsightsLoading phone={phone} />
  if (!model || !query.data)
    return <InsightsError error={query.error} onRetry={() => query.refetch()} />
  const layerStorage = model.storages.find((s) => s.id === layerId)

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
          items={model.storages}
          all={model.all}
          noun="storages"
          phone={phone}
        />
        <Activity model={model} phone={phone} />
      </div>
      <Space model={model} range={range} phone={phone} onOpen={openUsage} />
      <div className={cn(!phone && "grid gap-4 xl:grid-cols-2")}>
        <Changes data={query.data} model={model} phone={phone} />
        <Busiest model={model} phone={phone} />
      </div>
      {layerStorage && (
        <UsageLayer
          storage={layerStorage}
          model={model}
          open={layerOpen}
          onOpenChange={setLayerOpen}
          phone={phone}
        />
      )}
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
  const count = model.storages.length
  const down = count - t.online
  const tiles = [
    {
      label: "Online",
      value: `${t.online} of ${count}`,
      note: down ? `${down} not online` : "All of them",
      warn: down > 0,
    },
    {
      label: "Uptime",
      value: t.checks ? formatPercent((t.checks - t.failures) / t.checks) : "—",
      note: t.checks
        ? `${formatCount(t.checks)} checks in ${rangeLabels[range]}`
        : "No checks yet",
    },
    {
      label: "Stored",
      value: t.measured ? formatSize(t.used) : "—",
      note: !t.measured
        ? "Not measured yet"
        : t.growth !== null
          ? `${formatGrowth(t.growth, formatSize)} in ${rangeLabels[range]}`
          : `${t.measured} of ${count} measured`,
    },
    {
      label: "Data moved",
      value: formatSize(t.bytes),
      note: t.runs
        ? `${t.runs} ${t.runs === 1 ? "run" : "runs"}${t.failed ? ` · ${t.failed} failed` : ""}`
        : "Nothing ran",
      warn: t.failed > 0,
    },
  ]
  return <Tiles tiles={tiles} phone={phone} />
}

function StorageName({
  storage: s,
  phone,
}: {
  storage: StorageModel
  phone?: boolean
}) {
  return (
    <Link
      href={`/storage/${s.id}`}
      className="flex min-w-0 items-center gap-2.5 outline-none hover:text-brand focus-visible:text-brand"
    >
      <ProtocolTile
        protocol={s.protocol as Protocol}
        className={cn("shrink-0 rounded-md", phone ? "size-8" : "size-7")}
      />
      <span className="truncate font-medium">{s.name}</span>
      <StatusDot status={statusOf(s.status)} className="shrink-0" />
      <span className="sr-only">{statusMeta[statusOf(s.status)].label}</span>
    </Link>
  )
}

function Availability({ model, phone }: { model: Model; phone: boolean }) {
  return (
    <AvailabilitySection
      buckets={model.buckets}
      noun="Storage"
      columns={["Avg", "p95"]}
      phone={phone}
      rows={model.storages.map((s) => ({
        id: s.id,
        label: s.name,
        name: <StorageName storage={s} phone={phone} />,
        series: s.series,
        strip: s.strip,
        uptime: s.uptime,
        values: [
          s.latency_avg === null ? "—" : formatMs(s.latency_avg),
          s.latency_p95 === null ? "—" : formatMs(s.latency_p95),
        ],
        caption:
          s.latency_avg === null
            ? "Didn't answer in this range"
            : `Avg ${formatMs(s.latency_avg)} · p95 ${formatMs(s.latency_p95 ?? 0)}`,
      }))}
    />
  )
}

function Activity({ model, phone }: { model: Model; phone: boolean }) {
  const [view, setView] = useState<"runs" | "data">("runs")
  const t = model.totals
  const sum = (
    i: number,
    f: (k: (typeof model.activity)[0]["sync"]) => number,
  ) => activityKinds.reduce((n, { kind }) => n + f(model.activity[i][kind]), 0)
  const stacks =
    view === "runs"
      ? [
          {
            key: "ok",
            fill: "fill-brand",
            values: model.activity.map((_, i) => sum(i, (k) => k.ok)),
          },
          {
            key: "failed",
            fill: "fill-destructive",
            values: model.activity.map((_, i) => sum(i, (k) => k.failed)),
          },
        ]
      : [
          {
            key: "bytes",
            fill: "fill-brand",
            values: model.activity.map((_, i) => sum(i, (k) => k.bytes)),
          },
        ]
  return (
    <Section
      title="Activity"
      caption="Transfers, cron job syncs and database backups that used a storage."
      actions={
        <Segmented
          label="Show"
          value={view}
          onChange={setView}
          items={[
            { value: "runs", label: "Runs" },
            { value: "data", label: "Data" },
          ]}
        />
      }
      phone={phone}
    >
      {t.runs === 0 ? (
        <Quiet>Nothing used a storage in this range.</Quiet>
      ) : (
        <>
          {view === "runs" && (
            <div className="mb-3">
              <Legend
                items={[
                  { label: "Succeeded", swatch: "bg-brand" },
                  { label: "Failed", swatch: "bg-destructive" },
                ]}
              />
            </div>
          )}
          <ColumnChart
            buckets={model.buckets}
            stacks={stacks}
            format={view === "runs" ? (v) => formatCount(v) : formatSize}
            label={view === "runs" ? "Runs over time" : "Data moved over time"}
            tooltip={(i) => (
              <Tip
                title={bucketLabel(model.buckets, i)}
                rows={activityKinds.map(({ kind, label }) => {
                  const k = model.activity[i][kind]
                  return {
                    label,
                    value:
                      view === "runs"
                        ? `${k.ok + k.failed}${k.failed ? ` (${k.failed} failed)` : ""}`
                        : formatSize(k.bytes),
                  }
                })}
              />
            )}
          />
          <dl
            className={cn(
              "mt-4 border-t border-border pt-4",
              phone ? "flex flex-col gap-2.5" : "grid grid-cols-3 gap-3",
            )}
          >
            {activityKinds.map(({ kind, label }) => {
              const k = t.byKind[kind]
              const failed = k.failed > 0 && (
                <span className="text-caption text-destructive">
                  {k.failed} failed
                </span>
              )
              const value = (
                <>
                  {k.ok + k.failed}
                  <span className="font-normal text-ash">
                    {" "}
                    · {formatSize(k.bytes)}
                  </span>
                </>
              )
              if (phone)
                return (
                  <div
                    key={kind}
                    className="flex items-baseline gap-2 text-body-sm"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="ms-auto flex items-baseline gap-2 font-medium tabular-nums">
                      {failed}
                      <span>{value}</span>
                    </dd>
                  </div>
                )
              return (
                <div key={kind} className="min-w-0">
                  <dt className="truncate text-caption text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-body-sm font-medium tabular-nums">
                    {value}
                  </dd>
                  {failed && <dd>{failed}</dd>}
                </div>
              )
            })}
          </dl>
        </>
      )}
    </Section>
  )
}

function Space({
  model,
  range,
  phone,
  onOpen,
}: {
  model: Model
  range: InsightsRange
  phone: boolean
  onOpen: (id: string) => void
}) {
  const rows = [...model.storages].sort(
    (a, b) =>
      Number(!!b.usage) - Number(!!a.usage) ||
      (b.usage?.used_bytes ?? 0) - (a.usage?.used_bytes ?? 0),
  )
  const max = Math.max(1, ...rows.map((s) => s.usage?.used_bytes ?? 0))
  return (
    <Section
      title="Space"
      caption="What each storage holds, measured by walking it (daily by default). Open one for its biggest folders."
      phone={phone}
    >
      <ul className={cn("divide-y divide-border", phone ? "-mx-4" : "-mx-2")}>
        {rows.map((s) => {
          const u = s.usage
          const disk = diskNote(s)
          const details = (
            <>
              <span className="flex items-baseline gap-2">
                <span className="truncate font-medium">{s.name}</span>
                {u?.partial && (
                  <span className="shrink-0 text-caption text-warning">
                    Partial
                  </span>
                )}
              </span>
              {u ? (
                <>
                  <span className="mt-1.5 block">
                    <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{
                          width: `${Math.max(1, (u.used_bytes / max) * 100)}%`,
                        }}
                      />
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-caption text-ash">
                    {countOf(u.files, "file")}
                    {s.growth !== null &&
                      ` · ${formatGrowth(s.growth, formatSize)} in ${rangeLabels[range]}`}
                    {!phone && ` · measured ${timeAgo(u.measured_at)}`}
                  </span>
                </>
              ) : (
                <span className="mt-0.5 block text-caption text-ash">
                  Not measured yet
                </span>
              )}
            </>
          )
          return (
            <li
              key={s.id}
              className={cn("flex items-center gap-3", phone ? "px-4" : "px-2")}
            >
              <button
                type="button"
                onClick={() => onOpen(s.id)}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-3 py-3 text-start outline-none",
                  phone
                    ? "active:bg-muted"
                    : "rounded-lg hover:text-brand focus-visible:text-brand",
                )}
              >
                <ProtocolTile
                  protocol={s.protocol as Protocol}
                  className={cn(
                    "shrink-0 rounded-md",
                    phone ? "size-8" : "size-7",
                  )}
                />
                <span className="min-w-0 flex-1 text-body-sm">{details}</span>
                <span
                  className={cn(
                    "flex shrink-0 flex-col items-end gap-1 text-end",
                    !phone && "w-28",
                  )}
                >
                  <span className="text-body-sm font-medium tabular-nums">
                    {u ? formatSize(u.used_bytes) : "—"}
                  </span>
                  {disk && !phone && (
                    <span className="w-full" title={disk.text}>
                      <Meter
                        value={disk.percent}
                        label={disk.text}
                        className="h-1.5"
                      />
                    </span>
                  )}
                </span>
              </button>
              {!phone && <MeasureButton storage={s} />}
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

function Changes({
  data,
  model,
  phone,
}: {
  data: StorageInsights
  model: Model
  phone: boolean
}) {
  const names = new Map(model.storages.map((s) => [s.id, s.name]))
  return (
    <Section
      title="Status changes"
      caption="When a storage went down or came back."
      phone={phone}
    >
      {data.events.length === 0 ? (
        <Quiet>No storage changed status in this range.</Quiet>
      ) : (
        <EventList
          phone={phone}
          events={data.events.map((e) => {
            const to = statusOf(e.status)
            return {
              key: `${e.storage_id}-${e.at}`,
              dot: <StatusDot status={to} />,
              title: (
                <>
                  <span className="font-medium">
                    {names.get(e.storage_id) ?? "Storage"}
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
  const rows = model.storages
    .filter((s) => s.activity.ok + s.activity.failed > 0)
    .sort(
      (a, b) =>
        b.activity.bytes - a.activity.bytes ||
        b.activity.ok + b.activity.failed - (a.activity.ok + a.activity.failed),
    )
    .slice(0, 6)
  const max = Math.max(1, ...rows.map((s) => s.activity.bytes))
  return (
    <Section
      title="Busiest storages"
      caption="By data moved in or out (a transfer counts for both ends)."
      phone={phone}
    >
      {rows.length === 0 ? (
        <Quiet>Nothing used a storage in this range.</Quiet>
      ) : (
        <BarList
          phone={phone}
          rows={rows.map((s) => {
            const runs = s.activity.ok + s.activity.failed
            return {
              id: s.id,
              name: s.name,
              href: `/storage/${s.id}`,
              value: formatSize(s.activity.bytes),
              share: s.activity.bytes / max,
              note: (
                <>
                  {runs} {runs === 1 ? "run" : "runs"}
                  {s.activity.failed > 0 && (
                    <span className="text-destructive">
                      {" "}
                      · {s.activity.failed} failed
                    </span>
                  )}
                </>
              ),
            }
          })}
        />
      )}
    </Section>
  )
}
