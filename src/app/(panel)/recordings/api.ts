"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { ApiError, api } from "@/lib/api"
import type { RecordingSettings, TerminalRecording } from "@/lib/services"

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
