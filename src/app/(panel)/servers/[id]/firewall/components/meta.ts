"use client"

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"

import type {
  FilterRule,
  FirewallOverview,
  FirewallRuleBody,
  Forward,
  LogEvent,
  OpenPort,
} from "@/lib/services"

const tabs = ["rules", "ports", "forwarding", "log"] as const
const shows = ["allow", "block"] as const
export type Tab = (typeof tabs)[number]
export type Show = (typeof shows)[number]

export function useFirewallFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      tab: parseAsStringLiteral(tabs).withDefault("rules"),
      q: parseAsString.withDefault(""),
      show: parseAsStringLiteral(shows),
    },
    { history: "replace" },
  )
  return { filters, setFilters }
}

const KNOWN: Record<string, string> = {
  "21": "FTP",
  "22": "SSH",
  "25": "SMTP",
  "53": "DNS",
  "80": "HTTP",
  "80,443": "Web",
  "110": "POP3",
  "143": "IMAP",
  "443": "HTTPS",
  "465": "SMTPS",
  "587": "Mail submission",
  "993": "IMAPS",
  "995": "POP3S",
  "1433": "SQL Server",
  "3306": "MySQL",
  "3389": "Remote Desktop",
  "5432": "PostgreSQL",
  "5672": "RabbitMQ",
  "6379": "Redis",
  "8080": "HTTP (alternate)",
  "8443": "HTTPS (alternate)",
  "9200": "Elasticsearch",
  "11211": "Memcached",
  "27017": "MongoDB",
}

export const portName = (port: string | number) => KNOWN[String(port)]

export const PRESETS = [
  { label: "SSH", port: "22", protocol: "tcp" },
  { label: "Web", port: "80,443", protocol: "tcp" },
  { label: "HTTP", port: "80", protocol: "tcp" },
  { label: "HTTPS", port: "443", protocol: "tcp" },
  { label: "MySQL", port: "3306", protocol: "tcp" },
  { label: "PostgreSQL", port: "5432", protocol: "tcp" },
  { label: "Redis", port: "6379", protocol: "tcp" },
  { label: "MongoDB", port: "27017", protocol: "tcp" },
  { label: "DNS", port: "53", protocol: "any" },
  { label: "Mail", port: "25", protocol: "tcp" },
] as const

// ufw writes ranges with a colon; people write them with a dash.
export const portText = (port: string) =>
  port.replaceAll(":", "-").replaceAll(",", ", ")

export const ACTION_LABELS: Record<FilterRule["action"], string> = {
  allow: "Allow",
  block: "Block",
  reject: "Reject",
  limit: "Rate limit",
  other: "Custom",
}

export const lets = (r: Pick<FilterRule, "action">) =>
  r.action === "allow" || r.action === "limit"
export const stops = (r: Pick<FilterRule, "action">) =>
  r.action === "block" || r.action === "reject"

export function ruleName(r: FilterRule) {
  if (r.action === "other" && !r.port && !r.service) return r.raw
  if (r.service) return r.service
  if (!r.port) return r.protocol === "any" ? "All traffic" : "All ports"
  return portName(r.port) ?? `Port ${portText(r.port)}`
}

export function rulePort(r: FilterRule) {
  if (!r.port) return r.protocol === "any" ? "" : r.protocol.toUpperCase()
  const proto = r.protocol === "any" ? "" : `/${r.protocol}`
  return `${portText(r.port)}${proto}`
}

export const ruleFrom = (r: FilterRule) => r.from || "Anyone"

export function ruleMatches(r: FilterRule, q: string) {
  const text = [
    ruleName(r),
    rulePort(r),
    r.from,
    r.to,
    r.comment,
    r.zone,
    r.interface,
    ACTION_LABELS[r.action],
  ]
    .join(" ")
    .toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => text.includes(w))
}

// The rule Morche adds for a forward means nothing on a server without it.
export const canCopy = (r: FilterRule) =>
  r.editable && r.comment !== "Port forward (added by Morcheh)"

export const forwardFrom = (f: Forward) => `${portText(f.port)}/${f.protocol}`

export function forwardTo(f: Forward) {
  const port = portText(f.to_port || f.port)
  return f.to_address ? `${f.to_address}:${port}` : `This server, port ${port}`
}

// What the rule form starts from when editing.
export function toBody(r: FilterRule): FirewallRuleBody {
  return {
    action: r.action === "other" ? "allow" : r.action,
    direction: r.direction,
    protocol: r.protocol === "tcp" || r.protocol === "udp" ? r.protocol : "any",
    port: r.port.replaceAll(":", "-"),
    service: r.service,
    from: r.from,
    to: r.to,
    interface: r.interface,
    out_interface: r.out_interface,
    comment: r.comment,
    zone: r.zone,
    log: r.log,
  }
}

export function coversPort(spec: string, port: number) {
  if (!spec) return true
  return spec.split(",").some((part) => {
    const [lo, hi] = part.split(":")
    return port >= Number(lo) && port <= Number(hi ?? lo)
  })
}

export type PortState = {
  // off = nothing is filtered, whatever the rules say
  state: "off" | "open" | "limited" | "blocked"
  from: string[]
  // The rules that let it in, which Close removes.
  allowing: FilterRule[]
}

// Walks the rules like the firewall does, the first match winning, for
// someone connecting from an address no rule names.
export function portState(o: FirewallOverview, p: OpenPort): PortState {
  const allowing: FilterRule[] = []
  const from: string[] = []
  let result: PortState["state"] | undefined
  for (const r of o.rules) {
    if (r.direction !== "in" || r.action === "other" || r.interface) continue
    if (r.service && !r.port) continue
    if (r.protocol !== "any" && r.protocol !== p.protocol) continue
    if (!coversPort(r.port, p.port)) continue
    if (lets(r)) {
      allowing.push(r)
      if (r.from) from.push(r.from)
      else result ??= "open"
    } else if (!r.from) {
      result ??= "blocked"
    }
  }
  if (!o.active) return { state: "off", from, allowing }
  result ??= o.defaults.incoming === "allow" ? "open" : "blocked"
  if (result === "blocked" && from.length > 0) {
    return { state: "limited", from, allowing }
  }
  return { state: result, from, allowing }
}

export type BlockedRow = {
  key: string
  source: string
  port: number
  protocol: string
  count: number
  last: string
}

// A scan is thousands of lines for one address, so they're read per address
// and port.
export function groupEvents(events: LogEvent[]) {
  const rows = new Map<string, BlockedRow>()
  for (const e of events) {
    const key = `${e.source}|${e.protocol}|${e.port}`
    const row = rows.get(key)
    if (!row) {
      rows.set(key, {
        key,
        source: e.source,
        port: e.port,
        protocol: e.protocol,
        count: 1,
        last: e.at,
      })
      continue
    }
    row.count++
    if (e.at > row.last) row.last = e.at
  }
  return [...rows.values()].sort((a, b) => b.count - a.count)
}

// Ports that shouldn't face the whole internet: the form says so.
const SENSITIVE = new Set([
  "1433",
  "2375",
  "3306",
  "3389",
  "5432",
  "6379",
  "9200",
  "11211",
  "27017",
])
export const isSensitive = (port: string) =>
  port.split(",").some((p) => SENSITIVE.has(p.trim()))
