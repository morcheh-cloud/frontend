"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { useJobActions } from "@/components/jobs/jobs-provider"
import { API_URL, api } from "@/lib/api"
import type {
  Job,
  LogExportBody,
  LogOverview,
  LogPolicyBody,
} from "@/lib/services"

// Everything here sits under one root, so a finished job (refreshAfterJob)
// refreshes it all at once.
export const logKeys = {
  all: ["log-retention"] as const,
  overview: () => ["log-retention", "overview"] as const,
  periods: (key: string, period: string, tz: string) =>
    ["log-retention", "periods", key, period, tz] as const,
  preview: (key: string, body: LogPolicyBody) =>
    ["log-retention", "preview", key, body] as const,
  archives: (q: ArchiveQuery) => ["log-retention", "archives", q] as const,
  archive: (id: string) => ["log-retention", "archive", id] as const,
}

export type ArchiveQuery = {
  dataset?: string
  state?: "" | "running" | "stored" | "failed" | "interrupted"
  held?: boolean
  page: number
  limit: number
}

// Sizes are cached by the backend for a minute; `fresh` reads them again.
export function useLogOverview() {
  return useQuery({
    queryKey: logKeys.overview(),
    queryFn: () => api.logRetention.listLogDatasets(),
    refetchInterval: 60_000,
  })
}

export function useRefreshSizes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.logRetention.listLogDatasets({ fresh: true }),
    onSuccess: (data: LogOverview) => qc.setQueryData(logKeys.overview(), data),
  })
}

export function usePeriods(
  key: string,
  period: "day" | "week" | "month",
  tz: string,
) {
  return useQuery({
    queryKey: logKeys.periods(key, period, tz),
    queryFn: () => api.logRetention.listLogDatasetPeriods(key, { period, tz }),
    placeholderData: keepPreviousData,
  })
}

// What a policy would take now; waits for typing to pause.
export function usePolicyPreview(key: string, body: LogPolicyBody | null) {
  const [debounced, setDebounced] = useState(body)
  const json = JSON.stringify(body)
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by value
  useEffect(() => {
    const t = setTimeout(() => setDebounced(body), 400)
    return () => clearTimeout(t)
  }, [json])
  return useQuery({
    queryKey: logKeys.preview(key, debounced ?? ({} as LogPolicyBody)),
    queryFn: () =>
      api.logRetention.previewLogPolicy(key, debounced as LogPolicyBody),
    enabled: !!debounced,
    placeholderData: keepPreviousData,
    retry: false,
  })
}

export function useSavePolicy(key: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LogPolicyBody) =>
      api.logRetention.saveLogPolicy(key, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: logKeys.overview() }),
  })
}

// Puts the kind's default policy back (last run and files stay).
export function useResetPolicy(key: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.logRetention.resetLogPolicy(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: logKeys.overview() }),
  })
}

// Every job-starting call hands its job to the tasks tray.
function useJobMutation<T>(start: (input: T) => Promise<Job>) {
  const jobs = useJobActions()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: start,
    onSuccess: (job) => {
      jobs.track(job)
      qc.invalidateQueries({ queryKey: logKeys.all })
    },
  })
}
export const useRunPolicy = () =>
  useJobMutation((key: string) => api.logRetention.runLogPolicy(key))

export const useExportLogs = () =>
  useJobMutation((v: { key: string; body: LogExportBody }) =>
    api.logRetention.exportLogDataset(v.key, v.body),
  )

export const useCompact = () =>
  useJobMutation((v: { key: string; full: boolean }) =>
    api.logRetention.compactLogDataset(v.key, { full: v.full }),
  )

export const useRestoreArchive = () =>
  useJobMutation((v: { id: string; holdDays: number }) =>
    api.logRetention.restoreLogArchive(v.id, { hold_days: v.holdDays }),
  )

export const usePutAway = () =>
  useJobMutation((id: string) => api.logRetention.putAwayLogArchive(id))

export function useArchives(q: ArchiveQuery) {
  return useQuery({
    queryKey: logKeys.archives(q),
    queryFn: () =>
      api.logRetention.listLogArchives({
        dataset: q.dataset || undefined,
        state: q.state || undefined,
        held: q.held || undefined,
        page: q.page,
        limit: q.limit,
      }),
    placeholderData: keepPreviousData,
    // Running files and restores move on by themselves.
    refetchInterval: (query) =>
      query.state.data?.items.some(
        (a) => a.state === "running" || a.restore.state === "running",
      )
        ? 4000
        : 30_000,
  })
}

export function useSetHold() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; days: number }) =>
      api.logRetention.setLogArchiveHold(v.id, { days: v.days }),
    onSuccess: () => qc.invalidateQueries({ queryKey: logKeys.all }),
  })
}

export function useDeleteArchive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.logRetention.deleteLogArchive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: logKeys.all }),
  })
}

// A plain link: the browser streams the zip (the session cookie goes along).
export function downloadUrl(id: string, copy?: number) {
  return `${API_URL}/log-archives/${id}/download${copy ? `?copy=${copy}` : ""}`
}
