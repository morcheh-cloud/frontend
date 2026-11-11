"use client"

import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { STATUS_POLL } from "@/components/panel/problems"
import { ApiError, api } from "@/lib/api"
import type {
  Schedule,
  ScheduleBody,
  ScheduleRun,
  ScheduleUpdate,
} from "@/lib/services"

// Cron jobs Morche runs itself ("schedules" in the API).

export type RunsQuery = NonNullable<
  Parameters<typeof api.cronJobs.listScheduleRuns>[1]
>

export const cronjobKeys = {
  all: ["cronjobs"] as const,
  list: (ws: string) => ["cronjobs", "list", ws] as const,
  detail: (id: string) => ["cronjobs", "detail", id] as const,
  runs: (id: string, query: RunsQuery) =>
    ["cronjobs", "runs", id, query] as const,
  run: (id: string) => ["cronjobs", "run", id] as const,
  preview: (cron: string, tz: string) =>
    ["cronjobs", "preview", cron, tz] as const,
}

const ACTIVE_POLL = 2_000

export const runActive = (state: string) =>
  state === "queued" || state === "running"

const retryUnlessGone = (count: number, error: Error) =>
  !(error instanceof ApiError && [403, 404].includes(error.status)) && count < 2

// The list polls fast while a job is running, so its state moves.
export function useCronjobs(ws: string | undefined) {
  return useQuery({
    queryKey: cronjobKeys.list(ws ?? ""),
    queryFn: () => api.cronJobs.listSchedules(ws ?? ""),
    select: (d) => d.items,
    enabled: !!ws,
    refetchInterval: (q) =>
      q.state.data?.items.some((s) => s.last_run && runActive(s.last_run.state))
        ? ACTIVE_POLL
        : STATUS_POLL,
  })
}

export function useCronjob(id: string | undefined, { poll = true } = {}) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: cronjobKeys.detail(id ?? ""),
    queryFn: () => api.cronJobs.getSchedule(id ?? ""),
    enabled: !!id,
    retry: retryUnlessGone,
    // The editor keeps its own draft; a save elsewhere answers 409.
    refetchOnWindowFocus: poll,
    refetchInterval: poll
      ? (q) =>
          q.state.data?.last_run && runActive(q.state.data.last_run.state)
            ? ACTIVE_POLL
            : STATUS_POLL
      : false,
    placeholderData: () => {
      for (const [, items] of qc.getQueriesData<{ items: Schedule[] }>({
        queryKey: ["cronjobs", "list"],
      })) {
        const hit = items?.items.find((s) => s.id === id)
        if (hit) return hit
      }
    },
  })
}

export function useCronjobRuns(id: string, query: RunsQuery) {
  return useQuery({
    queryKey: cronjobKeys.runs(id, query),
    queryFn: () => api.cronJobs.listScheduleRuns(id, query),
    placeholderData: keepPreviousData,
    refetchInterval: (q) =>
      q.state.data?.items.some((r) => runActive(r.state))
        ? ACTIVE_POLL
        : STATUS_POLL,
  })
}

export function useCronjobRun(id: string | null) {
  return useQuery({
    queryKey: cronjobKeys.run(id ?? ""),
    queryFn: () => api.cronJobs.getScheduleRun(id ?? ""),
    enabled: !!id,
    retry: retryUnlessGone,
    refetchInterval: (q) =>
      q.state.data && !runActive(q.state.data.state) ? false : ACTIVE_POLL,
  })
}

// When the next runs fall, from the backend (it reads @every and zones the
// same way the scheduler does). Waits for typing to pause.
export function usePreview(cron: string, timezone: string) {
  const [debounced, setDebounced] = useState({ cron, timezone })
  useEffect(() => {
    const t = setTimeout(() => setDebounced({ cron, timezone }), 350)
    return () => clearTimeout(t)
  }, [cron, timezone])
  const c = debounced.cron.trim()
  return useQuery({
    queryKey: cronjobKeys.preview(c, debounced.timezone),
    queryFn: () =>
      api.cronJobs.previewSchedule({
        cron: c,
        timezone: debounced.timezone,
        count: 3,
      }),
    enabled: c.length > 0,
    retry: false,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

// Puts a saved job in the list and detail caches.
function putCronjob(qc: QueryClient, s: Schedule) {
  qc.setQueryData(cronjobKeys.detail(s.id), s)
  qc.setQueryData<{ items: Schedule[] }>(
    cronjobKeys.list(s.workspace_id),
    (d) =>
      d
        ? {
            ...d,
            items: d.items.some((x) => x.id === s.id)
              ? d.items.map((x) => (x.id === s.id ? s : x))
              : [...d.items, s],
          }
        : d,
  )
}

export function useCreateCronjob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ws, body }: { ws: string; body: ScheduleBody }) =>
      api.cronJobs.createSchedule(ws, body),
    onSuccess: (s) => putCronjob(qc, s),
  })
}

export function useUpdateCronjob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ScheduleUpdate }) =>
      api.cronJobs.updateSchedule(id, body),
    onSuccess: (s) => putCronjob(qc, s),
  })
}

export function useSetCronjobEnabled() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.cronJobs.setScheduleEnabled(id, { enabled }),
    onSuccess: (s) => putCronjob(qc, s),
  })
}

export function useDeleteCronjob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (s: Pick<Schedule, "id" | "workspace_id">) =>
      api.cronJobs.deleteSchedule(s.id),
    onSuccess: (_, s) => {
      qc.setQueryData<{ items: Schedule[] }>(
        cronjobKeys.list(s.workspace_id),
        (d) => d && { ...d, items: d.items.filter((x) => x.id !== s.id) },
      )
      qc.removeQueries({ queryKey: cronjobKeys.detail(s.id) })
    },
  })
}

export function useRunCronjob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dryRun }: { id: string; dryRun: boolean }) =>
      api.cronJobs.runSchedule(id, { dry_run: dryRun }),
    onSuccess: (out) => {
      qc.setQueryData(cronjobKeys.run(out.run.id), out.run)
      qc.invalidateQueries({ queryKey: cronjobKeys.all })
    },
  })
}

export function useCancelCronjobRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.cronJobs.cancelScheduleRun(id),
    onSuccess: (run) => {
      qc.setQueryData(cronjobKeys.run(run.id), run)
      qc.invalidateQueries({ queryKey: cronjobKeys.all })
    },
  })
}

export function useDeleteCronjobRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (run: Pick<ScheduleRun, "id">) =>
      api.cronJobs.deleteScheduleRun(run.id),
    onSuccess: (_, run) => {
      qc.removeQueries({ queryKey: cronjobKeys.run(run.id) })
      qc.invalidateQueries({ queryKey: ["cronjobs", "runs"] })
    },
  })
}
