"use client"

import { queryOptions, useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type {
  Database,
  DNSServer,
  Proxy as ReverseProxy,
  Schedule,
  Server,
  Storage,
} from "@/lib/services"
import {
  cronjobsItem,
  databasesItem,
  dnsItem,
  proxyItem,
  serversItem,
  storageItem,
} from "./nav"
import { useWorkspace } from "./workspace"

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

// Shared with /dns. The backend re-checks them (DNS_CHECK_INTERVAL).
export const dnsServersQuery = queryOptions({
  queryKey: ["dns-servers"] as const,
  queryFn: () => api.dns.listDnsServers(),
  refetchInterval: STATUS_POLL,
})

// A DNS server Morcheh can't reach or log in to. Not yet checked = fine.
export const dnsServerBroken = (s: Pick<DNSServer, "status">) =>
  s.status !== "online" && s.status !== "unknown"

// Shared with /proxy. The backend re-checks them (PROXY_CHECK_INTERVAL).
export const proxiesQuery = queryOptions({
  queryKey: ["proxies"] as const,
  queryFn: () => api.reverseProxy.listProxies(),
  refetchInterval: STATUS_POLL,
})

// A proxy that isn't serving its sites as the panel wrote them. Not checked
// yet = fine; not set up yet is a step to take, not a fault.
export const proxyBroken = (
  p: Pick<ReverseProxy, "status" | "host_problems" | "host_count">,
) =>
  p.status === "stopped" ||
  p.status === "config_error" ||
  p.status === "unreachable" ||
  p.status === "error" ||
  (p.status === "online" && p.host_problems > 0)

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

// A cron job needs a look when it can't run or its last run didn't fully
// work. Paused ones don't count.
export const cronjobBroken = (
  s: Pick<Schedule, "enabled" | "problem" | "last_run">,
) =>
  s.enabled &&
  (!!s.problem ||
    (!!s.last_run &&
      ["failed", "partial", "interrupted"].includes(s.last_run.state)))

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

export function useDNSProblems() {
  const { data } = useQuery({
    ...dnsServersQuery,
    select: (list) => list.items.filter(dnsServerBroken).length,
  })
  return data ?? 0
}

export function useProxyProblems() {
  const { data } = useQuery({
    ...proxiesQuery,
    select: (list) => list.items.filter(proxyBroken).length,
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

// Same query (and cache) as /cronjobs.
export function useCronjobProblems() {
  const { workspace } = useWorkspace()
  const ws = workspace?.id ?? ""
  const { data } = useQuery({
    queryKey: ["cronjobs", "list", ws],
    queryFn: () => api.cronJobs.listSchedules(ws),
    enabled: !!ws,
    refetchInterval: STATUS_POLL,
    select: (list) => list.items.filter(cronjobBroken).length,
  })
  return data ?? 0
}

// Backups that failed on their last run, across the workspace (Home and the
// menu). Paused plans aren't counted. Under the backups' own root, so a
// finished job refreshes it too.
export const backupProblemsQuery = (workspace: string) =>
  queryOptions({
    queryKey: ["database-backups", "problems", workspace] as const,
    queryFn: () => api.databaseBackups.listDatabaseBackupProblems(),
    enabled: !!workspace,
    refetchInterval: STATUS_POLL,
    select: (l) => l.items,
  })

function useBackupProblems() {
  const { workspace } = useWorkspace()
  const { data } = useQuery(backupProblemsQuery(workspace?.id ?? ""))
  return data?.length ?? 0
}

// The red counts for the menu, by section href.
export function useNavAlerts() {
  const servers = useServerProblems()
  const storages = useStorageProblems()
  const databases = useDatabaseProblems()
  const backups = useBackupProblems()
  const cronjobs = useCronjobProblems()
  const dns = useDNSProblems()
  const proxies = useProxyProblems()
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
  if (databases + backups > 0) {
    alerts.set(databasesItem.href, {
      count: databases + backups,
      label: [
        databases > 0 &&
          `${plural(databases, "database", "databases")} down or critical`,
        backups > 0 &&
          `${plural(backups, "backup plan", "backup plans")} failing`,
      ]
        .filter(Boolean)
        .join(", "),
    })
  }
  if (dns > 0) {
    alerts.set(dnsItem.href, {
      count: dns,
      label: `${plural(dns, "DNS server", "DNS servers")} not connected`,
    })
  }
  if (proxies > 0) {
    alerts.set(proxyItem.href, {
      count: proxies,
      label: `${plural(proxies, "proxy", "proxies")} need attention`,
    })
  }
  if (cronjobs > 0) {
    alerts.set(cronjobsItem.href, {
      count: cronjobs,
      label: `${plural(cronjobs, "cron job", "cron jobs")} failing`,
    })
  }
  return alerts
}
