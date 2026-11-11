"use client"

import { Cable, Ellipsis, Globe, Lock, Plus, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"

import {
  Empty,
  type Item,
  ItemMenu,
  SearchBox,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type {
  ProxyDetail,
  ProxyHost,
  ProxyHostState,
  Proxy as ReverseProxy,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { useInspection, useProxy } from "../../api"
import {
  byHostName,
  canWrite,
  hostHref,
  hostName,
  hostStateMeta,
  hostTarget,
  hostTypeMeta,
  newHostHref,
  useProxyPageFilters,
} from "../../components/meta"
import { ActionSheet, Tag, Th } from "../../components/parts"
import { useProxyCan } from "../../components/permissions"
import { useHostMenu } from "../../components/proxy-actions"
import { inspectable, Toolbar } from "./toolbar"

// The proxy's own sites, with how each one looks on the server right now.
export function SitesTab({ detail }: { detail: ProxyDetail }) {
  const p = detail.proxy
  const can = useProxyCan()
  const phone = useIsPhone()
  const query = useProxy(p.id)
  const inspection = useInspection(p.id, inspectable(p))
  const [{ q }, setFilters] = useProxyPageFilters()
  const states = new Map(inspection.data?.hosts.map((h) => [h.id, h]))
  const needle = q.trim().toLowerCase()
  const hosts = [...detail.hosts]
    .sort(byHostName)
    .filter(
      (h) =>
        !needle ||
        h.domains.some((d) => d.toLowerCase().includes(needle)) ||
        hostTarget(h.config).toLowerCase().includes(needle) ||
        h.note.toLowerCase().includes(needle),
    )
  const canNew = can(p, "engineer") && canWrite(p)
  const fetching = query.isFetching || inspection.isFetching
  const refresh = () => {
    query.refetch()
    if (inspectable(p)) inspection.refetch()
  }

  return (
    <>
      <Toolbar proxy={p}>
        <SearchBox
          value={q}
          onChange={(v) => setFilters({ q: v || null })}
          placeholder="Search sites"
          label="Search sites"
          className={cn(phone && "min-w-0 flex-1")}
        />
        {!phone && (
          <>
            <span className="text-caption text-ash">
              {detail.hosts.length} site{detail.hosts.length === 1 ? "" : "s"}
            </span>
            <span className="flex-1" />
          </>
        )}
        <Button
          variant="ghost"
          size={phone ? "icon-lg" : "icon"}
          aria-label="Refresh"
          disabled={fetching}
          onClick={refresh}
          className={cn(phone && "rounded-full")}
        >
          <RefreshCw className={cn(fetching && "animate-spin")} />
        </Button>
        {canNew &&
          (phone ? (
            <Link
              href={newHostHref(p.id)}
              aria-label="New site"
              className={cn(
                buttonVariants({ size: "icon-lg" }),
                "rounded-full",
              )}
            >
              <Plus className="size-5" />
            </Link>
          ) : (
            <Link href={newHostHref(p.id)} className={buttonVariants()}>
              <Plus />
              New site
            </Link>
          ))}
      </Toolbar>

      {hosts.length === 0 ? (
        <Empty
          icon={Globe}
          title={q ? "No site matches" : "No sites yet"}
          body={
            q
              ? "Try another name."
              : "Add a domain and say where it goes: an app's address, another URL, or a folder on the server. Morche writes the config, tests it and reloads."
          }
          action={
            !q &&
            canNew && (
              <Link href={newHostHref(p.id)} className={buttonVariants()}>
                <Plus />
                New site
              </Link>
            )
          }
        />
      ) : phone ? (
        <SiteList proxy={p} hosts={hosts} states={states} />
      ) : (
        <SitesTable
          proxy={p}
          hosts={hosts}
          states={states}
          checking={inspection.isPending && inspectable(p)}
        />
      )}
    </>
  )
}

type States = Map<string, ProxyHostState>

// A site's state on the server, when it isn't simply live.
function SiteState({
  host,
  state,
}: {
  host: ProxyHost
  state?: ProxyHostState
}) {
  if (!host.enabled) return <Tag>Off</Tag>
  if (!state) return null
  const conflicts = state.conflicts.length
  if (state.state === "ok" && conflicts === 0 && !state.unpublished)
    return <span className="text-body-sm text-muted-foreground">Live</span>
  return (
    <>
      {state.unpublished && (
        <span title="The proxy's container doesn't publish this port, so nothing outside the server reaches it. Publish it in the container's ports (docker run -p or compose) and recreate the container.">
          <Tag tone="warning">Port not published</Tag>
        </span>
      )}
      {state.state !== "ok" && state.state !== "off" && (
        <span title={hostStateMeta[state.state].hint}>
          <Tag tone={hostStateMeta[state.state].tone}>
            {hostStateMeta[state.state].label}
          </Tag>
        </span>
      )}
      {conflicts > 0 && (
        <span
          title={state.conflicts
            .map((c) => `${c.domain} is also in ${c.file}:${c.line}`)
            .join("\n")}
        >
          <Tag tone="warning">
            Also in {conflicts === 1 ? "another file" : `${conflicts} files`}
          </Tag>
        </span>
      )}
    </>
  )
}

export function Domain({ host }: { host: ProxyHost }) {
  const tls = !!host.config.tls?.enabled
  return (
    <span className="flex min-w-0 items-center gap-2">
      {host.config.type === "stream" ? (
        <Cable aria-label="stream" className="size-3.5 shrink-0 text-ash" />
      ) : tls ? (
        <Lock aria-label="https" className="size-3.5 shrink-0 text-success" />
      ) : (
        <Globe aria-label="http only" className="size-3.5 shrink-0 text-ash" />
      )}
      <span
        className={cn(
          "truncate font-mono font-medium",
          !host.enabled && "text-ash",
        )}
      >
        {hostName(host)}
      </span>
    </span>
  )
}

function SitesTable({
  proxy: p,
  hosts,
  states,
  checking,
}: {
  proxy: ReverseProxy
  hosts: ProxyHost[]
  states: States
  checking: boolean
}) {
  const menu = useHostMenu()
  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Domain</Th>
            <Th>Goes to</Th>
            <Th>State</Th>
            <Th className="hidden @4xl:table-cell">Changed</Th>
            <th scope="col" className="w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {hosts.map((h) => {
            const t = hostTypeMeta[h.config.type]
            const Icon = t.icon
            return (
              <tr key={h.id} className="h-14 hover:bg-subtle">
                <td className="max-w-80 px-3">
                  <Link
                    href={hostHref(p.id, h.id)}
                    className="block outline-none hover:text-brand focus-visible:text-brand"
                  >
                    <Domain host={h} />
                    {h.note && (
                      <span className="block truncate text-caption text-ash">
                        {h.note}
                      </span>
                    )}
                  </Link>
                </td>
                <td className="max-w-80 px-3">
                  <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    <Icon
                      aria-label={t.label}
                      className="size-3.5 shrink-0 text-ash"
                    />
                    <span className="truncate font-mono text-caption">
                      {hostTarget(h.config) || t.label}
                    </span>
                  </span>
                </td>
                <td className="px-3">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {checking ? (
                      <Skeleton className="h-4 w-16" />
                    ) : (
                      <SiteState host={h} state={states.get(h.id)} />
                    )}
                  </span>
                </td>
                <td className="hidden px-3 whitespace-nowrap text-muted-foreground @4xl:table-cell">
                  {timeAgo(h.updated_at)}
                  {h.updated_by_name && ` · ${h.updated_by_name}`}
                </td>
                <td className="pe-3">
                  <ItemMenu
                    groups={menu(p, h)}
                    label={`${hostName(h)} actions`}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SiteList({
  proxy: p,
  hosts,
  states,
}: {
  proxy: ReverseProxy
  hosts: ProxyHost[]
  states: States
}) {
  const menu = useHostMenu()
  const [open, setOpen] = useOpen("proxy-site-sheet")
  const [picked, setPicked] = useState<string | null>(null)
  // The last tapped site, so its sheet can animate out after a delete.
  const last = useRef<{ title: string; groups: Item[][] } | null>(null)
  const host = hosts.find((h) => h.id === picked)
  if (host) {
    last.current = { title: hostName(host), groups: menu(p, host) }
  }
  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {hosts.map((h) => (
          <li key={h.id} className="flex items-center">
            <Link
              href={hostHref(p.id, h.id)}
              className="flex min-h-16 min-w-0 flex-1 flex-col justify-center gap-1 py-3 ps-4 pe-1 outline-none active:bg-muted"
            >
              <span className="flex min-w-0 items-center gap-2 text-body">
                <Domain host={h} />
              </span>
              <span className="truncate text-body-sm text-muted-foreground">
                {hostTarget(h.config) || hostTypeMeta[h.config.type].label}
              </span>
              <span className="flex flex-wrap gap-1.5 empty:hidden">
                <SiteState host={h} state={states.get(h.id)} />
              </span>
            </Link>
            <button
              type="button"
              aria-label={`${hostName(h)} actions`}
              onClick={() => {
                setPicked(h.id)
                setOpen(true)
              }}
              className="me-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ash outline-none active:bg-muted"
            >
              <Ellipsis className="size-5" />
            </button>
          </li>
        ))}
      </ul>
      {last.current && (
        <ActionSheet
          open={open}
          onOpenChange={setOpen}
          title={last.current.title}
          groups={last.current.groups}
        />
      )}
    </>
  )
}
