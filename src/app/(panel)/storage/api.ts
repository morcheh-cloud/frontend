"use client"

import {
  type QueryClient,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect } from "react"

import { type InsightsRange, timeZone } from "@/components/insights/format"
import { STATUS_POLL, storagesQuery } from "@/components/panel/problems"
import { ApiError, api } from "@/lib/api"
import type { Storage, StorageBody, StorageTestBody } from "@/lib/services"

// The list key is shared with the "Send to…" dialog (transfer-dialog.tsx).
export const keys = {
  storages: storagesQuery.queryKey,
  detail: (id: string) => ["storages", id] as const,
}

// Statuses refresh by themselves: the backend re-checks every storage
// (STORAGE_CHECK_INTERVAL) and this re-reads the list.
export function useStorages() {
  return useQuery(storagesQuery)
}

export function useStorage(id: string) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: keys.detail(id),
    queryFn: () => api.storage.getStorage(id),
    refetchInterval: STATUS_POLL,
    // As the list has it, so the page renders at once when opened from it.
    placeholderData: () =>
      queryClient
        .getQueryData<{ items: Storage[] }>(keys.storages)
        ?.items.find((s) => s.id === id),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 2,
  })
  // Came back online (a background check, or one run here): retry the
  // folders that failed while it was down.
  const online = query.data?.status === "online"
  useEffect(() => {
    if (online) retryFailedFolders(queryClient, id)
  }, [online, id, queryClient])
  return query
}

function retryFailedFolders(queryClient: QueryClient, id: string) {
  return queryClient.invalidateQueries({
    queryKey: ["storage-files", id],
    predicate: (q) => q.state.status === "error",
  })
}

// Puts a storage the API answered straight into the list and its page, then
// refetches the list (order, counts) in the background.
function store(queryClient: QueryClient, s: Storage) {
  queryClient.setQueryData(keys.detail(s.id), s)
  queryClient.setQueryData<{ items: Storage[] }>(
    keys.storages,
    (data) =>
      data && {
        ...data,
        items: data.items.some((x) => x.id === s.id)
          ? data.items.map((x) => (x.id === s.id ? s : x))
          : [...data.items, s],
      },
  )
  return queryClient.invalidateQueries({ queryKey: keys.storages, exact: true })
}

export function useCreateStorage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: StorageBody) => api.storage.createStorage(body),
    onSuccess: (s) => store(queryClient, s),
  })
}

export function useUpdateStorage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: StorageBody }) =>
      api.storage.updateStorage(id, body),
    onSuccess: (s) => {
      store(queryClient, s)
      // New credentials or root folder: every cached listing may be wrong.
      queryClient.invalidateQueries({ queryKey: ["storage-files", s.id] })
    },
  })
}

export function useDeleteStorage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.storage.deleteStorage(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<{ items: Storage[] }>(
        keys.storages,
        (data) =>
          data && { ...data, items: data.items.filter((s) => s.id !== id) },
      )
      // Not the detail query: a still-open page would refetch a 404.
      queryClient.removeQueries({ queryKey: ["storage-files", id] })
      return queryClient.invalidateQueries({
        queryKey: keys.storages,
        exact: true,
      })
    },
  })
}

// Decrypted secrets: never cached past the layer that shows them, and kept
// out of ["storages"] so storage invalidations don't refetch them.
export function useStorageCredentials(id: string) {
  return useQuery({
    queryKey: ["storage-credentials", id],
    queryFn: () => api.storage.revealStorageCredentials(id),
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

// The saved secrets for the edit form's eye. One round trip per press; nothing
// stays in the mutation cache.
export function useRevealStorageCredentials(id?: string) {
  return useMutation({
    mutationFn: () => api.storage.revealStorageCredentials(id ?? ""),
    gcTime: 0,
  })
}

export function useTestStorage() {
  return useMutation({
    mutationFn: (body: StorageTestBody) =>
      api.storage.testStorageConnection(body),
  })
}

const checkKey = ["check-storage"]

export function useCheckStorage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: checkKey,
    mutationFn: ({ id, trust }: { id: string; trust?: boolean }) =>
      api.storage.checkStorage(id, trust ? { trust_new_host_key: true } : {}),
    onSuccess: (s) => {
      // Back online (e.g. after trusting a new host key): retry the folders
      // that failed while it was down.
      if (s.status === "online") retryFailedFolders(queryClient, s.id)
      return store(queryClient, s)
    },
  })
}

// Ids with a check in flight, so their status can show a spinner.
export function useCheckingStorages() {
  const variables = useMutationState({
    filters: { mutationKey: checkKey, status: "pending" },
    select: (m) => (m.state.variables as { id: string } | undefined)?.id,
  })
  return new Set(variables.filter(Boolean))
}

export function useSetStorageFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      api.storage.setStorageFavorite(id, { favorite }),
    // Flip the star right away; the answer replaces it.
    onMutate: ({ id, favorite }) => {
      queryClient.setQueryData<Storage>(
        keys.detail(id),
        (s) => s && { ...s, favorite },
      )
      queryClient.setQueryData<{ items: Storage[] }>(
        keys.storages,
        (data) =>
          data && {
            ...data,
            items: data.items.map((s) =>
              s.id === id ? { ...s, favorite } : s,
            ),
          },
      )
    },
    onSuccess: (s) => store(queryClient, s),
    onError: () => queryClient.invalidateQueries({ queryKey: keys.storages }),
  })
}

export type { InsightsRange }

export const insightsKeys = {
  all: ["storage-insights"] as const,
  range: (range: InsightsRange) => ["storage-insights", range] as const,
}

// Check history, space and activity. History only grows every check interval
// (30 s by default), so a minute between reads is plenty.
export function useStorageInsights(range: InsightsRange) {
  return useQuery({
    queryKey: insightsKeys.range(range),
    queryFn: () => api.storage.storageInsights({ range, tz: timeZone() }),
    refetchInterval: 60_000,
    placeholderData: (previous) => previous,
  })
}

// Starts a background walk of the storage; the job (kind storage-scan) shows
// in Tasks and refreshes Insights when it ends (refreshAfterJob).
export function useMeasureUsage() {
  return useMutation({
    mutationKey: ["measure-storage-usage"],
    mutationFn: (id: string) => api.storage.measureStorageUsage(id),
  })
}
