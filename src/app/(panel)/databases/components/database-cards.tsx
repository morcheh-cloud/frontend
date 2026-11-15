"use client"

import {
  Ellipsis,
  Globe,
  Pause,
  Server as ServerIcon,
  Star,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { shareTone } from "@/app/(panel)/containers/components/project-stats"
import { useServers } from "@/app/(panel)/servers/api"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { StatusStrip, type StripState } from "@/components/charts/time-chart"
import { formatMs, formatPercent } from "@/components/insights/format"
import { checkTip } from "@/components/insights/parts"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type { Database } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useDatabaseInsights } from "../api"
import { useDatabaseActions } from "./database-actions"
import { DatabaseMenuItems } from "./database-menu"
import { buildModel, type DatabaseModel } from "./insights/model"
import {
  EngineTile,
  endpointLabel,
  engineName,
  HealthDot,
  problems,
  stateOf,
  statusMeta,
} from "./meta"
import { useDatabaseCan } from "./permissions"

type Tone = "destructive" | "warning" | null

// How loud a database's card is: down = red (a refused sign-in = orange),
// failing checks by their health.
export function toneOf(d: Database): Tone {
  if (d.paused) return null
  if (d.status !== "online" && d.status !== "unknown")
    return d.status === "auth_failed" ? "warning" : "destructive"
  if (d.health === "critical") return "destructive"
  if (d.health === "warning") return "warning"
  return null
}

// What's wrong, in one line ("" = nothing).
export function noteOf(d: Database) {
  if (d.paused) return ""
  if (d.status !== "online" && d.status !== "unknown")
    return d.status_message || statusMeta[d.status].hint
  const issues = problems(d)
  if (!issues.length) return ""
  return (
    issues
      .slice(0, 2)
      .map((c) => c.title)
      .join(" · ") + (issues.length > 2 ? ` +${issues.length - 2}` : "")
  )
}

// The last 24 hours of every database, from the same request the Insights
// tab makes (shared cache), keyed by id.
export function useDayHistory() {
  const query = useDatabaseInsights("24h")
  const model = query.data ? buildModel(query.data) : null
  return {
    model,
    byId: new Map((model?.databases ?? []).map((d) => [d.id, d] as const)),
  }
}

export function DatabaseCards({
  items,
  checking,
  showServer,
}: {
  items: Database[]
  checking: Set<string | undefined>
  showServer: boolean
}) {
  const day = useDayHistory()
  // Server names for "through <server>"; cached by every servers page.
  const servers = useServers({ limit: 500 })
  const names = new Map(
    (servers.data?.items ?? []).map((s) => [s.id, s.name] as const),
  )
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,21rem),1fr))] gap-4">
      {items.map((d) => (
        <DatabaseCard
          key={d.id}
          database={d}
          checking={checking.has(d.id)}
          history={day.byId.get(d.id)}
          day={day.model}
          serverName={
            d.server_id
              ? (names.get(d.server_id) ?? (showServer ? undefined : ""))
              : undefined
          }
        />
      ))}
    </ul>
  )
}

const toneBorder: Record<NonNullable<Tone>, string> = {
  destructive: "border-destructive/40",
  warning: "border-warning/40",
}
const tonePill: Record<NonNullable<Tone>, string> = {
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
}

function DatabaseCard({
  database: d,
  checking,
  history,
  day,
  serverName,
}: {
  database: Database
  checking: boolean
  history?: DatabaseModel
  day: ReturnType<typeof useDayHistory>["model"]
  // "" = reached through a server whose name isn't known here.
  serverName?: string
}) {
  const actions = useDatabaseActions()
  const can = useDatabaseCan()
  const tone = toneOf(d)
  const state = stateOf(d)
  const note = noteOf(d)
  const online = d.status === "online" && !d.paused
  const share =
    d.connections != null && d.max_connections
      ? Math.min(100, (d.connections / d.max_connections) * 100)
      : null
  const growth = history?.growth ?? null

  const checked = d.paused
    ? "Monitoring off"
    : d.last_checked_at
      ? `Checked ${timeAgo(d.last_checked_at)}`
      : "Not checked yet"

  return (
    <li
      className={cn(
        "group/card relative flex min-w-0 flex-col gap-2.5 rounded-2xl border bg-card p-4 shadow-sm transition-[border-color,box-shadow] hover:shadow-md",
        tone ? toneBorder[tone] : "border-border hover:border-mist",
      )}
    >
      {/* Header: what it is, star and menu. */}
      <div className="flex items-center gap-3">
        <EngineTile
          engine={d.engine}
          flavor={d.flavor}
          className="size-9 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/databases/${d.id}`}
            className="block truncate text-body-sm font-medium outline-none after:absolute after:inset-0 after:rounded-2xl hover:text-brand focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {d.name}
          </Link>
          <p className="truncate text-caption text-ash">
            {engineName(d)}
            {d.version && ` ${d.version}`}
            {d.role && d.role !== "standalone" && ` · ${d.role}`}
          </p>
        </div>
        <div className="relative z-10 -me-2 flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              d.favorite ? "Remove from favorites" : "Add to favorites"
            }
            aria-pressed={d.favorite}
            disabled={!can(d, "operator")}
            onClick={() => actions.toggleFavorite(d)}
            className={cn(
              "text-ash",
              !d.favorite &&
                "opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100",
            )}
          >
            <Star className={cn(d.favorite && "fill-brand text-brand")} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${d.name} actions`}
                  className="text-ash"
                />
              }
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DatabaseMenuItems database={d} checking={checking} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* The numbers. */}
      <dl className={cn("grid grid-cols-3 gap-3", !online && "opacity-60")}>
        <Stat
          label="Size"
          value={d.size_bytes != null ? formatSize(d.size_bytes) : "—"}
          sub={
            growth
              ? `${growth > 0 ? "+" : "−"}${formatSize(Math.abs(growth))} today`
              : undefined
          }
        />
        <Stat
          label="Connections"
          value={
            d.connections != null ? (
              <>
                {d.connections}
                {d.max_connections != null && (
                  <span className="text-caption text-ash">
                    {" "}
                    / {d.max_connections}
                  </span>
                )}
              </>
            ) : (
              "—"
            )
          }
          sub={
            share !== null ? (
              <span
                className="mt-1 block h-1 overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`${Math.round(share)}% of the limit`}
              >
                <span
                  className={cn(
                    "block h-full rounded-full",
                    shareTone(share) === "brand" && "bg-brand",
                    shareTone(share) === "warning" && "bg-warning",
                    shareTone(share) === "destructive" && "bg-destructive",
                  )}
                  style={{ width: `${Math.max(share, 2)}%` }}
                />
              </span>
            ) : undefined
          }
        />
        <Stat
          label="Response"
          value={online && d.latency_ms != null ? formatMs(d.latency_ms) : "—"}
          sub={
            history?.latency_p95 != null
              ? `p95 ${formatMs(history.latency_p95)}`
              : undefined
          }
        />
      </dl>

      {/* The last 24 hours. */}
      <div className="flex items-center gap-2">
        {history && day ? (
          <div className="relative z-10 min-w-0 flex-1">
            <StatusStrip
              compact
              states={history.strip}
              tooltip={(i) => checkTip(day.buckets, history.series, i)}
              label={`${d.name}: checks over the last 24 hours`}
            />
          </div>
        ) : (
          <Skeleton className="h-4 min-w-0 flex-1 rounded-md" />
        )}
        <span
          title="Up over the last 24 hours"
          className="shrink-0 text-caption text-ash tabular-nums"
        >
          {history?.uptime != null ? formatPercent(history.uptime) : "24h"}
        </span>
      </div>

      {/* What's wrong. */}
      {note && (
        <p
          title={note}
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-caption",
            tone === "destructive" ? "text-destructive" : "text-warning",
          )}
        >
          <TriangleAlert className="size-3.5 shrink-0" />
          <span className="truncate">{note}</span>
        </p>
      )}

      {/* Where it lives, and its state. */}
      <div className="mt-auto flex min-w-0 items-center gap-2 text-caption text-muted-foreground">
        {d.server_id ? (
          <ServerIcon className="size-3.5 shrink-0 text-ash" />
        ) : (
          <Globe className="size-3.5 shrink-0 text-ash" />
        )}
        <span className="min-w-0 flex-1 truncate">
          {serverName ? (
            <>
              {serverName}
              {d.container && (
                <span className="text-ash"> · container {d.container}</span>
              )}
            </>
          ) : (
            <span className="font-mono">{endpointLabel(d)}</span>
          )}
        </span>
        <span
          title={checked}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 font-medium whitespace-nowrap",
            tone ? tonePill[tone] : "bg-muted text-muted-foreground",
          )}
        >
          {d.paused ? (
            <Pause className="size-3" />
          ) : (
            <HealthDot database={d} checking={checking} />
          )}
          {checking ? "Checking…" : state.label}
        </span>
      </div>
    </li>
  )
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-caption text-ash">{label}</dt>
      <dd className="truncate text-body tabular-nums">{value}</dd>
      {sub && (
        <dd className="truncate text-caption text-muted-foreground tabular-nums">
          {sub}
        </dd>
      )}
    </div>
  )
}

const miniFill: Record<StripState, string> = {
  ok: "bg-success",
  some: "bg-warning",
  down: "bg-destructive",
  none: "bg-muted",
}

// A thin 24-hour strip for phone rows (no hover there).
export function MiniStrip({
  states,
  label,
  className,
}: {
  states: StripState[]
  label: string
  className?: string
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "flex h-1.5 gap-px overflow-hidden rounded-full",
        className,
      )}
    >
      {states.map((s, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: one per bucket
        <span key={i} className={cn("min-w-px flex-1", miniFill[s])} />
      ))}
    </span>
  )
}

export function CardsSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,21rem),1fr))] gap-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          key={i}
          className="flex flex-col gap-3 rounded-2xl border border-border p-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-xl" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-5 w-full" />
        </div>
      ))}
    </div>
  )
}
