"use client"

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { ApiError, api } from "@/lib/api"
import type {
  CommandLogEntry,
  CommandLogSettings,
  RecordingSettings,
  TerminalRecording,
} from "@/lib/services"

export type RecordingsQuery = NonNullable<
  Parameters<typeof api.terminalRecordings.listWorkspaceRecordings>[1]
>

export const recordingKeys = {
  all: ["terminal-recordings"] as const,
  list: (ws: string, query: RecordingsQuery) =>
    ["terminal-recordings", "list", ws, query] as const,
  server: (id: string, query: RecordingsQuery) =>
    ["terminal-recordings", "server", id, query] as const,
  one: (id: string) => ["terminal-recordings", "one", id] as const,
  settings: (ws: string) => ["terminal-recordings", "settings", ws] as const,
}

const retry = (count: number, error: Error) =>
  !(error instanceof ApiError && [403, 404].includes(error.status)) && count < 2

// Lists refresh while a shell is still being recorded, so its length and end
// show up without a reload.
const whileLive = (items?: TerminalRecording[]) =>
  items?.some((r) => r.live) ? 10_000 : false

export function useRecordings(ws: string | undefined, query: RecordingsQuery) {
  return useQuery({
    queryKey: recordingKeys.list(ws ?? "", query),
    queryFn: () =>
      api.terminalRecordings.listWorkspaceRecordings(ws ?? "", query),
    enabled: !!ws,
    placeholderData: keepPreviousData,
    refetchInterval: (q) => whileLive(q.state.data?.items),
  })
}

export function useServerRecordings(
  serverId: string,
  query: RecordingsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: recordingKeys.server(serverId, query),
    queryFn: () => api.terminalRecordings.listServerRecordings(serverId, query),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: (q) => whileLive(q.state.data?.items),
  })
}

export function useRecording(id: string) {
  return useQuery({
    queryKey: recordingKeys.one(id),
    queryFn: () => api.terminalRecordings.getRecording(id),
    retry,
    refetchInterval: (q) => (q.state.data?.live ? 5000 : false),
  })
}

export function useRecordingSettings(ws: string | undefined) {
  return useQuery({
    queryKey: recordingKeys.settings(ws ?? ""),
    queryFn: () => api.terminalRecordings.getRecordingSettings(ws ?? ""),
    enabled: !!ws,
    retry,
  })
}

export function useSetRecordingSettings(ws: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { enabled: boolean; keep_days: number }) =>
      api.terminalRecordings.setRecordingSettings(ws, body),
    onSuccess: (saved: RecordingSettings) => {
      queryClient.setQueryData(recordingKeys.settings(ws), saved)
      // Open terminals learn it on their next shell.
      void queryClient.invalidateQueries({ queryKey: ["terminals"] })
    },
  })
}

export function useDeleteRecording() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.terminalRecordings.deleteRecording(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: recordingKeys.one(id) })
      void queryClient.invalidateQueries({
        queryKey: recordingKeys.all,
        predicate: (q) => q.queryKey[1] !== "one",
      })
    },
  })
}

// The asciicast file (not JSON, so not through the generated client).
export function castUrl(id: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || window.location.origin
  return new URL(`/terminal-recordings/${id}/cast`, base).toString()
}

export async function downloadCast(
  r: Pick<TerminalRecording, "id" | "server_name" | "started_at">,
) {
  const res = await fetch(castUrl(r.id), { credentials: "include" })
  if (!res.ok) throw new Error("Couldn't download the recording.")
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const day = r.started_at.slice(0, 16).replace(/[:T]/g, "-")
  a.href = url
  a.download = `${r.server_name.replace(/[^\w.-]+/g, "-")}-${day}.cast`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---- Command log ----

export type CommandLogQuery = NonNullable<
  Parameters<typeof api.commandLog.listWorkspaceCommandLog>[1]
>

// Filters as kept in the URL; `period` becomes `since` when a page is asked
// for, so the key doesn't change every millisecond.
export type CommandFilters = Omit<
  CommandLogQuery,
  "since" | "until" | "before" | "limit"
> & { period?: string }

export const commandKeys = {
  all: ["command-log"] as const,
  list: (scope: string, id: string, f: CommandFilters) =>
    ["command-log", "list", scope, id, f] as const,
  recording: (id: string) => ["command-log", "recording", id] as const,
  facets: (scope: string, id: string, mine: boolean) =>
    ["command-log", "facets", scope, id, mine] as const,
  one: (id: string) => ["command-log", "one", id] as const,
  settings: (ws: string) => ["command-log", "settings", ws] as const,
}

const periodMs: Record<string, number> = {
  "1h": 3600_000,
  "24h": 86_400_000,
  "7d": 7 * 86_400_000,
  "30d": 30 * 86_400_000,
}

// The request query for filters (and a page cursor).
export function commandQuery(
  f: CommandFilters,
  before?: string,
  limit = 50,
): CommandLogQuery {
  const { period, ...rest } = f
  const ms = period ? periodMs[period] : undefined
  return {
    ...rest,
    since: ms ? new Date(Date.now() - ms).toISOString() : undefined,
    before,
    limit,
  }
}

// Lists refresh on their own; faster while something still runs.
const commandPoll = (items?: CommandLogEntry[]) =>
  items?.some((c) => c.status === "running") ? 5000 : 15_000

// A workspace's (`server` unset) or a server's command log, page by page.
export function useCommandLog(
  scope: { workspace: string } | { server: string },
  filters: CommandFilters,
) {
  const [kind, id] =
    "server" in scope
      ? ["server", scope.server]
      : ["workspace", scope.workspace]
  return useInfiniteQuery({
    queryKey: commandKeys.list(kind, id, filters),
    queryFn: ({ pageParam, signal }) => {
      const q = commandQuery(filters, pageParam)
      return kind === "server"
        ? api.commandLog.listServerCommandLog(id, q, { signal })
        : api.commandLog.listWorkspaceCommandLog(id, q, { signal })
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next || undefined,
    enabled: !!id,
    placeholderData: keepPreviousData,
    refetchInterval: (q) =>
      commandPoll(q.state.data?.pages.flatMap((p) => p.items)),
  })
}

// The commands typed while a recording ran, to jump to in the player.
export function useRecordingCommands(
  r: Pick<TerminalRecording, "id" | "server_id" | "live"> | undefined,
) {
  return useQuery({
    queryKey: commandKeys.recording(r?.id ?? ""),
    queryFn: () =>
      api.commandLog.listServerCommandLog(r?.server_id ?? "", {
        recording: r?.id,
        entry: "command",
        limit: 200,
      }),
    enabled: !!r?.server_id,
    select: (d) => [...d.items].reverse(),
    refetchInterval: r?.live ? 10_000 : false,
  })
}

export function useCommandFacets(
  scope: { workspace: string } | { server: string },
  mine: boolean,
) {
  const [kind, id] =
    "server" in scope
      ? ["server", scope.server]
      : ["workspace", scope.workspace]
  return useQuery({
    queryKey: commandKeys.facets(kind, id, mine),
    queryFn: () =>
      kind === "server"
        ? api.commandLog.serverCommandLogFacets(id, { mine: mine || undefined })
        : api.commandLog.workspaceCommandLogFacets(id, {
            mine: mine || undefined,
          }),
    enabled: !!id,
    staleTime: 60_000,
    retry,
  })
}

export function useCommandEntry(id: string | null, initial?: CommandLogEntry) {
  return useQuery({
    queryKey: commandKeys.one(id ?? ""),
    queryFn: () => api.commandLog.getCommandLog(id ?? ""),
    enabled: !!id,
    initialData: initial,
    // The list row has no output: always read the entry itself on open.
    initialDataUpdatedAt: 0,
    retry,
    // While it runs, and once more just after it ends: its output is
    // written a moment after the row.
    refetchInterval: (q) => {
      const c = q.state.data
      if (c?.status === "running") return 3000
      const ended = c?.ended_at ? Date.parse(c.ended_at) : 0
      if (c && !c.output && Date.now() - ended < 3000) return 1500
      return false
    },
  })
}

export function useCommandLogSettings(ws: string | undefined) {
  return useQuery({
    queryKey: commandKeys.settings(ws ?? ""),
    queryFn: () => api.commandLog.getCommandLogSettings(ws ?? ""),
    enabled: !!ws,
    retry,
  })
}

export function useSetCommandLogSettings(ws: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      body: Omit<
        CommandLogSettings,
        "$schema" | "updated_at" | "updated_by_name"
      >,
    ) => api.commandLog.setCommandLogSettings(ws, body),
    onSuccess: (saved: CommandLogSettings) => {
      queryClient.setQueryData(commandKeys.settings(ws), saved)
    },
  })
}

// The CSV export (not JSON, so not through the generated client), with the
// list's filters.
export async function downloadCommandLog(
  scope: { workspace: string } | { server: string },
  filters: CommandFilters,
  // Whose log: the workspace's or the server's name.
  label: string,
) {
  const base = process.env.NEXT_PUBLIC_API_URL || window.location.origin
  const path =
    "server" in scope
      ? `/servers/${scope.server}/command-log/export`
      : `/workspaces/${scope.workspace}/command-log/export`
  const url = new URL(path, base)
  const { limit: _, ...q } = commandQuery(filters)
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === "" || v === false) continue
    for (const one of Array.isArray(v) ? v : [v])
      url.searchParams.append(k, String(one))
  }
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) {
    let detail = "Couldn't export the command log."
    try {
      detail = ((await res.json()) as { detail?: string }).detail || detail
    } catch {}
    throw new ApiError(res.status, detail)
  }
  const day = new Date().toISOString().slice(0, 10)
  const name = `commands-${label.replace(/[^\w.-]+/g, "-")}-${day}.csv`
  const href = URL.createObjectURL(await res.blob())
  const a = document.createElement("a")
  a.href = href
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
