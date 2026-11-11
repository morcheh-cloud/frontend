"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { SecuritySettings, SecuritySettingsBody } from "@/lib/services"

export type SignInQuery = NonNullable<
  Parameters<typeof api.auditLog.listSignIns>[0]
>

// Everything here sits under one root, so any change refreshes it all.
export const sessionKeys = {
  all: ["sign-in-security"] as const,
  mine: ["sign-in-security", "sessions", "me"] as const,
  user: (id: string) => ["sign-in-security", "sessions", id] as const,
  alerts: ["sign-in-security", "alerts"] as const,
  signIns: (q: Omit<SignInQuery, "before">) =>
    ["sign-in-security", "sign-ins", q] as const,
  settings: ["sign-in-security", "settings"] as const,
}

function useRefresh() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: sessionKeys.all })
}

// ---- your own sessions ----

export function useMySessions() {
  return useQuery({
    queryKey: sessionKeys.mine,
    queryFn: () => api.auth.listMySessions(),
    select: (d) => d.items,
    refetchInterval: 60_000,
  })
}

export function useEndMySession() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (id: string) => api.auth.endMySession(id),
    onSuccess: refresh,
  })
}

export function useEndOtherSessions() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: () => api.auth.endMyOtherSessions(),
    onSuccess: refresh,
  })
}

// ---- a member's sessions (admin) ----

export function useUserSessions(id: string, enabled = true) {
  return useQuery({
    queryKey: sessionKeys.user(id),
    queryFn: () => api.admin.adminListUserSessions(id),
    select: (d) => d.items,
    enabled,
  })
}

export function useEndUserSession() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ user, session }: { user: string; session: string }) =>
      api.admin.adminEndUserSession(user, session),
    onSuccess: refresh,
  })
}

// ---- the sign-in log ----

export function useSignIns(q: Omit<SignInQuery, "before">) {
  return useInfiniteQuery({
    queryKey: sessionKeys.signIns(q),
    queryFn: ({ pageParam, signal }) =>
      api.auditLog.listSignIns({ ...q, before: pageParam }, { signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next || undefined,
    placeholderData: (previous) => previous,
    refetchInterval: 30_000,
  })
}

// ---- new-address alerts ----

export function useSignInAlerts() {
  return useQuery({
    queryKey: sessionKeys.alerts,
    queryFn: () => api.auth.listSignInAlerts(),
    select: (d) => d.items,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useAnswerSignInAlert() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: "me" | "not_me" }) =>
      api.auth.answerSignInAlert(id, { answer }),
    onSuccess: refresh,
  })
}

// ---- panel security settings (admin) ----

export function useSecuritySettings() {
  return useQuery({
    queryKey: sessionKeys.settings,
    queryFn: () => api.admin.adminGetSecurity(),
  })
}

export function useUpdateSecurity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SecuritySettingsBody) =>
      api.admin.adminUpdateSecurity(body),
    onSuccess: (saved: SecuritySettings) =>
      queryClient.setQueryData(sessionKeys.settings, saved),
  })
}
