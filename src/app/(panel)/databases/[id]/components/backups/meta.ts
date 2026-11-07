import {
  createSerializer,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs"

import type { Backup, BackupPlan, Database } from "@/lib/services"

// The Backups tab's own tabs and page, kept in the URL so links land on the
// right list (`?tab=backups&list=restores&page=2`).
export const backupLists = ["plans", "backups", "restores"] as const
export type BackupList = (typeof backupLists)[number]

export const backupListParsers = {
  list: parseAsStringLiteral(backupLists).withDefault("plans"),
  page: parseAsInteger.withDefault(1),
}

const serializeBackups = createSerializer({
  tab: parseAsString,
  list: parseAsStringLiteral(backupLists),
})

export const backupsHref = (databaseId: string, list?: BackupList) =>
  serializeBackups(`/databases/${databaseId}`, {
    tab: "backups",
    list: list && list !== "plans" ? list : null,
  })

export const stateLabels: Record<string, string> = {
  queued: "Waiting",
  running: "Running",
  succeeded: "Done",
  failed: "Failed",
  canceled: "Canceled",
  interrupted: "Interrupted",
  skipped: "Skipped",
}

export const stateLabel = (state: string) => stateLabels[state] ?? state

export function stateTone(state: string): "success" | "warning" | "muted" {
  if (state === "succeeded") return "success"
  return state === "failed" || state === "interrupted" ? "warning" : "muted"
}

export const formatLabels: Record<string, string> = {
  pg_custom: "pg_dump, custom format",
  pg_all: "pg_dumpall, gzipped SQL",
  mysql_sql: "mysqldump, gzipped SQL",
  mysql_db: "mysqldump of one database, gzipped",
  mysql_binlog: "Binary log changes, gzipped",
  mongo_arch: "mongodump archive, gzipped",
  redis_rdb: "Redis snapshot (RDB)",
  mssql_bak: "SQL Server backup (.bak)",
  mssql_diff: "SQL Server differential backup, gzipped",
}

export const whatText = (target: string, engine: Database["engine"]) =>
  target || (engine === "redis" ? "Everything" : "All databases")

// The folder a backup's file sits in.
export const folderOf = (b: Pick<Backup, "path">) =>
  b.path.slice(0, b.path.lastIndexOf("/")) || "/"

export const when = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})

// ---- Plans ----

export type Selection = BackupPlan["selection"]
export type Retention = BackupPlan["retention"]
export type Method = BackupPlan["method"]

// The schedules most plans want; anything else is built with the gear.
export const schedulePresets = [
  { cron: "0 * * * *", label: "Hourly" },
  { cron: "0 */6 * * *", label: "Every 6 hours" },
  { cron: "0 */12 * * *", label: "Every 12 hours" },
  { cron: "0 2 * * *", label: "Daily" },
  { cron: "0 2 * * 0", label: "Weekly" },
  { cron: "0 2 1 * *", label: "Monthly" },
] as const

export const presetOf = (cron: string) =>
  schedulePresets.find((p) => p.cron === cron)

// Backend's backupSlug: lowercase ASCII letters and digits, runs of anything
// else become one dash.
export function slug(name: string) {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return s || "database"
}

const pad = (n: number) => String(n).padStart(2, "0")

// The folder a run on `at` writes to, as the backend fills it in.
export function resolveFolder(folder: string, at = new Date()) {
  const filled = folder
    .replaceAll("{year}", String(at.getFullYear()))
    .replaceAll("{month}", pad(at.getMonth() + 1))
    .replaceAll("{day}", pad(at.getDate()))
  const clean = filled.replace(/\/{2,}/g, "/").replace(/\/+$/, "")
  return clean || "/"
}

export const folderTokens = ["{year}", "{month}", "{day}"] as const

export function folderProblem(folder: string) {
  if (!folder.trim()) return "Enter a folder"
  if (!folder.startsWith("/")) return "Use a full path, starting with /"
  const rest = folderTokens.reduce((s, t) => s.replaceAll(t, ""), folder)
  if (/[{}]/.test(rest))
    return "Only {year}, {month} and {day} can be filled in"
  return ""
}

export function patternProblem(pattern: string) {
  if (!pattern.trim()) return "Enter a pattern"
  try {
    new RegExp(pattern)
    return ""
  } catch {
    return "That isn't a valid regular expression"
  }
}

// Go's RE2 and JS agree on the plain patterns people write here; the backend
// has the last word when it runs.
export function matching(pattern: string, names: string[]) {
  try {
    const re = new RegExp(pattern)
    return names.filter((n) => re.test(n))
  } catch {
    return []
  }
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`

export function selectionText(
  p: Pick<BackupPlan, "selection" | "targets" | "pattern">,
  engine: Database["engine"],
) {
  if (engine === "redis") return "Everything"
  switch (p.selection) {
    case "selected":
      return p.targets.length === 1
        ? p.targets[0]
        : plural(p.targets.length, "database")
    case "pattern":
      return `Matching ${p.pattern}`
    default:
      return "All databases"
  }
}

export function retentionText(
  p: Pick<
    BackupPlan,
    "retention" | "keep_days" | "gfs_daily" | "gfs_weekly" | "gfs_monthly"
  >,
) {
  switch (p.retention) {
    case "forever":
      return "Forever"
    case "gfs": {
      const tiers = [
        [p.gfs_daily, "daily"],
        [p.gfs_weekly, "weekly"],
        [p.gfs_monthly, "monthly"],
      ] as const
      const on = tiers.filter(([n]) => n > 0).map(([n, l]) => `${n} ${l}`)
      return on.length ? `GFS (${on.join(", ")})` : "GFS (newest only)"
    }
    default:
      return plural(p.keep_days, "day")
  }
}

export const methodText = (
  p: Pick<BackupPlan, "method" | "full_every_days">,
) =>
  p.method === "incremental"
    ? `Incremental, full every ${plural(p.full_every_days, "day")}`
    : "Full"

// Every copy that made it, and the ones that didn't.
export const storedOn = (b: Pick<Backup, "copies">) =>
  b.copies.filter((c) => c.state === "stored")

// Morcheh's own machine as a backup's runner; the backend's runner_name for it.
export const LOCAL_RUNNER = "This Morcheh server"
