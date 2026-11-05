"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { isActive, useJobList } from "@/components/jobs/api"
import { type ApiError, api } from "@/lib/api"
import type { FirewallApplyBody, FirewallOverview } from "@/lib/services"

export const firewallKeys = {
  all: (serverId: string) => ["firewall", serverId] as const,
  overview: (serverId: string) => ["firewall", serverId, "overview"] as const,
  log: (serverId: string) => ["firewall", serverId, "log"] as const,
  raw: (serverId: string) => ["firewall", serverId, "raw"] as const,
  history: (serverId: string) => ["firewall", serverId, "history"] as const,
}

// One SSH round trip. Polled only while a change is waiting, so everyone
// looking at this server sees it end.
export function useFirewall(serverId: string) {
  return useQuery({
    queryKey: firewallKeys.overview(serverId),
    queryFn: () => api.firewall.getFirewall(serverId),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchInterval: (q) => (q.state.data?.pending ? 10_000 : false),
  })
}

export function useFirewallLog(serverId: string, enabled: boolean) {
  return useQuery({
    queryKey: firewallKeys.log(serverId),
    queryFn: () => api.firewall.firewallLog(serverId, { lines: 5000 }),
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
}

export function useFirewallRaw(serverId: string, enabled: boolean) {
  return useQuery({
    queryKey: firewallKeys.raw(serverId),
    queryFn: () => api.firewall.firewallRaw(serverId),
    enabled,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })
}

// Read from Morcheh's own database, so it's always cheap to ask again.
export function useFirewallHistory(serverId: string, enabled: boolean) {
  return useQuery({
    queryKey: firewallKeys.history(serverId),
    queryFn: () => api.firewall.firewallHistory(serverId),
    enabled,
    refetchOnWindowFocus: false,
  })
}

// Compares with the server as it is now, so it's never kept.
export function useFirewallPreview(
  serverId: string,
  change: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...firewallKeys.history(serverId), change],
    queryFn: () => api.firewall.firewallChange(serverId, change ?? ""),
    enabled: enabled && Boolean(change),
    gcTime: 0,
    refetchOnWindowFocus: false,
  })
}

export function useApplyFirewallRules() {
  return useMutation({
    mutationFn: (body: FirewallApplyBody) =>
      api.firewall.applyFirewallRules(body),
  })
}

// Every write answers with the fresh overview, so it goes straight into the
// cache. A refused one may still mean the server moved on: read it again.
export function useFirewallChange(serverId: string) {
  const qc = useQueryClient()
  return useMutation<
    FirewallOverview,
    ApiError,
    () => Promise<FirewallOverview>
  >({
    mutationFn: (run) => run(),
    onSuccess: (o) => {
      qc.setQueryData(firewallKeys.overview(serverId), o)
      qc.invalidateQueries({ queryKey: firewallKeys.history(serverId) })
    },
    onError: () =>
      qc.invalidateQueries({ queryKey: firewallKeys.overview(serverId) }),
  })
}

export function useInstallFirewall(serverId: string) {
  return useMutation({
    mutationFn: () => api.firewall.installFirewall(serverId),
  })
}

export function useInstallJob(serverId: string) {
  const { data } = useJobList()
  return data?.find(
    (j) =>
      isActive(j) && j.refs.includes(serverId) && j.kind === "firewall-install",
  )
}
