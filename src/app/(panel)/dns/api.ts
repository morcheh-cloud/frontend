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

export function useDnsRecords(id: string, zone: string) {
  return useQuery({
    queryKey: dnsKeys.records(id, zone),
    queryFn: () => api.dns.listDnsRecords(id, zoneParam(zone)),
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
      type: "Primary" | "Secondary"
      primary_addresses?: string[]
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
