"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { ApiTokenCreateBody } from "@/lib/services"

// Personal API tokens: your own (Account) and, for an admin, a member's.
// Everything sits under one root, so any change refreshes it all. The token
// itself is answered once by create and never goes into the cache.
export const tokenKeys = {
  all: ["api-tokens"] as const,
  mine: ["api-tokens", "me"] as const,
  user: (id: string) => ["api-tokens", "user", id] as const,
}

function useRefresh() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: tokenKeys.all })
}

export function useMyTokens(enabled = true) {
  return useQuery({
    queryKey: tokenKeys.mine,
    queryFn: () => api.auth.listApiTokens(),
    select: (d) => d.items,
    enabled,
    // Last used moves while the token is in use somewhere.
    refetchInterval: 60_000,
  })
}

export function useCreateToken() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (body: ApiTokenCreateBody) => api.auth.createApiToken(body),
    onSuccess: refresh,
  })
}

export function useRevokeToken() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: string) => api.auth.deleteApiToken(id),
    onSuccess: refresh,
  })
}

// ---- a member's tokens (system admin) ----

export function useUserTokens(id: string, enabled = true) {
  return useQuery({
    queryKey: tokenKeys.user(id),
    queryFn: () => api.admin.adminListUserTokens(id),
    select: (d) => d.items,
    enabled,
  })
}

export function useAdminRevokeToken() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: string) => api.admin.adminDeleteApiToken(id),
    onSuccess: refresh,
  })
}
