"use client"

import { BarChart3, RefreshCw, TriangleAlert } from "lucide-react"
import { usePathname } from "next/navigation"
import { useQueryState } from "nuqs"
import { type ReactNode, useState } from "react"

import { Callout } from "@/app/(panel)/cronjobs/components/editor-parts"
import { Empty, Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import {
  type Buckets,
  bucketLabel,
  ColumnChart,
  Legend,
  LineChart,
  Tip,
} from "@/components/charts/time-chart"
import {
  countOf,
  formatCount,
  formatMs,
  formatPercent,
} from "@/components/insights/format"
import {
  type Bar,
  BarList,
  InsightsLoading,
  Quiet,
  Section,
  type Tile,
  Tiles,
} from "@/components/insights/parts"
import { Button } from "@/components/ui/button"
import { formatSize } from "@/lib/format"
import type {
  ProxyHost,
  ProxyReportCount,
  ProxyReportPath,
  Proxy as ReverseProxy,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { type HostReport, type ReportRange, useHostReport } from "../../../api"
import { NoLog, OldFormatNotice, shortDate } from "./log-notices"
import {
  logsHref,
  type RequestFilters,
  reportRangeParser,
} from "./request-filters"

// A full report on one site, worked out from its access log (rotated files
// included): totals against the period before, requests and response times
// over time, and who asked for what.

const rangeItems: { value: ReportRange; label: string; short: string }[] = [
  { value: "1h", label: "Last hour", short: "1h" },
  { value: "24h", label: "24 hours", short: "24h" },
  { value: "7d", label: "7 days", short: "7d" },
  { value: "30d", label: "30 days", short: "30d" },
]

const before: Record<ReportRange, string> = {
  "1h": "the hour before",
  "24h": "the day before",
  "7d": "the week before",
  "30d": "",
}

// Colors of the request classes, as on the proxy's live numbers.
const classes = [
  { key: "ok", label: "Success", fill: "fill-brand", swatch: "bg-brand" },
  {
    key: "redirects",
    label: "Redirects",
    fill: "fill-brand/40",
    swatch: "bg-brand/40",
  },
  {
    key: "client_errors",
    label: "Client errors",
    fill: "fill-ash",
    swatch: "bg-ash",
  },
  {
    key: "server_errors",
    label: "Server errors",
    fill: "fill-destructive",
    swatch: "bg-destructive",
  },
] as const

export function ReportTab({
  proxy: p,
  host,
  phone,
  rewrite,
  rewriting,
}: {
  proxy: ReverseProxy
  host: ProxyHost
  phone: boolean
  rewrite?: () => void
  rewriting?: boolean
}) {
  const [range, setRange] = useQueryState(
    "period",
    reportRangeParser.withOptions({ history: "replace", scroll: false }),
  )
  const query = useHostReport(p.id, host.id, range)
  const [refreshing, setRefreshing] = useState(false)
  const r = query.data
  const stream = host.config.type === "stream"

  const refresh = async () => {
    setRefreshing(true)
    try {
      await query.refresh()
    } catch {
      // The error shows from the query.
    } finally {
      setRefreshing(false)
    }
  }

  const bar = (
    <div
      className={cn(
        "flex items-center gap-3",
        phone && "border-b border-border px-4 py-3",
      )}
    >
      <Segmented
        label="Period"
        value={range}
        onChange={(v) => setRange(v === "24h" ? null : v)}
        items={rangeItems.map((i) => ({
          value: i.value,
          label: phone ? i.short : i.label,
        }))}
      />
      {!phone && r && (
        <span className="truncate text-caption text-ash">
          {query.isPlaceholderData
            ? "Reading the log…"
            : `Read ${new Date(r.generated).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })} from ${p.kind_label}'s log`}
        </span>
      )}
      <span className="flex-1" />
      <Button
        variant="ghost"
        size={phone ? "icon-lg" : "icon"}
        aria-label="Read the log again"
        title="Read the log again"
        disabled={refreshing || query.isFetching}
        onClick={refresh}
      >
        <RefreshCw
          className={cn((refreshing || query.isFetching) && "animate-spin")}
        />
      </Button>
    </div>
  )

  let body: ReactNode
  if (!r) {
    body = query.error ? (
      <Empty
        icon={TriangleAlert}
        title="Couldn't read the log"
        body={query.error.message}
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        }
      />
    ) : (
      <InsightsLoading phone={phone} />
    )
  } else if (r.missing) {
    body = <NoLog stream={stream} />
  } else {
    body = (
      <Report
        r={r}
        range={range}
        stream={stream}
        phone={phone}
        multiDomain={host.domains.length > 1}
        rewrite={rewrite}
        rewriting={rewriting}
      />
    )
  }

  return (
    <div className={cn("flex min-w-0 flex-col", !phone && "gap-4")}>
      {bar}
      <div
        className={cn(
          "transition-opacity",
          query.isPlaceholderData && "opacity-60",
        )}
      >
        {body}
      </div>
    </div>
  )
}

function Report({
  r,
  range,
  stream,
  phone,
  multiDomain,
  rewrite,
  rewriting,
}: {
  r: HostReport
  range: ReportRange
  stream: boolean
  phone: boolean
  multiDomain: boolean
  rewrite?: () => void
  rewriting?: boolean
}) {
  const pathname = usePathname()
  const to = (f: Partial<RequestFilters>) =>
    logsHref(pathname, {
      ...f,
      range: range === "30d" ? "7d" : range === "1h" ? "1h" : range,
    })
  const t = r.totals
  const noun = stream ? "connection" : "request"
  const b: Buckets = {
    size: r.series.bucket * 1000,
    starts: r.series.ok.map(
      (_, i) => Date.parse(r.series.start) + i * r.series.bucket * 1000,
    ),
  }
  // The log doesn't reach back to the start of the period.
  const shortLog =
    r.oldest && Date.parse(r.oldest) > Date.parse(r.start) + b.size
      ? r.oldest
      : undefined

  const notices = (
    <>
      {!r.detailed && t.requests > 0 && !stream && (
        <OldFormatNotice rewrite={rewrite} rewriting={rewriting} />
      )}
      {r.partial && (
        <Callout icon={<TriangleAlert />} tone="warning">
          The log is very large, so only its newest part was read
          {r.oldest ? ` (from ${shortDate(r.oldest)})` : ""}. Older numbers in
          this period are missing.
        </Callout>
      )}
      {!r.partial && shortLog && (
        <Callout icon={<BarChart3 />}>
          The log only goes back to {shortDate(shortLog)}: nothing before that
          was kept (or the site is newer).
        </Callout>
      )}
    </>
  )

  if (t.requests === 0) {
    return (
      <div className={cn("flex flex-col gap-4", phone && "pt-4")}>
        {(r.partial || shortLog) && (
          <div className={cn("flex flex-col gap-3", phone && "px-4")}>
            {notices}
          </div>
        )}
        <Empty
          icon={BarChart3}
          title={`No ${noun}s in this period`}
          body={`Nothing reached this ${stream ? "stream" : "site"} ${rangeItems.find((i) => i.value === range)?.label.toLowerCase()}. Pick a longer period to look further back.`}
        />
      </div>
    )
  }

  const tiles = summaryTiles(r, range, stream)
  const totalAt = (i: number) =>
    r.series.ok[i] +
    r.series.redirects[i] +
    r.series.client_errors[i] +
    r.series.server_errors[i]
  const errorRate = r.series.ok.map((_, i) => {
    const n = totalAt(i)
    return n
      ? ((r.series.client_errors[i] + r.series.server_errors[i]) / n) * 100
      : null
  })
  const grid = cn(
    "grid min-w-0",
    phone ? "grid-cols-1" : "gap-4 lg:grid-cols-2",
  )

  return (
    <div className={cn("flex min-w-0 flex-col", !phone && "gap-4")}>
      {(!r.detailed || r.partial || shortLog) && (
        <div className={cn("flex flex-col gap-3", phone && "px-4 pt-4")}>
          {notices}
        </div>
      )}
      <Tiles
        tiles={tiles}
        phone={phone}
        className="md:grid-cols-3 2xl:grid-cols-6"
      />

      <Section
        title={stream ? "Connections" : "Requests"}
        caption={`Per ${bucketWord(r.series.bucket)}, by how they ended`}
        actions={
          !phone && (
            <Legend
              items={(stream
                ? classes.filter((c) => c.key !== "redirects")
                : classes
              ).map((c) => ({ label: c.label, swatch: c.swatch }))}
            />
          )
        }
        phone={phone}
      >
        <ColumnChart
          buckets={b}
          stacks={classes.map((c) => ({
            key: c.key,
            fill: c.fill,
            values: r.series[c.key],
          }))}
          format={formatCount}
          label={`${noun}s over time`}
          height={phone ? 180 : 220}
          tooltip={(i) => (
            <Tip
              title={bucketLabel(b, i)}
              rows={[
                ...classes
                  .filter((c) => r.series[c.key][i] > 0)
                  .map((c) => ({
                    label: c.label,
                    value: r.series[c.key][i].toLocaleString("en"),
                    swatch: c.swatch,
                  })),
                { label: "Total", value: totalAt(i).toLocaleString("en") },
              ]}
            />
          )}
        />
        {phone && (
          <div className="mt-3">
            <Legend
              items={classes.map((c) => ({ label: c.label, swatch: c.swatch }))}
            />
          </div>
        )}
      </Section>

      <div className={grid}>
        <Section
          title="Response time"
          caption={
            r.detailed
              ? "95% of them were answered within this"
              : "Logged from the next save of this site"
          }
          phone={phone}
        >
          {r.detailed && r.series.p95_ms.some((v) => v !== null) ? (
            <LineChart
              buckets={b}
              values={r.series.p95_ms}
              format={formatMs}
              label="Response time, 95th percentile"
              height={phone ? 160 : 180}
              tooltip={(i) => (
                <Tip
                  title={bucketLabel(b, i)}
                  rows={[
                    {
                      label: "95% within",
                      value: msOr(r.series.p95_ms[i]),
                    },
                    { label: "Average", value: msOr(r.series.avg_ms[i]) },
                  ]}
                />
              )}
            />
          ) : (
            <Quiet>No response times in the log yet.</Quiet>
          )}
        </Section>
        <Section
          title="Error rate"
          caption="Share that ended in a 4xx or 5xx"
          phone={phone}
        >
          <LineChart
            buckets={b}
            values={errorRate}
            format={(v) => `${Math.round(v)}%`}
            max={Math.max(5, ...errorRate.map((v) => v ?? 0))}
            label="Error rate over time"
            height={phone ? 160 : 180}
            tooltip={(i) => (
              <Tip
                title={bucketLabel(b, i)}
                rows={[
                  {
                    label: "Errors",
                    value:
                      errorRate[i] === null
                        ? "No requests"
                        : formatPercent((errorRate[i] ?? 0) / 100),
                  },
                  {
                    label: "Client (4xx)",
                    value: r.series.client_errors[i].toLocaleString("en"),
                    swatch: "bg-ash",
                  },
                  {
                    label: "Server (5xx)",
                    value: r.series.server_errors[i].toLocaleString("en"),
                    swatch: "bg-destructive",
                  },
                ]}
              />
            )}
          />
        </Section>
        <Section
          title="Visitors"
          caption={`Different addresses per ${bucketWord(r.series.bucket)}`}
          phone={phone}
        >
          <ColumnChart
            buckets={b}
            stacks={[
              { key: "v", fill: "fill-brand", values: r.series.visitors },
            ]}
            format={formatCount}
            label="Visitors over time"
            height={phone ? 160 : 180}
            tooltip={(i) => (
              <Tip
                title={bucketLabel(b, i)}
                rows={[
                  {
                    label: "Visitors",
                    value: r.series.visitors[i].toLocaleString("en"),
                  },
                ]}
              />
            )}
          />
        </Section>
        <Section
          title="Data sent"
          caption={`To visitors, per ${bucketWord(r.series.bucket)}`}
          phone={phone}
        >
          <LineChart
            buckets={b}
            values={r.series.bytes}
            format={formatSize}
            label="Data sent over time"
            height={phone ? 160 : 180}
            tooltip={(i) => (
              <Tip
                title={bucketLabel(b, i)}
                rows={[{ label: "Sent", value: formatSize(r.series.bytes[i]) }]}
              />
            )}
          />
        </Section>
      </div>

      <div className={grid}>
        <Section
          title="Busiest hours"
          caption={`${stream ? "Connections" : "Requests"} by weekday and hour, in ${r.time_zone}`}
          phone={phone}
        >
          <Heatmap cells={r.heatmap} noun={noun} />
        </Section>
        <Section
          title="How long they took"
          caption={
            r.detailed || stream
              ? `${noun[0].toUpperCase()}${noun.slice(1)}s by time to answer`
              : "Logged from the next save of this site"
          }
          phone={phone}
        >
          {r.durations.some((d) => d.count > 0) ? (
            <Durations
              bins={r.durations}
              href={(ms) => (stream ? undefined : to({ slow: ms }))}
              phone={phone}
            />
          ) : (
            <Quiet>No times in the log yet.</Quiet>
          )}
        </Section>
      </div>

      <div
        className={cn(
          "grid min-w-0",
          phone ? "grid-cols-1" : "gap-4 lg:grid-cols-2 2xl:grid-cols-3",
        )}
      >
        {!stream && (
          <PathList
            title="Top pages"
            caption="Asked for most"
            rows={r.paths}
            value={(x) => formatCount(x.requests)}
            note={(x) => pathNote(x)}
            href={(x) => to({ path: pathOnly(x.path) })}
            phone={phone}
          />
        )}
        {!stream && r.detailed && (
          <PathList
            title="Slowest pages"
            caption="Asked at least 3 times; 95% answered within"
            rows={r.slowest}
            value={(x) => msOr(x.p95_ms)}
            note={(x) =>
              `${countOf(x.requests, "request")} · average ${msOr(x.avg_ms)}`
            }
            href={(x) => to({ path: pathOnly(x.path) })}
            phone={phone}
          />
        )}
        {!stream && (
          <CountList
            title="Not found"
            caption="Pages that answered 404"
            rows={r.not_found}
            empty="No 404s in this period."
            href={(x) => to({ path: pathOnly(x.name), code: "404" })}
            phone={phone}
            mono
          />
        )}
        {!stream && (
          <CountList
            title="Server errors"
            caption="Pages that answered 5xx"
            rows={r.failing}
            empty="No server errors in this period."
            href={(x) => to({ path: pathOnly(x.name), status: "5xx" })}
            phone={phone}
            mono
          />
        )}
        <Section
          title="Top visitors"
          caption="Addresses that asked most"
          phone={phone}
        >
          <Ranked
            rows={r.ips.map((x) => ({
              id: x.ip,
              name: x.ip,
              n: x.requests,
              note: [
                x.errors ? `${countOf(x.errors, "error")}` : "",
                formatSize(x.bytes),
                `last ${shortDate(x.last)}`,
                x.agent ? shortAgent(x.agent) : "",
              ]
                .filter(Boolean)
                .join(" · "),
              href: to({ ip: x.ip }),
            }))}
            empty="Nobody yet."
            phone={phone}
            mono
          />
        </Section>
        <CountList
          title="Status codes"
          caption="How they ended"
          rows={r.statuses}
          href={(x) => to({ code: x.name })}
          phone={phone}
          share
        />
        {!stream && (
          <CountList
            title="Referrers"
            caption="Sites that sent visitors here"
            rows={r.referrers}
            empty="No other site linked here (or browsers didn't say)."
            href={(x) => to({ q: x.name })}
            phone={phone}
          />
        )}
        {!stream && (
          <CountList title="Browsers" rows={r.browsers} phone={phone} share />
        )}
        {!stream && (
          <CountList
            title="Operating systems"
            rows={r.systems}
            phone={phone}
            share
          />
        )}
        {!stream && (
          <CountList
            title="Devices"
            caption="Bots and tools (curl, scripts) apart from people"
            rows={r.devices}
            phone={phone}
            share
          />
        )}
        {!stream && r.bots.length > 0 && (
          <CountList
            title="Bots and crawlers"
            caption="Search engines, previews, monitors"
            rows={r.bots}
            href={(x) => to({ q: x.name })}
            phone={phone}
          />
        )}
        {!stream && (multiDomain || r.domains.length > 1) && r.detailed && (
          <CountList
            title="Domains"
            caption="Which name visitors used"
            rows={r.domains}
            href={(x) => to({ domain: x.name })}
            phone={phone}
            share
          />
        )}
        {!stream && (
          <CountList
            title="Methods"
            rows={r.methods}
            href={(x) => to({ method: x.name })}
            phone={phone}
            share
          />
        )}
        <CountList
          title={stream ? "Protocols" : "HTTP versions"}
          rows={r.protocols}
          phone={phone}
          share
        />
        {r.upstreams.length > 0 && (
          <CountList
            title={stream ? "Forwarded to" : "Upstreams"}
            caption="Where the proxy passed them on"
            rows={r.upstreams}
            phone={phone}
            mono
          />
        )}
        {r.cache.length > 0 && (
          <CountList
            title="Cache"
            caption="What nginx's cache did"
            rows={r.cache}
            phone={phone}
            share
          />
        )}
      </div>
    </div>
  )
}

// ── Tiles ───────────────────────────────────────────────────────────────

function summaryTiles(r: HostReport, range: ReportRange, stream: boolean) {
  const t = r.totals
  const prev = r.previous ?? null
  const errors = t.client_errors + t.server_errors
  const vs = (now: number, was: number | null | undefined, fallback: string) =>
    prev && was !== null && was !== undefined
      ? change(now, was, before[range])
      : fallback
  const tiles: Tile[] = [
    {
      label: stream ? "Connections" : "Requests",
      value: formatCount(t.requests),
      note: vs(
        t.requests,
        prev?.requests,
        `${formatRate(t.requests, r)} a minute`,
      ),
    },
    {
      label: "Visitors",
      value: formatCount(t.visitors),
      note: vs(t.visitors, prev?.visitors, "Different addresses"),
    },
    {
      label: "Errors",
      value: formatPercent(errors / t.requests),
      note: t.server_errors
        ? `${countOf(t.server_errors, "server error")}`
        : errors
          ? `${countOf(errors, "client error")}`
          : "None",
      warn: t.server_errors / t.requests > 0.01,
    },
    {
      label: stream ? "Session time" : "Response time",
      value: t.p95_ms === null ? "—" : formatMs(t.p95_ms),
      note:
        t.p95_ms === null
          ? "Not in the log yet"
          : `95% within · average ${msOr(t.avg_ms)}`,
    },
    {
      label: "Data sent",
      value: formatSize(t.bytes),
      note: vs(
        t.bytes,
        prev?.bytes,
        t.received ? `${formatSize(t.received)} received` : "To visitors",
      ),
    },
    t.cache_lookups > 0
      ? {
          label: "Cache hits",
          value: formatPercent(t.cache_hits / t.cache_lookups),
          note: `${formatCount(t.cache_hits)} of ${formatCount(t.cache_lookups)} from the cache`,
        }
      : {
          label: stream ? "Upstream" : "App time",
          value: t.upstream_ms === null ? "—" : formatMs(t.upstream_ms),
          note:
            t.upstream_ms === null
              ? stream
                ? "Not in the log"
                : "Not passed on, or not logged yet"
              : "Average wait for the app",
        },
  ]
  return tiles
}

function change(now: number, was: number, period: string) {
  if (was === 0) return now ? `None ${period}` : `Same as ${period}`
  const p = ((now - was) / was) * 100
  if (Math.abs(p) < 0.5) return `Same as ${period}`
  const n = Math.abs(p) >= 10 ? Math.round(p) : Number(p.toFixed(1))
  return `${n > 0 ? "+" : "−"}${Math.abs(n)}% vs ${period}`
}

function formatRate(n: number, r: HostReport) {
  const minutes = Math.max(
    1,
    (Date.parse(r.end) -
      Math.max(Date.parse(r.start), Date.parse(r.oldest ?? r.start))) /
      60_000,
  )
  const v = n / minutes
  return v >= 10 ? formatCount(Math.round(v)) : v.toFixed(v < 1 ? 2 : 1)
}

// ── Lists ───────────────────────────────────────────────────────────────

type RankedRow = {
  id: string
  name: string
  n: number
  note?: string
  href?: string
}

// The first 8 rows, then Show all.
function Ranked({
  rows,
  empty,
  phone,
  mono,
  share,
}: {
  rows: RankedRow[]
  empty?: string
  phone: boolean
  mono?: boolean
  // Show each one's share of the total beside the count.
  share?: boolean
}) {
  const [all, setAll] = useState(false)
  if (!rows.length) return <Quiet>{empty ?? "Nothing yet."}</Quiet>
  const top = rows.reduce((m, x) => Math.max(m, x.n), 0) || 1
  const total = rows.reduce((s, x) => s + x.n, 0) || 1
  const shown = all ? rows : rows.slice(0, 8)
  const bars: Bar[] = shown.map((x) => ({
    id: x.id,
    name: x.name,
    href: x.href,
    share: x.n / top,
    value: share
      ? `${formatCount(x.n)} · ${formatPercent(x.n / total)}`
      : formatCount(x.n),
    note: x.note,
  }))
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        mono && "[&_li>div:first-child>*:first-child]:font-mono",
      )}
    >
      <BarList rows={bars} phone={phone} />
      {rows.length > 8 && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start max-md:h-11"
          onClick={() => setAll(!all)}
        >
          {all ? "Show fewer" : `Show all ${rows.length}`}
        </Button>
      )}
    </div>
  )
}

function CountList({
  title,
  caption,
  rows,
  empty,
  href,
  phone,
  mono,
  share,
}: {
  title: string
  caption?: string
  rows: ProxyReportCount[]
  empty?: string
  href?: (x: ProxyReportCount) => string
  phone: boolean
  mono?: boolean
  share?: boolean
}) {
  return (
    <Section title={title} caption={caption} phone={phone}>
      <Ranked
        rows={rows.map((x) => ({
          id: x.name,
          name: x.name || "(none)",
          n: x.requests,
          note:
            x.errors && !share
              ? `${countOf(x.errors, "error")} · ${formatSize(x.bytes)}`
              : undefined,
          href: href?.(x),
        }))}
        empty={empty}
        phone={phone}
        mono={mono}
        share={share}
      />
    </Section>
  )
}

function PathList({
  title,
  caption,
  rows,
  value,
  note,
  href,
  phone,
}: {
  title: string
  caption: string
  rows: ProxyReportPath[]
  value: (x: ProxyReportPath) => string
  note: (x: ProxyReportPath) => string
  href: (x: ProxyReportPath) => string
  phone: boolean
}) {
  const [all, setAll] = useState(false)
  if (!rows.length) {
    return (
      <Section title={title} caption={caption} phone={phone}>
        <Quiet>Nothing yet.</Quiet>
      </Section>
    )
  }
  const metric = (x: ProxyReportPath) =>
    title.startsWith("Slowest") ? (x.p95_ms ?? 0) : x.requests
  const top = rows.reduce((m, x) => Math.max(m, metric(x)), 0) || 1
  const shown = all ? rows : rows.slice(0, 8)
  return (
    <Section title={title} caption={caption} phone={phone}>
      <div className="flex flex-col gap-3 [&_li>div:first-child>*:first-child]:font-mono">
        <BarList
          phone={phone}
          rows={shown.map((x) => ({
            id: x.path,
            name: x.path,
            href: href(x),
            share: metric(x) / top,
            value: value(x),
            note: note(x),
          }))}
        />
        {rows.length > 8 && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start max-md:h-11"
            onClick={() => setAll(!all)}
          >
            {all ? "Show fewer" : `Show all ${rows.length}`}
          </Button>
        )}
      </div>
    </Section>
  )
}

function pathNote(x: ProxyReportPath) {
  const parts = [formatSize(x.bytes)]
  if (x.avg_ms !== null) parts.push(`average ${formatMs(x.avg_ms)}`)
  if (x.errors) parts.push(countOf(x.errors, "error"))
  return parts.join(" · ")
}

// ── Durations and the weekday × hour grid ───────────────────────────────

function Durations({
  bins,
  href,
  phone,
}: {
  bins: { up_to_ms: number; count: number }[]
  href: (fromMs: number) => string | undefined
  phone: boolean
}) {
  const total = bins.reduce((s, x) => s + x.count, 0) || 1
  const top = bins.reduce((m, x) => Math.max(m, x.count), 0) || 1
  let lower = 0
  const rows: Bar[] = bins.map((x) => {
    const from = lower
    lower = x.up_to_ms
    const name =
      x.up_to_ms === 0
        ? `Over ${msLabel(from)}`
        : from === 0
          ? `Under ${msLabel(x.up_to_ms)}`
          : `${msLabel(from)} – ${msLabel(x.up_to_ms)}`
    return {
      id: name,
      name,
      share: x.count / top,
      value: `${formatCount(x.count)} · ${formatPercent(x.count / total)}`,
      href: from > 0 && x.count > 0 ? href(from) : undefined,
    }
  })
  return <BarList rows={rows} phone={phone} />
}

const msLabel = (ms: number) => (ms >= 1000 ? `${ms / 1000} s` : `${ms} ms`)

// Monday first; the backend counts from Sunday.
const days = [1, 2, 3, 4, 5, 6, 0]
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function Heatmap({ cells, noun }: { cells: number[][]; noun: string }) {
  const max = Math.max(1, ...cells.flat())
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="img"
        aria-label={`${noun}s by weekday and hour`}
        className="grid grid-cols-[2.25rem_repeat(24,minmax(0,1fr))] gap-[3px]"
      >
        {days.map((d) => (
          <div key={d} className="contents">
            <span className="flex items-center text-caption text-ash">
              {dayNames[d]}
            </span>
            {(cells[d] ?? []).map((n, h) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: one per hour
                key={h}
                title={`${dayNames[d]} ${String(h).padStart(2, "0")}:00 · ${countOf(n, noun)}`}
                className={cn(
                  "aspect-square min-h-2.5 rounded-[3px]",
                  n ? "bg-brand" : "bg-muted",
                )}
                style={n ? { opacity: 0.15 + 0.85 * (n / max) } : undefined}
              />
            ))}
          </div>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: hour labels
            key={h}
            className="text-center text-[10px] leading-4 text-ash tabular-nums"
          >
            {h % 3 === 0 ? h : ""}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1.5 text-caption text-ash">
        Fewer
        {[0.15, 0.4, 0.65, 1].map((o) => (
          <span
            key={o}
            className="size-2.5 rounded-[3px] bg-brand"
            style={{ opacity: o }}
          />
        ))}
        More
      </div>
    </div>
  )
}

// ── Small helpers ───────────────────────────────────────────────────────

const msOr = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : formatMs(v)

function bucketWord(seconds: number) {
  if (seconds >= 86_400) return "day"
  if (seconds >= 3600) return "hour"
  if (seconds === 60) return "minute"
  return `${Math.round(seconds / 60)} minutes`
}

// The path without its query, for the list's "path has" filter.
const pathOnly = (path: string) => path.split("?")[0] || path

// "Chrome 120 on Windows" is enough; the whole agent is in the log.
function shortAgent(agent: string) {
  return agent.length > 40 ? `${agent.slice(0, 40)}…` : agent
}
