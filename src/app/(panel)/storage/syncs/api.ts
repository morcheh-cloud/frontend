"use client"

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { useJobActions } from "@/components/jobs/jobs-provider"
import { STATUS_POLL, storageSyncsQuery } from "@/components/panel/problems"
import { ApiError, api } from "@/lib/api"
import type {
  StorageSync,
  StorageSyncBody,
  StorageSyncUpdate,
} from "@/lib/services"

// Storage syncs and migrations ("storage-syncs" in the API). Everything sits
// under ["storage-syncs"], so a finished job refreshes all of it.

export const syncKeys = {
  all: ["storage-syncs"] as const,
  list: (ws: string) => storageSyncsQuery(ws).queryKey,
  detail: (id: string) => ["storage-syncs", "detail", id] as const,
  runs: (id: string) => ["storage-syncs", "runs", id] as const,
  run: (id: string) => ["storage-syncs", "run", id] as const,
  replication: (id: string) => ["storage-syncs", "replication", id] as const,
}

const ACTIVE_POLL = 2_000

export const runActive = (state: string | undefined) =>
  state === "queued" || state === "running"

const retryUnlessGone = (count: number, error: Error) =>
  !(error instanceof ApiError && [403, 404].includes(error.status)) && count < 2

const busy = (s: StorageSync) => runActive(s.last_run?.state)

// The workspace's syncs and migrations; fast while one is running.
export function useStorageSyncs(ws: string | undefined) {
  return useQuery({
    ...storageSyncsQuery(ws ?? ""),
    select: (d) => d.items,
    refetchInterval: (q) =>
      q.state.data?.items.some(busy) ? ACTIVE_POLL : STATUS_POLL,
  })
}

export function useStorageSync(id: string | undefined, { poll = true } = {}) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: syncKeys.detail(id ?? ""),
    queryFn: () => api.storageSyncs.getStorageSync(id ?? ""),
    enabled: !!id,
    retry: retryUnlessGone,
    // The editor keeps its own draft; a save elsewhere answers 409.
    refetchOnWindowFocus: poll,
    refetchInterval: poll
      ? (q) => (q.state.data && busy(q.state.data) ? ACTIVE_POLL : STATUS_POLL)
      : false,
    placeholderData: () => {
      for (const [, d] of qc.getQueriesData<{ items: StorageSync[] }>({
        queryKey: ["storage-syncs", "list"],
      })) {
        const hit = d?.items?.find((s) => s.id === id)
        if (hit) return hit
      }
    },
  })
}

export function useSyncRuns(id: string, limit = 30) {
  return useQuery({
    queryKey: [...syncKeys.runs(id), limit],
    queryFn: () => api.storageSyncs.listStorageSyncRuns(id, { limit }),
    select: (d) => d.items,
    refetchInterval: (q) =>
      q.state.data?.items.some((r) => runActive(r.state))
        ? ACTIVE_POLL
        : STATUS_POLL,
  })
}

export function useSyncRun(id: string | null) {
  return useQuery({
    queryKey: syncKeys.run(id ?? ""),
    queryFn: () => api.storageSyncs.getStorageSyncRun(id ?? ""),
    enabled: !!id,
    retry: retryUnlessGone,
    refetchInterval: (q) =>
      q.state.data && !runActive(q.state.data.state) ? false : ACTIVE_POLL,
  })
}

// What MinIO says about its own replication (asked live, every 5 s).
export function useReplication(id: string, enabled: boolean) {
  return useQuery({
    queryKey: syncKeys.replication(id),
    queryFn: () => api.storageSyncs.getStorageSyncReplication(id),
    enabled,
    refetchInterval: 5_000,
    retry: false,
  })
}

// Puts a saved sync in the list and detail caches.
function putSync(qc: QueryClient, s: StorageSync) {
  qc.setQueryData(syncKeys.detail(s.id), s)
  qc.setQueryData<{ items: StorageSync[] }>(
    syncKeys.list(s.workspace_id),
    (d) =>
      d
        ? {
            ...d,
            items: d.items.some((x) => x.id === s.id)
              ? d.items.map((x) => (x.id === s.id ? s : x))
              : [s, ...d.items],
          }
        : d,
  )
}

export function useCreateSync(ws: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: StorageSyncBody) =>
      api.storageSyncs.createStorageSync(ws, body),
    onSuccess: (s) => putSync(qc, s),
  })
}

export function useUpdateSync(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: StorageSyncUpdate) =>
      api.storageSyncs.updateStorageSync(id, body),
    onSuccess: (s) => {
      putSync(qc, s)
      qc.invalidateQueries({ queryKey: syncKeys.replication(id) })
    },
  })
}

export function useDeleteSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (s: StorageSync) =>
      api.storageSyncs.deleteStorageSync(s.id).then(() => s),
    onSuccess: (s) => {
      qc.setQueryData<{ items: StorageSync[] }>(
        syncKeys.list(s.workspace_id),
        (d) => d && { ...d, items: d.items.filter((x) => x.id !== s.id) },
      )
      qc.removeQueries({ queryKey: syncKeys.detail(s.id) })
    },
  })
}

export function usePauseSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) =>
      api.storageSyncs.pauseStorageSync(id, { paused }),
    onSuccess: (s) => {
      putSync(qc, s)
      qc.invalidateQueries({ queryKey: syncKeys.replication(s.id) })
    },
  })
}

// Starts a run as a background job and hands it to the tasks tray.
export function useRunSync() {
  const qc = useQueryClient()
  const jobs = useJobActions()
  return useMutation({
    mutationFn: ({ id, dryRun }: { id: string; dryRun: boolean }) =>
      api.storageSyncs.runStorageSync(id, { dry_run: dryRun }),
    onSuccess: (out, { id }) => {
      if (out.job) jobs.track(out.job)
      qc.invalidateQueries({ queryKey: syncKeys.detail(id) })
      qc.invalidateQueries({ queryKey: syncKeys.runs(id) })
      qc.invalidateQueries({ queryKey: ["storage-syncs", "list"] })
    },
  })
}

export function useCancelRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (runId: string) => api.storageSyncs.cancelStorageSyncRun(runId),
    onSuccess: (run) => {
      qc.setQueryData(syncKeys.run(run.id), run)
      qc.invalidateQueries({ queryKey: syncKeys.all })
    },
  })
}

export function useResync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.storageSyncs.resyncStorageSyncReplication(id),
    onSuccess: (_, id) =>
      qc.invalidateQueries({ queryKey: syncKeys.replication(id) }),
  })
}
