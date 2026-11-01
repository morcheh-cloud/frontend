"use client"

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"

import type { Ban, Fail2BanJail, Fail2BanOverview } from "@/lib/services"

export const JAIL_LOCAL = "/etc/fail2ban/jail.local"

const tabs = ["jails", "bans", "settings", "activity"] as const
const shows = ["enabled", "all"] as const
export type Tab = (typeof tabs)[number]

export function useF2bFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      tab: parseAsStringLiteral(tabs).withDefault("jails"),
      q: parseAsString.withDefault(""),
      show: parseAsStringLiteral(shows),
    },
    { history: "replace" },
  )
  return { filters, setFilters }
}

// ---- Durations ----

const UNITS: Record<string, number> = {
  s: 1,
  sec: 1,
  m: 60,
  mi: 60,
  min: 60,
  h: 3600,
  hour: 3600,
  d: 86400,
  day: 86400,
  w: 604800,
  week: 604800,
  mo: 2592000,
  y: 31536000,
}

// fail2ban's time values: seconds, "10m", "1h 30m", "-1" (forever).
export function seconds(v: string | undefined): number | null {
  if (!v) return null
  const s = v.trim().toLowerCase()
  if (/^-?\d+$/.test(s)) return Number(s)
  let total = 0
  let matched = false
  for (const m of s.matchAll(/(\d+(?:\.\d+)?)\s*([a-z]+)/g)) {
    const unit = UNITS[m[2]] ?? UNITS[m[2].replace(/s$/, "")]
    if (!unit) return null
    total += Number(m[1]) * unit
    matched = true
  }
  return matched ? total : null
}

export function humanDuration(sec: number | null, raw?: string) {
  if (sec === null) return raw || "—"
  if (sec < 0) return "Forever"
  if (sec === 0) return "0 s"
  const parts: [number, string][] = [
    [604800, "w"],
    [86400, "d"],
    [3600, "h"],
    [60, "min"],
    [1, "s"],
  ]
  const out: string[] = []
  let rest = sec
  for (const [size, unit] of parts) {
    if (rest >= size) {
      out.push(`${Math.floor(rest / size)} ${unit}`)
      rest %= size
    }
    if (out.length === 2) break
  }
  return out.join(" ")
}

export const duration = (v: string | undefined) => humanDuration(seconds(v), v)

// ---- Settings ----

export type SettingKind =
  | "duration"
  | "number"
  | "text"
  | "list"
  | "bool"
  | "backend"
  | "filter"
  | "action"

export type SettingMeta = {
  key: string
  label: string
  hint: string
  kind: SettingKind
  placeholder?: string
}

export const settingMeta: Record<string, SettingMeta> = {
  bantime: {
    key: "bantime",
    label: "Ban time",
    hint: "How long an address stays banned: 10m, 1h, 1d, or -1 for forever.",
    kind: "duration",
  },
  findtime: {
    key: "findtime",
    label: "Find time",
    hint: "The window failures are counted in.",
    kind: "duration",
  },
  maxretry: {
    key: "maxretry",
    label: "Max retries",
    hint: "Failures within the find time that trigger a ban.",
    kind: "number",
  },
  ignoreip: {
    key: "ignoreip",
    label: "Never ban",
    hint: "Addresses and networks that are never banned, one per line. Add your office or VPN so you can't lock yourself out.",
    kind: "list",
  },
  backend: {
    key: "backend",
    label: "Backend",
    hint: "How logs are read: auto picks one; systemd reads the journal instead of files.",
    kind: "backend",
  },
  banaction: {
    key: "banaction",
    label: "Ban action",
    hint: "What a ban does, e.g. iptables-multiport, nftables, ufw, firewallcmd-rich-rules.",
    kind: "action",
  },
  "bantime.increment": {
    key: "bantime.increment",
    label: "Longer bans for repeat offenders",
    hint: "Each new ban of the same address lasts longer.",
    kind: "bool",
  },
  "bantime.factor": {
    key: "bantime.factor",
    label: "Growth factor",
    hint: "How fast repeat bans grow (1 doubles them).",
    kind: "number",
  },
  "bantime.maxtime": {
    key: "bantime.maxtime",
    label: "Longest ban",
    hint: "Repeat bans never grow past this.",
    kind: "duration",
  },
  port: {
    key: "port",
    label: "Ports",
    hint: "Ports to block for a banned address: names or numbers, comma-separated (ssh, http,https, 2222).",
    kind: "text",
  },
  filter: {
    key: "filter",
    label: "Filter",
    hint: "Which log lines count as a failure (from filter.d).",
    kind: "filter",
  },
  logpath: {
    key: "logpath",
    label: "Log files",
    hint: "Files to watch, one per line. Ignored with the systemd backend.",
    kind: "list",
  },
}

export const defaultKeys = [
  "bantime",
  "findtime",
  "maxretry",
  "ignoreip",
  "backend",
  "banaction",
  "bantime.increment",
  "bantime.factor",
  "bantime.maxtime",
]

export const jailKeys = [
  "port",
  "filter",
  "logpath",
  "backend",
  "maxretry",
  "findtime",
  "bantime",
  "banaction",
  "ignoreip",
]

export const backends = ["auto", "systemd", "polling", "pyinotify"]

// Lists are stored one per line (continuation lines); the form shows them
// the same way. Spaces and commas also separate ignoreip entries.
export function listValue(v: string) {
  return v
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n")
}

// A short name for a config file: "jail.local", "jail.d/defaults.conf".
export function fileLabel(path: string) {
  return path.replace(/^\/etc\/fail2ban\//, "")
}

// ---- Jails ----

export type JailState = "active" | "failed" | "off"

// Enabled in the files but not running means fail2ban skipped or couldn't
// start it (or fail2ban itself is down).
export function jailState(j: Fail2BanJail): JailState {
  if (j.active) return "active"
  return j.enabled ? "failed" : "off"
}

export const stateMeta: Record<JailState, { label: string; hint: string }> = {
  active: { label: "Active", hint: "Watching its logs" },
  failed: {
    label: "Not running",
    hint: "Turned on, but fail2ban isn't running it",
  },
  off: { label: "Off", hint: "Turned off" },
}

// A value as the jail sees it: its own, else [DEFAULT]'s.
export function effective(o: Fail2BanOverview, j: Fail2BanJail, key: string) {
  return j.settings[key] ?? o.defaults.settings[key]
}

export function sortJails(list: Fail2BanJail[]) {
  const rank = (j: Fail2BanJail) => (j.active ? 0 : j.enabled ? 1 : 2)
  return [...list].sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name),
  )
}

export function filterJails(
  list: Fail2BanJail[],
  show: "enabled" | "all",
  q: string,
) {
  const needle = q.trim().toLowerCase()
  return sortJails(list).filter((j) => {
    if (show === "enabled" && !j.enabled && !j.active) return false
    if (!needle) return true
    return [j.name, j.settings.filter ?? "", j.settings.port ?? ""].some((s) =>
      s.toLowerCase().includes(needle),
    )
  })
}

// ---- Bans ----

export type BanRow = Ban & { jail: string; key: string }

export function banRows(o: Fail2BanOverview): BanRow[] {
  return o.jails
    .flatMap((j) =>
      j.bans.map((b) => ({ ...b, jail: j.name, key: `${j.name}|${b.ip}` })),
    )
    .sort((a, b) => (b.since ?? "").localeCompare(a.since ?? ""))
}

// Ban times are the server's local clock without a zone: compare them to the
// server's clock as fail2ban printed it, never to the browser's.
export function banLeft(b: Ban) {
  if (b.seconds === -1) return "Forever"
  if (!b.until || !b.since) return "—"
  const until = Date.parse(b.until.replace(" ", "T"))
  const since = Date.parse(b.since.replace(" ", "T"))
  if (Number.isNaN(until) || Number.isNaN(since)) return b.until
  return humanDuration(Math.round((until - since) / 1000))
}

export const IP_RE =
  /^(?:(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?|[0-9a-f:]*:[0-9a-f:.]*(?:\/\d{1,3})?)$/i

// Values may point at others: %(banaction)s, %(action_)s. Expands what the
// jail and [DEFAULT] define; anything else (paths-*.conf) stays as written.
export function resolve(
  o: Fail2BanOverview,
  j: Fail2BanJail | null,
  value: string | undefined,
) {
  if (!value) return value
  let out = value
  for (let i = 0; i < 4 && out.includes("%("); i++) {
    out = out.replace(/%\(([\w.-]+)\)s/g, (all, key: string) => {
      const v = j?.settings[key] ?? o.defaults.settings[key]
      return v ?? all
    })
  }
  return out
}

// What jail.local itself says for a key of a section ("" when it says
// nothing), and what applies once that is removed.
export function localValue(
  origin: Record<string, string>,
  settings: Record<string, string>,
  key: string,
) {
  return origin[key] === JAIL_LOCAL ? (settings[key] ?? "") : ""
}

export type Inherited = { value: string; from: string } | null

export function inheritedDefault(o: Fail2BanOverview, key: string): Inherited {
  const from = o.defaults.origin[key]
  if (!from || from === JAIL_LOCAL) return null
  return { value: o.defaults.settings[key], from: fileLabel(from) }
}

export function inheritedJail(
  o: Fail2BanOverview,
  j: Fail2BanJail | null,
  key: string,
): Inherited {
  const from = j?.origin[key]
  if (j && from && from !== JAIL_LOCAL) {
    return { value: j.settings[key], from: fileLabel(from) }
  }
  if (j && from === JAIL_LOCAL) return null
  const def = o.defaults.settings[key]
  if (def === undefined) return null
  return {
    value: def,
    from: `[DEFAULT] in ${fileLabel(o.defaults.origin[key] ?? "jail.conf")}`,
  }
}

// Whether jail.local has a section for the jail (so Reset/Delete applies).
export function inLocal(j: Fail2BanJail) {
  return Object.values(j.origin).includes(JAIL_LOCAL)
}

// A filter name without its options: "sshd[mode=aggressive]" → "sshd".
export function filterName(v: string | undefined) {
  return (v ?? "").replace(/\[.*$/, "").trim()
}

export const truthy = (v: string | undefined) =>
  /^(true|yes|1|on)$/i.test((v ?? "").trim())
