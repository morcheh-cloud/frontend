import type { PitrBackup, PitrRun, Storage } from "@/lib/services"
import { backupsHref } from "../backups/meta"

// Continuous backup (point-in-time recovery) of PostgreSQL with pgBackRest:
// the Backups tab's "Point in time" list and its setup page.

export const pitrHref = (id: string) => backupsHref(id, "pitr")
export const pitrSetupHref = (id: string) => `/databases/${id}/pitr/setup`

export const backupTypeLabel: Record<PitrBackup["type"], string> = {
  full: "Full",
  diff: "Differential",
  incr: "Incremental",
}

export const backupTypeHint: Record<PitrBackup["type"], string> = {
  full: "Everything. Restores start from one.",
  diff: "What changed since the last full backup.",
  incr: "What changed since the last backup of any kind.",
}

export const runKindLabel = (r: PitrRun) => {
  switch (r.kind) {
    case "setup":
      return "Set up"
    case "restart":
      return "Restart PostgreSQL"
    case "backup":
      return `${backupTypeLabel[r.variant as PitrBackup["type"]] ?? "A"} backup`
    case "check":
      return "Check archiving"
    case "restore":
      return r.variant === "replace"
        ? "Restore over the server"
        : "Restore to a copy"
    case "teardown":
      return "Take a copy down"
    case "remove":
      return "Turn off"
  }
  return r.kind
}

export const runActive = (r: Pick<PitrRun, "state">) =>
  r.state === "queued" || r.state === "running"

// Whether pgBackRest can keep its repository on a storage, and why not.
export function storageFit(s: Storage): string | null {
  if (s.read_only) return "Read-only in Morche"
  if (s.protocol === "s3") {
    const host = s.host.trim()
    if (host.includes("://") && !host.startsWith("https://")) {
      return "pgBackRest needs HTTPS for S3"
    }
    return null
  }
  if (s.protocol === "sftp") {
    if (s.auth_method !== "private_key")
      return "pgBackRest signs in with a key only"
    if (!s.host_key_fingerprint) return "Check it once so Morche trusts its key"
    return null
  }
  return `pgBackRest can't use ${s.protocol.toUpperCase()}`
}

// A folder name from a database name.
export const slugOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "postgres"

// ---- Schedules: presets over three cron lines ----

export type FullEvery = "day" | "week" | "month"
export type IncrEvery = "off" | "15m" | "1h" | "6h"

export type Plan = {
  custom: boolean
  fullEvery: FullEvery
  // 0 = Sunday … 6.
  fullDay: number
  // "HH:MM"
  time: string
  diff: boolean
  incr: IncrEvery
  fullCron: string
  diffCron: string
  incrCron: string
}

export const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

export const incrLabels: Record<IncrEvery, string> = {
  off: "Off",
  "15m": "Every 15 minutes",
  "1h": "Every hour",
  "6h": "Every 6 hours",
}

// Days as cron writes them shortest: [1,2,3,4,5,6] → "1-6".
function compactDays(days: number[]) {
  const out: string[] = []
  for (let i = 0; i < days.length; ) {
    let j = i
    while (j + 1 < days.length && days[j + 1] === days[j] + 1) j++
    out.push(
      j - i >= 2 ? `${days[i]}-${days[j]}` : days.slice(i, j + 1).join(","),
    )
    i = j + 1
  }
  return out.join(",")
}

// "1-3,5" → "1,2,3,5", so either way of writing it compares equal.
const expandDays = (cron: string) =>
  cron.replace(/(\d+)-(\d+)/g, (_, a, b) =>
    Array.from(
      { length: Number(b) - Number(a) + 1 },
      (_, k) => Number(a) + k,
    ).join(","),
  )

const hm = (time: string) => {
  const [h, m] = time.split(":").map((v) => Number(v) || 0)
  return { h: Math.min(23, h), m: Math.min(59, m) }
}

// The three cron lines a preset stands for.
export function cronsOf(p: Plan): { full: string; diff: string; incr: string } {
  if (p.custom) {
    return {
      full: p.fullCron.trim(),
      diff: p.diffCron.trim(),
      incr: p.incrCron.trim(),
    }
  }
  const { h, m } = hm(p.time)
  let full = `${m} ${h} * * *`
  let diff = ""
  if (p.fullEvery === "week") {
    full = `${m} ${h} * * ${p.fullDay}`
    const others = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== p.fullDay)
    if (p.diff) diff = `${m} ${h} * * ${compactDays(others)}`
  } else if (p.fullEvery === "month") {
    full = `${m} ${h} 1 * *`
    if (p.diff) diff = `${m} ${h} 2-31 * *`
  }
  // Incrementals sit between the nightly runs, half past the hour.
  const incr =
    p.incr === "15m"
      ? "*/15 * * * *"
      : p.incr === "1h"
        ? "30 * * * *"
        : p.incr === "6h"
          ? "30 */6 * * *"
          : ""
  return { full, diff, incr }
}

// A saved schedule back into a preset, or Custom when it isn't one.
export function planOf(full: string, diff: string, incr: string): Plan {
  const base: Plan = {
    custom: false,
    fullEvery: "week",
    fullDay: 0,
    time: "01:00",
    diff: true,
    incr: "off",
    fullCron: full,
    diffCron: diff,
    incrCron: incr,
  }
  const m = full.match(/^(\d+) (\d+) (\*|1) \* (\*|\d)$/)
  if (!m) return { ...base, custom: true }
  const time = `${m[2].padStart(2, "0")}:${m[1].padStart(2, "0")}`
  const fullEvery: FullEvery =
    m[3] === "1" ? "month" : m[4] === "*" ? "day" : "week"
  const guess: Plan = {
    ...base,
    fullEvery,
    fullDay: fullEvery === "week" ? Number(m[4]) : 0,
    time,
    diff: !!diff,
    incr:
      (Object.keys(incrLabels) as IncrEvery[]).find(
        (k) => cronsOf({ ...base, incr: k }).incr === incr,
      ) ?? "off",
  }
  const c = cronsOf(guess)
  if (
    c.full !== full ||
    expandDays(c.diff) !== expandDays(diff) ||
    c.incr !== incr
  ) {
    return { ...base, custom: true }
  }
  return guess
}

export function planText(p: Plan): string {
  if (p.custom) return "Custom schedule"
  const parts = [
    p.fullEvery === "day"
      ? `Full every day at ${p.time}`
      : p.fullEvery === "week"
        ? `Full every ${weekdays[p.fullDay]} at ${p.time}`
        : `Full on the 1st at ${p.time}`,
  ]
  if (p.diff && p.fullEvery !== "day") parts.push("differential the other days")
  if (p.incr !== "off")
    parts.push(`incremental ${incrLabels[p.incr].toLowerCase()}`)
  return parts.join(", ")
}

// How long ago, in words ("3 h", "2 d").
export function ago(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "never"
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}

// A span in words: "6 days 4 hours".
export function spanText(ms: number) {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))} s`
  const m = Math.round(ms / 60000)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h} h ${m % 60 ? `${m % 60} min` : ""}`.trim()
  const d = Math.floor(h / 24)
  return `${d} days${h % 24 ? ` ${h % 24} h` : ""}`
}
