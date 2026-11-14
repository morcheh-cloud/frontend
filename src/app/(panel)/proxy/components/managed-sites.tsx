"use client"

// Sites a proxy manager (Nginx Proxy Manager, nginx-proxy, SWAG) wrote
// itself. Morche reads them from the server's configuration and only shows
// them: they're changed in the manager.

import {
  ArrowRightLeft,
  ChevronRight,
  Eye,
  FileX,
  Globe,
  Lock,
} from "lucide-react"
import Link from "next/link"

import type {
  ProxySiteTraffic,
  ProxyTraffic,
  Proxy as ReverseProxy,
  Site,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { inspectable } from "../[id]/components/toolbar"
import { useInspections } from "../api"
import { count, MiniBars, SiteNumbers, Sparkline } from "./live"
import { ProxyName, ProxyStatusDot, proxyHref, type SiteTab } from "./meta"
import { Tag } from "./parts"
import { useProxyActions } from "./proxy-actions"

export type ManagedSite = {
  key: string
  proxy: ReverseProxy
  site: Site
  tab: SiteTab
}

// Which list a manager's site belongs on; null for the manager's own pages
// (its admin screen, its default site).
function tabOf(p: ReverseProxy, s: Site): SiteTab | null {
  if (s.managed) return null
  if (p.manager === "Nginx Proxy Manager") {
    if (s.file.includes("/proxy_host/")) return "hosts"
    if (s.file.includes("/redirection_host/")) return "redirects"
    if (s.file.includes("/dead_host/")) return "notfound"
    return null
  }
  if (!s.domains.some((d) => d !== "localhost")) return null
  return s.redirect && !s.upstream ? "redirects" : "hosts"
}

// Every managed proxy in view, read from its server.
export function useManagedSites(all: ReverseProxy[], proxyFilter: string) {
  const proxies = all.filter(
    (p) =>
      !!p.manager && (!proxyFilter || p.id === proxyFilter) && inspectable(p),
  )
  const results = useInspections(proxies.map((p) => p.id))
  const sites: ManagedSite[] = proxies.flatMap((p, i) =>
    (results[i]?.data?.sites ?? []).flatMap((s) => {
      const tab = tabOf(p, s)
      return tab
        ? [{ key: `${p.id}:${s.file}:${s.line}`, proxy: p, site: s, tab }]
        : []
    }),
  )
  return {
    proxies,
    sites,
    pending: results.some((r) => r.isPending),
    failed: proxies.flatMap((p, i) => {
      const r = results[i]
      return r?.isError && !r.data
        ? [{ proxy: p, message: r.error.message }]
        : []
    }),
    fetching: results.some((r) => r.isFetching),
    refetch: () => {
      for (const r of results) r.refetch()
    },
  }
}

// The live numbers of each manager's site, read from the site's own access
// log; by `ManagedSite.key`.
export function managedTraffic(data?: ProxyTraffic) {
  return new Map(
    (data?.sites ?? []).map((t) => [`${t.proxy_id}:${t.file}:${t.line}`, t]),
  )
}

// Why a site has no numbers: its log isn't its own, or isn't read yet.
function noNumbers(m: ManagedSite, loaded: boolean, unread: boolean) {
  if (unread) return "Couldn't read this proxy's logs"
  if (!loaded) return "Reading the live numbers…"
  if (m.tab === "notfound") return "No live numbers for this page"
  return "No log of its own, so no live numbers"
}

export const managedMatches = (m: ManagedSite, needle: string) =>
  !needle ||
  m.site.domains.some((d) => d.toLowerCase().includes(needle)) ||
  (m.site.upstream ?? "").toLowerCase().includes(needle) ||
  (m.site.redirect ?? "").toLowerCase().includes(needle) ||
  m.site.file.toLowerCase().includes(needle) ||
  m.proxy.server_name.toLowerCase().includes(needle)

const byName = (a: ManagedSite, b: ManagedSite) =>
  (a.site.domains[0] ?? "").localeCompare(b.site.domains[0] ?? "")

// The shown sites, grouped by their proxy (in the proxies' order).
export function groupManaged(proxies: ReverseProxy[], sites: ManagedSite[]) {
  return proxies
    .map((p) => ({
      proxy: p,
      sites: sites.filter((m) => m.proxy.id === p.id).sort(byName),
    }))
    .filter((g) => g.sites.length > 0)
}

function route(m: ManagedSite) {
  const s = m.site
  if (m.tab === "notfound") return { verb: "Answers", target: "404 Not Found" }
  if (s.upstream) return { verb: "Passes to", target: s.upstream }
  if (s.redirect) return { verb: "Redirects to", target: s.redirect }
  if (s.root) return { verb: "Serves", target: s.root }
  return { verb: "Set in", target: m.proxy.manager ?? "the manager" }
}

// "80, 443" out of nginx's listen lines.
function ports(s: Site) {
  const seen = s.listen.map(
    (l) => (l.split(/\s+/)[0] ?? "").replace(/^.*:/, "") || l,
  )
  return [...new Set(seen)].join(", ")
}

const fileName = (f: string) => f.split("/").slice(-2).join("/")

function SiteIcon({ m, className }: { m: ManagedSite; className?: string }) {
  const Icon =
    m.tab === "redirects"
      ? ArrowRightLeft
      : m.tab === "notfound"
        ? FileX
        : m.site.tls
          ? Lock
          : Globe
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-1/2" />
    </span>
  )
}

const siteName = (s: Site) => s.domains[0] ?? "No domain"

export function ManagedSiteCard({
  m,
  traffic: t,
  minutes,
  loaded,
  unread,
}: {
  m: ManagedSite
  traffic?: ProxySiteTraffic
  minutes: number
  // The traffic answer has come.
  loaded: boolean
  // This proxy's logs couldn't be read.
  unread: boolean
}) {
  const actions = useProxyActions()
  const { proxy: p, site: s } = m
  const others = s.domains.slice(1)
  const r = route(m)
  return (
    <article className="relative flex flex-col rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md has-[button[data-card]:focus-visible]:ring-2 has-[button[data-card]:focus-visible]:ring-ring">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3.5">
          <SiteIcon m={m} className="size-11" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <button
              data-card
              type="button"
              onClick={() => actions.viewSite(p, s)}
              className="truncate text-start font-mono text-body leading-6 font-medium outline-none after:absolute after:inset-0 after:rounded-2xl"
            >
              {siteName(s)}
            </button>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {m.tab !== "notfound" &&
                (s.tls ? <Tag tone="brand">HTTPS</Tag> : <Tag>HTTP only</Tag>)}
              <Tag>
                <Eye className="me-1 size-3" />
                Read only
              </Tag>
              {others.length > 0 && (
                <span
                  className="relative min-w-0 truncate text-caption text-muted-foreground"
                  title={others.join("\n")}
                >
                  also {others[0]}
                  {others.length > 1 && ` +${others.length - 1}`}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="flex min-w-0 items-center gap-2.5 rounded-xl bg-subtle px-3 py-2.5 text-body-sm">
          <span className="shrink-0 text-muted-foreground">{r.verb}</span>
          <span
            className="min-w-0 truncate font-mono text-foreground"
            title={r.target}
          >
            {r.target}
          </span>
        </p>

        {t && !unread ? (
          <div className="flex flex-col gap-3">
            <SiteNumbers t={t} stream={false} minutes={minutes} />
            <MiniBars
              requests={t.requests.slice(0, -1)}
              errors={t.server_errors.slice(0, -1)}
            />
          </div>
        ) : (
          <p className="flex h-[6.25rem] items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-caption text-ash">
            {noNumbers(m, loaded, unread)}
          </p>
        )}

        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-caption">
          <dt className="text-ash">Listens on</dt>
          <dd className="truncate font-mono text-muted-foreground">
            {ports(s) || "—"}
          </dd>
          <dt className="text-ash">File</dt>
          <dd
            className="truncate font-mono text-muted-foreground"
            title={`${s.file}:${s.line}`}
          >
            {fileName(s.file)}
          </dd>
        </dl>
      </div>

      <div className="mt-auto flex items-center gap-2 border-t border-border px-5 py-3 text-caption text-muted-foreground">
        <Link
          href={proxyHref(p.id, "existing")}
          className="relative inline-flex min-w-0 items-center gap-1.5 outline-none hover:text-brand focus-visible:text-brand"
        >
          <ProxyStatusDot status={p.status} />
          <span className="truncate">{p.server_name}</span>
        </Link>
        <span className="ms-auto shrink-0 truncate text-ash">
          In {p.manager}
        </span>
      </div>
    </article>
  )
}

export function ManagedSiteRow({
  m,
  traffic,
}: {
  m: ManagedSite
  traffic?: ProxySiteTraffic
}) {
  const actions = useProxyActions()
  const r = route(m)
  const series = traffic?.requests.slice(0, -1) ?? []
  return (
    <li>
      <button
        type="button"
        onClick={() => actions.viewSite(m.proxy, m.site)}
        className="flex min-h-[4.5rem] w-full items-center gap-3 py-3 ps-4 pe-3 text-start outline-none active:bg-muted"
      >
        <SiteIcon m={m} className="size-10" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-mono text-body font-medium">
            {siteName(m.site)}
          </span>
          <span className="truncate font-mono text-body-sm text-muted-foreground">
            {r.target}
          </span>
        </span>
        {traffic && (
          <span className="flex shrink-0 flex-col items-end gap-1">
            <Sparkline
              values={series}
              tone={series.some((v) => v > 0) ? "brand" : "muted"}
              className="h-5 w-14"
            />
            <span className="text-caption text-ash tabular-nums">
              {count(series.at(-1) ?? 0)}/min
            </span>
          </span>
        )}
        <ChevronRight className="size-4 shrink-0 text-ash rtl:rotate-180" />
      </button>
    </li>
  )
}

// Above a manager's sites: whose they are and where they're changed.
export function ManagedHeading({
  proxy: p,
  count,
  phone,
}: {
  proxy: ReverseProxy
  count: number
  phone?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1",
        phone && "px-4",
      )}
    >
      <h2 className="flex min-w-0 items-center gap-2 text-body-sm font-medium">
        <span className="truncate">In {p.manager}</span>
        <span className="text-ash tabular-nums">{count}</span>
      </h2>
      <span className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
        <Eye className="size-3.5 shrink-0" />
        <span className="min-w-0">Read only: change these in {p.manager}.</span>
      </span>
      {!phone && (
        <Link
          href={proxyHref(p.id, "existing")}
          className="ms-auto inline-flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground outline-none hover:text-brand focus-visible:text-brand"
        >
          <ProxyName p={p} />
        </Link>
      )}
    </div>
  )
}
