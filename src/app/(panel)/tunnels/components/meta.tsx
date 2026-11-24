import {
  Building2,
  Cable,
  Footprints,
  Globe,
  KeyRound,
  LockKeyhole,
  type LucideIcon,
  Network,
  ShieldCheck,
} from "lucide-react"

import type { Tunnel, TunnelConfig } from "@/lib/services"
import { cn } from "@/lib/utils"

export type Kind = Tunnel["kind"]
export type Protocol = NonNullable<TunnelConfig["protocol"]>

// What the panel offers as tiles: openconnect's protocols each get one.
export type Choice = {
  value: string
  kind: Kind
  protocol?: Exclude<Protocol, "">
  label: string
  short: string
  icon: LucideIcon
  group: "vpn" | "hop"
  // The program it needs on Morche's machine (shown when missing).
  tool?: string
}

export const choices: Choice[] = [
  {
    value: "wireguard",
    kind: "wireguard",
    label: "WireGuard",
    short: "Fast, simple; runs inside Morche",
    icon: ShieldCheck,
    group: "vpn",
  },
  {
    value: "openvpn",
    kind: "openvpn",
    label: "OpenVPN",
    short: "From an .ovpn file",
    icon: KeyRound,
    group: "vpn",
    tool: "openvpn",
  },
  {
    value: "oc:anyconnect",
    kind: "openconnect",
    protocol: "anyconnect",
    label: "Cisco AnyConnect",
    short: "Also ocserv and Cisco Secure Client",
    icon: Building2,
    group: "vpn",
    tool: "openconnect",
  },
  {
    value: "oc:fortinet",
    kind: "openconnect",
    protocol: "fortinet",
    label: "Fortinet",
    short: "FortiGate SSL VPN",
    icon: Building2,
    group: "vpn",
    tool: "openconnect",
  },
  {
    value: "oc:gp",
    kind: "openconnect",
    protocol: "gp",
    label: "GlobalProtect",
    short: "Palo Alto Networks",
    icon: Building2,
    group: "vpn",
    tool: "openconnect",
  },
  {
    value: "oc:pulse",
    kind: "openconnect",
    protocol: "pulse",
    label: "Pulse / Ivanti",
    short: "Ivanti Connect Secure",
    icon: Building2,
    group: "vpn",
    tool: "openconnect",
  },
  {
    value: "oc:f5",
    kind: "openconnect",
    protocol: "f5",
    label: "F5 BIG-IP",
    short: "F5 SSL VPN",
    icon: Building2,
    group: "vpn",
    tool: "openconnect",
  },
  {
    value: "oc:nc",
    kind: "openconnect",
    protocol: "nc",
    label: "Juniper",
    short: "Network Connect (older)",
    icon: Building2,
    group: "vpn",
    tool: "openconnect",
  },
  {
    value: "oc:array",
    kind: "openconnect",
    protocol: "array",
    label: "Array Networks",
    short: "Array SSL VPN",
    icon: Building2,
    group: "vpn",
    tool: "openconnect",
  },
  {
    value: "sstp",
    kind: "sstp",
    label: "SSTP",
    short: "Microsoft's VPN over HTTPS",
    icon: LockKeyhole,
    group: "vpn",
    tool: "sstpc",
  },
  {
    value: "jump",
    kind: "jump",
    label: "Jump host",
    short: "Hop through one of your servers",
    icon: Footprints,
    group: "hop",
  },
  {
    value: "socks5",
    kind: "socks5",
    label: "SOCKS5 proxy",
    short: "Like ssh -D or Dante",
    icon: Network,
    group: "hop",
  },
  {
    value: "http",
    kind: "http",
    label: "HTTP proxy",
    short: "CONNECT, like Squid",
    icon: Globe,
    group: "hop",
  },
]

export const groups = [
  { value: "vpn", label: "VPN" },
  { value: "hop", label: "Proxy or jump host" },
] as const

export const choiceOf = (
  t: Pick<Tunnel, "kind"> & { config: Pick<TunnelConfig, "protocol"> },
) =>
  choices.find(
    (c) =>
      c.kind === t.kind &&
      (c.kind !== "openconnect" || c.protocol === t.config.protocol),
  ) ?? choices[0]

export const isVpn = (k: Kind) =>
  k === "wireguard" || k === "openvpn" || k === "openconnect" || k === "sstp"

export function TunnelIcon({
  tunnel,
  className,
}: {
  tunnel?: Pick<Tunnel, "kind"> & { config: Pick<TunnelConfig, "protocol"> }
  className?: string
}) {
  const Icon = tunnel ? choiceOf(tunnel).icon : Cable
  return <Icon className={cn("size-4.5", className)} />
}

export type Tone = "success" | "warning" | "destructive" | "muted" | "brand"

export const statusMeta: Record<
  Tunnel["status"],
  { label: string; tone: Tone }
> = {
  idle: { label: "Idle", tone: "muted" },
  connecting: { label: "Connecting", tone: "brand" },
  connected: { label: "Connected", tone: "success" },
  failed: { label: "Failed", tone: "destructive" },
}

export const toneDot: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-mist",
  brand: "bg-brand animate-pulse",
}

export const toneText: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
  brand: "text-brand",
}

// Where it goes, in a few words.
export function targetOf(t: Tunnel, serverName?: string): string {
  const c = t.config
  const hp = (host?: string, port?: number, def?: number) =>
    host ? (port && port !== def ? `${host}:${port}` : host) : ""
  switch (t.kind) {
    case "jump":
      return serverName ? `via ${serverName}` : "via a server"
    case "socks5":
      return hp(c.host, c.port, 1080)
    case "http":
      return hp(c.host, c.port, 3128)
    case "wireguard":
      return c.endpoint ?? ""
    case "openvpn":
      return t.remotes.length > 1
        ? `${t.remotes[0]} +${t.remotes.length - 1}`
        : (t.remotes[0] ?? ".ovpn file")
    case "openconnect":
    case "sstp":
      return hp(c.host, c.port, 443)
  }
  return ""
}

// The pin out of a "certificate isn't trusted" message.
export const pinIn = (message: string) =>
  message.match(/pin-sha256:[A-Za-z0-9+/]{43}=/)?.[0]

export const tunnelHref = (id: string) => `/tunnels/${id}`
export const editTunnelHref = (id: string) => `/tunnels/${id}/edit`
export const newTunnelHref = (choice?: string) =>
  choice ? `/tunnels/new?kind=${encodeURIComponent(choice)}` : "/tunnels/new"
