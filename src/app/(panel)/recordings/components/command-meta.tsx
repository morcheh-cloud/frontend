"use client"

import {
  Bot,
  CalendarClock,
  Eye,
  ListChecks,
  type LucideIcon,
  SquareTerminal,
  Wrench,
} from "lucide-react"
import {
  createSerializer,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import type { CommandLogEntry } from "@/lib/services"
import type { CommandFilters } from "../api"

export type Kind = CommandLogEntry["kind"]
export type Status = CommandLogEntry["status"]

export const kinds = [
  "terminal",
  "change",
  "job",
  "schedule",
  "read",
  "automatic",
] as const satisfies readonly Kind[]

// Why a command ran.
export const kindMeta: Record<
  Kind,
  { label: string; short: string; hint: string; icon: LucideIcon }
> = {
  terminal: {
    label: "Typed in a terminal",
    short: "Terminal",
    hint: "Command lines typed into Morche's terminals (bash, zsh)",
    icon: SquareTerminal,
  },
  change: {
    label: "Changes from the panel",
    short: "Change",
    hint: "Someone pressed a button that changes the server",
    icon: Wrench,
  },
  job: {
    label: "Background tasks",
    short: "Task",
    hint: "Copies, installs, scripts, Ansible runs…",
    icon: ListChecks,
  },
  schedule: {
    label: "Cron jobs",
    short: "Cron job",
    hint: "Morche's scheduled tasks",
    icon: CalendarClock,
  },
  read: {
    label: "Page reads",
    short: "Read",
    hint: "Commands run to show a page: lists, details, logs",
    icon: Eye,
  },
  automatic: {
    label: "Morche's upkeep",
    short: "Upkeep",
    hint: "Live stats, checks and monitors, nobody pressed anything",
    icon: Bot,
  },
}

export const statuses = [
  "ok",
  "failed",
  "running",
  "interrupted",
] as const satisfies readonly Status[]

export const statusMeta: Record<
  Status,
  { label: string; tone: "ok" | "bad" | "live" | "quiet" }
> = {
  ok: { label: "Succeeded", tone: "ok" },
  failed: { label: "Failed", tone: "bad" },
  running: { label: "Running", tone: "live" },
  interrupted: { label: "Cut off", tone: "quiet" },
  ended: { label: "Ended", tone: "quiet" },
}

export const periods = ["1h", "24h", "7d", "30d"] as const
export type Period = (typeof periods)[number]
export const periodLabels: Record<Period | "any", string> = {
  any: "Any time",
  "1h": "Last hour",
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
}

export const signInResults = [
  "signed_in",
  "failed",
  "signed_out",
  "ended",
] as const
export const signInPeriods = ["24h", "7d", "30d"] as const

export const auditTabs = ["commands", "recordings", "sign-ins"] as const
export type AuditTab = (typeof auditTabs)[number]

const parsers = {
  tab: parseAsStringLiteral(auditTabs).withDefault("commands"),
  q: parseAsString.withDefault(""),
  who: parseAsStringLiteral(["everyone", "mine"] as const).withDefault(
    "everyone",
  ),
  server: parseAsString.withDefault(""),
  user: parseAsString.withDefault(""),
  kind: parseAsArrayOf(parseAsStringLiteral(kinds)).withDefault([]),
  status: parseAsStringLiteral(statuses),
  root: parseAsBoolean.withDefault(false),
  period: parseAsStringLiteral(periods),
  ref: parseAsString.withDefault(""),
  entry: parseAsStringLiteral(["command", "shell"] as const),
  // The Sign-ins tab (with q and user above).
  result: parseAsStringLiteral(signInResults),
  since: parseAsStringLiteral(signInPeriods),
  fresh: parseAsBoolean.withDefault(false),
}

export const useCommandFilters = () =>
  useQueryStates(parsers, { history: "replace" })

// Every filter key at its default (for Clear filters and tab switches).
export const clearedFilters = {
  q: null,
  who: null,
  server: null,
  user: null,
  kind: null,
  status: null,
  root: null,
  period: null,
  ref: null,
  entry: null,
  result: null,
  since: null,
  fresh: null,
}

const serialize = createSerializer(parsers)

// A link into the audit log: `/recordings` or a server's tab.
export function commandsHref(
  base: string,
  f: Partial<{
    q: string
    server: string
    user: string
    kind: Kind[]
    status: (typeof statuses)[number]
    ref: string
    period: Period
  }>,
) {
  return serialize(base, f)
}

// A link into the Sign-ins tab of /recordings.
export function signInsHref(
  f: Partial<{
    q: string
    user: string
    result: (typeof signInResults)[number]
    fresh: boolean
  }> = {},
) {
  return serialize("/recordings", { ...f, tab: "sign-ins" })
}

type Values = ReturnType<typeof useCommandFilters>[0]

// The filters as the API takes them.
export function toCommandFilters(v: Values, q: string): CommandFilters {
  return {
    q: q || undefined,
    mine: v.who === "mine" || undefined,
    server: v.server || undefined,
    user: v.user || undefined,
    kind: v.kind.length ? v.kind : undefined,
    status: v.status ?? undefined,
    root: v.root || undefined,
    period: v.period ?? undefined,
    ref: v.ref || undefined,
    entry: v.entry ?? undefined,
  }
}

// How many filters are set besides the search.
export function activeFilters(v: Values) {
  return [
    v.who === "mine",
    !!v.server,
    !!v.user,
    v.kind.length > 0,
    !!v.status,
    v.root,
    !!v.period,
    !!v.ref,
    !!v.entry,
  ].filter(Boolean).length
}

// "120 ms", "4.2 s", "3 min 07 s", "1 h 02 min".
export function duration(ms?: number) {
  if (ms === undefined || ms === null) return ""
  if (ms < 1000) return `${ms} ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ${`${Math.floor(s % 60)}`.padStart(2, "0")} s`
  return `${Math.floor(m / 60)} h ${`${m % 60}`.padStart(2, "0")} min`
}

// How it ended, in a few words.
export function resultText(c: CommandLogEntry) {
  switch (c.status) {
    case "running":
      return "Running"
    case "interrupted":
      return c.entry === "shell" ? "Morche restarted" : "Cut off"
    case "ok":
      return c.entry === "shell" ? "Closed" : "Exit 0"
    case "failed":
      if (c.error) return c.error
      return `Exit ${c.exit_code}`
    default:
      return c.entry === "shell" ? "Closed" : "Ended"
  }
}

export const whoText = (c: CommandLogEntry) =>
  c.mine ? "You" : c.user_name || "Morche"

const fullTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
})
export const exactTime = (iso: string) => fullTime.format(new Date(iso))

const shortTime = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})
const shortDay = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
})
// "14:03:22" today, "Nov 9, 14:03:22" before.
export function when(iso: string) {
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  return today
    ? shortTime.format(d)
    : `${shortDay.format(d)}, ${shortTime.format(d)}`
}

// The day heading a group of rows: "Today", "Yesterday", "Mon, Nov 9".
const dayFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
})
export function dayOf(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return "Today"
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return "Yesterday"
  return dayFmt.format(d)
}

// The link that replays a command's moment in its terminal's recording.
export function replayHref(c: CommandLogEntry) {
  if (!c.recording_id) return null
  const t = Math.max(0, (c.recording_ms ?? 0) - 1000)
  return `/recordings/${c.recording_id}?t=${t}`
}
