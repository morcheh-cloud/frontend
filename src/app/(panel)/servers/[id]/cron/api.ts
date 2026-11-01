"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { type ApiError, api } from "@/lib/api"
import type {
  CronJobInput,
  CronOverview,
  CronRunBody,
  CronRunResult,
  CronTable,
  CronTimerActionRequest,
} from "@/lib/services"

export const cronKeys = {
  all: (serverId: string) => ["cron", serverId] as const,
  overview: (serverId: string) => ["cron", serverId, "overview"] as const,
  history: (serverId: string) => ["cron", serverId, "history"] as const,
}

// One SSH round trip reads every crontab, timer and periodic script.
export function useCron(serverId: string) {
  return useQuery({
    queryKey: cronKeys.overview(serverId),
    queryFn: () => api.cron.getCron(serverId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

// Recent runs from the server's cron log; only used for "Last run".
export function useCronHistory(serverId: string, enabled: boolean) {
  return useQuery({
    queryKey: cronKeys.history(serverId),
    queryFn: () => api.cron.cronHistory(serverId),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

type TableEdit =
  | { kind: "add"; table: string; job: CronJobInput }
  | {
      kind: "update"
      table: string
      revision: string
      line: number
      job: CronJobInput
    }
  | { kind: "delete"; table: string; revision: string; lines: number[] }
  | {
      kind: "enable"
      table: string
      revision: string
      lines: number[]
      enabled: boolean
    }
  | { kind: "save"; table: string; revision: string; content: string }

// `kind` only picks the endpoint: the API rejects unknown body fields.
function send(serverId: string, e: TableEdit): Promise<CronTable> {
  switch (e.kind) {
    case "add": {
      const { kind: _, ...body } = e
      return api.cron.addCronJob(serverId, body)
    }
    case "update": {
      const { kind: _, ...body } = e
      return api.cron.updateCronJob(serverId, body)
    }
    case "delete": {
      const { kind: _, ...body } = e
      return api.cron.deleteCronJobs(serverId, body)
    }
    case "enable": {
      const { kind: _, ...body } = e
      return api.cron.enableCronJobs(serverId, body)
    }
    case "save": {
      const { kind: _, ...body } = e
      return api.cron.saveCrontab(serverId, body)
    }
  }
}

// Every change to a table answers with the table as written, which replaces
// (or adds) it in the cached overview: no second round trip.
export function useEditTable(serverId: string) {
  const qc = useQueryClient()
  return useMutation<CronTable, ApiError, TableEdit>({
    mutationFn: (e) => send(serverId, e),
    onSuccess: (table) => {
      qc.setQueryData<CronOverview>(cronKeys.overview(serverId), (o) => {
        if (!o) return o
        const i = o.tables.findIndex((t) => t.id === table.id)
        const tables = [...o.tables]
        if (i >= 0) tables[i] = table
        else tables.push(table)
        return { ...o, tables }
      })
    },
    onError: (error) => {
      // Someone changed the table meanwhile: show what is there now.
      if (error.status === 409) {
        qc.invalidateQueries({ queryKey: cronKeys.overview(serverId) })
      }
    },
  })
}

export function useRunCommand(serverId: string) {
  return useMutation<CronRunResult, ApiError, CronRunBody>({
    mutationFn: (body) => api.cron.runCronCommand(serverId, body),
  })
}

export function useTimerAction(serverId: string) {
  const qc = useQueryClient()
  return useMutation<void, ApiError, CronTimerActionRequest>({
    mutationFn: (body) => api.cron.cronTimerAction(serverId, body),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: cronKeys.overview(serverId) }),
  })
}
