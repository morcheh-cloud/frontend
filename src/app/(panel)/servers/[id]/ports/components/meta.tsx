"use client"

import { Globe, House, type LucideIcon, Network } from "lucide-react"
import {
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import type { OpenPort } from "@/lib/services"

type Exposure = OpenPort["exposure"]

export const exposureMeta: Record<
  Exposure,
  { label: string; hint: string; icon: LucideIcon }
> = {
  public: {
    label: "Public",
    hint: "Reachable from other machines, unless a firewall blocks it",
    icon: Globe,
  },
  private: {
    label: "Private network",
    hint: "Bound to a LAN or VPN address only",
    icon: Network,
  },
  local: {
    label: "Local only",
    hint: "Bound to loopback; only this server can connect",
    icon: House,
  },
}

export function portKey(p: OpenPort) {
  return [p.protocol, p.port, p.container?.id ?? p.process?.name ?? ""].join(
    "/",
  )
}

// host:port as a client would type it ([::1]:80 for IPv6).
export function endpoint(address: string, port: number) {
  return address.includes(":") ? `[${address}]:${port}` : `${address}:${port}`
}

// Who holds the port, in one line.
export function ownerText(p: OpenPort) {
  if (p.container) return p.container.name
  if (p.process) return `${p.process.name} · PID ${p.process.pid}`
  return null
}

export type Risk = { title: string; body: string }

// What deserves a second look about a port, most serious first.
export function risks(p: OpenPort): Risk[] {
  const out: Risk[] = []
  if (p.exposure !== "public") return out
  const name = p.service || `Port ${p.port}`
  if (p.sensitive) {
    out.push({
      title: `${name} is reachable from other machines`,
      body: p.container
        ? "Publish it on 127.0.0.1 only (e.g. 127.0.0.1:5432:5432 in Compose) unless other machines really need it, or allow only known addresses."
        : "Bind it to 127.0.0.1 unless other machines really need it, or allow only known addresses in the firewall.",
    })
  }
  if (p.container && p.container.network !== "host") {
    out.push({
      title: "Docker bypasses ufw for this port",
      body: "Docker publishes ports with its own iptables rules, ahead of ufw and firewalld, so blocking the port there won't close it.",
    })
  }
  return out
}

const exposures = ["public", "private", "local"] as const
const protocols = ["tcp", "udp"] as const
const shows = ["containers", "exposed"] as const

// A database or admin service other machines can reach.
const exposed = (p: OpenPort) => p.exposure === "public" && p.sensitive

// Search and filters live in the URL, like the servers list.
const parsers = {
  q: parseAsString.withDefault(""),
  exposure: parseAsStringLiteral(exposures),
  proto: parseAsStringLiteral(protocols),
  show: parseAsStringLiteral(shows),
}

export function usePortFilters() {
  const [filters, setFilters] = useQueryStates(parsers, { history: "replace" })
  return { filters, setFilters }
}

const serialize = createSerializer(parsers)

// A link into a server's open ports, e.g. from a process.
export function portsHref(serverId: string, state: { q?: string } = {}) {
  return serialize(`/servers/${serverId}/ports`, state)
}

type Filters = ReturnType<typeof usePortFilters>["filters"]

export function filterPorts(ports: OpenPort[], f: Filters) {
  const q = f.q.trim().toLowerCase()
  return ports.filter((p) => {
    if (f.exposure && p.exposure !== f.exposure) return false
    if (f.proto && p.protocol !== f.proto) return false
    if (f.show === "containers" && !p.container) return false
    if (f.show === "exposed" && !exposed(p)) return false
    if (!q) return true
    return [
      String(p.port),
      p.service,
      p.process?.name,
      p.process?.command,
      p.process?.user,
      p.unit?.name,
      p.container?.name,
      p.container?.image,
      p.container?.compose_project,
      ...p.addresses,
    ].some((s) => s?.toLowerCase().includes(q))
  })
}

// How many ports each filter chip would show.
export function countPorts(ports: OpenPort[]) {
  const count = (fn: (p: OpenPort) => boolean) => ports.filter(fn).length
  return {
    total: ports.length,
    public: count((p) => p.exposure === "public"),
    private: count((p) => p.exposure === "private"),
    local: count((p) => p.exposure === "local"),
    tcp: count((p) => p.protocol === "tcp"),
    udp: count((p) => p.protocol === "udp"),
    containers: count((p) => !!p.container),
    exposed: count(exposed),
  }
}
