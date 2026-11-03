"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { api } from "@/lib/api"

const key = ["network-map"] as const

// The backend keeps the last scan: opening the page shows it at once (or runs
// the first one). A new scan only happens when the user asks (useRescan).
export function useNetworkMap() {
  return useQuery({
    queryKey: key,
    queryFn: () => api.network.getNetworkMap(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useRescan() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => api.network.getNetworkMap({ refresh: true }),
    onSuccess: (map) => client.setQueryData(key, map),
    onError: (err) => toast.error(err.message),
  })
}
