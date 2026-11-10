import {
  ArrowLeftRight,
  CircleCheck,
  CircleDashed,
  CirclePause,
  CircleX,
  Cog,
  Container,
  Database,
  Globe,
  Layers,
  type LucideIcon,
  Mail,
  MemoryStick,
  Plug,
  Rabbit,
  Radar,
  Radio,
  RadioTower,
  Search,
  Send,
  ShieldCheck,
  Signpost,
  SquareTerminal,
  TriangleAlert,
  Webhook,
  Zap,
} from "lucide-react"
import {
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import { engineMeta } from "@/app/(panel)/databases/components/meta"
import { API_URL } from "@/lib/api"
import type { Beat, MonitorBody, UptimeMonitor } from "@/lib/services"
import { cn } from "@/lib/utils"

export type Kind = MonitorBody["kind"]
export type MonitorState = UptimeMonitor["status"] | "paused"

export type KindGroup = "web" | "network" | "data" | "server" | "push"

export const kindGroups: { value: KindGroup; label: string }[] = [
  { value: "web", label: "Websites & APIs" },
  { value: "network", label: "Network" },
  { value: "data", label: "Databases & queues" },
  { value: "server", label: "On a server" },
  { value: "push", label: "Heartbeat" },
]

export const kinds: {
  value: Kind
  label: string
  short: string
  icon: LucideIcon
  group: KindGroup
}[] = [
  {
    value: "http",
    label: "Website or API",
    short: "HTTP(S) status, keyword, JSON value, certificate",
    icon: Globe,
    group: "web",
  },
  {
    value: "websocket",
    label: "WebSocket",
    short: "Upgrades, optionally sends a message and reads the answer",
    icon: ArrowLeftRight,
    group: "web",
  },
  {
    value: "socketio",
    label: "Socket.IO",
    short: "Completes the Engine.IO handshake",
    icon: Radio,
    group: "web",
  },
  {
    value: "elasticsearch",
    label: "Elasticsearch / OpenSearch",
    short: "Cluster health green or yellow",
    icon: Search,
    group: "data",
  },
  {
    value: "tcp",
    label: "TCP port",
    short: "Opens a connection; optional send / expect",
    icon: Plug,
    group: "network",
  },
  {
    value: "udp",
    label: "UDP port",
    short: "Sends a datagram and waits for the answer",
    icon: Send,
    group: "network",
  },
  {
    value: "ping",
    label: "Ping",
    short: "ICMP echo, packet loss and round trip",
    icon: Radar,
    group: "network",
  },
  {
    value: "dns",
    label: "DNS record",
    short: "Resolves a name, optionally checks the answer",
    icon: Signpost,
    group: "network",
  },
  {
    value: "tls",
    label: "TLS certificate",
    short: "Handshake and days until it expires",
    icon: ShieldCheck,
    group: "network",
  },
  {
    value: "smtp",
    label: "Mail server (SMTP)",
    short: "Greeting, STARTTLS and sign-in",
    icon: Mail,
    group: "network",
  },
  {
    value: "database",
    label: "Database",
    short: "PostgreSQL, MySQL, SQL Server, MongoDB, Redis",
    icon: Database,
    group: "data",
  },
  {
    value: "rabbitmq",
    label: "RabbitMQ",
    short: "AMQP connect and sign-in",
    icon: Rabbit,
    group: "data",
  },
  {
    value: "kafka",
    label: "Kafka",
    short: "Broker answers its API versions",
    icon: Layers,
    group: "data",
  },
  {
    value: "nats",
    label: "NATS",
    short: "INFO, CONNECT and PING/PONG",
    icon: Zap,
    group: "data",
  },
  {
    value: "mqtt",
    label: "MQTT broker",
    short: "CONNECT accepted",
    icon: RadioTower,
    group: "data",
  },
  {
    value: "memcached",
    label: "Memcached",
    short: "Answers version",
    icon: MemoryStick,
    group: "data",
  },
  {
    value: "docker",
    label: "Docker container",
    short: "Running and healthy",
    icon: Container,
    group: "server",
  },
  {
    value: "systemd",
    label: "systemd unit",
    short: "Active, not failed",
    icon: Cog,
    group: "server",
  },
  {
    value: "command",
    label: "Command",
    short: "Exit 0 up, 1 degraded, anything else down",
    icon: SquareTerminal,
    group: "server",
  },
  {
    value: "push",
    label: "Push (heartbeat)",
    short: "Your job calls a link; silence means down",
    icon: Webhook,
    group: "push",
  },
]

export const kindMeta = Object.fromEntries(
  kinds.map((k) => [k.value, k]),
) as Record<Kind, (typeof kinds)[number]>

export function KindIcon({
  kind,
  className,
}: {
  kind: string
  className?: string
}) {
  const Icon = kindMeta[kind as Kind]?.icon ?? Globe
  return <Icon className={className} aria-hidden />
}

// Kinds that need a server to run on, and the ones that can't use one.
export const onServer = (k: Kind) =>
  k === "docker" || k === "systemd" || k === "command"
export const morchehOnly = (k: Kind) => k === "push" || k === "udp"

export const stateOf = (m: Pick<UptimeMonitor, "paused" | "status">) =>
  (m.paused ? "paused" : m.status) as MonitorState

export const stateMeta: Record<
  MonitorState,
  { label: string; icon: LucideIcon; text: string; dot: string; rank: number }
> = {
  down: {
    label: "Down",
    icon: CircleX,
    text: "text-destructive",
    dot: "bg-destructive",
    rank: 0,
  },
  degraded: {
    label: "Degraded",
    icon: TriangleAlert,
    text: "text-warning",
    dot: "bg-warning",
    rank: 1,
  },
  pending: {
    label: "Pending",
    icon: CircleDashed,
    text: "text-muted-foreground",
    dot: "bg-mist",
    rank: 2,
  },
  up: {
    label: "Up",
    icon: CircleCheck,
    text: "text-success",
    dot: "bg-success",
    rank: 3,
  },
  paused: {
    label: "Paused",
    icon: CirclePause,
    text: "text-ash",
    dot: "bg-mist",
    rank: 4,
  },
}

// Worst first, then by name.
export const byState = (a: UptimeMonitor, b: UptimeMonitor) =>
  stateMeta[stateOf(a)].rank - stateMeta[stateOf(b)].rank ||
  a.name.localeCompare(b.name)

export function StateBadge({
  state,
  className,
}: {
  state: MonitorState
  className?: string
}) {
  const s = stateMeta[state]
  const Icon = s.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-body-sm font-medium whitespace-nowrap",
        s.text,
        className,
      )}
    >
      <Icon className="size-4 shrink-0" />
      {s.label}
    </span>
  )
}

const beatColor: Record<string, string> = {
  up: "bg-success",
  degraded: "bg-warning",
  down: "bg-destructive",
}

// The last checks as thin bars, oldest first, padded on the left so new
// monitors line up with old ones.
export function BeatBar({
  beats,
  size = 40,
  className,
}: {
  beats: Beat[]
  size?: number
  className?: string
}) {
  const shown = beats.slice(-size)
  const pad = size - shown.length
  return (
    <div
      role="img"
      aria-label={beatSummary(shown)}
      className={cn("flex h-6 items-stretch gap-[2px]", className)}
    >
      {Array.from({ length: pad }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed padding slots
        <span key={`pad-${i}`} className="w-1 shrink-0 rounded-full bg-muted" />
      ))}
      {shown.map((b) => (
        <span
          key={b.at}
          title={`${new Date(b.at).toLocaleString()} · ${b.status}${
            b.latency_ms != null ? ` · ${b.latency_ms} ms` : ""
          }${b.message ? ` · ${b.message}` : ""}`}
          className={cn(
            "w-1 shrink-0 rounded-full",
            beatColor[b.status] ?? "bg-mist",
          )}
        />
      ))}
    </div>
  )
}

function beatSummary(beats: Beat[]) {
  if (beats.length === 0) return "No checks yet"
  const down = beats.filter((b) => b.status === "down").length
  const slow = beats.filter((b) => b.status === "degraded").length
  return `Last ${beats.length} checks: ${beats.length - down - slow} up, ${slow} degraded, ${down} down`
}

// What a monitor watches, in one line.
export function targetText(m: Pick<UptimeMonitor, "kind" | "config">) {
  const c = m.config
  const hostPort = (port?: number) =>
    port ? `${c.host}:${port}` : (c.host ?? "")
  switch (m.kind) {
    case "http":
    case "websocket":
    case "socketio":
    case "elasticsearch":
      return c.url ?? ""
    case "tcp":
    case "udp":
    case "tls":
      return hostPort(c.port)
    case "ping":
      return c.host ?? ""
    case "dns":
      return `${c.name ?? ""} ${c.record_type || "A"}${
        c.resolver ? ` @${c.resolver}` : ""
      }`
    case "database":
      return `${engineMeta[c.engine as keyof typeof engineMeta]?.label ?? c.engine} · ${hostPort(c.port)}`
    case "smtp":
    case "rabbitmq":
    case "kafka":
    case "nats":
    case "mqtt":
    case "memcached":
      return hostPort(c.port)
    case "docker":
      return c.container ?? ""
    case "systemd":
      return c.unit ?? ""
    case "command":
      return (c.script ?? "").split("\n")[0]
    case "push":
      return "Waits for a heartbeat"
  }
  return ""
}

// "every 60 s", "every 5 min", "every 2 h".
export function intervalText(seconds: number) {
  if (seconds % 3600 === 0) return `every ${seconds / 3600} h`
  if (seconds % 60 === 0) return `every ${seconds / 60} min`
  return `every ${seconds} s`
}

// "45 s", "12 min", "3 h 5 min", "2 d 4 h".
export function durationText(seconds: number) {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s} s`
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d) return h ? `${d} d ${h} h` : `${d} d`
  if (h) return m ? `${h} h ${m} min` : `${h} h`
  return `${m} min`
}

// The backend sends uptime as a percent (0–100).
export function uptimeText(p?: number | null) {
  if (p == null) return "—"
  if (p >= 99.995) return "100%"
  if (p >= 99) return `${p.toFixed(2)}%`
  return `${p.toFixed(1)}%`
}

// The address a push monitor waits on.
export function pushUrl(token: string) {
  const base =
    API_URL || (typeof window === "undefined" ? "" : window.location.origin)
  return `${base.replace(/\/$/, "")}/push/${token}`
}

export function certDaysLeft(iso?: string | null) {
  if (!iso) return null
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

// ---- URL state of /uptime ----

export const uptimeTabs = ["monitors", "incidents"] as const
export type UptimeTab = (typeof uptimeTabs)[number]
export const shows = ["all", "down", "degraded", "up", "paused"] as const
export type Show = (typeof shows)[number]

const filters = {
  tab: parseAsStringLiteral(uptimeTabs).withDefault("monitors"),
  q: parseAsString.withDefault(""),
  show: parseAsStringLiteral(shows).withDefault("all"),
  open: parseAsStringLiteral(["open", "all"] as const).withDefault("open"),
}

export function useUptimeFilters() {
  return useQueryStates(filters, { history: "replace" })
}

export const uptimeHref = createSerializer(filters)

// /uptime/new: copy an existing monitor, or start tied to a server.
export const newMonitorHref = createSerializer({
  from: parseAsString,
  server: parseAsString,
  kind: parseAsString,
  host: parseAsString,
  port: parseAsString,
})

export const matchesShow = (m: UptimeMonitor, show: Show) =>
  show === "all" || stateOf(m) === show

export const reportRanges = ["24h", "7d", "30d", "90d", "365d"] as const
export const reportRangeLabels: Record<(typeof reportRanges)[number], string> =
  {
    "24h": "24 hours",
    "7d": "7 days",
    "30d": "30 days",
    "90d": "90 days",
    "365d": "1 year",
  }
