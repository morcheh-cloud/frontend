"use client"

import {
  AppWindow,
  AtSign,
  Box,
  Boxes,
  Cloud,
  CloudCog,
  Cpu,
  CreditCard,
  Database,
  Earth,
  FileBadge,
  FileText,
  Globe,
  HardDrive,
  Keyboard,
  KeyRound,
  Laptop,
  Layers,
  LayoutGrid,
  type LucideIcon,
  Monitor,
  MonitorCog,
  Package,
  Plug,
  Printer,
  Router,
  Server,
  ServerCog,
  Smartphone,
  Split,
  Tablet,
} from "lucide-react"
import {
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import { projectHref } from "@/app/(panel)/containers/components/project-actions"
import { appsHref } from "@/app/(panel)/services/components/meta"
import { useRouteTab } from "@/hooks/useRouteTab"
import type { Asset, AssetBody, AssetOwnerRule } from "@/lib/services"
import { cn } from "@/lib/utils"

// ---- Kinds ----

export const linkedKinds = [
  "server",
  "vm_cluster",
  "cloud_account",
  "database",
  "storage",
  "compose_project",
  "application",
  "web_service",
  "dns_server",
  "proxy",
  "website",
] as const

export const manualKinds = [
  "hardware",
  "virtual_machine",
  "cloud_resource",
  "software",
  "service",
  "license",
  "subscription",
  "contract",
  "domain",
  "certificate",
  "other",
] as const

export type ManualKind = (typeof manualKinds)[number]

type KindMeta = {
  label: string
  plural: string
  icon: LucideIcon
  short: string
}

export const kindMeta: Record<string, KindMeta> = {
  server: {
    label: "Server",
    plural: "Servers",
    icon: Server,
    short: "A server Morche manages over SSH.",
  },
  vm_cluster: {
    label: "Proxmox cluster",
    plural: "Proxmox clusters",
    icon: MonitorCog,
    short: "A Proxmox VE cluster linked to Morche.",
  },
  cloud_account: {
    label: "Cloud account",
    plural: "Cloud accounts",
    icon: Cloud,
    short: "An account with a cloud provider.",
  },
  database: {
    label: "Database",
    plural: "Databases",
    icon: Database,
    short: "A database Morche watches.",
  },
  storage: {
    label: "Storage",
    plural: "Storages",
    icon: HardDrive,
    short: "S3, FTP, SFTP or WebDAV storage.",
  },
  compose_project: {
    label: "Compose project",
    plural: "Compose projects",
    icon: Layers,
    short: "Containers started from one compose file.",
  },
  application: {
    label: "Installed application",
    plural: "Installed applications",
    icon: LayoutGrid,
    short: "Software installed from the Applications catalog.",
  },
  web_service: {
    label: "Web service",
    plural: "Web services",
    icon: Boxes,
    short: "A tool the team signs in to (Services page).",
  },
  dns_server: {
    label: "DNS server",
    plural: "DNS servers",
    icon: Globe,
    short: "A Technitium DNS server.",
  },
  proxy: {
    label: "Reverse proxy",
    plural: "Reverse proxies",
    icon: Split,
    short: "nginx managed by Morche.",
  },
  website: {
    label: "Website",
    plural: "Websites",
    icon: Earth,
    short: "A site served by a Morche proxy.",
  },
  hardware: {
    label: "Hardware",
    plural: "Hardware",
    icon: Cpu,
    short: "Laptops, desktops, rack servers, network gear, phones…",
  },
  virtual_machine: {
    label: "Virtual machine",
    plural: "Virtual machines",
    icon: Box,
    short: "A VM Morche doesn't manage.",
  },
  cloud_resource: {
    label: "Cloud resource",
    plural: "Cloud resources",
    icon: CloudCog,
    short: "A cloud server, bucket or service outside Morche.",
  },
  software: {
    label: "Software",
    plural: "Software",
    icon: AppWindow,
    short: "Desktop or server software the team uses.",
  },
  service: {
    label: "Service",
    plural: "Services",
    icon: Plug,
    short: "A running service Morche doesn't manage (a database, a queue…).",
  },
  license: {
    label: "Licence",
    plural: "Licences",
    icon: KeyRound,
    short: "A software licence: seats, key, renewal.",
  },
  subscription: {
    label: "Subscription",
    plural: "Subscriptions",
    icon: CreditCard,
    short: "A SaaS plan or other recurring payment.",
  },
  contract: {
    label: "Contract",
    plural: "Contracts",
    icon: FileText,
    short: "Support, hosting or maintenance agreement.",
  },
  domain: {
    label: "Domain",
    plural: "Domains",
    icon: AtSign,
    short: "A domain name you registered.",
  },
  certificate: {
    label: "Certificate",
    plural: "Certificates",
    icon: FileBadge,
    short: "A TLS or code-signing certificate.",
  },
  other: {
    label: "Other",
    plural: "Other",
    icon: Package,
    short: "Anything else worth tracking.",
  },
}

export function kindOf(kind: string): KindMeta {
  return kindMeta[kind] ?? kindMeta.other
}

// Groups for the overview strip and the kind filter.
export const kindGroups: {
  key: string
  label: string
  kinds: string[]
  icon: LucideIcon
}[] = [
  {
    key: "infra",
    label: "Infrastructure",
    icon: ServerCog,
    kinds: [
      "server",
      "vm_cluster",
      "cloud_account",
      "virtual_machine",
      "cloud_resource",
      "storage",
    ],
  },
  {
    key: "apps",
    label: "Data & apps",
    icon: Database,
    kinds: [
      "database",
      "compose_project",
      "application",
      "web_service",
      "service",
      "software",
    ],
  },
  {
    key: "network",
    label: "Network & web",
    icon: Globe,
    kinds: ["dns_server", "proxy", "website", "domain", "certificate"],
  },
  { key: "hardware", label: "Hardware", icon: Laptop, kinds: ["hardware"] },
  {
    key: "contracts",
    label: "Licences & contracts",
    icon: KeyRound,
    kinds: ["license", "subscription", "contract"],
  },
  { key: "other", label: "Other", icon: Package, kinds: ["other"] },
]

export const hardwareCategories: { value: string; icon: LucideIcon }[] = [
  { value: "Laptop", icon: Laptop },
  { value: "Desktop", icon: Monitor },
  { value: "Rack server", icon: ServerCog },
  { value: "Network device", icon: Router },
  { value: "Storage device", icon: HardDrive },
  { value: "Phone", icon: Smartphone },
  { value: "Tablet", icon: Tablet },
  { value: "Printer", icon: Printer },
  { value: "Monitor", icon: Monitor },
  { value: "Peripheral", icon: Keyboard },
]

export function assetIcon(a: Pick<Asset, "kind" | "category">): LucideIcon {
  if (a.kind === "hardware") {
    const c = hardwareCategories.find((x) => x.value === a.category)
    if (c) return c.icon
  }
  return kindOf(a.kind).icon
}

export function AssetIcon({
  asset,
  className,
}: {
  asset: Pick<Asset, "kind" | "category">
  className?: string
}) {
  const Icon = assetIcon(asset)
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong [&>svg]:size-[18px]",
        className,
      )}
    >
      <Icon />
    </span>
  )
}

// ---- Labels ----

export const environments = [
  { value: "production", label: "Production", short: "Prod" },
  { value: "staging", label: "Staging", short: "Staging" },
  { value: "development", label: "Development", short: "Dev" },
  { value: "test", label: "Test", short: "Test" },
] as const

export const envLabel = (v: string) =>
  environments.find((e) => e.value === v)?.label ?? ""

export const lifecycles = [
  {
    value: "planned",
    label: "Planned",
    hint: "Bought or ordered, not in use yet",
  },
  { value: "active", label: "Active", hint: "In use" },
  {
    value: "maintenance",
    label: "In maintenance",
    hint: "Being repaired or reworked",
  },
  {
    value: "deprecated",
    label: "Being phased out",
    hint: "Still in use, on its way out",
  },
  {
    value: "retired",
    label: "Retired",
    hint: "No longer used; kept for the record",
  },
] as const

export const lifecycleLabel = (v: string) =>
  lifecycles.find((l) => l.value === v)?.label ?? v

export const criticalities = [
  {
    value: 1,
    label: "Tier 1 · Critical",
    short: "Critical",
    hint: "The business stops without it",
  },
  {
    value: 2,
    label: "Tier 2 · High",
    short: "High",
    hint: "Hurts badly within hours",
  },
  {
    value: 3,
    label: "Tier 3 · Medium",
    short: "Medium",
    hint: "Can wait a day",
  },
  { value: 4, label: "Tier 4 · Low", short: "Low", hint: "Nice to have" },
] as const

export const criticalityLabel = (v: number) =>
  criticalities.find((c) => c.value === v)?.short ?? ""

export const classifications = [
  { value: "public", label: "Public", hint: "Anyone may see it" },
  { value: "internal", label: "Internal", hint: "Staff only" },
  {
    value: "confidential",
    label: "Confidential",
    hint: "Only those who need it",
  },
  {
    value: "restricted",
    label: "Restricted",
    hint: "Highest protection: personal, financial, secret",
  },
] as const

export const classificationLabel = (v: string) =>
  classifications.find((c) => c.value === v)?.label ?? ""

export const billings = [
  { value: "once", label: "One-off" },
  { value: "monthly", label: "Per month" },
  { value: "yearly", label: "Per year" },
] as const

export const relationKinds = [
  { value: "runs_on", label: "Runs on", reverse: "Hosts" },
  { value: "uses", label: "Uses", reverse: "Used by" },
  { value: "depends_on", label: "Depends on", reverse: "Needed by" },
  { value: "stored_in", label: "Stored in", reverse: "Stores" },
  { value: "backs_up_to", label: "Backs up to", reverse: "Holds backups of" },
  { value: "points_to", label: "Points to", reverse: "Pointed to by" },
  { value: "connects_to", label: "Connects to", reverse: "Connected from" },
  { value: "part_of", label: "Part of", reverse: "Contains" },
  { value: "licensed_for", label: "Licensed for", reverse: "Licensed by" },
  { value: "assigned_to", label: "Assigned to", reverse: "Has" },
] as const

export function relationLabel(kind: string, outgoing: boolean) {
  const r = relationKinds.find((k) => k.value === kind)
  if (!r) return kind
  return outgoing ? r.label : r.reverse
}

// ---- Status ----

export type Tone = "success" | "warning" | "danger" | "muted"

const good = ["online", "on", "running", "ok", "active", "installed", "healthy"]
const bad = [
  "offline",
  "unreachable",
  "error",
  "failed",
  "auth_failed",
  "critical",
  "down",
  "key_mismatch",
  "stopped",
]

export function statusOf(a: Asset): { tone: Tone; label: string } | null {
  if (a.source_gone) return { tone: "muted", label: "Removed from Morche" }
  const s = typeof a.facts.status === "string" ? a.facts.status : ""
  if (!s) return null
  const label = s.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())
  if (good.includes(s)) return { tone: "success", label }
  if (bad.includes(s)) return { tone: "danger", label }
  if (s === "paused" || s === "off" || s === "unknown")
    return { tone: "muted", label }
  return { tone: "warning", label }
}

export const toneDot: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  muted: "bg-mist",
}

export function StatusLabel({
  asset,
  className,
}: {
  asset: Asset
  className?: string
}) {
  const s = statusOf(asset)
  if (!s) return null
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-caption whitespace-nowrap text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-2 rounded-full", toneDot[s.tone])}
      />
      {s.label}
    </span>
  )
}

// ---- Links ----

export function assetHref(id: string) {
  return `/assets/${id}`
}

export function editAssetHref(id: string) {
  return `/assets/${id}/edit`
}

const newParams = { kind: parseAsString.withDefault("") }
export const newAssetHref = (kind?: string) =>
  createSerializer(newParams)("/assets/new", { kind: kind ?? null })

export function useNewAssetParams() {
  return useQueryStates(newParams)
}

// Where a linked asset's source lives in Morche.
export function sourceHref(a: Asset): string | null {
  if (!a.source_kind || a.source_gone) return null
  const f = a.facts
  const ref = a.source_ref
  switch (a.source_kind) {
    case "server":
      return `/servers/${ref}`
    case "database":
      return `/databases/${ref}`
    case "storage":
      return `/storage/${ref}`
    case "dns_server":
      return `/dns/${ref}`
    case "proxy":
      return `/proxy/${ref}`
    case "website":
      return typeof f.proxy_id === "string"
        ? `/proxy/${f.proxy_id}/hosts/${ref}`
        : "/proxy"
    case "vm_cluster":
      return "/vms/clusters"
    case "cloud_account":
      return `/cloud/${ref}`
    case "web_service":
      return `/services${appsHref({ q: a.name })}`
    case "compose_project": {
      const [server, ...rest] = ref.split("/")
      return projectHref(server, rest.join("/"))
    }
    case "application":
      return typeof f.server_id === "string"
        ? `/servers/${f.server_id}/applications`
        : "/applications/installed"
  }
  return null
}

export function sourceLabel(kind: string) {
  const m: Record<string, string> = {
    server: "Open server",
    database: "Open database",
    storage: "Open storage",
    dns_server: "Open DNS server",
    proxy: "Open proxy",
    website: "Open site",
    vm_cluster: "Open clusters",
    cloud_account: "Open account",
    web_service: "Open in Services",
    compose_project: "Open project",
    application: "Open applications",
  }
  return m[kind] ?? "Open"
}

// ---- Dates ----

export function today() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function daysUntil(date: string) {
  if (!date) return null
  const [y, m, d] = date.slice(0, 10).split("-").map(Number)
  if (!y || !m || !d) return null
  const t = new Date(y, m - 1, d)
  return Math.round((t.getTime() - today().getTime()) / 86_400_000)
}

export function dateText(date: string) {
  if (!date) return ""
  const [y, m, d] = date.slice(0, 10).split("-").map(Number)
  if (!y) return date
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function inDays(n: number) {
  if (n === 0) return "today"
  if (n === 1) return "tomorrow"
  if (n === -1) return "yesterday"
  if (n < 0) {
    const a = -n
    return a >= 60 ? `${Math.round(a / 30)} months ago` : `${a} days ago`
  }
  return n >= 60 ? `in ${Math.round(n / 30)} months` : `in ${n} days`
}

export type DueDate = {
  key: "expires" | "warranty" | "cert" | "review"
  label: string
  date: string
  days: number
}

const addDays = (iso: string, days: number) => {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function expiryLabel(a: Pick<Asset, "kind" | "auto_renew">) {
  if (a.auto_renew) return "Renews"
  switch (a.kind) {
    case "domain":
    case "certificate":
    case "license":
      return "Expires"
    case "subscription":
    case "contract":
      return "Ends"
  }
  return "Expires"
}

// Every date that will need someone, soonest first.
export function dueDates(a: Asset): DueDate[] {
  const out: DueDate[] = []
  const push = (key: DueDate["key"], label: string, date: string) => {
    const days = daysUntil(date)
    if (days !== null) out.push({ key, label, date: date.slice(0, 10), days })
  }
  if (a.expires_on) push("expires", expiryLabel(a), a.expires_on)
  if (a.warranty_until) push("warranty", "Warranty ends", a.warranty_until)
  const cert = a.facts.cert_expires_at
  if (typeof cert === "string" && cert)
    push("cert", "Certificate expires", cert)
  if (a.review_days > 0)
    push(
      "review",
      "Review due",
      addDays(a.reviewed_at ?? a.created_at, a.review_days),
    )
  return out.sort((x, y) => x.days - y.days)
}

// ---- End of life of common operating systems ----

const eol: Record<string, Record<string, string>> = {
  ubuntu: {
    "14.04": "2019-04-30",
    "16.04": "2021-04-30",
    "18.04": "2023-05-31",
    "20.04": "2025-05-31",
    "22.04": "2027-06-01",
    "24.04": "2029-05-31",
    "23.04": "2024-01-25",
    "23.10": "2024-07-11",
    "24.10": "2025-07-10",
    "25.04": "2026-01-15",
    "25.10": "2026-07-01",
  },
  debian: {
    "8": "2020-06-30",
    "9": "2022-06-30",
    "10": "2024-06-30",
    "11": "2026-08-31",
    "12": "2028-06-30",
    "13": "2030-06-30",
  },
  centos: { "6": "2020-11-30", "7": "2024-06-30", "8": "2021-12-31" },
  rhel: { "7": "2024-06-30", "8": "2029-05-31", "9": "2032-05-31" },
  rocky: { "8": "2029-05-31", "9": "2032-05-31" },
  almalinux: { "8": "2029-03-01", "9": "2032-05-31" },
  alpine: {
    "3.15": "2023-11-01",
    "3.16": "2024-05-23",
    "3.17": "2024-11-22",
    "3.18": "2025-05-09",
    "3.19": "2025-11-01",
    "3.20": "2026-04-01",
    "3.21": "2026-11-01",
    "3.22": "2027-05-01",
  },
}

export function osEndOfLife(a: Asset): { date: string; days: number } | null {
  if (a.kind !== "server") return null
  const id = String(a.facts.os_id ?? "")
  const raw = String(a.facts.os_version ?? "")
  const table = eol[id]
  if (!table || !raw) return null
  const parts = raw.split(".")
  const key =
    id === "ubuntu" || id === "alpine" ? parts.slice(0, 2).join(".") : parts[0]
  const date = table[key]
  if (!date) return null
  const days = daysUntil(date)
  return days === null ? null : { date, days }
}

// ---- Coverage: what needs someone ----

export type IssueKey =
  | "no-owner"
  | "owner-gone"
  | "expired"
  | "expiring"
  | "review"
  | "eol"
  | "no-backup"
  | "unmonitored"
  | "seats"
  | "gone"
  | "down"

export const issueMeta: Record<
  IssueKey,
  { label: string; hint: string; severity: 0 | 1 | 2 }
> = {
  expired: {
    label: "Expired",
    hint: "A licence, domain, contract, warranty or certificate date has passed.",
    severity: 2,
  },
  "owner-gone": {
    label: "Owner left",
    hint: "Its owner's account is blocked: give it to someone else.",
    severity: 2,
  },
  eol: {
    label: "Old operating system",
    hint: "The OS release no longer gets security updates (or won't soon).",
    severity: 2,
  },
  down: {
    label: "Not working",
    hint: "Morche reports it offline, unreachable or failing.",
    severity: 2,
  },
  "no-owner": {
    label: "No owner",
    hint: "Nobody answers for it: set an owner, or add an owner rule.",
    severity: 1,
  },
  expiring: {
    label: "Expiring soon",
    hint: "A date falls in the next 30 days.",
    severity: 1,
  },
  review: {
    label: "Review overdue",
    hint: "The owner hasn't confirmed it's still needed.",
    severity: 1,
  },
  "no-backup": {
    label: "No backup plan",
    hint: "A database without an active backup plan.",
    severity: 1,
  },
  seats: {
    label: "Over its seats",
    hint: "More seats in use than bought.",
    severity: 1,
  },
  unmonitored: {
    label: "Not monitored",
    hint: "A website or web service no uptime monitor checks.",
    severity: 0,
  },
  gone: {
    label: "Removed from Morche",
    hint: "Its source was deleted: delete the asset or keep it as retired.",
    severity: 0,
  },
}

export const issueOrder: IssueKey[] = [
  "expired",
  "owner-gone",
  "eol",
  "down",
  "no-owner",
  "expiring",
  "review",
  "no-backup",
  "seats",
  "unmonitored",
  "gone",
]

export function issuesOf(a: Asset): IssueKey[] {
  const out: IssueKey[] = []
  if (a.lifecycle === "retired") return a.source_gone ? [] : out
  if (a.source_gone) out.push("gone")
  if (a.owner.from === "none") out.push("no-owner")
  if (a.owner.user_status === "blocked") out.push("owner-gone")
  const dates = dueDates(a).filter((d) => d.key !== "review")
  if (dates.some((d) => d.days < 0 && !(d.key === "expires" && a.auto_renew)))
    out.push("expired")
  else if (dates.some((d) => d.days >= 0 && d.days <= 30)) out.push("expiring")
  const review = dueDates(a).find((d) => d.key === "review")
  if (review && review.days < 0) out.push("review")
  const os = osEndOfLife(a)
  if (os && os.days <= 90) out.push("eol")
  if (a.kind === "database" && a.facts.backups === 0) out.push("no-backup")
  if (
    (a.kind === "website" || a.kind === "web_service") &&
    a.facts.monitors === 0 &&
    a.facts.status !== "off"
  )
    out.push("unmonitored")
  if (a.seats != null && a.seats_used != null && a.seats_used > a.seats)
    out.push("seats")
  if (statusOf(a)?.tone === "danger") out.push("down")
  return issueOrder.filter((k) => out.includes(k))
}

// ---- Owners ----

export function ownerText(a: Asset) {
  const o = a.owner
  if (o.from === "none") return ""
  return [o.user_name, o.group_name].filter(Boolean).join(" · ")
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase()
}

// Mirrors the backend's ruleMatches, to preview rules before saving.
export function ruleMatches(r: AssetOwnerRule, a: Asset) {
  if (r.kinds.length && !r.kinds.includes(a.kind)) return false
  if (r.environments.length && !r.environments.includes(a.environment))
    return false
  if (r.tags.length) {
    const tags = [...a.tags]
    if (Array.isArray(a.facts.tags))
      for (const t of a.facts.tags) if (typeof t === "string") tags.push(t)
    if (!r.tags.some((t) => tags.includes(t))) return false
  }
  if (r.name_pattern) {
    let pat = r.name_pattern.toLowerCase()
    if (!/[*?[]/.test(pat)) pat = `*${pat}*`
    const re = new RegExp(
      `^${pat
        .replace(/[.+^${}()|\\]/g, "\\$&")
        .replaceAll("*", ".*")
        .replaceAll("?", ".")}$`,
    )
    if (!re.test(a.name.toLowerCase())) return false
  }
  return true
}

// ---- Bodies ----

export function bodyOf(a: Asset): AssetBody {
  return {
    kind: a.kind,
    category: a.category,
    name: a.name,
    description: a.description,
    owner_user_id: a.owner_user_id,
    owner_group_id: a.owner_group_id,
    deputy_user_id: a.deputy_user_id,
    assigned_user_id: a.assigned_user_id,
    environment: a.environment as AssetBody["environment"],
    criticality: a.criticality,
    classification: a.classification as AssetBody["classification"],
    lifecycle: a.lifecycle as AssetBody["lifecycle"],
    tags: a.tags,
    vendor: a.vendor,
    model: a.model,
    serial_number: a.serial_number,
    asset_tag: a.asset_tag,
    location: a.location,
    cost: a.cost,
    currency: a.currency,
    billing: a.billing as AssetBody["billing"],
    cost_center: a.cost_center,
    purchased_on: a.purchased_on,
    warranty_until: a.warranty_until,
    expires_on: a.expires_on,
    auto_renew: a.auto_renew,
    seats: a.seats,
    seats_used: a.seats_used,
    links: a.links,
    fields: a.fields,
    notes: a.notes,
    channel_ids: a.channel_ids,
    review_days: a.review_days,
  }
}

export function money(cost: number | undefined, currency: string) {
  if (cost == null) return ""
  const n = cost.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return currency ? `${n} ${currency}` : n
}

// What it costs per year, for totals.
export function yearlyCost(a: Asset) {
  if (a.cost == null || a.lifecycle === "retired") return 0
  if (a.billing === "monthly") return a.cost * 12
  if (a.billing === "yearly") return a.cost
  return 0
}

// ---- URL state ----

export const assetsPages = {
  inventory: "/assets",
  coverage: "/assets/coverage",
  discovery: "/assets/discovery",
  map: "/assets/map",
  owners: "/assets/owners",
  settings: "/assets/settings",
} as const

export const sorts = [
  "name",
  "kind",
  "owner",
  "due",
  "criticality",
  "updated",
] as const

const listFilters = {
  q: parseAsString.withDefault(""),
  kind: parseAsString.withDefault(""),
  owner: parseAsString.withDefault(""),
  env: parseAsString.withDefault(""),
  life: parseAsString.withDefault(""),
  issue: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(sorts).withDefault("name"),
}

export function useAssetFilters() {
  const [f, set] = useQueryStates(listFilters, { history: "replace" })
  const page = useRouteTab(assetsPages)
  return [{ ...f, page }, set] as const
}

export const assetsHref = createSerializer(listFilters)

// Whether an asset passes the list filters (q, kind, owner, env, life, issue).
export function passes(
  a: Asset,
  f: {
    q: string
    kind: string
    owner: string
    env: string
    life: string
    issue: string
  },
  me: string,
) {
  if (f.kind) {
    if (f.kind.startsWith("g:")) {
      const g = kindGroups.find((x) => x.key === f.kind.slice(2))
      if (g && !g.kinds.includes(a.kind)) return false
    } else if (a.kind !== f.kind) return false
  }
  if (f.owner) {
    const o = a.owner
    if (f.owner === "none" && o.from !== "none") return false
    if (f.owner === "me" && o.user_id !== me && o.deputy_id !== me) return false
    if (f.owner.startsWith("g:") && o.group_id !== f.owner.slice(2))
      return false
    if (f.owner.startsWith("u:") && o.user_id !== f.owner.slice(2)) return false
  }
  if (f.env && a.environment !== (f.env === "none" ? "" : f.env)) return false
  if (f.life) {
    if (f.life === "in-use" && a.lifecycle === "retired") return false
    if (f.life !== "in-use" && a.lifecycle !== f.life) return false
  }
  if (f.issue) {
    const issues = issuesOf(a)
    if (
      f.issue === "any"
        ? issues.length === 0
        : !issues.includes(f.issue as IssueKey)
    )
      return false
  }
  if (f.q) {
    const words = f.q.toLowerCase().split(/\s+/).filter(Boolean)
    const hay = [
      a.name,
      a.category,
      a.description,
      kindOf(a.kind).label,
      a.vendor,
      a.model,
      a.serial_number,
      a.asset_tag,
      a.location,
      a.owner.user_name,
      a.owner.group_name,
      a.assigned_user_name,
      ...a.tags,
      String(a.facts.host ?? ""),
      String(a.facts.address ?? ""),
      ...(Array.isArray(a.facts.domains) ? a.facts.domains.map(String) : []),
      ...Object.values(a.fields),
    ]
      .join(" ")
      .toLowerCase()
    if (!words.every((w) => hay.includes(w))) return false
  }
  return true
}
