"use client"

import {
  BellOff,
  Ellipsis,
  HeartPulse,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ReactNode, useDeferredValue, useRef, useState } from "react"

import {
  Empty,
  Facts,
  ItemMenu,
  SearchBox,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import type { UptimeMonitor } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useIncidents, useMonitors } from "../api"
import { IncidentList } from "./incidents"
import { LocationDots } from "./location-report"
import {
  BeatBar,
  byState,
  certDaysLeft,
  intervalText,
  type Kind,
  KindIcon,
  kindMeta,
  matchesShow,
  type Show,
  StateBadge,
  stateMeta,
  stateOf,
  targetText,
  uptimeText,
  useUptimeFilters,
} from "./meta"
import { monitorHref, useMonitorMenu } from "./monitor-menu"
import { useUptimeCan } from "./permissions"
import { useUptimeActions } from "./uptime-actions"

export function UptimeView() {
  const phone = useIsPhone()
  if (phone === null) return null
  return <View phone={phone} />
}

export function searchMonitors(items: UptimeMonitor[], q: string) {
  const needle = q.trim().toLowerCase()
  if (!needle) return items
  return items.filter(
    (m) =>
      m.name.toLowerCase().includes(needle) ||
      m.description.toLowerCase().includes(needle) ||
      targetText(m).toLowerCase().includes(needle) ||
      kindMeta[m.kind as Kind]?.label.toLowerCase().includes(needle) ||
      m.tags.some((t) => t.toLowerCase().includes(needle)),
  )
}

function View({ phone }: { phone: boolean }) {
  const can = useUptimeCan()
  const router = useRouter()
  const list = useMonitors()
  const [{ tab, q, show, open }] = useUptimeFilters()
  const openIncidents = useIncidents(true)
  const incidents = useIncidents(open === "open")
  const needle = useDeferredValue(q)
  const all = [...(list.data ?? [])].sort(byState)
  const searched = searchMonitors(all, needle)
  const items = searched.filter((m) => matchesShow(m, show))
  const create = () => router.push("/uptime/new")
  const openCount = openIncidents.data?.length ?? 0

  const header = phone ? (
    <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
      <h1 className="text-heading font-light">Uptime</h1>
      <HelpButton
        href={guideHref("uptime")}
        label="Uptime guide"
        className="ms-auto"
      />
      {can.edit && (
        <Button
          size="icon-lg"
          aria-label="New monitor"
          className="rounded-full"
          onClick={create}
        >
          <Plus className="size-5" />
        </Button>
      )}
    </header>
  ) : null

  let body: ReactNode
  if (tab === "incidents") {
    body = (
      <IncidentList
        phone={phone}
        query={incidents}
        empty={
          open === "open"
            ? "Nothing is down right now."
            : "No incidents in the history kept."
        }
      />
    )
  } else if (list.isPending) body = <Placeholder phone={phone} />
  else if (list.isError && !list.data) {
    body = (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center md:rounded-2xl md:border md:border-border">
        <p className="text-body-sm text-muted-foreground">
          {list.error.message}
        </p>
        <Button
          variant="outline"
          className="h-11 md:h-9"
          onClick={() => list.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  } else if (all.length === 0) {
    body = (
      <Empty
        icon={HeartPulse}
        title="No monitors yet"
        body="Watch a website, an API, a port, a certificate, a database or a queue, a container on a server, or a cron job that should call in. Morcheh checks it on a schedule and tells your team when it goes down."
        action={
          can.edit && (
            <Button className="h-11 w-full md:h-9 md:w-auto" onClick={create}>
              <Plus />
              New monitor
            </Button>
          )
        }
      />
    )
  } else if (items.length === 0) {
    body = <NoMatch phone={phone} />
  } else if (phone) {
    body = <Rows items={items} />
  } else {
    body = <Table items={items} />
  }

  return (
    <>
      {header}
      <div
        className={cn(
          "flex flex-col pb-24",
          phone ? "pt-4" : "gap-4 px-6 pt-5",
        )}
      >
        {(all.length > 0 || tab === "incidents") && (
          <Bar
            phone={phone}
            items={searched}
            openIncidents={openCount}
            action={
              can.edit && (
                <Button onClick={create}>
                  <Plus />
                  New monitor
                </Button>
              )
            }
          />
        )}
        {body}
      </div>
    </>
  )
}

function Bar({
  phone,
  items,
  openIncidents,
  action,
}: {
  phone: boolean
  items: UptimeMonitor[]
  openIncidents: number
  action?: ReactNode
}) {
  const [{ tab, q, show, open }, setFilters] = useUptimeFilters()
  const count = (s: Show) => items.filter((x) => matchesShow(x, s)).length
  const shows: { value: Show; label: string }[] = [
    { value: "all", label: `All ${items.length}` },
    ...(["down", "degraded", "up", "paused"] as const)
      .filter((s) => count(s) > 0 || show === s)
      .map((s) => ({ value: s, label: `${stateMeta[s].label} ${count(s)}` })),
  ]
  const tabs = (
    <Segmented
      label="View"
      items={[
        { value: "monitors" as const, label: "Monitors" },
        {
          value: "incidents" as const,
          label: (
            <span className="flex items-center gap-1.5">
              Incidents
              {openIncidents > 0 && (
                <span className="rounded-full bg-destructive px-1.5 text-caption font-medium text-white tabular-nums">
                  {openIncidents}
                </span>
              )}
            </span>
          ),
        },
      ]}
      value={tab}
      onChange={(t) => setFilters({ tab: t === "monitors" ? null : t })}
    />
  )
  const search = tab === "monitors" && (
    <SearchBox
      value={q}
      onChange={(v) => setFilters({ q: v || null })}
      placeholder="Search monitors"
      label="Search monitors"
      className={phone ? "min-w-0 flex-1" : undefined}
    />
  )
  const filter =
    tab === "monitors" ? (
      <Segmented
        label="Show"
        items={shows}
        value={show}
        onChange={(s) => setFilters({ show: s === "all" ? null : s })}
      />
    ) : (
      <Segmented
        label="Show"
        items={[
          { value: "open" as const, label: "Going on" },
          { value: "all" as const, label: "History" },
        ]}
        value={open}
        onChange={(o) => setFilters({ open: o === "open" ? null : o })}
      />
    )
  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pb-3">
        {search}
        <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
          {tabs}
          {filter}
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs}
      {search}
      {filter}
      {action && <div className="ms-auto flex gap-2">{action}</div>}
    </div>
  )
}

// ---- Desktop ----

function Th({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <th
      scope="col"
      className={cn("h-10 px-3 text-start font-medium", className)}
    >
      {children}
    </th>
  )
}

export function MonitorTable({ items }: { items: UptimeMonitor[] }) {
  return <Table items={items} />
}

function Table({ items }: { items: UptimeMonitor[] }) {
  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Name</Th>
            <Th>Status</Th>
            <Th className="hidden @3xl:table-cell">Last checks</Th>
            <Th className="hidden @2xl:table-cell">24 h</Th>
            <Th className="hidden @4xl:table-cell">Response</Th>
            <Th className="hidden @5xl:table-cell">Checked</Th>
            <th scope="col" className="w-28">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((m) => (
            <Row key={m.id} m={m} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({ m }: { m: UptimeMonitor }) {
  const can = useUptimeCan(m.workspace_id)
  const a = useUptimeActions()
  const menu = useMonitorMenu(m)
  const state = stateOf(m)
  const certDays = certDaysLeft(m.cert_expires_at)
  return (
    <tr className={cn("h-16 hover:bg-subtle", m.paused && "text-ash")}>
      <td className="max-w-80 px-3">
        <Link
          href={monitorHref(m.id)}
          className="flex items-center gap-3 outline-none hover:text-brand focus-visible:text-brand"
        >
          <KindTile m={m} />
          <span className="min-w-0">
            <span
              className={cn(
                "block truncate font-medium",
                !m.paused && "text-foreground",
              )}
            >
              {m.name}
            </span>
            <span className="block truncate text-caption text-ash">
              {targetText(m)}
            </span>
            <LocationDots m={m} className="text-caption text-ash" />
          </span>
        </Link>
      </td>
      <td className="max-w-64 px-3">
        <StateBadge state={state} />
        <span
          className="block truncate text-caption text-ash"
          title={m.status_message || undefined}
        >
          {m.paused
            ? "No checks while paused"
            : m.status === "pending"
              ? "Waiting for the first check"
              : `${timeAgo(m.status_since)}${
                  m.status !== "up" && m.status_message
                    ? ` · ${m.status_message}`
                    : ""
                }`}
        </span>
      </td>
      <td className="hidden px-3 @3xl:table-cell">
        <BeatBar beats={m.recent} size={30} />
      </td>
      <td className="hidden px-3 tabular-nums @2xl:table-cell">
        {uptimeText(m.uptime_24h)}
      </td>
      <td className="hidden px-3 whitespace-nowrap tabular-nums @4xl:table-cell">
        {m.last_latency_ms != null ? `${m.last_latency_ms} ms` : "—"}
        {certDays != null && (
          <span
            className={cn(
              "flex items-center gap-1 text-caption",
              certDays <= 14 ? "text-warning" : "text-ash",
            )}
          >
            <ShieldCheck className="size-3.5" />
            {certDays < 0 ? "Cert expired" : `Cert ${certDays} d`}
          </span>
        )}
      </td>
      <td className="hidden px-3 whitespace-nowrap @5xl:table-cell">
        <span className="block">
          {m.last_checked_at ? timeAgo(m.last_checked_at) : "Never"}
        </span>
        <span className="block text-caption text-ash">
          {m.kind === "push" ? "push" : intervalText(m.interval_seconds)}
        </span>
      </td>
      <td className="pe-2">
        <div className="flex items-center justify-end gap-1">
          {can.operate && m.kind !== "push" && (
            <Button
              variant="outline"
              size="sm"
              disabled={m.paused || a.checking === m.id}
              onClick={() => a.check(m)}
            >
              <RefreshCw
                className={cn(a.checking === m.id && "animate-spin")}
              />
              Check
            </Button>
          )}
          <ItemMenu groups={menu} label={`${m.name} actions`} />
        </div>
      </td>
    </tr>
  )
}

// The kind's icon with a status dot in the corner.
export function KindTile({
  m,
  size = "sm",
}: {
  m: Pick<UptimeMonitor, "kind" | "paused" | "status">
  size?: "sm" | "lg"
}) {
  const state = stateOf(m)
  return (
    <span
      title={kindMeta[m.kind as Kind]?.label}
      className={cn(
        "relative flex shrink-0 items-center justify-center",
        size === "sm"
          ? "size-8 rounded-md bg-muted text-muted-foreground"
          : "size-10 rounded-lg bg-muted text-muted-foreground",
      )}
    >
      <KindIcon kind={m.kind} className={size === "sm" ? "size-4" : "size-5"} />
      <span
        aria-hidden
        className={cn(
          "absolute -end-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-background",
          stateMeta[state].dot,
        )}
      />
    </span>
  )
}

// ---- Phone ----

export function MonitorRows({ items }: { items: UptimeMonitor[] }) {
  return <Rows items={items} />
}

function Rows({ items }: { items: UptimeMonitor[] }) {
  const [open, setOpen] = useOpen("monitor-sheet")
  const [id, setId] = useState<string | null>(null)
  // Keep the last tapped monitor so the sheet can animate out.
  const last = useRef<UptimeMonitor | null>(null)
  const current = items.find((m) => m.id === id) ?? last.current
  if (current) last.current = current

  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((m) => {
          const state = stateOf(m)
          return (
            <li key={m.id} className="flex items-center">
              <Link
                href={monitorHref(m.id)}
                className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-1 outline-none active:bg-muted"
              >
                <KindTile m={m} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium">
                    {m.name}
                  </span>
                  <span className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
                    <span className={cn("font-medium", stateMeta[state].text)}>
                      {stateMeta[state].label}
                    </span>
                    {!m.paused && m.uptime_24h != null && (
                      <span className="tabular-nums">
                        · {uptimeText(m.uptime_24h)}
                      </span>
                    )}
                    {!m.paused && m.last_latency_ms != null && (
                      <span className="tabular-nums">
                        · {m.last_latency_ms} ms
                      </span>
                    )}
                  </span>
                  <BeatBar beats={m.recent} size={30} className="mt-1 h-3" />
                </span>
              </Link>
              <button
                type="button"
                aria-label={`${m.name} actions`}
                className="me-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ash outline-none active:bg-muted"
                onClick={() => {
                  setId(m.id)
                  setOpen(true)
                }}
              >
                <Ellipsis className="size-5" />
              </button>
            </li>
          )
        })}
      </ul>
      {current && (
        <MonitorSheet m={current} open={open} onOpenChange={setOpen} />
      )}
    </>
  )
}

function MonitorSheet({
  m,
  open,
  onOpenChange,
}: {
  m: UptimeMonitor
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useMonitorMenu(m)
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={m.name}>
      {m.status !== "up" && !m.paused && m.status_message && (
        <p className="mx-2 mb-3 rounded-2xl bg-subtle p-4 text-body-sm">
          {m.status_message}
        </p>
      )}
      <Facts
        items={[
          { label: "Watches", value: kindMeta[m.kind as Kind]?.label },
          { label: "Status", value: <StateBadge state={stateOf(m)} /> },
          { label: "Target", value: targetText(m), wide: true, mono: true },
          { label: "Uptime 24 h", value: uptimeText(m.uptime_24h) },
          { label: "Uptime 30 d", value: uptimeText(m.uptime_30d) },
          ...(m.locations.length > 1
            ? [
                {
                  label: "Locations",
                  value: <LocationDots m={m} />,
                  wide: true,
                },
              ]
            : []),
        ]}
      />
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}

function Placeholder({ phone }: { phone: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden border-border",
        phone ? "border-y" : "rounded-2xl border",
      )}
    >
      {Array.from({ length: 4 }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          key={i}
          className="flex h-16 items-center gap-3 border-b border-border px-4 last:border-b-0"
        >
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ms-auto h-4 w-32" />
        </div>
      ))}
    </div>
  )
}

function NoMatch({ phone }: { phone: boolean }) {
  const [, setFilters] = useUptimeFilters()
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-6 py-12 text-center text-body-sm text-muted-foreground",
        !phone && "rounded-2xl border border-border",
      )}
    >
      <BellOff className="size-5 text-ash" />
      No monitor matches.
      <Button
        variant="outline"
        className="h-11 md:h-9"
        onClick={() => setFilters({ q: null, show: null })}
      >
        Clear filters
      </Button>
    </div>
  )
}
