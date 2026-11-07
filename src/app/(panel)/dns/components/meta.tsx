import { Loader2 } from "lucide-react"

import type {
  DNSRecordBody,
  DNSServer,
  DNSZone,
  DNSZoneOptions,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { zoneParam } from "../api"

export type DnsStatus = DNSServer["status"]

export const dnsStatusMeta: Record<DnsStatus, { label: string; dot: string }> =
  {
    online: { label: "Online", dot: "bg-success" },
    unreachable: { label: "Unreachable", dot: "bg-destructive" },
    auth_failed: { label: "Token refused", dot: "bg-warning" },
    tls_error: { label: "TLS error", dot: "bg-destructive" },
    blocked: { label: "Address not allowed", dot: "bg-warning" },
    error: { label: "Error", dot: "bg-destructive" },
    unknown: { label: "Not checked", dot: "bg-mist" },
  }

export function DnsStatusDot({
  status,
  checking = false,
  className,
}: {
  status: DnsStatus
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
        dnsStatusMeta[status].dot,
        className,
      )}
    />
  )
}

export const serverHref = (id: string) => `/dns/${id}`
export const zoneHref = (id: string, zone: string) =>
  `/dns/${id}/zones/${zoneParam(zone)}`

// The address without the scheme noise, for lists.
// The console address as a link, only when it is http(s) (the backend
// refuses anything else; this keeps a bad value from becoming a script link).
export function consoleHref(url: string) {
  try {
    const u = new URL(url)
    return u.protocol === "http:" || u.protocol === "https:"
      ? u.href
      : undefined
  } catch {
    return undefined
  }
}

export function hostOf(url: string) {
  try {
    const u = new URL(url)
    return u.port ? `${u.hostname}:${u.port}` : u.hostname
  } catch {
    return url
  }
}

// Favorites first, then by name.
export const sortServers = (items: DNSServer[]) =>
  [...items].sort(
    (a, b) =>
      Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name),
  )

const zoneTypes: Record<string, string> = {
  Primary: "Primary",
  Secondary: "Secondary",
  Stub: "Stub",
  Forwarder: "Forwarder",
  SecondaryForwarder: "Secondary forwarder",
  Catalog: "Catalog",
  SecondaryCatalog: "Secondary catalog",
}

export const zoneTypeLabel = (type: string) => zoneTypes[type] ?? type

// Zones whose records come from somewhere else: read-only here.
export const copiedZone = (type: string) =>
  type.startsWith("Secondary") || type === "Stub"

// What's wrong with a zone, worst first; null when it's fine.
export function zoneProblem(z: DNSZone): string | null {
  if (z.expired) return "Expired"
  if (z.sync_failed) return "Sync failed"
  if (z.notify_failed) return "Notify failed"
  return null
}

export const zoneDisplayName = (name: string) =>
  name === "." ? ". (root)" : name

// A record's name inside its zone: "@" for the apex, "www" for www.zone.
export function relativeName(name: string, zone: string) {
  if (zone === ".") return name || "@"
  const lower = name.toLowerCase()
  const z = zone.toLowerCase()
  if (lower === z) return "@"
  if (lower.endsWith(`.${z}`)) return name.slice(0, -(zone.length + 1))
  return name
}

// The full name for what someone typed: "" or "@" is the apex, "www" becomes
// www.zone, and a name already ending in the zone (or in a dot) stays.
export function absoluteName(typed: string, zone: string) {
  const v = typed.trim()
  if (v === "" || v === "@") return zone === "." ? "" : zone
  if (v.endsWith(".")) return v.slice(0, -1)
  if (zone === ".") return v
  const lower = v.toLowerCase()
  const z = zone.toLowerCase()
  if (lower === z || lower.endsWith(`.${z}`)) return v
  return `${v}.${zone}`
}

export type RecordType = DNSRecordBody["type"]

type TypeMeta = {
  type: RecordType
  summary: string
  value: string
  placeholder: string
  hint?: string
}

export const recordTypes: TypeMeta[] = [
  {
    type: "A",
    summary: "IPv4 address",
    value: "IPv4 address",
    placeholder: "203.0.113.10",
  },
  {
    type: "AAAA",
    summary: "IPv6 address",
    value: "IPv6 address",
    placeholder: "2001:db8::10",
  },
  {
    type: "CNAME",
    summary: "Alias of another name",
    value: "Points to",
    placeholder: "app.example.net",
    hint: "A name with a CNAME can't have any other record, and the zone's own name (@) can't be one: use ANAME there.",
  },
  {
    type: "ANAME",
    summary: "Alias, allowed at the apex",
    value: "Points to",
    placeholder: "lb.example.net",
    hint: "Technitium looks the target up and answers with its addresses, so it works at @ where CNAME can't.",
  },
  {
    type: "MX",
    summary: "Mail server",
    value: "Mail server",
    placeholder: "mail.example.com",
  },
  {
    type: "TXT",
    summary: "Text (SPF, DKIM, verification)",
    value: "Text",
    placeholder: "v=spf1 include:_spf.example.com ~all",
    hint: "Paste it as given, without quotes. Long values are split for you.",
  },
  {
    type: "NS",
    summary: "Name server",
    value: "Name server",
    placeholder: "ns1.example.com",
    hint: "At @ these say which servers answer for the zone, and which may copy it as Secondary.",
  },
  {
    type: "SRV",
    summary: "Service location",
    value: "Target host",
    placeholder: "sip.example.com",
    hint: "The name is usually _service._proto, like _sip._tcp.",
  },
  {
    type: "CAA",
    summary: "Who may issue certificates",
    value: "Value",
    placeholder: "letsencrypt.org",
  },
  {
    type: "PTR",
    summary: "Reverse lookup",
    value: "Points to",
    placeholder: "host.example.com",
  },
]

export const typeMeta = (type: string) =>
  recordTypes.find((t) => t.type === type)

export const caaTags = ["issue", "issuewild", "iodef"] as const

const units: [number, string][] = [
  [86400, "day"],
  [3600, "h"],
  [60, "min"],
]

export function formatTtl(seconds: number) {
  for (const [size, unit] of units) {
    if (seconds >= size && seconds % size === 0) {
      const n = seconds / size
      return unit === "day" ? `${n} day${n === 1 ? "" : "s"}` : `${n} ${unit}`
    }
  }
  return `${seconds} s`
}

export const ttlChoices = [
  { value: 300, label: "5 min" },
  { value: 900, label: "15 min" },
  { value: 3600, label: "1 h" },
  { value: 14400, label: "4 h" },
  { value: 86400, label: "1 day" },
]

// A record's value as one line, with the numbers MX/SRV/CAA carry.
export function recordValue(r: {
  type: string
  value: string
  priority?: number
  weight?: number
  port?: number
  flags?: number
  tag?: string
}) {
  switch (r.type) {
    case "MX":
      return `${r.priority ?? ""} ${r.value}`.trim()
    case "SRV":
      return `${r.priority ?? 0} ${r.weight ?? 0} ${r.port ?? 0} ${r.value}`
    case "CAA":
      return `${r.flags ?? 0} ${r.tag ?? ""} "${r.value}"`
    default:
      return r.value
  }
}

type Transfer = DNSZoneOptions["zone_transfer"]
type Notify = DNSZoneOptions["notify"]

export const transferOptions: {
  value: Transfer
  label: string
  hint: string
  list: boolean
}[] = [
  {
    value: "AllowOnlyZoneNameServers",
    label: "Only the zone's name servers",
    hint: "Servers listed in the zone's NS records at @. Technitium's default.",
    list: false,
  },
  {
    value: "AllowZoneNameServersAndUseSpecifiedNetworkACL",
    label: "Name servers and these addresses",
    hint: "The NS servers, plus the addresses below.",
    list: true,
  },
  {
    value: "UseSpecifiedNetworkACL",
    label: "Only these addresses",
    hint: "Just the addresses below.",
    list: true,
  },
  {
    value: "Allow",
    label: "Anyone",
    hint: "Any address may copy the whole zone. Avoid on a public server.",
    list: false,
  },
  {
    value: "Deny",
    label: "No one",
    hint: "No Secondary can copy this zone.",
    list: false,
  },
]

export const notifyOptions: {
  value: Notify
  label: string
  hint: string
  list: boolean
}[] = [
  {
    value: "ZoneNameServers",
    label: "The zone's name servers",
    hint: "Tells the servers in the NS records right after a change.",
    list: false,
  },
  {
    value: "BothZoneAndSpecifiedNameServers",
    label: "Name servers and these addresses",
    hint: "The NS servers, plus the addresses below.",
    list: true,
  },
  {
    value: "SpecifiedNameServers",
    label: "Only these addresses",
    hint: "Just the addresses below.",
    list: true,
  },
  {
    value: "None",
    label: "No one",
    hint: "Secondaries only notice changes when the SOA refresh comes round.",
    list: false,
  },
]

export const transferLabel = (v: string) =>
  transferOptions.find((o) => o.value === v)?.label ?? v
export const notifyLabel = (v: string) =>
  notifyOptions.find((o) => o.value === v)?.label ?? v
