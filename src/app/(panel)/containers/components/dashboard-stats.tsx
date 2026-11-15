"use client"

import { ChevronRight, CircleCheck, MemoryStick } from "lucide-react"
import Link from "next/link"
import { type ReactNode, useState } from "react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import {
  bucketLabel,
  bucketOf,
  buckets,
  ColumnChart,
  Legend,
  Tip,
} from "@/components/charts/time-chart"
import { formatSize } from "@/lib/format"
import type {
  DockerEvent,
  DockerReport,
  DockerReportContainer,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { describeEvent } from "./events-view"
import { containerHref, Dot, type Tone } from "./meta"
import { StackBar } from "./parts"
import { projectHref } from "./project-actions"
import { containerTone, pct, rate, upFor } from "./project-stats"
import { running, serverShare, uptimeText } from "./report"

// The Dashboard's statistics: what state the containers are in, where the
// CPU, memory and traffic go (by project and by container), memory limits,
// restarts and the engine's events hour by hour. Each card is a rounded
// card on desktop and a full-width group on phones.

export function StatCard({
  title,
  phone,
  aside,
  footer,
  children,
  className,
}: {
  title: ReactNode
  phone: boolean
  aside?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  if (phone) {
    return (
      <section className={cn("mt-6 flex min-w-0 flex-col", className)}>
        <header className="flex min-h-8 items-center gap-2 px-4 pb-2">
          <h2 className="me-auto font-label text-caption tracking-label text-ash uppercase">
            {title}
          </h2>
          {aside}
        </header>
        <div className="border-y border-border bg-background">
          {children}
          {footer && (
            <div className="border-t border-border px-4 py-2.5 text-caption text-ash">
              {footer}
            </div>
          )}
        </div>
      </section>
    )
  }
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <header className="flex min-h-12 items-center gap-2 px-5 pt-4 pb-3">
        <h2 className="me-auto text-body-sm font-medium">{title}</h2>
        {aside}
      </header>
      {children}
      {footer && (
        <div className="mt-auto border-t border-border px-5 py-2.5 text-caption text-ash">
          {footer}
        </div>
      )}
    </section>
  )
}

const pad = (phone: boolean) => (phone ? "px-4" : "px-5")

// --- States ------------------------------------------------------------------

type StateKey =
  | "healthy"
  | "up"
  | "starting"
  | "unhealthy"
  | "restarting"
  | "stopped"
  | "failed"

const stateParts: {
  key: StateKey
  label: string
  bar: string
  tone: Tone
  hint: string
}[] = [
  {
    key: "healthy",
    label: "Healthy",
    bar: "bg-success",
    tone: "success",
    hint: "Running, and its health check passes",
  },
  {
    key: "up",
    label: "Running",
    bar: "bg-success/45",
    tone: "success",
    hint: "Running, without a health check",
  },
  {
    key: "starting",
    label: "Starting",
    bar: "bg-warning/60",
    tone: "warning",
    hint: "Its health check hasn't passed yet",
  },
  {
    key: "restarting",
    label: "Restarting",
    bar: "bg-warning",
    tone: "warning",
    hint: "Docker keeps starting it again",
  },
  {
    key: "unhealthy",
    label: "Unhealthy",
    bar: "bg-destructive",
    tone: "destructive",
    hint: "Running, but its health check fails",
  },
  {
    key: "failed",
    label: "Crashed",
    bar: "bg-destructive/60",
    tone: "destructive",
    hint: "Stopped with an error or out of memory",
  },
  {
    key: "stopped",
    label: "Stopped",
    bar: "bg-mist",
    tone: "muted",
    hint: "Stopped, created or paused",
  },
]

function stateOf(c: DockerReportContainer): StateKey {
  if (c.state === "restarting") return "restarting"
  if (running(c)) {
    if (c.health === "unhealthy") return "unhealthy"
    if (c.health === "starting") return "starting"
    if (c.health === "healthy") return "healthy"
    return "up"
  }
  if (c.oom_killed || c.state === "dead" || (c.exit_code ?? 0) > 0)
    return "failed"
  return "stopped"
}

export function StateBreakdown({
  report: r,
  phone,
}: {
  report: DockerReport
  phone: boolean
}) {
  const counts = new Map<StateKey, number>()
  for (const c of r.containers) {
    const k = stateOf(c)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const up = r.containers.filter(running)
  const checked = up.filter((c) => c.health !== "none").length
  const shown = stateParts.filter((p) => counts.get(p.key))
  return (
    <StatCard
      title="States"
      phone={phone}
      footer={
        up.length > 0 && (
          <>
            {checked} of {up.length} running container
            {up.length === 1 ? " has" : "s have"} a health check
          </>
        )
      }
    >
      <div
        className={cn("flex flex-col gap-4 pb-4", pad(phone), phone && "pt-4")}
      >
        <StackBar
          label="Containers by state"
          className="h-3"
          parts={stateParts.map((p) => ({
            value: counts.get(p.key) ?? 0,
            className: p.bar,
            label: p.label.toLowerCase(),
          }))}
        />
        {shown.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">No containers.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
            {shown.map((p) => (
              <li key={p.key} className="flex min-w-0 items-start gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-2.5 shrink-0 rounded-[3px]",
                    p.bar,
                  )}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-subheading leading-tight font-light tabular-nums">
                      {counts.get(p.key)}
                    </span>
                    <span className="truncate text-body-sm">{p.label}</span>
                  </span>
                  <span className="text-caption text-ash">{p.hint}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </StatCard>
  )
}

// --- By project ----------------------------------------------------------------

type ProjectRow = {
  key: string
  name: string
  project?: string
  total: number
  up: number
  cpu: number
  memory: number
  rx: number
  tx: number
  tone: Tone
}

export function projectRows(r: DockerReport): ProjectRow[] {
  const map = new Map<string, ProjectRow>()
  for (const c of r.containers) {
    const key = c.project || "\u0000"
    const row = map.get(key) ?? {
      key,
      name: c.project || "Not in a project",
      project: c.project || undefined,
      total: 0,
      up: 0,
      cpu: 0,
      memory: 0,
      rx: 0,
      tx: 0,
      tone: "success" as Tone,
    }
    row.total++
    if (running(c)) {
      row.up++
      row.cpu += serverShare(r, c.cpu)
      row.memory += c.memory_used
      row.rx += c.net_rx_rate
      row.tx += c.net_tx_rate
    }
    const tone = containerTone(c)
    if (tone === "destructive") row.tone = "destructive"
    else if (tone === "warning" && row.tone !== "destructive")
      row.tone = "warning"
    map.set(key, row)
  }
  for (const row of map.values()) {
    if (row.up === 0 && row.tone === "success") row.tone = "muted"
  }
  return [...map.values()]
}

type Measure = "cpu" | "memory" | "network"

const measureItems = [
  { value: "cpu", label: "CPU" },
  { value: "memory", label: "Memory" },
  { value: "network", label: "Network" },
] as const

function measureOf(row: ProjectRow | Totals, m: Measure) {
  return m === "cpu" ? row.cpu : m === "memory" ? row.memory : row.rx + row.tx
}

function measureText(v: number, m: Measure) {
  return m === "cpu" ? pct(v) : m === "memory" ? formatSize(v) : rate(v)
}

type Totals = { cpu: number; memory: number; rx: number; tx: number }

export function ProjectUsage({
  report: r,
  server,
  phone,
}: {
  report: DockerReport
  server: string
  phone: boolean
}) {
  const [by, setBy] = useState<Measure>("cpu")
  const [all, setAll] = useState(false)
  const rows = projectRows(r).sort(
    (a, b) =>
      measureOf(b, by) - measureOf(a, by) || a.name.localeCompare(b.name),
  )
  const top = Math.max(...rows.map((row) => measureOf(row, by)), 0)
  const total = rows.reduce((n, row) => n + measureOf(row, by), 0)
  const limit = phone ? 6 : 10
  const shown = all ? rows : rows.slice(0, limit)
  return (
    <StatCard
      title="By project"
      phone={phone}
      aside={
        <Segmented
          label="Measure"
          items={measureItems}
          value={by}
          onChange={setBy}
        />
      }
      footer={
        by === "cpu"
          ? `Share of the whole server (${r.cpus} core${r.cpus === 1 ? "" : "s"}) · ${pct(total)} in all`
          : by === "memory"
            ? `${formatSize(total)} in all${r.host_memory ? ` of ${formatSize(r.host_memory)}` : ""}`
            : `${rate(total)} in and out, right now`
      }
    >
      <ul className="divide-y divide-border border-t border-border">
        {shown.map((row) => {
          const v = measureOf(row, by)
          const width = top > 0 ? Math.max(v > 0 ? 1.5 : 0, (v / top) * 100) : 0
          const share = total > 0 ? Math.round((v / total) * 100) : 0
          const body = (
            <>
              <span className="flex min-w-0 items-center gap-2">
                <Dot tone={row.tone} />
                <span
                  className={cn(
                    "truncate text-body-sm font-medium",
                    !row.project && "font-normal text-muted-foreground italic",
                  )}
                >
                  {row.name}
                </span>
                <span className="shrink-0 text-caption text-ash tabular-nums">
                  {row.up}/{row.total}
                </span>
              </span>
              <span className="relative h-2 overflow-hidden rounded-full bg-muted">
                {by === "network" && v > 0 ? (
                  <span
                    className="absolute inset-y-0 start-0 flex overflow-hidden rounded-full"
                    style={{ width: `${width}%` }}
                  >
                    <span
                      className="h-full bg-brand"
                      style={{ flexGrow: row.rx, flexBasis: 0 }}
                    />
                    <span
                      className="h-full bg-brand/40"
                      style={{ flexGrow: row.tx, flexBasis: 0 }}
                    />
                  </span>
                ) : (
                  <span
                    className="absolute inset-y-0 start-0 rounded-full bg-brand"
                    style={{ width: `${width}%` }}
                  />
                )}
              </span>
              <span className="text-end text-body-sm tabular-nums">
                {row.up ? measureText(v, by) : "—"}
                {!phone && row.up > 0 && (
                  <span className="ms-1.5 inline-block w-9 text-caption text-ash">
                    {share}%
                  </span>
                )}
              </span>
            </>
          )
          const grid = cn(
            "grid items-center gap-x-3 gap-y-1.5",
            phone
              ? "grid-cols-[minmax(0,1fr)_auto] px-4 py-2.5 [&>*:nth-child(2)]:col-span-2 [&>*:nth-child(2)]:row-start-2"
              : "grid-cols-[minmax(0,14rem)_minmax(0,1fr)_7.5rem] px-5 py-2",
          )
          return (
            <li key={row.key}>
              {row.project ? (
                <Link
                  href={projectHref(server, row.project)}
                  className={cn(
                    grid,
                    "outline-none hover:bg-muted/60 focus-visible:bg-muted/60 active:bg-muted",
                  )}
                >
                  {body}
                </Link>
              ) : (
                <div className={grid}>{body}</div>
              )}
            </li>
          )
        })}
      </ul>
      {rows.length > limit && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          className={cn(
            "min-h-11 border-t border-border text-start text-caption text-muted-foreground outline-none hover:text-brand focus-visible:text-brand md:min-h-0 md:py-2.5",
            pad(phone),
          )}
        >
          {all ? "Show fewer" : `Show all ${rows.length} projects`}
        </button>
      )}
    </StatCard>
  )
}

// --- Network by container ----------------------------------------------------

export function NetworkUsage({
  report: r,
  server,
  phone,
}: {
  report: DockerReport
  server: string
  phone: boolean
}) {
  const list = r.containers
    .filter((c) => running(c) && c.measured)
    .sort(
      (a, b) => b.net_rx_rate + b.net_tx_rate - (a.net_rx_rate + a.net_tx_rate),
    )
    .slice(0, phone ? 5 : 7)
  const top = Math.max(0, ...list.map((c) => c.net_rx_rate + c.net_tx_rate))
  return (
    <StatCard
      title="Network right now"
      phone={phone}
      aside={
        <Legend
          items={[
            { label: "In", swatch: "bg-brand" },
            { label: "Out", swatch: "bg-brand/40" },
          ]}
        />
      }
      footer={`${rate(r.net_rx_rate)} in · ${rate(r.net_tx_rate)} out, every container`}
    >
      {top === 0 ? (
        <p
          className={cn(
            "pb-4 text-body-sm text-muted-foreground",
            pad(phone),
            phone && "pt-4",
          )}
        >
          No traffic right now.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {list.map((c) => {
            const v = c.net_rx_rate + c.net_tx_rate
            return (
              <li key={c.id}>
                <Link
                  href={containerHref(server, c.name)}
                  className={cn(
                    "flex flex-col gap-1.5 py-2 outline-none hover:bg-muted/60 focus-visible:bg-muted/60 active:bg-muted",
                    pad(phone),
                  )}
                >
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
                      {c.name}
                    </span>
                    <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
                      ↓ {rate(c.net_rx_rate)}{" "}
                      <span className="text-ash">↑ {rate(c.net_tx_rate)}</span>
                    </span>
                  </span>
                  <span className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className="flex h-full overflow-hidden rounded-full"
                      style={{ width: `${Math.max(1.5, (v / top) * 100)}%` }}
                    >
                      <span
                        className="h-full bg-brand"
                        style={{ flexGrow: c.net_rx_rate, flexBasis: 0 }}
                      />
                      <span
                        className="h-full bg-brand/40"
                        style={{ flexGrow: c.net_tx_rate, flexBasis: 0 }}
                      />
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </StatCard>
  )
}

// --- Memory limits -----------------------------------------------------------

export function MemoryLimits({
  report: r,
  server,
  phone,
}: {
  report: DockerReport
  server: string
  phone: boolean
}) {
  const up = r.containers.filter((c) => running(c) && c.measured)
  const limited = up.filter((c) => c.memory_limit > 0)
  const near = limited
    .map((c) => ({ c, share: (c.memory_used / c.memory_limit) * 100 }))
    .filter((x) => x.share >= 70)
    .sort((a, b) => b.share - a.share)
  const open = up
    .filter((c) => c.memory_limit === 0)
    .sort((a, b) => b.memory_used - a.memory_used)
  const openUse = open.reduce((n, c) => n + c.memory_used, 0)
  const fix = (c: DockerReportContainer) =>
    c.project ? projectHref(server, c.project, "production") : null
  return (
    <StatCard
      title="Memory limits"
      phone={phone}
      footer={
        up.length > 0 &&
        `${limited.length} of ${up.length} running container${up.length === 1 ? " has" : "s have"} a limit`
      }
    >
      <div
        className={cn("flex flex-col gap-3 pb-4", pad(phone), phone && "pt-4")}
      >
        <StackBar
          label="Running containers by memory limit"
          parts={[
            {
              value: limited.length - near.length,
              className: "bg-brand",
              label: "with room",
            },
            {
              value: near.length,
              className: "bg-warning",
              label: "near the limit",
            },
            {
              value: open.length,
              className: "bg-mist",
              label: "without a limit",
            },
          ]}
        />
        {open.length > 0 ? (
          <p className="text-body-sm text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">
              {open.length}
            </span>{" "}
            can use all the server's memory (together {formatSize(openUse)}{" "}
            now). One leak there can take the others down.
          </p>
        ) : (
          <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
            <CircleCheck className="size-4 text-success" />
            Every running container has a limit.
          </p>
        )}
      </div>
      {(near.length > 0 || open.length > 0) && (
        <ul className="divide-y divide-border border-t border-border">
          {[
            ...near.map(({ c, share }) => ({ c, share })),
            ...open.slice(0, Math.max(0, 5 - near.length)).map((c) => ({
              c,
              share: null as number | null,
            })),
          ].map(({ c, share }) => {
            const href = fix(c) ?? containerHref(server, c.name)
            return (
              <li key={c.id}>
                <Link
                  href={href}
                  className={cn(
                    "flex min-h-11 items-center gap-3 py-2 outline-none hover:bg-muted/60 focus-visible:bg-muted/60 active:bg-muted md:min-h-0",
                    pad(phone),
                  )}
                >
                  <MemoryStick
                    className={cn(
                      "size-4 shrink-0",
                      share !== null ? "text-warning" : "text-ash",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
                    {c.name}
                  </span>
                  <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
                    {share !== null ? (
                      <span className="text-warning">
                        {Math.round(share)}% of {formatSize(c.memory_limit)}
                      </span>
                    ) : (
                      <>{formatSize(c.memory_used)} · no limit</>
                    )}
                  </span>
                  <ChevronRight className="size-3.5 shrink-0 text-ash rtl:rotate-180" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </StatCard>
  )
}

// --- Restarts and exits --------------------------------------------------------

export function TroubleList({
  report: r,
  server,
  phone,
}: {
  report: DockerReport
  server: string
  phone: boolean
}) {
  const list = r.containers
    .filter(
      (c) =>
        c.restarts > 0 ||
        c.oom_killed ||
        (!running(c) && (c.exit_code ?? 0) > 0),
    )
    .sort(
      (a, b) =>
        Number(b.oom_killed) - Number(a.oom_killed) ||
        b.restarts - a.restarts ||
        a.name.localeCompare(b.name),
    )
  const restarts = r.containers.reduce((n, c) => n + c.restarts, 0)
  return (
    <StatCard
      title="Restarts and crashes"
      phone={phone}
      aside={
        restarts > 0 && (
          <span className="text-caption text-warning tabular-nums">
            {restarts} restart{restarts === 1 ? "" : "s"}
          </span>
        )
      }
    >
      {list.length === 0 ? (
        <p
          className={cn(
            "flex items-center gap-2 pb-4 text-body-sm text-muted-foreground",
            pad(phone),
            phone && "pt-4",
          )}
        >
          <CircleCheck className="size-4 shrink-0 text-success" />
          No container has restarted or crashed.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {list.slice(0, 8).map((c) => {
            const why = c.oom_killed
              ? "Out of memory"
              : !running(c) && c.exit_code
                ? `Exited with code ${c.exit_code}`
                : uptimeText(c)
            return (
              <li key={c.id}>
                <Link
                  href={containerHref(server, c.name, "logs")}
                  className={cn(
                    "flex min-h-12 items-center gap-3 py-2 outline-none hover:bg-muted/60 focus-visible:bg-muted/60 active:bg-muted md:min-h-0",
                    pad(phone),
                  )}
                >
                  <Dot tone={containerTone(c)} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body-sm font-medium">
                      {c.name}
                    </span>
                    <span
                      className={cn(
                        "truncate text-caption text-muted-foreground",
                        c.oom_killed && "text-destructive",
                      )}
                    >
                      {why}
                      {running(c) &&
                        c.started_at &&
                        upFor(c.started_at) &&
                        c.restarts > 0 &&
                        " since the last restart"}
                    </span>
                  </span>
                  {c.restarts > 0 && (
                    <span className="shrink-0 rounded-full bg-warning/12 px-2 py-0.5 text-caption font-medium text-warning tabular-nums">
                      ×{c.restarts}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </StatCard>
  )
}

// --- Events per hour -----------------------------------------------------------

const eventStacks = [
  {
    key: "problem",
    label: "Crashes and failures",
    fill: "fill-destructive",
    swatch: "bg-destructive",
  },
  {
    key: "warning",
    label: "Restarts and warnings",
    fill: "fill-warning",
    swatch: "bg-warning",
  },
  {
    key: "life",
    label: "Starts and stops",
    fill: "fill-brand",
    swatch: "bg-brand",
  },
  {
    key: "other",
    label: "Images, networks, volumes",
    fill: "fill-mist",
    swatch: "bg-mist",
  },
] as const

function eventKind(e: DockerEvent): (typeof eventStacks)[number]["key"] {
  if (e.type !== "container") return "other"
  const tone = describeEvent(e).tone
  if (tone === "destructive") return "problem"
  if (tone === "warning") return "warning"
  return "life"
}

export function EventsChart({
  events,
  phone,
  hours = 24,
}: {
  events: DockerEvent[]
  phone: boolean
  hours?: number
}) {
  const now = Date.now()
  const end = new Date(Math.ceil(now / 3_600_000) * 3_600_000).toISOString()
  const start = new Date(Date.parse(end) - hours * 3_600_000).toISOString()
  const b = buckets(start, end, 3600)
  const values = Object.fromEntries(
    eventStacks.map((s) => [s.key, b.starts.map(() => 0)]),
  ) as Record<(typeof eventStacks)[number]["key"], number[]>
  for (const e of events) {
    // Exec runs are noise here; the Event log lists them.
    if (e.action.startsWith("exec_")) continue
    const i = bucketOf(b, e.time)
    if (i >= 0) values[eventKind(e)][i]++
  }
  const total = Object.values(values)
    .flat()
    .reduce((n, v) => n + v, 0)
  const problems = values.problem.reduce((n, v) => n + v, 0)
  const used = eventStacks.filter((s) => values[s.key].some((v) => v > 0))
  return (
    <StatCard
      title="Events per hour"
      phone={phone}
      aside={
        <span className="text-caption text-muted-foreground tabular-nums">
          {total} in {hours} hours
          {problems > 0 && (
            <span className="text-destructive"> · {problems} failures</span>
          )}
        </span>
      }
    >
      {total === 0 ? (
        <p
          className={cn(
            "pb-5 text-body-sm text-muted-foreground",
            pad(phone),
            phone && "pt-3",
          )}
        >
          Quiet: no container started, stopped or failed in the last {hours}{" "}
          hours.
        </p>
      ) : (
        <div
          className={cn(
            "flex flex-col gap-3 pb-4",
            pad(phone),
            phone && "pt-3",
          )}
        >
          <ColumnChart
            buckets={b}
            label="Engine events per hour"
            height={phone ? 150 : 190}
            format={(v) => String(Math.round(v))}
            stacks={eventStacks.map((s) => ({
              key: s.key,
              fill: s.fill,
              values: values[s.key],
            }))}
            tooltip={(i) => (
              <Tip
                title={bucketLabel(b, i)}
                rows={
                  eventStacks.some((s) => values[s.key][i] > 0)
                    ? eventStacks
                        .filter((s) => values[s.key][i] > 0)
                        .map((s) => ({
                          label: s.label as string,
                          value: values[s.key][i],
                          swatch: s.swatch as string,
                        }))
                    : [{ label: "Nothing", value: 0, swatch: "bg-muted" }]
                }
              />
            )}
          />
          {used.length > 0 && (
            <Legend
              items={used.map((s) => ({ label: s.label, swatch: s.swatch }))}
            />
          )}
        </div>
      )}
    </StatCard>
  )
}
