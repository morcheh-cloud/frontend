"use client"

import { useQuery } from "@tanstack/react-query"

import { useAlertEvents } from "@/app/(panel)/alerts/api"
import { useFleetHosts, useProxyTraffic } from "@/app/(panel)/proxy/api"
import { sumTraffic } from "@/app/(panel)/proxy/components/live"
import { hostName } from "@/app/(panel)/proxy/components/meta"
import { useServerInsights } from "@/app/(panel)/servers/api"
import { buildModel } from "@/app/(panel)/servers/components/insights/model"
import { useIncidents } from "@/app/(panel)/uptime/api"
import {
  alertRulesQuery,
  monitorsQuery,
  proxiesQuery,
} from "@/components/panel/problems"
import { useWorkspace } from "@/components/panel/workspace"
import type {
  ProxyFleetHost,
  ProxyHostTraffic,
  ProxyTraffic,
} from "@/lib/services"
import type { Home } from "./api"

// The live half of Home: charts, trends and activity. Each piece reads the
// same query (and cache) as the page it links to, so the numbers agree.

export function useHomeLive() {
  const { workspace } = useWorkspace()
  const ws = workspace?.id ?? ""
  const day = useServerInsights("24h")
  const model = day.data ? buildModel(day.data) : null

  const monitors = useQuery(monitorsQuery(ws))
  const rules = useQuery(alertRulesQuery(ws))
  const proxies = useQuery(proxiesQuery)
  const hasProxies = (proxies.data?.items.length ?? 0) > 0
  const traffic = useProxyTraffic("", hasProxies)
  const fleet = useFleetHosts()
  const alertEvents = useAlertEvents({ limit: 40 })
  const incidents = useIncidents(false)

  const enabled = (rules.data ?? []).filter((r) => r.enabled)
  const firing = enabled.flatMap((r) =>
    r.states
      .filter((s) => s.state === "firing")
      .map(() => ({ critical: r.severity === "critical" })),
  )

  return {
    model,
    modelPending: day.isPending,
    serverEvents: day.data?.events ?? [],
    monitors: monitors.data,
    monitorsPending: monitors.isPending,
    alerts: {
      rules: enabled.length,
      firing: firing.length,
      critical: firing.filter((f) => f.critical).length,
    },
    alertEvents: alertEvents.data ?? [],
    incidents: incidents.data ?? [],
    hasProxies,
    proxiesPending: proxies.isPending,
    traffic: hasProxies && traffic.data ? siteTraffic(traffic.data) : null,
    trafficSites: topSites(traffic.data?.hosts, fleet.data?.items),
  }
}

export type HomeLive = ReturnType<typeof useHomeLive>

function siteTraffic(data: ProxyTraffic) {
  return { ...sumTraffic(data.hosts), minutes: data.minutes }
}

// The busiest sites over the last 30 minutes, by name.
function topSites(
  hosts: ProxyHostTraffic[] | undefined,
  fleet: ProxyFleetHost[] | undefined,
) {
  const names = new Map((fleet ?? []).map((f) => [f.host.id, hostName(f.host)]))
  const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
  return (hosts ?? [])
    .map((h) => ({
      id: h.host_id,
      proxyId: h.proxy_id,
      name: names.get(h.host_id) ?? "A site",
      requests: total(h.requests),
      errors: total(h.server_errors),
    }))
    .filter((s) => s.requests > 0)
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 5)
}

// ---- health score ----

export type Health = {
  score: number
  tone: "success" | "warning" | "destructive"
  label: string
  ok: number
  warn: number
  bad: number
  idle: number
}

// One number for the whole workspace: everything checked counts, down = 0,
// needs a look = half. Firing alerts and failed backups count as their own
// things, so a busy CPU lowers the score too.
export function healthOf(home: Home): Health | null {
  let ok = 0
  let warn = 0
  let bad = 0
  let idle = 0
  for (const t of Object.values(home.tallies)) {
    ok += t.ok
    warn += t.warn
    bad += t.bad
    idle += t.idle
  }
  for (const i of home.issues) {
    if (i.kind !== "alert" && !i.key.startsWith("backup:")) continue
    if (i.tone === "destructive") bad++
    else warn++
  }
  const n = ok + warn + bad
  if (!home.ready || n === 0) return null
  const score = Math.round((100 * (ok + warn / 2)) / n)
  return {
    score,
    tone: bad ? "destructive" : warn ? "warning" : "success",
    label:
      score >= 98
        ? "Excellent"
        : score >= 90
          ? "Good"
          : score >= 75
            ? "Fair"
            : "At risk",
    ok,
    warn,
    bad,
    idle,
  }
}
