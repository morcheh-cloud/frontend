"use client"

import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { ApiError, api } from "@/lib/api"
import type {
  Script,
  ScriptInput,
  ScriptRun,
  ScriptUpdate,
  StartScriptRunBody,
} from "@/lib/services"

export type ScriptRunsQuery = NonNullable<
  Parameters<typeof api.scripts.listScriptRuns>[1]
>
export type ServerRunsQuery = NonNullable<
  Parameters<typeof api.scripts.listServerScriptRuns>[1]
>

export const scriptKeys = {
  all: ["scripts"] as const,
  list: (ws: string) => ["scripts", "list", ws] as const,
  script: (id: string) => ["scripts", "script", id] as const,
  runs: (ws: string, query: ScriptRunsQuery) =>
    ["scripts", "runs", ws, query] as const,
  run: (id: string) => ["scripts", "run", id] as const,
  server: (id: string) => ["scripts", "server", id] as const,
  serverRuns: (id: string, query: ServerRunsQuery) =>
    ["scripts", "server-runs", id, query] as const,
}

const notFound = (count: number, error: Error) =>
  !(error instanceof ApiError && [403, 404].includes(error.status)) && count < 2

export function runFinished(state: string) {
  return state !== "queued" && state !== "running"
}

export function useScripts(ws: string | undefined) {
  return useQuery({
    queryKey: scriptKeys.list(ws ?? ""),
    queryFn: () => api.scripts.listScripts(ws ?? ""),
    select: (d) => d.items,
    enabled: !!ws,
    refetchInterval: (q) =>
      q.state.data?.items.some(
        (s) => s.last_run && !runFinished(s.last_run.state),
      )
        ? 3000
        : false,
  })
}

// The scripts that can run on one server (its workspace's), with the last
// run on this server.
export function useServerScripts(serverId: string) {
  return useQuery({
    queryKey: scriptKeys.server(serverId),
    queryFn: () => api.scripts.listServerScripts(serverId),
    select: (d) => d.items,
    refetchInterval: (q) =>
      q.state.data?.items.some(
        (s) => s.last_run && !runFinished(s.last_run.state),
      )
        ? 3000
        : false,
  })
}

export function useScript(id: string | undefined) {
  return useQuery({
    queryKey: scriptKeys.script(id ?? ""),
    queryFn: () => api.scripts.getScript(id ?? ""),
    enabled: !!id,
    retry: notFound,
    // The editor keeps its own draft; a 409 tells about another save.
    refetchOnWindowFocus: false,
  })
}

function putScript(qc: QueryClient, s: Script) {
  qc.setQueryData(scriptKeys.script(s.id), s)
  qc.invalidateQueries({ queryKey: scriptKeys.list(s.workspace_id) })
  qc.invalidateQueries({ queryKey: ["scripts", "server"] })
}

export function useCreateScript(ws: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ScriptInput) => api.scripts.createScript(ws, body),
    onSuccess: (s) => putScript(qc, s),
  })
}

export function useUpdateScript(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ScriptUpdate) => api.scripts.updateScript(id, body),
    onSuccess: (s) => putScript(qc, s),
  })
}

export function useDeleteScript() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; ws: string }) =>
      api.scripts.deleteScript(id),
    onSuccess: (_, { id, ws }) => {
      qc.removeQueries({ queryKey: scriptKeys.script(id) })
      qc.invalidateQueries({ queryKey: scriptKeys.list(ws) })
      qc.invalidateQueries({ queryKey: ["scripts", "server"] })
    },
  })
}

const pollRuns = (items: { state?: string; run_state?: string }[] = []) =>
  items.some((r) => !runFinished(r.run_state ?? r.state ?? "")) ? 3000 : 15_000

export function useScriptRuns(ws: string | undefined, query: ScriptRunsQuery) {
  return useQuery({
    queryKey: scriptKeys.runs(ws ?? "", query),
    queryFn: () => api.scripts.listScriptRuns(ws ?? "", query),
    enabled: !!ws,
    placeholderData: keepPreviousData,
    refetchInterval: (q) => pollRuns(q.state.data?.items),
  })
}

export function useServerScriptRuns(
  serverId: string,
  query: ServerRunsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: scriptKeys.serverRuns(serverId, query),
    queryFn: () => api.scripts.listServerScriptRuns(serverId, query),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: (q) => pollRuns(q.state.data?.items),
  })
}

// One run with every server's output: polled every second while it goes
// (the backend saves output once a second), then left alone.
export function useScriptRun(id: string | undefined) {
  return useQuery({
    queryKey: scriptKeys.run(id ?? ""),
    queryFn: () => api.scripts.getScriptRun(id ?? ""),
    enabled: !!id,
    retry: notFound,
    refetchInterval: (q) =>
      q.state.data && !runFinished(q.state.data.state) ? 1000 : false,
  })
}

const invalidateRuns = (qc: QueryClient) => {
  qc.invalidateQueries({ queryKey: ["scripts", "runs"] })
  qc.invalidateQueries({ queryKey: ["scripts", "server-runs"] })
  qc.invalidateQueries({ queryKey: ["scripts", "list"] })
  qc.invalidateQueries({ queryKey: ["scripts", "server"] })
}

export function useStartScriptRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: StartScriptRunBody) => api.scripts.startScriptRun(body),
    onSuccess: ({ run }) => {
      qc.setQueryData(scriptKeys.run(run.id), run)
      invalidateRuns(qc)
    },
  })
}

export function useCancelScriptRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.scripts.cancelScriptRun(id),
    onSuccess: (run) => {
      qc.setQueryData(scriptKeys.run(run.id), run)
      invalidateRuns(qc)
    },
  })
}

export function useDeleteScriptRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.scripts.deleteScriptRun(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: scriptKeys.run(id) })
      invalidateRuns(qc)
    },
  })
}

export function serversText(r: Pick<ScriptRun, "servers" | "server_names">) {
  if (r.servers === 1 && r.server_names[0]) return r.server_names[0]
  return `${r.servers} servers`
}
