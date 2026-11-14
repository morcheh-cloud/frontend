import {
  ArrowRight,
  CalendarClock,
  Hand,
  type LucideIcon,
  RefreshCw,
  Timer,
  Truck,
  Zap,
} from "lucide-react"
import { createSerializer, parseAsString, parseAsStringLiteral } from "nuqs"

import { cronText, formatInZone } from "@/app/(panel)/cronjobs/components/meta"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import type {
  StorageSync,
  StorageSyncEnd,
  StorageSyncRun,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  type Protocol,
  ProtocolTile,
  protocolMeta,
} from "../../components/meta"
import { runActive } from "../api"

export type SyncKind = StorageSync["kind"]
export type Engine = StorageSync["engine"]
export type Mode = StorageSync["mode"]
export type Trigger = StorageSync["trigger"]

export const kindMeta: Record<
  SyncKind,
  { label: string; plural: string; icon: LucideIcon; text: string }
> = {
  migrate: {
    label: "Migration",
    plural: "Migrations",
    icon: Truck,
    text: "Copies everything from one storage to another once, checks it arrived, and can empty the old one.",
  },
  sync: {
    label: "Sync",
    plural: "Syncs",
    icon: RefreshCw,
    text: "Keeps a folder on another storage up to date, by hand, on a schedule or every few minutes.",
  },
}

export const engineMeta: Record<
  Engine,
  { label: string; short: string; icon: LucideIcon; text: string }
> = {
  morche: {
    label: "Copied by Morche",
    short: "Morche",
    icon: ArrowRight,
    text: "Morche's own machine reads from one side and writes to the other. Works between any two storages.",
  },
  replication: {
    label: "MinIO replication",
    short: "Replication",
    icon: Zap,
    text: "The source MinIO copies each change to the other MinIO itself, within seconds. Nothing goes through Morche.",
  },
}

export const modeMeta: Record<Mode, { label: string; text: string }> = {
  update: {
    label: "Add and update",
    text: "New and changed files are copied. Nothing is ever deleted on the destination.",
  },
  mirror: {
    label: "Mirror",
    text: "The destination ends up exactly like the source: files gone from the source are deleted there too.",
  },
}

export const triggerMeta: Record<
  Trigger,
  { label: string; icon: LucideIcon; text: string }
> = {
  manual: {
    label: "By hand",
    icon: Hand,
    text: "Runs only when someone presses Run.",
  },
  schedule: {
    label: "On a schedule",
    icon: CalendarClock,
    text: "At set times, like every night at 02:00.",
  },
  interval: {
    label: "Every few minutes",
    icon: Timer,
    text: "In the background: starts again a set time after the last run ended.",
  },
}

export const existingMeta: Record<
  "changed" | "all" | "missing",
  { label: string; text: string }
> = {
  changed: {
    label: "Changed files",
    text: "Copy a file when its size or date differs (the usual choice).",
  },
  missing: {
    label: "Only missing files",
    text: "Never overwrite a file that's already there.",
  },
  all: {
    label: "Everything",
    text: "Copy every file again, even the same ones.",
  },
}

export const isMinio = (e?: Pick<StorageSyncEnd, "protocol" | "provider">) =>
  e?.protocol === "s3" && e.provider === "minio"

export const replicable = (s: Pick<StorageSync, "source" | "dest">) =>
  isMinio(s.source) && isMinio(s.dest)

export const isReplication = (s: Pick<StorageSync, "engine">) =>
  s.engine === "replication"

// How it's started, in a few words.
export function triggerText(
  s: Pick<StorageSync, "trigger" | "cron" | "timezone" | "interval_minutes">,
) {
  if (s.trigger === "schedule") return cronText(s.cron)
  if (s.trigger === "interval") return everyText(s.interval_minutes)
  return "By hand"
}

export function everyText(minutes: number) {
  if (minutes % 1440 === 0) {
    const d = minutes / 1440
    return d === 1 ? "Every day" : `Every ${d} days`
  }
  if (minutes % 60 === 0) {
    const h = minutes / 60
    return h === 1 ? "Every hour" : `Every ${h} hours`
  }
  return `Every ${minutes} minutes`
}

export const isRunning = (s: StorageSync) =>
  !!s.last_run?.id && runActive(s.last_run.state)

export type Tone = "problem" | "running" | "paused" | "warning" | "ok" | "idle"

// One word for the card's state, worst first.
export function syncState(s: StorageSync): { tone: Tone; label: string } {
  if (s.problem) return { tone: "problem", label: "Can't run" }
  if (isRunning(s)) {
    return {
      tone: "running",
      label: s.last_run.dry_run ? "Testing" : "Running",
    }
  }
  if (s.paused) return { tone: "paused", label: "Paused" }
  const last = s.last_run?.id && !s.last_run.dry_run ? s.last_run : null
  if (last?.state === "failed")
    return { tone: "problem", label: "Last run failed" }
  if (last && ["partial", "interrupted"].includes(last.state)) {
    return { tone: "warning", label: "Last run partly done" }
  }
  if (isReplication(s)) return { tone: "ok", label: "Replicating" }
  if (last?.state === "succeeded") {
    return {
      tone: "ok",
      label: s.kind === "migrate" ? "Done" : "Up to date",
    }
  }
  return {
    tone: "idle",
    label: s.kind === "migrate" ? "Not started" : "Never ran",
  }
}

export const toneDot: Record<Tone, string> = {
  problem: "bg-destructive",
  warning: "bg-warning",
  running: "bg-brand animate-pulse",
  paused: "bg-mist",
  ok: "bg-success",
  idle: "bg-mist",
}

export const toneText: Record<Tone, string> = {
  problem: "text-destructive",
  warning: "text-warning",
  running: "text-brand",
  paused: "text-muted-foreground",
  ok: "text-success",
  idle: "text-muted-foreground",
}

export function StateLabel({
  sync,
  className,
}: {
  sync: StorageSync
  className?: string
}) {
  const st = syncState(sync)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-body-sm whitespace-nowrap",
        toneText[st.tone],
        className,
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", toneDot[st.tone])} />
      {st.label}
    </span>
  )
}

// "Next in 3 hours" / "Ran 5 minutes ago" — the one line about timing.
export function timingText(s: StorageSync) {
  if (isReplication(s)) return s.paused ? "Turned off at the source" : "Live"
  if (isRunning(s)) return `Started ${timeAgo(s.last_run.at).toLowerCase()}`
  const parts: string[] = []
  if (s.last_run?.id) {
    parts.push(
      `Ran ${timeAgo(s.last_run.finished_at ?? s.last_run.at).toLowerCase()}`,
    )
  }
  if (!s.paused && s.next_run_at) parts.push(`next ${timeAgo(s.next_run_at)}`)
  return parts.join(" · ") || (s.trigger === "manual" ? "Runs by hand" : "")
}

export const nextRunText = (s: StorageSync) =>
  s.next_run_at ? formatInZone(s.next_run_at, s.timezone || "UTC") : ""

const asProtocol = (p: string): Protocol =>
  p in protocolMeta ? (p as Protocol) : "s3"

// One side of the flow: protocol tile, storage name, folder.
export function EndBadge({
  end,
  size = "md",
  className,
}: {
  end: StorageSyncEnd
  size?: "md" | "lg"
  className?: string
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-3", className)}>
      <ProtocolTile
        protocol={asProtocol(end.protocol)}
        className={size === "lg" ? "size-11 rounded-xl" : "size-9"}
      />
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate font-medium",
            size === "lg" ? "text-body" : "text-body-sm",
            end.missing && "text-destructive",
          )}
        >
          {end.missing ? "Removed storage" : end.name}
        </span>
        <span className="block truncate font-mono text-caption text-muted-foreground">
          {end.path}
        </span>
      </span>
    </span>
  )
}

// A run's numbers in one line.
export function runSummary(r: StorageSyncRun) {
  const x = r.result
  if (!x) return ""
  const parts: string[] = []
  const verb = r.dry_run ? "would copy" : "copied"
  if (x.copied || !r.dry_run) parts.push(`${x.copied} ${verb}`)
  if (x.deleted)
    parts.push(`${x.deleted} ${r.dry_run ? "would delete" : "deleted"}`)
  if (x.held)
    parts.push(`${x.held} ${x.held === 1 ? "deletion" : "deletions"} waiting`)
  if (x.waiting) parts.push(`${x.waiting} still settling`)
  if (x.failed) parts.push(`${x.failed} failed`)
  if (x.removed) parts.push(`${x.removed} removed from the source`)
  return parts.join(" · ")
}

// ---- Links ----

const newParams = {
  kind: parseAsStringLiteral(["migrate", "sync"] as const),
  source: parseAsString,
  dest: parseAsString,
}

export const newSyncParams = newParams

const newSerializer = createSerializer(newParams)

export const newSyncHref = (q: {
  kind: SyncKind
  source?: string | null
  dest?: string | null
}) => newSerializer("/storage/syncs/new", q)

const runSerializer = createSerializer({ run: parseAsString })

export const syncHref = (id: string, run?: string | null) =>
  runSerializer(`/storage/syncs/${id}`, { run: run ?? null })

export const editSyncHref = (id: string) => `/storage/syncs/${id}/edit`
