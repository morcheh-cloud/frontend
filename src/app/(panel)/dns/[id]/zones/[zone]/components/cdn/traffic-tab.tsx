"use client"

import { BarChart3 } from "lucide-react"
import { parseAsStringLiteral, useQueryState } from "nuqs"

import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import {
  type Buckets,
  bucketLabel,
  MultiLineChart,
} from "@/components/charts/time-chart"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type { CDNReport, DNSServer } from "@/lib/services"
import { cn } from "@/lib/utils"
import { type CdnPeriod, useCdnReport } from "../../../../../api"
import { compact } from "./meta"
import { Choices, SettingCard } from "./parts"

const periods = ["1h", "24h", "7d", "30d"] as const

export const periodParser = parseAsStringLiteral(periods).withDefault("24h")

function bucketsOf(r: CDNReport): Buckets {
  const starts = r.times.map((t) => Date.parse(t))
  const size = starts.length > 1 ? starts[1] - starts[0] : 3_600_000
  return { starts, size }
}

const pct = (part: number, total: number) =>
  total > 0 ? `${Math.round((part / total) * 100)}%` : "—"

export function TrafficTab({
  server,
  zone,
  active,
  phone,
}: {
  server: DNSServer
  zone: string
  active: boolean
  phone: boolean
}) {
  const [period, setPeriod] = useQueryState("period", periodParser)
  const q = useCdnReport(server.id, zone, period as CdnPeriod)
  const r = q.data

  const head = (
    <div className={cn("flex items-center gap-3", phone && "px-4 pt-3")}>
      <Choices
        label="Period"
        value={period}
        onChange={(v) => setPeriod(v)}
        items={periods.map((p) => ({ value: p, label: p }))}
      />
      <span className="ms-auto text-caption text-ash">
        {q.isFetching ? "Reading…" : "From ArvanCloud"}
      </span>
    </div>
  )

  if (!active) {
    return (
      <div className="flex flex-col gap-4">
        <Empty
          icon={BarChart3}
          title="No traffic yet"
          body="Numbers show once the domain is active at ArvanCloud and a record goes through the CDN."
        />
      </div>
    )
  }
  if (q.isPending) {
    return (
      <div className="flex flex-col gap-4">
        {head}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }
  if (!r) {
    return (
      <div className="flex flex-col gap-4">
        {head}
        <Empty
          icon={BarChart3}
          title="Couldn't read the traffic"
          body={(q.error as Error | null)?.message ?? ""}
        />
      </div>
    )
  }
  const b = bucketsOf(r)
  const codes = [...r.status_codes].sort((x, y) => y.count - x.count)
  const codeTotal = codes.reduce((n, c) => n + c.count, 0)
  const errors = codes
    .filter((c) => c.code.startsWith("5"))
    .reduce((n, c) => n + c.count, 0)

  const tiles = [
    { label: "Requests", value: compact(r.requests.total), note: `${period}` },
    {
      label: "Served from cache",
      value: pct(r.requests.cached, r.requests.total),
      note: `${compact(r.requests.cached)} requests`,
    },
    {
      label: "Data sent",
      value: formatSize(r.traffic.total),
      note: `${period}`,
    },
    {
      label: "Origin spared",
      value: formatSize(r.traffic.cached),
      note: `${pct(r.traffic.cached, r.traffic.total)} of the data`,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {head}
      <dl
        className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", phone && "px-4")}
      >
        {tiles.map((t) => (
          <div
            key={t.label}
            className="flex min-w-0 flex-col gap-1 rounded-2xl border border-border p-4"
          >
            <dt className="truncate text-caption text-muted-foreground">
              {t.label}
            </dt>
            <dd className="truncate text-subheading font-light tabular-nums">
              {t.value}
            </dd>
            <dd className="truncate text-caption text-ash">{t.note}</dd>
          </div>
        ))}
      </dl>
      <div
        className={cn(
          "grid min-w-0 gap-4",
          !phone && "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
        )}
      >
        <div className={cn("flex min-w-0 flex-col", !phone && "gap-4")}>
          <SettingCard
            phone={phone}
            title="Requests"
            hint="All requests, and the share the cache answered (grey)."
            className="[contain:inline-size]"
          >
            <MultiLineChart
              buckets={b}
              label="Requests over time"
              format={(v) => compact(v)}
              series={[
                { key: "total", values: r.requests_total },
                { key: "cached", values: r.requests_cached, tone: "quiet" },
              ]}
              tooltip={(i) => (
                <>
                  <p className="font-medium">{bucketLabel(b, i)}</p>
                  <p>{compact(r.requests_total[i] ?? 0)} requests</p>
                  <p className="text-muted-foreground">
                    {compact(r.requests_cached[i] ?? 0)} from cache
                  </p>
                </>
              )}
            />
          </SettingCard>
          <SettingCard
            phone={phone}
            title="Data"
            hint="Bytes sent to visitors, and what the cache saved the origin (grey)."
            className="[contain:inline-size]"
          >
            <MultiLineChart
              buckets={b}
              label="Data over time"
              format={(v) => formatSize(v)}
              series={[
                { key: "total", values: r.traffic_total },
                { key: "cached", values: r.traffic_cached, tone: "quiet" },
              ]}
              tooltip={(i) => (
                <>
                  <p className="font-medium">{bucketLabel(b, i)}</p>
                  <p>{formatSize(r.traffic_total[i] ?? 0)} sent</p>
                  <p className="text-muted-foreground">
                    {formatSize(r.traffic_cached[i] ?? 0)} from cache
                  </p>
                </>
              )}
            />
          </SettingCard>
        </div>
        <SettingCard
          phone={phone}
          title="Status codes"
          hint={
            codeTotal > 0
              ? `${pct(errors, codeTotal)} server errors (5xx).`
              : "What the answers were."
          }
        >
          {codes.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              Not in this plan, or no answers yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {codes.map((c) => {
                const share = codeTotal ? c.count / codeTotal : 0
                const tone = c.code.startsWith("5")
                  ? "bg-destructive"
                  : c.code.startsWith("4")
                    ? "bg-warning"
                    : "bg-brand"
                return (
                  <li key={c.code} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2 text-body-sm">
                      <span className="font-mono font-medium">{c.code}</span>
                      <span className="text-caption text-muted-foreground tabular-nums">
                        {compact(c.count)} · {pct(c.count, codeTotal)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", tone)}
                        style={{ width: `${Math.max(share * 100, 1)}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </SettingCard>
      </div>
    </div>
  )
}
