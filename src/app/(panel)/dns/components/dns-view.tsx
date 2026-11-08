"use client"

import {
  CloudOff,
  Ellipsis,
  Globe,
  Plus,
  RefreshCw,
  Server,
  Star,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { useRef, useState } from "react"

import {
  Empty,
  type Item,
  ItemMenu,
  Notices,
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
import type { DNSServer, DNSZoneCopy, DNSZoneGroup } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useCheckingDnsServers,
  useDnsServers,
  useZonesEverywhere,
} from "../api"
import { useDnsActions, useServerMenu, useZoneMenu } from "./dns-actions"
import {
  DnsStatusDot,
  dnsStatusMeta,
  hostOf,
  serverHref,
  sortServers,
  zoneDisplayName,
  zoneHref,
  zoneProblem,
  zoneTypeLabel,
} from "./meta"
import {
  ActionSheet,
  chipClass,
  ServerStatus,
  ServerTile,
  Tag,
  Th,
} from "./parts"
import { useCanAddDns, useDnsCan } from "./permissions"

const tabs = ["zones", "servers"] as const

export const dnsFilters = {
  tab: parseAsStringLiteral(tabs).withDefault("zones"),
  q: parseAsString.withDefault(""),
}

const useFilters = () => useQueryStates(dnsFilters, { history: "replace" })

// The copy a zone's row opens: the one you edit (Primary), else the first.
const mainCopy = (g: DNSZoneGroup) =>
  g.copies.find((c) => c.type === "Primary") ?? g.copies[0]

// The worst thing about a zone across its copies, for its status cell.
function groupState(g: DNSZoneGroup): {
  label: string
  tone: "warning" | "destructive" | "muted"
} | null {
  for (const c of g.copies) {
    const p = zoneProblem(c)
    if (p) return { label: `${p} on ${c.server_name}`, tone: "destructive" }
  }
  if (g.out_of_sync) return { label: "Out of sync", tone: "warning" }
  if (g.copies.every((c) => c.disabled))
    return { label: "Disabled", tone: "muted" }
  return null
}

function useData() {
  const servers = useDnsServers()
  const zones = useZonesEverywhere()
  const [{ tab, q }, setFilters] = useFilters()
  const all = sortServers(servers.data?.items ?? [])
  const byId = new Map(all.map((s) => [s.id, s]))
  const needle = q.trim().toLowerCase()
  const groups = (zones.data?.zones ?? []).filter(
    (g) =>
      !needle ||
      g.name.toLowerCase().includes(needle) ||
      g.copies.some((c) => c.server_name.toLowerCase().includes(needle)),
  )
  const shownServers = all.filter(
    (s) =>
      !needle ||
      [s.name, s.url, s.description, s.server_domain].some((v) =>
        v.toLowerCase().includes(needle),
      ),
  )
  return {
    servers,
    zones,
    all,
    byId,
    tab,
    q,
    setFilters,
    groups,
    shownServers,
    zoneCount: zones.data?.zones.length ?? 0,
  }
}

function useCanNewZone(all: DNSServer[]) {
  const can = useDnsCan()
  return all.some((s) => s.status === "online" && can(s, "engineer"))
}

export function DnsView() {
  const isPhone = useIsPhone()
  if (isPhone === null) return null
  return isPhone ? <DnsMobile /> : <DnsDesktop />
}

function DnsDesktop() {
  const actions = useDnsActions()
  const canAdd = useCanAddDns()
  const d = useData()
  const canNewZone = useCanNewZone(d.all)
  const fetching = d.servers.isFetching || d.zones.isFetching

  return (
    <div className="flex flex-col gap-4 px-6 pt-5 pb-24">
      {d.servers.isPending ? (
        <TableSkeleton />
      ) : d.servers.isError && !d.servers.data ? (
        <div className="rounded-2xl border border-border">
          <Failed error={d.servers.error} onRetry={() => d.servers.refetch()} />
        </div>
      ) : d.all.length === 0 ? (
        <NoServers onAdd={canAdd ? actions.addServer : undefined} />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Segmented
              label="Show"
              value={d.tab}
              onChange={(tab) => d.setFilters({ tab })}
              items={[
                { value: "zones", label: `Zones · ${d.zoneCount}` },
                { value: "servers", label: `Servers · ${d.all.length}` },
              ]}
            />
            <SearchBox
              value={d.q}
              onChange={(q) => d.setFilters({ q: q || null })}
              placeholder={
                d.tab === "zones" ? "Search zones" : "Search servers"
              }
              label={d.tab === "zones" ? "Search zones" : "Search servers"}
            />
            <span className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh"
              disabled={fetching}
              onClick={() => {
                d.servers.refetch()
                d.zones.refetch()
              }}
            >
              <RefreshCw className={cn(fetching && "animate-spin")} />
            </Button>
            {canNewZone && (
              <Button variant="outline" onClick={() => actions.newZone()}>
                <Plus />
                New zone
              </Button>
            )}
            {canAdd && (
              <Button onClick={() => actions.addServer()}>
                <Plus />
                Add DNS server
              </Button>
            )}
          </div>
          <Problems problems={d.zones.data?.problems ?? []} />
          {d.tab === "zones" ? (
            <ZonesTable
              groups={d.groups}
              byId={d.byId}
              pending={d.zones.isPending}
              error={d.zones.isError && !d.zones.data ? d.zones.error : null}
              searching={!!d.q}
            />
          ) : (
            <ServersTable servers={d.shownServers} />
          )}
        </>
      )}
    </div>
  )
}

function Problems({
  problems,
}: {
  problems: { server_id: string; server_name: string; message: string }[]
}) {
  return (
    <Notices
      notes={problems.map((p) => ({
        key: p.server_id,
        warn: true,
        title: `Couldn't read zones from ${p.server_name}`,
        body: p.message,
        action: (
          <Link
            href={serverHref(p.server_id)}
            className="text-body-sm font-medium text-brand hover:underline"
          >
            Open
          </Link>
        ),
      }))}
    />
  )
}

function ZonesTable({
  groups,
  byId,
  pending,
  error,
  searching,
}: {
  groups: DNSZoneGroup[]
  byId: Map<string, DNSServer>
  pending: boolean
  error: Error | null
  searching: boolean
}) {
  const actions = useDnsActions()
  if (pending) return <TableSkeleton />
  if (error) {
    return (
      <div className="rounded-2xl border border-border">
        <Empty
          icon={CloudOff}
          title="Couldn't load zones"
          body={error.message}
        />
      </div>
    )
  }
  if (groups.length === 0) {
    return (
      <Empty
        icon={Globe}
        title={searching ? "No zone matches" : "No zones yet"}
        body={
          searching
            ? "Try another name."
            : "A zone is a domain your DNS servers answer for, like example.com."
        }
        action={
          !searching && (
            <Button onClick={() => actions.newZone()}>
              <Plus />
              New zone
            </Button>
          )
        }
      />
    )
  }
  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Zone</Th>
            <Th>On</Th>
            <Th className="hidden @3xl:table-cell">Serial</Th>
            <Th>Status</Th>
            <th scope="col" className="w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {groups.map((g) => (
            <ZoneGroupRow key={g.name} group={g} byId={byId} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ZoneGroupRow({
  group: g,
  byId,
}: {
  group: DNSZoneGroup
  byId: Map<string, DNSServer>
}) {
  const main = mainCopy(g)
  const state = groupState(g)
  const items = useGroupItems(g, byId)
  const serials = [...new Set(g.copies.map((c) => c.soa_serial))]
  return (
    <tr className="h-14 hover:bg-subtle">
      <td className="max-w-80 px-3">
        <Link
          href={zoneHref(main.server_id, g.name)}
          className="block truncate font-mono font-medium outline-none hover:text-brand focus-visible:text-brand"
        >
          {zoneDisplayName(g.name)}
        </Link>
      </td>
      <td className="px-3">
        <span className="flex flex-wrap gap-1.5 py-2">
          {g.copies.map((c) => (
            <CopyChip
              key={c.server_id}
              copy={c}
              server={byId.get(c.server_id)}
            />
          ))}
        </span>
      </td>
      <td className="hidden px-3 font-mono text-caption text-muted-foreground @3xl:table-cell">
        {serials.join(" / ")}
      </td>
      <td className="px-3 whitespace-nowrap">
        {state ? (
          <Tag tone={state.tone}>{state.label}</Tag>
        ) : (
          <span className="text-muted-foreground">
            {g.copies.length > 1 ? "In sync" : "OK"}
          </span>
        )}
      </td>
      <td className="pe-3">
        <ItemMenu groups={items} label={`${g.name} actions`} />
      </td>
    </tr>
  )
}

function CopyChip({
  copy: c,
  server,
}: {
  copy: DNSZoneCopy
  server?: DNSServer
}) {
  const problem = zoneProblem(c)
  return (
    <Link
      href={zoneHref(c.server_id, c.name)}
      title={problem ?? (c.disabled ? "Disabled" : undefined)}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border border-border px-2.5 text-caption outline-none hover:border-mist hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
        c.disabled && "text-ash line-through",
      )}
    >
      {server && <DnsStatusDot status={server.status} />}
      <span className="font-medium">{c.server_name}</span>
      <span className="text-muted-foreground">{zoneTypeLabel(c.type)}</span>
      {problem && <span className="text-destructive">· {problem}</span>}
    </Link>
  )
}

// A zone row's menu: open any copy, then the main copy's own actions.
function useGroupItems(g: DNSZoneGroup, byId: Map<string, DNSServer>) {
  const router = useRouter()
  const zoneMenu = useZoneMenu()
  const main = mainCopy(g)
  const mainServer = byId.get(main.server_id)
  const open: Item[] = g.copies.map((c) => ({
    key: `open-${c.server_id}`,
    label: `Open on ${c.server_name}`,
    icon: <Server />,
    onSelect: () => router.push(zoneHref(c.server_id, c.name)),
  }))
  return [open, ...(mainServer ? zoneMenu(mainServer, main) : [])]
}

function ServersTable({ servers }: { servers: DNSServer[] }) {
  const checking = useCheckingDnsServers()
  if (servers.length === 0) {
    return (
      <Empty icon={Server} title="No server matches" body="Try another name." />
    )
  }
  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <th scope="col" className="w-10 ps-3">
              <span className="sr-only">Favorite</span>
            </th>
            <Th>Name</Th>
            <Th>Address</Th>
            <Th>Zones</Th>
            <Th>Status</Th>
            <Th className="hidden @4xl:table-cell">Version</Th>
            <Th className="hidden @4xl:table-cell">Checked</Th>
            <th scope="col" className="w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {servers.map((s) => (
            <ServerRow key={s.id} server={s} checking={checking.has(s.id)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ServerRow({
  server: s,
  checking,
}: {
  server: DNSServer
  checking: boolean
}) {
  const actions = useDnsActions()
  const can = useDnsCan()
  const menu = useServerMenu()
  return (
    <tr className="group/row h-14 hover:bg-subtle">
      <td className="ps-3">
        <button
          type="button"
          aria-label={s.favorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={s.favorite}
          disabled={!can(s, "operator")}
          onClick={() => actions.toggleFavorite(s)}
          className={cn(
            "flex size-7 items-center justify-center rounded-lg text-ash enabled:hover:bg-muted enabled:hover:text-foreground",
            !s.favorite &&
              "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100",
          )}
        >
          <Star
            className={cn("size-4", s.favorite && "fill-brand text-brand")}
          />
        </button>
      </td>
      <td className="max-w-72 px-3">
        <Link
          href={serverHref(s.id)}
          className="flex items-center gap-3 outline-none hover:text-brand focus-visible:text-brand"
        >
          <ServerTile className="size-7 rounded-md" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{s.name}</span>
            {s.description && (
              <span className="block truncate text-caption text-ash">
                {s.description}
              </span>
            )}
          </span>
        </Link>
      </td>
      <td className="max-w-72 truncate px-3 font-mono text-caption text-muted-foreground">
        {hostOf(s.url)}
      </td>
      <td className="px-3 tabular-nums">
        {s.status === "online" || s.zone_count > 0 ? s.zone_count : "—"}
      </td>
      <td className="px-3">
        <ServerStatus server={s} checking={checking} />
      </td>
      <td className="hidden px-3 whitespace-nowrap text-muted-foreground @4xl:table-cell">
        {s.version || "—"}
      </td>
      <td className="hidden px-3 whitespace-nowrap text-muted-foreground @4xl:table-cell">
        {timeAgo(s.last_checked_at ?? null)}
      </td>
      <td className="pe-3">
        <ItemMenu
          groups={menu(s, { open: true })}
          label={`${s.name} actions`}
        />
      </td>
    </tr>
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

function NoServers({ onAdd }: { onAdd?: () => void }) {
  return (
    <Empty
      icon={Globe}
      title={onAdd ? "Connect your first DNS server" : "No DNS servers to show"}
      body={
        onAdd
          ? "Morcheh manages Technitium DNS Server through its API. Add as many as you run: each one's zones and records show up here."
          : "Nothing here is shared with you yet. Ask an admin or the workspace owner for access."
      }
      action={
        onAdd && (
          <Button onClick={onAdd}>
            <Plus />
            Add DNS server
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
      title="Couldn't load DNS servers"
      body={error.message || "The server didn't answer. Try again."}
      action={
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  )
}

function DnsMobile() {
  const actions = useDnsActions()
  const canAdd = useCanAddDns()
  const d = useData()
  const canNewZone = useCanNewZone(d.all)
  const checking = useCheckingDnsServers()
  const serverMenu = useServerMenu()
  const [addOpen, setAddOpen] = useOpen("dns-add-sheet")
  const [sheetOpen, setSheetOpen] = useOpen("dns-row-sheet")
  const [sheet, setSheet] = useState<
    { kind: "server"; id: string } | { kind: "zone"; name: string } | null
  >(null)
  // Keep the last tapped row so its sheet can animate out.
  const last = useRef<{ title: string; groups: Item[][] } | null>(null)
  const groupItems = useGroupItemsFor(d.byId)

  let current = last.current
  if (sheet?.kind === "server") {
    const s = d.all.find((x) => x.id === sheet.id)
    if (s) current = { title: s.name, groups: serverMenu(s) }
  } else if (sheet?.kind === "zone") {
    const g = d.zones.data?.zones.find((x) => x.name === sheet.name)
    if (g) current = { title: zoneDisplayName(g.name), groups: groupItems(g) }
  }
  if (current) last.current = current

  const add = () => {
    if (canAdd && canNewZone) setAddOpen(true)
    else if (canAdd) actions.addServer()
    else actions.newZone()
  }

  return (
    <>
      <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
        <h1 className="text-heading font-light">DNS</h1>
        <HelpButton
          href={guideHref("dns")}
          label="DNS guide"
          className="ms-auto"
        />
        {(canAdd || canNewZone) && (
          <Button
            size="icon-lg"
            aria-label="Add"
            className="rounded-full"
            onClick={add}
          >
            <Plus className="size-5" />
          </Button>
        )}
      </header>

      {d.servers.isPending ? (
        <ListSkeleton />
      ) : d.servers.isError && !d.servers.data ? (
        <Failed error={d.servers.error} onRetry={() => d.servers.refetch()} />
      ) : d.all.length === 0 ? (
        <NoServers onAdd={canAdd ? actions.addServer : undefined} />
      ) : (
        <>
          <div className="flex flex-col gap-3 px-4 pt-4">
            <SearchBox
              value={d.q}
              onChange={(q) => d.setFilters({ q: q || null })}
              placeholder={
                d.tab === "zones" ? "Search zones" : "Search servers"
              }
              label={d.tab === "zones" ? "Search zones" : "Search servers"}
              className="w-full"
            />
            <nav aria-label="Show" className="flex gap-2">
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-current={d.tab === t ? "page" : undefined}
                  onClick={() => d.setFilters({ tab: t })}
                  className={chipClass}
                >
                  {t === "zones" ? "Zones" : "Servers"}
                  <span className="tabular-nums opacity-70">
                    {t === "zones" ? d.zoneCount : d.all.length}
                  </span>
                </button>
              ))}
            </nav>
          </div>
          <Problems problems={d.zones.data?.problems ?? []} />
          <div className="pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))]">
            {d.tab === "zones" ? (
              d.zones.isPending ? (
                <ListSkeleton />
              ) : d.groups.length === 0 ? (
                <Empty
                  icon={Globe}
                  title={d.q ? "No zone matches" : "No zones yet"}
                  body={
                    d.q
                      ? "Try another name."
                      : "A zone is a domain your DNS servers answer for."
                  }
                />
              ) : (
                <ul className="divide-y divide-border border-y border-border">
                  {d.groups.map((g) => (
                    <ZoneGroupItem
                      key={g.name}
                      group={g}
                      onMore={() => {
                        setSheet({ kind: "zone", name: g.name })
                        setSheetOpen(true)
                      }}
                    />
                  ))}
                </ul>
              )
            ) : d.shownServers.length === 0 ? (
              <Empty
                icon={Server}
                title="No server matches"
                body="Try another name."
              />
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {d.shownServers.map((s) => (
                  <li key={s.id} className="flex items-center">
                    <Link
                      href={serverHref(s.id)}
                      className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-1 outline-none active:bg-muted"
                    >
                      <ServerTile className="size-10" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-body font-medium">
                            {s.name}
                          </span>
                          <DnsStatusDot
                            status={s.status}
                            checking={checking.has(s.id)}
                          />
                          <span className="sr-only">
                            {dnsStatusMeta[s.status].label}
                          </span>
                        </span>
                        <span className="block truncate text-body-sm text-muted-foreground">
                          {s.zone_count} zone{s.zone_count === 1 ? "" : "s"} ·{" "}
                          <span className="font-mono text-caption">
                            {hostOf(s.url)}
                          </span>
                        </span>
                      </span>
                      {s.favorite && (
                        <Star
                          aria-label="Favorite"
                          className="size-4 shrink-0 fill-brand text-brand"
                        />
                      )}
                    </Link>
                    <button
                      type="button"
                      aria-label={`${s.name} actions`}
                      onClick={() => {
                        setSheet({ kind: "server", id: s.id })
                        setSheetOpen(true)
                      }}
                      className="me-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ash outline-none active:bg-muted"
                    >
                      <Ellipsis className="size-5" />
                    </button>
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
      <ActionSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add"
        groups={[
          [
            {
              key: "zone",
              label: "New zone",
              icon: <Globe />,
              onSelect: () => actions.newZone(),
            },
            {
              key: "server",
              label: "Add DNS server",
              icon: <Server />,
              onSelect: () => actions.addServer(),
            },
          ],
        ]}
      />
    </>
  )
}

// useGroupItems for any group (a hook can't run per row on phones).
function useGroupItemsFor(byId: Map<string, DNSServer>) {
  const router = useRouter()
  const zoneMenu = useZoneMenu()
  return (g: DNSZoneGroup): Item[][] => {
    const main = mainCopy(g)
    const mainServer = byId.get(main.server_id)
    return [
      g.copies.map((c) => ({
        key: `open-${c.server_id}`,
        label: `Open on ${c.server_name}`,
        icon: <Server />,
        onSelect: () => router.push(zoneHref(c.server_id, c.name)),
      })),
      ...(mainServer ? zoneMenu(mainServer, main) : []),
    ]
  }
}

function ZoneGroupItem({
  group: g,
  onMore,
}: {
  group: DNSZoneGroup
  onMore: () => void
}) {
  const main = mainCopy(g)
  const state = groupState(g)
  return (
    <li className="flex items-center">
      <Link
        href={zoneHref(main.server_id, g.name)}
        className="flex min-h-16 min-w-0 flex-1 flex-col justify-center gap-0.5 py-3 ps-4 pe-1 outline-none active:bg-muted"
      >
        <span className="flex items-center gap-2">
          <span className="truncate font-mono text-body font-medium">
            {zoneDisplayName(g.name)}
          </span>
          {state && <Tag tone={state.tone}>{state.label}</Tag>}
        </span>
        <span className="truncate text-body-sm text-muted-foreground">
          {g.copies
            .map((c) => `${c.server_name} (${zoneTypeLabel(c.type)})`)
            .join(" · ")}
        </span>
      </Link>
      <button
        type="button"
        aria-label={`${g.name} actions`}
        onClick={onMore}
        className="me-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ash outline-none active:bg-muted"
      >
        <Ellipsis className="size-5" />
      </button>
    </li>
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
