import {
  ArrowRightLeft,
  Cable,
  Container,
  CornerUpRight,
  FileX,
  FolderOpen,
  Loader2,
  type LucideIcon,
  Package,
} from "lucide-react"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"

import type {
  ContainerInfo,
  HostConfig,
  ProxyHost,
  ProxyHostState,
  Proxy as ReverseProxy,
  Site,
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
    hint: "Set it up: Morche installs it with the server's package manager.",
  },
  not_set_up: {
    label: "Not set up",
    dot: "bg-mist",
    hint: "Installed, but Morche's sites aren't wired in yet. Set it up.",
  },
  config_error: {
    label: "Config error",
    dot: "bg-destructive",
    hint: "Its configuration test fails, so changes can't be loaded.",
  },
  unreachable: {
    label: "Unreachable",
    dot: "bg-destructive",
    hint: "Morche couldn't reach the server over SSH.",
  },
  error: {
    label: "Error",
    dot: "bg-destructive",
    hint: "Morche couldn't read the proxy on this server.",
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

// Run by a proxy manager (Nginx Proxy Manager…) that writes nginx's config
// itself: Morche only reads it, and the backend refuses every change.
export const managedBy = (p: Pick<ReverseProxy, "manager">) => p.manager || ""

// Sites can be written only while the proxy is set up, the server answers and
// no proxy manager owns the config.
export const canWrite = (p: Pick<ReverseProxy, "status" | "manager">) =>
  !p.manager &&
  (p.status === "online" || p.status === "stopped" || p.status === "unknown")

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
  {
    value: "storage",
    label: "Storage",
    icon: Package,
    short: "Publish a bucket from Storage, like a MinIO or S3 one",
  },
  {
    value: "notfound",
    label: "404 page",
    icon: FileX,
    short: "Answer every request with 404 Not Found",
  },
  {
    value: "stream",
    label: "Stream",
    icon: Cable,
    short: "Forward a TCP or UDP port, like a database or mail",
  },
]

export const hostTypeMeta = Object.fromEntries(
  hostTypes.map((t) => [t.value, t]),
) as Record<HostType, (typeof hostTypes)[number]>

// Where a site sends its visitors, in a few words.
export function hostTarget(c: HostConfig) {
  if (c.type === "redirect") return c.redirect_to ?? ""
  if (c.type === "static") return c.root ?? ""
  if (c.type === "stream") return c.stream_to ?? ""
  if (c.type === "storage")
    return c.storage ? `${c.storage.bucket}${c.storage.folder ?? ""}` : ""
  if (c.type === "notfound") return notFoundText(c.not_found_code)
  return c.upstream ?? ""
}

// A hand-written site that answers every unknown name on port 80 or 443
// (default_server): what a catch-all site of Morche's takes over when it
// saves (the backend's DefaultHolders).
export const holdsDefault = (s: Pick<Site, "listen" | "managed">) =>
  !s.managed &&
  s.listen.some(
    (l) =>
      /^(\S*:)?(80|443)(\s|$)/.test(l) &&
      l.split(/\s+/).includes("default_server"),
  )

// The site of Morche's answering every unknown name, when one is on.
export const catchAllHost = (hosts: ProxyHost[]) =>
  hosts.find((h) => h.enabled && h.config.catch_all && !h.handwritten)

// What a 404 host answers.
export const notFoundText = (code?: number) =>
  code === 410
    ? "410 Gone"
    : code === 444
      ? "Connection closed (444)"
      : "404 Not Found"

// A stream has no domain: it's known by its port.
export function streamLabel(c: Pick<HostConfig, "listen_port" | "protocol">) {
  return `${(c.protocol || "tcp").toUpperCase()} port ${c.listen_port ?? "?"}`
}

// What a site is called in lists, titles and toasts.
export function hostName(h: Pick<ProxyHost, "config" | "domains">) {
  if (h.config.type === "stream") return streamLabel(h.config)
  if (h.config.catch_all && !h.domains.length) return "Any other name"
  return domainsText(h.domains)
}

// The first-page tabs: what kind of sites each one shows.
// Sites in a stable order: domains A–Z, then streams by port.
export const byHostName = (
  a: Pick<ProxyHost, "config" | "domains">,
  b: Pick<ProxyHost, "config" | "domains">,
) => {
  const sa = a.config.type === "stream"
  const sb = b.config.type === "stream"
  if (sa !== sb) return sa ? 1 : -1
  if (sa) return (a.config.listen_port ?? 0) - (b.config.listen_port ?? 0)
  return (a.domains[0] ?? "").localeCompare(b.domains[0] ?? "")
}

export const siteTabs = ["hosts", "redirects", "streams", "notfound"] as const
export type SiteTab = (typeof siteTabs)[number]
export const siteTabMeta: Record<
  SiteTab,
  { label: string; types: HostType[]; add: HostType; noun: string }
> = {
  hosts: {
    label: "Proxy hosts",
    types: ["proxy", "static", "storage"],
    add: "proxy",
    noun: "proxy host",
  },
  redirects: {
    label: "Redirections",
    types: ["redirect"],
    add: "redirect",
    noun: "redirection",
  },
  streams: {
    label: "Streams",
    types: ["stream"],
    add: "stream",
    noun: "stream",
  },
  notfound: {
    label: "404 hosts",
    types: ["notfound"],
    add: "notfound",
    noun: "404 host",
  },
}
export const tabOfType = (t: HostType): SiteTab =>
  siteTabs.find((tab) => siteTabMeta[tab].types.includes(t)) ?? "hosts"

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
  `/proxy/${id}${tab && tab !== "report" ? `?tab=${tab}` : ""}`
export const newHostHref = (id: string, type?: HostType) =>
  `/proxy/${id}/hosts/new${type && type !== "proxy" ? `?type=${type}` : ""}`
// A new site that starts as a copy of another one.
export const duplicateHostHref = (id: string, host: string) =>
  `/proxy/${id}/hosts/new?from=${encodeURIComponent(host)}`
// `tab` = one of the site editor's tabs (Report when left out).
export const hostHref = (id: string, host: string, tab?: string) =>
  `/proxy/${id}/hosts/${host}${tab ? `?tab=${tab}` : ""}`

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

export const proxyListFilters = {
  tab: parseAsStringLiteral(siteTabs).withDefault("hosts"),
  q: parseAsString.withDefault(""),
  // One proxy's sites only (its id); empty = every proxy.
  proxy: parseAsString.withDefault(""),
}
export const useProxyListFilters = () =>
  useQueryStates(proxyListFilters, { history: "replace" })

export const proxyTabs = [
  "report",
  "sites",
  "existing",
  "logs",
  "history",
] as const
export type ProxyTab = (typeof proxyTabs)[number]
export const proxyTabLabels: Record<ProxyTab, string> = {
  report: "Report",
  sites: "Sites",
  existing: "On the server",
  logs: "Logs",
  history: "History",
}
export const proxyPageFilters = {
  tab: parseAsStringLiteral(proxyTabs).withDefault("report"),
  q: parseAsString.withDefault(""),
}
export const useProxyPageFilters = () =>
  useQueryStates(proxyPageFilters, { history: "replace" })

// ---- Proxies in a container (docker / podman) ----

export const runtimeLabel: Record<ReverseProxy["runtime"], string> = {
  host: "On the server",
  docker: "Docker",
  podman: "Podman",
}

export const inContainer = (p: Pick<ReverseProxy, "runtime">) =>
  p.runtime !== "host"

// Where a proxy runs, in a few words: "Docker · edge" / "On the server".
export function placeText(p: Pick<ReverseProxy, "runtime" | "container">) {
  return p.runtime === "host"
    ? runtimeLabel.host
    : `${runtimeLabel[p.runtime]} · ${p.container}`
}

// How a container is reached from outside: the server's network, or the
// ports it publishes (IPv4/IPv6 twins once).
export function containerReach(
  c: Pick<ContainerInfo, "network_mode" | "ports">,
) {
  if (c.network_mode === "host") return "Uses the server's network"
  const seen = new Set<string>()
  for (const p of c.ports) {
    seen.add(`${p.host_port}→${p.port}${p.proto === "udp" ? "/udp" : ""}`)
  }
  return seen.size ? `Publishes ${[...seen].join(", ")}` : "Publishes no ports"
}

// A path under one side of the longest mount that holds it, moved to the
// other side; "" when no mount holds it.
function across(
  mounts: ContainerInfo["mounts"],
  p: string,
  from: "source" | "destination",
) {
  const clean = (x: string) => x.replace(/\/{2,}/g, "/").replace(/(.)\/$/, "$1")
  const join = (a: string, b: string) => (b ? `${a === "/" ? "" : a}/${b}` : a)
  const want = clean(p)
  let best = -1
  let out = ""
  for (const m of mounts) {
    if (!m.source) continue
    const base = clean(m[from])
    const under =
      want === base || want.startsWith(base === "/" ? "/" : `${base}/`)
    if (!under || base.length <= best) continue
    best = base.length
    const to = clean(from === "source" ? m.destination : m.source)
    out = join(to, want.slice(base.length).replace(/^\//, ""))
  }
  return out
}

// Where a container sees a folder of the server (bind mount or volume),
// "" when it can't: the backend's InsidePath.
export const insidePath = (
  c: Pick<ContainerInfo, "mounts">,
  hostPath: string,
) => across(c.mounts, hostPath, "source")

// The server folder behind a path inside the container, "" when none.
export const hostPathOf = (c: Pick<ContainerInfo, "mounts">, inside: string) =>
  across(c.mounts, inside, "destination")

// A proxy's name in lists and titles: its server, plus the container when
// it runs in one (a server may hold both kinds).
export const proxyName = (
  p: Pick<ReverseProxy, "server_name"> & { container?: string },
) => (p.container ? `${p.server_name} · ${p.container}` : p.server_name)

// The same name drawn for a list: the server, then a "Container" badge in
// place of the container's name (shown on hover) when it runs in one.
export function ProxyName({
  p,
  className,
}: {
  p: Pick<ReverseProxy, "server_name"> & {
    container?: string
    manager?: string
  }
  className?: string
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <span className="truncate">{p.server_name}</span>
      {p.container && (
        <span
          title={`Container: ${p.container}`}
          className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-muted px-2 text-caption font-normal whitespace-nowrap text-muted-foreground"
        >
          <Container className="size-3" />
          Container
        </span>
      )}
      {p.manager && (
        <span
          title={`Runs ${p.manager}: Morche only reads it`}
          className="inline-flex h-5 shrink-0 items-center rounded-full bg-muted px-2 text-caption font-normal whitespace-nowrap text-muted-foreground"
        >
          Read only
        </span>
      )}
    </span>
  )
}
