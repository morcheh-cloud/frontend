"use client"

import {
  keepPreviousData,
  type QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { STATUS_POLL } from "@/components/panel/problems"
import { ApiError, api } from "@/lib/api"
import type {
  Automation,
  AutomationBody,
  AutomationEventInput,
  AutomationRun,
} from "@/lib/services"

// Automations of a workspace and their runs. A run is also a job
// (automation-run); finishing one refreshes everything under ["automations"].

export type RunStatus = AutomationRun["status"]

export type RunsQuery = {
  automation?: string
  status?: RunStatus
  limit: number
  offset: number
}

export const automationKeys = {
  all: ["automations"] as const,
  list: (ws: string) => ["automations", "list", ws] as const,
  detail: (id: string) => ["automations", "detail", id] as const,
  runs: (ws: string, q: RunsQuery) => ["automations", "runs", ws, q] as const,
  run: (id: string) => ["automations", "run", id] as const,
  preview: (ws: string, body: string) =>
    ["automations", "preview", ws, body] as const,
}

const ACTIVE_POLL = 2_000

export const runActive = (status: string) =>
  status === "queued" || status === "running"

const retryUnlessGone = (count: number, error: Error) =>
  !(error instanceof ApiError && [403, 404].includes(error.status)) && count < 2

const busy = (a: Automation) => a.recent.some((r) => runActive(r.status))

// The list (the menu's red count reads the same query).
export const automationsQuery = (ws: string) =>
  queryOptions({
    queryKey: automationKeys.list(ws),
    queryFn: () => api.automations.listAutomations(ws),
    enabled: !!ws,
    refetchInterval: (q) =>
      q.state.data?.items.some(busy) ? ACTIVE_POLL : STATUS_POLL,
  })

export function useAutomations(ws: string | undefined) {
  return useQuery({
    ...automationsQuery(ws ?? ""),
    select: (d) => d.items,
  })
}

export function useAutomation(id: string | undefined, { poll = true } = {}) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: automationKeys.detail(id ?? ""),
    queryFn: () => api.automations.getAutomation(id ?? ""),
    enabled: !!id,
    retry: retryUnlessGone,
    refetchOnWindowFocus: poll,
    refetchInterval: poll
      ? (q) => (q.state.data && busy(q.state.data) ? ACTIVE_POLL : STATUS_POLL)
      : false,
    placeholderData: () => {
      for (const [, d] of qc.getQueriesData<{ items: Automation[] }>({
        queryKey: ["automations", "list"],
      })) {
        const hit = d?.items.find((a) => a.id === id)
        if (hit) return hit
      }
    },
  })
}

// One automation's runs, or the workspace's (all automations).
export function useAutomationRuns(ws: string | undefined, q: RunsQuery) {
  return useQuery({
    queryKey: automationKeys.runs(ws ?? "", q),
    queryFn: () =>
      q.automation
        ? api.automations.listAutomationRuns(q.automation, {
            status: q.status,
            limit: q.limit,
            offset: q.offset,
          })
        : api.automations.listWorkspaceAutomationRuns(ws ?? "", {
            status: q.status,
            limit: q.limit,
            offset: q.offset,
          }),
    enabled: !!ws,
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.items.some((r) => runActive(r.status))
        ? ACTIVE_POLL
        : STATUS_POLL,
  })
}

export function useAutomationRun(id: string | null) {
  return useQuery({
    queryKey: automationKeys.run(id ?? ""),
    queryFn: () => api.automations.getAutomationRun(id ?? ""),
    enabled: !!id,
    retry: retryUnlessGone,
    refetchInterval: (q) =>
      q.state.data && !runActive(q.state.data.status) ? false : ACTIVE_POLL,
  })
}

// What a draft would do with an event, as the person editing (nothing runs).
// Waits for typing to pause; a draft the backend refuses comes back as an
// error (422) and the last answer stays on screen.
export function useAutomationPreview(
  ws: string,
  body: AutomationBody,
  event: AutomationEventInput | undefined,
  enabled: boolean,
) {
  const text = JSON.stringify({ automation: body, event })
  const [debounced, setDebounced] = useState(text)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 600)
    return () => clearTimeout(t)
  }, [text])
  return useQuery({
    queryKey: automationKeys.preview(ws, debounced),
    queryFn: () => api.automations.previewAutomation(ws, JSON.parse(debounced)),
    enabled: enabled && !!ws,
    retry: false,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  })
}

// Puts an automation in the list and detail caches.
function put(qc: QueryClient, a: Automation) {
  qc.setQueryData(automationKeys.detail(a.id), a)
  qc.setQueryData<{ items: Automation[] }>(
    automationKeys.list(a.workspace_id),
    (d) =>
      d
        ? {
            ...d,
            items: d.items.some((x) => x.id === a.id)
              ? d.items.map((x) => (x.id === a.id ? a : x))
              : [...d.items, a],
          }
        : d,
  )
}

export function useSaveAutomation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ws,
      body,
    }: {
      id?: string
      ws: string
      body: AutomationBody
    }) =>
      id
        ? api.automations.updateAutomation(id, body)
        : api.automations.createAutomation(ws, body),
    onSuccess: (a) => put(qc, a),
  })
}

export function useDeleteAutomation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (a: Pick<Automation, "id" | "workspace_id">) =>
      api.automations.deleteAutomation(a.id),
    onSuccess: (_, a) => {
      qc.setQueryData<{ items: Automation[] }>(
        automationKeys.list(a.workspace_id),
        (d) => d && { ...d, items: d.items.filter((x) => x.id !== a.id) },
      )
      qc.removeQueries({ queryKey: automationKeys.detail(a.id) })
      qc.invalidateQueries({ queryKey: ["automations", "runs"] })
    },
  })
}

export function useRunAutomation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, event }: { id: string; event?: AutomationEventInput }) =>
      api.automations.runAutomation(id, { event }),
    onSuccess: (out) => {
      qc.setQueryData(automationKeys.run(out.run.id), out.run)
      qc.invalidateQueries({ queryKey: automationKeys.all })
    },
  })
}

export function useTestAutomation() {
  return useMutation({
    mutationFn: ({ id, event }: { id: string; event?: AutomationEventInput }) =>
      api.automations.testAutomation(id, { dry_run: true, event }),
  })
}

export function useCancelAutomationRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.automations.cancelAutomationRun(id),
    onSuccess: (run) => {
      qc.setQueryData(automationKeys.run(run.id), run)
      qc.invalidateQueries({ queryKey: automationKeys.all })
    },
  })
}

// The incoming URL's token comes back once: it never goes into the cache.
export function useCreateHook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.automations.createAutomationHook(id),
    onSuccess: (_, id) =>
      qc.invalidateQueries({ queryKey: automationKeys.detail(id) }),
  })
}

export function useDeleteHook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.automations.deleteAutomationHook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: automationKeys.all }),
  })
}
