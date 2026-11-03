"use client"

import { queryOptions, useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { Database, Server, Storage } from "@/lib/services"
import { databasesItem, serversItem, storageItem } from "./nav"

// What the menu shows in red next to a section: how many of its things are
// broken. Servers, storages and databases are re-checked by the backend on
// its own; the panel only re-reads their statuses.

// Statuses that mean the panel can't reach or log in to a server or storage.
export const problemStatuses = [
  "unreachable",
  "auth_failed",
  "host_key_mismatch",
  "error",
] as const satisfies (Server["status"] & Storage["status"])[]

const problems: readonly string[] = problemStatuses

// How often statuses on screen are re-read (SERVER_CHECK_INTERVAL and
// STORAGE_CHECK_INTERVAL on the backend decide how often they change).
export const STATUS_POLL = 10_000

// The servers list's counts (current workspace). The sidebar reads it too.
export const facetsQuery = queryOptions({
  queryKey: ["servers", "facets"] as const,
  queryFn: () => api.servers.getServerFacets(),
  refetchInterval: STATUS_POLL,
})

// Shared with /storage and the "Send to…" dialog.
export const storagesQuery = queryOptions({
  queryKey: ["storages"] as const,
  queryFn: () => api.storage.listStorages(),
  refetchInterval: STATUS_POLL,
})

// Every database in the workspace, as /databases lists them.
export const databasesQuery = queryOptions({
  queryKey: ["databases", "list", "all"] as const,
  queryFn: () => api.databases.listDatabases({}),
  refetchInterval: STATUS_POLL,
})

// A database is broken when it can't be reached or a check is critical.
// Paused ones aren't watched, so they never count.
export const databaseBroken = (
  d: Pick<Database, "paused" | "status" | "health">,
) =>
  !d.paused &&
  ((d.status !== "online" && d.status !== "unknown") ||
    (d.status === "online" && d.health === "critical"))

export type NavAlert = { count: number; label: string }

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

// How many servers in the current workspace have a connection problem.
export function useServerProblems() {
  const { data } = useQuery({
    ...facetsQuery,
    select: (facets) =>
      facets.status
        .filter((f) => problems.includes(f.value))
        .reduce((n, f) => n + f.count, 0),
  })
  return data ?? 0
}

export function useStorageProblems() {
  const { data } = useQuery({
    ...storagesQuery,
    select: (list) =>
      list.items.filter((s) => problems.includes(s.status)).length,
  })
  return data ?? 0
}

export function useDatabaseProblems() {
  const { data } = useQuery({
    ...databasesQuery,
    select: (list) => list.items.filter(databaseBroken).length,
  })
  return data ?? 0
}

// The red counts for the menu, by section href.
export function useNavAlerts() {
  const servers = useServerProblems()
  const storages = useStorageProblems()
  const databases = useDatabaseProblems()
  const alerts = new Map<string, NavAlert>()
  if (servers > 0) {
    alerts.set(serversItem.href, {
      count: servers,
      label: `${plural(servers, "server", "servers")} not connected`,
    })
  }
  if (storages > 0) {
    alerts.set(storageItem.href, {
      count: storages,
      label: `${plural(storages, "storage", "storages")} not connected`,
    })
  }
  if (databases > 0) {
    alerts.set(databasesItem.href, {
      count: databases,
      label: `${plural(databases, "database", "databases")} down or critical`,
    })
  }
  return alerts
}
