"use client"

import {
  Database as DatabaseIcon,
  Ellipsis,
  Plus,
  RefreshCw,
  SearchX,
  Server as ServerIcon,
  Star,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { type ReactNode, useRef, useState } from "react"

import {
  Empty,
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { useServers } from "@/app/(panel)/servers/api"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { PageHeader } from "@/components/panel/page-header"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type { Database, Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCheckingDatabases, useDatabases } from "../api"
import { useDatabaseActions } from "./database-actions"
import { DatabaseMenuItems, DatabaseSheet } from "./database-menu"
import {
  DatabaseInsightsBody,
  DatabaseInsightsControls,
} from "./insights/insights"
import {
  byState,
  EngineTile,
  endpointLabel,
  engineName,
  HealthDot,
  needsLook,
  problems,
  stateOf,
  statusMeta,
  useDatabasesFilters,
} from "./meta"
import { useCanAddDatabase, useDatabaseCan } from "./permissions"

// The list of databases: every one this person can see (the Databases page),
// or those reached through one server (its Databases tab). Worst first.
export function DatabasesView({ server }: { server?: Server }) {
  const phone = useIsPhone()
  if (phone === null) return null
  return <List server={server} phone={phone} />
}

function List({ server, phone }: { server?: Server; phone: boolean }) {
  const actions = useDatabaseActions()
  const can = useCanAddDatabase()
  const canAdd = server
    ? can.viaServer(server.id, server.workspace_id)
    : can.any
  const list = useDatabases(server?.id)
  const checking = useCheckingDatabases()
  const { filters, setFilters } = useDatabasesFilters()
  // Insights live on the Databases page only, not on a server's tab.
  const show = server && filters.show === "insights" ? "all" : filters.show
  const insights = show === "insights"
  const all = [...(list.data?.items ?? [])].sort(byState)
  const look = all.filter(needsLook)
  const q = filters.q.trim().toLowerCase()
  const items = (show === "problems" ? look : all).filter(
    (d) =>
      !q ||
      [
        d.name,
        d.host,
        d.container,
        d.description,
        engineName(d),
        d.version,
      ].some((s) => s.toLowerCase().includes(q)),
  )
  const add = () => actions.addDatabase({ serverId: server?.id })

  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={list.isFetching}
      onClick={() => list.refetch()}
    >
      <RefreshCw className={cn(list.isFetching && "animate-spin")} />
    </Button>
  )
  const addButton = canAdd && (
    <Button
      size={phone ? "icon-lg" : "default"}
      className="md:h-9"
      aria-label="Add database"
      onClick={add}
    >
      <Plus />
      {!phone && "Add database"}
    </Button>
  )
  const tabs = (
    <Segmented
      label="Show"
      items={[
        { value: "all", label: `All · ${all.length}` },
        { value: "problems", label: `Needs a look · ${look.length}` },
        ...(server ? [] : [{ value: "insights" as const, label: "Insights" }]),
      ]}
      value={show}
      onChange={(show) => setFilters({ show: show === "all" ? null : show })}
    />
  )
  const search = (
    <SearchBox
      value={filters.q}
      onChange={(v) => setFilters({ q: v || null })}
      placeholder="Search name, host or engine"
      label="Search databases"
      className="min-w-0 flex-1 md:max-w-72 md:min-w-36"
    />
  )

  let body: ReactNode
  if (list.isPending) {
    body = phone ? <PhoneSkeleton /> : <DesktopSkeleton />
  } else if (list.isError && !list.data) {
    body = (
      <Empty
        icon={TriangleAlert}
        title="Couldn't load databases"
        body={list.error.message || "The server didn't answer. Try again."}
        className="max-md:mt-4"
        action={
          <Button variant="outline" onClick={() => list.refetch()}>
            Try again
          </Button>
        }
      />
    )
  } else if (all.length === 0) {
    body = (
      <Empty
        icon={DatabaseIcon}
        title={
          server ? "No databases watched here" : "Watch your first database"
        }
        body={
          canAdd
            ? "PostgreSQL, MySQL/MariaDB, SQL Server, MongoDB or Redis: on one of your servers (even in Docker) or at a public address. Morcheh checks it every minute and says what needs a look."
            : "Nothing here is shared with you yet. Ask an admin or the workspace owner for access."
        }
        className="max-md:mt-4"
        action={canAdd && <Button onClick={add}>Add database</Button>}
      />
    )
  } else if (items.length === 0) {
    body = (
      <Empty
        icon={SearchX}
        title={
          show === "problems" && !q ? "Nothing needs a look" : "Nothing matches"
        }
        body={
          show === "problems" && !q
            ? "Every database is online and its checks pass."
            : "Try another search, or show all databases."
        }
        className="max-md:mt-4"
        action={
          <Button
            variant="outline"
            onClick={() => setFilters({ q: null, show: null })}
          >
            Show all
          </Button>
        }
      />
    )
  } else {
    body = phone ? (
      <PhoneList items={items} checking={checking} />
    ) : (
      <Table items={items} checking={checking} showServer={!server} />
    )
  }

  const caption = list.data && (
    <span className="hidden text-caption whitespace-nowrap text-muted-foreground @3xl:inline">
      {look.length
        ? `${look.length} of ${all.length} need a look`
        : `${all.length} watched, all fine`}
    </span>
  )

  if (phone) {
    return (
      <>
        {!server && (
          <header className="flex items-center gap-1 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))]">
            <h1 className="text-heading font-light">Databases</h1>
            <HelpButton
              href={guideHref("databases")}
              label="Databases guide"
              className="ms-auto"
            />
          </header>
        )}
        <div className="flex flex-col gap-3 px-4 pt-4">
          {!insights && (
            <div className="flex items-center gap-2">
              {search}
              {refresh}
              {addButton}
            </div>
          )}
          {(all.length > 0 || insights) && (
            <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
              {tabs}
            </div>
          )}
          {insights && (
            <div className="flex items-center gap-2">
              <DatabaseInsightsControls phone />
            </div>
          )}
        </div>
        {insights ? (
          <div className="mt-3 border-t border-border pb-24">
            <DatabaseInsightsBody phone />
          </div>
        ) : (
          <div className="pt-3 pb-24">{body}</div>
        )}
      </>
    )
  }

  return (
    <>
      {!server && (
        <PageHeader
          title="Databases"
          description="Is every database up and healthy? Checks, live sessions and slow queries for PostgreSQL, MySQL, SQL Server, MongoDB and Redis."
          guide="databases"
        />
      )}
      <div className={cn("flex flex-col gap-4", !server && "px-6 pt-5 pb-24")}>
        {insights ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {tabs}
              <DatabaseInsightsControls phone={false} />
            </div>
            <DatabaseInsightsBody phone={false} />
          </>
        ) : (
          <>
            <div className="@container flex items-center gap-2">
              {tabs}
              <span className="mx-1 h-5 w-px shrink-0 bg-border" />
              {search}
              <div className="ms-auto flex shrink-0 items-center gap-2">
                <span className="me-2">{caption}</span>
                {refresh}
                {addButton}
              </div>
            </div>
            {body}
          </>
        )}
      </div>
    </>
  )
}

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

function Table({
  items,
  checking,
  showServer,
}: {
  items: Database[]
  checking: Set<string | undefined>
  showServer: boolean
}) {
  // Server names for "through <server>"; the list is cached by every
  // servers page anyway.
  const servers = useServers({ limit: 500 })
  const names = new Map(
    (servers.data?.items ?? []).map((s) => [s.id, s.name] as const),
  )
  return (
    <div className="@container overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <th scope="col" className="w-10 ps-3">
              <span className="sr-only">Favorite</span>
            </th>
            <Th>Name</Th>
            <Th>State</Th>
            <Th className="text-end">Size</Th>
            <Th className="text-end">Connections</Th>
            <Th className="hidden text-end @3xl:table-cell">Latency</Th>
            <Th className="hidden @4xl:table-cell">Address</Th>
            <Th className="hidden @5xl:table-cell">Checked</Th>
            <th scope="col" className="w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((d) => (
            <Row
              key={d.id}
              database={d}
              checking={checking.has(d.id)}
              serverName={
                showServer && d.server_id ? names.get(d.server_id) : undefined
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({
  database: d,
  checking,
  serverName,
}: {
  database: Database
  checking: boolean
  serverName?: string
}) {
  const actions = useDatabaseActions()
  const can = useDatabaseCan()
  const state = stateOf(d)
  const issues = problems(d)
  const down = !d.paused && d.status !== "online" && d.status !== "unknown"
  const note = down
    ? d.status_message || statusMeta[d.status].hint
    : !d.paused && issues.length
      ? issues
          .slice(0, 2)
          .map((c) => c.title)
          .join(" · ") + (issues.length > 2 ? ` +${issues.length - 2}` : "")
      : ""
  return (
    <tr className="group/row h-14 hover:bg-subtle">
      <td className="ps-3">
        <button
          type="button"
          aria-label={d.favorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={d.favorite}
          disabled={!can(d, "operator")}
          onClick={() => actions.toggleFavorite(d)}
          className={cn(
            "flex size-7 items-center justify-center rounded-lg text-ash enabled:hover:bg-muted enabled:hover:text-foreground",
            !d.favorite &&
              "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100",
          )}
        >
          <Star
            className={cn("size-4", d.favorite && "fill-brand text-brand")}
          />
        </button>
      </td>
      <td className="max-w-72 px-3">
        <Link
          href={`/databases/${d.id}`}
          className="flex items-center gap-3 outline-none hover:text-brand focus-visible:text-brand"
        >
          <EngineTile
            engine={d.engine}
            flavor={d.flavor}
            className="size-7 rounded-md"
          />
          <span className="min-w-0">
            <span className="block truncate font-medium">{d.name}</span>
            <span className="block truncate text-caption text-ash">
              {engineName(d)}
              {d.version && ` ${d.version}`}
              {d.role && d.role !== "standalone" && ` · ${d.role}`}
            </span>
          </span>
        </Link>
      </td>
      <td className="max-w-80 px-3">
        <span className="flex items-center gap-2 whitespace-nowrap">
          <HealthDot database={d} checking={checking} />
          {checking ? "Checking…" : state.label}
        </span>
        {note && (
          <span
            title={note}
            className="block truncate ps-4 text-caption text-muted-foreground"
          >
            {note}
          </span>
        )}
      </td>
      <td className="px-3 text-end whitespace-nowrap tabular-nums">
        {d.size_bytes != null ? formatSize(d.size_bytes) : "—"}
      </td>
      <td className="px-3 text-end whitespace-nowrap tabular-nums">
        {d.connections != null ? (
          <>
            {d.connections}
            {d.max_connections != null && (
              <span className="text-muted-foreground">
                {" "}
                / {d.max_connections}
              </span>
            )}
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="hidden px-3 text-end whitespace-nowrap text-muted-foreground tabular-nums @3xl:table-cell">
        {d.status === "online" && d.latency_ms != null
          ? `${d.latency_ms} ms`
          : "—"}
      </td>
      <td className="hidden max-w-72 px-3 @4xl:table-cell">
        <span className="block truncate font-mono text-caption text-muted-foreground">
          {endpointLabel(d)}
        </span>
        {serverName && (
          <span className="flex items-center gap-1 truncate text-caption text-ash">
            <ServerIcon className="size-3 shrink-0" />
            through {serverName}
          </span>
        )}
      </td>
      <td className="hidden px-3 whitespace-nowrap text-muted-foreground @5xl:table-cell">
        {d.paused ? "Paused" : timeAgo(d.last_checked_at)}
      </td>
      <td className="pe-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${d.name} actions`}
              />
            }
          >
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DatabaseMenuItems database={d} checking={checking} />
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}

function PhoneList({
  items,
  checking,
}: {
  items: Database[]
  checking: Set<string | undefined>
}) {
  const [sheetOpen, setSheetOpen] = useOpen("database-sheet")
  const [sheetId, setSheetId] = useState<string | null>(null)
  // Keep the last tapped database around so the sheet can animate out.
  const last = useRef<Database | null>(null)
  const current = items.find((d) => d.id === sheetId) ?? last.current
  if (current) last.current = current

  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((d) => {
          const issue = problems(d)[0]
          const down =
            !d.paused && d.status !== "online" && d.status !== "unknown"
          return (
            <li key={d.id} className="flex items-center">
              <Link
                href={`/databases/${d.id}`}
                className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 py-3 ps-4 pe-1 outline-none active:bg-muted"
              >
                <EngineTile
                  engine={d.engine}
                  flavor={d.flavor}
                  className="size-10"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-body font-medium">
                      {d.name}
                    </span>
                    <HealthDot database={d} checking={checking.has(d.id)} />
                    <span className="sr-only">{stateOf(d).label}</span>
                  </span>
                  <span className="block truncate text-body-sm text-muted-foreground">
                    {down
                      ? stateOf(d).label
                      : !d.paused && issue
                        ? issue.title
                        : [
                            engineName(d),
                            d.size_bytes != null && formatSize(d.size_bytes),
                            d.paused && "Paused",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                  </span>
                </span>
                {d.favorite && (
                  <Star
                    aria-label="Favorite"
                    className="size-4 shrink-0 fill-brand text-brand"
                  />
                )}
              </Link>
              <button
                type="button"
                aria-label={`${d.name} actions`}
                onClick={() => {
                  setSheetId(d.id)
                  setSheetOpen(true)
                }}
                className="me-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ash outline-none active:bg-muted"
              >
                <Ellipsis className="size-5" />
              </button>
            </li>
          )
        })}
      </ul>
      {current && (
        <DatabaseSheet
          database={current}
          checking={checking.has(current.id)}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </>
  )
}

function DesktopSkeleton() {
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

function PhoneSkeleton() {
  return (
    <ul className="divide-y divide-border border-y border-border">
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
