"use client"

import {
  CloudOff,
  Ellipsis,
  Globe,
  Lock,
  Plus,
  RefreshCw,
  Server,
  Split,
} from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"

import {
  Empty,
  type Item,
  ItemMenu,
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type { ProxyFleetHost, Proxy as ReverseProxy } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useFleetHosts, useProxies } from "../api"
import {
  domainsText,
  hostHref,
  hostTarget,
  hostTypeMeta,
  type ProxyStatus,
  ProxyStatusDot,
  proxyHref,
  proxyStatusMeta,
  useProxyListFilters,
} from "./meta"
import { ActionSheet, chipClass, Tag, Th } from "./parts"
import { useCanAddProxy } from "./permissions"
import { useHostMenu, useProxyActions, useProxyMenu } from "./proxy-actions"

// Proxies with a problem first, then by server name.
const rank = (p: ReverseProxy) =>
  p.status === "online"
    ? p.host_problems > 0
      ? 1
      : 2
    : p.status === "unknown"
      ? 2
      : 0

function useData() {
  const proxies = useProxies()
  const fleet = useFleetHosts()
  const [{ tab, q }, setFilters] = useProxyListFilters()
  const all = [...(proxies.data?.items ?? [])].sort(
    (a, b) => rank(a) - rank(b) || a.server_name.localeCompare(b.server_name),
  )
  const byId = new Map(all.map((p) => [p.id, p]))
  const needle = q.trim().toLowerCase()
  const hosts = [...(fleet.data?.items ?? [])]
    .sort((a, b) =>
      (a.host.domains[0] ?? "").localeCompare(b.host.domains[0] ?? ""),
    )
    .filter(
      (h) =>
        !needle ||
        h.host.domains.some((d) => d.toLowerCase().includes(needle)) ||
        hostTarget(h.host.config).toLowerCase().includes(needle) ||
        h.server_name.toLowerCase().includes(needle) ||
        h.host.note.toLowerCase().includes(needle),
    )
  const shownProxies = all.filter(
    (p) =>
      !needle ||
      [p.server_name, p.server_host, p.kind_label].some((v) =>
        v.toLowerCase().includes(needle),
      ),
  )
  return {
    proxies,
    fleet,
    all,
    byId,
    tab,
    q,
    setFilters,
    hosts,
    shownProxies,
    hostCount: fleet.data?.items.length ?? 0,
  }
}

type Data = ReturnType<typeof useData>

export function ProxyView() {
  const isPhone = useIsPhone()
  if (isPhone === null) return null
  return isPhone ? <ProxyMobile /> : <ProxyDesktop />
}

function ProxyDesktop() {
  const actions = useProxyActions()
  const canAdd = useCanAddProxy()
  const d = useData()
  const fetching = d.proxies.isFetching || d.fleet.isFetching

  return (
    <div className="flex flex-col gap-4 px-6 pt-5 pb-24">
      {d.proxies.isPending ? (
        <TableSkeleton />
      ) : d.proxies.isError && !d.proxies.data ? (
        <div className="rounded-2xl border border-border">
          <Failed error={d.proxies.error} onRetry={() => d.proxies.refetch()} />
        </div>
      ) : d.all.length === 0 ? (
        <NoProxies onAdd={canAdd ? () => actions.add() : undefined} />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Segmented
              label="Show"
              value={d.tab}
              onChange={(tab) => d.setFilters({ tab })}
              items={[
                { value: "sites", label: `Sites · ${d.hostCount}` },
                { value: "proxies", label: `Proxies · ${d.all.length}` },
              ]}
            />
            <SearchBox
              value={d.q}
              onChange={(q) => d.setFilters({ q: q || null })}
              placeholder={
                d.tab === "sites" ? "Search sites" : "Search proxies"
              }
              label={d.tab === "sites" ? "Search sites" : "Search proxies"}
            />
            <span className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh"
              disabled={fetching}
              onClick={() => {
                d.proxies.refetch()
                d.fleet.refetch()
              }}
            >
              <RefreshCw className={cn(fetching && "animate-spin")} />
            </Button>
            {canAdd && (
              <Button onClick={() => actions.add()}>
                <Plus />
                Add proxy
              </Button>
            )}
          </div>
          {d.tab === "sites" ? (
            <SitesTable d={d} />
          ) : (
            <ProxiesTable proxies={d.shownProxies} />
          )}
        </>
      )}
    </div>
  )
}

function SitesTable({ d }: { d: Data }) {
  const menu = useHostMenu()
  if (d.fleet.isPending) return <TableSkeleton />
  if (d.fleet.isError && !d.fleet.data) {
    return (
      <div className="rounded-2xl border border-border">
        <Empty
          icon={CloudOff}
          title="Couldn't load sites"
          body={d.fleet.error.message}
        />
      </div>
    )
  }
  if (d.hosts.length === 0) return <NoSites d={d} />
  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Domain</Th>
            <Th>Goes to</Th>
            <Th>Proxy</Th>
            <Th className="hidden @4xl:table-cell">Changed</Th>
            <th scope="col" className="w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {d.hosts.map((h) => {
            const p = d.byId.get(h.host.proxy_id)
            return (
              <tr key={h.host.id} className="h-14 hover:bg-subtle">
                <td className="max-w-80 px-3">
                  <HostName fleet={h} />
                </td>
                <td className="max-w-80 px-3">
                  <HostTarget fleet={h} />
                </td>
                <td className="px-3 whitespace-nowrap">
                  <Link
                    href={proxyHref(h.host.proxy_id)}
                    className="inline-flex items-center gap-1.5 hover:text-brand"
                  >
                    <ProxyStatusDot status={h.proxy_status as ProxyStatus} />
                    {h.server_name}
                    <span className="text-muted-foreground">
                      {p?.kind_label ?? h.kind}
                    </span>
                  </Link>
                </td>
                <td className="hidden px-3 whitespace-nowrap text-muted-foreground @4xl:table-cell">
                  {timeAgo(h.host.updated_at)}
                  {h.host.updated_by_name && ` · ${h.host.updated_by_name}`}
                </td>
                <td className="pe-3">
                  {p && (
                    <ItemMenu
                      groups={menu(p, h.host)}
                      label={`${domainsText(h.host.domains)} actions`}
                    />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function HostName({ fleet: h }: { fleet: ProxyFleetHost }) {
  const tls = !!h.host.config.tls?.enabled
  return (
    <Link
      href={hostHref(h.host.proxy_id, h.host.id)}
      className="flex min-w-0 items-center gap-2 outline-none hover:text-brand focus-visible:text-brand"
    >
      {tls ? (
        <Lock aria-label="https" className="size-3.5 shrink-0 text-success" />
      ) : (
        <Globe aria-label="http only" className="size-3.5 shrink-0 text-ash" />
      )}
      <span
        className={cn(
          "truncate font-mono font-medium",
          !h.host.enabled && "text-ash line-through",
        )}
      >
        {domainsText(h.host.domains)}
      </span>
      {!h.host.enabled && <Tag>Off</Tag>}
    </Link>
  )
}

function HostTarget({ fleet: h }: { fleet: ProxyFleetHost }) {
  const t = hostTypeMeta[h.host.config.type]
  const Icon = t.icon
  return (
    <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
      <Icon aria-label={t.label} className="size-3.5 shrink-0 text-ash" />
      <span className="truncate font-mono text-caption">
        {hostTarget(h.host.config) || t.label}
      </span>
    </span>
  )
}

function ProxiesTable({ proxies }: { proxies: ReverseProxy[] }) {
  const menu = useProxyMenu()
  if (proxies.length === 0) {
    return (
      <Empty icon={Server} title="No proxy matches" body="Try another name." />
    )
  }
  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Server</Th>
            <Th>Proxy</Th>
            <Th>Sites</Th>
            <Th>Status</Th>
            <Th className="hidden @4xl:table-cell">Checked</Th>
            <th scope="col" className="w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {proxies.map((p) => (
            <tr key={p.id} className="h-14 hover:bg-subtle">
              <td className="max-w-72 px-3">
                <Link
                  href={proxyHref(p.id)}
                  className="flex items-center gap-3 outline-none hover:text-brand focus-visible:text-brand"
                >
                  <ProxyTile className="size-7 rounded-md" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {p.server_name}
                    </span>
                    <span className="block truncate font-mono text-caption text-ash">
                      {p.server_host}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="px-3 whitespace-nowrap">
                {p.kind_label}
                {p.version && (
                  <span className="text-muted-foreground"> {p.version}</span>
                )}
              </td>
              <td className="px-3 tabular-nums">
                {p.host_count}
                {p.host_problems > 0 && (
                  <Tag tone="warning" className="ms-2">
                    {p.host_problems} need attention
                  </Tag>
                )}
              </td>
              <td className="px-3">
                <ProxyStatusText proxy={p} />
              </td>
              <td className="hidden px-3 whitespace-nowrap text-muted-foreground @4xl:table-cell">
                {timeAgo(p.last_checked_at ?? null)}
              </td>
              <td className="pe-3">
                <ItemMenu
                  groups={menu(p, { open: true })}
                  label={`${p.server_name} actions`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ProxyStatusText({ proxy: p }: { proxy: ReverseProxy }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
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

function NoSites({ d }: { d: Data }) {
  const first = d.all[0]
  if (d.q) {
    return (
      <Empty icon={Globe} title="No site matches" body="Try another name." />
    )
  }
  return (
    <Empty
      icon={Globe}
      title="No sites yet"
      body="A site is a domain the proxy answers for: it passes visitors on to an app, redirects them, or serves files."
      action={
        d.all.length === 1 &&
        first && (
          <Link
            href={proxyHref(first.id)}
            className="text-body-sm font-medium text-brand hover:underline"
          >
            Open {first.server_name}
          </Link>
        )
      }
    />
  )
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          key={i}
          className="flex h-14 items-center gap-3 border-b border-border px-4 last:border-b-0"
        >
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ms-auto h-4 w-56" />
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
          ? "Pick a server and Morcheh runs nginx on it over SSH: put your apps behind domains, redirect old addresses and serve files, all from here. Sites already on the server keep working."
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

function ProxyMobile() {
  const actions = useProxyActions()
  const canAdd = useCanAddProxy()
  const d = useData()
  const proxyMenu = useProxyMenu()
  const hostMenu = useHostMenu()
  const [sheetOpen, setSheetOpen] = useOpen("proxy-row-sheet")
  const [sheet, setSheet] = useState<
    { kind: "proxy"; id: string } | { kind: "host"; id: string } | null
  >(null)
  // Keep the last tapped row so its sheet can animate out.
  const last = useRef<{ title: string; groups: Item[][] } | null>(null)

  let current = last.current
  if (sheet?.kind === "proxy") {
    const p = d.byId.get(sheet.id)
    if (p) current = { title: p.server_name, groups: proxyMenu(p) }
  } else if (sheet?.kind === "host") {
    const h = d.fleet.data?.items.find((x) => x.host.id === sheet.id)
    const p = h && d.byId.get(h.host.proxy_id)
    if (h && p)
      current = {
        title: domainsText(h.host.domains),
        groups: hostMenu(p, h.host),
      }
  }
  if (current) last.current = current

  return (
    <>
      <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
        <h1 className="text-heading font-light">Reverse proxy</h1>
        <HelpButton
          href={guideHref("reverse-proxy")}
          label="Reverse proxy guide"
          className="ms-auto"
        />
        {canAdd && (
          <Button
            size="icon-lg"
            aria-label="Add proxy"
            className="rounded-full"
            onClick={() => actions.add()}
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
          <div className="flex flex-col gap-3 px-4 pt-4">
            <SearchBox
              value={d.q}
              onChange={(q) => d.setFilters({ q: q || null })}
              placeholder={
                d.tab === "sites" ? "Search sites" : "Search proxies"
              }
              label={d.tab === "sites" ? "Search sites" : "Search proxies"}
              className="w-full"
            />
            <nav aria-label="Show" className="flex gap-2">
              {(["sites", "proxies"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-current={d.tab === t ? "page" : undefined}
                  onClick={() => d.setFilters({ tab: t })}
                  className={chipClass}
                >
                  {t === "sites" ? "Sites" : "Proxies"}
                  <span className="tabular-nums opacity-70">
                    {t === "sites" ? d.hostCount : d.all.length}
                  </span>
                </button>
              ))}
            </nav>
          </div>
          <div className="pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))]">
            {d.tab === "sites" ? (
              d.fleet.isPending ? (
                <ListSkeleton />
              ) : d.hosts.length === 0 ? (
                <NoSites d={d} />
              ) : (
                <ul className="divide-y divide-border border-y border-border">
                  {d.hosts.map((h) => (
                    <li key={h.host.id} className="flex items-center">
                      <Link
                        href={hostHref(h.host.proxy_id, h.host.id)}
                        className="flex min-h-16 min-w-0 flex-1 flex-col justify-center gap-0.5 py-3 ps-4 pe-1 outline-none active:bg-muted"
                      >
                        <HostName fleet={h} />
                        <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-muted-foreground">
                          <span className="min-w-0 truncate">
                            {hostTarget(h.host.config) ||
                              hostTypeMeta[h.host.config.type].label}
                          </span>
                          <span className="shrink-0">· {h.server_name}</span>
                        </span>
                      </Link>
                      <MoreButton
                        label={`${domainsText(h.host.domains)} actions`}
                        onClick={() => {
                          setSheet({ kind: "host", id: h.host.id })
                          setSheetOpen(true)
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )
            ) : d.shownProxies.length === 0 ? (
              <Empty
                icon={Server}
                title="No proxy matches"
                body="Try another name."
              />
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {d.shownProxies.map((p) => (
                  <li key={p.id} className="flex items-center">
                    <Link
                      href={proxyHref(p.id)}
                      className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-1 outline-none active:bg-muted"
                    >
                      <ProxyTile className="size-10" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-body font-medium">
                            {p.server_name}
                          </span>
                          <ProxyStatusDot status={p.status} />
                          <span className="sr-only">
                            {proxyStatusMeta[p.status].label}
                          </span>
                        </span>
                        <span className="block truncate text-body-sm text-muted-foreground">
                          {p.kind_label} · {p.host_count} site
                          {p.host_count === 1 ? "" : "s"}
                          {p.status !== "online" &&
                            ` · ${proxyStatusMeta[p.status].label}`}
                        </span>
                      </span>
                    </Link>
                    <MoreButton
                      label={`${p.server_name} actions`}
                      onClick={() => {
                        setSheet({ kind: "proxy", id: p.id })
                        setSheetOpen(true)
                      }}
                    />
                  </li>
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
    </>
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
