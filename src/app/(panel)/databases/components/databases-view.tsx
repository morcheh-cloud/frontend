"use client"

import {
  Database as DatabaseIcon,
  Ellipsis,
  Plus,
  RefreshCw,
  SearchX,
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
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { formatMs } from "@/components/insights/format"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { formatSize } from "@/lib/format"
import type { Database, Server } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCheckingDatabases, useDatabases } from "../api"
import { useDatabaseActions } from "./database-actions"
import {
  CardsSkeleton,
  DatabaseCards,
  MiniStrip,
  noteOf,
  toneOf,
  useDayHistory,
} from "./database-cards"
import { DatabaseSheet } from "./database-menu"
import {
  DatabaseInsightsBody,
  DatabaseInsightsControls,
} from "./insights/insights"
import {
  byState,
  EngineTile,
  engineName,
  HealthDot,
  needsLook,
  stateOf,
  useDatabasesFilters,
} from "./meta"
import { useCanAddDatabase } from "./permissions"

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
    body = phone ? <PhoneSkeleton /> : <CardsSkeleton />
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
            ? "PostgreSQL, MySQL/MariaDB, SQL Server, MongoDB or Redis: on one of your servers (even in Docker) or at a public address. Morche checks it every minute and says what needs a look."
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
      <DatabaseCards items={items} checking={checking} showServer={!server} />
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

  const day = useDayHistory()
  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((d) => {
          const tone = toneOf(d)
          const note = noteOf(d)
          const history = day.byId.get(d.id)
          const online = d.status === "online" && !d.paused
          const facts = [
            d.paused ? "Paused" : !online ? stateOf(d).label : null,
            d.size_bytes != null && formatSize(d.size_bytes),
            online &&
              d.connections != null &&
              `${d.connections}${d.max_connections ? `/${d.max_connections}` : ""} conn`,
            online && d.latency_ms != null && formatMs(d.latency_ms),
          ].filter(Boolean)
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
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-body font-medium">
                      {d.name}
                    </span>
                    <HealthDot database={d} checking={checking.has(d.id)} />
                    <span className="sr-only">{stateOf(d).label}</span>
                    {d.favorite && (
                      <Star
                        aria-label="Favorite"
                        className="size-3.5 shrink-0 fill-brand text-brand"
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      "block truncate text-body-sm",
                      note
                        ? tone === "destructive"
                          ? "text-destructive"
                          : "text-warning"
                        : "text-muted-foreground",
                    )}
                  >
                    {note ||
                      `${engineName(d)}${d.version ? ` ${d.version}` : ""}`}
                  </span>
                  {(facts.length > 0 || history) && (
                    <span className="flex items-center gap-3 text-caption text-ash tabular-nums">
                      <span className="shrink-0">{facts.join(" · ")}</span>
                      {history && (
                        <MiniStrip
                          states={history.strip}
                          label={`${d.name}: checks over the last 24 hours`}
                          className="min-w-12 flex-1"
                        />
                      )}
                    </span>
                  )}
                </span>
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
