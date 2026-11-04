import {
  Ban,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  HardDrive,
  Loader2,
  OctagonX,
  Server,
} from "lucide-react"
import {
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import { describe } from "@/app/(panel)/servers/[id]/cron/components/schedule"
import type {
  Schedule,
  ScheduleEnd,
  ScheduleEndView,
  ScheduleOptions,
  ScheduleRun,
  ScheduleRunDest,
} from "@/lib/services"
import { cn } from "@/lib/utils"

export type RunState = ScheduleRun["state"] | ScheduleRunDest["state"]

export const runStateLabels: Record<RunState, string> = {
  queued: "Queued",
  pending: "Waiting",
  running: "Running",
  succeeded: "Succeeded",
  partial: "Partly done",
  failed: "Failed",
  canceled: "Stopped",
  interrupted: "Interrupted",
  skipped: "Skipped",
}

const stateIcons: Record<RunState, typeof Clock> = {
  queued: Clock,
  pending: CircleDashed,
  running: Loader2,
  succeeded: CircleCheck,
  partial: CircleAlert,
  failed: CircleX,
  canceled: Ban,
  interrupted: OctagonX,
  skipped: CircleDashed,
}

// A run's state as icon + text: the color only backs the word up.
export function RunStateBadge({
  state,
  dryRun,
  className,
}: {
  state: string
  dryRun?: boolean
  className?: string
}) {
  const s = (state in runStateLabels ? state : "queued") as RunState
  const Icon = stateIcons[s]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-body-sm whitespace-nowrap",
        s === "succeeded" && "text-success",
        s === "failed" && "text-destructive",
        (s === "partial" || s === "interrupted") && "text-warning",
        (s === "canceled" ||
          s === "queued" ||
          s === "skipped" ||
          s === "pending") &&
          "text-muted-foreground",
        s === "running" && "text-brand",
        className,
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", s === "running" && "animate-spin")}
      />
      {runStateLabels[s]}
      {dryRun && <span className="text-ash">· test</span>}
    </span>
  )
}

export const failedStates: readonly string[] = [
  "failed",
  "partial",
  "interrupted",
]

// Needs a look: it can't run, or its last run didn't fully work. Paused jobs
// don't count. Shared with the menu's red count.
export { cronjobBroken as needsAttention } from "@/components/panel/problems"

// ---- Modes ----

export type SyncMode = ScheduleOptions["mode"]

export const modeMeta: Record<
  SyncMode,
  { label: string; short: string; hint: string }
> = {
  update: {
    label: "Copy new and changed",
    short: "Update",
    hint: "Copies files that are new or changed since last time. Nothing is ever deleted at the destination.",
  },
  mirror: {
    label: "Mirror",
    short: "Mirror",
    hint: "Makes the destination an exact copy: files the source no longer has are deleted there too.",
  },
  snapshot: {
    label: "Snapshot",
    short: "Snapshot",
    hint: "A full copy into a new dated folder each run (e.g. 2026-11-04_03-00-00). Older snapshots can be cleaned up.",
  },
}

export const modes = (Object.keys(modeMeta) as SyncMode[]).map((m) => ({
  value: m,
  label: modeMeta[m].short,
}))

// ---- Ends ----

export const endKind = (e: ScheduleEnd) =>
  e.server_id ? ("server" as const) : ("storage" as const)

export const endId = (e: ScheduleEnd) => e.server_id ?? e.storage_id ?? ""

export const EndIcon = ({
  end,
  className,
}: {
  end: ScheduleEnd
  className?: string
}) =>
  end.server_id ? (
    <Server className={className} />
  ) : (
    <HardDrive className={className} />
  )

export function endName(e: ScheduleEndView) {
  if (e.missing || !e.name) {
    return e.server_id ? "Deleted server" : "Deleted storage"
  }
  return e.name
}

// "web-1 : /var/www"
export const endText = (e: ScheduleEndView) => `${endName(e)}:${e.path}`

// An end on one line: icon, name and path.
export function EndLabel({
  end,
  className,
}: {
  end: ScheduleEndView
  className?: string
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <EndIcon end={end} className="size-3.5 shrink-0 text-ash" />
      <span
        className={cn(
          "shrink-0 font-medium",
          end.missing && "text-destructive",
        )}
      >
        {endName(end)}
      </span>
      <span className="truncate font-mono text-caption text-muted-foreground">
        {end.path}
      </span>
    </span>
  )
}

// "web-1 → 2 places"
export function flowText(s: Pick<Schedule, "source" | "destinations">) {
  const to =
    s.destinations.length === 1
      ? endName(s.destinations[0])
      : `${s.destinations.length} places`
  return `${endName(s.source)} → ${to}`
}

// ---- Times ----

// "0 3 * * *" → "At 03:00"; "@every 6h" → "Every 6h".
export function cronText(cron: string) {
  const c = cron.trim()
  const every = c.match(/^@every\s+(.+)$/i)
  if (every) return `Every ${every[1]}`
  return describe(c) ?? c
}

// A time as it reads in the job's zone.
export function formatInZone(iso: string | null | undefined, zone: string) {
  if (!iso) return "—"
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: zone || "UTC",
    }).format(new Date(iso))
  } catch {
    return new Date(iso).toLocaleString()
  }
}

export const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

export function zones(): string[] {
  try {
    const all = Intl.supportedValuesOf("timeZone")
    return all.includes("UTC") ? all : ["UTC", ...all]
  } catch {
    return ["UTC"]
  }
}

export function duration(from?: string | null, to?: string | null) {
  if (!from) return ""
  const ms =
    (to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime()
  if (ms < 1000) return "<1s"
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

// ---- URL state of /cronjobs ----

const shows = ["all", "active", "paused", "attention"] as const
export type Show = (typeof shows)[number]

const filters = {
  q: parseAsString.withDefault(""),
  show: parseAsStringLiteral(shows).withDefault("all"),
}

export function useCronjobFilters() {
  return useQueryStates(filters, { history: "replace" })
}

export const cronjobsHref = createSerializer(filters)

// ?run= on a job's page opens that run.
export const runParam = { run: parseAsString }
const runSerializer = createSerializer(runParam)
export const runHref = (scheduleId: string, runId: string) =>
  runSerializer(`/cronjobs/${scheduleId}`, { run: runId })
