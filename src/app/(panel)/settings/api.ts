"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { accessKey } from "@/components/auth/keys"
import { workspacesKey } from "@/components/panel/workspace"
import { api, apiFetch } from "@/lib/api"
import type {
  PanelApproveBody,
  PanelGroupBody,
  PanelSettings,
  PanelUser,
  PanelUserCreateBody,
  PanelUserUpdateBody,
  PanelWorkspace,
  WorkspaceAssignBody,
  WorkspaceBody,
} from "@/lib/services"

export const failed = (err: Error) => toast.error(err.message)

const adminKeys = {
  users: ["admin", "users"] as const,
  groups: ["admin", "groups"] as const,
  settings: ["admin", "settings"] as const,
}

function useRefreshUsers() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.users })
    queryClient.invalidateQueries({ queryKey: adminKeys.groups })
    queryClient.invalidateQueries({ queryKey: ["grants"] })
    queryClient.invalidateQueries({ queryKey: ["principals"] })
  }
}

export function useMembers(
  filter: { status?: PanelUser["status"]; q?: string } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: [...adminKeys.users, filter],
    queryFn: () => api.admin.adminListUsers(filter),
    placeholderData: (previous) => previous,
    enabled,
  })
}

export function useCreateMember() {
  const refresh = useRefreshUsers()
  return useMutation({
    mutationFn: (body: PanelUserCreateBody) => api.admin.adminCreateUser(body),
    onSuccess: refresh,
  })
}

export function useUpdateMember() {
  const refresh = useRefreshUsers()
  return useMutation({
    mutationFn: ({ id, ...body }: PanelUserUpdateBody & { id: string }) =>
      api.admin.adminUpdateUser(id, body),
    onSuccess: refresh,
  })
}

export function useApproveMember() {
  const refresh = useRefreshUsers()
  return useMutation({
    mutationFn: ({ id, ...body }: PanelApproveBody & { id: string }) =>
      api.admin.adminApproveUser(id, body),
    onSuccess: refresh,
  })
}

export function useSetMemberPassword() {
  const refresh = useRefreshUsers()
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.admin.adminSetPassword(id, { password }),
    onSuccess: refresh,
  })
}

// The one-click member actions, all answered by a refreshed list.
export function useMemberAction() {
  const refresh = useRefreshUsers()
  return useMutation({
    mutationFn: async ({
      action,
      id,
    }: {
      action: "reject" | "block" | "unblock" | "delete" | "revoke"
      id: string
    }) => {
      if (action === "reject") await api.admin.adminRejectUser(id)
      if (action === "block") await api.admin.adminBlockUser(id)
      if (action === "unblock") await api.admin.adminUnblockUser(id)
      if (action === "delete") await api.admin.adminDeleteUser(id)
      if (action === "revoke") await api.admin.adminRevokeSessions(id)
    },
    onSuccess: refresh,
  })
}

export function useGroups() {
  return useQuery({
    queryKey: adminKeys.groups,
    queryFn: () => api.admin.adminListGroups(),
    select: (data) => data.items,
  })
}

export function useSaveGroup() {
  const refresh = useRefreshUsers()
  return useMutation({
    mutationFn: ({ id, ...body }: PanelGroupBody & { id?: string }) =>
      id
        ? api.admin.adminUpdateGroup(id, body)
        : api.admin.adminCreateGroup(body),
    onSuccess: refresh,
  })
}

export function useDeleteGroup() {
  const refresh = useRefreshUsers()
  return useMutation({
    mutationFn: (id: string) => api.admin.adminDeleteGroup(id),
    onSuccess: refresh,
  })
}

export function useSetGroupMembers() {
  const refresh = useRefreshUsers()
  return useMutation({
    mutationFn: ({ id, user_ids }: { id: string; user_ids: string[] }) =>
      api.admin.adminSetGroupMembers(id, { user_ids }),
    onSuccess: refresh,
  })
}

export function useSettings() {
  return useQuery({
    queryKey: adminKeys.settings,
    queryFn: () => api.admin.adminGetSettings(),
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PanelSettings) => api.admin.adminUpdateSettings(body),
    onSuccess: (data) => queryClient.setQueryData(adminKeys.settings, data),
  })
}

function useRefreshWorkspaces() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: workspacesKey })
    queryClient.invalidateQueries({ queryKey: accessKey })
    queryClient.invalidateQueries({ queryKey: ["grants"] })
    queryClient.invalidateQueries({ queryKey: ["servers"] })
    queryClient.invalidateQueries({ queryKey: ["storages"] })
    queryClient.invalidateQueries({ queryKey: ["apps"] })
  }
}

export function useSaveWorkspace() {
  const refresh = useRefreshWorkspaces()
  return useMutation({
    mutationFn: ({ id, ...body }: WorkspaceBody & { id?: string }) =>
      id
        ? api.workspaces.updateWorkspace(id, body)
        : api.workspaces.createWorkspace(body),
    onSuccess: refresh,
  })
}

// The image goes up as raw bytes; the generated client would send JSON.
export function useUploadWorkspaceLogo() {
  const refresh = useRefreshWorkspaces()
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      apiFetch<PanelWorkspace>(`/workspaces/${id}/logo`, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: file,
      }),
    onSuccess: refresh,
  })
}

export function useDeleteWorkspace() {
  const refresh = useRefreshWorkspaces()
  return useMutation({
    mutationFn: (id: string) => api.workspaces.deleteWorkspace(id),
    onSuccess: refresh,
  })
}

export function useAssignWorkspace() {
  const refresh = useRefreshWorkspaces()
  return useMutation({
    mutationFn: ({ id, ...body }: WorkspaceAssignBody & { id: string }) =>
      api.workspaces.assignWorkspace(id, body),
    onSuccess: refresh,
  })
}
