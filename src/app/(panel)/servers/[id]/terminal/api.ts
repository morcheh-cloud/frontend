"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { TerminalSession } from "@/lib/services"

export const terminalKeys = {
  list: (serverId: string) => ["terminals", serverId] as const,
}

// Shells the backend keeps running for this server, so tabs survive a reload.
export function useTerminals(serverId: string) {
  return useQuery({
    queryKey: terminalKeys.list(serverId),
    queryFn: () => api.terminal.listTerminals(serverId).then((r) => r.items),
    // Fresh on every visit (another tab may have opened or closed shells),
    // never behind the user's back while they work.
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  })
}

export function useRenameTerminal(serverId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ session, title }: { session: string; title: string }) =>
      api.terminal.renameTerminal(serverId, session, { title }),
    onSuccess: (updated) =>
      queryClient.setQueryData<TerminalSession[]>(
        terminalKeys.list(serverId),
        (old) => old?.map((t) => (t.id === updated.id ? updated : t)),
      ),
  })
}

export function useCloseTerminal(serverId: string) {
  return useMutation({
    mutationFn: (session: string) =>
      api.terminal.closeTerminal(serverId, session),
  })
}

// The terminal WebSocket isn't in the OpenAPI spec (raw route on the
// backend). Same host as the API, http → ws.
export function terminalSocketUrl(
  serverId: string,
  params: Record<string, string | number | undefined>,
) {
  const base = process.env.NEXT_PUBLIC_API_URL || window.location.origin
  const url = new URL(`/servers/${serverId}/terminals/connect`, base)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "")
      url.searchParams.set(key, `${value}`)
  }
  return url.toString()
}

// What the server sends as JSON text frames (terminal bytes are binary).
export type ControlMessage =
  | { type: "session"; id: string; title: string }
  | { type: "title"; title: string }
  | { type: "exit"; code?: number }
  | { type: "error"; status: number; message: string }
