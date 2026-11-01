"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { type ApiError, api } from "@/lib/api"
import type {
  GroupCreateBody,
  GroupUpdateBody,
  UserCreateBody,
  UserPasswordBody,
  UsersOverview,
  UserUpdateBody,
} from "@/lib/services"

export const usersKeys = {
  overview: (serverId: string) => ["users", serverId] as const,
}

// One SSH round trip: every account with its password state, groups, sudo
// and last login, every group, the sudoers rules and who is logged in.
export function useUsers(serverId: string) {
  return useQuery({
    queryKey: usersKeys.overview(serverId),
    queryFn: () => api.users.getUsers(serverId),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
}

export type Change =
  | { kind: "create-user"; body: UserCreateBody }
  | { kind: "update-user"; user: string; body: UserUpdateBody }
  | {
      kind: "delete-user"
      user: string
      removeHome: boolean
      force: boolean
    }
  | { kind: "password"; user: string; body: UserPasswordBody }
  | { kind: "lock"; user: string; locked: boolean; logout?: boolean }
  | { kind: "logout"; user: string }
  | { kind: "create-group"; body: GroupCreateBody }
  | { kind: "update-group"; group: string; body: GroupUpdateBody }
  | { kind: "delete-group"; group: string }

// Every change answers the overview as it is after it, so the page shows
// what the server really did.
export function useChange(serverId: string) {
  const qc = useQueryClient()
  return useMutation<UsersOverview, ApiError, Change>({
    mutationFn: (c) => {
      switch (c.kind) {
        case "create-user":
          return api.users.createUser(serverId, c.body)
        case "update-user":
          return api.users.updateUser(serverId, c.user, c.body)
        case "delete-user":
          return api.users.deleteUser(serverId, c.user, {
            remove_home: c.removeHome,
            force: c.force,
          })
        case "password":
          return api.users.setUserPassword(serverId, c.user, c.body)
        case "lock":
          return api.users.lockUser(serverId, c.user, {
            locked: c.locked,
            logout: c.logout,
          })
        case "logout":
          return api.users.logoutUser(serverId, c.user)
        case "create-group":
          return api.users.createGroup(serverId, c.body)
        case "update-group":
          return api.users.updateGroup(serverId, c.group, c.body)
        case "delete-group":
          return api.users.deleteGroup(serverId, c.group)
      }
    },
    onSuccess: (o) => qc.setQueryData(usersKeys.overview(serverId), o),
  })
}
