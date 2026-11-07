"use client"

import {
  Activity,
  CloudOff,
  Ellipsis,
  Globe,
  Plus,
  RefreshCw,
  Star,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { parseAsString, useQueryState } from "nuqs"
import { useRef, useState } from "react"

import {
  Empty,
  type Item,
  ItemMenu,
  SearchBox,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type { DNSServer, DNSZone } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCheckingDnsServers, useDnsServer, useDnsZones } from "../../api"
import {
  useDnsActions,
  useServerMenu,
  useZoneMenu,
} from "../../components/dns-actions"
import {
  consoleHref,
  copiedZone,
  DnsStatusDot,
  dnsStatusMeta,
  hostOf,
  zoneDisplayName,
  zoneHref,
  zoneProblem,
  zoneTypeLabel,
} from "../../components/meta"
import {
  ActionSheet,
  AppBar,
  Missing,
  PageLoading,
  ServerBanner,
  ServerStatus,
  ServerTile,
  Tag,
  Th,
} from "../../components/parts"
import { useDnsCan } from "../../components/permissions"

// Zones are only asked for while the server may answer.
const reachable = (s: DNSServer) =>
  s.status === "online" || s.status === "unknown"

// One DNS server: its connection and the zones it holds.
export function ServerPageView() {
  const { id } = useParams<{ id: string }>()
  const query = useDnsServer(id)
  const isPhone = useIsPhone()
  const server = query.data

  usePageCrumbs(server ? [{ href: `/dns/${id}`, label: server.name }] : [])
  useFollowWorkspace(server?.workspace_id)

  if (isPhone === null) return null
  if (!server) {
    if (query.error) {
      const gone = query.error instanceof ApiError && query.error.status === 404
      return (
        <Missing
          title={gone ? "DNS server not found" : "Couldn't load this server"}
          body={
            gone
              ? "It was removed, or you don't have access to it."
              : query.error.message
          }
          href="/dns"
          label="All DNS servers"
          onRetry={gone ? undefined : () => query.refetch()}
        />
      )
    }
    return <PageLoading />
  }
  return isPhone ? (
    <PhonePage server={server} />
  ) : (
    <DesktopPage server={server} />
  )
}

function useZones(s: DNSServer) {
  const zones = useDnsZones(s.id, reachable(s))
  const [q, setQ] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ history: "replace" }),
  )
  const needle = q.trim().toLowerCase()
  const items = [...(zones.data?.items ?? [])]
    .filter((z) => !needle || z.name.toLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { zones, items, q, setQ, total: zones.data?.items.length ?? 0 }
}

function useRemoved() {
  const router = useRouter()
  return () => router.replace("/dns")
}

function DesktopPage({ server: s }: { server: DNSServer }) {
  const actions = useDnsActions()
  const can = useDnsCan()
  const menu = useServerMenu()
  const checking = useCheckingDnsServers().has(s.id)
  const onRemoved = useRemoved()
  const z = useZones(s)
  const operator = can(s, "operator")
  const canNewZone = can(s, "engineer") && s.status === "online"

  return (
    <div className="flex flex-col pb-24">
      <div className="flex w-full items-center gap-4 px-6 pt-5 pb-3">
        <ServerTile className="size-12 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-subheading font-medium">{s.name}</h1>
            <button
              type="button"
              aria-label={
                s.favorite ? "Remove from favorites" : "Add to favorites"
              }
              aria-pressed={s.favorite}
              disabled={!operator}
              onClick={() => actions.toggleFavorite(s)}
              className="flex size-7 items-center justify-center rounded-lg text-ash hover:bg-muted hover:text-foreground disabled:pointer-events-none"
            >
              <Star
                className={cn("size-4", s.favorite && "fill-brand text-brand")}
              />
            </button>
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
            <span className="text-foreground">
              <ServerStatus server={s} checking={checking} />
            </span>
            {s.version && <span>Technitium {s.version}</span>}
            <a
              href={consoleHref(s.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-caption hover:text-brand hover:underline"
            >
              {hostOf(s.url)}
            </a>
            {s.server_domain && <span>{s.server_domain}</span>}
            {s.description && <span className="truncate">{s.description}</span>}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {operator && (
            <Button
              variant="outline"
              disabled={checking}
              onClick={() => actions.check(s)}
            >
              <Activity />
              {checking ? "Checking…" : "Check"}
            </Button>
          )}
          {canNewZone && (
            <Button onClick={() => actions.newZone(s)}>
              <Plus />
              New zone
            </Button>
          )}
          <ItemMenu
            groups={menu(s, { onRemoved }).map((g) =>
              g.filter((i) => i.key !== "new-zone" && i.key !== "check"),
            )}
            label="Server actions"
            trigger={
              <Button variant="outline" size="icon" aria-label="Server actions">
                <Ellipsis />
              </Button>
            }
          />
        </div>
      </div>
      <ServerBanner server={s} checking={checking} className="mx-6 mb-3" />

      <div className="flex flex-col gap-4 px-6 pt-2">
        <div className="flex items-center gap-3">
          <SearchBox
            value={z.q}
            onChange={(q) => z.setQ(q || null)}
            placeholder="Search zones"
            label="Search zones"
          />
          <span className="text-caption text-ash">
            {z.zones.data
              ? `${z.total} zone${z.total === 1 ? "" : "s"}`
              : s.last_online_at
                ? `Last online ${timeAgo(s.last_online_at).toLowerCase()}`
                : ""}
          </span>
          <span className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh zones"
            disabled={z.zones.isFetching || !reachable(s)}
            onClick={() => z.zones.refetch()}
          >
            <RefreshCw className={cn(z.zones.isFetching && "animate-spin")} />
          </Button>
        </div>
        <ZonesBody server={s} z={z} canNewZone={canNewZone} />
      </div>
    </div>
  )
}

function ZonesBody({
  server: s,
  z,
  canNewZone,
}: {
  server: DNSServer
  z: ReturnType<typeof useZones>
  canNewZone: boolean
}) {
  const actions = useDnsActions()
  const phone = useIsPhone()
  if (!reachable(s) && !z.zones.data) {
    return (
      <Empty
        icon={CloudOff}
        title="Zones show once the server answers"
        body={`Morcheh can't reach this server right now (${dnsStatusMeta[s.status].label.toLowerCase()}).`}
      />
    )
  }
  if (z.zones.isPending) return <ZonesSkeleton phone={!!phone} />
  if (z.zones.isError && !z.zones.data) {
    return (
      <Empty
        icon={CloudOff}
        title="Couldn't read the zones"
        body={z.zones.error.message}
        action={
          <Button variant="outline" onClick={() => z.zones.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }
  if (z.items.length === 0) {
    return (
      <Empty
        icon={Globe}
        title={z.q ? "No zone matches" : "No zones on this server"}
        body={
          z.q
            ? "Try another name."
            : "Create a Primary zone to hold a domain's records, or a Secondary one to copy it from another server."
        }
        action={
          !z.q &&
          canNewZone && (
            <Button onClick={() => actions.newZone(s)}>
              <Plus />
              New zone
            </Button>
          )
        }
      />
    )
  }
  return phone ? (
    <ZoneList server={s} zones={z.items} />
  ) : (
    <ZonesTable server={s} zones={z.items} />
  )
}

function ZoneState({ zone }: { zone: DNSZone }) {
  const problem = zoneProblem(zone)
  if (problem) return <Tag tone="destructive">{problem}</Tag>
  if (zone.disabled) return <Tag>Disabled</Tag>
  return null
}

function ZonesTable({
  server,
  zones,
}: {
  server: DNSServer
  zones: DNSZone[]
}) {
  const menu = useZoneMenu()
  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Zone</Th>
            <Th>Type</Th>
            <Th>Status</Th>
            <Th className="hidden @3xl:table-cell">Serial</Th>
            <Th className="hidden @3xl:table-cell">Changed</Th>
            <Th className="hidden @4xl:table-cell">DNSSEC</Th>
            <th scope="col" className="w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {zones.map((z) => (
            <tr
              key={z.name}
              className={cn("h-14 hover:bg-subtle", z.disabled && "text-ash")}
            >
              <td className="max-w-96 px-3">
                <Link
                  href={zoneHref(server.id, z.name)}
                  className="block truncate font-mono font-medium outline-none hover:text-brand focus-visible:text-brand"
                >
                  {zoneDisplayName(z.name)}
                </Link>
              </td>
              <td className="px-3 whitespace-nowrap">
                {zoneTypeLabel(z.type)}
                {copiedZone(z.type) && (
                  <span className="text-ash"> · read-only</span>
                )}
              </td>
              <td className="px-3">
                <ZoneState zone={z} />
                {!zoneProblem(z) && !z.disabled && (
                  <span className="text-muted-foreground">OK</span>
                )}
              </td>
              <td className="hidden px-3 font-mono text-caption text-muted-foreground @3xl:table-cell">
                {z.soa_serial || "—"}
              </td>
              <td className="hidden px-3 whitespace-nowrap text-muted-foreground @3xl:table-cell">
                {z.last_modified ? timeAgo(z.last_modified) : "—"}
              </td>
              <td className="hidden px-3 text-muted-foreground @4xl:table-cell">
                {z.dnssec_status === "Unsigned" || !z.dnssec_status
                  ? "Off"
                  : z.dnssec_status}
              </td>
              <td className="pe-3">
                <ItemMenu
                  groups={menu(server, z)}
                  label={`${z.name} actions`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ZoneList({
  server,
  zones,
  onMore,
}: {
  server: DNSServer
  zones: DNSZone[]
  onMore?: (zone: DNSZone) => void
}) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {zones.map((z) => (
        <li key={z.name} className="flex items-center">
          <Link
            href={zoneHref(server.id, z.name)}
            className="flex min-h-16 min-w-0 flex-1 flex-col justify-center gap-0.5 py-3 ps-4 pe-1 outline-none active:bg-muted"
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "truncate font-mono text-body font-medium",
                  z.disabled && "text-ash",
                )}
              >
                {zoneDisplayName(z.name)}
              </span>
              <ZoneState zone={z} />
            </span>
            <span className="truncate text-body-sm text-muted-foreground">
              {zoneTypeLabel(z.type)}
              {z.last_modified &&
                ` · changed ${timeAgo(z.last_modified).toLowerCase()}`}
            </span>
          </Link>
          {onMore && (
            <button
              type="button"
              aria-label={`${z.name} actions`}
              onClick={() => onMore(z)}
              className="me-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ash outline-none active:bg-muted"
            >
              <Ellipsis className="size-5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

function ZonesSkeleton({ phone }: { phone: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden",
        phone ? "border-y border-border" : "rounded-2xl border border-border",
      )}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          key={i}
          className="flex h-14 items-center gap-3 border-b border-border px-4 last:border-b-0"
        >
          <Skeleton className="h-4 w-44" />
          <Skeleton className="ms-auto h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

function PhonePage({ server: s }: { server: DNSServer }) {
  const actions = useDnsActions()
  const can = useDnsCan()
  const serverMenu = useServerMenu()
  const zoneMenu = useZoneMenu()
  const checking = useCheckingDnsServers().has(s.id)
  const back = useBack("/dns")
  const onRemoved = useRemoved()
  const z = useZones(s)
  const canNewZone = can(s, "engineer") && s.status === "online"
  const [menuOpen, setMenuOpen] = useOpen("dns-server-sheet")
  const [zoneOpen, setZoneOpen] = useOpen("dns-zone-sheet")
  const [zoneName, setZoneName] = useState<string | null>(null)
  // The last tapped zone, so its sheet can animate out after a delete.
  const last = useRef<{ title: string; groups: Item[][] } | null>(null)
  const zone = z.zones.data?.items.find((x) => x.name === zoneName)
  if (zone) {
    last.current = {
      title: zoneDisplayName(zone.name),
      groups: zoneMenu(s, zone, { open: true }),
    }
  }

  return (
    <div className="flex min-h-svh flex-col pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <AppBar
        title={s.name}
        subtitle={
          <>
            <DnsStatusDot status={s.status} checking={checking} />
            {checking ? "Checking…" : dnsStatusMeta[s.status].label}
          </>
        }
        path={`/dns/${s.id}`}
        onBack={back}
        onMenu={() => setMenuOpen(true)}
        menuLabel="Server actions"
      />
      <ServerBanner server={s} checking={checking} />
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <SearchBox
          value={z.q}
          onChange={(q) => z.setQ(q || null)}
          placeholder="Search zones"
          label="Search zones"
          className="min-w-0 flex-1"
        />
        {canNewZone && (
          <Button
            size="icon-lg"
            aria-label="New zone"
            className="rounded-full"
            onClick={() => actions.newZone(s)}
          >
            <Plus className="size-5" />
          </Button>
        )}
      </div>
      {z.zones.data && z.items.length > 0 ? (
        <ZoneList
          server={s}
          zones={z.items}
          onMore={(zone) => {
            setZoneName(zone.name)
            setZoneOpen(true)
          }}
        />
      ) : (
        <ZonesBody server={s} z={z} canNewZone={canNewZone} />
      )}

      <ActionSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title={s.name}
        head={
          <p className="px-4 pb-3 text-center font-mono text-caption text-muted-foreground">
            {hostOf(s.url)}
            {s.version && ` · Technitium ${s.version}`}
          </p>
        }
        groups={serverMenu(s, { onRemoved })}
      />
      {last.current && (
        <ActionSheet
          open={zoneOpen}
          onOpenChange={setZoneOpen}
          title={last.current.title}
          groups={last.current.groups}
        />
      )}
    </div>
  )
}
