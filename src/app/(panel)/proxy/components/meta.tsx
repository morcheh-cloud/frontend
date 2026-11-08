import {
  ArrowRightLeft,
  CornerUpRight,
  FolderOpen,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"

import type {
  HostConfig,
  ProxyHostState,
  Proxy as ReverseProxy,
} from "@/lib/services"
import { cn } from "@/lib/utils"

export type ProxyStatus = ReverseProxy["status"]

export const proxyStatusMeta: Record<
  ProxyStatus,
  { label: string; dot: string; hint: string }
> = {
  online: {
    label: "Running",
    dot: "bg-success",
    hint: "Serving its sites.",
  },
  stopped: {
    label: "Stopped",
    dot: "bg-warning",
    hint: "Installed but not running: none of its sites answer.",
  },
  not_installed: {
    label: "Not installed",
    dot: "bg-mist",
    hint: "Set it up: Morcheh installs it with the server's package manager.",
  },
  not_set_up: {
    label: "Not set up",
    dot: "bg-mist",
    hint: "Installed, but Morcheh's sites aren't wired in yet. Set it up.",
  },
  config_error: {
    label: "Config error",
    dot: "bg-destructive",
    hint: "Its configuration test fails, so changes can't be loaded.",
  },
  unreachable: {
    label: "Unreachable",
    dot: "bg-destructive",
    hint: "Morcheh couldn't reach the server over SSH.",
  },
  error: {
    label: "Error",
    dot: "bg-destructive",
    hint: "Morcheh couldn't read the proxy on this server.",
  },
  unknown: {
    label: "Not checked",
    dot: "bg-mist",
    hint: "Checking it now.",
  },
}

export function ProxyStatusDot({
  status,
  checking = false,
  className,
}: {
  status: ProxyStatus
  checking?: boolean
  className?: string
}) {
  if (checking) {
    return (
      <Loader2
        aria-label="Checking"
        className={cn("size-3 shrink-0 animate-spin text-ash", className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        (proxyStatusMeta[status] ?? proxyStatusMeta.unknown).dot,
        className,
      )}
    />
  )
}

// Set up (install + wire in) is the next step, not a fault.
export const needsSetup = (p: Pick<ReverseProxy, "status">) =>
  p.status === "not_installed" || p.status === "not_set_up"

// Sites can be written only while the proxy is set up and the server answers.
export const canWrite = (p: Pick<ReverseProxy, "status">) =>
  p.status === "online" || p.status === "stopped" || p.status === "unknown"

export type HostType = HostConfig["type"]

export const hostTypes: {
  value: HostType
  label: string
  icon: LucideIcon
  short: string
}[] = [
  {
    value: "proxy",
    label: "Proxy",
    icon: ArrowRightLeft,
    short: "Pass visitors on to an app, like http://127.0.0.1:3000",
  },
  {
    value: "redirect",
    label: "Redirect",
    icon: CornerUpRight,
    short: "Send visitors to another address",
  },
  {
    value: "static",
    label: "Static files",
    icon: FolderOpen,
    short: "Serve a folder on the server",
  },
]

export const hostTypeMeta = Object.fromEntries(
  hostTypes.map((t) => [t.value, t]),
) as Record<HostType, (typeof hostTypes)[number]>

// Where a site sends its visitors, in a few words.
export function hostTarget(c: HostConfig) {
  if (c.type === "redirect") return c.redirect_to ?? ""
  if (c.type === "static") return c.root ?? ""
  return c.upstream ?? ""
}

export const hostStateMeta: Record<
  ProxyHostState["state"],
  { label: string; tone: "muted" | "warning" | "destructive"; hint: string }
> = {
  ok: { label: "Live", tone: "muted", hint: "" },
  off: {
    label: "Off",
    tone: "muted",
    hint: "Turned off: its file isn't on the server.",
  },
  changed: {
    label: "Changed on the server",
    tone: "warning",
    hint: "Someone edited its file by hand. Saving it again writes the panel's version back.",
  },
  missing: {
    label: "Not on the server",
    tone: "destructive",
    hint: "Its file is gone from the server. Saving it again writes it back.",
  },
}

export const proxyHref = (id: string, tab?: ProxyTab) =>
  `/proxy/${id}${tab && tab !== "sites" ? `?tab=${tab}` : ""}`
export const newHostHref = (id: string) => `/proxy/${id}/hosts/new`
export const hostHref = (id: string, host: string) =>
  `/proxy/${id}/hosts/${host}`

// The first domain plus how many more.
export function domainsText(domains: string[]) {
  if (domains.length === 0) return "No domain"
  return domains.length > 1
    ? `${domains[0]} +${domains.length - 1}`
    : domains[0]
}

// A domain as a link to try it, when it isn't a wildcard.
export function siteUrl(domain: string, tls: boolean) {
  if (domain.includes("*")) return null
  return `${tls ? "https" : "http"}://${domain}`
}

// ---- URL state ----

const listTabs = ["sites", "proxies"] as const
export const proxyListFilters = {
  tab: parseAsStringLiteral(listTabs).withDefault("sites"),
  q: parseAsString.withDefault(""),
}
export const useProxyListFilters = () =>
  useQueryStates(proxyListFilters, { history: "replace" })

export const proxyTabs = ["sites", "existing", "logs", "history"] as const
export type ProxyTab = (typeof proxyTabs)[number]
export const proxyTabLabels: Record<ProxyTab, string> = {
  sites: "Sites",
  existing: "On the server",
  logs: "Logs",
  history: "History",
}
export const proxyPageFilters = {
  tab: parseAsStringLiteral(proxyTabs).withDefault("sites"),
  q: parseAsString.withDefault(""),
}
export const useProxyPageFilters = () =>
  useQueryStates(proxyPageFilters, { history: "replace" })
