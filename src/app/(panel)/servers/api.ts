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

import { facetsQuery, STATUS_POLL } from "@/components/panel/problems"
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
  facets: facetsQuery.queryKey,
  folders: ["folders"] as const,
}

export function useServers(query: ListQuery) {
  return useQuery({
    queryKey: keys.list(query),
    queryFn: () => api.servers.listServers(query),
    placeholderData: keepPreviousData,
    refetchInterval: STATUS_POLL,
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
    refetchInterval: STATUS_POLL,
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
    refetchInterval: STATUS_POLL,
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

// The saved secrets for the edit form's eye. One round trip per press; nothing
// stays in the mutation cache.
export function useRevealCredentials(id?: string) {
  return useMutation({
    mutationFn: () => api.servers.revealServerCredentials(id ?? ""),
    gcTime: 0,
  })
}

export function useFacets() {
  return useQuery(facetsQuery)
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

// Puts a fresh copy of one server into every cached list and its page, so a
// check shows up at once without refetching the lists.
function putServer(queryClient: QueryClient, server: Server) {
  const patch = (page: ListPage) => ({
    ...page,
    items: page.items.map((s) => (s.id === server.id ? server : s)),
  })
  queryClient.setQueryData(keys.detail(server.id), server)
  queryClient.setQueriesData<CachedList>(
    {
      queryKey: keys.servers,
      predicate: (q) =>
        q.queryKey[1] === "list" || q.queryKey[1] === "infinite",
    },
    (data) => {
      if (!data) return data
      if ("pages" in data) return { ...data, pages: data.pages.map(patch) }
      return "items" in data ? patch(data) : data
    },
  )
}

const checkKey = ["check-server"]

export function useCheckServer() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidate()
  return useMutation({
    mutationKey: checkKey,
    mutationFn: ({ id, trust }: { id: string; trust?: boolean }) =>
      api.servers.checkServer(id, trust ? { trust_new_host_key: true } : {}),
    onSuccess: (server) => putServer(queryClient, server),
    onSettled: invalidate,
  })
}

// Checks at once from a bulk check. A browser opens ~6 connections to one
// host, so leave room for the rest of the page.
const BULK_CHECKS = 4

// Checks each server on its own, a few at a time, so every status shows as
// soon as it's known instead of all of them after the slowest one. Each
// check is its own mutation under checkKey: waiting ones spin too.
export function useBulkCheck() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidate()
  const one = useMutation({
    mutationKey: checkKey,
    mutationFn: async ({ id, slot }: { id: string; slot: Promise<void> }) => {
      await slot
      return api.servers.checkServer(id, {})
    },
    onSuccess: (server) => putServer(queryClient, server),
  })
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const queue = [...ids]
      const results: { id: string; server?: Server; error?: unknown }[] = []
      // Each worker hands the next id a slot that opens when it's free.
      async function worker() {
        for (let id = queue.shift(); id; id = queue.shift()) {
          try {
            results.push({ id, server: await run(id) })
          } catch (error) {
            results.push({ id, error })
          }
        }
      }
      // Every id becomes a pending mutation right away (so it spins), but
      // only BULK_CHECKS of them are let through at a time.
      const gates = new Map<string, () => void>()
      const runs = new Map(
        ids.map((id) => {
          const slot = new Promise<void>((open) => gates.set(id, open))
          return [id, one.mutateAsync({ id, slot })] as const
        }),
      )
      function run(id: string) {
        gates.get(id)?.()
        return runs.get(id) as Promise<Server>
      }
      await Promise.all(
        Array.from({ length: Math.min(BULK_CHECKS, ids.length) }, worker),
      )
      return results
    },
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

// Servers leave a list of one place the moment they're moved, as files do in
// Drive; wider lists only change the row's folder. The refetch that follows
// settles it, or brings them back if the move failed.
export function useMoveServers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      ids,
      folderId,
    }: {
      ids: string[]
      folderId: string | null
    }) => api.servers.bulkMoveServers({ ids, folder_id: folderId }),
    onMutate: async ({ ids, folderId }) => {
      const lists = ["servers", "list"]
      await queryClient.cancelQueries({ queryKey: lists })
      const cached = queryClient.getQueryCache().findAll({ queryKey: lists })
      for (const { queryKey } of cached) {
        const { folder, direct } = queryKey[2] as ListQuery
        const oneLevel = direct || folder === "none"
        const leaves = oneLevel && folder !== (folderId ?? "none")
        queryClient.setQueryData<{ items: Server[]; total: number }>(
          queryKey,
          (data) => {
            if (!data) return data
            const items = leaves
              ? data.items.filter((s) => !ids.includes(s.id))
              : data.items.map((s) =>
                  ids.includes(s.id) ? { ...s, folder_id: folderId } : s,
                )
            const gone = data.items.length - items.length
            return { ...data, items, total: data.total - gone }
          },
        )
      }
    },
    onSettled: () => invalidateServers(queryClient),
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
