"use client"

import type { LucideIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { useWorkspaceCan } from "@/app/(panel)/servers/components/permissions"
import {
  applicationsItem,
  cronjobsItem,
  databasesItem,
  dnsItem,
  proxyItem,
  serversItem,
  servicesItem,
  storageItem,
  uptimeItem,
} from "@/components/panel/nav"
import { queueIntent } from "@/hooks/useIntent"
import { cn } from "@/lib/utils"
import type { Home, Kind, Tally } from "../api"

export const kindItem: Record<Kind, { label: string; icon: LucideIcon }> = {
  server: { label: "Server", icon: serversItem.icon },
  database: { label: "Database", icon: databasesItem.icon },
  storage: { label: "Storage", icon: storageItem.icon },
  dns: { label: "DNS server", icon: dnsItem.icon },
  proxy: { label: "Reverse proxy", icon: proxyItem.icon },
  cronjob: { label: "Cron job", icon: cronjobsItem.icon },
  application: { label: "Application", icon: applicationsItem.icon },
  monitor: { label: "Monitor", icon: uptimeItem.icon },
}

export type Summary = {
  key: string
  label: string
  href: string
  icon: LucideIcon
  tally?: Tally
  total: number | undefined
  caption: string
  /** Shown in red next to the label: things that are broken. */
  alert: number
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`

// "12 online · 1 down · 2 not checked", only the parts that aren't zero.
function caption(t: Tally, words: { ok: string; idle: string }) {
  if (t.total === 0) return "None yet"
  const parts = [
    t.ok && `${t.ok} ${words.ok}`,
    t.bad && `${t.bad} down`,
    t.warn && `${t.warn} need a look`,
    t.idle && `${t.idle} ${words.idle}`,
  ].filter(Boolean)
  return parts.join(" · ")
}

const connected = { ok: "online", idle: "not checked" }

// One entry per section, in the sidebar's order.
export function summaries(home: Home): Summary[] {
  const { tallies: t } = home
  const cronWords = { ok: "healthy", idle: "paused" }
  return [
    {
      key: "servers",
      ...serversItem,
      tally: t.servers,
      total: home.serverTotal,
      caption: caption(t.servers, connected),
      alert: t.servers.bad + t.servers.warn,
    },
    {
      key: "databases",
      ...databasesItem,
      tally: t.databases,
      total: t.databases.total,
      caption: caption(t.databases, { ok: "healthy", idle: "paused or new" }),
      alert: t.databases.bad,
    },
    {
      key: "storage",
      ...storageItem,
      tally: t.storage,
      total: t.storage.total,
      caption: caption(t.storage, connected),
      alert: t.storage.bad + t.storage.warn,
    },
    {
      key: "dns",
      ...dnsItem,
      tally: t.dns,
      total: t.dns.total,
      caption: caption(t.dns, connected),
      alert: t.dns.bad + t.dns.warn,
    },
    {
      key: "proxy",
      ...proxyItem,
      tally: t.proxy,
      total: t.proxy.total,
      caption: caption(t.proxy, { ok: "running", idle: "new or not set up" }),
      alert: t.proxy.bad + t.proxy.warn,
    },
    {
      key: "cronjobs",
      ...cronjobsItem,
      tally: t.cronjobs,
      total: t.cronjobs.total,
      caption: caption(t.cronjobs, cronWords),
      alert: t.cronjobs.bad + t.cronjobs.warn,
    },
    {
      key: "services",
      ...servicesItem,
      total: home.appCount,
      caption:
        home.appCount === 0
          ? "None yet"
          : home.criticalApps
            ? `${plural(home.criticalApps, "critical service")} pinned first`
            : "Your team's web tools in one place",
      alert: 0,
    },
    {
      key: "applications",
      ...applicationsItem,
      tally: t.applications,
      total: t.applications.total,
      caption:
        t.applications.total === 0
          ? "None yet"
          : [
              caption(t.applications, { ok: "running", idle: "busy" }),
              home.softwareUpdates && plural(home.softwareUpdates, "update"),
            ]
              .filter(Boolean)
              .join(" · "),
      alert: t.applications.bad + t.applications.warn,
    },
    {
      key: "uptime",
      ...uptimeItem,
      tally: t.uptime,
      total: t.uptime.total,
      caption: caption(t.uptime, { ok: "up", idle: "paused or new" }),
      alert: t.uptime.bad,
    },
  ]
}

// A thin bar split by status: online, needs a look, down, not checked.
export function HealthBar({
  tally,
  className,
}: {
  tally?: Tally
  className?: string
}) {
  const parts = tally
    ? [
        { n: tally.ok, cls: "bg-success" },
        { n: tally.warn, cls: "bg-warning" },
        { n: tally.bad, cls: "bg-destructive" },
        { n: tally.idle, cls: "bg-mist" },
      ].filter((p) => p.n > 0)
    : []
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-1.5 gap-0.5 overflow-hidden rounded-full",
        className,
      )}
    >
      {parts.length === 0 ? (
        <span className="flex-1 bg-muted" />
      ) : (
        parts.map((p) => (
          <span key={p.cls} className={p.cls} style={{ flexGrow: p.n }} />
        ))
      )}
    </div>
  )
}

export function greeting(name: string) {
  const hour = new Date().getHours()
  const part =
    hour < 5
      ? "evening"
      : hour < 12
        ? "morning"
        : hour < 18
          ? "afternoon"
          : "evening"
  return name ? `Good ${part}, ${name}` : `Good ${part}`
}

export function statusLine(home: Home) {
  if (!home.ready) return "Checking everything…"
  const n = home.issues.length + home.moreBroken
  return n === 0
    ? "Everything is running."
    : `${plural(n, "thing needs", "things need")} a look.`
}

type AddAction = { label: string; href: string; intent?: string }

const addActions: AddAction[] = [
  { label: "Server", href: "/servers", intent: "add-server" },
  { label: "Database", href: "/databases", intent: "add-database" },
  { label: "Storage", href: "/storage", intent: "add-storage" },
  { label: "DNS server", href: "/dns", intent: "add-dns-server" },
  { label: "Reverse proxy", href: "/proxy", intent: "add-proxy" },
  { label: "Service", href: "/services", intent: "add-service" },
  { label: "Cron job", href: "/cronjobs/new" },
  { label: "Monitor", href: "/uptime/new" },
  { label: "Script", href: "/scripts/new" },
]

// What can be added from Home, the same list as the command palette's. Each
// one opens the section's own form (via its intent).
export function useAddActions() {
  const router = useRouter()
  const canAdd = useWorkspaceCan().addServer
  if (!canAdd) return []
  return addActions.map((a) => ({
    ...a,
    run: () => {
      if (a.intent) queueIntent(a.intent)
      router.push(a.href)
    },
  }))
}
