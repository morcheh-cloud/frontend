import { Loader2 } from "lucide-react"
import Image from "next/image"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"

import type { Database, DatabaseCheck } from "@/lib/services"
import { cn } from "@/lib/utils"

export type Engine = Database["engine"]
export type Health = Database["health"]
export type DbStatus = Database["status"]

export const engines: {
  value: Engine
  label: string
  port: number
  user: string
  // What `dbname` means for this engine, and its usual value.
  dbLabel: string
  dbPlaceholder: string
  dbHint: string
}[] = [
  {
    value: "postgres",
    label: "PostgreSQL",
    port: 5432,
    user: "postgres",
    dbLabel: "Database",
    dbPlaceholder: "postgres",
    dbHint: "The one to sign in to. Every database on the server is watched.",
  },
  {
    value: "mysql",
    label: "MySQL / MariaDB",
    port: 3306,
    user: "root",
    dbLabel: "Database",
    dbPlaceholder: "Optional",
    dbHint: "Optional. Every schema on the server is watched.",
  },
  {
    value: "mssql",
    label: "SQL Server",
    port: 1433,
    user: "sa",
    dbLabel: "Database",
    dbPlaceholder: "master",
    dbHint: "The one to sign in to. Every database on the server is watched.",
  },
  {
    value: "mongodb",
    label: "MongoDB",
    port: 27017,
    user: "",
    dbLabel: "Auth database",
    dbPlaceholder: "admin",
    dbHint: "Where the user is defined (authSource).",
  },
  {
    value: "redis",
    label: "Redis",
    port: 6379,
    user: "",
    dbLabel: "DB number",
    dbPlaceholder: "0",
    dbHint: "Only matters for the key counts shown first.",
  },
]

export const engineMeta = Object.fromEntries(
  engines.map((e) => [e.value, e]),
) as Record<Engine, (typeof engines)[number]>

// "MariaDB 11.4", "PostgreSQL 17.2": the flavor the backend found wins over
// the engine picked in the form.
export function engineName(d: Pick<Database, "engine" | "flavor">) {
  if (d.flavor === "mariadb") return "MariaDB"
  if (d.engine === "mysql") return "MySQL"
  return engineMeta[d.engine].label
}

const logos: Record<string, string> = {
  postgres: "postgresql",
  mysql: "mysql",
  mariadb: "mariadb",
  redis: "redis",
  mongodb: "mongodb",
}

// Brand logo from Simple Icons (public/db), or a monogram where there is none.
export function EngineTile({
  engine,
  flavor,
  className,
}: {
  engine: Engine
  flavor?: string
  className?: string
}) {
  const logo = (flavor === "mariadb" && logos.mariadb) || logos[engine]
  const label = engineName({ engine, flavor: flavor ?? "" })
  if (logo) {
    return (
      <span
        title={label}
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card",
          className,
        )}
      >
        <Image
          src={`/db/${logo}.svg`}
          alt={label}
          width={64}
          height={64}
          className="size-[55%]"
        />
      </span>
    )
  }
  return (
    <span
      title={label}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-caption font-medium tracking-normal text-muted-foreground",
        className,
      )}
    >
      SQL
    </span>
  )
}

export const healthMeta: Record<
  Health,
  { label: string; dot: string; text: string; rank: number }
> = {
  critical: {
    label: "Critical",
    dot: "bg-destructive",
    text: "text-destructive",
    rank: 3,
  },
  warning: {
    label: "Warning",
    dot: "bg-warning",
    text: "text-warning",
    rank: 2,
  },
  ok: { label: "Healthy", dot: "bg-success", text: "text-success", rank: 0 },
  unknown: { label: "Not checked", dot: "bg-mist", text: "text-ash", rank: 1 },
}

export const statusMeta: Record<DbStatus, { label: string; hint: string }> = {
  online: { label: "Online", hint: "" },
  unknown: { label: "Not checked", hint: "The first check hasn't run yet." },
  unreachable: {
    label: "Unreachable",
    hint: "Nothing answered on that address and port.",
  },
  auth_failed: {
    label: "Sign-in refused",
    hint: "The database refused the username or password.",
  },
  tls_error: {
    label: "TLS error",
    hint: "The encrypted connection couldn't be set up.",
  },
  blocked: {
    label: "Blocked",
    hint: "The address is private and only a system admin can allow it.",
  },
  error: { label: "Error", hint: "" },
}

// One state for lists and headers: paused, can't connect, or its health.
export function stateOf(d: Pick<Database, "paused" | "status" | "health">): {
  label: string
  dot: string
  rank: number
} {
  if (d.paused) return { label: "Paused", dot: "bg-mist", rank: 0.5 }
  if (d.status === "unknown") return { ...healthMeta.unknown }
  if (d.status !== "online") {
    return {
      label: statusMeta[d.status].label,
      dot: d.status === "auth_failed" ? "bg-warning" : "bg-destructive",
      rank: 4,
    }
  }
  return healthMeta[d.health]
}

export function HealthDot({
  database,
  checking = false,
  className,
}: {
  database: Pick<Database, "paused" | "status" | "health">
  checking?: boolean
  className?: string
}) {
  if (checking) {
    return (
      <Loader2
        aria-label="Checking"
        className={cn("size-3 shrink-0 animate-spin text-ash", className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        stateOf(database).dot,
        className,
      )}
    />
  )
}

export const levelMeta: Record<
  DatabaseCheck["level"],
  { label: string; dot: string; rank: number }
> = {
  critical: { label: "Critical", dot: "bg-destructive", rank: 3 },
  warning: { label: "Warning", dot: "bg-warning", rank: 2 },
  unknown: { label: "Unknown", dot: "bg-mist", rank: 1 },
  ok: { label: "OK", dot: "bg-success", rank: 0 },
}

export const areaLabels: Record<DatabaseCheck["area"], string> = {
  availability: "Availability",
  capacity: "Capacity",
  performance: "Performance",
  replication: "Replication",
  backup: "Backups",
  security: "Security",
}

// Worst first; muted checks sink to the bottom.
export const byLevel = (a: DatabaseCheck, b: DatabaseCheck) =>
  Number(!!a.muted) - Number(!!b.muted) ||
  levelMeta[b.level].rank - levelMeta[a.level].rank

// The checks that need a look: not OK and not muted.
export const problems = (d: Pick<Database, "checks">) =>
  d.checks
    .filter(
      (c) => !c.muted && (c.level === "warning" || c.level === "critical"),
    )
    .sort(byLevel)

// Worst databases first, then favorites, then by name.
export const byState = (a: Database, b: Database) =>
  stateOf(b).rank - stateOf(a).rank ||
  Number(b.favorite) - Number(a.favorite) ||
  a.name.localeCompare(b.name)

const hostPort = (host: string, port: number) =>
  `${host.includes(":") ? `[${host}]` : host}:${port}`

// Where the database is: "shop@db.example.com:5432", or the container on a
// server ("in pg-main · port 5432").
export function endpointLabel(
  d: Pick<Database, "mode" | "host" | "port" | "username" | "container">,
) {
  const user = d.username ? `${d.username}@` : ""
  if (d.mode === "server" && d.container) {
    return `${user}${d.container}${d.host ? ` (${hostPort(d.host, d.port)})` : `:${d.port}`}`
  }
  return `${user}${hostPort(d.host, d.port)}`
}

export function useDatabasesFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      show: parseAsStringLiteral(["all", "problems"] as const).withDefault(
        "all",
      ),
      q: parseAsString.withDefault(""),
    },
    { history: "replace" },
  )
  return { filters, setFilters }
}

export const needsLook = (d: Database) =>
  !d.paused &&
  (d.status !== "online" || d.health === "warning" || d.health === "critical")

// ---- Connection strings ----

export type Parsed = {
  engine: Engine
  host: string
  port?: number
  username?: string
  password?: string
  dbname?: string
  tls?: Database["tls"]
}

const schemes: Record<string, Engine> = {
  postgres: "postgres",
  postgresql: "postgres",
  mysql: "mysql",
  mariadb: "mysql",
  sqlserver: "mssql",
  mssql: "mssql",
  mongodb: "mongodb",
  "mongodb+srv": "mongodb",
  redis: "redis",
  rediss: "redis",
}

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

// Reads the connection strings apps and providers hand out:
// postgres://user:pass@host:5432/db?sslmode=require, mysql://…, mongodb://…,
// redis:// and rediss://, sqlserver://host:1433;database=x, jdbc: prefixes,
// and ADO.NET "Server=…;User Id=…;Password=…". Null when it isn't one.
export function parseConnectionString(raw: string): Parsed | null {
  const text = raw.trim().replace(/^jdbc:/i, "")
  if (!text) return null
  const url = text.match(
    /^([a-z][a-z0-9+.-]*):\/\/(?:([^:@/]*)(?::([^@/]*))?@)?([^/?#;]*)([^?#;]*)([?;][^#]*)?/i,
  )
  if (url) {
    const engine = schemes[url[1].toLowerCase()]
    if (!engine) return null
    // Several hosts (replica sets): the first one.
    const first = url[4].split(",")[0]
    const hp = first.match(/^\[([^\]]+)\](?::(\d+))?$|^([^:]*)(?::(\d+))?$/)
    const host = decode(hp?.[1] ?? hp?.[3] ?? "")
    const port = Number(hp?.[2] ?? hp?.[4]) || undefined
    const params = new Map<string, string>()
    for (const pair of (url[6] ?? "").slice(1).split(/[&;]/)) {
      const [k, ...v] = pair.split("=")
      if (k) params.set(k.trim().toLowerCase(), decode(v.join("=").trim()))
    }
    const path = decode(url[5].replace(/^\//, ""))
    const out: Parsed = {
      engine,
      host,
      port,
      username: url[2] ? decode(url[2]) : undefined,
      password: url[3] !== undefined ? decode(url[3]) : undefined,
    }
    if (engine === "mongodb") {
      out.dbname = params.get("authsource") || path || undefined
      if (params.get("tls") === "true" || params.get("ssl") === "true") {
        out.tls = "require"
      }
      if (url[1].toLowerCase() === "mongodb+srv") out.tls = "require"
    } else if (engine === "mssql") {
      out.dbname =
        params.get("database") || params.get("initial catalog") || path
      out.username = out.username || params.get("user id") || params.get("user")
      out.password = out.password ?? params.get("password")
      out.tls = sqlServerTls(params)
    } else if (engine === "redis") {
      out.dbname = path || undefined
      if (url[1].toLowerCase() === "rediss") out.tls = "require"
    } else {
      out.dbname = path || params.get("database") || undefined
      out.tls = sslMode(params)
    }
    return out
  }
  return parseAdo(text)
}

function sslMode(p: Map<string, string>): Database["tls"] | undefined {
  const mode = p.get("sslmode") ?? p.get("ssl-mode") ?? p.get("ssl")
  if (!mode) return undefined
  if (/^(disable|disabled|false|allow|prefer|preferred)$/i.test(mode)) {
    return "disable"
  }
  if (/verify/i.test(mode)) return "verify"
  return "require"
}

function sqlServerTls(p: Map<string, string>): Database["tls"] | undefined {
  const encrypt = p.get("encrypt")
  if (!encrypt) return undefined
  if (/^(false|no|disable|optional)$/i.test(encrypt)) return "disable"
  return /^(true|yes)$/i.test(p.get("trustservercertificate") ?? "")
    ? "require"
    : "verify"
}

// "Server=tcp:db.example.com,1433;Database=shop;User Id=sa;Password=…" (SQL
// Server) or "Server=…;Port=3306;Uid=…;Pwd=…" (MySQL Connector/NET).
function parseAdo(text: string): Parsed | null {
  const p = new Map<string, string>()
  for (const pair of text.split(";")) {
    const i = pair.indexOf("=")
    if (i > 0) {
      p.set(pair.slice(0, i).trim().toLowerCase(), pair.slice(i + 1).trim())
    }
  }
  const server =
    p.get("server") ??
    p.get("data source") ??
    p.get("host") ??
    p.get("address") ??
    p.get("addr")
  if (!server) return null
  const mysql = p.has("port") || p.has("uid") || p.has("pwd")
  const plain = server.replace(/^tcp:/i, "")
  const [host, portText] = plain.includes(",")
    ? plain.split(",")
    : [plain, p.get("port")]
  return {
    engine: mysql ? "mysql" : "mssql",
    host: host.trim(),
    port: Number(portText) || undefined,
    username: p.get("user id") ?? p.get("uid") ?? p.get("user"),
    password: p.get("password") ?? p.get("pwd"),
    dbname: p.get("database") ?? p.get("initial catalog"),
    tls: mysql ? sslMode(p) : sqlServerTls(p),
  }
}
