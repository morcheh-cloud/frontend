"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { accessKey } from "@/components/auth/keys"
import { workspacesKey } from "@/components/panel/workspace"
import { api } from "@/lib/api"
import type { GrantBody } from "@/lib/services"

export type GrantScope = {
  workspace_id?: string
  server_id?: string
  storage_id?: string
  app_id?: string
}
export type GrantPrincipal = { user_id?: string; group_id?: string }

const grantsKey = ["grants"] as const

// With no filter it answers every grant, which only an admin may ask for.
export function useGrants(filter: GrantScope & GrantPrincipal, enabled = true) {
  return useQuery({
    queryKey: [...grantsKey, filter],
    queryFn: () => api.workspaces.listGrants(filter),
    select: (data) => data.items,
    enabled,
    retry: false,
  })
}

export function usePrincipals(enabled = true) {
  return useQuery({
    queryKey: ["principals"],
    queryFn: () => api.workspaces.listPrincipals(),
    enabled,
  })
}

export function useWorkspaceDetail(id: string | undefined) {
  return useQuery({
    queryKey: [...workspacesKey, id],
    queryFn: () => api.workspaces.getWorkspace(id as string),
    enabled: !!id,
  })
}

function useRefreshAccess() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: grantsKey }),
      queryClient.invalidateQueries({ queryKey: accessKey }),
      queryClient.invalidateQueries({ queryKey: workspacesKey }),
    ])
}

export function useSetGrant() {
  const refresh = useRefreshAccess()
  return useMutation({
    mutationFn: (body: GrantBody) => api.workspaces.setGrant(body),
    onSuccess: refresh,
  })
}

export function useDeleteGrant() {
  const refresh = useRefreshAccess()
  return useMutation({
    mutationFn: (id: string) => api.workspaces.deleteGrant(id),
    onSuccess: refresh,
  })
}

export type GrantOp = { key: string; set?: GrantBody; removeId?: string }
export type GrantFailure = { key: string; message: string }

// One request per change, in order. A refused one doesn't stop the rest: it
// comes back in the list, and the fresh grants are in before this resolves.
export function useSaveGrants() {
  const refresh = useRefreshAccess()
  return useMutation({
    mutationFn: async (ops: GrantOp[]) => {
      const failures: GrantFailure[] = []
      for (const op of ops) {
        try {
          if (op.set) await api.workspaces.setGrant(op.set)
          else if (op.removeId) await api.workspaces.deleteGrant(op.removeId)
        } catch (err) {
          failures.push({ key: op.key, message: (err as Error).message })
        }
      }
      await refresh()
      return failures
    },
  })
}
