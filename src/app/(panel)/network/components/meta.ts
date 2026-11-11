"use client"

import {
  Container,
  Globe,
  type LucideIcon,
  Network,
  ShieldCheck,
} from "lucide-react"
import {
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import type {
  NetInterface,
  NetworkMap,
  NetworkServer,
  Reach,
  ReachProbe,
  Subnet,
} from "@/lib/services"

export const views = ["networks", "reach", "matrix", "morcheh"] as const
export type View = (typeof views)[number]

export const viewItems: readonly { value: View; label: string }[] = [
  { value: "networks", label: "Networks" },
  { value: "reach", label: "Reachability" },
  { value: "matrix", label: "Matrix" },
  { value: "morcheh", label: "From Morche" },
]

export function useNetworkFilters() {
  return useQueryStates(
    {
      view: parseAsStringLiteral(views).withDefault("networks"),
      q: parseAsString.withDefault(""),
      containers: parseAsBoolean.withDefault(false),
      ipv6: parseAsBoolean.withDefault(false),
      problems: parseAsBoolean.withDefault(false),
    },
    { history: "replace" },
  )
}

export type Filters = ReturnType<typeof useNetworkFilters>[0]

// What the details layer shows.
export type Selection =
  | { kind: "server"; id: string }
  | { kind: "network"; id: string }
  | { kind: "link"; from: string; to: string }

export type Tone = "success" | "warning" | "destructive" | "muted"

export const reachMeta: Record<
  Reach["status"],
  { label: string; tone: Tone; hint: string }
> = {
  open: {
    label: "Reachable",
    tone: "success",
    hint: "A TCP connection to its SSH port succeeded.",
  },
  up: {
    label: "Host up, port closed",
    tone: "warning",
    hint: "The server answers, but its SSH port refused the connection or didn't answer.",
  },
  blocked: {
    label: "Blocked",
    tone: "destructive",
    hint: "No address answered: there's no route, or a firewall drops the traffic.",
  },
  unknown: {
    label: "Not tested",
    tone: "muted",
    hint: "The source server couldn't be read, so it couldn't run the test.",
  },
}

export const toneText: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-ash",
}

export const toneDot: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-mist",
}

export const tcpLabel: Record<ReachProbe["tcp"], string> = {
  open: "Port open",
  refused: "Connection refused (host is up)",
  timeout: "Timed out",
  unreachable: "No route to host",
  dns: "Name not found",
  failed: "Failed",
  unavailable: "Can't test: no bash or nc on the source",
}

export const pingLabel: Record<ReachProbe["ping"], string> = {
  ok: "Answered",
  lost: "No answer",
  unavailable: "No ping on the source",
}

export const viaLabel: Record<ReachProbe["via"], string> = {
  lan: "Shared network",
  vpn: "VPN",
  host: "Address Morche uses",
  address: "Its own address",
}

export const networkIcon: Record<Subnet["kind"], LucideIcon> = {
  lan: Network,
  vpn: ShieldCheck,
  public: Globe,
  internet: Globe,
  container: Container,
}

const kindLabel: Record<Subnet["kind"], string> = {
  lan: "Private network",
  vpn: "VPN",
  public: "Public network",
  internet: "Internet",
  container: "Containers",
}

export function networkName(n: Subnet) {
  return n.label || kindLabel[n.kind]
}

export const interfaceKind: Record<NetInterface["kind"], string> = {
  loopback: "Loopback",
  ethernet: "Ethernet",
  wireless: "Wi-Fi",
  bridge: "Bridge",
  container: "Container bridge",
  veth: "Container link",
  vlan: "VLAN",
  bond: "Bond",
  vpn: "VPN",
  overlay: "Overlay",
  virtual: "Virtual",
}

export function formatMs(ms: number) {
  return `${ms < 10 ? ms.toFixed(1) : Math.round(ms)} ms`
}

// The hub every server gets a line to when something has a route out but no
// public address of its own.
export const internetHub: Subnet = {
  id: "internet",
  cidr: "",
  family: "",
  kind: "internet",
  label: "",
  internet: false,
  gateways: [],
  members: [],
}

export function findNetwork(map: NetworkMap, id: string) {
  return (
    map.networks.find((n) => n.id === id) ??
    (id === internetHub.id ? internetHub : undefined)
  )
}

export function findServer(map: NetworkMap, id: string) {
  return map.servers.find((s) => s.server.id === id)
}

export function findLink(map: NetworkMap, from: string, to: string) {
  return map.links.find((l) => l.from === from && l.to === to)
}

// Everything search matches a server by.
export function serverText(s: NetworkServer) {
  const ips = (s.host?.interfaces ?? []).flatMap((i) =>
    i.addresses.map((a) => a.ip),
  )
  return [
    s.server.name,
    s.server.host,
    s.host?.hostname,
    ...ips,
    ...s.server.tags,
  ]
    .join(" ")
    .toLowerCase()
}

export function matches(text: string, q: string) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
  return terms.every((t) => text.includes(t))
}
