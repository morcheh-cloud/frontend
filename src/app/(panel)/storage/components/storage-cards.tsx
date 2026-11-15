"use client"

import { Ellipsis, Lock, Star, TriangleAlert } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { Meter } from "@/app/(panel)/servers/[id]/components/resources"
import {
  StatusDot,
  statusMeta,
  timeAgo,
} from "@/app/(panel)/servers/components/meta"
import { StatusStrip } from "@/components/charts/time-chart"
import {
  formatGrowth,
  formatMs,
  formatPercent,
} from "@/components/insights/format"
import { checkTip } from "@/components/insights/parts"
import { problemStatuses } from "@/components/panel/problems"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type { Storage } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useStorageInsights } from "../api"
import { buildModel, type StorageModel } from "./insights/model"
import { diskNote } from "./insights/parts"
import { endpointLabel, ProtocolTile, providerLabel } from "./meta"
import { useStorageCan } from "./permissions"
import { useStorageActions } from "./storage-actions"
import { StorageMenuItems } from "./storage-menu"

type Tone = "destructive" | "warning" | null

const problems: readonly string[] = problemStatuses

export const isProblem = (s: Storage) => problems.includes(s.status)

// How loud a storage's card is: a refused sign-in is orange, the rest red.
export function toneOf(s: Storage): Tone {
  if (!isProblem(s)) return null
  return s.status === "auth_failed" ? "warning" : "destructive"
}

// The last 24 hours of every storage, from the same request Insights makes
// with that range (shared cache), keyed by id.
export function useStorageDay() {
  const query = useStorageInsights("24h")
  const model = query.data ? buildModel(query.data) : null
  return {
    model,
    byId: new Map((model?.storages ?? []).map((s) => [s.id, s] as const)),
  }
}

const grid =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] gap-4"

export function StorageCards({
  items,
  checking,
}: {
  items: Storage[]
  checking: Set<string | undefined>
}) {
  const day = useStorageDay()
  return (
    <ul className={grid}>
      {items.map((s) => (
        <StorageCard
          key={s.id}
          storage={s}
          checking={checking.has(s.id)}
          history={day.byId.get(s.id)}
          day={day.model}
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

function StorageCard({
  storage: s,
  checking,
  history,
  day,
}: {
  storage: Storage
  checking: boolean
  history?: StorageModel
  day: ReturnType<typeof useStorageDay>["model"]
}) {
  const actions = useStorageActions()
  const can = useStorageCan()
  const tone = toneOf(s)
  const online = s.status === "online"
  const usage = history?.usage
  const disk = history ? diskNote(history) : null
  const moved = history?.activity
  const runs = moved ? moved.ok + moved.failed : 0
  const note = tone ? s.status_message || statusMeta[s.status].label : ""
  const checked = s.last_checked_at
    ? `Checked ${timeAgo(s.last_checked_at)}`
    : "Not checked yet"

  return (
    <li
      className={cn(
        "group/card relative flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-[border-color,box-shadow] hover:shadow-md",
        tone ? toneBorder[tone] : "border-border hover:border-mist",
      )}
    >
      {/* Header: what it is, star and menu. */}
      <div className="flex items-center gap-3">
        <ProtocolTile
          protocol={s.protocol}
          className="size-9 rounded-xl bg-brand-soft text-brand-strong"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/storage/${s.id}`}
            className="block truncate text-body-sm font-medium outline-none after:absolute after:inset-0 after:rounded-2xl hover:text-brand focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {s.name}
          </Link>
          <p className="truncate text-caption text-ash">
            {providerLabel(s)}
            {online && s.detail && ` · ${s.detail}`}
          </p>
        </div>
        <div className="relative z-10 -me-2 flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              s.favorite ? "Remove from favorites" : "Add to favorites"
            }
            aria-pressed={s.favorite}
            disabled={!can(s, "operator")}
            onClick={() => actions.toggleFavorite(s)}
            className={cn(
              "text-ash",
              !s.favorite &&
                "opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100",
            )}
          >
            <Star className={cn(s.favorite && "fill-brand text-brand")} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${s.name} actions`}
                  className="text-ash"
                />
              }
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <StorageMenuItems storage={s} checking={checking} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* The numbers. */}
      <dl className="grid grid-cols-3 gap-3">
        <Stat
          label="Used"
          value={usage ? formatSize(usage.used_bytes) : "—"}
          sub={
            usage
              ? history?.growth
                ? `${formatGrowth(history.growth, formatSize)} in 24 h`
                : `${usage.files.toLocaleString("en")} files`
              : history
                ? "Not measured"
                : undefined
          }
        />
        <Stat
          label="Response"
          value={online && s.latency_ms != null ? formatMs(s.latency_ms) : "—"}
          sub={
            history?.latency_p95 != null
              ? `p95 ${formatMs(history.latency_p95)}`
              : undefined
          }
        />
        <Stat
          label="Moved · 24 h"
          value={moved?.bytes ? formatSize(moved.bytes) : "—"}
          sub={
            moved?.failed ? (
              <span className="text-destructive">{moved.failed} failed</span>
            ) : runs ? (
              `${runs} ${runs === 1 ? "run" : "runs"}`
            ) : history ? (
              "Nothing moved"
            ) : undefined
          }
        />
      </dl>

      {/* Disk space behind it (SFTP). */}
      {disk && (
        <div title={disk.text} className="flex flex-col gap-1">
          <Meter value={disk.percent} label={disk.text} className="h-1.5" />
          <span className="truncate text-caption text-ash">{disk.text}</span>
        </div>
      )}

      {/* The last 24 hours. */}
      <div className="flex items-center gap-2">
        {history && day ? (
          <div className="relative z-10 min-w-0 flex-1">
            <StatusStrip
              compact
              states={history.strip}
              tooltip={(i) => checkTip(day.buckets, history.series, i)}
              label={`${s.name}: checks over the last 24 hours`}
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
      <div className="mt-auto flex min-w-0 items-center gap-2 border-t border-border pt-3 text-caption text-muted-foreground">
        <span className="min-w-0 flex-1 truncate font-mono">
          {endpointLabel(s)}
        </span>
        {s.read_only && (
          <Lock aria-label="Read-only" className="size-3.5 shrink-0 text-ash" />
        )}
        <span
          title={checked}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 font-medium whitespace-nowrap",
            tone ? tonePill[tone] : "bg-muted text-muted-foreground",
          )}
        >
          <StatusDot status={s.status} checking={checking} />
          {checking ? "Checking…" : statusMeta[s.status].label}
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

export function StorageCardsSkeleton() {
  return (
    <div className={grid}>
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
          <Skeleton className="h-4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}
