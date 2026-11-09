"use client"

import {
  ArrowRightLeft,
  Cable,
  Check,
  ChevronDown,
  CloudOff,
  Ellipsis,
  FileX,
  Globe,
  Lock,
  type LucideIcon,
  Plus,
  RefreshCw,
  Search,
  Server,
  Split,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"

import {
  Empty,
  type Item,
  ItemMenu,
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type {
  ProxyFleetHost,
  ProxyHostTraffic,
  Proxy as ReverseProxy,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useFleetHosts, useProxies, useProxyTraffic } from "../api"
import {
  byHostName,
  canWrite,
  hostHref,
  hostName,
  hostTarget,
  hostTypeMeta,
  newHostHref,
  type ProxyStatus,
  ProxyStatusDot,
  proxyHref,
  proxyStatusMeta,
  type SiteTab,
  siteTabMeta,
  siteTabs,
  useProxyListFilters,
} from "./meta"
import { ActionSheet, chipClass, Tag } from "./parts"
import { useCanAddProxy, useProxyCan } from "./permissions"
import { useHostMenu, useProxyActions, useProxyMenu } from "./proxy-actions"

// ---- data ----

// Proxies with a problem first, then by server name.
const rank = (p: ReverseProxy) =>
  p.status === "online"
    ? p.host_problems > 0
      ? 1
      : 2
    : p.status === "unknown"
      ? 2
      : 0

const tabIcons: Record<SiteTab, LucideIcon> = {
  hosts: Globe,
  redirects: ArrowRightLeft,
  streams: Cable,
  notfound: FileX,
}

const tabBlurbs: Record<SiteTab, string> = {
  hosts:
    "A proxy host puts an app, or a folder of files, on its domain, with https.",
  redirects:
    "A redirection sends visitors from an old or extra domain on to another address.",
  streams:
    "A stream forwards a TCP or UDP port on the proxy's server to another machine, like a database or SSH.",
  notfound:
    "A 404 host answers Not Found for names you park or don't serve, so they never land on another site.",
}

type Row = {
  fleet: ProxyFleetHost
  proxy?: ReverseProxy
  traffic?: ProxyHostTraffic
  // Couldn't read this proxy's log for the live numbers.
  unread: boolean
}

function useData() {
  const proxies = useProxies()
  const fleet = useFleetHosts()
  const [{ tab, q, proxy: proxyParam }, setFilters] = useProxyListFilters()
  const all = [...(proxies.data?.items ?? [])].sort(
    (a, b) => rank(a) - rank(b) || a.server_name.localeCompare(b.server_name),
  )
  const byId = new Map(all.map((p) => [p.id, p]))
  // A proxy that's gone (or not loaded yet) filters nothing.
  const proxyFilter = byId.has(proxyParam) ? proxyParam : ""
  const traffic = useProxyTraffic(proxyFilter)
  const trafficOf = new Map(traffic.data?.hosts.map((t) => [t.host_id, t]))
  const unread = new Set(
    traffic.data?.sources.filter((s) => !s.ok).map((s) => s.proxy_id),
  )

  const scoped = (fleet.data?.items ?? []).filter(
    (h) => !proxyFilter || h.host.proxy_id === proxyFilter,
  )
  const inTab = (t: SiteTab) => (h: ProxyFleetHost) =>
    siteTabMeta[t].types.includes(h.host.config.type)
  const counts = Object.fromEntries(
    siteTabs.map((t) => [t, scoped.filter(inTab(t)).length]),
  ) as Record<SiteTab, number>

  const needle = q.trim().toLowerCase()
  const matches = (h: ProxyFleetHost) =>
    !needle ||
    h.host.domains.some((d) => d.toLowerCase().includes(needle)) ||
    hostName(h.host).toLowerCase().includes(needle) ||
    hostTarget(h.host.config).toLowerCase().includes(needle) ||
    h.server_name.toLowerCase().includes(needle) ||
    h.host.note.toLowerCase().includes(needle)

  const tabRows = scoped.filter(inTab(tab))
  const rows: Row[] = tabRows
    .filter(matches)
    .sort((a, b) => byHostName(a.host, b.host))
    .map((h) => ({
      fleet: h,
      proxy: byId.get(h.host.proxy_id),
      traffic: trafficOf.get(h.host.id),
      unread: unread.has(h.host.proxy_id),
    }))
  // Stats cover the whole tab, not just what the search shows.
  const stats = sumTraffic(
    tabRows.flatMap((h) => {
      const t = trafficOf.get(h.host.id)
      return t ? [t] : []
    }),
  )

  return {
    proxies,
    fleet,
    traffic,
    all,
    byId,
    tab,
    q,
    proxyFilter,
    setFilters,
    counts,
    rows,
    stats,
    tabTotal: tabRows.length,
    // Proxies in view that aren't serving.
    troubled: all.filter(
      (p) =>
        (!proxyFilter || p.id === proxyFilter) &&
        p.status !== "online" &&
        p.status !== "unknown",
    ),
    unreadCount: unread.size,
  }
}

type Data = ReturnType<typeof useData>

// ---- live numbers ----

const sum = (xs: number[] | undefined) => (xs ?? []).reduce((a, b) => a + b, 0)

// Per-minute series added up; the last minute is still running, so it's
// left out of charts and "now".
function sumTraffic(list: ProxyHostTraffic[]) {
  const n = Math.max(0, ...list.map((t) => t.requests.length))
  const add = (pick: (t: ProxyHostTraffic) => number[]) =>
    Array.from({ length: n }, (_, i) =>
      list.reduce((a, t) => a + (pick(t)[i] ?? 0), 0),
    )
  const requests = add((t) => t.requests)
  const serverErrors = add((t) => t.server_errors)
  const clientErrors = add((t) => t.client_errors)
  const bytes = add((t) => t.bytes)
  return {
    requests: requests.slice(0, -1),
    serverErrors: serverErrors.slice(0, -1),
    total: sum(requests),
    errors: sum(serverErrors),
    clientErrors: sum(clientErrors),
    bytes: sum(bytes),
    bytesSeries: bytes.slice(0, -1),
    now: requests.at(-2) ?? 0,
  }
}

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})
const count = (n: number) =>
  n < 10_000 ? n.toLocaleString("en") : compact.format(n)

function rate(errors: number, total: number) {
  if (total === 0 || errors === 0) return "0%"
  const pct = (errors / total) * 100
  return pct > 0 && pct < 0.1 ? "<0.1%" : `${pct.toFixed(pct < 10 ? 1 : 0)}%`
}

const errorTone = (errors: number, total: number) => {
  const pct = total ? (errors / total) * 100 : 0
  return pct >= 5 ? "destructive" : pct >= 1 ? "warning" : "muted"
}

function Sparkline({
  values,
  tone = "brand",
  className,
}: {
  values: number[]
  tone?: "brand" | "destructive" | "muted"
  className?: string
}) {
  if (values.length < 2) return <div className={className} />
  const max = Math.max(1, ...values)
  const points = values.map((v, i) => [
    (i / (values.length - 1)) * 100,
    96 - (v / max) * 88,
  ])
  const line = points
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ")
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("overflow-visible", className)}
    >
      <path
        d={`${line} L100,100 L0,100 Z`}
        className={cn(
          tone === "brand" && "fill-brand/10",
          tone === "destructive" && "fill-destructive/10",
          tone === "muted" && "fill-ash/10",
        )}
      />
      <path
        d={line}
        fill="none"
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className={cn(
          tone === "brand" && "stroke-brand",
          tone === "destructive" && "stroke-destructive",
          tone === "muted" && "stroke-ash",
        )}
      />
    </svg>
  )
}

function LiveState({ d, compact }: { d: Data; compact?: boolean }) {
  const t = d.traffic
  if (t.isError && !t.data) {
    return (
      <span className="text-caption text-ash" title={t.error.message}>
        Live numbers unavailable
      </span>
    )
  }
  const collected = t.data?.sources
    .map((s) => s.collected_at)
    .filter(Boolean)
    .sort()
    .at(-1)
  return (
    <span
      className="inline-flex items-center gap-1.5 text-caption whitespace-nowrap text-ash"
      title={collected ? `Read ${timeAgo(collected)}` : undefined}
    >
      <span className="relative flex size-2">
        {t.data && (
          <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
        )}
        <span
          className={cn(
            "relative size-2 rounded-full",
            t.data ? "bg-success" : "bg-mist",
          )}
        />
      </span>
      {compact ? "Live" : `Live · last ${t.data?.minutes ?? 30} min`}
      {d.unreadCount > 0 &&
        ` · ${d.unreadCount} ${d.unreadCount === 1 ? "proxy" : "proxies"} not read`}
    </span>
  )
}

function useStatTiles(d: Data) {
  const s = d.stats
  const stream = d.tab === "streams"
  const unit = stream ? "Connections" : "Requests"
  const tone = errorTone(s.errors, s.total)
  return [
    {
      key: "total",
      label: unit,
      value: count(s.total),
      sub: `last ${d.traffic.data?.minutes ?? 30} minutes`,
      chart: <Sparkline values={s.requests} className="h-10 w-full" />,
    },
    {
      key: "now",
      label: stream ? "Connections a minute" : "Requests a minute",
      value: count(s.now),
      sub: "in the last full minute",
    },
    {
      key: "errors",
      label: stream ? "Failed" : "Server errors",
      value: rate(s.errors, s.total),
      valueClass:
        tone === "destructive"
          ? "text-destructive"
          : tone === "warning"
            ? "text-warning"
            : undefined,
      sub: stream
        ? `${count(s.errors)} couldn't reach the target`
        : `${count(s.errors)} × 5xx · ${count(s.clientErrors)} × 4xx`,
      chart: s.errors > 0 && (
        <Sparkline
          values={s.serverErrors}
          tone="destructive"
          className="h-10 w-full"
        />
      ),
    },
    {
      key: "bytes",
      label: "Traffic",
      value: formatSize(s.bytes),
      sub: stream ? "sent back" : "sent to visitors",
      chart: s.bytes > 0 && (
        <Sparkline values={s.bytesSeries} className="h-10 w-full" />
      ),
    },
  ]
}

// ---- adding a site ----

// Where Add goes: straight to the form when only one proxy can take it.
function useAddSite(d: Data) {
  const router = useRouter()
  const actions = useProxyActions()
  const can = useProxyCan()
  const canAdd = useCanAddProxy()
  const [pickOpen, setPickOpen] = useOpen("proxy-add-site")
  const meta = siteTabMeta[d.tab]
  const writable = d.all.filter(
    (p) =>
      can(p, "engineer") &&
      canWrite(p) &&
      p.capabilities.types.includes(meta.add) &&
      (!d.proxyFilter || p.id === d.proxyFilter),
  )
  const go = (p: ReverseProxy) => router.push(newHostHref(p.id, meta.add))
  const start = () => {
    if (writable.length === 1 && writable[0]) go(writable[0])
    else if (writable.length > 1) setPickOpen(true)
    else if (canAdd) actions.add()
  }
  return {
    shown: writable.length > 0 || canAdd,
    label: `Add ${meta.noun}`,
    start,
    picker: (
      <ResponsiveDialog
        open={pickOpen}
        onOpenChange={setPickOpen}
        title={`Add ${meta.noun}`}
        description="Which proxy should serve it?"
      >
        <ul className="-mx-2 flex flex-col max-md:mx-0">
          {writable.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setPickOpen(false)
                  go(p)
                }}
                className="flex min-h-14 w-full items-center gap-3 rounded-lg p-2 text-start outline-none hover:bg-muted focus-visible:bg-muted active:bg-muted"
              >
                <ProxyTile className="size-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {p.server_name}
                  </span>
                  <span className="block truncate text-caption text-muted-foreground">
                    {p.kind_label} · {p.host_count} site
                    {p.host_count === 1 ? "" : "s"}
                  </span>
                </span>
                <ProxyStatusText proxy={p} />
              </button>
            </li>
          ))}
        </ul>
      </ResponsiveDialog>
    ),
  }
}

// ---- page ----

export function ProxyView() {
  const isPhone = useIsPhone()
  if (isPhone === null) return null
  return isPhone ? <ProxyMobile /> : <ProxyDesktop />
}

function ProxyDesktop() {
  const actions = useProxyActions()
  const canAdd = useCanAddProxy()
  const d = useData()
  const add = useAddSite(d)
  const tiles = useStatTiles(d)
  const [proxiesOpen, setProxiesOpen] = useOpen("proxy-proxies")
  const fetching = d.proxies.isFetching || d.fleet.isFetching

  if (d.proxies.isPending) {
    return (
      <div className="px-6 pt-5 pb-24">
        <CardsSkeleton />
      </div>
    )
  }
  if (d.proxies.isError && !d.proxies.data) {
    return (
      <div className="px-6 pt-5 pb-24">
        <Failed error={d.proxies.error} onRetry={() => d.proxies.refetch()} />
      </div>
    )
  }
  if (d.all.length === 0) {
    return (
      <div className="px-6 pt-5 pb-24">
        <NoProxies onAdd={canAdd ? () => actions.add() : undefined} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 px-6 pt-5 pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Kind of site"
          value={d.tab}
          onChange={(tab) => d.setFilters({ tab })}
          items={siteTabs.map((t) => ({
            value: t,
            label: (
              <span className="inline-flex items-center gap-1.5">
                {siteTabMeta[t].label}
                <span className="tabular-nums opacity-60">{d.counts[t]}</span>
              </span>
            ),
          }))}
        />
        <SearchBox
          value={d.q}
          onChange={(q) => d.setFilters({ q: q || null })}
          placeholder={`Search ${siteTabMeta[d.tab].label.toLowerCase()}`}
          label={`Search ${siteTabMeta[d.tab].label.toLowerCase()}`}
        />
        <ProxyFilterMenu d={d} />
        <span className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh"
          title="Refresh"
          disabled={fetching}
          onClick={() => {
            d.proxies.refetch()
            d.fleet.refetch()
            d.traffic.refetch()
          }}
        >
          <RefreshCw className={cn(fetching && "animate-spin")} />
        </Button>
        <Button variant="outline" onClick={() => setProxiesOpen(true)}>
          <Split />
          Proxies
          <span className="text-muted-foreground tabular-nums">
            {d.all.length}
          </span>
          {d.all.some((p) => rank(p) === 0) && (
            <span
              role="img"
              aria-label="A proxy needs attention"
              className="size-2 rounded-full bg-destructive"
            />
          )}
        </Button>
        {add.shown && (
          <Button onClick={add.start}>
            <Plus />
            {add.label}
          </Button>
        )}
      </div>

      <Troubled d={d} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.key}
            className="flex min-h-32 flex-col gap-1 rounded-2xl border border-border p-4"
          >
            <span className="flex items-center justify-between gap-2 text-caption text-muted-foreground">
              {t.label}
              {t.key === "total" && <LiveState d={d} compact />}
            </span>
            {d.traffic.isPending ? (
              <Skeleton className="mt-1 h-7 w-20" />
            ) : (
              <span
                className={cn(
                  "text-heading leading-none font-light tabular-nums",
                  t.valueClass,
                )}
              >
                {t.value}
              </span>
            )}
            <span className="text-caption text-ash">{t.sub}</span>
            {t.chart && <div className="mt-auto pt-2">{t.chart}</div>}
          </div>
        ))}
      </div>

      {d.fleet.isPending ? (
        <CardsSkeleton />
      ) : d.fleet.isError && !d.fleet.data ? (
        <Empty
          icon={CloudOff}
          title="Couldn't load sites"
          body={d.fleet.error.message}
        />
      ) : d.rows.length === 0 ? (
        <NoSites d={d} add={add} />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-3">
          {d.rows.map((r) => (
            <li key={r.fleet.host.id} className="contents">
              <SiteCard row={r} stream={d.tab === "streams"} />
            </li>
          ))}
        </ul>
      )}

      {add.picker}
      <ProxiesLayer
        d={d}
        open={proxiesOpen}
        onOpenChange={setProxiesOpen}
        phone={false}
      />
    </div>
  )
}

function ProxyFilterMenu({ d }: { d: Data }) {
  const current = d.proxyFilter ? d.byId.get(d.proxyFilter) : undefined
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 max-w-60 gap-1.5 px-3",
              current && "border-foreground",
            )}
          />
        }
      >
        {current ? (
          <ProxyStatusDot status={current.status} />
        ) : (
          <Server className="size-4" />
        )}
        <span className="truncate">
          {current ? current.server_name : "All proxies"}
        </span>
        <ChevronDown className="size-4 text-ash" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show sites on</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={d.proxyFilter}
            onValueChange={(proxy) => d.setFilters({ proxy: proxy || null })}
          >
            <DropdownMenuRadioItem value="">All proxies</DropdownMenuRadioItem>
            <DropdownMenuSeparator />
            {d.all.map((p) => (
              <DropdownMenuRadioItem key={p.id} value={p.id}>
                <ProxyStatusDot status={p.status} />
                <span className="min-w-0 flex-1 truncate">{p.server_name}</span>
                <span className="text-caption text-ash tabular-nums">
                  {p.host_count}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// One line per proxy that isn't serving, above the cards.
function Troubled({ d, phone }: { d: Data; phone?: boolean }) {
  if (d.troubled.length === 0) return null
  return (
    <ul
      className={cn(
        "flex flex-col",
        phone ? "divide-y divide-border border-y border-border" : "gap-2",
      )}
    >
      {d.troubled.map((p) => {
        const s = proxyStatusMeta[p.status] ?? proxyStatusMeta.unknown
        return (
          <li key={p.id}>
            <Link
              href={proxyHref(p.id)}
              className={cn(
                "flex items-center gap-2.5 text-body-sm outline-none",
                phone
                  ? "min-h-12 px-4 py-2.5 active:bg-muted"
                  : "rounded-xl border border-border px-4 py-2.5 hover:bg-subtle focus-visible:bg-subtle",
              )}
            >
              <ProxyStatusDot status={p.status} />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{p.server_name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {s.label}: {p.status_message || s.hint}
                </span>
              </span>
              <span className="shrink-0 font-medium text-brand">Open</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function SiteIcon({ row, className }: { row: Row; className?: string }) {
  const h = row.fleet.host
  const type = h.config.type
  const Icon =
    type === "stream"
      ? Cable
      : type === "redirect"
        ? ArrowRightLeft
        : type === "notfound"
          ? FileX
          : h.config.tls?.enabled
            ? Lock
            : Globe
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg",
        h.enabled ? "bg-brand-soft text-brand-strong" : "bg-muted text-ash",
        className,
      )}
    >
      <Icon className="size-1/2" />
    </span>
  )
}

function siteTags(row: Row) {
  const h = row.fleet.host
  const c = h.config
  const tags: { key: string; label: string; tone?: "brand" | "muted" }[] = []
  if (!h.enabled) tags.push({ key: "off", label: "Off" })
  if (c.type === "stream") {
    tags.push({ key: "proto", label: (c.protocol || "tcp").toUpperCase() })
  } else {
    tags.push(
      c.tls?.enabled
        ? { key: "tls", label: "HTTPS", tone: "brand" }
        : { key: "tls", label: "HTTP only" },
    )
    if (c.type === "static") tags.push({ key: "static", label: "Files" })
    if (c.websockets) tags.push({ key: "ws", label: "WebSockets" })
    if (c.allow?.length) tags.push({ key: "allow", label: "Restricted" })
  }
  return tags
}

function SiteCard({ row, stream }: { row: Row; stream: boolean }) {
  const menu = useHostMenu()
  const h = row.fleet.host
  const p = row.proxy
  const type = hostTypeMeta[h.config.type]
  const TypeIcon = type.icon
  const t = row.traffic
  const series = t?.requests.slice(0, -1) ?? []
  const now = series.at(-1) ?? 0
  const total = sum(t?.requests)
  const errors = sum(t?.server_errors)
  const extra = h.domains.length - 1
  const live = p?.capabilities.traffic && h.enabled

  return (
    <article
      className={cn(
        "relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow",
        "hover:shadow-md has-[a[data-card]:focus-visible]:ring-2 has-[a[data-card]:focus-visible]:ring-ring",
      )}
    >
      <div className="flex items-start gap-3">
        <SiteIcon row={row} className="size-10" />
        <div className="min-w-0 flex-1">
          <Link
            data-card
            href={hostHref(h.proxy_id, h.id)}
            className={cn(
              "flex min-w-0 items-baseline gap-1.5 outline-none after:absolute after:inset-0 after:rounded-2xl",
              !h.enabled && "text-ash",
            )}
          >
            <span className="truncate font-mono text-body font-medium">
              {h.config.type === "stream"
                ? hostName(h)
                : (h.domains[0] ?? "No domain")}
            </span>
            {extra > 0 && (
              <span
                className="shrink-0 text-caption text-muted-foreground"
                title={h.domains.slice(1).join("\n")}
              >
                +{extra}
              </span>
            )}
          </Link>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
            <TypeIcon
              aria-label={type.label}
              className="size-3.5 shrink-0 text-ash"
            />
            <span className="truncate font-mono">
              {hostTarget(h.config) || type.label}
            </span>
          </p>
        </div>
        {p && (
          <div className="relative -me-2 -mt-1">
            <ItemMenu groups={menu(p, h)} label={`${hostName(h)} actions`} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {siteTags(row).map((x) => (
          <Tag key={x.key} tone={x.tone}>
            {x.label}
          </Tag>
        ))}
      </div>

      {live ? (
        <div className="flex items-end gap-4">
          <div className="flex shrink-0 flex-col">
            <span className="text-subheading leading-none font-medium tabular-nums">
              {count(now)}
            </span>
            <span className="mt-1 text-caption text-ash">
              {stream ? "conn" : "req"}/min
            </span>
          </div>
          <Sparkline
            values={series}
            tone={series.some((v) => v > 0) ? "brand" : "muted"}
            className="h-10 min-w-0 flex-1"
          />
          <div className="flex shrink-0 flex-col items-end text-caption">
            <span className="text-muted-foreground tabular-nums">
              {count(total)} in 30 min
            </span>
            {errors > 0 ? (
              <span
                className={cn(
                  "tabular-nums",
                  errorTone(errors, total) === "muted"
                    ? "text-muted-foreground"
                    : errorTone(errors, total) === "warning"
                      ? "text-warning"
                      : "text-destructive",
                )}
              >
                {rate(errors, total)} {stream ? "failed" : "5xx"}
              </span>
            ) : (
              <span className="text-ash">
                {row.unread ? "Log not read" : "No errors"}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-caption text-ash">
          {h.enabled ? "No live numbers for this proxy" : "Turned off"}
        </p>
      )}

      <div className="mt-auto flex items-center gap-2 border-t border-border pt-3 text-caption text-muted-foreground">
        <Link
          href={proxyHref(h.proxy_id)}
          className="relative inline-flex min-w-0 items-center gap-1.5 outline-none hover:text-brand focus-visible:text-brand"
        >
          <ProxyStatusDot status={row.fleet.proxy_status as ProxyStatus} />
          <span className="truncate">{row.fleet.server_name}</span>
          <span className="shrink-0 text-ash">
            {p?.kind_label ?? row.fleet.kind}
          </span>
        </Link>
        <span className="ms-auto shrink-0 text-ash" title={h.updated_by_name}>
          {timeAgo(h.updated_at)}
        </span>
      </div>
    </article>
  )
}

// The proxies themselves: status, sites, their menu, add another.
function ProxiesLayer({
  d,
  open,
  onOpenChange,
  phone,
}: {
  d: Data
  open: boolean
  onOpenChange: (open: boolean) => void
  phone: boolean
}) {
  const actions = useProxyActions()
  const canAdd = useCanAddProxy()
  const menu = useProxyMenu()
  const title = "Proxies"
  const description = "The servers that run a reverse proxy for your sites."
  const addButton = canAdd && (
    <Button
      className="max-md:h-11 max-md:w-full"
      onClick={() => {
        onOpenChange(false)
        actions.add()
      }}
    >
      <Plus />
      Add proxy
    </Button>
  )
  const list = (
    <ul className="flex min-h-0 flex-1 flex-col divide-y divide-border overflow-y-auto">
      {d.all.map((p) => (
        <li key={p.id} className="flex items-center gap-1 pe-2">
          <Link
            href={proxyHref(p.id)}
            onClick={() => onOpenChange(false)}
            className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 ps-4 outline-none hover:bg-subtle focus-visible:bg-subtle active:bg-muted md:ps-6"
          >
            <ProxyTile className="size-10" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {p.server_name}
              </span>
              <span className="block truncate text-caption text-muted-foreground">
                {p.kind_label}
                {p.version && ` ${p.version}`} · {p.host_count} site
                {p.host_count === 1 ? "" : "s"}
                {p.host_problems > 0 && ` · ${p.host_problems} need attention`}
              </span>
            </span>
            <ProxyStatusText proxy={p} />
          </Link>
          {!phone && (
            <ItemMenu
              groups={menu(p, { open: true })}
              label={`${p.server_name} actions`}
            />
          )}
        </li>
      ))}
    </ul>
  )
  if (phone) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        footer={addButton || undefined}
      >
        {list}
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={(next) => onOpenChange(next)}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {list}
        {addButton && (
          <SheetFooter className="border-t border-border px-6 py-4">
            {addButton}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

export function ProxyStatusText({ proxy: p }: { proxy: ReverseProxy }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-body-sm whitespace-nowrap"
      title={p.status === "online" ? undefined : p.status_message || undefined}
    >
      <ProxyStatusDot status={p.status} />
      {(proxyStatusMeta[p.status] ?? proxyStatusMeta.unknown).label}
    </span>
  )
}

export function ProxyTile({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong",
        className,
      )}
    >
      <Split className="size-1/2" />
    </span>
  )
}

function NoSites({ d, add }: { d: Data; add: ReturnType<typeof useAddSite> }) {
  const meta = siteTabMeta[d.tab]
  if (d.q) {
    return (
      <Empty
        icon={Search}
        title={`No ${meta.noun} matches`}
        body="Try another name, or clear the search."
      />
    )
  }
  const where = d.proxyFilter ? d.byId.get(d.proxyFilter) : undefined
  return (
    <Empty
      icon={tabIcons[d.tab]}
      title={
        where
          ? `No ${meta.label.toLowerCase()} on ${where.server_name}`
          : `No ${meta.label.toLowerCase()} yet`
      }
      body={tabBlurbs[d.tab]}
      action={
        add.shown && (
          <Button onClick={add.start}>
            <Plus />
            {add.label}
          </Button>
        )
      }
    />
  )
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          key={i}
          className="flex flex-col gap-4 rounded-2xl border border-border p-5"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

function NoProxies({ onAdd }: { onAdd?: () => void }) {
  return (
    <Empty
      icon={Split}
      title={onAdd ? "Add your first reverse proxy" : "No proxies to show"}
      body={
        onAdd
          ? "Pick a server and Morcheh runs nginx on it over SSH: put your apps behind domains, redirect old addresses, forward ports and serve files, all from here. Sites already on the server keep working."
          : "Nothing here is shared with you yet. Ask an admin or the workspace owner for access."
      }
      action={
        onAdd && (
          <Button onClick={onAdd}>
            <Plus />
            Add proxy
          </Button>
        )
      }
    />
  )
}

function Failed({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Empty
      icon={CloudOff}
      title="Couldn't load proxies"
      body={error.message || "The server didn't answer. Try again."}
      action={
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  )
}

// ---- phone ----

function ProxyMobile() {
  const actions = useProxyActions()
  const canAdd = useCanAddProxy()
  const d = useData()
  const add = useAddSite(d)
  const hostMenu = useHostMenu()
  const tiles = useStatTiles(d)
  const [proxiesOpen, setProxiesOpen] = useOpen("proxy-proxies")
  const [filterOpen, setFilterOpen] = useOpen("proxy-filter")
  const [sheetOpen, setSheetOpen] = useOpen("proxy-row-sheet")
  const [sheetId, setSheetId] = useState<string | null>(null)
  // Keep the last tapped row so its sheet can animate out.
  const last = useRef<{ title: string; groups: Item[][] } | null>(null)
  const pendingFilter = useRef<string | null>(null)

  let current = last.current
  const tapped = sheetId
    ? d.rows.find((r) => r.fleet.host.id === sheetId)
    : undefined
  if (tapped?.proxy) {
    current = {
      title: hostName(tapped.fleet.host),
      groups: hostMenu(tapped.proxy, tapped.fleet.host),
    }
  }
  if (current) last.current = current
  const filtered = d.proxyFilter ? d.byId.get(d.proxyFilter) : undefined

  // The filter is written to the URL after its sheet's Back entry is gone.
  const pickProxy = (id: string) => {
    pendingFilter.current = id
    setFilterOpen(false)
    const apply = () => {
      window.removeEventListener("popstate", apply)
      const next = pendingFilter.current
      pendingFilter.current = null
      if (next !== null) d.setFilters({ proxy: next || null })
    }
    window.addEventListener("popstate", apply)
  }

  return (
    <>
      <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
        <h1 className="min-w-0 flex-1 truncate text-heading font-light">
          Reverse proxy
        </h1>
        <HelpButton
          href={guideHref("reverse-proxy")}
          label="Reverse proxy guide"
        />
        {d.all.length > 0 && (
          <button
            type="button"
            aria-label="Proxies"
            onClick={() => setProxiesOpen(true)}
            className="relative flex size-11 items-center justify-center rounded-full text-muted-foreground outline-none active:bg-muted"
          >
            <Split className="size-5" />
            {d.all.some((p) => rank(p) === 0) && (
              <span className="absolute end-2.5 top-2.5 size-2 rounded-full bg-destructive" />
            )}
          </button>
        )}
        {(d.all.length === 0 ? canAdd : add.shown) && (
          <Button
            size="icon-lg"
            aria-label={d.all.length === 0 ? "Add proxy" : add.label}
            className="rounded-full"
            onClick={d.all.length === 0 ? () => actions.add() : add.start}
          >
            <Plus className="size-5" />
          </Button>
        )}
      </header>

      {d.proxies.isPending ? (
        <ListSkeleton />
      ) : d.proxies.isError && !d.proxies.data ? (
        <Failed error={d.proxies.error} onRetry={() => d.proxies.refetch()} />
      ) : d.all.length === 0 ? (
        <NoProxies onAdd={canAdd ? () => actions.add() : undefined} />
      ) : (
        <>
          <div className="flex flex-col gap-3 pt-4">
            <div className="px-4">
              <SearchBox
                value={d.q}
                onChange={(q) => d.setFilters({ q: q || null })}
                placeholder={`Search ${siteTabMeta[d.tab].label.toLowerCase()}`}
                label={`Search ${siteTabMeta[d.tab].label.toLowerCase()}`}
                className="w-full"
              />
            </div>
            <nav
              aria-label="Kind of site"
              className="no-scrollbar flex gap-2 overflow-x-auto px-4"
            >
              {siteTabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-current={d.tab === t ? "page" : undefined}
                  onClick={() => d.setFilters({ tab: t })}
                  className={chipClass}
                >
                  {siteTabMeta[t].label}
                  <span className="tabular-nums opacity-70">{d.counts[t]}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className={cn(
                  chipClass,
                  filtered && "border-foreground text-foreground",
                )}
              >
                {filtered ? (
                  <ProxyStatusDot status={filtered.status} />
                ) : (
                  <Server className="size-4" />
                )}
                <span className="max-w-40 truncate">
                  {filtered ? filtered.server_name : "All proxies"}
                </span>
                <ChevronDown className="size-4" />
              </button>
            </nav>
          </div>

          <section aria-label="Live numbers" className="mt-4">
            <div className="flex items-center px-4 pb-2">
              <LiveState d={d} />
            </div>
            <div className="grid grid-cols-2 border-y border-border">
              {tiles.map((t, i) => (
                <div
                  key={t.key}
                  className={cn(
                    "flex flex-col gap-0.5 p-4",
                    i % 2 === 0 && "border-e border-border",
                    i < 2 && "border-b border-border",
                  )}
                >
                  <span className="text-caption text-muted-foreground">
                    {t.label}
                  </span>
                  <span
                    className={cn(
                      "text-subheading font-medium tabular-nums",
                      t.valueClass,
                    )}
                  >
                    {d.traffic.isPending ? "–" : t.value}
                  </span>
                  <span className="truncate text-caption text-ash">
                    {t.sub}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {d.troubled.length > 0 && (
            <div className="mt-4">
              <Troubled d={d} phone />
            </div>
          )}

          <div className="pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
            {d.fleet.isPending ? (
              <ListSkeleton />
            ) : d.rows.length === 0 ? (
              <NoSites d={d} add={add} />
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {d.rows.map((r) => (
                  <MobileRow
                    key={r.fleet.host.id}
                    row={r}
                    onMore={() => {
                      setSheetId(r.fleet.host.id)
                      setSheetOpen(true)
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {current && (
        <ActionSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={current.title}
          groups={current.groups}
        />
      )}
      <BottomSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title="Show sites on"
      >
        <div className="flex flex-col pb-2">
          <SheetAction
            icon={<Server />}
            label="All proxies"
            trailing={!d.proxyFilter && <Check className="size-5 text-brand" />}
            onClick={() => pickProxy("")}
          />
          {d.all.map((p) => (
            <SheetAction
              key={p.id}
              icon={<ProxyStatusDot status={p.status} />}
              label={p.server_name}
              description={`${p.kind_label} · ${p.host_count} site${p.host_count === 1 ? "" : "s"}`}
              trailing={
                d.proxyFilter === p.id && (
                  <Check className="size-5 text-brand" />
                )
              }
              onClick={() => pickProxy(p.id)}
            />
          ))}
        </div>
      </BottomSheet>
      <ProxiesLayer
        d={d}
        open={proxiesOpen}
        onOpenChange={setProxiesOpen}
        phone
      />
      {add.picker}
    </>
  )
}

function MobileRow({ row, onMore }: { row: Row; onMore: () => void }) {
  const h = row.fleet.host
  const series = row.traffic?.requests.slice(0, -1) ?? []
  const now = series.at(-1) ?? 0
  const live = row.proxy?.capabilities.traffic && h.enabled
  const target = hostTarget(h.config) || hostTypeMeta[h.config.type].label
  return (
    <li className="flex items-center">
      <Link
        href={hostHref(h.proxy_id, h.id)}
        className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-1 outline-none active:bg-muted"
      >
        <SiteIcon row={row} className="size-10" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "truncate font-mono text-body font-medium",
                !h.enabled && "text-ash",
              )}
            >
              {hostName(h)}
            </span>
            {!h.enabled && <Tag>Off</Tag>}
          </span>
          <span className="truncate text-body-sm text-muted-foreground">
            {target} · {row.fleet.server_name}
          </span>
        </span>
        {live && (
          <span className="flex shrink-0 flex-col items-end gap-1">
            <Sparkline
              values={series}
              tone={series.some((v) => v > 0) ? "brand" : "muted"}
              className="h-5 w-14"
            />
            <span className="text-caption text-ash tabular-nums">
              {count(now)}/min
            </span>
          </span>
        )}
      </Link>
      <MoreButton label={`${hostName(h)} actions`} onClick={onMore} />
    </li>
  )
}

export function MoreButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="me-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ash outline-none active:bg-muted"
    >
      <Ellipsis className="size-5" />
    </button>
  )
}

function ListSkeleton() {
  return (
    <ul className="mt-3 divide-y divide-border border-y border-border">
      {Array.from({ length: 4 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <li key={i} className="flex h-[4.5rem] items-center gap-3 px-4">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </li>
      ))}
    </ul>
  )
}
