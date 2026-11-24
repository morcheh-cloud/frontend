"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { tunnelsQuery } from "@/components/panel/problems"
import { api } from "@/lib/api"
import type {
  Tunnel,
  TunnelBody,
  TunnelsOutputBody,
  TunnelTestBody,
} from "@/lib/services"

// Every tunnel request lives under ["tunnels"]; the list also feeds the
// nav's red count (problems.ts).
export const tunnelKeys = {
  all: ["tunnels"] as const,
  list: tunnelsQuery.queryKey,
  one: (id: string) => ["tunnels", "one", id] as const,
  log: (id: string) => ["tunnels", "log", id] as const,
  servers: (id: string) => ["tunnels", "servers", id] as const,
}

// While one is opening, look again sooner.
const busy = (t: Pick<Tunnel, "status">) => t.status === "connecting"

export function useTunnels() {
  return useQuery({
    ...tunnelsQuery,
    refetchInterval: (q) => (q.state.data?.items.some(busy) ? 2_000 : 10_000),
  })
}

// One tunnel: from the list when it's there, else read on its own.
export function useTunnel(id: string | undefined) {
  const list = useTunnels()
  const listed = id ? list.data?.items.find((t) => t.id === id) : undefined
  const one = useQuery({
    queryKey: tunnelKeys.one(id ?? ""),
    queryFn: () => api.tunnels.getTunnel(id ?? ""),
    enabled: !!id && !!list.data && !listed,
    retry: false,
  })
  return {
    tunnel: listed ?? one.data,
    tools: list.data?.tools,
    pending:
      !!id && (list.isPending || (!listed && one.isPending && !one.isError)),
    error: listed ? null : (one.error ?? (list.data ? null : list.error)),
  }
}

export function useTunnelLog(id: string, enabled: boolean, fast: boolean) {
  return useQuery({
    queryKey: tunnelKeys.log(id),
    queryFn: () => api.tunnels.getTunnelLog(id),
    enabled,
    refetchInterval: fast ? 1_500 : 8_000,
  })
}

// Everything that goes through it: servers, databases, clusters, monitors,
// storages.
export function useTunnelUsers(id: string) {
  return useQuery({
    queryKey: tunnelKeys.servers(id),
    queryFn: () => api.tunnels.listTunnelUsers(id),
    refetchInterval: 15_000,
  })
}

// Writes put the answer in the list straight away.
function usePut() {
  const qc = useQueryClient()
  return (t: Tunnel) => {
    qc.setQueryData(tunnelKeys.list, (old: TunnelsOutputBody | undefined) =>
      old
        ? {
            ...old,
            items: old.items.some((x) => x.id === t.id)
              ? old.items.map((x) => (x.id === t.id ? t : x))
              : [...old.items, t],
          }
        : old,
    )
    qc.setQueryData(tunnelKeys.one(t.id), t)
    qc.invalidateQueries({ queryKey: tunnelKeys.all })
  }
}

export function useSaveTunnel() {
  const put = usePut()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: TunnelBody }) =>
      id ? api.tunnels.updateTunnel(id, body) : api.tunnels.createTunnel(body),
    onSuccess: put,
  })
}

export function useTestTunnel() {
  return useMutation({
    mutationFn: (body: TunnelTestBody) => api.tunnels.testTunnel(body),
  })
}

export function useConnectTunnel() {
  const put = usePut()
  return useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) =>
      on ? api.tunnels.connectTunnel(id) : api.tunnels.disconnectTunnel(id),
    onSuccess: put,
  })
}

export function useDeleteTunnel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.tunnels.deleteTunnel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: tunnelKeys.all }),
  })
}

// The workspace's servers, for jump host pickers and names.
export function useServerPicks() {
  return useQuery({
    queryKey: ["tunnels", "server-picks"] as const,
    queryFn: () => api.servers.listServers({ limit: 500 }),
    staleTime: 30_000,
  })
}
