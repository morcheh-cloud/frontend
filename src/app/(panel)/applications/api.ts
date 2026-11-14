"use client"

import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { softwareInstallsQuery } from "@/components/panel/problems"
import { ApiError, api } from "@/lib/api"
import type {
  Recipe,
  SoftwareInstall,
  SoftwarePreflightRequest,
  StartSoftwareRunBody,
} from "@/lib/services"

export type SoftwareRunsQuery = NonNullable<
  Parameters<typeof api.applications.listSoftwareRuns>[1]
>

// Everything lives under ["software"]: a finished job invalidates it all.
export const softwareKeys = {
  all: ["software"] as const,
  catalog: (ws: string) => ["software", "catalog", ws] as const,
  installs: (ws: string) => ["software", "installs", ws] as const,
  server: (id: string) => ["software", "server", id] as const,
  install: (id: string) => ["software", "install", id] as const,
  runs: (ws: string, query: SoftwareRunsQuery) =>
    ["software", "runs", ws, query] as const,
  run: (id: string) => ["software", "run", id] as const,
}

const notFound = (count: number, error: Error) =>
  !(error instanceof ApiError && [403, 404].includes(error.status)) && count < 2

export function runFinished(state: string) {
  return state !== "queued" && state !== "running"
}

// An install whose status says a run is still working on it.
export function installBusy(i: Pick<SoftwareInstall, "status">) {
  return (
    i.status === "installing" ||
    i.status === "updating" ||
    i.status === "removing"
  )
}

const pollInstalls = (items: SoftwareInstall[] = []) =>
  items.some(installBusy) ? 3000 : 10_000

export function useCatalog(ws: string | undefined) {
  return useQuery({
    queryKey: softwareKeys.catalog(ws ?? ""),
    queryFn: () => api.applications.listSoftwareCatalog(ws ?? ""),
    enabled: !!ws,
    staleTime: 60_000,
  })
}

// Shares its query with the menu's red count (softwareInstallsQuery).
export function useInstalls(ws: string | undefined) {
  return useQuery({
    ...softwareInstallsQuery(ws ?? ""),
    refetchInterval: (q) => pollInstalls(q.state.data?.items),
  })
}

export function useServerSoftware(serverId: string, enabled = true) {
  return useQuery({
    queryKey: softwareKeys.server(serverId),
    queryFn: () => api.applications.listServerSoftware(serverId),
    enabled,
    refetchInterval: (q) => pollInstalls(q.state.data?.items),
  })
}

export function useInstall(id: string | undefined) {
  return useQuery({
    queryKey: softwareKeys.install(id ?? ""),
    queryFn: () => api.applications.getSoftwareInstall(id ?? ""),
    enabled: !!id,
    retry: notFound,
    refetchInterval: (q) =>
      q.state.data && installBusy(q.state.data) ? 3000 : 10_000,
  })
}

const invalidateLists = (qc: QueryClient) => {
  qc.invalidateQueries({ queryKey: ["software", "installs"] })
  qc.invalidateQueries({ queryKey: ["software", "server"] })
  qc.invalidateQueries({ queryKey: ["software", "runs"] })
}

// ---- Runs ----

export function useSoftwareRuns(
  ws: string | undefined,
  query: SoftwareRunsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: softwareKeys.runs(ws ?? "", query),
    queryFn: () => api.applications.listSoftwareRuns(ws ?? "", query),
    enabled: !!ws && enabled,
    placeholderData: keepPreviousData,
    refetchInterval: (q) =>
      q.state.data?.items.some((r) => !runFinished(r.state)) ? 3000 : 15_000,
  })
}

// One run with every step's output: polled every second while it goes.
export function useSoftwareRun(id: string | undefined) {
  return useQuery({
    queryKey: softwareKeys.run(id ?? ""),
    queryFn: () => api.applications.getSoftwareRun(id ?? ""),
    enabled: !!id,
    retry: notFound,
    refetchInterval: (q) =>
      q.state.data && !runFinished(q.state.data.state) ? 1000 : false,
  })
}

export function useStartSoftwareRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: StartSoftwareRunBody) =>
      api.applications.startSoftwareRun(body),
    onSuccess: ({ run }) => {
      qc.setQueryData(softwareKeys.run(run.id), run)
      invalidateLists(qc)
    },
  })
}

export function useCancelSoftwareRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.applications.cancelSoftwareRun(id),
    onSuccess: (run) => {
      qc.setQueryData(softwareKeys.run(run.id), run)
      invalidateLists(qc)
    },
  })
}

export function useDeleteSoftwareRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.applications.deleteSoftwareRun(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: softwareKeys.run(id) })
      qc.invalidateQueries({ queryKey: ["software", "runs"] })
    },
  })
}

// What stands in the way on each server; changes nothing.
export function usePreflight(body: SoftwarePreflightRequest | null) {
  return useQuery({
    queryKey: ["software", "preflight", body] as const,
    queryFn: () =>
      api.applications.softwarePreflight(body as SoftwarePreflightRequest),
    enabled: !!body && body.server_ids.length > 0,
    select: (d) => d.items,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  })
}

// ---- One install ----

// Secrets are never cached: the values live only in the component that
// asked, and the backend logs each reveal.
export function useRevealSecrets() {
  return useMutation({
    mutationFn: (id: string) => api.applications.revealSoftwareSecrets(id),
    gcTime: 0,
  })
}

export function useForgetInstall() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.applications.forgetSoftwareInstall(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: softwareKeys.install(id) })
      invalidateLists(qc)
    },
  })
}

// ---- Scans ----

export function useScanServer() {
  return useMutation({
    mutationFn: (serverId: string) =>
      api.applications.scanServerSoftware(serverId),
  })
}

export function useScanWorkspace() {
  return useMutation({
    mutationFn: (ws: string) => api.applications.scanWorkspaceSoftware(ws),
  })
}

// ---- Custom recipes ----

// The body the backend takes: the generated type has read-only fields too.
export function recipeBody(r: Recipe): Recipe {
  const { $schema: _, ...rest } = r
  return rest
}

export function useSaveRecipe(ws: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (r: Recipe) =>
      r.record_id
        ? api.applications.updateSoftwareRecipe(r.record_id, recipeBody(r))
        : api.applications.createSoftwareRecipe(ws, recipeBody(r)),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: softwareKeys.catalog(ws) }),
  })
}

export function useDeleteRecipe(ws: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (recordId: string) =>
      api.applications.deleteSoftwareRecipe(recordId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: softwareKeys.catalog(ws) }),
  })
}
