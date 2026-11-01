"use client"

import { Globe, House, type LucideIcon, Network } from "lucide-react"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"

import type { OpenPort, PortsReport } from "@/lib/services"

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

// Search and filters live in the URL, like the servers list.
export function usePortFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      q: parseAsString.withDefault(""),
      exposure: parseAsStringLiteral(exposures),
      proto: parseAsStringLiteral(protocols),
    },
    { history: "replace" },
  )
  return { filters, setFilters }
}

type Filters = ReturnType<typeof usePortFilters>["filters"]

export function filterPorts(ports: OpenPort[], f: Filters) {
  const q = f.q.trim().toLowerCase()
  return ports.filter((p) => {
    if (f.exposure && p.exposure !== f.exposure) return false
    if (f.proto && p.protocol !== f.proto) return false
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

export function summarize(report: PortsReport) {
  const ports = report.ports
  return {
    total: ports.length,
    public: ports.filter((p) => p.exposure === "public").length,
    containers: new Set(ports.flatMap((p) => p.container?.id ?? [])).size,
    risky: ports.filter((p) => risks(p).length > 0 && p.sensitive).length,
  }
}
