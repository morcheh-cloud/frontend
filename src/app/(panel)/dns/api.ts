"use client"

import {
  type QueryClient,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { dnsServersQuery, STATUS_POLL } from "@/components/panel/problems"
import { ApiError, api } from "@/lib/api"
import type {
  CDNAcceleration,
  CDNAccelerationBody,
  CDNCaching,
  CDNCachingPatch,
  CDNFirewall,
  CDNRateLimit,
  CDNRecord,
  CDNRecordFields,
  CDNRecords,
  CDNRedirect,
  CDNSSL,
  CDNSSLPatch,
  CDNWAF,
  DNSNameMatch,
  DNSPointBody,
  DNSRecord,
  DNSRecordBody,
  DNSServer,
  DNSServerBody,
  DNSTestBody,
  DNSZoneOptionsBody,
  DNSZoneRecords,
} from "@/lib/services"

// Everything about one server sits under ["dns-servers", id], so removing a
// server drops its zones and records with it.
export const dnsKeys = {
  servers: dnsServersQuery.queryKey,
  server: (id: string) => ["dns-servers", id] as const,
  zones: (id: string) => ["dns-servers", id, "zones"] as const,
  records: (id: string, zone: string) =>
    ["dns-servers", id, "zones", zone, "records"] as const,
  options: (id: string, zone: string) =>
    ["dns-servers", id, "zones", zone, "options"] as const,
  everywhere: ["dns-zones"] as const,
}

// A zone as a path segment: the root zone is "@" (a bare "." would be eaten
// by the URL), the rest escaped.
export const zoneParam = (zone: string) =>
  zone === "." ? "@" : encodeURIComponent(zone)

export function zoneFromParam(param: string) {
  const zone = decodeURIComponent(param)
  return zone === "@" ? "." : zone
}

const notFound = (error: Error) =>
  error instanceof ApiError && error.status === 404

// Zones change on the DNS servers by themselves (a Secondary syncing, someone
// using Technitium's own panel): re-read them now and then.
const ZONE_POLL = 30_000

export function useDnsServers() {
  return useQuery(dnsServersQuery)
}

export function useDnsServer(id: string) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: dnsKeys.server(id),
    queryFn: () => api.dns.getDnsServer(id),
    refetchInterval: STATUS_POLL,
    placeholderData: () =>
      queryClient
        .getQueryData<{ items: DNSServer[] }>(dnsKeys.servers)
        ?.items.find((s) => s.id === id),
    retry: (count, error) => !notFound(error) && count < 2,
  })
}

export function useZonesEverywhere(enabled = true) {
  return useQuery({
    queryKey: dnsKeys.everywhere,
    queryFn: () => api.dns.listDnsZonesEverywhere(),
    refetchInterval: ZONE_POLL,
    enabled,
  })
}

export function useDnsZones(id: string, enabled = true) {
  return useQuery({
    queryKey: dnsKeys.zones(id),
    queryFn: () => api.dns.listDnsZones(id),
    refetchInterval: ZONE_POLL,
    enabled,
    retry: (count, error) => !notFound(error) && count < 2,
  })
}

export function useDnsRecords(id: string, zone: string, enabled = true) {
  return useQuery({
    queryKey: dnsKeys.records(id, zone),
    queryFn: () => api.dns.listDnsRecords(id, zoneParam(zone)),
    enabled,
    retry: (count, error) => !notFound(error) && count < 2,
  })
}

export function useZoneOptions(id: string, zone: string, enabled = true) {
  return useQuery({
    queryKey: dnsKeys.options(id, zone),
    queryFn: () => api.dns.getDnsZoneOptions(id, zoneParam(zone)),
    enabled,
    // Always fresh when the settings open: someone may have changed them on
    // the DNS server itself.
    staleTime: 0,
    gcTime: 0,
  })
}

// A server the API answered goes straight into the list and its page; the
// list then refetches in the background (order, counts).
function store(queryClient: QueryClient, s: DNSServer) {
  queryClient.setQueryData(dnsKeys.server(s.id), s)
  queryClient.setQueryData<{ items: DNSServer[] }>(
    dnsKeys.servers,
    (data) =>
      data && {
        ...data,
        items: data.items.some((x) => x.id === s.id)
          ? data.items.map((x) => (x.id === s.id ? s : x))
          : [...data.items, s],
      },
  )
  return queryClient.invalidateQueries({
    queryKey: dnsKeys.servers,
    exact: true,
  })
}

// Zones moved: this server's list, the cross-server view, the zone counts.
function zonesChanged(queryClient: QueryClient, id: string) {
  queryClient.invalidateQueries({ queryKey: dnsKeys.zones(id) })
  queryClient.invalidateQueries({ queryKey: dnsKeys.everywhere })
  queryClient.invalidateQueries({ queryKey: dnsKeys.servers, exact: true })
  queryClient.invalidateQueries({ queryKey: dnsKeys.server(id), exact: true })
}

export function useCreateDnsServer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: DNSServerBody) => api.dns.createDnsServer(body),
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: dnsKeys.everywhere })
      return store(queryClient, s)
    },
  })
}

export function useUpdateDnsServer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DNSServerBody }) =>
      api.dns.updateDnsServer(id, body),
    onSuccess: (s) => {
      // A new address or token: everything read through the old one may be
      // from another server.
      queryClient.invalidateQueries({ queryKey: dnsKeys.zones(s.id) })
      queryClient.invalidateQueries({ queryKey: dnsKeys.everywhere })
      return store(queryClient, s)
    },
  })
}

export function useDeleteDnsServer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.dns.deleteDnsServer(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<{ items: DNSServer[] }>(
        dnsKeys.servers,
        (data) =>
          data && { ...data, items: data.items.filter((s) => s.id !== id) },
      )
      // Not the server itself: a still-open page would refetch a 404.
      queryClient.removeQueries({ queryKey: dnsKeys.zones(id) })
      queryClient.invalidateQueries({ queryKey: dnsKeys.everywhere })
      return queryClient.invalidateQueries({
        queryKey: dnsKeys.servers,
        exact: true,
      })
    },
  })
}

export function useTestDns() {
  return useMutation({
    mutationFn: (body: DNSTestBody) => api.dns.testDnsConnection(body),
  })
}

const checkKey = ["check-dns-server"]

export function useCheckDnsServer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: checkKey,
    mutationFn: (id: string) => api.dns.checkDnsServer(id),
    onSuccess: (s) => {
      if (s.status === "online") zonesChanged(queryClient, s.id)
      return store(queryClient, s)
    },
  })
}

// Ids with a check in flight, so their status can show a spinner.
export function useCheckingDnsServers() {
  const ids = useMutationState({
    filters: { mutationKey: checkKey, status: "pending" },
    select: (m) => m.state.variables as string | undefined,
  })
  return new Set(ids.filter(Boolean))
}

export function useSetDnsFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      api.dns.setDnsServerFavorite(id, { favorite }),
    onMutate: ({ id, favorite }) => {
      queryClient.setQueryData<DNSServer>(
        dnsKeys.server(id),
        (s) => s && { ...s, favorite },
      )
      queryClient.setQueryData<{ items: DNSServer[] }>(
        dnsKeys.servers,
        (data) =>
          data && {
            ...data,
            items: data.items.map((s) =>
              s.id === id ? { ...s, favorite } : s,
            ),
          },
      )
    },
    onSuccess: (s) => store(queryClient, s),
    onError: () =>
      queryClient.invalidateQueries({ queryKey: dnsKeys.servers, exact: true }),
  })
}

export function useCreateZone(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name: string
      type?: "Primary" | "Secondary"
      primary_addresses?: string[]
      setup?: "full" | "partial"
      import_records?: boolean
    }) => api.dns.createDnsZone(id, body),
    onSuccess: () => zonesChanged(queryClient, id),
  })
}

// Zone writes name their server per call: one set of dialogs serves zones on
// every server (the cross-server list).
type ZoneRef = { id: string; zone: string }

export function useDeleteZone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, zone }: ZoneRef) =>
      api.dns.deleteDnsZone(id, zoneParam(zone)),
    onSuccess: (_, { id, zone }) => {
      queryClient.removeQueries({ queryKey: dnsKeys.records(id, zone) })
      zonesChanged(queryClient, id)
    },
  })
}

export function useSetZoneEnabled() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, zone, enabled }: ZoneRef & { enabled: boolean }) =>
      api.dns.setDnsZoneEnabled(id, zoneParam(zone), { enabled }),
    onSuccess: (_, { id, zone }) => {
      queryClient.invalidateQueries({ queryKey: dnsKeys.records(id, zone) })
      zonesChanged(queryClient, id)
    },
  })
}

export function useResyncZone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, zone }: ZoneRef) =>
      api.dns.resyncDnsZone(id, zoneParam(zone)),
    onSuccess: (_, { id, zone }) => {
      // The copy runs on the DNS server; look again in a moment.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: dnsKeys.records(id, zone) })
        zonesChanged(queryClient, id)
      }, 1500)
    },
  })
}

export function useSetZoneOptions(id: string, zone: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: DNSZoneOptionsBody) =>
      api.dns.setDnsZoneOptions(id, zoneParam(zone), body),
    onSuccess: (options) => {
      queryClient.setQueryData(dnsKeys.options(id, zone), options)
      zonesChanged(queryClient, id)
    },
  })
}

export type RecordChange =
  | { op: "add"; record: DNSRecordBody }
  | { op: "update"; current: DNSRecordBody; record: DNSRecordBody }
  | { op: "delete"; record: DNSRecordBody }

// Every record write answers the zone's fresh records, which replace the
// cached ones; the zone lists refresh for the new serial.
export function useRecordChange() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      zone,
      change,
    }: ZoneRef & { change: RecordChange }): Promise<DNSZoneRecords> => {
      const z = zoneParam(zone)
      switch (change.op) {
        case "add":
          return api.dns.addDnsRecord(id, z, change.record)
        case "update":
          return api.dns.updateDnsRecord(id, z, {
            current: change.current,
            new: change.record,
          })
        case "delete":
          return api.dns.deleteDnsRecord(id, z, change.record)
      }
    },
    onSuccess: (data, { id, zone }) => {
      queryClient.setQueryData(dnsKeys.records(id, zone), data)
      queryClient.invalidateQueries({ queryKey: dnsKeys.zones(id) })
      queryClient.invalidateQueries({ queryKey: dnsKeys.everywhere })
    },
    // Someone else may have changed the zone meanwhile.
    onError: (_, { id, zone }) =>
      queryClient.invalidateQueries({ queryKey: dnsKeys.records(id, zone) }),
  })
}

// The body that names a record exactly as it is now (to change or delete it).
// Only the fields the API knows: Huma refuses any other key.
export function recordBody(r: DNSRecord): DNSRecordBody {
  const body: DNSRecordBody = {
    name: r.name,
    type: r.type as DNSRecordBody["type"],
    ttl: r.ttl,
    value: r.value,
    disabled: r.disabled,
    comments: r.comments,
  }
  if (r.priority != null) body.priority = r.priority
  if (r.weight != null) body.weight = r.weight
  if (r.port != null) body.port = r.port
  if (r.flags != null) body.flags = r.flags
  if (r.tag) body.tag = r.tag
  return body
}

// ArvanCloud domains (a DNS connection of kind "arvan"): records, DNSSEC and
// the CDN settings live under ["dns-servers", id, "cdn", zone, …].
export const cdnKeys = {
  zone: (id: string, zone: string) => ["dns-servers", id, "cdn", zone] as const,
  records: (id: string, zone: string) =>
    ["dns-servers", id, "cdn", zone, "records"] as const,
  setting: (id: string, zone: string, kind: CdnSettingKind) =>
    ["dns-servers", id, "cdn", zone, "setting", kind] as const,
  report: (id: string, zone: string, period: CdnPeriod) =>
    ["dns-servers", id, "cdn", zone, "report", period] as const,
}

export type CdnPeriod = "1h" | "3h" | "6h" | "12h" | "24h" | "7d" | "30d"

export function useCdnRecords(id: string, zone: string, enabled = true) {
  return useQuery({
    queryKey: cdnKeys.records(id, zone),
    queryFn: () => api.dns.listCdnRecords(id, zoneParam(zone)),
    enabled,
    // Someone may change the domain in ArvanCloud's own panel.
    refetchInterval: 60_000,
    retry: (count, error) => !notFound(error) && count < 2,
  })
}

// Only the fields a record is written with: Huma refuses any other key.
export function cdnFields(r: CDNRecord | CDNRecordFields): CDNRecordFields {
  const out: CDNRecordFields = { name: r.name, type: r.type, cloud: r.cloud }
  const keys = [
    "ttl",
    "upstream_https",
    "ip_filter",
    "addresses",
    "host",
    "host_header",
    "port",
    "priority",
    "weight",
    "text",
    "tag",
    "value",
    "tlsa_usage",
    "tlsa_selector",
    "tlsa_matching_type",
    "certificate",
  ] as const
  for (const k of keys) {
    const v = r[k]
    if (v !== undefined && v !== null && v !== "")
      (out as unknown as Record<string, unknown>)[k] = v
  }
  if (out.addresses)
    out.addresses = out.addresses.map(({ ip, port, weight, country }) => ({
      ip,
      ...(port != null && { port }),
      ...(weight != null && { weight }),
      ...(country && { country }),
    }))
  if (out.ip_filter) {
    const { count, order, geo_filter } = out.ip_filter
    out.ip_filter = { count, order, geo_filter }
  }
  return out
}

export type CdnRecordChange =
  | { op: "add"; record: CDNRecordFields }
  | { op: "update"; recordId: string; record: CDNRecordFields }
  | { op: "delete"; recordId: string }
  | { op: "cloud"; recordId: string; cloud: boolean }
  | { op: "import"; text: string }

// Every record write answers the domain's fresh records.
export function useCdnRecordChange() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      zone,
      change,
    }: ZoneRef & { change: CdnRecordChange }): Promise<CDNRecords> => {
      const z = zoneParam(zone)
      switch (change.op) {
        case "add":
          return api.dns.addCdnRecord(id, z, change.record)
        case "update":
          return api.dns.updateCdnRecord(id, z, change.recordId, change.record)
        case "delete":
          return api.dns.deleteCdnRecord(id, z, change.recordId)
        case "cloud":
          return api.dns.setCdnRecordCloud(id, z, change.recordId, {
            cloud: change.cloud,
          })
        case "import":
          return api.dns.importCdnRecords(id, z, { text: change.text })
      }
    },
    onMutate: ({ id, zone, change }) => {
      // The CDN switch flips at once; the answer confirms it.
      if (change.op !== "cloud") return
      queryClient.setQueryData<CDNRecords>(
        cdnKeys.records(id, zone),
        (d) =>
          d && {
            ...d,
            records: d.records.map((r) =>
              r.id === change.recordId ? { ...r, cloud: change.cloud } : r,
            ),
          },
      )
    },
    onSuccess: (data, { id, zone }) => {
      queryClient.setQueryData(cdnKeys.records(id, zone), data)
      queryClient.invalidateQueries({ queryKey: ["dns-names"] })
    },
    onError: (_, { id, zone }) =>
      queryClient.invalidateQueries({ queryKey: cdnKeys.records(id, zone) }),
  })
}

export function useSetCdnDnssec() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, zone, enabled }: ZoneRef & { enabled: boolean }) =>
      api.dns.setCdnDnssec(id, zoneParam(zone), { enabled }),
    onSuccess: (dnssec, { id, zone }) =>
      queryClient.setQueryData<CDNRecords>(
        cdnKeys.records(id, zone),
        (d) => d && { ...d, dnssec },
      ),
  })
}

export function useExportCdnRecords() {
  return useMutation({
    mutationFn: ({ id, zone }: ZoneRef) =>
      api.dns.exportCdnRecords(id, zoneParam(zone)),
  })
}

// Ask ArvanCloud to look at a pending domain's nameservers again.
export function useCheckCdnDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, zone }: ZoneRef) =>
      api.dns.checkCdnDomain(id, zoneParam(zone)),
    onSuccess: (z, { id, zone }) => {
      queryClient.setQueryData<CDNRecords>(
        cdnKeys.records(id, zone),
        (d) => d && { ...d, zone: z },
      )
      zonesChanged(queryClient, id)
    },
  })
}

export type CdnSettingKind = "ssl" | "caching" | "redirect" | "acceleration"

type SettingOf = {
  ssl: CDNSSL
  caching: CDNCaching
  redirect: CDNRedirect
  acceleration: CDNAcceleration
}
type PatchOf = {
  ssl: CDNSSLPatch
  caching: CDNCachingPatch
  redirect: CDNRedirect
  acceleration: CDNAccelerationBody
}

const readers: {
  [K in CdnSettingKind]: (id: string, zone: string) => Promise<SettingOf[K]>
} = {
  ssl: (id, z) => api.dns.getCdnSsl(id, z),
  caching: (id, z) => api.dns.getCdnCaching(id, z),
  redirect: (id, z) => api.dns.getCdnRedirect(id, z),
  acceleration: (id, z) => api.dns.getCdnAcceleration(id, z),
}

const writers: {
  [K in CdnSettingKind]: (
    id: string,
    zone: string,
    body: PatchOf[K],
  ) => Promise<SettingOf[K]>
} = {
  ssl: (id, z, b) => api.dns.updateCdnSsl(id, z, b),
  caching: (id, z, b) => api.dns.updateCdnCaching(id, z, b),
  redirect: (id, z, b) => api.dns.updateCdnRedirect(id, z, b),
  acceleration: (id, z, b) => api.dns.updateCdnAcceleration(id, z, b),
}

export function useCdnSetting<K extends CdnSettingKind>(
  id: string,
  zone: string,
  kind: K,
  enabled = true,
) {
  return useQuery({
    queryKey: cdnKeys.setting(id, zone, kind),
    queryFn: () => readers[kind](id, zoneParam(zone)),
    enabled,
    // Fresh each time the tab opens: it can change in ArvanCloud's panel.
    staleTime: 0,
  })
}

export function useSaveCdnSetting<K extends CdnSettingKind>(
  id: string,
  zone: string,
  kind: K,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PatchOf[K]) => writers[kind](id, zoneParam(zone), body),
    onSuccess: (data) =>
      queryClient.setQueryData(cdnKeys.setting(id, zone, kind), data),
  })
}

export function useIssueCdnCertificate(id: string, zone: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (provider?: "lets_encrypt" | "lite_ssl") =>
      api.dns.issueCdnCertificate(
        id,
        zoneParam(zone),
        provider ? { provider } : {},
      ),
    onSuccess: (data) =>
      queryClient.setQueryData(cdnKeys.setting(id, zone, "ssl"), data),
  })
}

export function usePurgeCdn() {
  return useMutation({
    mutationFn: ({ id, zone, urls }: ZoneRef & { urls?: string[] }) =>
      api.dns.purgeCdnCache(id, zoneParam(zone), urls?.length ? { urls } : {}),
  })
}

export function useCdnReport(
  id: string,
  zone: string,
  period: CdnPeriod,
  enabled = true,
) {
  return useQuery({
    queryKey: cdnKeys.report(id, zone, period),
    queryFn: () => api.dns.getCdnReport(id, zoneParam(zone), { period }),
    enabled,
    refetchInterval: 5 * 60_000,
    placeholderData: (prev) => prev,
  })
}

// Names across every DNS connection (the reverse proxy's domains).
export const dnsNamesKey = (names: string[]) =>
  ["dns-names", [...names].sort().join(",")] as const

export function useDnsNames(names: string[], enabled = true) {
  const clean = [
    ...new Set(
      names
        .map((n) => n.trim().toLowerCase().replace(/\.$/, ""))
        .filter((n) => n.includes(".")),
    ),
  ]
  return useQuery({
    queryKey: dnsNamesKey(clean),
    queryFn: () => api.dns.findDnsNames({ name: clean }),
    enabled: enabled && clean.length > 0,
    staleTime: 30_000,
  })
}

export function usePointDnsName() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      serverId,
      zone,
      body,
    }: {
      serverId: string
      zone: string
      body: DNSPointBody
    }) => api.dns.pointDnsName(serverId, zoneParam(zone), body),
    onSuccess: (match, { serverId, zone }) => {
      queryClient.setQueriesData<{ items: DNSNameMatch[] }>(
        { queryKey: ["dns-names"] },
        (d) =>
          d && {
            ...d,
            items: d.items.map((m) => (m.name === match.name ? match : m)),
          },
      )
      queryClient.invalidateQueries({
        queryKey: cdnKeys.records(serverId, zone),
      })
      queryClient.invalidateQueries({
        queryKey: dnsKeys.records(serverId, zone),
      })
    },
  })
}

// ArvanCloud's edge addresses, for a proxy behind its CDN.
export function useArvanRanges() {
  return useMutation({ mutationFn: () => api.proxies.getArvanRanges() })
}

// Firewall, WAF and rate limiting of an ArvanCloud domain. Every write
// answers the whole section, which replaces the cached one.
export type CdnSecurityKind = "firewall" | "waf" | "rate-limit"

type SectionOf = {
  firewall: CDNFirewall
  waf: CDNWAF
  "rate-limit": CDNRateLimit
}

export const securityKey = (id: string, zone: string, kind: CdnSecurityKind) =>
  ["dns-servers", id, "cdn", zone, "security", kind] as const

const securityReaders: {
  [K in CdnSecurityKind]: (id: string, zone: string) => Promise<SectionOf[K]>
} = {
  firewall: (id, z) => api.dns.getCdnFirewall(id, z),
  waf: (id, z) => api.dns.getCdnWaf(id, z),
  "rate-limit": (id, z) => api.dns.getCdnRateLimit(id, z),
}

export function useCdnSecurity<K extends CdnSecurityKind>(
  id: string,
  zone: string,
  kind: K,
) {
  return useQuery({
    queryKey: securityKey(id, zone, kind),
    queryFn: () => securityReaders[kind](id, zoneParam(zone)),
    staleTime: 0,
  })
}

// One mutation per section: `run` gets the escaped zone and makes the call.
export function useCdnSecurityChange<K extends CdnSecurityKind>(
  id: string,
  zone: string,
  kind: K,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (run: (z: string) => Promise<SectionOf[K]>) =>
      run(zoneParam(zone)),
    onSuccess: (data) =>
      queryClient.setQueryData(securityKey(id, zone, kind), data),
    onError: () =>
      queryClient.invalidateQueries({ queryKey: securityKey(id, zone, kind) }),
  })
}
