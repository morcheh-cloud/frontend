"use client"

import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"

export const portKeys = {
  list: (serverId: string) => ["ports", serverId] as const,
}

// One SSH round trip that reads sockets, processes and containers. Fresh on
// every visit; afterwards only when the user asks (Refresh).
export function usePorts(serverId: string) {
  return useQuery({
    queryKey: portKeys.list(serverId),
    queryFn: () => api.network.listPorts(serverId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}
