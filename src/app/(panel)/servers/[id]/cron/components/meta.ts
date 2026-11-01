"use client"

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"

import type {
  CronHistory,
  CronJob,
  CronOverview,
  CronTable,
  CronUser,
} from "@/lib/services"

// A job with the table it lives in. `key` is unique within an overview.
export type JobRow = CronJob & { table: CronTable; key: string }

export const jobKey = (table: string, line: number) => `${table}#${line}`

export function tableLabel(t: Pick<CronTable, "kind" | "user" | "path">) {
  return t.kind === "user" ? `${t.user}'s crontab` : t.path
}

export function rows(o: CronOverview): JobRow[] {
  return o.tables.flatMap((table) =>
    table.jobs.map((j) => ({ ...j, table, key: jobKey(table.id, j.line) })),
  )
}

// The title of a job: its name, else its command.
export const jobTitle = (j: CronJob) => j.name || j.command

export function envValue(t: CronTable, name: string) {
  return t.env.findLast((e) => e.name === name)?.value
}

// Where a new job can go: every editable table, then a new crontab for each
// person (root and uid ≥ 1000) who has none yet.
export function targets(o: CronOverview) {
  const out = o.tables
    .filter((t) => t.editable)
    .map((t) => ({ value: t.id, label: tableLabel(t), isNew: false }))
  if (o.access === "user") return out
  const have = new Set(o.tables.map((t) => t.user))
  for (const u of people(o.users)) {
    if (!have.has(u.name)) {
      out.push({
        value: `user:${u.name}`,
        label: `${u.name}'s crontab (new)`,
        isNew: true,
      })
    }
  }
  return out
}

// Root, then real people (uid ≥ 1000), then service accounts.
export function people(users: CronUser[]) {
  const rank = (u: CronUser) => (u.uid === 0 ? 0 : u.uid >= 1000 ? 1 : 2)
  return [...users]
    .filter((u) => u.uid < 65534)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .filter((u) => rank(u) < 2)
}

export function runUsers(users: CronUser[]) {
  const rank = (u: CronUser) => (u.uid === 0 ? 0 : u.uid >= 1000 ? 1 : 2)
  return [...users].sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name),
  )
}

// Newest run per user + command, from the cron log.
export function lastRuns(history: CronHistory | undefined) {
  const map = new Map<string, string>()
  for (const r of history?.runs ?? []) {
    const k = `${r.user}\n${r.command.trim()}`
    if (!map.has(k)) map.set(k, r.time)
  }
  return map
}

// The log shows the command as cron ran it: before the first unescaped %.
export function lastRunOf(map: Map<string, string>, j: CronJob) {
  const cmd = j.command
    .split(/(?<!\\)%/)[0]
    .replaceAll("\\%", "%")
    .trim()
  return (
    map.get(`${j.user}\n${cmd}`) ?? map.get(`${j.user}\n${j.command.trim()}`)
  )
}

const tabs = ["jobs", "timers", "periodic"] as const
const statuses = ["enabled", "disabled"] as const
export type Tab = (typeof tabs)[number]

export function useCronFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      tab: parseAsStringLiteral(tabs).withDefault("jobs"),
      q: parseAsString.withDefault(""),
      table: parseAsString,
      status: parseAsStringLiteral(statuses),
    },
    { history: "replace" },
  )
  return { filters, setFilters }
}

type Filters = ReturnType<typeof useCronFilters>["filters"]

export function hasFilters(f: Filters) {
  return Boolean(f.q || f.table || f.status)
}

export function filterRows(list: JobRow[], f: Filters) {
  const q = f.q.trim().toLowerCase()
  return list.filter((j) => {
    if (f.table && j.table.id !== f.table) return false
    if (f.status === "enabled" && !j.enabled) return false
    if (f.status === "disabled" && j.enabled) return false
    if (!q) return true
    return [j.name, j.command, j.schedule, j.user, j.table.path].some((s) =>
      s.toLowerCase().includes(q),
    )
  })
}

// Jobs grouped by table, in table order. Without filters every table shows,
// even an empty one, so there is somewhere to add the first job.
export function groupRows(o: CronOverview, list: JobRow[], f: Filters) {
  const all = !hasFilters(f)
  return o.tables
    .map((table) => ({
      table,
      jobs: list.filter((j) => j.table.id === table.id),
    }))
    .filter((g) => g.jobs.length > 0 || (all && g.table.editable))
}
