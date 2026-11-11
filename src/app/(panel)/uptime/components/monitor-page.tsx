"use client"

import {
  Activity,
  ArrowRight,
  Check,
  ChevronLeft,
  Copy,
  Ellipsis,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { parseAsStringLiteral, useQueryStates } from "nuqs"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { useChannels } from "@/app/(panel)/alerts/api"
import { ChannelIcon } from "@/app/(panel)/alerts/components/meta"
import {
  Empty,
  ItemMenu,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { useServers } from "@/app/(panel)/servers/api"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import {
  type Buckets,
  bucketLabel,
  bucketOf,
  ColumnChart,
  Legend,
  LineChart,
  StatusStrip,
  type StripState,
  Tip,
} from "@/components/charts/time-chart"
import { Quiet, Section, Tiles } from "@/components/insights/parts"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type { MonitorEvent, MonitorReport, UptimeMonitor } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  type CheckStatus,
  type ReportRange,
  useMonitor,
  useMonitorChecks,
  useMonitorEvents,
  useMonitorIncidents,
  useMonitorReport,
} from "../api"
import { ruleText } from "./draft"
import { IncidentList } from "./incidents"
import { CheckLocations, LocationsSection } from "./location-report"
import {
  BeatBar,
  certDaysLeft,
  durationText,
  intervalText,
  KindIcon,
  kindMeta,
  type MonitorState,
  pushUrl,
  reportRangeLabels,
  reportRanges,
  StateBadge,
  stateMeta,
  stateOf,
  targetText,
  uptimeText,
} from "./meta"
import { monitorHref, useMonitorMenu } from "./monitor-menu"
import { useUptimeCan } from "./permissions"
import { useUptimeActions } from "./uptime-actions"

const checkShows = ["all", "down", "degraded", "up"] as const
const pageState = {
  range: parseAsStringLiteral(reportRanges).withDefault("24h"),
  checks: parseAsStringLiteral(checkShows).withDefault("all"),
}

export function MonitorFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <MonitorPage id={id} />
}

function MonitorPage({ id }: { id: string }) {
  const phone = useIsPhone()
  const query = useMonitor(id)
  const m = query.data
  usePageCrumbs(m ? [{ href: monitorHref(m.id), label: m.name }] : [])
  if (phone === null) return null
  if (!m) {
    if (query.isPending) return <Loading phone={phone} />
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={Activity}
          title={gone ? "This monitor isn't here" : "Couldn't load the monitor"}
          body={
            gone
              ? "It was deleted, or you don't have access to it."
              : query.error?.message
          }
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href="/uptime" />}
              nativeButton={false}
            >
              Back to uptime
            </Button>
          }
        />
      </div>
    )
  }
  return <Page m={m} phone={phone} />
}

function Page({ m, phone }: { m: UptimeMonitor; phone: boolean }) {
  const [state, setState] = useQueryStates(pageState, { history: "replace" })
  const report = useMonitorReport(m.id, state.range)
  const incidents = useMonitorIncidents(m.id)

  return (
    <div
      className={cn(
        "flex flex-col",
        phone
          ? "pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          : "gap-5 px-6 pt-5 pb-12",
      )}
    >
      {phone ? <PhoneBar m={m} /> : <DesktopHeader m={m} />}
      <NowCard m={m} phone={phone} />
      {m.kind === "push" && m.push_token && (
        <PushCard token={m.push_token} phone={phone} />
      )}

      <div
        className={cn(
          "flex items-center gap-2",
          phone
            ? "[scrollbar-width:none] overflow-x-auto border-b border-border px-4 py-3"
            : "",
        )}
      >
        <Segmented
          label="Range"
          value={state.range}
          onChange={(range) => setState({ range })}
          items={reportRanges.map((r) => ({
            value: r,
            label: phone ? r : reportRangeLabels[r],
          }))}
        />
        {!phone && report.dataUpdatedAt > 0 && (
          <span className="text-caption text-ash">
            Updated {timeAgo(new Date(report.dataUpdatedAt).toISOString())}
          </span>
        )}
      </div>

      {report.data ? (
        <ReportView r={report.data} m={m} phone={phone} />
      ) : report.isError ? (
        <Quiet>{report.error.message}</Quiet>
      ) : (
        <div className={cn("grid gap-4", phone ? "p-4" : "lg:grid-cols-4")}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      )}

      <Section
        title="Incidents"
        caption="Each time it went down, how long for and why."
        phone={phone}
        className={phone ? "px-0" : undefined}
      >
        <IncidentList
          phone={phone}
          query={incidents}
          empty="No incidents yet"
          showMonitor={false}
        />
      </Section>

      <div className={cn("grid", !phone && "gap-5 xl:grid-cols-2")}>
        <ChecksSection
          m={m}
          phone={phone}
          show={state.checks}
          onShow={(checks) => setState({ checks })}
        />
        <EventsSection m={m} phone={phone} />
      </div>

      <DetailsSection m={m} phone={phone} />
    </div>
  )
}

// ---- header ----

function DesktopHeader({ m }: { m: UptimeMonitor }) {
  const can = useUptimeCan(m.workspace_id)
  const a = useUptimeActions()
  const router = useRouter()
  const menu = useMonitorMenu(m, {
    onPage: true,
    after: () => router.replace("/uptime"),
  })
  const checking = a.checking === m.id
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <KindIcon kind={m.kind} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-subheading font-medium">{m.name}</h1>
        <p className="truncate text-caption text-muted-foreground">
          {kindMeta[m.kind as keyof typeof kindMeta]?.label ?? m.kind}
          {targetText(m) && ` · ${targetText(m)}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {can.operate && m.kind !== "push" && (
          <HeaderButton
            label={checking ? "Checking…" : "Check now"}
            disabled={checking || m.paused}
            onClick={() => a.check(m)}
          >
            <RefreshCw className={cn(checking && "animate-spin")} />
          </HeaderButton>
        )}
        {can.operate && (
          <HeaderButton
            label={m.paused ? "Resume" : "Pause"}
            onClick={() => a.setPaused(m, !m.paused)}
          >
            {m.paused ? <Play /> : <Pause />}
          </HeaderButton>
        )}
        {can.edit && (
          <HeaderButton
            label="Edit"
            onClick={() => router.push(`${monitorHref(m.id)}/edit`)}
          >
            <Pencil />
          </HeaderButton>
        )}
        <ItemMenu
          groups={menu}
          label={`${m.name} actions`}
          trigger={
            <Button variant="ghost" size="icon" aria-label="More actions">
              <Ellipsis />
            </Button>
          }
        />
      </div>
    </div>
  )
}

function HeaderButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function PhoneBar({ m }: { m: UptimeMonitor }) {
  const back = useBack("/uptime")
  const router = useRouter()
  const [open, setOpen] = useOpen("monitor-page-sheet")
  const menu = useMonitorMenu(m, {
    onPage: true,
    after: () => router.replace("/uptime"),
  })
  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
        <Button variant="ghost" size="icon-lg" aria-label="Back" onClick={back}>
          <ChevronLeft className="size-6" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-body font-medium">
          {m.name}
        </h1>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Actions"
          onClick={() => setOpen(true)}
        >
          <Ellipsis className="size-5" />
        </Button>
      </header>
      <BottomSheet open={open} onOpenChange={setOpen} title={m.name}>
        <SheetItems groups={menu} onOpenChange={setOpen} />
      </BottomSheet>
    </>
  )
}

// ---- now ----

function NowCard({ m, phone }: { m: UptimeMonitor; phone: boolean }) {
  const state = stateOf(m)
  const days = certDaysLeft(m.cert_expires_at)
  return (
    <section
      className={cn(
        "flex flex-col gap-3",
        phone
          ? "border-b border-border p-4"
          : "rounded-2xl border border-border p-5",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StateBadge state={state} className="text-body" />
        <span className="text-caption text-muted-foreground">
          {m.paused
            ? "Not checked, no alerts"
            : m.status === "pending"
              ? "Waiting for the first check"
              : `for ${durationText((Date.now() - Date.parse(m.status_since)) / 1000)}`}
        </span>
        {!phone && <span className="flex-1" />}
        {m.last_latency_ms != null && !m.paused && (
          <span className="text-caption text-muted-foreground tabular-nums">
            {m.last_latency_ms} ms
          </span>
        )}
        {m.last_checked_at && (
          <span className="text-caption text-ash">
            Checked {timeAgo(m.last_checked_at)}
          </span>
        )}
      </div>
      {m.status_message && state !== "paused" && (
        <p
          className={cn(
            "text-body-sm break-words",
            state === "down" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {m.status_message}
        </p>
      )}
      <BeatBar beats={m.recent} size={phone ? 40 : 90} className="w-full" />
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-caption text-muted-foreground">
        <span>24 h: {uptimeText(m.uptime_24h)}</span>
        <span>30 d: {uptimeText(m.uptime_30d)}</span>
        <span>Every {intervalText(m.interval_seconds)}</span>
        {days !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              days < 14 && "text-warning",
              days < 0 && "text-destructive",
            )}
          >
            <ShieldCheck className="size-3.5" />
            {days < 0
              ? "Certificate expired"
              : `Certificate: ${days} days left`}
          </span>
        )}
      </div>
    </section>
  )
}

function PushCard({ token, phone }: { token: string; phone: boolean }) {
  const url = pushUrl(token)
  const [copied, setCopied] = useState("")
  const copy = (text: string) =>
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(text)
        setTimeout(() => setCopied(""), 1500)
      },
      () => toast.error("Couldn't copy"),
    )
  const lines = [url, `curl -fsS -m 10 --retry 3 ${url}`]
  return (
    <Section
      title="Heartbeat address"
      caption="Call it when your job finishes. Add ?status=down&msg=… to report a failure."
      phone={phone}
    >
      <div className="flex flex-col gap-2">
        {lines.map((t) => (
          <div
            key={t}
            className="flex items-center gap-2 rounded-lg border border-border bg-subtle ps-3"
          >
            <span className="min-w-0 flex-1 truncate py-2 font-mono text-caption">
              {t}
            </span>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Copy"
              className="shrink-0 md:size-9"
              onClick={() => copy(t)}
            >
              {copied === t ? <Check /> : <Copy />}
            </Button>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ---- report ----

const ms = (n: number) => `${Math.round(n)} ms`

function ReportView({
  r,
  m,
  phone,
}: {
  r: MonitorReport
  m: UptimeMonitor
  phone: boolean
}) {
  const b: Buckets = {
    starts: Array.from(
      {
        length: Math.max(
          1,
          Math.ceil((Date.now() - Date.parse(r.since)) / (r.step * 1000)),
        ),
      },
      (_, i) => Date.parse(r.since) + i * r.step * 1000,
    ).slice(0, 2000),
    size: r.step * 1000,
  }
  const n = b.starts.length
  const up = new Array<number>(n).fill(0)
  const degraded = new Array<number>(n).fill(0)
  const down = new Array<number>(n).fill(0)
  const avg = new Array<number | null>(n).fill(null)
  const p95 = new Array<number | null>(n).fill(null)
  for (const x of r.buckets) {
    const i = bucketOf(b, x.at)
    if (i < 0) continue
    up[i] += x.up
    degraded[i] += x.degraded
    down[i] += x.down
    if (x.latency_avg != null) avg[i] = x.latency_avg
    if (x.latency_p95 != null) p95[i] = x.latency_p95
  }
  const share = (i: number) => {
    const all = up[i] + degraded[i] + down[i]
    return all ? ((up[i] + degraded[i]) / all) * 100 : null
  }

  const tiles = [
    {
      label: "Uptime",
      value: uptimeText(r.uptime),
      note: `${r.checks.toLocaleString()} checks`,
      warn: r.uptime != null && r.uptime < 99,
    },
    {
      label: "Response time",
      value: r.latency_avg != null ? ms(r.latency_avg) : "—",
      note:
        r.latency_max != null ? `Slowest ${ms(r.latency_max)}` : "No answers",
    },
    {
      label: "Downtime",
      value: r.downtime_seconds ? durationText(r.downtime_seconds) : "None",
      note: `${r.down} failed checks`,
      warn: r.downtime_seconds > 0,
    },
    {
      label: "Incidents",
      value: String(r.incidents),
      note: r.degraded
        ? `${r.degraded} slow or degraded checks`
        : "No slow checks",
      warn: r.incidents > 0,
    },
  ]

  return (
    <>
      <Tiles tiles={tiles} phone={phone} />
      {m.locations.length > 1 && (
        <LocationsSection
          m={m}
          report={r.locations}
          buckets={b}
          phone={phone}
        />
      )}
      <div className={cn("grid", !phone && "gap-5 xl:grid-cols-2")}>
        <Section
          title="Checks"
          caption={`How each ${bucketText(r.step)} went.`}
          phone={phone}
          actions={
            <Legend
              items={[
                { label: "Up", swatch: "bg-success" },
                { label: "Degraded", swatch: "bg-warning" },
                { label: "Down", swatch: "bg-destructive" },
              ]}
            />
          }
        >
          {r.checks ? (
            <ColumnChart
              buckets={b}
              label="Checks over time"
              format={(v) => String(Math.round(v))}
              stacks={[
                { key: "up", fill: "fill-success", values: up },
                { key: "degraded", fill: "fill-warning", values: degraded },
                { key: "down", fill: "fill-destructive", values: down },
              ]}
              tooltip={(i) => (
                <Tip
                  title={bucketLabel(b, i)}
                  rows={[
                    { label: "Up", value: up[i], swatch: "bg-success" },
                    {
                      label: "Degraded",
                      value: degraded[i],
                      swatch: "bg-warning",
                    },
                    { label: "Down", value: down[i], swatch: "bg-destructive" },
                    {
                      label: "Uptime",
                      value: share(i) === null ? "—" : uptimeText(share(i)),
                    },
                  ]}
                />
              )}
            />
          ) : (
            <Quiet>No checks in this range yet.</Quiet>
          )}
        </Section>
        <Section
          title="Response time"
          caption="Average per bucket; the tooltip shows the slowest 5%."
          phone={phone}
        >
          {avg.some((v) => v !== null) ? (
            <LineChart
              buckets={b}
              values={avg}
              label="Response time"
              format={ms}
              tooltip={(i) => (
                <Tip
                  title={bucketLabel(b, i)}
                  rows={[
                    {
                      label: "Average",
                      value: avg[i] === null ? "—" : ms(avg[i] ?? 0),
                    },
                    {
                      label: "95th percentile",
                      value: p95[i] === null ? "—" : ms(p95[i] ?? 0),
                    },
                  ]}
                />
              )}
            />
          ) : (
            <Quiet>
              {m.kind === "push"
                ? "Pings report a time only when they send ?ms=."
                : "No answers to time in this range."}
            </Quiet>
          )}
        </Section>
      </div>
      <div className={cn("grid", !phone && "gap-5 xl:grid-cols-[2fr_1fr]")}>
        <DaysSection r={r} phone={phone} />
        <WindowsSection r={r} phone={phone} />
      </div>
    </>
  )
}

function bucketText(step: number) {
  if (step >= 86400) return "day"
  if (step >= 3600) return step === 3600 ? "hour" : `${step / 3600} hours`
  return `${Math.round(step / 60)} minutes`
}

const dayFmt = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric",
})

function DaysSection({ r, phone }: { r: MonitorReport; phone: boolean }) {
  const days = r.days.slice(-90)
  const states: StripState[] = days.map((d) =>
    !d.checks ? "none" : d.down ? "down" : d.degraded ? "some" : "ok",
  )
  const good = days.filter((d) => d.checks && !d.down).length
  const counted = days.filter((d) => d.checks).length
  return (
    <Section
      title="Last 90 days"
      caption={
        counted
          ? `${good} of ${counted} days without downtime.`
          : "No checks yet."
      }
      phone={phone}
    >
      <StatusStrip
        states={states}
        label="Daily status, last 90 days"
        tooltip={(i) => {
          const d = days[i]
          const all = d.up + d.degraded + d.down
          return (
            <Tip
              title={dayFmt.format(new Date(`${d.day}T12:00:00`))}
              rows={
                all
                  ? [
                      {
                        label: "Uptime",
                        value: uptimeText(((d.up + d.degraded) / all) * 100),
                      },
                      { label: "Down checks", value: d.down },
                      { label: "Degraded", value: d.degraded },
                    ]
                  : [{ label: "Checks", value: "None" }]
              }
            />
          )
        }}
      />
      <div className="mt-2 flex justify-between text-caption text-ash">
        <span>
          {days[0] ? dayFmt.format(new Date(`${days[0].day}T12:00:00`)) : ""}
        </span>
        <span>Today</span>
      </div>
    </Section>
  )
}

function WindowsSection({ r, phone }: { r: MonitorReport; phone: boolean }) {
  return (
    <Section title="Uptime by period" phone={phone}>
      <dl className="flex flex-col divide-y divide-border">
        {r.windows.map((w) => (
          <div
            key={w.range}
            className="flex items-center justify-between gap-3 py-2"
          >
            <dt className="text-body-sm text-muted-foreground">
              {reportRangeLabels[w.range as ReportRange] ?? w.range}
            </dt>
            <dd className="text-body-sm font-medium tabular-nums">
              {w.checks ? uptimeText(w.uptime) : "—"}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}

// ---- history ----

function ChecksSection({
  m,
  phone,
  show,
  onShow,
}: {
  m: UptimeMonitor
  phone: boolean
  show: (typeof checkShows)[number]
  onShow: (s: (typeof checkShows)[number]) => void
}) {
  const query = useMonitorChecks(
    m.id,
    show === "all" ? "" : (show as CheckStatus),
  )
  const rows = query.data ?? []
  return (
    <Section
      title="Recent checks"
      caption="The last 100."
      phone={phone}
      actions={
        <div className="max-w-full [scrollbar-width:none] overflow-x-auto">
          <Segmented
            label="Show"
            value={show}
            onChange={onShow}
            items={checkShows.map((s) => ({
              value: s,
              label: s === "all" ? "All" : stateMeta[s].label,
            }))}
          />
        </div>
      }
    >
      {query.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <Quiet>
          {show === "all" ? "No checks yet." : `No ${show} checks.`}
        </Quiet>
      ) : (
        <ul className="-mx-1 flex max-h-96 flex-col overflow-y-auto">
          {rows.map((c) => (
            <li
              key={c.at}
              className="flex items-start gap-3 rounded-lg px-1 py-2 hover:bg-subtle"
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  stateMeta[c.status as MonitorState]?.dot ?? "bg-mist",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm">
                  {c.message || stateMeta[c.status as MonitorState]?.label}
                </p>
                <p className="text-caption text-ash">
                  {new Date(c.at).toLocaleString()}
                  {c.code && ` · ${c.code}`}
                </p>
                <CheckLocations items={c.locations} />
              </div>
              {c.latency_ms != null && (
                <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
                  {c.latency_ms} ms
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function EventsSection({ m, phone }: { m: UptimeMonitor; phone: boolean }) {
  const query = useMonitorEvents(m.id)
  const rows = query.data ?? []
  return (
    <Section
      title="Status changes"
      caption="Every time it moved between up, degraded and down."
      phone={phone}
    >
      {query.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <Quiet>No changes yet.</Quiet>
      ) : (
        <ul className="-mx-1 flex max-h-96 flex-col overflow-y-auto">
          {rows.map((e) => (
            <EventRow key={e.id} e={e} />
          ))}
        </ul>
      )}
    </Section>
  )
}

function EventRow({ e }: { e: MonitorEvent }) {
  const to = stateMeta[e.to_status as MonitorState]
  const from = stateMeta[e.from_status as MonitorState]
  return (
    <li className="flex items-start gap-3 rounded-lg px-1 py-2 hover:bg-subtle">
      <span
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          to?.dot ?? "bg-mist",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-body-sm">
          <span className="text-muted-foreground">
            {from?.label ?? e.from_status}
          </span>
          <ArrowRight className="size-3.5 text-ash" />
          <span className={cn("font-medium", to?.text)}>
            {to?.label ?? e.to_status}
          </span>
        </p>
        {e.message && (
          <p className="truncate text-caption text-muted-foreground">
            {e.message}
          </p>
        )}
      </div>
      <span className="shrink-0 text-caption text-ash">{timeAgo(e.at)}</span>
    </li>
  )
}

// ---- details ----

function DetailsSection({ m, phone }: { m: UptimeMonitor; phone: boolean }) {
  const servers = useServers({ limit: 500 })
  const channels = useChannels(m.workspace_id)
  const serverName = (id?: string) =>
    id ? (servers.data?.items.find((s) => s.id === id)?.name ?? "A server") : ""
  const picked = (channels.data ?? []).filter((c) =>
    m.channel_ids.includes(c.id),
  )
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: "Checks",
      value: kindMeta[m.kind as keyof typeof kindMeta]?.label ?? m.kind,
    },
    ...(targetText(m) ? [{ label: "Target", value: targetText(m) }] : []),
    {
      label: "Checked from",
      value:
        m.kind === "push" ? (
          "Your job pings Morche"
        ) : (
          <span className="flex flex-col gap-0.5">
            <span className="flex flex-wrap gap-x-1">
              {m.locations.map((l, i) => (
                <span key={l.location}>
                  {l.server_id ? (
                    <Link
                      href={`/servers/${l.server_id}`}
                      className="text-brand hover:underline"
                    >
                      {l.name}
                    </Link>
                  ) : (
                    l.name
                  )}
                  {i < m.locations.length - 1 && ","}
                </span>
              ))}
            </span>
            {m.locations.length > 1 && (
              <span className="text-caption text-muted-foreground">
                {ruleText(m.rule, m.locations.length)}
              </span>
            )}
          </span>
        ),
    },
    ...(m.server_id && !m.locations.some((l) => l.server_id === m.server_id)
      ? [
          {
            label: "Related server",
            value: (
              <Link
                href={`/servers/${m.server_id}`}
                className="text-brand hover:underline"
              >
                {serverName(m.server_id)}
              </Link>
            ),
          },
        ]
      : []),
    {
      label: m.kind === "push" ? "Expects a ping every" : "Every",
      value: `${intervalText(m.interval_seconds)}${
        m.retries ? ` · down after ${m.retries + 1} failures` : ""
      }`,
    },
    {
      label: "Alerts",
      value: picked.length ? (
        <span className="flex flex-wrap gap-1.5">
          {picked.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-caption"
            >
              <ChannelIcon kind={c.kind} className="size-3.5" />
              {c.name}
            </span>
          ))}
        </span>
      ) : (
        <span className="text-muted-foreground">
          None.{" "}
          <Link href="/alerts" className="text-brand hover:underline">
            Set up alerts
          </Link>
        </span>
      ),
    },
    ...(m.tags.length ? [{ label: "Tags", value: m.tags.join(", ") }] : []),
    ...(m.description ? [{ label: "Notes", value: m.description }] : []),
    {
      label: "Added",
      value: `${timeAgo(m.created_at)}${
        m.created_by_name ? ` by ${m.created_by_name}` : ""
      }`,
    },
  ]
  return (
    <Section title="Details" phone={phone}>
      <dl className="grid gap-x-8 gap-y-3 md:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="min-w-0">
            <dt className="text-caption text-ash">{r.label}</dt>
            <dd className="mt-0.5 text-body-sm break-words">{r.value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}

function Loading({ phone }: { phone: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4", phone ? "p-4" : "px-6 pt-6")}>
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
