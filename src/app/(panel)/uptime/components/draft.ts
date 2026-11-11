import { engineMeta } from "@/app/(panel)/databases/components/meta"
import type {
  LocationRule,
  MonitorBody,
  MonitorConfig,
  UptimeMonitor,
} from "@/lib/services"
import { type Kind, morchehOnly, onServer } from "./meta"

// The monitor editor's form state. The config is kept as the API's shape;
// lists and numbers that are typed live as text until saved.

export type Row = { key: string; name: string; value: string; saved?: boolean }

export type Draft = {
  kind: Kind
  name: string
  description: string
  tags: string
  c: MonitorConfig
  port: string
  statuses: string
  expected: string
  headers: Row[]
  secretHeaders: Row[]
  password: string
  token: string
  // Where it's checked from: MORCHEH and/or server ids.
  locations: string[]
  ruleDown: LocationRule["down"]
  ruleDownCount: string
  ruleDegraded: LocationRule["degraded"]
  ruleDegradedCount: string
  server: string
  interval: string
  retry: string
  timeout: string
  retries: string
  resend: string
  degraded: string
  certDays: string
  count: string
  notifyDegraded: boolean
  allowInternal: boolean
  // null = the workspace's default channels (only on create).
  channels: string[] | null
  resetPush: boolean
  paused: boolean
}

let rowSeq = 0
export const MORCHEH = "morcheh"

// The servers among a draft's locations.
export const serverLocations = (d: Pick<Draft, "locations">) =>
  d.locations.filter((l) => l !== MORCHEH)
export const fromMorcheh = (d: Pick<Draft, "locations" | "kind">) =>
  !onServer(d.kind) && d.locations.includes(MORCHEH)
// Locations the kind actually uses.
export function locationsOf(d: Pick<Draft, "locations" | "kind">): string[] {
  if (d.kind === "push") return []
  if (morchehOnly(d.kind)) return [MORCHEH]
  if (onServer(d.kind)) return serverLocations(d).slice(0, 1)
  return d.locations
}

export const newRow = (name = "", value = "", saved = false): Row => ({
  key: `r${++rowSeq}`,
  name,
  value,
  saved,
})

const listText = (l?: string[]) => (l ?? []).join(", ")
const textList = (t: string) =>
  t
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
const numText = (n?: number) => (n ? String(n) : "")

export function freshDraft(kind: Kind = "http"): Draft {
  return {
    kind,
    name: "",
    description: "",
    tags: "",
    c: { method: "GET", engine: "postgres" },
    port: "",
    statuses: "",
    expected: "",
    headers: [],
    secretHeaders: [],
    password: "",
    token: "",
    locations: [MORCHEH],
    ruleDown: "majority",
    ruleDownCount: "2",
    ruleDegraded: "any",
    ruleDegradedCount: "1",
    server: "",
    interval: "60",
    retry: "20",
    timeout: "10",
    retries: "1",
    resend: "0",
    degraded: "",
    certDays: "",
    count: "",
    notifyDegraded: false,
    allowInternal: false,
    channels: null,
    resetPush: false,
    paused: false,
  }
}

// copy: a duplicate keeps the settings, never the secrets or push token.
export function draftFrom(m: UptimeMonitor, copy = false): Draft {
  const c = m.config
  return {
    kind: m.kind as Kind,
    name: copy ? `${m.name} copy` : m.name,
    description: m.description ?? "",
    tags: listText(m.tags),
    c: { ...c, method: c.method || "GET", engine: c.engine || "postgres" },
    port: numText(c.port),
    statuses: listText(c.statuses),
    expected: listText(c.expected),
    headers: Object.entries(c.headers ?? {}).map(([k, v]) => newRow(k, v)),
    secretHeaders: copy
      ? []
      : (m.secrets ?? [])
          .filter((s) => s.startsWith("header:"))
          .map((s) => newRow(s.slice(7), "", true)),
    password: "",
    token: "",
    locations: m.locations.map((l) => l.location),
    ruleDown: m.rule.down,
    ruleDownCount: String(m.rule.down_count),
    ruleDegraded: m.rule.degraded,
    ruleDegradedCount: String(m.rule.degraded_count),
    server: m.server_id ?? "",
    interval: String(m.interval_seconds),
    retry: String(m.retry_seconds),
    timeout: String(m.timeout_seconds),
    retries: String(m.retries),
    resend: String(m.resend_every ?? 0),
    degraded: numText(c.degraded_ms),
    certDays: numText(c.cert_days),
    count: numText(c.count),
    notifyDegraded: m.notify_degraded,
    allowInternal: copy ? false : m.allow_internal,
    channels: m.channel_ids ?? [],
    resetPush: false,
    paused: m.paused,
  }
}

// Which settings a kind reads.
export const uses = {
  url: (k: Kind) =>
    k === "http" ||
    k === "websocket" ||
    k === "socketio" ||
    k === "elasticsearch",
  headers: (k: Kind) =>
    k === "http" ||
    k === "websocket" ||
    k === "socketio" ||
    k === "elasticsearch",
  hostPort: (k: Kind) =>
    [
      "tcp",
      "udp",
      "tls",
      "smtp",
      "database",
      "rabbitmq",
      "kafka",
      "nats",
      "mqtt",
      "memcached",
    ].includes(k),
  tlsMode: (k: Kind) =>
    ["tcp", "smtp", "database", "rabbitmq", "kafka", "nats", "mqtt"].includes(
      k,
    ),
  ignoreTls: (k: Kind) =>
    [
      "http",
      "websocket",
      "socketio",
      "elasticsearch",
      "tcp",
      "tls",
      "smtp",
      "rabbitmq",
      "kafka",
      "nats",
      "mqtt",
    ].includes(k),
  username: (k: Kind) =>
    [
      "http",
      "elasticsearch",
      "smtp",
      "database",
      "rabbitmq",
      "nats",
      "mqtt",
    ].includes(k),
  password: (k: Kind) =>
    [
      "http",
      "elasticsearch",
      "smtp",
      "database",
      "rabbitmq",
      "nats",
      "mqtt",
    ].includes(k),
  token: (k: Kind) =>
    ["http", "websocket", "socketio", "elasticsearch", "nats"].includes(k),
  sendExpect: (k: Kind) => k === "tcp" || k === "udp" || k === "websocket",
  keyword: (k: Kind) => k === "http" || k === "websocket",
  certDays: (k: Kind) => k === "http" || k === "tls",
  slow: (k: Kind) => k !== "push",
}

// Ports each kind falls back to when none is typed.
export function defaultPort(d: Pick<Draft, "kind" | "c">): number | undefined {
  const tls = d.c.tls_mode === "tls"
  switch (d.kind) {
    case "tls":
      return 443
    case "smtp":
      return d.c.tls_mode === "tls" ? 465 : d.c.tls_mode === "none" ? 25 : 587
    case "database":
      return engineMeta[(d.c.engine || "postgres") as keyof typeof engineMeta]
        ?.port
    case "rabbitmq":
      return tls ? 5671 : 5672
    case "kafka":
      return tls ? 9093 : 9092
    case "nats":
      return 4222
    case "mqtt":
      return tls ? 8883 : 1883
    case "memcached":
      return 11211
  }
  return undefined
}

const rowsMap = (rows: Row[]) => {
  const out: Record<string, string> = {}
  for (const r of rows) if (r.name.trim()) out[r.name.trim()] = r.value
  return out
}

const int = (t: string, fallback = 0) => {
  const n = Number(t)
  return Number.isFinite(n) && t.trim() !== "" ? Math.round(n) : fallback
}

// Only what the kind reads: Huma refuses nothing extra here, but a tidy
// config keeps "what changed" honest and the saved monitor readable.
export function toConfig(d: Draft): MonitorConfig {
  const k = d.kind
  const c = d.c
  const out: MonitorConfig = {}
  if (uses.url(k)) out.url = (c.url ?? "").trim()
  if (uses.headers(k)) {
    const h = rowsMap(d.headers)
    if (Object.keys(h).length) out.headers = h
  }
  if (uses.ignoreTls(k) && c.ignore_tls) out.ignore_tls = true
  if (uses.username(k) && c.username?.trim()) out.username = c.username.trim()
  if (uses.hostPort(k) || k === "ping") out.host = (c.host ?? "").trim()
  if (uses.hostPort(k) && d.port.trim()) out.port = int(d.port)
  else if (k === "tls") out.port = 443
  if (uses.tlsMode(k) && c.tls_mode) out.tls_mode = c.tls_mode
  if (uses.sendExpect(k)) {
    if (c.send) out.send = c.send
    if (c.expect) out.expect = c.expect
  }
  if (uses.keyword(k) && c.keyword) {
    out.keyword = c.keyword
    out.keyword_mode = c.keyword_mode || "contains"
    if (c.keyword_case) out.keyword_case = true
  }
  if (uses.certDays(k) && d.certDays.trim()) out.cert_days = int(d.certDays)
  if (uses.slow(k) && d.degraded.trim()) out.degraded_ms = int(d.degraded)

  switch (k) {
    case "http":
      out.method = c.method || "GET"
      if (c.body && out.method !== "GET" && out.method !== "HEAD") {
        out.body = c.body
      }
      if (d.statuses.trim()) out.statuses = textList(d.statuses)
      if (c.no_redirects) out.no_redirects = true
      if (c.json_path?.trim()) {
        out.json_path = c.json_path.trim()
        out.json_op = c.json_op || "eq"
        if (out.json_op !== "exists") out.json_value = c.json_value ?? ""
      }
      break
    case "elasticsearch":
      if (c.min_health) out.min_health = c.min_health
      break
    case "tls":
      if (c.server_name?.trim()) out.server_name = c.server_name.trim()
      break
    case "ping":
      if (d.count.trim()) out.count = int(d.count)
      break
    case "dns":
      out.name = (c.name ?? "").trim()
      out.record_type = c.record_type || "A"
      if (c.resolver?.trim()) out.resolver = c.resolver.trim()
      if (d.expected.trim()) out.expected = textList(d.expected)
      break
    case "database":
      out.engine = c.engine || "postgres"
      if (c.database?.trim()) out.database = c.database.trim()
      break
    case "docker":
      out.container = (c.container ?? "").trim()
      if (c.sudo) out.sudo = true
      break
    case "systemd":
      out.unit = (c.unit ?? "").trim()
      break
    case "command":
      out.script = c.script ?? ""
      if (c.sudo) out.sudo = true
      break
  }
  return out
}

export function toBody(d: Draft, creating: boolean): MonitorBody {
  const k = d.kind
  const secretHeaders: Record<string, string> = {}
  if (uses.headers(k)) {
    for (const r of d.secretHeaders) {
      if (r.name.trim()) secretHeaders[r.name.trim()] = r.value
    }
  }
  const locations = locationsOf(d)
  const onIt = onServer(k) ? (locations[0] ?? "") : ""
  return {
    kind: k,
    name: d.name.trim(),
    description: d.description.trim(),
    tags: textList(d.tags),
    config: toConfig(d),
    secrets: {
      password: uses.password(k) && d.password ? d.password : undefined,
      token: uses.token(k) && d.token ? d.token : undefined,
      headers: Object.keys(secretHeaders).length ? secretHeaders : undefined,
    },
    locations: k === "push" ? undefined : locations,
    rule: k === "push" ? undefined : toRule(d),
    server_id: d.server || onIt || undefined,
    interval_seconds: int(d.interval, 60),
    retry_seconds: int(d.retry, 20),
    timeout_seconds: int(d.timeout, 10),
    retries: int(d.retries, 1),
    resend_every: int(d.resend, 0),
    notify_degraded: d.notifyDegraded,
    allow_internal: d.allowInternal,
    channel_ids: d.channels ?? undefined,
    paused: creating ? d.paused : undefined,
    reset_push_token:
      !creating && k === "push" && d.resetPush ? true : undefined,
  }
}

const count = (t: string, fallback: number) =>
  Math.min(50, Math.max(1, int(t, fallback)))

export const toRule = (d: Draft): LocationRule => ({
  down: d.ruleDown,
  down_count: count(d.ruleDownCount, 2),
  degraded: d.ruleDegraded,
  degraded_count: count(d.ruleDegradedCount, 1),
})

// The rule in words, for n locations: "Down when 2 of 3 fail; degraded
// when 1 has trouble".
export function ruleText(r: LocationRule, n: number) {
  const of = (need: number) => (need >= n ? `all ${n}` : `${need} of ${n}`)
  const down =
    r.down === "any"
      ? 1
      : r.down === "all"
        ? n
        : r.down === "count"
          ? Math.min(r.down_count, n)
          : Math.floor(n / 2) + 1
  const deg =
    r.degraded === "never"
      ? 0
      : r.degraded === "any"
        ? 1
        : r.degraded === "count"
          ? Math.min(r.degraded_count, n)
          : Math.floor(n / 2) + 1
  const downText =
    down === 1 ? "Down when any location fails" : `Down when ${of(down)} fail`
  if (deg === 0) return `${downText}; otherwise up.`
  const degText =
    deg === 1 ? "any location has trouble" : `${of(deg)} have trouble`
  return `${downText}; otherwise degraded when ${degText}.`
}

export const sameDraft = (a: Draft, b: Draft) =>
  JSON.stringify(toBody(a, false)) === JSON.stringify(toBody(b, false))

export type Errors = Record<string, string>

// What the backend would refuse, said before sending.
export function checkDraft(d: Draft): Errors {
  const e: Errors = {}
  const k = d.kind
  const c = d.c
  if (!d.name.trim()) e.name = "Give it a name"
  if (uses.url(k)) {
    const want = k === "websocket" ? ["ws:", "wss:"] : ["http:", "https:"]
    try {
      const u = new URL((c.url ?? "").trim())
      if (!want.includes(u.protocol)) {
        e["config.url"] = `The address must start with ${want
          .map((p) => `${p}//`)
          .join(" or ")}`
      }
    } catch {
      e["config.url"] = (c.url ?? "").trim()
        ? `Enter the full address, e.g. ${want[1]}//example.com`
        : "Enter the address"
    }
  }
  if ((uses.hostPort(k) || k === "ping") && !(c.host ?? "").trim()) {
    e["config.host"] = "Enter the host"
  } else if (
    (uses.hostPort(k) || k === "ping") &&
    /[/\s]|^[a-z]+:\/\//i.test((c.host ?? "").trim())
  ) {
    e["config.host"] = "Just the host name or IP, without a scheme or path"
  }
  const port = d.port.trim()
  if (port && !(Number.isInteger(Number(port)) && +port > 0 && +port < 65536)) {
    e["config.port"] = "A port from 1 to 65535"
  } else if ((k === "tcp" || k === "udp" || k === "tls") && !port) {
    if (k !== "tls") e["config.port"] = "Enter the port"
  }
  if (k === "udp" && !c.send) {
    e["config.send"] =
      "Enter what to send: a UDP service only answers a request"
  }
  if (k === "dns") {
    if (!(c.name ?? "").trim()) e["config.name"] = "Enter the name to look up"
    if (serverLocations(d).length && !(c.resolver ?? "").trim()) {
      e["config.resolver"] =
        "From a server, enter the DNS server to ask (e.g. 1.1.1.1)"
    }
  }
  if (k === "docker" && !(c.container ?? "").trim()) {
    e["config.container"] = "Enter the container's name"
  }
  if (k === "systemd" && !(c.unit ?? "").trim()) {
    e["config.unit"] = "Enter the unit's name"
  }
  if (k === "command" && !(c.script ?? "").trim()) {
    e["config.script"] = "Enter the command"
  }
  if (onServer(k) && !serverLocations(d).length) {
    e.locations = "Pick the server it runs on"
  } else if (!morchehOnly(k) && !d.locations.length) {
    e.locations = "Pick at least one place to check from"
  }

  if (k === "http" && c.keyword_mode === "regex" && c.keyword) {
    try {
      new RegExp(c.keyword)
    } catch {
      e["config.keyword"] = "Not a valid regular expression"
    }
  }

  const range = (key: string, t: string, min: number, max: number) => {
    const n = Number(t)
    if (t.trim() === "" || !Number.isInteger(n) || n < min || n > max) {
      e[key] = `A whole number from ${min} to ${max}`
    }
  }
  range("interval_seconds", d.interval, 10, 86400)
  if (d.ruleDown === "count") range("rule.down_count", d.ruleDownCount, 1, 50)
  if (d.ruleDegraded === "count") {
    range("rule.degraded_count", d.ruleDegradedCount, 1, 50)
  }
  range("retry_seconds", d.retry, 5, 86400)
  range("timeout_seconds", d.timeout, 1, 120)
  range("retries", d.retries, 0, 20)
  range("resend_every", d.resend, 0, 10000)
  if (d.degraded.trim()) range("config.degraded_ms", d.degraded, 0, 600000)
  if (d.certDays.trim()) range("config.cert_days", d.certDays, 0, 365)
  if (d.count.trim()) range("config.count", d.count, 0, 20)
  if (
    !e.timeout_seconds &&
    !e.interval_seconds &&
    Number(d.timeout) > Number(d.interval)
  ) {
    e.timeout_seconds = "The time limit can't be longer than the interval"
  }
  return e
}

// Which form key each changed draft field clears.
export const errorKeysOf: Partial<Record<keyof Draft, string[]>> = {
  port: ["config.port"],
  interval: ["interval_seconds", "timeout_seconds"],
  retry: ["retry_seconds"],
  timeout: ["timeout_seconds"],
  retries: ["retries"],
  resend: ["resend_every"],
  degraded: ["config.degraded_ms"],
  certDays: ["config.cert_days"],
  count: ["config.count"],
  statuses: ["config.statuses"],
  expected: ["config.expected"],
  locations: ["locations", "config.resolver", "allow_internal"],
  ruleDownCount: ["rule.down_count"],
  ruleDegradedCount: ["rule.degraded_count"],
  server: ["server_id"],
  allowInternal: ["allow_internal"],
  channels: ["channel_ids"],
}
