"use client"

import { Ellipsis, FileText, Plus, RefreshCw, Settings2 } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { parseAsString, useQueryStates } from "nuqs"
import { useRef, useState } from "react"

import {
  Empty,
  Facts,
  type Item,
  ItemMenu,
  Notices,
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
import type { DNSRecord, DNSServer, DNSZone } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useCheckingDnsServers,
  useDnsRecords,
  useDnsServer,
  useZonesEverywhere,
  zoneFromParam,
} from "../../../../api"
import {
  useDnsActions,
  useRecordMenu,
  useZoneMenu,
} from "../../../../components/dns-actions"
import {
  copiedZone,
  formatTtl,
  recordValue,
  relativeName,
  serverHref,
  zoneDisplayName,
  zoneHref,
  zoneProblem,
  zoneTypeLabel,
} from "../../../../components/meta"
import {
  ActionSheet,
  AppBar,
  chipClass,
  Missing,
  PageLoading,
  ServerBanner,
  Tag,
  Th,
} from "../../../../components/parts"
import { useDnsCan } from "../../../../components/permissions"

const filters = {
  type: parseAsString.withDefault(""),
  q: parseAsString.withDefault(""),
}

// SOA and NS first: they describe the zone itself.
const typeRank: Record<string, number> = { SOA: 0, NS: 1 }

function sortRecords(records: DNSRecord[], zone: string) {
  return [...records].sort((a, b) => {
    const an = relativeName(a.name, zone)
    const bn = relativeName(b.name, zone)
    if (an !== bn) {
      if (an === "@") return -1
      if (bn === "@") return 1
      return an.localeCompare(bn)
    }
    const ar = typeRank[a.type] ?? 9
    const br = typeRank[b.type] ?? 9
    return ar - br || a.type.localeCompare(b.type)
  })
}

// One zone on one DNS server: its records.
export function ZonePageView() {
  const params = useParams<{ id: string; zone: string }>()
  const id = params.id
  const zoneName = zoneFromParam(params.zone)
  const server = useDnsServer(id)
  const records = useDnsRecords(id, zoneName)
  const isPhone = useIsPhone()
  const s = server.data

  usePageCrumbs(
    s
      ? [
          { href: serverHref(id), label: s.name },
          { href: zoneHref(id, zoneName), label: zoneDisplayName(zoneName) },
        ]
      : [],
  )
  useFollowWorkspace(s?.workspace_id)

  if (isPhone === null) return null
  const error = server.error ?? (records.data ? null : records.error)
  if (!s || (!records.data && error)) {
    if (error) {
      const gone = error instanceof ApiError && error.status === 404
      return (
        <Missing
          title={gone ? "Zone not found" : "Couldn't load this zone"}
          body={
            gone
              ? `${zoneDisplayName(zoneName)} isn't on this server any more, or you don't have access to it.`
              : error.message
          }
          href={s ? serverHref(id) : "/dns"}
          label={s ? `Zones on ${s.name}` : "All DNS servers"}
          onRetry={
            gone
              ? undefined
              : () => {
                  server.refetch()
                  records.refetch()
                }
          }
        />
      )
    }
    return <PageLoading />
  }
  const props = {
    server: s,
    zoneName,
    zone: records.data?.zone,
    records: records.data?.records,
    fetching: records.isFetching,
    refetch: () => records.refetch(),
  }
  return isPhone ? <PhonePage {...props} /> : <DesktopPage {...props} />
}

type PageProps = {
  server: DNSServer
  zoneName: string
  zone?: DNSZone
  records?: DNSRecord[]
  fetching: boolean
  refetch: () => void
}

function useRecordsView(p: PageProps) {
  const can = useDnsCan()
  const [{ type, q }, setFilters] = useQueryStates(filters, {
    history: "replace",
  })
  const all = sortRecords(p.records ?? [], p.zoneName)
  const counts = new Map<string, number>()
  for (const r of all) counts.set(r.type, (counts.get(r.type) ?? 0) + 1)
  const types = [...counts.keys()].sort(
    (a, b) => (typeRank[a] ?? 9) - (typeRank[b] ?? 9) || a.localeCompare(b),
  )
  const needle = q.trim().toLowerCase()
  const shown = all.filter(
    (r) =>
      (!type || r.type === type) &&
      (!needle ||
        r.name.toLowerCase().includes(needle) ||
        recordValue(r).toLowerCase().includes(needle) ||
        r.comments.toLowerCase().includes(needle)),
  )
  const zoneType = p.zone?.type ?? ""
  const readOnly = copiedZone(zoneType)
  const editable =
    !readOnly && can(p.server, "engineer") && p.server.status === "online"
  return { type, q, setFilters, all, counts, types, shown, readOnly, editable }
}

function useDeleted(server: DNSServer) {
  const router = useRouter()
  return () => router.replace(serverHref(server.id))
}

// A copied zone: where to change it instead.
function CopyNotice({
  server,
  zone,
  className,
}: {
  server: DNSServer
  zone: DNSZone
  className?: string
}) {
  const copied = copiedZone(zone.type)
  const everywhere = useZonesEverywhere(copied)
  if (!copied) return null
  const primary = everywhere.data?.zones
    .find((g) => g.name === zone.name)
    ?.copies.find((c) => c.type === "Primary" && c.server_id !== server.id)
  return (
    <Notices
      className={className}
      notes={[
        {
          key: "copied",
          title: `A ${zoneTypeLabel(zone.type).toLowerCase()} copy: read-only here`,
          body: primary
            ? `Change the records on ${primary.server_name}; this server copies them from there.`
            : "Its records come from the primary server and are changed there.",
          action: primary && (
            <Link
              href={zoneHref(primary.server_id, zone.name)}
              className="shrink-0 text-body-sm font-medium text-brand hover:underline"
            >
              Open primary
            </Link>
          ),
        },
      ]}
    />
  )
}

function ZoneTags({ zone }: { zone?: DNSZone }) {
  if (!zone) return null
  const problem = zoneProblem(zone)
  return (
    <>
      {problem && <Tag tone="destructive">{problem}</Tag>}
      {zone.disabled && <Tag>Disabled</Tag>}
    </>
  )
}

function DesktopPage(p: PageProps) {
  const { server: s, zone } = p
  const actions = useDnsActions()
  const zoneMenu = useZoneMenu()
  const checking = useCheckingDnsServers().has(s.id)
  const onDeleted = useDeleted(s)
  const v = useRecordsView(p)
  const info = zone ?? { name: p.zoneName, type: "", disabled: false }

  return (
    <div className="flex flex-col pb-24">
      <div className="flex w-full items-center gap-4 px-6 pt-5 pb-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
          <FileText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-mono text-subheading font-medium">
              {zoneDisplayName(p.zoneName)}
            </h1>
            <ZoneTags zone={zone} />
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
            {zone && <span>{zoneTypeLabel(zone.type)} zone</span>}
            <Link
              href={serverHref(s.id)}
              className="hover:text-brand hover:underline"
            >
              on {s.name}
            </Link>
            {zone?.soa_serial ? (
              <span className="font-mono text-caption">
                serial {zone.soa_serial}
              </span>
            ) : null}
            {zone?.last_modified && (
              <span>changed {timeAgo(zone.last_modified).toLowerCase()}</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {zone && (
            <Button
              variant="outline"
              onClick={() => actions.zoneSettings(s, zone)}
            >
              <Settings2 />
              Settings
            </Button>
          )}
          {v.editable && (
            <Button onClick={() => actions.addRecord(s, p.zoneName)}>
              <Plus />
              Add record
            </Button>
          )}
          <ItemMenu
            groups={zoneMenu(s, info, { onDeleted }).map((g) =>
              g.filter((i) => i.key !== "settings"),
            )}
            label="Zone actions"
            trigger={
              <Button variant="outline" size="icon" aria-label="Zone actions">
                <Ellipsis />
              </Button>
            }
          />
        </div>
      </div>
      <div className="flex flex-col gap-3 px-6">
        <ServerBanner server={s} checking={checking} />
        {zone && <CopyNotice server={s} zone={zone} />}
      </div>

      <div className="flex flex-col gap-4 px-6 pt-4">
        <div className="flex items-center gap-3">
          <SearchBox
            value={v.q}
            onChange={(q) => v.setFilters({ q: q || null })}
            placeholder="Search records"
            label="Search records"
          />
          <TypeChips v={v} />
          <span className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh records"
            disabled={p.fetching}
            onClick={p.refetch}
          >
            <RefreshCw className={cn(p.fetching && "animate-spin")} />
          </Button>
        </div>
        {!p.records ? (
          <RecordsSkeleton />
        ) : v.shown.length === 0 ? (
          <NoRecords p={p} v={v} />
        ) : (
          <RecordsTable p={p} v={v} />
        )}
      </div>
    </div>
  )
}

type View = ReturnType<typeof useRecordsView>

function TypeChips({ v, phone }: { v: View; phone?: boolean }) {
  const chips = [
    { value: "", label: "All", count: v.all.length },
    ...v.types.map((t) => ({
      value: t,
      label: t,
      count: v.counts.get(t) ?? 0,
    })),
  ]
  // A filter left on a type that's gone (its last record deleted).
  if (v.type && !v.counts.has(v.type)) {
    chips.push({ value: v.type, label: v.type, count: 0 })
  }
  return (
    <nav
      aria-label="Record type"
      className={cn(
        "no-scrollbar flex gap-1.5 overflow-x-auto",
        phone ? "gap-2 px-4" : "min-w-0",
      )}
    >
      {chips.map((c) => (
        <button
          key={c.value || "all"}
          type="button"
          aria-current={v.type === c.value ? "page" : undefined}
          onClick={() => v.setFilters({ type: c.value || null })}
          className={cn(chipClass, !phone && "h-8 px-3")}
        >
          {c.label}
          <span className="tabular-nums opacity-70">{c.count}</span>
        </button>
      ))}
    </nav>
  )
}

function NoRecords({ p, v }: { p: PageProps; v: View }) {
  const actions = useDnsActions()
  const filtered = !!v.q || !!v.type
  return (
    <Empty
      icon={FileText}
      title={filtered ? "No record matches" : "No records yet"}
      body={
        filtered
          ? "Try another name or value, or show every type."
          : "Add an A record to point a name at an address."
      }
      action={
        filtered ? (
          <Button
            variant="outline"
            onClick={() => v.setFilters({ q: null, type: null })}
          >
            Clear filters
          </Button>
        ) : (
          v.editable && (
            <Button onClick={() => actions.addRecord(p.server, p.zoneName)}>
              <Plus />
              Add record
            </Button>
          )
        )
      }
    />
  )
}

function RecordsTable({ p, v }: { p: PageProps; v: View }) {
  const actions = useDnsActions()
  const menu = useRecordMenu(p.server, p.zoneName, !v.editable)
  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full table-fixed text-body-sm">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-24" />
          <col />
          <col className="w-24" />
          <col className="hidden w-[18%] @4xl:table-column" />
          <col className="w-12" />
        </colgroup>
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Name</Th>
            <Th>Type</Th>
            <Th>Value</Th>
            <Th>TTL</Th>
            <Th className="hidden @4xl:table-cell">Note</Th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {v.shown.map((r, i) => {
            const edit = v.editable && r.editable
            const name = relativeName(r.name, p.zoneName)
            return (
              <tr
                // Records have no id: name + type + value is what Technitium
                // keys them by; the index breaks ties on exact duplicates.
                // biome-ignore lint/suspicious/noArrayIndexKey: see above
                key={`${r.name}|${r.type}|${recordValue(r)}|${i}`}
                className={cn(
                  "h-12 hover:bg-subtle",
                  edit && "cursor-pointer",
                  r.disabled && "text-ash",
                )}
                onClick={
                  edit
                    ? (e) => {
                        // Not when the click came from the row's menu.
                        if ((e.target as HTMLElement).closest("button")) return
                        actions.editRecord(p.server, p.zoneName, r)
                      }
                    : undefined
                }
              >
                <td className="truncate px-3 font-mono" title={r.name}>
                  {edit ? (
                    <button
                      type="button"
                      onClick={() =>
                        actions.editRecord(p.server, p.zoneName, r)
                      }
                      className="max-w-full truncate font-medium outline-none hover:text-brand focus-visible:text-brand"
                    >
                      {name}
                    </button>
                  ) : (
                    <span className="font-medium">{name}</span>
                  )}
                </td>
                <td className="px-3">
                  <span className="flex items-center gap-1.5">
                    <Tag tone={r.disabled ? "muted" : "brand"}>{r.type}</Tag>
                  </span>
                </td>
                <td
                  className="truncate px-3 font-mono text-caption"
                  title={recordValue(r)}
                >
                  {r.disabled && <Tag className="me-2 font-sans">Disabled</Tag>}
                  {recordValue(r)}
                </td>
                <td className="px-3 whitespace-nowrap text-muted-foreground">
                  {formatTtl(r.ttl)}
                </td>
                <td
                  className="hidden truncate px-3 text-muted-foreground @4xl:table-cell"
                  title={r.comments}
                >
                  {r.comments}
                </td>
                <td className="pe-3">
                  <ItemMenu
                    groups={menu(r)}
                    label={`${name} ${r.type} actions`}
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

function RecordsSkeleton({ phone }: { phone?: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden",
        phone ? "border-y border-border" : "rounded-2xl border border-border",
      )}
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          key={i}
          className="flex h-12 items-center gap-3 border-b border-border px-4 last:border-b-0"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-56" />
        </div>
      ))}
    </div>
  )
}

function PhonePage(p: PageProps) {
  const { server: s, zone } = p
  const actions = useDnsActions()
  const zoneMenu = useZoneMenu()
  const checking = useCheckingDnsServers().has(s.id)
  const back = useBack(serverHref(s.id))
  const onDeleted = useDeleted(s)
  const v = useRecordsView(p)
  const menu = useRecordMenu(s, p.zoneName, !v.editable)
  const [zoneOpen, setZoneOpen] = useOpen("dns-zone-sheet")
  const [recordOpen, setRecordOpen] = useOpen("dns-record-sheet")
  const [picked, setPicked] = useState<DNSRecord | null>(null)
  // Kept so the sheet can animate out after its record is deleted.
  const last = useRef<{
    record: DNSRecord
    groups: Item[][]
  } | null>(null)
  if (picked) last.current = { record: picked, groups: menu(picked) }
  const info = zone ?? { name: p.zoneName, type: "", disabled: false }

  return (
    <div className="flex min-h-svh flex-col pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <AppBar
        title={zoneDisplayName(p.zoneName)}
        subtitle={
          <>
            {zone && `${zoneTypeLabel(zone.type)} · `}
            {s.name}
          </>
        }
        path={zoneHref(s.id, p.zoneName)}
        onBack={back}
        onMenu={() => setZoneOpen(true)}
        menuLabel="Zone actions"
      />
      <ServerBanner server={s} checking={checking} />
      {zone && (
        <CopyNotice
          server={s}
          zone={zone}
          className="max-md:mt-0 max-md:border-t-0"
        />
      )}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <SearchBox
          value={v.q}
          onChange={(q) => v.setFilters({ q: q || null })}
          placeholder="Search records"
          label="Search records"
          className="min-w-0 flex-1"
        />
        {v.editable && (
          <Button
            size="icon-lg"
            aria-label="Add record"
            className="rounded-full"
            onClick={() => actions.addRecord(s, p.zoneName)}
          >
            <Plus className="size-5" />
          </Button>
        )}
      </div>
      {p.records && v.all.length > 0 && <TypeChips v={v} phone />}
      <div className="pt-3">
        {!p.records ? (
          <RecordsSkeleton phone />
        ) : v.shown.length === 0 ? (
          <NoRecords p={p} v={v} />
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {v.shown.map((r, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: records have no id
                key={`${r.name}|${r.type}|${recordValue(r)}|${i}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setPicked(r)
                    setRecordOpen(true)
                  }}
                  className={cn(
                    "flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start outline-none active:bg-muted",
                    r.disabled && "text-ash",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-mono text-body font-medium">
                        {relativeName(r.name, p.zoneName)}
                      </span>
                      <Tag tone={r.disabled ? "muted" : "brand"}>{r.type}</Tag>
                      {r.disabled && <Tag>Disabled</Tag>}
                    </span>
                    <span className="block truncate font-mono text-caption text-muted-foreground">
                      {recordValue(r)}
                    </span>
                  </span>
                  <Ellipsis className="size-5 shrink-0 text-ash" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ActionSheet
        open={zoneOpen}
        onOpenChange={setZoneOpen}
        title={zoneDisplayName(p.zoneName)}
        groups={zoneMenu(s, info, { onDeleted })}
      />
      {last.current && (
        <ActionSheet
          open={recordOpen}
          onOpenChange={(open) => {
            setRecordOpen(open)
            if (!open) setPicked(null)
          }}
          title={`${relativeName(last.current.record.name, p.zoneName)} · ${last.current.record.type}`}
          head={
            <Facts
              items={[
                {
                  label: "Value",
                  value: recordValue(last.current.record),
                  wide: true,
                  mono: true,
                },
                { label: "TTL", value: formatTtl(last.current.record.ttl) },
                {
                  label: "State",
                  value: last.current.record.disabled
                    ? "Disabled"
                    : "Answering",
                },
                ...(last.current.record.comments
                  ? [
                      {
                        label: "Note",
                        value: last.current.record.comments,
                        wide: true,
                      },
                    ]
                  : []),
              ]}
            />
          }
          groups={last.current.groups}
        />
      )}
    </div>
  )
}
