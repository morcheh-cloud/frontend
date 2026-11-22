import type { CDNRecord, CDNRecordFields } from "@/lib/services"

export type CdnType = CDNRecordFields["type"]

// Record types that can go through the CDN.
export const cloudTypes: CdnType[] = ["A", "AAAA", "CNAME", "ANAME"]
export const canCloud = (t: string) => cloudTypes.includes(t as CdnType)

export const cdnTypes: { type: CdnType; summary: string }[] = [
  { type: "A", summary: "IPv4 address" },
  { type: "AAAA", summary: "IPv6 address" },
  { type: "CNAME", summary: "Alias of another name" },
  { type: "ANAME", summary: "Alias, allowed at the apex (@)" },
  { type: "MX", summary: "Mail server" },
  { type: "TXT", summary: "Text (verification, SPF…)" },
  { type: "SPF", summary: "Mail senders (as TXT)" },
  { type: "DKIM", summary: "Mail signing key (as TXT)" },
  { type: "NS", summary: "Name server (delegates a sub-name)" },
  { type: "SRV", summary: "Service location" },
  { type: "CAA", summary: "Who may issue certificates" },
  { type: "PTR", summary: "Reverse lookup" },
  { type: "TLSA", summary: "DANE certificate pin" },
]

// The TTLs ArvanCloud takes.
export const cdnTtls = [
  120, 180, 300, 600, 900, 1800, 3600, 7200, 18000, 43200, 86400, 172800,
  432000,
] as const

export function ttlLabel(s: number) {
  if (s >= 86400 && s % 86400 === 0) {
    const d = s / 86400
    return `${d} day${d === 1 ? "" : "s"}`
  }
  if (s >= 3600 && s % 3600 === 0) return `${s / 3600} h`
  if (s >= 60 && s % 60 === 0) return `${s / 60} min`
  return `${s} s`
}

// A record's value on one line.
export function cdnValue(r: CDNRecord | CDNRecordFields) {
  switch (r.type) {
    case "A":
    case "AAAA":
      return (r.addresses ?? [])
        .map((a) => a.ip + (a.country ? ` (${a.country})` : ""))
        .join(", ")
    case "MX":
      return `${r.priority ?? ""} ${r.host ?? ""}`.trim()
    case "SRV":
      return `${r.priority ?? 0} ${r.weight ?? 0} ${r.port ?? 0} ${r.host ?? ""}`
    case "TXT":
    case "SPF":
    case "DKIM":
      return r.text ?? ""
    case "CAA":
      return `${r.tag ?? ""} "${r.value ?? ""}"`
    case "TLSA":
      return `${r.tlsa_usage ?? ""} ${r.tlsa_selector ?? ""} ${r.tlsa_matching_type ?? ""} ${r.certificate ?? ""}`
    default:
      return r.host || r.value || ""
  }
}

// "@" → the domain, "www" → www.domain.
export const fullName = (name: string, zone: string) =>
  name === "@" || name === "" ? zone : `${name}.${zone}`

// What someone typed as a name, relative to the domain.
export function relName(typed: string, zone: string) {
  const v = typed.trim().replace(/\.$/, "")
  if (v === "" || v === "@") return "@"
  const low = v.toLowerCase()
  const z = zone.toLowerCase()
  if (low === z) return "@"
  if (low.endsWith(`.${z}`)) return v.slice(0, -(zone.length + 1))
  return v
}

export const upstreamLabels = {
  default: "As the visitor came",
  auto: "Auto (https when it answers)",
  http: "Always http",
  https: "Always https",
} as const

export const cacheTimes = [
  "0s",
  "10s",
  "30s",
  "1m",
  "5m",
  "10m",
  "30m",
  "1h",
  "3h",
  "12h",
  "24h",
  "3d",
  "7d",
  "30d",
] as const

export function durationLabel(v: string) {
  if (v === "default") return "As the origin says"
  if (v === "0s") return "Don't keep"
  const m = /^(\d+)([smhd])$/.exec(v)
  if (!m) return v
  const n = Number(m[1])
  const unit = { s: "second", m: "minute", h: "hour", d: "day" }[
    m[2] as "s" | "m" | "h" | "d"
  ]
  return `${n} ${unit}${n === 1 ? "" : "s"}`
}

// Bytes and counts for the traffic tiles.
export function compact(n: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n)
}

export const cdnTabs = [
  "records",
  "traffic",
  "https",
  "cache",
  "firewall",
  "waf",
  "rate-limit",
  "speed",
] as const
export type CdnTab = (typeof cdnTabs)[number]

export const cdnTabLabels: Record<CdnTab, string> = {
  records: "DNS records",
  traffic: "Traffic",
  https: "HTTPS",
  cache: "Caching",
  firewall: "Firewall",
  waf: "WAF",
  "rate-limit": "Rate limit",
  speed: "Redirect & speed",
}
