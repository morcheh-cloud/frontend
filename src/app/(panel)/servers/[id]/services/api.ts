"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { type ApiError, api } from "@/lib/api"
import type {
  LogEntry,
  Service,
  ServiceActionBody,
  ServiceCreateBody,
  ServiceFileBody,
  ServicesOverview,
  StatsProblem,
} from "@/lib/services"

export const servicesKeys = {
  overview: (serverId: string) => ["services", serverId] as const,
  details: (serverId: string, unit: string) =>
    ["services", serverId, "unit", unit] as const,
  logs: (serverId: string, unit: string, q: LogQuery) =>
    ["services", serverId, "unit", unit, "logs", q] as const,
}

// Unit names may hold @ and \ (escaped paths): keep them one path segment.
const seg = (unit: string) => encodeURIComponent(unit)

// One SSH round trip: every service unit with its state, boot setting and
// usage.
export function useServices(serverId: string) {
  return useQuery({
    queryKey: servicesKeys.overview(serverId),
    queryFn: () => api.services.listServices(serverId),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
}

export function useServiceDetails(serverId: string, unit: string | null) {
  return useQuery({
    queryKey: servicesKeys.details(serverId, unit ?? ""),
    queryFn: () => api.services.getService(serverId, seg(unit ?? "")),
    enabled: unit !== null,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })
}

export type LogQuery = {
  lines: number
  priority: number
  since: "" | "15m" | "1h" | "24h" | "7d" | "boot"
}

export function useServiceLogs(
  serverId: string,
  unit: string,
  q: LogQuery,
  enabled: boolean,
) {
  return useQuery({
    queryKey: servicesKeys.logs(serverId, unit, q),
    queryFn: () => api.services.getServiceLogs(serverId, seg(unit), q),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    refetchOnWindowFocus: false,
  })
}

// Puts one service, as the server answered it, into the list.
function useStore(serverId: string) {
  const qc = useQueryClient()
  return (s: Service, unit = s.name) => {
    qc.setQueryData<ServicesOverview>(servicesKeys.overview(serverId), (o) => {
      if (!o) return o
      const found = o.services.some((x) => x.name === unit)
      const services = found
        ? o.services.map((x) => (x.name === unit ? s : x))
        : [...o.services, s].sort((a, b) => a.name.localeCompare(b.name))
      return { ...o, services }
    })
    qc.invalidateQueries({ queryKey: servicesKeys.details(serverId, unit) })
  }
}

export type Action = ServiceActionBody["action"]

export function useServiceAction(serverId: string) {
  const store = useStore(serverId)
  return useMutation<
    Service,
    ApiError,
    { unit: string; body: ServiceActionBody }
  >({
    mutationFn: ({ unit, body }) =>
      api.services.serviceAction(serverId, seg(unit), body),
    onSuccess: (s, { unit }) => store(s, unit),
  })
}

export type FileKind = "override" | "file"

export function useSaveUnitFile(serverId: string) {
  const store = useStore(serverId)
  return useMutation<
    Service,
    ApiError,
    { unit: string; kind: FileKind; body: ServiceFileBody }
  >({
    mutationFn: ({ unit, kind, body }) =>
      kind === "override"
        ? api.services.saveServiceOverride(serverId, seg(unit), body)
        : api.services.saveServiceFile(serverId, seg(unit), body),
    onSuccess: (s, { unit }) => store(s, unit),
  })
}

export function useCreateService(serverId: string) {
  const store = useStore(serverId)
  const qc = useQueryClient()
  return useMutation<Service, ApiError, ServiceCreateBody>({
    mutationFn: (body) => api.services.createService(serverId, body),
    onSuccess: (s) => store(s),
    // "Added, but it didn't start" still added it.
    onError: (e) => {
      if (e.status === 422 && e.message.startsWith("Added "))
        qc.invalidateQueries({ queryKey: servicesKeys.overview(serverId) })
    },
  })
}

export function useDeleteService(serverId: string) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, string>({
    mutationFn: (unit) => api.services.deleteService(serverId, seg(unit)),
    onSuccess: (_, unit) =>
      qc.setQueryData<ServicesOverview>(
        servicesKeys.overview(serverId),
        (o) =>
          o && { ...o, services: o.services.filter((s) => s.name !== unit) },
      ),
  })
}

export function useDaemonReload(serverId: string) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, void>({
    mutationFn: () => api.services.reloadServices(serverId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: servicesKeys.overview(serverId) }),
  })
}

// ---- Following the journal ----

// The stream isn't in the generated client (EventSource can't use it).
function streamUrl(serverId: string, unit: string, after: string, p: number) {
  const base = process.env.NEXT_PUBLIC_API_URL || window.location.origin
  const url = new URL(
    `/servers/${serverId}/services/${seg(unit)}/logs/stream`,
    base,
  )
  if (after) url.searchParams.set("after", after)
  if (p < 7) url.searchParams.set("priority", String(p))
  return url.toString()
}

const MAX_LIVE = 2000

// New journal entries for a unit while `enabled`, after `after` (the cursor
// of the last entry already shown). The browser reconnects a dropped stream;
// the backend resumes after the last cursor it sent.
export function useLogStream(
  serverId: string,
  unit: string,
  after: string,
  priority: number,
  enabled: boolean,
) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [problem, setProblem] = useState<StatsProblem | null>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    setEntries([])
    setProblem(null)
    setLive(false)
    if (!enabled) return
    let cursor = after
    let es: EventSource | null = null
    let closed = false
    const open = () => {
      es = new EventSource(streamUrl(serverId, unit, cursor, priority))
      es.onopen = () => setLive(true)
      es.addEventListener("entry", (ev) => {
        const e = JSON.parse((ev as MessageEvent).data) as LogEntry
        cursor = e.cursor || cursor
        setEntries((prev) => {
          const next = [...prev, e]
          return next.length > MAX_LIVE ? next.slice(-MAX_LIVE) : next
        })
      })
      es.addEventListener("problem", (ev) => {
        // Final: the backend ends the stream after it.
        closed = true
        setProblem(JSON.parse((ev as MessageEvent).data) as StatsProblem)
        setLive(false)
        es?.close()
      })
      // EventSource retries with the URL it was made with: reopen with the
      // latest cursor instead, so nothing repeats.
      es.onerror = () => {
        setLive(false)
        es?.close()
        if (!closed) window.setTimeout(() => !closed && open(), 2000)
      }
    }
    open()
    return () => {
      closed = true
      es?.close()
    }
  }, [serverId, unit, after, priority, enabled])

  return { entries, problem, live }
}
