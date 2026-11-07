"use client"

import {
  Activity,
  ChevronLeft,
  DatabaseZap,
  Ellipsis,
  KeySquare,
  Pencil,
  Star,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import { useEffect, useRef } from "react"

import { useServer } from "@/app/(panel)/servers/api"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { guideForPath } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { useFollowWorkspace } from "@/components/panel/workspace"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useNow } from "@/hooks/useNow"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type { Database, DatabaseSnapshot } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useCheckingDatabases, useDatabase, useDatabaseLive } from "../../api"
import { useDatabaseActions } from "../../components/database-actions"
import {
  DatabaseMenuItems,
  DatabaseSheet,
} from "../../components/database-menu"
import {
  EngineTile,
  endpointLabel,
  engineName,
  HealthDot,
  stateOf,
  statusMeta,
} from "../../components/meta"
import { useDatabaseCan } from "../../components/permissions"
import { ActivityTab } from "./activity"
import { BackupsTab } from "./backups/backups-tab"
import { ClientsTab } from "./clients"
import { DashboardActionsProvider } from "./dashboard-actions"
import { DetailsTab } from "./details"
import { ms } from "./format"
import { OverviewTab } from "./overview"
import { DashboardProvider, useDashboard } from "./parts"
import { QueriesTab } from "./queries"
import { ReplicationTab } from "./replication"
import { SpaceTab } from "./space"

const tabs = [
  "overview",
  "sessions",
  "queries",
  "space",
  "clients",
  "replication",
  "backups",
  "details",
] as const
type Tab = (typeof tabs)[number]

const tabLabels = (d: Database): Record<Tab, string> => ({
  overview: "Overview",
  sessions: "Sessions",
  queries: d.engine === "redis" ? "Slow log" : "Queries",
  space: d.engine === "redis" ? "Keys" : "Tables & space",
  clients: "Clients",
  replication: "Replication",
  backups: "Backups",
  details: "Details",
})

const useTab = () =>
  useQueryState(
    "tab",
    parseAsStringLiteral(tabs)
      .withDefault("overview")
      .withOptions({ history: "replace" }),
  )

// Same tabs as a server page's.
const tabClass =
  "relative flex h-11 shrink-0 items-center gap-2 rounded-lg px-2.5 text-body-sm whitespace-nowrap text-muted-foreground outline-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full hover:text-foreground hover:after:bg-mist focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:after:bg-brand"

const barButton =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-foreground outline-none active:bg-muted"

// One database: its header (or the phone app bar), the tabs, and what the
// database is doing right now, polled while the page is open.
export function DatabasePageView() {
  const { id } = useParams<{ id: string }>()
  const query = useDatabase(id)
  const isPhone = useIsPhone()
  const database = query.data

  usePageCrumbs(
    database ? [{ href: `/databases/${id}`, label: database.name }] : [],
  )

  if (isPhone === null) return null
  // Keep the last good copy if a refetch fails (e.g. right after a delete).
  if (!database) {
    if (query.error) {
      return (
        <Missing
          notFound={
            query.error instanceof ApiError && query.error.status === 404
          }
          message={query.error.message}
          onRetry={() => query.refetch()}
        />
      )
    }
    return <Loading />
  }
  return <Dashboard database={database} phone={isPhone} />
}

function Dashboard({
  database: d,
  phone,
}: {
  database: Database
  phone: boolean
}) {
  const can = useDatabaseCan()
  const live = useDatabaseLive(d.id, !d.paused)
  // The last look that got in stays on screen while a later one fails, so a
  // blip doesn't blank the page; the header says it's stale.
  const last = useRef<DatabaseSnapshot | undefined>(undefined)
  if (live.data?.snapshot) last.current = live.data.snapshot
  useFollowWorkspace(d.workspace_id)

  return (
    <DashboardProvider
      value={{
        database: d,
        phone,
        live,
        snapshot: d.paused ? undefined : last.current,
        operator: can(d, "operator"),
        engineer: can(d, "engineer"),
        owner: can(d, "owner"),
      }}
    >
      <DashboardActionsProvider database={d}>
        {phone ? <PhonePage /> : <DesktopPage />}
      </DashboardActionsProvider>
    </DashboardProvider>
  )
}

function useDeleted() {
  const router = useRouter()
  return () => router.replace("/databases")
}

function DesktopPage() {
  const { database: d, operator, owner } = useDashboard()
  const actions = useDatabaseActions()
  const checking = useCheckingDatabases().has(d.id)
  const onDeleted = useDeleted()
  const [tab, setTab] = useTab()
  const labels = tabLabels(d)
  const state = stateOf(d)

  return (
    <div className="flex flex-col pb-24">
      <div className="flex w-full items-center gap-4 px-6 pt-5 pb-3">
        <EngineTile
          engine={d.engine}
          flavor={d.flavor}
          className="size-12 rounded-2xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-subheading font-medium">{d.name}</h1>
            <button
              type="button"
              aria-label={
                d.favorite ? "Remove from favorites" : "Add to favorites"
              }
              aria-pressed={d.favorite}
              disabled={!operator}
              onClick={() => actions.toggleFavorite(d)}
              className="flex size-7 items-center justify-center rounded-lg text-ash hover:bg-muted hover:text-foreground disabled:pointer-events-none"
            >
              <Star
                className={cn("size-4", d.favorite && "fill-brand text-brand")}
              />
            </button>
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 text-foreground">
              <HealthDot database={d} checking={checking} />
              {checking ? "Checking…" : state.label}
              {!checking && d.status === "online" && d.latency_ms != null && (
                <span className="text-muted-foreground">
                  {ms(d.latency_ms)}
                </span>
              )}
            </span>
            <span>
              {engineName(d)}
              {d.version && ` ${d.version}`}
              {d.role && d.role !== "standalone" && ` · ${d.role}`}
            </span>
            <span className="font-mono text-caption">{endpointLabel(d)}</span>
            {d.server_id && <ThroughServer id={d.server_id} />}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {operator && (
            <Button
              variant="outline"
              disabled={checking}
              onClick={() => actions.check(d)}
            >
              <Activity />
              {checking ? "Checking…" : "Check"}
            </Button>
          )}
          {owner && (
            <>
              <Button
                variant="outline"
                onClick={() => actions.showCredentials(d)}
              >
                <KeySquare />
                Credentials
              </Button>
              <Button variant="outline" onClick={() => actions.editDatabase(d)}>
                <Pencil />
                Edit
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Database actions"
                />
              }
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DatabaseMenuItems
                database={d}
                checking={checking}
                onDeleted={onDeleted}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Banner checking={checking} className="mx-6 mb-3" />
      <nav
        aria-label="Database sections"
        className="sticky top-[calc(3rem+1px)] z-20 flex items-center gap-1 border-b border-border bg-background/90 px-4 backdrop-blur-md"
      >
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              aria-current={tab === t ? "page" : undefined}
              onClick={() => setTab(t)}
              className={tabClass}
            >
              {labels[t]}
            </button>
          ))}
        </div>
        <LiveState className="ms-3 shrink-0 pe-2" />
      </nav>
      <div className="@container px-6 pt-5">
        <TabBody tab={tab} />
      </div>
    </div>
  )
}

function PhonePage() {
  const { database: d } = useDashboard()
  const back = useBack("/databases")
  const checking = useCheckingDatabases().has(d.id)
  const onDeleted = useDeleted()
  const [sheetOpen, setSheetOpen] = useOpen("database-page-sheet")
  const [tab, setTab] = useTab()
  const labels = tabLabels(d)
  const guide = guideForPath(`/databases/${d.id}`)

  // Links lead straight to a later tab (Home's backup issue): show its chip.
  const chips = useRef<HTMLElement>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: `tab` is the trigger.
  useEffect(() => {
    chips.current
      ?.querySelector("[aria-current=page]")
      ?.scrollIntoView({ block: "nearest", inline: "center" })
  }, [tab])

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex h-12 items-center gap-1 px-1">
          {/* As wide as the end side, so the title stays centred. */}
          <div className="flex w-22 shrink-0">
            <button
              type="button"
              aria-label="Back"
              onClick={back}
              className={barButton}
            >
              <ChevronLeft className="size-6 rtl:rotate-180" />
            </button>
          </div>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-body font-medium">{d.name}</h1>
            <p className="flex items-center justify-center gap-1.5 truncate text-caption text-muted-foreground">
              <HealthDot database={d} checking={checking} />
              {checking ? "Checking…" : stateOf(d).label}
            </p>
          </div>
          {guide ? (
            <HelpButton
              href={guide.href}
              label={`${guide.guide.title} guide`}
            />
          ) : (
            <span aria-hidden className="size-11 shrink-0" />
          )}
          <button
            type="button"
            aria-label="Database actions"
            onClick={() => setSheetOpen(true)}
            className={barButton}
          >
            <Ellipsis className="size-5" />
          </button>
        </div>
        <nav
          ref={chips}
          aria-label="Database sections"
          className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-2.5"
        >
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              aria-current={tab === t ? "page" : undefined}
              onClick={() => setTab(t)}
              className="flex h-9 shrink-0 items-center rounded-full border border-border px-3.5 text-body-sm whitespace-nowrap text-muted-foreground outline-none active:bg-muted aria-[current=page]:border-foreground aria-[current=page]:bg-foreground aria-[current=page]:font-medium aria-[current=page]:text-background"
            >
              {labels[t]}
            </button>
          ))}
        </nav>
      </header>
      <Banner checking={checking} />
      <LiveState className="block px-4 pt-3 text-center" />
      <div className="pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <TabBody tab={tab} />
      </div>
      <DatabaseSheet
        database={d}
        checking={checking}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDeleted={onDeleted}
      />
    </>
  )
}

function TabBody({ tab }: { tab: Tab }) {
  switch (tab) {
    case "sessions":
      return <ActivityTab />
    case "queries":
      return <QueriesTab />
    case "space":
      return <SpaceTab />
    case "clients":
      return <ClientsTab />
    case "replication":
      return <ReplicationTab />
    case "backups":
      return <BackupsTab />
    case "details":
      return <DetailsTab />
    default:
      return <OverviewTab />
  }
}

function ThroughServer({ id }: { id: string }) {
  const server = useServer(id)
  if (!server.data) return null
  return (
    <span>
      through{" "}
      <Link
        href={`/servers/${id}`}
        className="text-foreground underline-offset-4 hover:underline"
      >
        {server.data.name}
      </Link>
    </span>
  )
}

// "Live · 3 s ago" while looks get in; what went wrong when they don't.
function LiveState({ className }: { className?: string }) {
  const { database: d, live, snapshot } = useDashboard()
  useNow(1000)
  if (d.paused) {
    return (
      <span className={cn("text-caption text-ash", className)}>
        Monitoring paused
      </span>
    )
  }
  const failed =
    live.isError || (live.data != null && live.data.status !== "online")
  if (failed) {
    return (
      <span className={cn("text-caption text-warning", className)}>
        {snapshot
          ? `Couldn't refresh · showing ${timeAgo(snapshot.collected_at).toLowerCase()}`
          : "Couldn't reach it · retrying"}
      </span>
    )
  }
  if (!snapshot) {
    return (
      <span className={cn("text-caption text-ash", className)}>
        Connecting…
      </span>
    )
  }
  return (
    <span className={cn("text-caption text-ash", className)}>
      <span
        aria-hidden
        className="me-1.5 inline-block size-1.5 rounded-full bg-success align-middle"
      />
      Live · updated {timeAgo(snapshot.collected_at).toLowerCase()}
    </span>
  )
}

// A failed last check with the one action that fixes it, or a paused note.
function Banner({
  checking,
  className,
}: {
  checking: boolean
  className?: string
}) {
  const { database: d, operator, engineer, owner } = useDashboard()
  const actions = useDatabaseActions()

  if (d.paused) {
    return (
      <div
        role="status"
        className={cn(
          "flex items-center gap-3 border-y border-border bg-subtle p-4 md:rounded-2xl md:border md:px-5 md:py-3",
          className,
        )}
      >
        <DatabaseZap className="size-4 shrink-0 text-ash" />
        <p className="min-w-0 flex-1 text-body-sm">
          <span className="font-medium">Monitoring is paused.</span>{" "}
          <span className="text-muted-foreground">
            No checks run and nothing is read from the database.
          </span>
        </p>
        {engineer && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 max-md:h-9"
            onClick={() => actions.togglePaused(d)}
          >
            Resume
          </Button>
        )}
      </div>
    )
  }
  if (d.status === "online" || d.status === "unknown") return null

  const fix =
    d.status === "auth_failed" || d.status === "tls_error"
      ? {
          label: "Edit connection",
          allowed: owner,
          run: () => actions.editDatabase(d),
        }
      : {
          label: checking ? "Checking…" : "Check again",
          allowed: operator,
          run: () => actions.check(d),
        }
  const warn = d.status === "auth_failed"

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 border-y p-4 md:items-center md:rounded-2xl md:border md:px-5 md:py-3",
        warn
          ? "border-warning/25 bg-warning/5"
          : "border-destructive/20 bg-destructive/5",
        className,
      )}
    >
      <TriangleAlert
        className={cn(
          "mt-0.5 size-4 shrink-0 md:mt-0",
          warn ? "text-warning" : "text-destructive",
        )}
      />
      <div className="min-w-0 flex-1 text-body-sm">
        <p className="font-medium">
          {statusMeta[d.status].label} on the last check
          {d.last_checked_at && (
            <span className="font-normal text-muted-foreground">
              {" "}
              · {timeAgo(d.last_checked_at).toLowerCase()}
            </span>
          )}
        </p>
        <p className="text-muted-foreground">
          {d.status_message || statusMeta[d.status].hint}
        </p>
      </div>
      {fix.allowed && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 max-md:h-9"
          disabled={checking}
          onClick={fix.run}
        >
          {fix.label}
        </Button>
      )}
    </div>
  )
}

function Loading() {
  return (
    <div className="flex flex-col gap-6 px-4 pt-[max(--spacing(5),env(safe-area-inset-top))] md:px-6 md:pt-5">
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-2xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

function Missing({
  notFound,
  message,
  onRetry,
}: {
  notFound: boolean
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <DatabaseZap className="size-5" />
      </span>
      <div>
        <h1 className="text-body font-medium">
          {notFound ? "Database not found" : "Couldn't load this database"}
        </h1>
        <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">
          {notFound
            ? "It may have been removed, or you no longer have access."
            : message}
        </p>
      </div>
      <div className="flex gap-2">
        {!notFound && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
        <Link href="/databases" className={buttonVariants()}>
          Back to databases
        </Link>
      </div>
    </div>
  )
}
