"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { type ApiError, api } from "@/lib/api"
import type {
  ClockBody,
  DnsBody,
  HostnameBody,
  HostsBody,
  MirrorBody,
  NetworkBody,
  RepoAddBody,
  RepoRemoveBody,
  RepoToggleBody,
} from "@/lib/services"

export type ConfigArea = "hosts" | "dns" | "clock" | "network" | "repos"

// Every config read sits under ["server-config", id], so a change anywhere
// refreshes what it touched (a hostname also lands in /etc/hosts).
export const configKeys = {
  all: (id: string) => ["server-config", id] as const,
  hosts: (id: string) => ["server-config", id, "hosts"] as const,
  dns: (id: string) => ["server-config", id, "dns"] as const,
  clock: (id: string) => ["server-config", id, "clock"] as const,
  network: (id: string) => ["server-config", id, "network"] as const,
  repos: (id: string) => ["server-config", id, "repos"] as const,
  history: (id: string, area: ConfigArea) =>
    ["server-config", id, "history", area] as const,
}

const read = { staleTime: 15_000, refetchOnWindowFocus: false }

export function useHosts(id: string) {
  return useQuery({
    queryKey: configKeys.hosts(id),
    queryFn: () => api.serverConfig.getServerHosts(id),
    ...read,
  })
}

export function useDns(id: string) {
  return useQuery({
    queryKey: configKeys.dns(id),
    queryFn: () => api.serverConfig.getServerDns(id),
    ...read,
  })
}

export function useClock(id: string) {
  return useQuery({
    queryKey: configKeys.clock(id),
    queryFn: () => api.serverConfig.getServerClock(id),
    ...read,
  })
}

// Polled while a change waits for Keep it, so the countdown ends with the
// server's own answer.
export function useNetwork(id: string) {
  return useQuery({
    queryKey: configKeys.network(id),
    queryFn: () => api.serverConfig.getServerNetwork(id),
    ...read,
    refetchInterval: (q) => (q.state.data?.pending ? 5_000 : false),
  })
}

export function useRepos(id: string) {
  return useQuery({
    queryKey: configKeys.repos(id),
    queryFn: () => api.serverConfig.getServerRepositories(id),
    ...read,
  })
}

export function useConfigHistory(id: string, area: ConfigArea, on: boolean) {
  return useQuery({
    queryKey: configKeys.history(id, area),
    queryFn: () => api.serverConfig.listConfigChanges(id, { area }),
    enabled: on,
  })
}

export function useConfigChange(id: string, change: string | null) {
  return useQuery({
    queryKey: ["server-config", id, "change", change],
    queryFn: () => api.serverConfig.getConfigChange(id, change ?? ""),
    enabled: !!change,
  })
}

export type ConfigWrite =
  | { kind: "hosts"; body: HostsBody }
  | { kind: "dns"; body: DnsBody }
  | { kind: "hostname"; body: HostnameBody }
  | { kind: "clock"; body: ClockBody }
  | { kind: "sync-clock" }
  | { kind: "network"; body: NetworkBody }
  | { kind: "repo-toggle"; body: RepoToggleBody }
  | { kind: "repo-add"; body: RepoAddBody }
  | { kind: "repo-remove"; body: RepoRemoveBody }
  | { kind: "mirror"; body: MirrorBody }
  | { kind: "restore"; change: string }
  | { kind: "keep" | "undo"; area: ConfigArea }

function send(id: string, w: ConfigWrite): Promise<unknown> {
  const c = api.serverConfig
  switch (w.kind) {
    case "hosts":
      return c.updateServerHosts(id, w.body)
    case "dns":
      return c.updateServerDns(id, w.body)
    case "hostname":
      return c.updateServerHostname(id, w.body)
    case "clock":
      return c.updateServerClock(id, w.body)
    case "sync-clock":
      return c.syncServerClock(id)
    case "network":
      return c.updateServerNetwork(id, w.body)
    case "repo-toggle":
      return c.updateServerRepository(id, w.body)
    case "repo-add":
      return c.addServerRepository(id, w.body)
    case "repo-remove":
      return c.deleteServerRepository(id, w.body)
    case "mirror":
      return c.setServerMirror(id, w.body)
    case "restore":
      return c.restoreConfigChange(id, w.change)
    case "keep":
      return c.keepConfigChange(id, w.area)
    case "undo":
      return c.undoConfigChange(id, w.area)
  }
}

// One mutation for every write. Each answers fresh state, but several
// reads overlap, so everything under the server's config key reloads.
// A 409 (changed on the server) reloads too, so the next try is fresh.
export function useConfigWrite(id: string) {
  const qc = useQueryClient()
  return useMutation<unknown, ApiError, ConfigWrite>({
    mutationFn: (w) => send(id, w),
    onSettled: () => qc.invalidateQueries({ queryKey: configKeys.all(id) }),
    onError: (e) => {
      if (e.status === 409) toast.error(e.message)
    },
  })
}

export function useResolveName(id: string) {
  return useMutation({
    mutationFn: (b: { name: string; server?: string }) =>
      api.serverConfig.resolveServerName(id, b),
  })
}

export function useTestMirror(id: string) {
  return useMutation({
    mutationFn: (url: string) => api.serverConfig.testServerMirror(id, { url }),
  })
}

export function usePreviewNetwork(id: string) {
  return useMutation({
    mutationFn: (b: NetworkBody) =>
      api.serverConfig.previewServerNetwork(id, b),
  })
}
