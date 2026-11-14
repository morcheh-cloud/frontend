import {
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import type {
  CloudAccount,
  CloudAccountRead,
  CloudResourcesOutputBody,
  CloudServer,
} from "@/lib/services"
import type { useCloudResources, useCloudServers } from "../../api"
import { byState, stateCounts } from "../../components/account-parts"
import { osText } from "../../components/meta"

// ── Tabs and their URL state ─────────────────────────────────────────────

export const accountTabs = [
  "overview",
  "servers",
  "disks",
  "firewalls",
  "networks",
  "backups",
  "settings",
] as const
export type AccountTab = (typeof accountTabs)[number]

// The tabs that show what the provider's resources API returns.
export const resourceTabs: readonly AccountTab[] = [
  "disks",
  "firewalls",
  "networks",
  "backups",
]

export const accountFilters = {
  tab: parseAsStringLiteral(accountTabs).withDefault("overview"),
  q: parseAsString.withDefault(""),
  show: parseAsString.withDefault("all"),
}

export function useAccountFilters() {
  const [f, set] = useQueryStates(accountFilters, { history: "replace" })
  return {
    ...f,
    // Another tab starts with its own search and filter.
    setTab: (tab: AccountTab) => {
      if (tab === f.tab) return
      set({ tab, q: null, show: null }, { history: "push" })
      window.scrollTo({ top: 0 })
    },
    setQ: (q: string) => set({ q: q || null }),
    setShow: (show: string) => set({ show: show === "all" ? null : show }),
  }
}

const serialize = createSerializer(accountFilters)

export const accountTabHref = (
  id: string,
  tab: AccountTab,
  show?: string,
): string =>
  serialize(`/cloud/${id}`, {
    tab: tab === "overview" ? null : tab,
    show: show ?? null,
  })

// ── Model ────────────────────────────────────────────────────────────────

type ServersQuery = ReturnType<typeof useCloudServers>
type ResourcesQuery = ReturnType<typeof useCloudResources>

export type RegionRow = {
  code: string
  name: string
  city: string
  servers: number
  running: number
  problems: string[]
}

export type SystemRow = {
  key: string
  label: string
  server: CloudServer
  n: number
}

export type FirewallGroup = {
  key: string
  name: string
  builtin: boolean
  default: boolean
  zones: string[]
  min: number
  max: number
}

export type Model = {
  account: CloudAccount
  read: CloudAccountRead | undefined
  // This account's servers (worst first), undefined until read.
  servers: CloudServer[] | undefined
  serversError: Error | null
  res: CloudResourcesOutputBody | undefined
  resPending: boolean
  resError: Error | null
  readAt: string | undefined
  totals: {
    cpu: number
    cpuOn: number
    memory: number
    memoryOn: number
    disk: number
    volumes: number
    volumesLoose: number
  }
  regions: RegionRow[]
  systems: SystemRow[]
  firewalls: FirewallGroup[]
}

export function buildModel(
  account: CloudAccount,
  servers: ServersQuery,
  resources: ResourcesQuery,
): Model {
  const mine = servers.data
    ? byState(servers.data.items.filter((s) => s.account_id === account.id))
    : undefined
  const read = servers.data?.accounts.find((r) => r.id === account.id)
  const res = resources.data

  const totals = {
    cpu: 0,
    cpuOn: 0,
    memory: 0,
    memoryOn: 0,
    disk: 0,
    volumes: 0,
    volumesLoose: 0,
  }
  for (const s of mine ?? []) {
    totals.cpu += s.cpu
    totals.memory += s.memory_mb
    totals.disk += s.disk_gb
    if (s.state === "running") {
      totals.cpuOn += s.cpu
      totals.memoryOn += s.memory_mb
    }
  }
  for (const v of res?.volumes ?? []) {
    totals.volumes += v.size_gb
    if (!v.server_id) totals.volumesLoose += v.size_gb
  }

  // Every region the key can see, with what lives there.
  const regions = new Map<string, RegionRow>()
  const region = (code: string, name = code, city = "") => {
    let r = regions.get(code)
    if (!r) {
      r = { code, name, city, servers: 0, running: 0, problems: [] }
      regions.set(code, r)
    }
    return r
  }
  for (const r of read?.regions ?? []) region(r.code, r.name || r.code, r.city)
  for (const s of mine ?? []) {
    const r = region(s.region, s.region_name || s.region)
    r.servers++
    if (s.state === "running") r.running++
  }
  for (const p of read?.problems ?? [])
    region(p.region).problems.push(p.message)
  for (const p of res?.problems ?? []) {
    region(p.region).problems.push(`${kindLabel[p.kind]}: ${p.message}`)
  }

  const systems = new Map<string, SystemRow>()
  for (const s of mine ?? []) {
    const label = osText(s) || "Unknown system"
    const row = systems.get(label)
    if (row) row.n++
    else systems.set(label, { key: label, label, server: s, n: 1 })
  }

  return {
    account,
    read,
    servers: mine,
    serversError: servers.error,
    res,
    resPending: resources.isPending,
    resError: resources.error,
    readAt: res?.read_at ?? servers.data?.read_at,
    totals,
    regions: [...regions.values()].sort(
      (a, b) => b.servers - a.servers || a.name.localeCompare(b.name),
    ),
    systems: [...systems.values()].sort((a, b) => b.n - a.n),
    firewalls: groupFirewalls(res?.firewalls ?? []),
  }
}

export const kindLabel: Record<
  CloudResourcesOutputBody["problems"][number]["kind"],
  string
> = {
  firewalls: "Firewalls",
  networks: "Private networks",
  volumes: "Disks",
  backups: "Backup schedules",
}

// The provider repeats the same firewall in every zone (its built-in ones
// above all): one row per name, with the zones it's in.
function groupFirewalls(list: CloudResourcesOutputBody["firewalls"]) {
  const groups = new Map<string, FirewallGroup>()
  for (const f of list) {
    const name = f.name || f.id
    const key = `${name}|${f.builtin}|${f.default}`
    const zone = f.zone_name || f.region
    const g = groups.get(key)
    if (!g) {
      groups.set(key, {
        key,
        name,
        builtin: f.builtin,
        default: f.default,
        zones: [zone],
        min: f.rules,
        max: f.rules,
      })
      continue
    }
    if (!g.zones.includes(zone)) g.zones.push(zone)
    g.min = Math.min(g.min, f.rules)
    g.max = Math.max(g.max, f.rules)
  }
  return [...groups.values()].sort(
    (a, b) =>
      Number(a.builtin) - Number(b.builtin) || a.name.localeCompare(b.name),
  )
}

// How many things each tab holds, for the tab bar; undefined = not read yet.
export function tabCounts(m: Model): Partial<Record<AccountTab, number>> {
  const r = m.res
  return {
    servers: m.servers?.length,
    disks: r?.volumes.length,
    firewalls: r ? m.firewalls.length : undefined,
    networks: r?.networks.length,
    backups: r?.backups.length,
  }
}

// The tabs this account has: the resource ones only when the provider
// shares them.
export const tabsOf = (m: Model) =>
  accountTabs.filter(
    (t) => !resourceTabs.includes(t) || !m.res || m.res.supported,
  )

// ── Server filters ───────────────────────────────────────────────────────

export const serverShows = [
  "all",
  "running",
  "off",
  "other",
  "unlinked",
] as const
export type ServerShow = (typeof serverShows)[number]

export function serverShowCounts(list: CloudServer[]) {
  const c = stateCounts(list)
  return {
    all: list.length,
    running: c.running,
    off: c.off,
    other: c.other,
    unlinked: list.filter((s) => s.linked.length === 0).length,
  } satisfies Record<ServerShow, number>
}

export function serverMatches(s: CloudServer, show: ServerShow, q: string) {
  if (show === "running" && s.state !== "running") return false
  if (show === "off" && s.state !== "stopped" && s.state !== "archived")
    return false
  if (show === "other" && ["running", "stopped", "archived"].includes(s.state))
    return false
  if (show === "unlinked" && s.linked.length > 0) return false
  if (!q) return true
  const text = [
    s.name,
    s.os,
    s.image,
    s.region_name,
    s.zone_name,
    s.plan,
    ...s.addresses.map((a) => a.ip),
  ]
    .join(" ")
    .toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => text.includes(w))
}

export const asShow = <T extends string>(
  values: readonly T[],
  value: string,
): T => (values.includes(value as T) ? (value as T) : values[0])

export const textMatches = (q: string, ...parts: (string | undefined)[]) => {
  if (!q) return true
  const text = parts.filter(Boolean).join(" ").toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => text.includes(w))
}
