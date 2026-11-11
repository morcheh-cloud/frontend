"use client"

import { useQuery } from "@tanstack/react-query"
import { formatValue } from "@/app/(panel)/alerts/components/rules-meta"
import { useCronjobs } from "@/app/(panel)/cronjobs/api"
import { backupsHref } from "@/app/(panel)/databases/[id]/components/backups/meta"
import { statusMeta as dbStatusMeta } from "@/app/(panel)/databases/components/meta"
import { dnsStatusMeta } from "@/app/(panel)/dns/components/meta"
import {
  needsSetup,
  proxyStatusMeta,
} from "@/app/(panel)/proxy/components/meta"
import { keys, type ListQuery } from "@/app/(panel)/servers/api"
import { statusMeta } from "@/app/(panel)/servers/components/meta"
import { useApps } from "@/app/(panel)/services/api"
import { monitorHref } from "@/app/(panel)/uptime/components/monitor-menu"
import { isActive, useJobList } from "@/components/jobs/api"
import {
  alertRulesQuery,
  backupProblemsQuery,
  cronjobBroken,
  databaseBroken,
  databasesQuery,
  dnsServerBroken,
  dnsServersQuery,
  facetsQuery,
  monitorBroken,
  monitorsQuery,
  problemStatuses,
  proxiesQuery,
  proxyBroken,
  STATUS_POLL,
  softwareBroken,
  softwareInstallsQuery,
  storagesQuery,
} from "@/components/panel/problems"
import { useWorkspace } from "@/components/panel/workspace"
import { api } from "@/lib/api"
import type {
  App,
  Database,
  Job,
  Proxy as ReverseProxy,
  Schedule,
  Server,
  SoftwareInstall,
  UptimeMonitor,
} from "@/lib/services"

// Everything the home page shows, read from the same queries (and cache) as
// the sections themselves, so opening a section after Home is instant and the
// numbers always agree with the menu's red counts.

export type Kind =
  | "server"
  | "database"
  | "storage"
  | "dns"
  | "proxy"
  | "cronjob"
  | "application"
  | "monitor"
  | "alert"
export type Tone = "destructive" | "warning"

export type Issue = {
  key: string
  kind: Kind
  name: string
  status: string
  detail: string
  href: string
  tone: Tone
}

// How a section's things are doing: ok, warn and bad are real statuses; idle
// is not checked yet or paused.
export type Tally = {
  total: number
  ok: number
  warn: number
  bad: number
  idle: number
}

const emptyTally: Tally = { total: 0, ok: 0, warn: 0, bad: 0, idle: 0 }

// The servers with a connection problem, listed by name. The count comes from
// the facets, so this list only needs the first few.
export const BROKEN_SHOWN = 8
const brokenQuery: ListQuery = {
  status: [...problemStatuses],
  sort: "name",
  limit: BROKEN_SHOWN,
}

const favoritesQuery: ListQuery = { favorites: true, limit: 6 }
const firstServersQuery: ListQuery = { limit: 6 }

const toneOf = (status: string): Tone =>
  status === "auth_failed" || status === "blocked" ? "warning" : "destructive"

function useServerList(query: ListQuery, enabled = true) {
  return useQuery({
    queryKey: keys.list(query),
    queryFn: () => api.servers.listServers(query),
    refetchInterval: STATUS_POLL,
    enabled,
  })
}

export function useHome() {
  const { workspace } = useWorkspace()
  const facets = useQuery(facetsQuery)
  const brokenCount =
    facets.data?.status
      .filter((f) => (problemStatuses as readonly string[]).includes(f.value))
      .reduce((n, f) => n + f.count, 0) ?? 0
  const broken = useServerList(brokenQuery, brokenCount > 0)
  const favorites = useServerList(favoritesQuery)
  const noFavorites = favorites.isSuccess && favorites.data.items.length === 0
  const first = useServerList(firstServersQuery, noFavorites)

  const storages = useQuery(storagesQuery)
  const databases = useQuery(databasesQuery)
  const backups = useQuery(backupProblemsQuery(workspace?.id ?? ""))
  const dns = useQuery(dnsServersQuery)
  const proxies = useQuery(proxiesQuery)
  const cronjobs = useCronjobs(workspace?.id)
  const software = useQuery(softwareInstallsQuery(workspace?.id ?? ""))
  const monitors = useQuery(monitorsQuery(workspace?.id ?? ""))
  const alertRules = useQuery(alertRulesQuery(workspace?.id ?? ""))
  const apps = useApps()
  const jobs = useJobList()

  const issues: Issue[] = []
  for (const s of brokenCount > 0 ? (broken.data?.items ?? []) : []) {
    issues.push({
      key: `server:${s.id}`,
      kind: "server",
      name: s.name,
      status: statusMeta[s.status].label,
      detail: s.status_message || s.host,
      href: `/servers/${s.id}`,
      tone: toneOf(s.status),
    })
  }
  for (const d of databases.data?.items ?? []) {
    if (!databaseBroken(d)) continue
    const down = d.status !== "online"
    const check = d.checks.find((c) => c.level === "critical" && !c.muted)
    issues.push({
      key: `database:${d.id}`,
      kind: "database",
      name: d.name,
      status: down ? dbStatusMeta[d.status].label : "Critical",
      detail: down
        ? d.status_message || dbStatusMeta[d.status].hint
        : (check?.title ?? "A check is critical"),
      href: `/databases/${d.id}`,
      tone: down ? toneOf(d.status) : "destructive",
    })
  }
  for (const s of storages.data?.items ?? []) {
    if (!(problemStatuses as readonly string[]).includes(s.status)) continue
    issues.push({
      key: `storage:${s.id}`,
      kind: "storage",
      name: s.name,
      status: statusMeta[s.status].label,
      detail: s.status_message,
      href: `/storage/${s.id}`,
      tone: toneOf(s.status),
    })
  }
  for (const s of dns.data?.items ?? []) {
    if (!dnsServerBroken(s)) continue
    issues.push({
      key: `dns:${s.id}`,
      kind: "dns",
      name: s.name,
      status: dnsStatusMeta[s.status].label,
      detail: s.status_message || s.url,
      href: `/dns/${s.id}`,
      tone: toneOf(s.status),
    })
  }
  for (const p of proxies.data?.items ?? []) {
    if (!proxyBroken(p)) continue
    const sites = p.status === "online"
    issues.push({
      key: `proxy:${p.id}`,
      kind: "proxy",
      name: `${p.kind_label} on ${p.server_name}`,
      status: sites
        ? `${p.host_problems} site${p.host_problems === 1 ? "" : "s"} changed`
        : proxyStatusMeta[p.status].label,
      detail: sites
        ? "Their files on the server aren't what Morcheh wrote."
        : p.status_message || proxyStatusMeta[p.status].hint,
      href: `/proxy/${p.id}`,
      tone: p.status === "stopped" || sites ? "warning" : "destructive",
    })
  }
  for (const c of cronjobs.data ?? []) {
    if (!cronjobBroken(c)) continue
    const failed = c.last_run?.state === "failed"
    issues.push({
      key: `cronjob:${c.id}`,
      kind: "cronjob",
      name: c.name,
      status: c.problem ? "Can't run" : `Last run ${runWord(c)}`,
      detail: c.problem || c.last_run?.error || "",
      href: `/cronjobs/${c.id}`,
      tone: c.problem || failed ? "destructive" : "warning",
    })
  }
  for (const i of software.data?.items ?? []) {
    if (!softwareBroken(i)) continue
    const bad = i.status === "failed" || i.status === "missing"
    issues.push({
      key: `application:${i.id}`,
      kind: "application",
      name: `${i.name} on ${i.server_name}`,
      status:
        i.status === "failed"
          ? "Failed"
          : i.status === "missing"
            ? "Not found"
            : i.state === "partial"
              ? "Partly running"
              : "Stopped",
      detail: i.error || (bad ? "" : "Its containers aren't all running."),
      href: `/servers/${i.server_id}/applications`,
      tone: bad ? "destructive" : "warning",
    })
  }
  for (const m of monitors.data ?? []) {
    const degraded = !m.paused && m.status === "degraded"
    if (!monitorBroken(m) && !degraded) continue
    issues.push({
      key: `monitor:${m.id}`,
      kind: "monitor",
      name: m.name,
      status: degraded ? "Slow" : "Down",
      detail: m.status_message,
      href: monitorHref(m.id),
      tone: degraded ? "warning" : "destructive",
    })
  }
  // Alert rules firing right now: one row per rule and server.
  for (const r of alertRules.data ?? []) {
    if (!r.enabled) continue
    for (const st of r.states) {
      if (st.state !== "firing") continue
      issues.push({
        key: `alert:${r.id}:${st.server_id}`,
        kind: "alert",
        name: `${st.server_name} · ${r.name}`,
        status: r.severity === "critical" ? "Critical" : "Warning",
        detail:
          r.metric === "offline"
            ? st.detail
            : `${formatValue(r.metric, st.value)}${st.detail ? ` on ${st.detail}` : ""}`,
        href: `/servers/${st.server_id}/metrics`,
        tone: r.severity === "critical" ? "destructive" : "warning",
      })
    }
  }
  for (const b of backups.data ?? []) {
    issues.push({
      key: `backup:${b.plan_id}`,
      kind: "database",
      name: `${b.database_name} · ${b.plan_name}`,
      status: "Backup failed",
      detail: b.error,
      href: backupsHref(b.database_id),
      tone: "destructive",
    })
  }
  issues.sort((a, b) => rank(a.tone) - rank(b.tone))

  return {
    workspace,
    ready:
      !facets.isPending &&
      !storages.isPending &&
      !databases.isPending &&
      !dns.isPending,
    issues,
    // Problem servers beyond the ones listed.
    moreBroken: Math.max(0, brokenCount - BROKEN_SHOWN),
    tallies: {
      servers: serverTally(facets.data),
      databases: databaseTally(databases.data?.items),
      storage: statusTally(storages.data?.items),
      dns: statusTally(dns.data?.items),
      proxy: proxyTally(proxies.data?.items),
      cronjobs: cronTally(cronjobs.data),
      applications: softwareTally(software.data?.items),
      uptime: monitorTally(monitors.data),
    },
    serverTotal: facets.data?.total,
    servers: {
      favorites: !noFavorites,
      items: (noFavorites ? first.data?.items : favorites.data?.items) ?? [],
      pending: favorites.isPending || (noFavorites && first.isPending),
    },
    apps: launchable(apps.data?.items),
    appCount: apps.data?.items.length,
    criticalApps: apps.data?.items.filter((a) => a.critical).length ?? 0,
    jobs: recentJobs(jobs.data),
    activeJobs: (jobs.data ?? []).filter(isActive).length,
    upcoming: upcoming(cronjobs.data),
    // Applications and servers with an update waiting.
    softwareUpdates:
      (software.data?.items.filter((i) => i.update_available).length ?? 0) +
      (software.data?.hosts.filter((h) => h.upgradable > 0).length ?? 0),
  }
}

export type Home = ReturnType<typeof useHome>

const rank = (t: Tone) => (t === "destructive" ? 0 : 1)

const runWords: Partial<Record<string, string>> = {
  failed: "failed",
  partial: "partly failed",
  interrupted: "interrupted",
}
const runWord = (c: Schedule) => runWords[c.last_run?.state ?? ""] ?? "failed"

function serverTally(
  facets:
    | { total: number; status: { value: string; count: number }[] }
    | undefined,
): Tally {
  if (!facets) return emptyTally
  const t = { ...emptyTally, total: facets.total }
  for (const f of facets.status) add(t, f.value as Server["status"], f.count)
  return t
}

function add(t: Tally, status: string, n = 1) {
  if (status === "online") t.ok += n
  else if (status === "unknown") t.idle += n
  else if (toneOf(status) === "warning") t.warn += n
  else t.bad += n
}

function statusTally(items: { status: string }[] | undefined): Tally {
  const t = { ...emptyTally, total: items?.length ?? 0 }
  for (const s of items ?? []) add(t, s.status)
  return t
}

function proxyTally(items: ReverseProxy[] | undefined): Tally {
  const t = { ...emptyTally, total: items?.length ?? 0 }
  for (const p of items ?? []) {
    if (p.status === "unknown" || needsSetup(p)) t.idle++
    else if (!proxyBroken(p)) t.ok++
    else if (p.status === "stopped" || p.status === "online") t.warn++
    else t.bad++
  }
  return t
}

function databaseTally(items: Database[] | undefined): Tally {
  const t = { ...emptyTally, total: items?.length ?? 0 }
  for (const d of items ?? []) {
    if (d.paused || d.status === "unknown") t.idle++
    else if (d.status !== "online") add(t, d.status)
    else if (d.health === "critical") t.bad++
    else if (d.health === "warning") t.warn++
    else t.ok++
  }
  return t
}

function cronTally(items: Schedule[] | undefined): Tally {
  const t = { ...emptyTally, total: items?.length ?? 0 }
  for (const c of items ?? []) {
    if (!c.enabled) t.idle++
    else if (cronjobBroken(c)) {
      if (c.problem || c.last_run?.state === "failed") t.bad++
      else t.warn++
    } else t.ok++
  }
  return t
}

function softwareTally(items: SoftwareInstall[] | undefined): Tally {
  const t = { ...emptyTally, total: items?.length ?? 0 }
  for (const i of items ?? []) {
    if (i.status === "failed" || i.status === "missing") t.bad++
    else if (i.status !== "installed") t.idle++
    else if (softwareBroken(i)) t.warn++
    else t.ok++
  }
  return t
}

function monitorTally(items: UptimeMonitor[] | undefined): Tally {
  const t = { ...emptyTally, total: items?.length ?? 0 }
  for (const m of items ?? []) {
    if (m.paused || m.status === "pending") t.idle++
    else if (m.status === "up") t.ok++
    else if (m.status === "degraded") t.warn++
    else t.bad++
  }
  return t
}

// Critical services first, then the order the team gave them.
function launchable(items: App[] | undefined) {
  return [...(items ?? [])]
    .sort(
      (a, b) =>
        Number(b.critical) - Number(a.critical) || a.position - b.position,
    )
    .slice(0, 12)
}

// Running first, then the newest.
function recentJobs(jobs: Job[] | undefined) {
  const list = jobs ?? []
  return [...list.filter(isActive), ...list.filter((j) => !isActive(j))].slice(
    0,
    5,
  )
}

function upcoming(items: Schedule[] | undefined) {
  return (items ?? [])
    .filter((c) => c.enabled && c.next_run_at)
    .sort(
      (a, b) =>
        Date.parse(a.next_run_at ?? "") - Date.parse(b.next_run_at ?? ""),
    )
    .slice(0, 4)
}
