"use client"

import { formatSize } from "@/lib/format"
import type { StorageSync, StorageSyncRun } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useSyncRun } from "../api"
import { EndBadge, engineMeta, isRunning } from "./meta"

// Source → destination, with the engine on the line between them. The line
// turns brand and moves while a run is going.
export function Flow({
  sync: s,
  size = "md",
  className,
}: {
  sync: StorageSync
  size?: "md" | "lg"
  className?: string
}) {
  const engine = engineMeta[s.engine]
  const Icon = engine.icon
  const live = isRunning(s) || (s.engine === "replication" && !s.paused)
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <EndBadge end={s.source} size={size} className="min-w-0 flex-1" />
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center",
          size === "lg" ? "w-28" : "w-16",
        )}
        title={engine.label}
      >
        <span
          className={cn(
            "absolute inset-x-0 top-1/2 h-px -translate-y-1/2",
            live ? "bg-brand/40" : "bg-mist",
          )}
        />
        {live && (
          <span className="absolute start-0 top-1/2 size-1.5 -translate-y-1/2 animate-[sync-dot_1.6s_linear_infinite] rounded-full bg-brand motion-reduce:hidden" />
        )}
        <span
          className={cn(
            "relative flex items-center justify-center rounded-full border bg-card",
            size === "lg" ? "size-9" : "size-7",
            live ? "border-brand/40 text-brand" : "border-border text-ash",
          )}
        >
          <Icon className={size === "lg" ? "size-4" : "size-3.5"} />
        </span>
      </div>
      <EndBadge end={s.dest} size={size} className="min-w-0 flex-1" />
    </div>
  )
}

// A progress bar; null = not known yet (pulses).
export function Bar({
  done,
  className,
}: {
  done: number | null
  className?: string
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={done === null ? undefined : Math.round(done * 100)}
      className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn(
          "h-full rounded-full bg-brand transition-[width]",
          done === null && "w-1/3 animate-pulse",
        )}
        style={done === null ? undefined : { width: `${done * 100}%` }}
      />
    </div>
  )
}

export const progressShare = (r: StorageSyncRun) => {
  const p = r.progress
  if (!p) return null
  if (p.total) return Math.min(1, p.done / p.total)
  if (p.items_total) return Math.min(1, p.items / p.items_total)
  return null
}

export function progressText(r: StorageSyncRun) {
  const p = r.progress
  if (!p) return r.state === "queued" ? "Waiting to start" : "Starting…"
  const parts = [
    p.items_total ? `${p.items} of ${p.items_total} files` : `${p.items} files`,
  ]
  if (p.done > 0)
    parts.push(
      `${formatSize(p.done)}${p.total ? ` of ${formatSize(p.total)}` : ""}`,
    )
  if (p.rate > 0) parts.push(`${formatSize(p.rate)}/s`)
  return parts.join(" · ")
}

// The running run of a card or row, read live.
export function LiveProgress({
  runId,
  compact = false,
}: {
  runId: string
  compact?: boolean
}) {
  const run = useSyncRun(runId)
  const r = run.data
  return (
    <div className="flex flex-col gap-1.5">
      {!compact && (
        <div className="flex items-baseline justify-between gap-3 text-caption">
          <span className="truncate font-medium text-foreground">
            {r?.progress?.phase || r?.phase || "Working"}
          </span>
          {r && (
            <span className="shrink-0 text-ash tabular-nums">
              {progressShare(r) !== null &&
                `${Math.round((progressShare(r) ?? 0) * 100)}%`}
            </span>
          )}
        </div>
      )}
      <Bar done={r ? progressShare(r) : null} />
      <span className="truncate text-caption text-muted-foreground tabular-nums">
        {r ? progressText(r) : "Starting…"}
      </span>
    </div>
  )
}
