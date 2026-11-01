"use client"

import {
  type QueryClient,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { ApiError, api } from "@/lib/api"
import type { Storage, StorageBody, StorageTestBody } from "@/lib/services"

// The list key is shared with the "Send to…" dialog (transfer-dialog.tsx).
export const keys = {
  storages: ["storages"] as const,
  detail: (id: string) => ["storages", id] as const,
}

export function useStorages() {
  return useQuery({
    queryKey: keys.storages,
    queryFn: () => api.storage.listStorages(),
  })
}

export function useStorage(id: string) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => api.storage.getStorage(id),
    // As the list has it, so the page renders at once when opened from it.
    placeholderData: () =>
      queryClient
        .getQueryData<{ items: Storage[] }>(keys.storages)
        ?.items.find((s) => s.id === id),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 2,
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
      if (s.status === "online") {
        queryClient.invalidateQueries({
          queryKey: ["storage-files", s.id],
          predicate: (q) => q.state.status === "error",
        })
      }
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
