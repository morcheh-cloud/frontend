"use client"

import {
  type QueryClient,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { type InsightsRange, timeZone } from "@/components/insights/format"
import { STATUS_POLL } from "@/components/panel/problems"
import { API_URL, ApiError, api } from "@/lib/api"
import type {
  Backup,
  BackupPlanBody,
  BackupRestore,
  Database,
  DatabaseBody,
  DatabaseHistory,
  DatabaseTestBody,
  RestoreBody,
  UpdateDatabaseMonitoringRequest,
} from "@/lib/services"

type List = { items: Database[] }

// ["databases", "list", serverId?] for the lists, ["databases", id] for one.
export const keys = {
  all: ["databases"] as const,
  list: (serverId?: string) =>
    ["databases", "list", serverId ?? "all"] as const,
  detail: (id: string) => ["databases", id] as const,
  live: (id: string) => ["database-live", id] as const,
  history: (id: string, range: DatabaseHistory["range"]) =>
    ["database-history", id, range] as const,
}

// Health changes on the backend's own schedule (each database's interval),
// so the lists re-read it. The workspace-wide one ("all") is the menu's
// databasesQuery too.
export function useDatabases(serverId?: string) {
  return useQuery({
    queryKey: keys.list(serverId),
    queryFn: () =>
      api.databases.listDatabases(serverId ? { server_id: serverId } : {}),
    refetchInterval: STATUS_POLL,
  })
}

export function useDatabase(id: string) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => api.databases.getDatabase(id),
    placeholderData: () => {
      for (const [, data] of queryClient.getQueriesData<List>({
        queryKey: [...keys.all, "list"],
      })) {
        const hit = data?.items.find((d) => d.id === id)
        if (hit) return hit
      }
    },
    refetchInterval: STATUS_POLL,
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 2,
  })
}

// What the database is doing right now. The backend reuses a snapshot younger
// than 3 s, so several open tabs don't multiply the load on the database.
export function useDatabaseLive(id: string, enabled = true) {
  return useQuery({
    queryKey: keys.live(id),
    queryFn: () => api.databases.getDatabaseLive(id),
    enabled,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    retry: false,
  })
}

export function useDatabaseHistory(
  id: string,
  range: DatabaseHistory["range"],
) {
  return useQuery({
    queryKey: keys.history(id, range),
    queryFn: () => api.databases.getDatabaseHistory(id, { range }),
    refetchInterval: 60_000,
  })
}

export function useDatabaseEvents(id: string) {
  return useQuery({
    queryKey: ["database-events", id],
    queryFn: () => api.databases.listDatabaseEvents(id, { limit: 50 }),
    refetchInterval: 30_000,
  })
}

// The checks the backend knows, with their default limits. Fixed per build.
export function useDatabaseChecks() {
  return useQuery({
    queryKey: ["database-checks"],
    queryFn: () => api.databases.listDatabaseChecks(),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useOutboundIp(enabled: boolean) {
  return useQuery({
    queryKey: ["database-outbound-ip"],
    queryFn: () => api.databases.getDatabaseOutboundIp(),
    enabled,
    staleTime: 10 * 60_000,
    retry: false,
  })
}

// Puts a database the API answered into its page and every list holding it,
// then refetches the lists (order, server filters) in the background.
function store(queryClient: QueryClient, d: Database) {
  queryClient.setQueryData(keys.detail(d.id), d)
  queryClient.setQueriesData<List>(
    { queryKey: [...keys.all, "list"] },
    (data) =>
      data && {
        ...data,
        items: data.items.map((x) => (x.id === d.id ? d : x)),
      },
  )
  return queryClient.invalidateQueries({ queryKey: [...keys.all, "list"] })
}

export function useCreateDatabase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: DatabaseBody) => api.databases.createDatabase(body),
    onSuccess: (d) => store(queryClient, d),
  })
}

export function useUpdateDatabase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DatabaseBody }) =>
      api.databases.updateDatabase(id, body),
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: keys.live(d.id) })
      return store(queryClient, d)
    },
  })
}

export function useDeleteDatabase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.databases.deleteDatabase(id),
    onSuccess: (_, id) => {
      queryClient.setQueriesData<List>(
        { queryKey: [...keys.all, "list"] },
        (data) =>
          data && { ...data, items: data.items.filter((d) => d.id !== id) },
      )
      // Not the detail query: a still-open page would refetch a 404.
      queryClient.removeQueries({ queryKey: keys.live(id) })
      return queryClient.invalidateQueries({ queryKey: [...keys.all, "list"] })
    },
  })
}

export function useTestDatabase() {
  return useMutation({
    mutationFn: (body: DatabaseTestBody) =>
      api.databases.testDatabaseConnection(body),
  })
}

const checkKey = ["check-database"]

export function useCheckDatabase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: checkKey,
    mutationFn: ({ id }: { id: string; name?: string }) =>
      api.databases.checkDatabase(id),
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: keys.live(d.id) })
      queryClient.invalidateQueries({ queryKey: ["database-events", d.id] })
      return store(queryClient, d)
    },
  })
}

// Ids with a check in flight, so their status can show a spinner.
export function useCheckingDatabases() {
  const ids = useMutationState({
    filters: { mutationKey: checkKey, status: "pending" },
    select: (m) => (m.state.variables as { id: string } | undefined)?.id,
  })
  return new Set(ids.filter(Boolean))
}

function useFlag<K extends "favorite" | "paused">(
  key: K,
  send: (id: string, on: boolean) => Promise<Database>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => send(id, on),
    // Flip it right away; the answer replaces it.
    onMutate: ({ id, on }) => {
      queryClient.setQueryData<Database>(
        keys.detail(id),
        (d) => d && { ...d, [key]: on },
      )
      queryClient.setQueriesData<List>(
        { queryKey: [...keys.all, "list"] },
        (data) =>
          data && {
            ...data,
            items: data.items.map((d) =>
              d.id === id ? { ...d, [key]: on } : d,
            ),
          },
      )
    },
    onSuccess: (d) => store(queryClient, d),
    onError: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  })
}

export const useSetDatabaseFavorite = () =>
  useFlag("favorite", (id, favorite) =>
    api.databases.setDatabaseFavorite(id, { favorite }),
  )

export const useSetDatabasePaused = () =>
  useFlag("paused", (id, paused) =>
    api.databases.setDatabasePaused(id, { paused }),
  )

export function useUpdateMonitoring() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: UpdateDatabaseMonitoringRequest
    }) => api.databases.updateDatabaseMonitoring(id, body),
    onSuccess: (d) => store(queryClient, d),
  })
}

// Decrypted password: never cached past the layer that shows it.
export function useDatabaseCredentials(id: string) {
  return useQuery({
    queryKey: ["database-credentials", id],
    queryFn: () => api.databases.revealDatabaseCredentials(id),
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

// The saved password for the edit form's eye.
export function useRevealDatabaseCredentials(id?: string) {
  return useMutation({
    mutationFn: () => api.databases.revealDatabaseCredentials(id ?? ""),
    gcTime: 0,
  })
}

export function useKillSession(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { session: string; connection: boolean }) =>
      api.databases.killDatabaseSession(id, {
        id: v.session,
        connection: v.connection,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.live(id) }),
  })
}

export function useExplain(id: string) {
  return useMutation({
    mutationFn: (v: { query: string; database?: string }) =>
      api.databases.explainDatabaseQuery(id, v),
  })
}

export const databaseInsightsKeys = {
  all: ["database-insights"] as const,
  range: (range: InsightsRange) => ["database-insights", range] as const,
}

// Availability, load and size from the monitor's samples (one a minute).
export function useDatabaseInsights(range: InsightsRange) {
  return useQuery({
    queryKey: databaseInsightsKeys.range(range),
    queryFn: () => api.databases.databaseInsights({ range, tz: timeZone() }),
    refetchInterval: 60_000,
    placeholderData: (previous) => previous,
  })
}

// Backups (the Backups tab). Everything sits under one root, so a finished
// job (`refreshAfterJob`) refreshes it all.
export const backupKeys = {
  all: ["database-backups"] as const,
  plans: (id: string) => ["database-backups", "plans", id] as const,
  list: (id: string, limit: number) =>
    ["database-backups", "list", id, limit] as const,
  one: (id: string) => ["database-backups", "one", id] as const,
  plan: (id: string) => ["database-backups", "plan", id] as const,
  options: (id: string) => ["database-backups", "options", id] as const,
  restores: (id: string) => ["database-backups", "restores", id] as const,
}

export const backupActive = (b: Pick<Backup, "state">) =>
  b.state === "queued" || b.state === "running"

const BACKUP_POLL = 3_000

export function useBackupPlans(id: string) {
  return useQuery({
    queryKey: backupKeys.plans(id),
    queryFn: () => api.databaseBackups.listDatabaseBackupPlans(id),
    select: (l) => l.items,
    refetchInterval: (q) =>
      q.state.data?.items.some((p) => p.running) ? BACKUP_POLL : STATUS_POLL,
  })
}

export function useBackups(id: string, limit: number) {
  return useQuery({
    queryKey: backupKeys.list(id, limit),
    queryFn: () => api.databaseBackups.listDatabaseBackups(id, { limit }),
    placeholderData: (previous) => previous,
    refetchInterval: (q) =>
      q.state.data?.items.some(backupActive) ? BACKUP_POLL : STATUS_POLL,
  })
}

export function useBackup(id: string | undefined) {
  return useQuery({
    queryKey: backupKeys.one(id ?? ""),
    queryFn: () => api.databaseBackups.getDatabaseBackup(id ?? ""),
    enabled: !!id,
    refetchInterval: (q) =>
      q.state.data && backupActive(q.state.data) ? BACKUP_POLL : false,
  })
}

// One plan, for its editor page. No polling: the form is a draft over it.
export function useBackupPlan(id: string | undefined) {
  return useQuery({
    queryKey: backupKeys.plan(id ?? ""),
    queryFn: () => api.databaseBackups.getDatabaseBackupPlan(id ?? ""),
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

// What a plan can choose from on this database: its databases, which ways of
// selecting them work, and whether incremental backups do. Owner only.
export function useBackupOptions(id: string, enabled = true) {
  return useQuery({
    queryKey: backupKeys.options(id),
    queryFn: () => api.databaseBackups.getDatabaseBackupOptions(id),
    enabled,
    staleTime: 60_000,
  })
}

export const restoreActive = (r: Pick<BackupRestore, "state">) =>
  r.state === "queued" || r.state === "running"

export function useRestores(id: string) {
  return useQuery({
    queryKey: backupKeys.restores(id),
    queryFn: () => api.databaseBackups.listDatabaseRestores(id),
    select: (l) => l.items,
    refetchInterval: (q) =>
      q.state.data?.items.some(restoreActive) ? BACKUP_POLL : STATUS_POLL,
  })
}

// Every write changes what the tab, the menu's count and Home show.
function useBackupWrite<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: backupKeys.all }),
  })
}

export function useSavePlan(databaseId: string) {
  return useBackupWrite((v: { id?: string; body: BackupPlanBody }) =>
    v.id
      ? api.databaseBackups.updateDatabaseBackupPlan(v.id, v.body)
      : api.databaseBackups.createDatabaseBackupPlan(databaseId, v.body),
  )
}

export const useDeletePlan = () =>
  useBackupWrite((id: string) =>
    api.databaseBackups.deleteDatabaseBackupPlan(id),
  )

// These two answer with a job: hand it to `track`.
export const useRunPlan = () =>
  useBackupWrite((id: string) => api.databaseBackups.runDatabaseBackupPlan(id))

export const useVerifyBackup = () =>
  useBackupWrite((id: string) => api.databaseBackups.verifyDatabaseBackup(id))

export const useCancelBackup = () =>
  useBackupWrite((id: string) => api.databaseBackups.cancelDatabaseBackup(id))

// Answers with a job: hand it to `track`.
export const useRestoreBackup = () =>
  useBackupWrite((v: { id: string; body: RestoreBody }) =>
    api.databaseBackups.restoreDatabaseBackup(v.id, v.body),
  )

export const useDeleteBackup = () =>
  useBackupWrite((id: string) => api.databaseBackups.deleteDatabaseBackup(id))

// A plain link: the browser streams the file to disk, however big it is.
// `storage` picks the copy; empty = the first stored one.
export function downloadBackup(id: string, storage?: string) {
  const a = document.createElement("a")
  const q = storage ? `?storage=${encodeURIComponent(storage)}` : ""
  a.href = `${API_URL || window.location.origin}/database-backups/${id}/download${q}`
  a.rel = "noopener"
  document.body.append(a)
  a.click()
  a.remove()
}
