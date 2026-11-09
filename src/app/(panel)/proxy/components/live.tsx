"use client"

import type { ReactNode } from "react"

import { timeAgo } from "@/app/(panel)/servers/components/meta"
import {
  bucketLabel,
  buckets,
  ColumnChart,
  Legend,
  Tip,
} from "@/components/charts/time-chart"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type { ProxyHostTraffic, ProxyTraffic } from "@/lib/services"
import { cn } from "@/lib/utils"

// Live numbers: the per-minute traffic the backend reads from each proxy's
// access log, drawn small on each site card of /proxy and added up for the
// panel on a proxy's own page.

export const sum = (xs: number[] | undefined) =>
  (xs ?? []).reduce((a, b) => a + b, 0)

// Per-minute series added up; the last minute is still running, so it's
// left out of charts and "now" (but counted in the totals).
export function sumTraffic(list: ProxyHostTraffic[]) {
  const n = Math.max(0, ...list.map((t) => t.requests.length))
  const add = (pick: (t: ProxyHostTraffic) => number[]) =>
    Array.from({ length: n }, (_, i) =>
      list.reduce((a, t) => a + (pick(t)[i] ?? 0), 0),
    )
  const requests = add((t) => t.requests)
  const serverErrors = add((t) => t.server_errors)
  const clientErrors = add((t) => t.client_errors)
  const bytes = add((t) => t.bytes)
  const full = requests.slice(0, -1)
  return {
    requests: full,
    serverErrors: serverErrors.slice(0, -1),
    clientSeries: clientErrors.slice(0, -1),
    bytesSeries: bytes.slice(0, -1),
    total: sum(requests),
    errors: sum(serverErrors),
    clientErrors: sum(clientErrors),
    bytes: sum(bytes),
    now: full.at(-1) ?? 0,
    average: full.length ? sum(full) / full.length : 0,
  }
}

export type TrafficSum = ReturnType<typeof sumTraffic>

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})
export const count = (n: number) =>
  n < 10_000 ? Math.round(n).toLocaleString("en") : compact.format(n)

export function rate(errors: number, total: number) {
  if (total === 0 || errors === 0) return "0%"
  const pct = (errors / total) * 100
  return pct < 0.1 ? "<0.1%" : `${pct.toFixed(pct < 10 ? 1 : 0)}%`
}

export const errorTone = (errors: number, total: number) => {
  const pct = total ? (errors / total) * 100 : 0
  return pct >= 5 ? "destructive" : pct >= 1 ? "warning" : "muted"
}

const toneText = {
  destructive: "text-destructive",
  warning: "text-warning",
  muted: undefined,
} as const

export function Sparkline({
  values,
  tone = "brand",
  className,
}: {
  values: number[]
  tone?: "brand" | "destructive" | "muted"
  className?: string
}) {
  if (values.length < 2) return <div className={className} />
  const max = Math.max(1, ...values)
  const points = values.map((v, i) => [
    (i / (values.length - 1)) * 100,
    96 - (v / max) * 88,
  ])
  const line = points
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ")
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("overflow-visible", className)}
    >
      <path
        d={`${line} L100,100 L0,100 Z`}
        className={cn(
          tone === "brand" && "fill-brand/10",
          tone === "destructive" && "fill-destructive/10",
          tone === "muted" && "fill-ash/10",
        )}
      />
      <path
        d={line}
        fill="none"
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className={cn(
          tone === "brand" && "stroke-brand",
          tone === "destructive" && "stroke-destructive",
          tone === "muted" && "stroke-ash",
        )}
      />
    </svg>
  )
}

const fills = {
  ok: "fill-brand",
  client: "fill-ash",
  server: "fill-destructive",
}
const swatches = {
  ok: "bg-brand",
  client: "bg-ash",
  server: "bg-destructive",
}

// ---- the proxy page's panel ----

type Metric = {
  key: string
  label: string
  swatch?: string
  value: string
  valueClass?: string
  sub: string
}

// The four numbers of a proxy: how much, how fast, how much failed, how
// much was sent.
export function liveMetrics(
  s: TrafficSum,
  stream: boolean,
  minutes: number,
): Metric[] {
  const tone = errorTone(s.errors, s.total)
  return [
    {
      key: "total",
      label: stream ? "Connections" : "Requests",
      swatch: swatches.ok,
      value: count(s.total),
      sub: `in the last ${minutes} minutes`,
    },
    {
      key: "now",
      label: "Per minute",
      value: count(s.now),
      sub:
        s.total > 0
          ? `${count(s.average)} on average`
          : "in the last full minute",
    },
    {
      key: "errors",
      label: stream ? "Failed" : "Server errors",
      swatch: swatches.server,
      value: rate(s.errors, s.total),
      valueClass: toneText[tone],
      sub: stream
        ? `${count(s.errors)} couldn't reach the target`
        : `${count(s.errors)} × 5xx, ${count(s.clientErrors)} × 4xx`,
    },
    {
      key: "bytes",
      label: "Sent",
      value: formatSize(s.bytes),
      sub:
        s.total > 0
          ? `${formatSize(s.bytes / Math.max(1, s.total))} per ${stream ? "connection" : "request"}`
          : stream
            ? "back to clients"
            : "to visitors",
    },
  ]
}

// "● Live · last 30 min", or why there are no live numbers.
export function LiveState({
  data,
  error,
  note,
  noteTitle,
  compact,
}: {
  data?: ProxyTraffic
  error?: Error | null
  // Just "● Live", the rest in the tooltip.
  compact?: boolean
  // e.g. "2 proxies not read"
  note?: string
  noteTitle?: string
}) {
  if (error && !data) {
    return (
      <span className="text-caption text-ash" title={error.message}>
        Live numbers unavailable
      </span>
    )
  }
  const collected = data?.sources
    .map((s) => s.collected_at)
    .filter(Boolean)
    .sort()
    .at(-1)
  return (
    <span className="inline-flex items-center gap-1.5 text-caption whitespace-nowrap text-ash">
      <span
        className="inline-flex items-center gap-1.5"
        title={
          [
            compact &&
              `Live numbers from the last ${data?.minutes ?? 30} minutes`,
            collected && `Read ${timeAgo(collected)}`,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
      >
        <span className="relative flex size-2">
          {data && (
            <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
          )}
          <span
            className={cn(
              "relative size-2 rounded-full",
              data ? "bg-success" : "bg-mist",
            )}
          />
        </span>
        <span className="font-medium text-foreground">Live</span>
        {!compact && `last ${data?.minutes ?? 30} min`}
      </span>
      {note && (
        <span className="text-warning" title={noteTitle}>
          · {note}
        </span>
      )}
    </span>
  )
}

// Phones: the four numbers as a 2×2 grid of rows, then a column per minute.
export function LiveTiles({
  s,
  stream,
  minutes,
  pending,
}: {
  s: TrafficSum
  stream: boolean
  minutes: number
  pending: boolean
}) {
  return (
    <>
      <dl className="grid grid-cols-2 border-y border-border">
        {liveMetrics(s, stream, minutes).map((m, i) => (
          <div
            key={m.key}
            className={cn(
              "flex min-w-0 flex-col gap-0.5 p-4",
              i % 2 === 0 && "border-e border-border",
              i < 2 && "border-b border-border",
            )}
          >
            <dt className="flex items-center gap-1.5 text-caption text-muted-foreground">
              {m.swatch && (
                <span className={cn("size-2 rounded-[2px]", m.swatch)} />
              )}
              {m.label}
            </dt>
            <dd
              className={cn(
                "text-subheading font-medium tabular-nums",
                m.valueClass,
              )}
            >
              {pending ? "–" : m.value}
            </dd>
            <dd className="truncate text-caption text-ash">{m.sub}</dd>
          </div>
        ))}
      </dl>
      {!pending && (
        <MiniBars
          requests={
            s.requests.length
              ? s.requests
              : Array.from({ length: minutes }, () => 0)
          }
          errors={s.serverErrors}
          className="h-14 border-b border-border px-4 py-3"
        />
      )}
    </>
  )
}

// One panel: the four numbers beside a column per minute, answers that
// went fine at the bottom, 4xx above them and 5xx on top.
export function LivePanel({
  s,
  stream,
  minutes,
  start,
  pending,
  state,
}: {
  s: TrafficSum
  stream: boolean
  minutes: number
  start?: string
  pending: boolean
  // "● Live" and when it was read.
  state: ReactNode
}) {
  const unit = stream ? "connections" : "requests"
  const metrics = liveMetrics(s, stream, minutes)

  // Nothing read yet: an empty half hour, so the time axis still shows.
  const n = s.requests.length || minutes
  const from = start ? Date.parse(start) : Date.now() - n * 60_000
  const b = buckets(
    new Date(from).toISOString(),
    new Date(from + n * 60_000).toISOString(),
    60,
  )
  const ok = s.requests.map((r, i) =>
    Math.max(
      0,
      r - (s.serverErrors[i] ?? 0) - (stream ? 0 : (s.clientSeries[i] ?? 0)),
    ),
  )
  const stacks = [
    { key: "ok", fill: fills.ok, values: ok },
    ...(stream
      ? []
      : [{ key: "client", fill: fills.client, values: s.clientSeries }]),
    { key: "server", fill: fills.server, values: s.serverErrors },
  ]
  const legend = [
    { label: stream ? "Connected" : "Answered", swatch: swatches.ok },
    ...(stream ? [] : [{ label: "4xx", swatch: swatches.client }]),
    { label: stream ? "Failed" : "5xx", swatch: swatches.server },
  ]

  return (
    <section
      aria-label="Live numbers"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-5 py-3">
        {state}
        <span className="ms-auto">
          <Legend items={legend} />
        </span>
      </header>
      <div className="grid xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <dl className="grid grid-cols-4 divide-border max-xl:divide-x max-xl:border-b max-xl:border-border xl:grid-cols-2 xl:border-e xl:border-border">
          {metrics.map((m, i) => (
            <div
              key={m.key}
              className={cn(
                "flex min-w-0 flex-col gap-1.5 px-5 py-4",
                "xl:border-border xl:py-5",
                i % 2 === 0 && "xl:border-e",
                i < 2 && "xl:border-b",
              )}
            >
              <dt className="flex items-center gap-1.5 text-caption text-muted-foreground">
                {m.swatch && (
                  <span className={cn("size-2 rounded-[2px]", m.swatch)} />
                )}
                {m.label}
              </dt>
              <dd className="flex flex-col gap-1">
                {pending ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <span
                    className={cn(
                      "truncate text-heading leading-none font-light tabular-nums",
                      m.valueClass,
                    )}
                  >
                    {m.value}
                  </span>
                )}
                <span className="truncate text-caption text-ash">{m.sub}</span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="relative min-w-0 px-3 pt-4 pb-2">
          {pending ? (
            <Skeleton className="mx-2 h-[176px]" />
          ) : (
            <>
              <ColumnChart
                buckets={b}
                stacks={stacks}
                format={count}
                height={184}
                label={`${stream ? "Connections" : "Requests"} per minute, last ${minutes} minutes`}
                tooltip={(i) => (
                  <Tip
                    title={bucketLabel(b, i)}
                    rows={[
                      {
                        label: stream ? "Connections" : "Requests",
                        value: count(s.requests[i] ?? 0),
                        swatch: swatches.ok,
                      },
                      ...(stream
                        ? []
                        : [
                            {
                              label: "4xx",
                              value: count(s.clientSeries[i] ?? 0),
                              swatch: swatches.client,
                            },
                          ]),
                      {
                        label: stream ? "Failed" : "5xx",
                        value: count(s.serverErrors[i] ?? 0),
                        swatch: swatches.server,
                      },
                      {
                        label: "Sent",
                        value: formatSize(s.bytesSeries[i] ?? 0),
                      },
                    ]}
                  />
                )}
              />
              {s.total === 0 && (
                <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-body-sm text-ash">
                  No {unit} in the last {minutes} minutes
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

// ---- a site card's numbers ----

// A thin column per minute: 5xx on top in red, an empty minute a stub.
export function MiniBars({
  requests,
  errors,
  className,
}: {
  requests: number[]
  errors: number[]
  className?: string
}) {
  const max = Math.max(1, ...requests)
  return (
    <div aria-hidden className={cn("flex h-12 items-end gap-[3px]", className)}>
      {requests.map((r, i) => {
        const e = Math.min(r, errors[i] ?? 0)
        const height = r > 0 ? Math.max(8, (r / max) * 100) : 0
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: one per minute
            key={i}
            className="flex h-full min-w-px flex-1 flex-col justify-end"
          >
            {r > 0 ? (
              <span
                className="flex flex-col overflow-hidden rounded-t-[3px] bg-brand"
                style={{ height: `${height}%` }}
              >
                {e > 0 && (
                  <span
                    className="bg-destructive"
                    style={{ height: `${Math.max(12, (e / r) * 100)}%` }}
                  />
                )}
              </span>
            ) : (
              <span className="h-[3px] rounded-full bg-muted" />
            )}
          </span>
        )
      })}
    </div>
  )
}

// The four small numbers on a site card.
export function SiteNumbers({
  t,
  stream,
  minutes,
}: {
  t: ProxyHostTraffic
  stream: boolean
  minutes: number
}) {
  const series = t.requests.slice(0, -1)
  const total = sum(t.requests)
  const errors = sum(t.server_errors)
  const tone = errorTone(errors, total)
  const items = [
    {
      key: "now",
      label: "Per minute",
      value: count(series.at(-1) ?? 0),
    },
    { key: "total", label: `Last ${minutes} min`, value: count(total) },
    {
      key: "errors",
      label: stream ? "Failed" : "5xx",
      value: rate(errors, total),
      className: errors > 0 ? toneText[tone] : undefined,
    },
    { key: "bytes", label: "Sent", value: formatSize(sum(t.bytes)) },
  ]
  return (
    <dl className="grid grid-cols-4 gap-3">
      {items.map((x) => (
        <div key={x.key} className="flex min-w-0 flex-col gap-0.5">
          <dt className="truncate text-caption text-ash">{x.label}</dt>
          <dd
            className={cn(
              "truncate text-body font-medium tabular-nums",
              x.className,
            )}
          >
            {x.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
