"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { bucketLabel, LineChart, Tip } from "@/components/charts/time-chart"
import {
  formatCount,
  formatGrowth,
  formatMs,
  formatPercent,
  formatRate,
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
import type { DatabaseInsights } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useDatabaseInsights } from "../../api"
import {
  type DbStatus,
  type Engine,
  EngineTile,
  type Health,
  HealthDot,
  stateOf,
  useDatabasesFilters,
} from "../meta"
import { buildModel, type DatabaseModel, type Model } from "./model"

function useInsights() {
  const { filters, setFilters } = useDatabasesFilters()
  const query = useDatabaseInsights(filters.range)
  const model = useMemo(
    () => (query.data ? buildModel(query.data) : null),
    [query.data],
  )
  return {
    range: filters.range,
    setRange: (range: InsightsRange) => setFilters({ range }),
    query,
    model,
  }
}

export function DatabaseInsightsControls({ phone }: { phone: boolean }) {
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

export function DatabaseInsightsBody({ phone }: { phone: boolean }) {
  const { range, query, model } = useInsights()

  if (query.isPending) return <InsightsLoading phone={phone} />
  if (!model || !query.data)
    return <InsightsError error={query.error} onRetry={() => query.refetch()} />
  if (model.databases.length === 0)
    return <Quiet>No databases watched in this workspace yet.</Quiet>

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
          items={model.databases}
          all={model.all}
          noun="databases"
          caption="How long the monitor took to connect and read, when it got through."
          phone={phone}
        />
        <LoadChart model={model} phone={phone} />
      </div>
      <div className={cn(!phone && "grid gap-4 xl:grid-cols-2")}>
        <Sizes model={model} range={range} phone={phone} />
        <Busiest model={model} phone={phone} />
      </div>
      <Problems data={query.data} model={model} phone={phone} />
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
  const down = t.watched - t.online
  return (
    <Tiles
      phone={phone}
      className="lg:grid-cols-3 2xl:grid-cols-6"
      tiles={[
        {
          label: "Online",
          value: `${t.online} of ${t.watched}`,
          note: down
            ? `${down} not online`
            : model.databases.length > t.watched
              ? `${model.databases.length - t.watched} paused`
              : "All of them",
          warn: down > 0,
        },
        {
          label: "Availability",
          value: t.samples
            ? formatPercent((t.samples - t.failures) / t.samples)
            : "—",
          note: t.samples
            ? `${formatCount(t.samples)} checks in ${rangeLabels[range]}`
            : "No checks yet",
        },
        {
          label: "Avg response",
          value: t.latency === null ? "—" : formatMs(t.latency),
          note: "Connect and read",
        },
        {
          label: "Queries/s",
          value: t.qps === null ? "—" : formatRate(t.qps),
          note: t.qps === null ? "Not read yet" : "All together, on average",
        },
        {
          label: "Total size",
          value: t.size === null ? "—" : formatSize(t.size),
          note:
            t.size === null
              ? "Not measured yet"
              : t.growth !== null
                ? `${formatGrowth(t.growth, formatSize)} in ${rangeLabels[range]}`
                : `${t.sized} measured`,
        },
        {
          label: "Need a look",
          value: String(t.problems),
          note: t.problems ? "Down or a check failing" : "Every check passes",
          warn: t.problems > 0,
        },
      ]}
    />
  )
}

function DatabaseName({
  database: d,
  phone,
}: {
  database: DatabaseModel
  phone?: boolean
}) {
  const state = {
    paused: d.paused,
    status: d.status as DbStatus,
    health: d.health as Health,
  }
  return (
    <Link
      href={`/databases/${d.id}`}
      className="flex min-w-0 items-center gap-2.5 outline-none hover:text-brand focus-visible:text-brand"
    >
      <EngineTile
        engine={d.engine as Engine}
        flavor={d.flavor}
        className={cn("shrink-0 rounded-md", phone ? "size-8" : "size-7")}
      />
      <span className="truncate font-medium">{d.name}</span>
      <HealthDot database={state} />
      <span className="sr-only">{stateOf(state).label}</span>
    </Link>
  )
}

function Availability({ model, phone }: { model: Model; phone: boolean }) {
  return (
    <AvailabilitySection
      buckets={model.buckets}
      noun="Database"
      columns={["Avg", "p95"]}
      phone={phone}
      rows={model.databases.map((d) => ({
        id: d.id,
        label: d.name,
        name: <DatabaseName database={d} phone={phone} />,
        series: d.series,
        strip: d.strip,
        uptime: d.uptime,
        values: [
          d.latency_avg === null ? "—" : formatMs(d.latency_avg),
          d.latency_p95 === null ? "—" : formatMs(d.latency_p95),
        ],
        caption: d.paused
          ? "Paused"
          : d.latency_avg === null
            ? "Didn't answer in this range"
            : `Avg ${formatMs(d.latency_avg)} · p95 ${formatMs(d.latency_p95 ?? 0)}`,
      }))}
    />
  )
}

function LoadChart({ model, phone }: { model: Model; phone: boolean }) {
  const [view, setView] = useState<"qps" | "conn">("qps")
  const { item, value, setPicked } = usePicked(model.databases)
  const l = item?.load ?? model.allLoad
  const b = model.buckets
  const values = view === "qps" ? l.qps : l.connections
  const any = values.some((v) => v !== null)
  const who = item?.name ?? "all databases"
  return (
    <Section
      title="Load"
      caption={
        view === "qps"
          ? "Queries (or commands) per second, averaged over each block."
          : "The most connections open at once in each block."
      }
      actions={
        <div
          className={cn("flex flex-wrap items-center gap-2", phone && "w-full")}
        >
          <Segmented
            label="Show"
            value={view}
            onChange={setView}
            items={[
              { value: "qps", label: "Queries/s" },
              { value: "conn", label: "Connections" },
            ]}
          />
          <div className={cn(phone && "w-full")}>
            <ItemPicker
              items={model.databases}
              value={value}
              onChange={setPicked}
              phone={phone}
              label="Database"
              allLabel="All databases"
            />
          </div>
        </div>
      }
      phone={phone}
    >
      {any ? (
        <LineChart
          buckets={b}
          values={values}
          format={view === "qps" ? formatRate : (v) => formatCount(v)}
          label={`${view === "qps" ? "Queries per second" : "Connections"} of ${who}`}
          tooltip={(i) => (
            <Tip
              title={bucketLabel(b, i)}
              rows={
                values[i] === null
                  ? [{ label: "Read", value: "Not read" }]
                  : view === "qps"
                    ? [{ label: "Queries/s", value: formatRate(l.qps[i] ?? 0) }]
                    : [
                        {
                          label: "Connections",
                          value:
                            l.maxConnections[i] !== null
                              ? `${formatCount(l.connections[i] ?? 0)} of ${formatCount(l.maxConnections[i] ?? 0)}`
                              : formatCount(l.connections[i] ?? 0),
                        },
                      ]
              }
            />
          )}
        />
      ) : (
        <Quiet>
          {item
            ? `Nothing was read from ${item.name} in this range.`
            : "Nothing was read in this range yet."}
        </Quiet>
      )}
    </Section>
  )
}

function Sizes({
  model,
  range,
  phone,
}: {
  model: Model
  range: InsightsRange
  phone: boolean
}) {
  const rows = model.databases
    .filter((d) => d.size_bytes !== null)
    .sort((a, b) => (b.size_bytes ?? 0) - (a.size_bytes ?? 0))
  const max = Math.max(1, ...rows.map((d) => d.size_bytes ?? 0))
  return (
    <Section
      title="Size"
      caption="Data on disk, from the last check, and how much it grew."
      phone={phone}
    >
      {rows.length === 0 ? (
        <Quiet>No database's size has been read yet.</Quiet>
      ) : (
        <BarList
          phone={phone}
          rows={rows.map((d) => ({
            id: d.id,
            name: d.name,
            href: `/databases/${d.id}`,
            value: formatSize(d.size_bytes ?? 0),
            share: (d.size_bytes ?? 0) / max,
            note:
              d.growth === null
                ? "One measurement so far"
                : `${formatGrowth(d.growth, formatSize)} in ${rangeLabels[range]}`,
          }))}
        />
      )}
    </Section>
  )
}

function Busiest({ model, phone }: { model: Model; phone: boolean }) {
  const rows = model.databases
    .filter((d) => d.qps_avg !== null && d.qps_avg > 0)
    .sort((a, b) => (b.qps_avg ?? 0) - (a.qps_avg ?? 0))
    .slice(0, 6)
  const max = Math.max(...rows.map((d) => d.qps_avg ?? 0), 0.0001)
  return (
    <Section
      title="Busiest databases"
      caption="By average queries per second."
      phone={phone}
    >
      {rows.length === 0 ? (
        <Quiet>No queries were counted in this range.</Quiet>
      ) : (
        <BarList
          phone={phone}
          rows={rows.map((d) => {
            const extra = [
              d.qps_max !== null ? `peak ${formatRate(d.qps_max)}/s` : null,
              d.connections_max !== null
                ? `up to ${formatCount(d.connections_max)} connections`
                : null,
              d.cache_hit !== null
                ? `${formatPercent(d.cache_hit)} from memory`
                : null,
            ].filter(Boolean)
            return {
              id: d.id,
              name: d.name,
              href: `/databases/${d.id}`,
              value: `${formatRate(d.qps_avg ?? 0)}/s`,
              share: (d.qps_avg ?? 0) / max,
              note: extra.join(" · ") || undefined,
            }
          })}
        />
      )}
    </Section>
  )
}

const severityDot: Record<string, string> = {
  critical: "bg-destructive",
  warning: "bg-warning",
  ok: "bg-success",
}

function Problems({
  data,
  model,
  phone,
}: {
  data: DatabaseInsights
  model: Model
  phone: boolean
}) {
  const names = new Map(model.databases.map((d) => [d.id, d.name]))
  return (
    <Section
      title="Problems"
      caption="Checks that started failing, and when they recovered."
      phone={phone}
    >
      {data.events.length === 0 ? (
        <Quiet>No problem in this range.</Quiet>
      ) : (
        <EventList
          phone={phone}
          events={data.events.map((e) => ({
            key: `${e.database_id}-${e.at}-${e.check_id}`,
            dot: (
              <span
                className={cn(
                  "size-2 rounded-full",
                  severityDot[e.severity] ?? "bg-mist",
                )}
              >
                <span className="sr-only">
                  {e.severity === "ok" ? "Recovered" : e.severity}
                </span>
              </span>
            ),
            title: (
              <>
                <span className="font-medium">
                  {names.get(e.database_id) ?? "Database"}
                </span>{" "}
                <span className="text-muted-foreground">{e.title}</span>
              </>
            ),
            detail: e.detail,
            at: e.at,
          }))}
        />
      )}
    </Section>
  )
}
