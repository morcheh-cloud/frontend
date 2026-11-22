"use client"

import {
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { useRef } from "react"

import { type InsightsRange, timeZone } from "@/components/insights/format"
import { STATUS_POLL } from "@/components/panel/problems"
import { API_URL, ApiError, api } from "@/lib/api"
import type {
  Backup,
  BackupPlanBody,
  BackupRestore,
  Database,
  DatabaseBody,
  DatabaseChangeRequest,
  DatabaseHistory,
  DatabaseSavedQuery,
  DatabaseSavedQueryBody,
  DatabaseSavedView,
  DatabaseSavedViewBody,
  DatabaseSyncBody,
  DatabaseTestBody,
  EditRequest,
  Job,
  PitrBackupBody,
  PitrChangeOutputBody,
  PitrRemoveBody,
  PitrRestartBody,
  PitrRestoreBody,
  PitrSettingsBody,
  PitrStatus,
  RestoreBody,
  RestoreFileBody,
  RestoreFileSource,
  RowsRequest,
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
  list: (id: string, page: number) =>
    ["database-backups", "list", id, page] as const,
  one: (id: string) => ["database-backups", "one", id] as const,
  plan: (id: string) => ["database-backups", "plan", id] as const,
  options: (id: string) => ["database-backups", "options", id] as const,
  restores: (id: string, page: number) =>
    ["database-backups", "restores", id, page] as const,
  file: (id: string, source: RestoreFileSource) =>
    ["database-backups", "file", id, source] as const,
}

export const backupActive = (b: Pick<Backup, "state">) =>
  b.state === "queued" || b.state === "running"

const BACKUP_POLL = 3_000

// Rows per page in the Backups tab's lists.
export const BACKUP_PAGE = 20

export function useBackupPlans(id: string) {
  return useQuery({
    queryKey: backupKeys.plans(id),
    queryFn: () => api.databaseBackups.listDatabaseBackupPlans(id),
    select: (l) => l.items,
    refetchInterval: (q) =>
      q.state.data?.items.some((p) => p.running) ? BACKUP_POLL : STATUS_POLL,
  })
}

// One page (from 1) of a database's backups, newest first, with the total.
export function useBackups(id: string, page: number) {
  return useQuery({
    queryKey: backupKeys.list(id, page),
    queryFn: () =>
      api.databaseBackups.listDatabaseBackups(id, {
        limit: BACKUP_PAGE,
        offset: (page - 1) * BACKUP_PAGE,
      }),
    // The last page stays up while the next one loads (same database only).
    placeholderData: (previous, last) =>
      last?.queryKey[2] === id ? previous : undefined,
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

export function useRestores(id: string, page: number) {
  return useQuery({
    queryKey: backupKeys.restores(id, page),
    queryFn: () =>
      api.databaseBackups.listDatabaseRestores(id, {
        limit: BACKUP_PAGE,
        offset: (page - 1) * BACKUP_PAGE,
      }),
    // The last page stays up while the next one loads (same database only).
    placeholderData: (previous, last) =>
      last?.queryKey[2] === id ? previous : undefined,
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

// What a file on a storage or server is, and whether it can go into this
// database. Read again each time it's asked: the file may have changed.
export function useRestoreFileInfo(id: string, source?: RestoreFileSource) {
  return useQuery({
    queryKey: backupKeys.file(id, source ?? { path: "" }),
    queryFn: () =>
      api.databaseBackups.inspectDatabaseRestoreFile(id, {
        source: source as RestoreFileSource,
      }),
    enabled: !!source?.path,
    retry: false,
    staleTime: 0,
    gcTime: 60_000,
  })
}

// Answers with a job: hand it to `track`.
export const useRestoreFile = () =>
  useBackupWrite((v: { id: string; body: RestoreFileBody }) =>
    api.databaseBackups.restoreDatabaseFile(v.id, v.body),
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

// ── Database syncs (database → database) ────────────────────────────────

export const syncKeys = {
  all: ["database-syncs"] as const,
  list: (databaseId: string) => ["database-syncs", "list", databaseId] as const,
  one: (id: string) => ["database-syncs", "one", id] as const,
  runs: (id: string) => ["database-syncs", "runs", id] as const,
  run: (id: string) => ["database-syncs", "run", id] as const,
  tables: (databaseId: string, name: string) =>
    ["database-syncs", "tables", databaseId, name] as const,
}

export const syncRunActive = (r?: { state: string } | null) =>
  r?.state === "queued" || r?.state === "running"

// Every sync this database is the source or the target of.
export function useDatabaseSyncs(databaseId: string) {
  return useQuery({
    queryKey: syncKeys.list(databaseId),
    queryFn: () => api.databaseSyncs.listDatabaseSyncPlans(databaseId),
    select: (l) => l.items,
    refetchInterval: (q) =>
      q.state.data?.items.some((s) => syncRunActive(s.last_run))
        ? BACKUP_POLL
        : STATUS_POLL,
  })
}

export function useDatabaseSync(id?: string) {
  return useQuery({
    queryKey: syncKeys.one(id ?? ""),
    queryFn: () => api.databaseSyncs.getDatabaseSync(id ?? ""),
    enabled: !!id,
  })
}

export function useSyncRuns(id: string, enabled = true) {
  return useQuery({
    queryKey: syncKeys.runs(id),
    queryFn: () => api.databaseSyncs.listDatabaseSyncRuns(id, { limit: 50 }),
    select: (l) => l.items,
    enabled: enabled && !!id,
    refetchInterval: (q) =>
      q.state.data?.items.some(syncRunActive) ? BACKUP_POLL : STATUS_POLL,
  })
}

export function useSyncRun(id?: string) {
  return useQuery({
    queryKey: syncKeys.run(id ?? ""),
    queryFn: () => api.databaseSyncs.getDatabaseSyncRun(id ?? ""),
    enabled: !!id,
    refetchInterval: (q) => (syncRunActive(q.state.data) ? 1_500 : false),
  })
}

// The tables of one database on a server (with columns and keys), for the
// pickers. `name` empty = the connection's own database.
export function useSyncTables(databaseId: string, name: string, on = true) {
  return useQuery({
    queryKey: syncKeys.tables(databaseId, name),
    queryFn: () =>
      api.databaseSyncs.listDatabaseSyncTables(databaseId, { name }),
    enabled: on && !!databaseId,
    staleTime: 30_000,
    retry: false,
  })
}

function useSyncWrite<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: syncKeys.all }),
  })
}

export const useSaveSync = (workspaceId: string) =>
  useSyncWrite((v: { id?: string; body: DatabaseSyncBody }) =>
    v.id
      ? api.databaseSyncs.updateDatabaseSync(v.id, v.body)
      : api.databaseSyncs.createDatabaseSync(workspaceId, v.body),
  )

export const usePauseSync = () =>
  useSyncWrite((v: { id: string; paused: boolean }) =>
    api.databaseSyncs.pauseDatabaseSync(v.id, { paused: v.paused }),
  )

export const useDeleteSync = () =>
  useSyncWrite((id: string) => api.databaseSyncs.deleteDatabaseSync(id))

// Answers `{run, job}`: hand the job to `track`.
export const useRunSync = () =>
  useSyncWrite((v: { id: string; dry: boolean }) =>
    api.databaseSyncs.runDatabaseSync(v.id, { dry_run: v.dry }),
  )

export const useCancelSyncRun = () =>
  useSyncWrite((id: string) => api.databaseSyncs.cancelDatabaseSyncRun(id))

// ---- Data explorer: what a database holds, its rows, typed queries ----

export const explorerKeys = {
  all: (id: string) => ["database-explorer", id] as const,
  overview: (id: string, database: string) =>
    ["database-explorer", id, "overview", database] as const,
  object: (id: string, database: string, schema: string, name: string) =>
    ["database-explorer", id, "object", database, schema, name] as const,
  rows: (id: string, req: RowsRequest) =>
    ["database-explorer", id, "rows", req] as const,
  key: (id: string, database: string, key: string) =>
    ["database-explorer", id, "key", database, key] as const,
  saved: (id: string) => ["database-saved-queries", id] as const,
  runs: (id: string, who: "mine" | "all") =>
    ["database-query-runs", id, who] as const,
}

export function useExplorer(id: string, database: string, enabled = true) {
  return useQuery({
    queryKey: explorerKeys.overview(id, database),
    queryFn: () =>
      api.databaseExplorer.getDatabaseExplorer(id, {
        database: database || undefined,
      }),
    staleTime: 60_000,
    enabled,
    retry: false,
  })
}

export function useObjectInfo(
  id: string,
  database: string,
  schema: string,
  name: string,
  enabled = true,
) {
  return useQuery({
    queryKey: explorerKeys.object(id, database, schema, name),
    queryFn: () =>
      api.databaseExplorer.describeDatabaseObject(id, {
        database: database || undefined,
        schema: schema || undefined,
        name,
      }),
    enabled: enabled && !!name,
    staleTime: 60_000,
    retry: false,
  })
}

export function useRows(id: string, req: RowsRequest, enabled = true) {
  return useQuery({
    queryKey: explorerKeys.rows(id, req),
    queryFn: ({ signal }) =>
      api.databaseExplorer.listDatabaseRows(id, req, { signal }),
    enabled,
    placeholderData: (prev) => prev,
    staleTime: 15_000,
    retry: false,
  })
}

export function useRedisKey(id: string, database: string, key: string) {
  return useQuery({
    queryKey: explorerKeys.key(id, database, key),
    queryFn: () =>
      api.databaseExplorer.getDatabaseKey(id, {
        database: database || undefined,
        key,
      }),
    enabled: !!key,
    retry: false,
  })
}

export type RunInput = {
  change: boolean
  body: DatabaseChangeRequest
}

// One run at a time; stop() cancels the request, and the backend stops the
// statement with it.
export function useRunQuery(id: string) {
  const queryClient = useQueryClient()
  const ctrl = useRef<AbortController | null>(null)
  const mutation = useMutation({
    mutationFn: ({ change, body }: RunInput) => {
      ctrl.current?.abort()
      const c = new AbortController()
      ctrl.current = c
      const { confirm, ...read } = body
      return change
        ? api.databaseExplorer.runDatabaseChange(id, body, { signal: c.signal })
        : api.databaseExplorer.runDatabaseQuery(id, read, { signal: c.signal })
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: ["database-query-runs", id] })
      if (input.body.saved_id) {
        queryClient.invalidateQueries({ queryKey: explorerKeys.saved(id) })
      }
      // A change may have altered tables and rows.
      if (input.change) {
        queryClient.invalidateQueries({ queryKey: explorerKeys.all(id) })
      }
    },
  })
  return { ...mutation, stop: () => ctrl.current?.abort() }
}

export function useQueryRuns(id: string, who: "mine" | "all", enabled = true) {
  return useInfiniteQuery({
    queryKey: explorerKeys.runs(id, who),
    queryFn: ({ pageParam }) =>
      api.databaseExplorer.listDatabaseQueryRuns(id, {
        who,
        limit: 50,
        before: pageParam || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (last) =>
      last.items.length === 50 ? last.items[last.items.length - 1].at : null,
    enabled,
  })
}

export function useSavedQueries(id: string) {
  return useQuery({
    queryKey: explorerKeys.saved(id),
    queryFn: () => api.databaseExplorer.listDatabaseSavedQueries(id),
  })
}

export function useSaveQuery(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      queryId,
      body,
    }: {
      queryId?: string
      body: DatabaseSavedQueryBody
    }) =>
      queryId
        ? api.databaseExplorer.updateDatabaseSavedQuery(id, queryId, body)
        : api.databaseExplorer.createDatabaseSavedQuery(id, body),
    onSuccess: (saved) => {
      queryClient.setQueryData<{ items: DatabaseSavedQuery[] }>(
        explorerKeys.saved(id),
        (old) =>
          old && {
            items: [saved, ...old.items.filter((s) => s.id !== saved.id)].sort(
              (a, b) =>
                Number(b.pinned) - Number(a.pinned) ||
                a.title.localeCompare(b.title),
            ),
          },
      )
      queryClient.invalidateQueries({ queryKey: explorerKeys.saved(id) })
    },
  })
}

export function useDeleteSavedQuery(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (queryId: string) =>
      api.databaseExplorer.deleteDatabaseSavedQuery(id, queryId),
    onSuccess: (_d, queryId) => {
      queryClient.setQueryData<{ items: DatabaseSavedQuery[] }>(
        explorerKeys.saved(id),
        (old) => old && { items: old.items.filter((s) => s.id !== queryId) },
      )
    },
  })
}

// Redis keys by pattern, page after page by the SCAN cursor.
export function useRedisKeys(
  id: string,
  database: string,
  pattern: string,
  type: string,
) {
  return useInfiniteQuery({
    queryKey: [...explorerKeys.all(id), "keys", database, pattern, type],
    queryFn: ({ pageParam, signal }) =>
      api.databaseExplorer.listDatabaseRows(
        id,
        {
          database: database || undefined,
          where: pattern || undefined,
          filters: type
            ? [{ column: "type", op: "eq", value: type }]
            : undefined,
          cursor: pageParam || undefined,
          limit: 200,
          count: !pageParam,
        },
        { signal },
      ),
    initialPageParam: "",
    getNextPageParam: (last) => last.next_cursor || null,
    retry: false,
  })
}

// Add, change or remove rows (Owner). preview = only the statements.
export function useEditRows(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: EditRequest) =>
      api.databaseExplorer.editDatabaseRows(id, body),
    onSuccess: (res) => {
      if (!res.ran) return
      queryClient.invalidateQueries({ queryKey: explorerKeys.all(id) })
      queryClient.invalidateQueries({ queryKey: ["database-query-runs", id] })
    },
  })
}

type ViewTarget = { database: string; schema: string; table: string }

const viewsKey = (id: string, t: ViewTarget) =>
  ["database-saved-views", id, t.database, t.schema, t.table] as const

// A table's saved filters.
export function useSavedViews(id: string, t: ViewTarget) {
  return useQuery({
    queryKey: viewsKey(id, t),
    queryFn: () =>
      api.databaseExplorer.listDatabaseSavedViews(id, {
        database: t.database || undefined,
        schema: t.schema || undefined,
        table: t.table,
      }),
    enabled: !!t.table,
  })
}

export function useSaveView(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      viewId,
      body,
    }: {
      viewId?: string
      body: DatabaseSavedViewBody
    }) =>
      viewId
        ? api.databaseExplorer.updateDatabaseSavedView(id, viewId, body)
        : api.databaseExplorer.createDatabaseSavedView(id, body),
    onSuccess: (v: DatabaseSavedView) => {
      queryClient.invalidateQueries({
        queryKey: viewsKey(id, {
          database: v.database,
          schema: v.schema,
          table: v.table,
        }),
      })
    },
  })
}

export function useDeleteView(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: DatabaseSavedView) =>
      api.databaseExplorer.deleteDatabaseSavedView(id, v.id),
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({
        queryKey: viewsKey(id, {
          database: v.database,
          schema: v.schema,
          table: v.table,
        }),
      })
    },
  })
}

// ---- Continuous backup (point-in-time recovery, pgBackRest) ----

// Everything under one root: a finished database-pitr job refreshes it all
// (`refreshAfterJob`).
export const pitrKeys = {
  all: ["database-pitr"] as const,
  one: (id: string) => ["database-pitr", id] as const,
  runs: (id: string) => ["database-pitr", id, "runs"] as const,
  detect: (id: string) => ["database-pitr", id, "detect"] as const,
}

const pitrBusy = (s?: PitrStatus) => !!s?.active || s?.state === "setting_up"

export function usePitr(id: string) {
  return useQuery({
    queryKey: pitrKeys.one(id),
    queryFn: () => api.pointInTimeRecovery.getDatabasePitr(id),
    refetchInterval: (q) => (pitrBusy(q.state.data) ? 3_000 : 30_000),
  })
}

export function usePitrRuns(id: string, enabled = true) {
  return useQuery({
    queryKey: pitrKeys.runs(id),
    queryFn: () =>
      api.pointInTimeRecovery.listDatabasePitrRuns(id, { limit: 50 }),
    enabled,
    refetchInterval: (q) =>
      q.state.data?.items.some(
        (r) => r.state === "running" || r.state === "queued",
      )
        ? 3_000
        : 30_000,
  })
}

// What setting it up would change on the server. Owner + Engineer on it.
export function usePitrDetect(id: string, enabled = true) {
  return useQuery({
    queryKey: pitrKeys.detect(id),
    queryFn: () => api.pointInTimeRecovery.detectDatabasePitr(id),
    enabled,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

// Writes the answered status straight into the cache.
function usePitrChange<T, R extends PitrStatus | PitrChangeOutputBody>(
  id: string,
  fn: (v: T) => Promise<R>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (out) => {
      qc.setQueryData(pitrKeys.one(id), "status" in out ? out.status : out)
      qc.invalidateQueries({ queryKey: pitrKeys.runs(id) })
    },
  })
}

export const useSavePitr = (id: string) =>
  usePitrChange(id, (body: PitrSettingsBody) =>
    api.pointInTimeRecovery.saveDatabasePitr(id, body),
  )

export const useResetupPitr = (id: string) =>
  usePitrChange(id, (replace: boolean) =>
    api.pointInTimeRecovery.resetupDatabasePitr(id, {
      replace_archive_command: replace,
    }),
  )

export const useRestartPitr = (id: string) =>
  usePitrChange(id, (body: PitrRestartBody) =>
    api.pointInTimeRecovery.restartDatabasePitr(id, body),
  )

export const useRefreshPitr = (id: string) =>
  usePitrChange(id, () => api.pointInTimeRecovery.refreshDatabasePitr(id))

export function useCancelPitrRestart(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.pointInTimeRecovery.cancelDatabasePitrRestart(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: pitrKeys.all }),
  })
}

// The ones that answer a job: hand it to `useJobActions().track`.
function usePitrJob<T>(fn: (v: T) => Promise<Job>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: pitrKeys.all }),
  })
}

export const usePitrBackup = (id: string) =>
  usePitrJob((type: PitrBackupBody["type"]) =>
    api.pointInTimeRecovery.backupDatabasePitr(id, { type }),
  )

export const usePitrCheck = (id: string) =>
  usePitrJob(() => api.pointInTimeRecovery.checkDatabasePitr(id))

export const usePitrRestore = (id: string) =>
  usePitrJob((body: PitrRestoreBody) =>
    api.pointInTimeRecovery.restoreDatabasePitr(id, body),
  )

export const usePitrTeardown = (id: string) =>
  usePitrJob((run: string) =>
    api.pointInTimeRecovery.teardownDatabasePitrCopy(id, run),
  )

export const usePitrRemove = (id: string) =>
  usePitrJob((body: PitrRemoveBody) =>
    api.pointInTimeRecovery.removeDatabasePitr(id, body),
  )

// A mutation, never cached: the passphrase lives only where it's shown.
export const useRevealPitrPassphrase = (id: string) =>
  useMutation({
    mutationFn: () => api.pointInTimeRecovery.revealDatabasePitrPassphrase(id),
    gcTime: 0,
  })
