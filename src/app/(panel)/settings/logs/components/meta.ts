import {
  createSerializer,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import type { LogArchiveView, LogDatasetView, LogPolicy } from "@/lib/services"

export const LOGS_HOME = "/settings/logs"
export const DEFAULT_FOLDER = "/morcheh-archives"
export const MAX_STORAGES = 10

// ---- URL state ----

export const listTabs = ["kinds", "archives"] as const
export const archiveStates = [
  "",
  "stored",
  "running",
  "failed",
  "interrupted",
] as const

const archiveParsers = {
  dataset: parseAsString.withDefault(""),
  state: parseAsStringLiteral(archiveStates).withDefault(""),
  held: parseAsBoolean.withDefault(false),
  page: parseAsInteger.withDefault(1),
}

export const listParsers = {
  tab: parseAsStringLiteral(listTabs).withDefault("kinds"),
  q: parseAsString.withDefault(""),
  ...archiveParsers,
}

export function useListFilters() {
  return useQueryStates(listParsers, { history: "replace" })
}

export const datasetTabs = ["policy", "archives"] as const
export const datasetParsers = {
  tab: parseAsStringLiteral(datasetTabs).withDefault("policy"),
  state: archiveParsers.state,
  held: archiveParsers.held,
  page: archiveParsers.page,
}

export function useDatasetFilters() {
  return useQueryStates(datasetParsers, { history: "replace" })
}

const serializeList = createSerializer(listParsers)
const serializeDataset = createSerializer(datasetParsers)

export const logsHref = (q: Parameters<typeof serializeList>[1] = {}) =>
  serializeList(LOGS_HOME, q)

export const datasetHref = (key: string, tab?: (typeof datasetTabs)[number]) =>
  `${LOGS_HOME}/${key}${serializeDataset({ tab: tab ?? null })}`

// ---- Labels ----

export const modeMeta = {
  archive: {
    label: "Archive",
    verb: "Move into files",
    hint: "Old rows go into zip files, then leave the database. Put them back any time.",
  },
  copy: {
    label: "Copy",
    verb: "Copy into files",
    hint: "Old rows are copied into zip files and stay in the database; the built-in clean-up still deletes them later.",
  },
  delete: {
    label: "Delete",
    verb: "Delete",
    hint: "Old rows are deleted for good. No file is written.",
  },
} as const

export const periodMeta = {
  day: { label: "Day", file: "One file a day" },
  week: { label: "Week", file: "One file a week" },
  month: { label: "Month", file: "One file a month" },
} as const

export const stateMeta: Record<
  LogArchiveView["state"],
  { label: string; tone: "success" | "warning" | "muted" }
> = {
  stored: { label: "Stored", tone: "success" },
  running: { label: "Writing", tone: "muted" },
  failed: { label: "Failed", tone: "warning" },
  interrupted: { label: "Interrupted", tone: "warning" },
}

export const stateFilterLabel: Record<(typeof archiveStates)[number], string> =
  {
    "": "All",
    stored: "Stored",
    running: "Writing",
    failed: "Failed",
    interrupted: "Interrupted",
  }

// ---- Formatting ----

const dateFmt = (opts: Intl.DateTimeFormatOptions) => {
  try {
    return new Intl.DateTimeFormat(undefined, opts)
  } catch {
    return new Intl.DateTimeFormat("en", opts)
  }
}
const day = dateFmt({ day: "numeric", month: "short", year: "numeric" })
const dayShort = dateFmt({ day: "numeric", month: "short" })
const month = dateFmt({ month: "long", year: "numeric" })
const stamp = dateFmt({ dateStyle: "medium", timeStyle: "short" })

export const formatDay = (iso?: string | null) =>
  iso ? day.format(new Date(iso)) : "—"
export const formatStamp = (iso?: string | null) =>
  iso ? stamp.format(new Date(iso)) : "—"

// A window [from, to) in words: "October 2026", "3 Nov 2026", "3 – 9 Nov 2026".
export function windowLabel(from: string, to: string) {
  const a = new Date(from)
  const end = new Date(new Date(to).getTime() - 1)
  if (
    a.getDate() === 1 &&
    end.getMonth() === a.getMonth() &&
    end.getFullYear() === a.getFullYear() &&
    new Date(end.getTime() + 1).getDate() === 1
  ) {
    return month.format(a)
  }
  if (a.toDateString() === end.toDateString()) return day.format(a)
  if (a.getFullYear() === end.getFullYear()) {
    return `${dayShort.format(a)} – ${day.format(end)}`
  }
  return `${day.format(a)} – ${day.format(end)}`
}

export const formatCount = (n: number) =>
  new Intl.NumberFormat(undefined, {
    notation: n >= 100_000 ? "compact" : "standard",
  }).format(n)

export function policyText(p?: LogPolicy | null) {
  if (!p) return null
  if (!p.enabled) return "Policy off"
  const after = `after ${p.after_days} ${p.after_days === 1 ? "day" : "days"}`
  const size = p.max_mb > 0 ? ` or over ${p.max_mb} MB` : ""
  return `${modeMeta[p.mode].label} ${after}${size}`
}

export function placesText(
  p: {
    keep_local: boolean
    storage_ids: string[]
  },
  name: (id: string) => string,
) {
  const out: string[] = []
  if (p.keep_local) out.push("Morche's disk")
  for (const id of p.storage_ids) out.push(name(id))
  return out.join(", ") || "—"
}

// "Rows back until 3 Dec" / "Rows back until put away"
export function heldText(a: LogArchiveView) {
  if (a.restore.state !== "held") return null
  return a.restore.hold_until
    ? `Rows back until ${formatDay(a.restore.hold_until)}`
    : "Rows back until put away"
}

export const isExport = (a: LogArchiveView) => a.mode === "copy" && !!a.note

export function kindLabel(a: LogArchiveView) {
  if (a.mode === "archive") return "Archive"
  return a.note ? "Export" : "Copy"
}

// The built-in clean-up still runs: a copy made after it has deleted the
// rows finds nothing.
export function copyTooLate(d: LogDatasetView, afterDays: number) {
  return d.suggested_days > 0 && afterDays >= d.suggested_days
}

export const groupOrder = [
  "Audit",
  "Runs",
  "Alerts",
  "Monitoring",
  "Containers",
]

export function groupDatasets(items: LogDatasetView[]) {
  const groups = new Map<string, LogDatasetView[]>()
  for (const d of items) {
    const list = groups.get(d.group) ?? []
    list.push(d)
    groups.set(d.group, list)
  }
  return [...groups.entries()].sort(
    ([a], [b]) =>
      (groupOrder.indexOf(a) + 1 || 99) - (groupOrder.indexOf(b) + 1 || 99),
  )
}
