"use client"

import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect } from "react"

import type { Server, Stats, StatsProblem } from "@/lib/services"

// How far back the CPU sparkline reaches.
export const CPU_WINDOW_MS = 3 * 60 * 1000

export type CpuSample = { at: number; percent: number }
export type ServerStats = {
  stats?: Stats
  cpu: CpuSample[]
  // Why stats aren't coming in right now; cleared by the next sample.
  problem?: StatsProblem
  // False while the browser is reconnecting the stream.
  live: boolean
}

// Not under ["servers"]: server mutations invalidate that whole tree.
const statsKey = (id: string) => ["server-stats", id] as const
const empty: ServerStats = { cpu: [], live: false }

// Live usage from the backend's stats stream (an SSE event every second).
// Every component showing it shares one EventSource per server; the samples,
// and the CPU history built from them, live in the query cache, so they
// survive a trip to another section and back.
export function useServerStats(server: Server) {
  const queryClient = useQueryClient()
  // Unreachable servers already explain themselves in the status banner.
  const enabled = server.status === "online" || server.status === "unknown"

  useEffect(() => {
    if (enabled) return watch(queryClient, server.id)
  }, [enabled, queryClient, server.id])

  const { data } = useQuery({
    queryKey: statsKey(server.id),
    queryFn: () =>
      queryClient.getQueryData<ServerStats>(statsKey(server.id)) ?? empty,
    enabled: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
  return { enabled, ...(data ?? empty) }
}

// 422: not a Linux server, so the backend stopped trying.
export function unsupported(problem: StatsProblem) {
  return problem.status === 422
}

// The stream isn't in the generated client (EventSource can't use it).
function statsStreamUrl(serverId: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || window.location.origin
  return new URL(`/servers/${serverId}/stats/stream`, base).toString()
}

// ---- One stream per server, ref-counted ----

const streams = new Map<
  string,
  { users: number; close: () => void; idle?: number }
>()

function watch(queryClient: QueryClient, id: string) {
  let entry = streams.get(id)
  if (!entry) {
    entry = { users: 0, close: connect(queryClient, id) }
    streams.set(id, entry)
  }
  const current = entry
  current.users++
  window.clearTimeout(current.idle)
  return () => {
    current.users--
    if (current.users > 0) return
    // A moment's grace, so a remount (navigating, Strict Mode) keeps it.
    current.idle = window.setTimeout(() => {
      current.close()
      streams.delete(id)
    }, 2000)
  }
}

// Keeps an EventSource open while the tab is visible. The browser reconnects
// a dropped stream by itself; we only step in when it gives up (CLOSED).
function connect(queryClient: QueryClient, id: string) {
  const key = statsKey(id)
  const update = (fn: (prev: ServerStats) => ServerStats) =>
    queryClient.setQueryData<ServerStats>(key, (prev) => fn(prev ?? empty))

  let source: EventSource | null = null
  let retry: number | undefined

  function open() {
    const cached = queryClient.getQueryData<ServerStats>(key)
    if (source || document.hidden || cached?.problem?.retrying === false) return
    const es = new EventSource(statsStreamUrl(id), { withCredentials: true })
    source = es

    es.addEventListener("stats", (e) => {
      const stats = JSON.parse(e.data) as Stats
      const at = Date.parse(stats.collected_at)
      update((prev) => ({
        stats,
        cpu: [
          ...prev.cpu.filter((s) => at - s.at < CPU_WINDOW_MS && s.at < at),
          { at, percent: stats.cpu.usage_percent },
        ],
        live: true,
      }))
    })
    es.addEventListener("problem", (e) => {
      const problem = JSON.parse(e.data) as StatsProblem
      update((prev) => ({ ...prev, problem }))
      if (!problem.retrying) shut()
    })
    es.addEventListener("error", () => {
      update((prev) => ({ ...prev, live: false }))
      if (es.readyState !== EventSource.CLOSED) return
      source = null
      update((prev) => ({
        ...prev,
        problem: prev.problem ?? {
          status: 0,
          detail: "Can't reach the backend",
          retrying: true,
        },
      }))
      retry = window.setTimeout(open, 5000)
    })
  }

  function shut() {
    source?.close()
    source = null
    window.clearTimeout(retry)
    update((prev) => ({ ...prev, live: false }))
  }

  // A hidden tab doesn't need a sample a second.
  const onVisibility = () => (document.hidden ? shut() : open())
  document.addEventListener("visibilitychange", onVisibility)
  open()
  return () => {
    document.removeEventListener("visibilitychange", onVisibility)
    shut()
  }
}
