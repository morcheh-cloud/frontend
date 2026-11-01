"use client"

import {
  keepPreviousData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { ApiError, api } from "@/lib/api"
import type {
  BulkTagServersRequest,
  ConnectionTestBody,
  FolderBody,
  Server,
  ServerBody,
} from "@/lib/services"

export type ListQuery = NonNullable<
  Parameters<typeof api.servers.listServers>[0]
>

export const PAGE_SIZE = 50

export const keys = {
  servers: ["servers"] as const,
  list: (query: ListQuery) => ["servers", "list", query] as const,
  infinite: (query: ListQuery) => ["servers", "infinite", query] as const,
  detail: (id: string) => ["servers", "detail", id] as const,
  facets: ["servers", "facets"] as const,
  folders: ["folders"] as const,
}

export function useServers(query: ListQuery) {
  return useQuery({
    queryKey: keys.list(query),
    queryFn: () => api.servers.listServers(query),
    placeholderData: keepPreviousData,
  })
}

// Phones scroll one long list and load the next page near the end.
export function useInfiniteServers(query: Omit<ListQuery, "offset" | "limit">) {
  return useInfiniteQuery({
    queryKey: keys.infinite(query),
    queryFn: ({ pageParam }) =>
      api.servers.listServers({
        ...query,
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.items.length, 0)
      return loaded < last.total ? loaded : undefined
    },
    placeholderData: keepPreviousData,
  })
}

type ListPage = { items: Server[] }
type CachedList = ListPage | { pages: ListPage[] }

// The server as some cached list already has it, so its page renders at once
// when opened from the list.
function cachedServer(queryClient: QueryClient, id: string) {
  const lists = queryClient.getQueriesData<CachedList>({
    queryKey: keys.servers,
  })
  for (const [, data] of lists) {
    if (!data) continue
    const pages = "pages" in data ? data.pages : "items" in data ? [data] : []
    for (const page of pages) {
      const hit = page.items.find((s) => s.id === id)
      if (hit) return hit
    }
  }
}

export function useServer(id: string) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => api.servers.getServer(id),
    placeholderData: () => cachedServer(queryClient, id),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 2,
  })
}

// Decrypted SSH secrets: never cached past the layer that shows them, and
// kept out of ["servers"] so server invalidations don't refetch them.
export function useCredentials(id: string) {
  return useQuery({
    queryKey: ["server-credentials", id],
    queryFn: () => api.servers.revealServerCredentials(id),
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useFacets() {
  return useQuery({
    queryKey: keys.facets,
    queryFn: () => api.servers.getServerFacets(),
  })
}

export function useFolders() {
  return useQuery({
    queryKey: keys.folders,
    queryFn: () => api.folders.listFolders(),
    select: (data) => data.items,
  })
}

// Server writes can change any list, the facet counts and the folder counts.
function useInvalidate() {
  const queryClient = useQueryClient()
  return () => invalidateServers(queryClient)
}

// `deleted` servers are left out: a still-open page would refetch a 404.
function invalidateServers(queryClient: QueryClient, deleted: string[] = []) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: keys.servers,
      predicate: (q) =>
        q.queryKey[1] !== "detail" ||
        !deleted.includes(q.queryKey[2] as string),
    }),
    queryClient.invalidateQueries({ queryKey: keys.folders }),
  ])
}

export function useCreateServer() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: ServerBody) => api.servers.createServer(body),
    onSuccess: invalidate,
  })
}

export function useUpdateServer() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ServerBody }) =>
      api.servers.updateServer(id, body),
    onSuccess: invalidate,
  })
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (body: ConnectionTestBody) =>
      api.servers.testServerConnection(body),
  })
}

const checkKey = ["check-server"]

export function useCheckServer() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationKey: checkKey,
    mutationFn: ({ id, trust }: { id: string; trust?: boolean }) =>
      api.servers.checkServer(id, trust ? { trust_new_host_key: true } : {}),
    onSettled: invalidate,
  })
}

export function useBulkCheck() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationKey: checkKey,
    mutationFn: (ids: string[]) => api.servers.bulkCheckServers({ ids }),
    onSettled: invalidate,
  })
}

// Ids with a check in flight, so their status can show a spinner.
export function useCheckingIds() {
  const variables = useMutationState({
    filters: { mutationKey: checkKey, status: "pending" },
    select: (m) => m.state.variables as { id: string } | string[] | undefined,
  })
  const ids = new Set<string>()
  for (const v of variables) {
    if (Array.isArray(v)) for (const id of v) ids.add(id)
    else if (v) ids.add(v.id)
  }
  return ids
}

export function useSetFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      api.servers.setServerFavorite(id, { favorite }),
    // Flip the star right away in every cached list; refetch afterwards.
    onMutate: ({ id, favorite }) => {
      queryClient.setQueryData<Server>(
        keys.detail(id),
        (s) => s && { ...s, favorite },
      )
      queryClient.setQueriesData<{ items: Server[] }>(
        { queryKey: ["servers", "list"] },
        (data) =>
          data && {
            ...data,
            items: data.items.map((s) =>
              s.id === id ? { ...s, favorite } : s,
            ),
          },
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.servers }),
  })
}

export function useDuplicateServer() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.servers.duplicateServer(id),
    onSuccess: invalidate,
  })
}

export function useDeleteServers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api.servers.bulkDeleteServers({ ids }),
    onSuccess: (_, ids) => invalidateServers(queryClient, ids),
  })
}

export function useMoveServers() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({
      ids,
      folderId,
    }: {
      ids: string[]
      folderId: string | null
    }) => api.servers.bulkMoveServers({ ids, folder_id: folderId }),
    onSuccess: invalidate,
  })
}

export function useTagServers() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: BulkTagServersRequest) =>
      api.servers.bulkTagServers(body),
    onSuccess: invalidate,
  })
}

export const saveFolderKey = ["save-folder"]

export function useSaveFolder() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationKey: saveFolderKey,
    mutationFn: ({ id, body }: { id?: string; body: FolderBody }) =>
      id ? api.folders.updateFolder(id, body) : api.folders.createFolder(body),
    onSuccess: invalidate,
  })
}

export function useDeleteFolder() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.folders.deleteFolder(id),
    onSuccess: invalidate,
  })
}
