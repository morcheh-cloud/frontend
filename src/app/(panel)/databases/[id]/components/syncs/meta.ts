import {
  ArrowRightLeft,
  CopyCheck,
  ListPlus,
  type LucideIcon,
  RotateCcw,
} from "lucide-react"

import { createSerializer, parseAsString } from "nuqs"

import type { Database, DatabaseSync } from "@/lib/services"

export type SyncMode = DatabaseSync["mode"]

// What each mode does, in the words the editor and the guide use.
export const modeMeta: Record<
  SyncMode,
  {
    label: string
    icon: LucideIcon
    short: string
    long: string
    // Can delete or overwrite what's on the target.
    destructive: boolean
    engines: Database["engine"][]
  }
> = {
  tables: {
    label: "Chosen tables",
    icon: ArrowRightLeft,
    short: "Compare the tables you pick, row by row, and apply the difference.",
    long: "Like Navicat's Data Sync: rows are matched by key, new ones are inserted, changed ones updated and, if you allow it, extra ones deleted. You pick what wins when both sides changed.",
    destructive: false,
    engines: ["postgres", "mysql"],
  },
  mirror: {
    label: "Mirror",
    icon: CopyCheck,
    short: "Keep the whole database identical, row by row, with no downtime.",
    long: "Every table is compared and the target is made to match: inserts, updates and deletes. Tables missing on the target are created. The target stays online the whole time.",
    destructive: true,
    engines: ["postgres", "mysql"],
  },
  incremental: {
    label: "Only new data",
    icon: ListPlus,
    short: "Copy only rows added or changed since the last run.",
    long: "Each table needs a column that grows (an id, or an updated_at time). Morche remembers where it stopped and reads only past it. Deletes aren't seen; a full check now and then catches up.",
    destructive: false,
    engines: ["postgres", "mysql"],
  },
  replace: {
    label: "Replace",
    icon: RotateCcw,
    short: "Wipe the target and load a fresh dump of the source.",
    long: "A dump of the source is streamed into the target, which is dropped and recreated first. Simple and exact, but the target is empty for a moment and everything on it is lost.",
    destructive: true,
    engines: ["postgres", "mysql", "mongodb"],
  },
}

export const syncModes = Object.keys(modeMeta) as SyncMode[]

export const conflictLabels: Record<string, string> = {
  overwrite: "The source wins",
  keep_target: "Keep the target's row",
  newer_wins: "The newer row wins",
  stop: "Stop the sync",
}

export const errorLabels: Record<string, string> = {
  skip: "Skip the row, go on",
  stop_table: "Stop that table, go on",
  stop: "Stop everything",
}

export const noKeyLabels: Record<string, string> = {
  skip: "Leave the table out",
  reload: "Empty it and copy it whole",
}

export const newSyncHref = (databaseId: string) =>
  `/databases/${databaseId}/syncs/new`

export const syncHref = (databaseId: string, syncId: string) =>
  `/databases/${databaseId}/syncs/${syncId}`

// The Syncs tab of a database page; `run` opens that run over the list.
export const syncsParsers = { run: parseAsString }

const serializeSyncs = createSerializer({
  tab: parseAsString,
  run: parseAsString,
})

export const syncsHref = (databaseId: string, run?: string) =>
  serializeSyncs(`/databases/${databaseId}`, { tab: "syncs", run: run || null })

export const destructive = (
  mode: SyncMode,
  options?: DatabaseSync["options"],
) => modeMeta[mode].destructive || !!options?.delete

export function triggerText(
  s: Pick<DatabaseSync, "trigger" | "cron" | "interval_minutes">,
  cronText: (c: string) => string,
) {
  if (s.trigger === "interval") {
    const m = s.interval_minutes
    return m % 60 === 0
      ? `Every ${m === 60 ? "hour" : `${m / 60} hours`}`
      : `Every ${m === 1 ? "minute" : `${m} minutes`}`
  }
  if (s.trigger === "schedule") return cronText(s.cron)
  return "By hand"
}

export const endText = (e: DatabaseSync["source"]) =>
  e.name ? `${e.label} › ${e.name}` : e.label

export const count = (n: number) => n.toLocaleString()
