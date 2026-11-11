"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { type ApiError, api } from "@/lib/api"
import type {
  Process,
  ProcessDetails,
  ProcessesReport,
  ProcessResult,
  ProcessTarget,
  SignalProcessesInputBody,
} from "@/lib/services"

export type Signal = SignalProcessesInputBody["signal"]

export const processKeys = {
  all: (serverId: string) => ["processes", serverId] as const,
  list: (serverId: string) => ["processes", serverId, "list"] as const,
  details: (serverId: string, pid: number, start: number) =>
    ["processes", serverId, "details", pid, start] as const,
}

// A process by PID and start time: a reused PID is another process.
export const keyOf = (p: { pid: number; start: number }) =>
  `${p.pid}:${p.start}`
export const targetOf = (p: Process): ProcessTarget => ({
  pid: p.pid,
  start: p.start,
})

// How many samples each process keeps for its sparkline.
export const HISTORY = 40

export type ProcessesData = ProcessesReport & {
  // CPU % of one core per process (by keyOf), oldest first.
  history: Record<string, number[]>
  // The whole server's CPU %, oldest first.
  total: number[]
}

const push = (list: number[] | undefined, v: number) =>
  [...(list ?? []), v].slice(-HISTORY)

// Every process with a 1 s CPU sample. Each answer adds to the CPU history
// kept with the previous one, so sparklines grow while the page is open.
export function useProcesses(serverId: string, interval: number | false) {
  const qc = useQueryClient()
  return useQuery<ProcessesData, ApiError>({
    queryKey: processKeys.list(serverId),
    queryFn: async ({ signal }) => {
      const r = await api.processes.listProcesses(serverId, { signal })
      const prev = qc.getQueryData<ProcessesData>(processKeys.list(serverId))
      const history: Record<string, number[]> = {}
      for (const p of r.processes) {
        if (p.kernel) continue
        const k = keyOf(p)
        history[k] = push(prev?.history[k], p.cpu)
      }
      return { ...r, history, total: push(prev?.total, r.cpu_percent) }
    },
    refetchInterval: interval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    staleTime: 1_000,
  })
}

export function useProcessDetails(
  serverId: string,
  p: { pid: number; start: number } | null,
  live: boolean,
) {
  return useQuery<ProcessDetails, ApiError>({
    queryKey: processKeys.details(serverId, p?.pid ?? 0, p?.start ?? 0),
    queryFn: () =>
      api.processes.getProcess(serverId, p?.pid ?? 0, { start: p?.start ?? 0 }),
    enabled: p !== null,
    // An ended process stays ended.
    retry: (n, e) => e.status !== 404 && n < 2,
    refetchInterval: (q) =>
      live && q.state.error?.status !== 404 ? 10_000 : false,
    refetchOnWindowFocus: false,
    staleTime: 5_000,
  })
}

type Change = { targets: ProcessTarget[]; force?: boolean }

// Signals and priority changes answer per process; the list is read again
// afterwards so ended ones leave it.
export function useSignal(serverId: string) {
  const qc = useQueryClient()
  return useMutation<ProcessResult[], ApiError, Change & { signal: Signal }>({
    mutationFn: (body) =>
      api.processes.signalProcesses(serverId, body).then((r) => r.results),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: processKeys.all(serverId) }),
  })
}

export function useRenice(serverId: string) {
  const qc = useQueryClient()
  return useMutation<ProcessResult[], ApiError, Change & { nice: number }>({
    mutationFn: (body) =>
      api.processes.reniceProcesses(serverId, body).then((r) => r.results),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: processKeys.all(serverId) }),
  })
}
