"use client"

import {
  type QueryClient,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { cloudAccountsQuery } from "@/components/panel/problems"
import { api } from "@/lib/api"
import type {
  CloudAccount,
  CloudAccountBody,
  CloudResourcesOutputBody,
  CloudServer,
  CloudServersOutputBody,
  CloudTestBody,
} from "@/lib/services"

// Accounts and the servers read through them share the ["cloud"] root, so a
// change to an account refreshes its servers too.
export const cloudKeys = {
  all: ["cloud"] as const,
  accounts: cloudAccountsQuery.queryKey,
  servers: ["cloud", "servers"] as const,
  account: (id: string) => ["cloud", "account", id] as const,
  resources: (id: string) => ["cloud", "resources", id] as const,
}

// The backend keeps a read for 20 s; while a server is busy (starting,
// stopping, a provider task) look again sooner.
const SERVER_POLL = 30_000
const BUSY_POLL = 5_000

export const serverBusy = (s: Pick<CloudServer, "task" | "state">) =>
  !!s.task || s.state === "building" || s.state === "deleting"

export function useCloudAccounts() {
  return useQuery(cloudAccountsQuery)
}

export function useCloudServers(enabled = true) {
  return useQuery({
    queryKey: cloudKeys.servers,
    queryFn: () => api.cloud.listCloudServers(),
    enabled,
    refetchInterval: (q) =>
      q.state.data?.items.some(serverBusy) ? BUSY_POLL : SERVER_POLL,
  })
}

// One account: from the workspace's list when it's there (kept fresh by its
// poll and every change), else read on its own (a link from elsewhere).
export function useCloudAccount(id: string) {
  const list = useCloudAccounts()
  const listed = list.data?.items.find((a) => a.id === id)
  const one = useQuery({
    queryKey: cloudKeys.account(id),
    queryFn: () => api.cloud.getCloudAccount(id),
    enabled: !!list.data && !listed,
    retry: false,
  })
  return {
    account: listed ?? one.data,
    pending: list.isPending || (!listed && one.isPending && !one.isError),
    error: listed ? null : (one.error ?? (list.data ? null : list.error)),
    refetch: () => (listed ? list.refetch() : one.refetch()),
  }
}

// What else the account has: firewalls, private networks, disks and backup
// schedules. The backend keeps a read for a minute.
export function useCloudResources(id: string, enabled = true) {
  return useQuery({
    queryKey: cloudKeys.resources(id),
    queryFn: () => api.cloud.getCloudAccountResources(id),
    enabled,
    refetchInterval: 60_000,
  })
}

// Reads one account's servers and resources again from the provider now.
export function useRefreshAccount(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      Promise.all([
        api.cloud.listCloudServers({ fresh: true }),
        api.cloud.getCloudAccountResources(id, { fresh: true }),
      ]),
    onSuccess: ([servers, resources]) => {
      queryClient.setQueryData(cloudKeys.servers, servers)
      queryClient.setQueryData<CloudResourcesOutputBody>(
        cloudKeys.resources(id),
        resources,
      )
      queryClient.invalidateQueries({ queryKey: cloudKeys.accounts })
    },
  })
}

// A server identified the way the provider's API addresses it.
export type ServerRef = Pick<CloudServer, "account_id" | "region" | "id">

export const serverKey = (s: ServerRef) => `${s.account_id}/${s.region}/${s.id}`

// An account the API answered goes straight into the list.
function storeAccount(queryClient: QueryClient, a: CloudAccount) {
  queryClient.setQueryData<{ items: CloudAccount[] }>(
    cloudKeys.accounts,
    (data) =>
      data && {
        ...data,
        items: data.items.some((x) => x.id === a.id)
          ? data.items.map((x) => (x.id === a.id ? a : x))
          : [...data.items, a],
      },
  )
}

// A server the provider answered after a change replaces its row.
function storeServer(queryClient: QueryClient, s: CloudServer) {
  queryClient.setQueryData<CloudServersOutputBody>(
    cloudKeys.servers,
    (data) =>
      data && {
        ...data,
        items: data.items.map((x) => (serverKey(x) === serverKey(s) ? s : x)),
      },
  )
}

export function useCreateCloudAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CloudAccountBody) => api.cloud.createCloudAccount(body),
    onSuccess: (a) => {
      storeAccount(queryClient, a)
      queryClient.invalidateQueries({ queryKey: cloudKeys.all })
    },
  })
}

export function useUpdateCloudAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CloudAccountBody }) =>
      api.cloud.updateCloudAccount(id, body),
    onSuccess: (a) => {
      storeAccount(queryClient, a)
      queryClient.invalidateQueries({ queryKey: cloudKeys.servers })
    },
  })
}

export function useDeleteCloudAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.cloud.deleteCloudAccount(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<{ items: CloudAccount[] }>(
        cloudKeys.accounts,
        (data) =>
          data && { ...data, items: data.items.filter((a) => a.id !== id) },
      )
      queryClient.setQueryData<CloudServersOutputBody>(
        cloudKeys.servers,
        (data) =>
          data && {
            ...data,
            accounts: data.accounts.filter((a) => a.id !== id),
            items: data.items.filter((s) => s.account_id !== id),
          },
      )
      queryClient.invalidateQueries({ queryKey: cloudKeys.all })
    },
  })
}

export function useTestCloudAccount() {
  return useMutation({
    mutationFn: (body: CloudTestBody) => api.cloud.testCloudAccount(body),
  })
}

export function useCheckCloudAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ["cloud", "check"],
    mutationFn: (id: string) => api.cloud.checkCloudAccount(id),
    onSuccess: (a) => {
      storeAccount(queryClient, a)
      queryClient.invalidateQueries({ queryKey: cloudKeys.servers })
    },
  })
}

// Accounts being checked right now, for spinners in the lists.
export function useCheckingAccounts() {
  const ids = useMutationState({
    filters: { mutationKey: ["cloud", "check"], status: "pending" },
    select: (m) => m.state.variables as string,
  })
  return new Set(ids)
}

export function useSetCloudFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      api.cloud.setCloudAccountFavorite(id, { favorite }),
    onSuccess: (a) => storeAccount(queryClient, a),
  })
}

// Re-reads every account now, past the backend's short cache.
export function useRefreshCloud() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.cloud.listCloudServers({ fresh: true }),
    onSuccess: (data) => {
      queryClient.setQueryData(cloudKeys.servers, data)
      queryClient.invalidateQueries({ queryKey: cloudKeys.accounts })
    },
  })
}

export type PowerAction = "on" | "off" | "reboot"

export function useCloudPower() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      server,
      action,
    }: {
      server: ServerRef
      action: PowerAction
    }) =>
      api.cloud.powerCloudServer(server.account_id, server.region, server.id, {
        action,
      }),
    onSuccess: (s) => storeServer(queryClient, s),
  })
}

export function useRenameCloudServer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ server, name }: { server: ServerRef; name: string }) =>
      api.cloud.renameCloudServer(server.account_id, server.region, server.id, {
        name,
      }),
    onSuccess: (s) => storeServer(queryClient, s),
  })
}
