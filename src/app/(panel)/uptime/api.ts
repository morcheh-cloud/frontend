"use client"

import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { monitorsQuery, STATUS_POLL } from "@/components/panel/problems"
import { useWorkspace } from "@/components/panel/workspace"
import { ApiError, api } from "@/lib/api"
import type {
  MonitorBody,
  MonitorTestBody,
  UptimeMonitor,
} from "@/lib/services"

// Uptime monitors: checks Morche (or a server) runs on a schedule.

export type ReportRange = "24h" | "7d" | "30d" | "90d" | "365d"
export type CheckStatus = "up" | "degraded" | "down"

export const monitorKeys = {
  all: ["monitors"] as const,
  list: (ws: string) => ["monitors", "list", ws] as const,
  server: (id: string) => ["monitors", "server", id] as const,
  detail: (id: string) => ["monitors", "detail", id] as const,
  report: (id: string, range: ReportRange) =>
    ["monitors", "report", id, range] as const,
  checks: (id: string, status: string) =>
    ["monitors", "checks", id, status] as const,
  events: (id: string) => ["monitors", "events", id] as const,
  incidents: (id: string) => ["monitors", "incidents", id] as const,
  allIncidents: (ws: string, open: boolean) =>
    ["monitors", "all-incidents", ws, open] as const,
}

const retryUnlessGone = (count: number, error: Error) =>
  !(error instanceof ApiError && [403, 404].includes(error.status)) && count < 2

// Every monitor of the selected workspace (same cache as the menu's count).
export function useMonitors() {
  const { workspace } = useWorkspace()
  return useQuery(monitorsQuery(workspace?.id ?? ""))
}

// Monitors tied to one server (its Uptime tab).
export function useServerMonitors(serverId: string) {
  return useQuery({
    queryKey: monitorKeys.server(serverId),
    queryFn: () => api.uptime.listMonitors({ server_id: serverId }),
    select: (d) => d.items,
    refetchInterval: STATUS_POLL,
  })
}

export function useMonitor(id: string | undefined, { poll = true } = {}) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: monitorKeys.detail(id ?? ""),
    queryFn: () => api.uptime.getMonitor(id ?? ""),
    enabled: !!id,
    retry: retryUnlessGone,
    // The editor keeps its own draft; a save elsewhere answers 409.
    refetchOnWindowFocus: poll,
    refetchInterval: poll ? STATUS_POLL : false,
    placeholderData: () => {
      for (const [, items] of qc.getQueriesData<{ items: UptimeMonitor[] }>({
        queryKey: ["monitors", "list"],
      })) {
        const hit = items?.items.find((m) => m.id === id)
        if (hit) return hit
      }
    },
  })
}

export function useMonitorReport(id: string, range: ReportRange) {
  return useQuery({
    queryKey: monitorKeys.report(id, range),
    queryFn: () => api.uptime.getMonitorReport(id, { range }),
    placeholderData: keepPreviousData,
    refetchInterval: range === "24h" ? 30_000 : 120_000,
  })
}

export function useMonitorChecks(id: string, status: CheckStatus | "") {
  return useQuery({
    queryKey: monitorKeys.checks(id, status),
    queryFn: () => api.uptime.listMonitorChecks(id, { limit: 100, status }),
    select: (d) => d.items,
    placeholderData: keepPreviousData,
    refetchInterval: STATUS_POLL,
  })
}

export function useMonitorEvents(id: string) {
  return useQuery({
    queryKey: monitorKeys.events(id),
    queryFn: () => api.uptime.listMonitorEvents(id, { limit: 50 }),
    select: (d) => d.items,
    refetchInterval: STATUS_POLL,
  })
}

export function useMonitorIncidents(id: string) {
  return useQuery({
    queryKey: monitorKeys.incidents(id),
    queryFn: () => api.uptime.listMonitorIncidents(id, { limit: 50 }),
    select: (d) => d.items,
    refetchInterval: STATUS_POLL,
  })
}

// Incidents across the workspace (the Incidents tab).
export function useIncidents(open: boolean) {
  const { workspace } = useWorkspace()
  const ws = workspace?.id ?? ""
  return useQuery({
    queryKey: monitorKeys.allIncidents(ws, open),
    queryFn: () => api.uptime.listIncidents({ limit: 200, open }),
    select: (d) => d.items,
    enabled: !!ws,
    refetchInterval: STATUS_POLL,
    placeholderData: keepPreviousData,
  })
}

// Puts a saved monitor in the detail and list caches.
function putMonitor(qc: QueryClient, m: UptimeMonitor) {
  qc.setQueryData(monitorKeys.detail(m.id), m)
  qc.setQueryData<{ items: UptimeMonitor[] }>(
    monitorKeys.list(m.workspace_id),
    (d) =>
      d
        ? {
            ...d,
            items: d.items.some((x) => x.id === m.id)
              ? d.items.map((x) => (x.id === m.id ? m : x))
              : [...d.items, m],
          }
        : d,
  )
}

// After anything that changes results: lists, reports and histories.
const refresh = (qc: QueryClient) =>
  qc.invalidateQueries({ queryKey: monitorKeys.all })

export function useCreateMonitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: MonitorBody) => api.uptime.createMonitor(body),
    onSuccess: (m) => {
      putMonitor(qc, m)
      refresh(qc)
    },
  })
}

export function useUpdateMonitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MonitorBody }) =>
      api.uptime.updateMonitor(id, body),
    onSuccess: (m) => {
      putMonitor(qc, m)
      refresh(qc)
    },
  })
}

export function useDeleteMonitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (m: Pick<UptimeMonitor, "id" | "workspace_id">) =>
      api.uptime.deleteMonitor(m.id),
    onSuccess: (_, m) => {
      qc.setQueryData<{ items: UptimeMonitor[] }>(
        monitorKeys.list(m.workspace_id),
        (d) => d && { ...d, items: d.items.filter((x) => x.id !== m.id) },
      )
      qc.removeQueries({ queryKey: monitorKeys.detail(m.id) })
      refresh(qc)
    },
  })
}

export function useCheckMonitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.uptime.checkMonitor(id),
    onSuccess: (out) => {
      putMonitor(qc, out.monitor)
      refresh(qc)
    },
  })
}

export function usePauseMonitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) =>
      api.uptime.pauseMonitor(id, { paused }),
    onSuccess: (m) => {
      putMonitor(qc, m)
      refresh(qc)
    },
  })
}

export function useAcknowledge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      api.uptime.acknowledgeMonitorIncident(id, { note }),
    onSuccess: () => refresh(qc),
  })
}

// Runs the draft once without saving it.
export function useTestMonitor() {
  return useMutation({
    mutationFn: (body: MonitorTestBody) => api.uptime.testMonitorSettings(body),
  })
}
