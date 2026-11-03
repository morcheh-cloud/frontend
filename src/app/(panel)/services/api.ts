"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"

// Usernames come with the list (Operator and up); passwords never do.
export const appKeys = {
  all: ["apps"] as const,
}

export function useApps() {
  return useQuery({
    queryKey: appKeys.all,
    queryFn: () => api.apps.listApps(),
  })
}

export function useRefetchApps() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: appKeys.all })
}
