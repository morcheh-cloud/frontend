import { CronExpressionParser } from "cron-parser"
import cronstrue from "cronstrue"

import type { CronOverview } from "@/lib/services"

export const nicknames: Record<string, string> = {
  "@reboot": "At every boot",
  "@yearly": "Once a year, on 1 January at 00:00",
  "@annually": "Once a year, on 1 January at 00:00",
  "@monthly": "On the 1st of every month at 00:00",
  "@weekly": "Every Sunday at 00:00",
  "@daily": "Every day at 00:00",
  "@midnight": "Every day at 00:00",
  "@hourly": "Every hour, on the hour",
}

// "0 9 * * 1-5" → "At 09:00, Monday through Friday". null when unreadable.
export function describe(schedule: string): string | null {
  const s = schedule.trim()
  const nick = nicknames[s.toLowerCase()]
  if (nick) return nick
  if (s.split(/\s+/).length !== 5) return null
  try {
    return cronstrue.toString(s, {
      use24HourTimeFormat: true,
      throwExceptionOnParseError: true,
    })
  } catch {
    return null
  }
}

// Why a five-field schedule is invalid, or null when it is fine.
export function scheduleError(schedule: string): string | null {
  const s = schedule.trim()
  if (!s) return "Enter a schedule"
  if (s.startsWith("@")) {
    return nicknames[s.toLowerCase()] ? null : "Unknown nickname"
  }
  if (s.split(/\s+/).length !== 5) {
    return "Use five fields: minute hour day-of-month month day-of-week"
  }
  try {
    CronExpressionParser.parse(s, { strict: false })
    return null
  } catch (e) {
    return e instanceof Error
      ? e.message.replace(/^Constraint error, /, "")
      : "Not valid"
  }
}

// The server's clock: its zone (for cron-parser and formatting) and how far
// the browser's clock is off from it.
export type ServerClock = {
  zone: string
  label: string
  skew: number
}

export function serverClock(o: CronOverview, fetchedAt: number): ServerClock {
  const offset = o.utc_offset || "+00:00"
  const fixed =
    offset === "+00:00" ? "UTC" : `UTC${offset.replace(/^([+-])0?/, "$1")}`
  const zone = o.timezone && isZone(o.timezone) ? o.timezone : fixed
  const label =
    o.timezone && o.timezone !== "UTC"
      ? `${o.timezone} (UTC${offset})`
      : offset === "+00:00"
        ? "UTC"
        : `UTC${offset}`
  return { zone, label, skew: Date.parse(o.server_time) - fetchedAt }
}

function isZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

// Intl doesn't take "UTC+3:30"; shift the time and format it as UTC instead.
function zoned(date: Date, zone: string): { date: Date; timeZone: string } {
  const m = zone.match(/^UTC([+-])(\d+)(?::(\d+))?$/)
  if (!m) return { date, timeZone: zone }
  const minutes =
    (Number(m[2]) * 60 + Number(m[3] ?? 0)) * (m[1] === "-" ? -1 : 1)
  return { date: new Date(date.getTime() + minutes * 60_000), timeZone: "UTC" }
}

export function formatAt(
  iso: Date | string,
  clock: ServerClock,
  opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  },
) {
  const z = zoned(typeof iso === "string" ? new Date(iso) : iso, clock.zone)
  return new Intl.DateTimeFormat("en", {
    ...opts,
    timeZone: z.timeZone,
  }).format(z.date)
}

export function serverNow(clock: ServerClock) {
  return new Date(Date.now() + clock.skew)
}

// The next `count` runs, in real time; [] for @reboot or a bad schedule.
// CRON_TZ (cronie) moves the schedule to another zone.
export function nextRuns(
  schedule: string,
  clock: ServerClock,
  count = 1,
  cronTz?: string,
): Date[] {
  const s = schedule.trim().toLowerCase()
  if (s === "@reboot") return []
  const expr = s === "@midnight" ? "@daily" : s === "@annually" ? "@yearly" : s
  try {
    const it = CronExpressionParser.parse(expr, {
      currentDate: serverNow(clock),
      tz: cronTz && isZone(cronTz) ? cronTz : clock.zone,
    })
    return it.take(count).map((d) => d.toDate())
  } catch {
    return []
  }
}

// ---- Builder ----

export type Mode =
  | "minutes"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "reboot"
  | "custom"

export type Builder = {
  mode: Mode
  every: number // minutes
  minute: number
  hour: number
  days: number[] // 0 = Sunday
  dom: number
  custom: string
}

export const modes: { value: Mode; label: string }[] = [
  { value: "minutes", label: "Every few minutes" },
  { value: "hourly", label: "Every hour" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
  { value: "monthly", label: "Every month" },
  { value: "reboot", label: "At boot" },
  { value: "custom", label: "Custom" },
]

export const minuteSteps = [1, 2, 5, 10, 15, 20, 30]
export const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const num = (s: string, max: number) =>
  /^\d+$/.test(s) && Number(s) <= max ? Number(s) : null

// Reads a schedule into the builder; anything it can't show is "custom".
export function toBuilder(schedule: string): Builder {
  const s = schedule.trim()
  const b: Builder = {
    mode: "custom",
    every: 15,
    minute: 0,
    hour: 3,
    days: [1],
    dom: 1,
    custom: s,
  }
  const lower = s.toLowerCase()
  if (lower === "@reboot") return { ...b, mode: "reboot" }
  if (lower === "@hourly") return { ...b, mode: "hourly" }
  if (lower === "@daily" || lower === "@midnight") {
    return { ...b, mode: "daily", hour: 0 }
  }
  if (lower === "@weekly") return { ...b, mode: "weekly", hour: 0, days: [0] }
  if (lower === "@monthly") return { ...b, mode: "monthly", hour: 0 }
  const f = s.split(/\s+/)
  if (f.length !== 5) return b
  const [mi, h, dom, mon, dow] = f
  if (mon !== "*") return b
  const minute = num(mi, 59)
  const hour = num(h, 23)
  const step = mi.match(/^\*\/(\d+)$/)
  if (step && h === "*" && dom === "*" && dow === "*") {
    const every = Number(step[1])
    if (minuteSteps.includes(every)) return { ...b, mode: "minutes", every }
  }
  if (mi === "*" && h === "*" && dom === "*" && dow === "*") {
    return { ...b, mode: "minutes", every: 1 }
  }
  if (minute === null) return b
  if (h === "*" && dom === "*" && dow === "*") {
    return { ...b, mode: "hourly", minute }
  }
  if (hour === null) return b
  if (dom === "*" && dow === "*") return { ...b, mode: "daily", minute, hour }
  if (dom === "*") {
    const days = parseDays(dow)
    if (days) return { ...b, mode: "weekly", minute, hour, days }
  }
  const d = num(dom, 31)
  if (dow === "*" && d) return { ...b, mode: "monthly", minute, hour, dom: d }
  return b
}

function parseDays(dow: string): number[] | null {
  const out = new Set<number>()
  for (const part of dow.split(",")) {
    const [a, z] = part.split("-").map((x) => num(x, 7))
    if (a === null || z === null) return null
    for (let d = a; d <= (z ?? a); d++) out.add(d % 7)
  }
  return [...out].sort()
}

// 1,2,3,4,5 → 1-5
function formatDays(days: number[]) {
  const sorted = [...new Set(days)].sort()
  const runs: string[] = []
  for (let i = 0; i < sorted.length; i++) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++
    runs.push(
      j - i >= 2
        ? `${sorted[i]}-${sorted[j]}`
        : sorted.slice(i, j + 1).join(","),
    )
    i = j
  }
  return runs.join(",") || "*"
}

export function fromBuilder(b: Builder): string {
  switch (b.mode) {
    case "minutes":
      return b.every === 1 ? "* * * * *" : `*/${b.every} * * * *`
    case "hourly":
      return `${b.minute} * * * *`
    case "daily":
      return `${b.minute} ${b.hour} * * *`
    case "weekly":
      return `${b.minute} ${b.hour} * * ${formatDays(b.days)}`
    case "monthly":
      return `${b.minute} ${b.hour} ${b.dom} * *`
    case "reboot":
      return "@reboot"
    default:
      return b.custom.trim()
  }
}

export const presets = [
  { label: "Every 5 minutes", schedule: "*/5 * * * *" },
  { label: "Hourly", schedule: "0 * * * *" },
  { label: "Daily at 03:00", schedule: "0 3 * * *" },
  { label: "Weekdays at 09:00", schedule: "0 9 * * 1-5" },
  { label: "Sundays at 00:00", schedule: "0 0 * * 0" },
  { label: "1st of the month", schedule: "0 0 1 * *" },
]

// ---- Command hints ----

export type CommandHint = {
  key: string
  text: string
  fix?: { label: string; apply: (command: string) => string }
}

export function commandHints(command: string, mailto?: string): CommandHint[] {
  const out: CommandHint[] = []
  if (/(^|[^\\])%/.test(command)) {
    out.push({
      key: "percent",
      text: "Cron reads % as a new line, and passes what follows as input. Write \\% for a literal % (e.g. in date +%F).",
      fix: {
        label: "Escape %",
        apply: (c) => c.replace(/(?<!\\)%/g, "\\%"),
      },
    })
  }
  if (command.trim() && !/>|\|\s*logger\b/.test(command) && mailto !== "") {
    out.push({
      key: "output",
      text: "Its output isn't redirected, so cron mails it to the user (or drops it when there is no mailer).",
      fix: {
        label: "Discard output",
        apply: (c) => `${c.trimEnd()} >/dev/null 2>&1`,
      },
    })
  }
  if (/^\s*sudo\b/.test(command)) {
    out.push({
      key: "sudo",
      text: "sudo can't ask for a password under cron. Put the job in root's crontab instead.",
    })
  }
  if (/^\s*cd\s+\S+\s*;/.test(command)) {
    out.push({
      key: "cd",
      text: "If cd fails, the rest still runs in the home folder. Use && instead of ;.",
      fix: {
        label: "Use &&",
        apply: (c) => c.replace(/^(\s*cd\s+\S+)\s*;/, "$1 &&"),
      },
    })
  }
  return out
}
