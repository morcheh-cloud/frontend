import { parseRange, rangeContains } from "@/components/sessions/ip"
import type {
  ContainerAccess,
  ContainerLimit,
  ContainerLimitBody,
  PublishedPort,
} from "@/lib/services"
import { portName } from "../meta"

export type Protocol = ContainerLimit["protocol"]

export const limitBody = (l: ContainerLimit): ContainerLimitBody => ({
  protocol: l.protocol,
  port: l.port,
  allow: l.allow,
  comment: l.comment || undefined,
})

export function parsePorts(s: string): [number, number] | null {
  const m = /^\s*(\d{1,5})\s*(?:[-:]\s*(\d{1,5}))?\s*$/.exec(s)
  if (!m) return null
  const lo = Number(m[1])
  const hi = Number(m[2] ?? m[1])
  if (lo < 1 || hi > 65535 || lo > hi) return null
  return [lo, hi]
}

export function covers(l: ContainerLimit, protocol: string, port: number) {
  const r = parsePorts(l.port)
  return !!r && l.protocol === protocol && r[0] <= port && port <= r[1]
}

export function overlaps(
  a: Pick<ContainerLimit, "port" | "protocol">,
  b: Pick<ContainerLimit, "port" | "protocol">,
) {
  const x = parsePorts(a.port)
  const y = parsePorts(b.port)
  return !!x && !!y && a.protocol === b.protocol && x[0] <= y[1] && y[0] <= x[1]
}

// Whether an address gets through a limit, as the server would decide.
export function lets(l: Pick<ContainerLimit, "allow">, ip: string) {
  const plain = ip.replace(/^::ffff:(?=\d+\.)/i, "")
  return l.allow.some((spec) => {
    const r = parseRange(spec)
    return !!r && rangeContains(r, plain)
  })
}

export const limitPort = (l: Pick<ContainerLimit, "port" | "protocol">) =>
  `${l.port}/${l.protocol}`

export function limitText(l: Pick<ContainerLimit, "allow">) {
  if (l.allow.length === 0) return "Nobody from outside"
  if (l.allow.length === 1) return `Only ${l.allow[0]}`
  return `Only ${l.allow.length} addresses`
}

export type PortRow = {
  key: string
  protocol: Protocol
  port: number
  name?: string
  containers: { name: string; target: number }[]
  addresses: string[]
  // Bound to an address other machines can reach.
  public: boolean
  limit?: ContainerLimit
}

// One row per port: a port Compose publishes for two replicas is one door.
export function portRows(a: ContainerAccess): PortRow[] {
  const rows = new Map<string, PortRow>()
  for (const p of a.published) {
    const key = `${p.protocol}/${p.port}`
    let row = rows.get(key)
    if (!row) {
      row = {
        key,
        protocol: p.protocol,
        port: p.port,
        name: portName(p.port),
        containers: [],
        addresses: [],
        public: false,
        limit:
          a.limits.find((l) => l.id === p.limit) ??
          a.limits.find((l) => covers(l, p.protocol, p.port)),
      }
      rows.set(key, row)
    }
    if (!row.containers.some((c) => c.name === p.container)) {
      row.containers.push({ name: p.container, target: p.target_port })
    }
    for (const addr of p.addresses) {
      if (!row.addresses.includes(addr)) row.addresses.push(addr)
    }
    row.public ||= p.public
  }
  return [...rows.values()]
}

// Limits no running container answers on: kept, and in force once one does.
export const idleLimits = (a: ContainerAccess) =>
  a.limits.filter(
    (l) => !a.published.some((p) => covers(l, p.protocol, p.port)),
  )

export type Reach = "anyone" | "limited" | "nobody" | "local"

export function reachOf(row: Pick<PortRow, "public" | "limit">): Reach {
  if (!row.public) return "local"
  if (!row.limit) return "anyone"
  return row.limit.allow.length === 0 ? "nobody" : "limited"
}

export const reachMeta: Record<
  Reach,
  { label: string; tone: "warning" | "success" | "muted"; hint: string }
> = {
  anyone: {
    label: "Anyone",
    tone: "warning",
    hint: "Every machine that can reach this server can connect. ufw and firewalld don't apply.",
  },
  limited: {
    label: "Limited",
    tone: "success",
    hint: "Only the addresses listed get through.",
  },
  nobody: {
    label: "Nobody from outside",
    tone: "success",
    hint: "Only this server and its containers can connect.",
  },
  local: {
    label: "This server only",
    tone: "muted",
    hint: "Published on a loopback address, so other machines can't reach it.",
  },
}

export const containerList = (row: Pick<PortRow, "containers">) =>
  row.containers.map((c) => c.name).join(", ")

// Ports a public website needs to keep open to everyone.
export const isWebPort = (port: string) => {
  const r = parsePorts(port)
  return !!r && [80, 443].some((p) => r[0] <= p && p <= r[1])
}

export const PRIVATE_NETWORKS = [
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
]

export function publishersOf(
  a: ContainerAccess,
  protocol: Protocol,
  port: string,
): PublishedPort[] {
  const r = parsePorts(port)
  if (!r) return []
  return a.published.filter(
    (p) => p.protocol === protocol && r[0] <= p.port && p.port <= r[1],
  )
}
