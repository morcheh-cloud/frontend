"use client"

import {
  CalendarClock,
  Clock,
  Info,
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
  X,
} from "lucide-react"
import { type ReactNode, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { CronHistory } from "@/lib/services"
import { cn } from "@/lib/utils"
import { timeAgo } from "../../../components/meta"
import { SectionActions } from "../../components/section-actions"
import { useServerPage } from "../../components/server-page"
import { useCron, useCronHistory } from "../api"
import { CronActionsProvider, useCronActions } from "./cron-actions"
import { JobsList, JobsTable } from "./jobs-list"
import {
  envValue,
  filterRows,
  groupRows,
  hasFilters,
  jobTitle,
  lastRuns,
  rows,
  type Tab,
  tableLabel,
  targets,
  useCronFilters,
} from "./meta"
import {
  formatAt,
  nextRuns,
  type ServerClock,
  serverClock,
  serverNow,
} from "./schedule"
import { ScriptsView, TimersView } from "./timers"

export function CronView() {
  const { server, phone } = useServerPage()
  const query = useCron(server.id)
  const data = query.data
  const history = useCronHistory(server.id, Boolean(data))
  const clock = useMemo(
    () => (data ? serverClock(data, query.dataUpdatedAt) : null),
    [data, query.dataUpdatedAt],
  )

  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={query.isFetching}
      onClick={() => {
        query.refetch()
        history.refetch()
      }}
    >
      <RefreshCw className={cn(query.isFetching && "animate-spin")} />
    </Button>
  )

  if (!data || !clock) {
    return (
      <>
        <SectionActions>{refresh}</SectionActions>
        <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
          {query.error ? (
            <Empty
              icon={TriangleAlert}
              title="Couldn't read the cron jobs"
              body={query.error.message}
              action={
                <Button variant="outline" onClick={() => query.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : (
            <Loading phone={phone} />
          )}
        </div>
      </>
    )
  }

  return (
    <CronActionsProvider overview={data} clock={clock}>
      <Content refresh={refresh} history={history.data} />
    </CronActionsProvider>
  )
}

function Content({
  refresh,
  history,
}: {
  refresh: ReactNode
  history?: CronHistory
}) {
  const { phone } = useServerPage()
  const a = useCronActions()
  const o = a.overview
  const { filters, setFilters } = useCronFilters()
  const canAdd = targets(o).length > 0
  const all = rows(o)
  const runs = useMemo(
    () => (history?.source ? lastRuns(history) : null),
    [history],
  )

  const tabs: { value: Tab; label: string }[] = [
    { value: "jobs", label: `Cron jobs · ${all.length}` },
  ]
  if (o.timers.length) {
    tabs.push({ value: "timers", label: `Timers · ${o.timers.length}` })
  }
  if (o.scripts.length) {
    tabs.push({ value: "periodic", label: `Periodic · ${o.scripts.length}` })
  }
  const tab = tabs.some((t) => t.value === filters.tab) ? filters.tab : "jobs"

  let body: ReactNode
  if (tab === "timers") {
    body = <TimersView timers={o.timers} />
  } else if (tab === "periodic") {
    body = <ScriptsView scripts={o.scripts} />
  } else {
    const groups = groupRows(o, filterRows(all, filters), filters)
    if (groups.length === 0) {
      body = hasFilters(filters) ? (
        <Empty
          icon={Search}
          title="No matching jobs"
          body="Try another search or filter."
          action={
            <Button
              variant="outline"
              onClick={() => setFilters({ q: null, table: null, status: null })}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <Empty
          icon={CalendarClock}
          title="No cron jobs yet"
          body={
            canAdd
              ? "Schedule a command to run every few minutes, every night or on boot."
              : "No crontab is readable with this login."
          }
          action={
            canAdd && (
              <Button onClick={() => a.newJob()}>
                <Plus />
                New job
              </Button>
            )
          }
        />
      )
    } else {
      body = phone ? (
        <JobsList groups={groups} lastRuns={runs} />
      ) : (
        <JobsTable groups={groups} lastRuns={runs} />
      )
    }
  }

  return (
    <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
      <Bar
        tabs={tabs}
        tab={tab}
        refresh={refresh}
        filters={tab === "jobs" && all.length > 0}
      />
      <Notices history={history} />
      {body}
    </div>
  )
}

// The server's clock, ticking once a minute.
function useServerTime(clock: ServerClock) {
  const [now, setNow] = useState(() => serverNow(clock))
  useEffect(() => {
    setNow(serverNow(clock))
    const id = setInterval(() => setNow(serverNow(clock)), 30_000)
    return () => clearInterval(id)
  }, [clock])
  return now
}

// The soonest run and the server's clock, as one quiet line. `named` spells
// out which job runs next (desktop keeps it in the tooltip).
function Timing({
  named = false,
  className,
}: {
  named?: boolean
  className?: string
}) {
  const { overview: o, clock } = useCronActions()
  const now = useServerTime(clock)

  let soonest: { at: Date; title: string } | null = null
  for (const r of rows(o)) {
    if (!r.enabled) continue
    const [at] = nextRuns(r.schedule, clock, 1, envValue(r.table, "CRON_TZ"))
    if (at && (!soonest || at < soonest.at))
      soonest = { at, title: jobTitle(r) }
  }
  const city = clock.zone.split("/").pop()?.replaceAll("_", " ")

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 text-caption whitespace-nowrap text-muted-foreground",
        className,
      )}
    >
      {soonest && (
        <span
          className="flex min-w-0 items-center gap-1.5"
          title={`Next run: ${soonest.title}, ${formatAt(soonest.at, clock)}`}
        >
          <CalendarClock className="size-3.5 shrink-0 text-ash" />
          {named ? (
            <span className="truncate">{soonest.title}</span>
          ) : (
            "Next run"
          )}
          <span className="text-ash">
            {timeAgo(soonest.at.toISOString()).toLowerCase()}
          </span>
        </span>
      )}
      <span
        className="flex shrink-0 items-center gap-1.5 tabular-nums"
        title={`Server time: ${formatAt(now, clock)} · ${clock.label}`}
      >
        <Clock className="size-3.5 text-ash" />
        {formatAt(now, clock, {
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        })}
        <span className="text-ash">{city}</span>
      </span>
    </div>
  )
}

// What may be missing or not running, and how to fix it.
function Notices({ history }: { history?: CronHistory }) {
  const { overview: o } = useCronActions()
  const notes: {
    key: string
    title: string
    body?: ReactNode
    warn?: boolean
  }[] = []

  if (!o.daemon) {
    notes.push({
      key: "daemon",
      warn: true,
      title: "No cron daemon is running",
      body: "Jobs are saved but won't run until cron starts (e.g. systemctl enable --now cron, or crond on Alpine).",
    })
  }
  if (o.access === "user") {
    notes.push({
      key: "access",
      title: `Only ${o.login_user}'s own crontab is shown`,
      body: (
        <>
          {o.login_user} isn't root and sudo asks for a password. Log in as
          root, or allow <code className="font-mono text-caption">sudo -n</code>{" "}
          for this user, to see and edit every crontab and timer.
        </>
      ),
    })
  }
  for (const [i, w] of o.warnings.entries()) {
    notes.push({ key: `w${i}`, title: w })
  }
  if (history?.note) {
    notes.push({
      key: "history",
      title: "Last runs unavailable",
      body: history.note,
    })
  }
  if (notes.length === 0) return null

  return (
    <div className="flex flex-col gap-2 max-md:mt-4 max-md:gap-0 max-md:divide-y max-md:divide-border max-md:border-y max-md:border-border">
      {notes.map((n) => (
        <div
          key={n.key}
          className="flex gap-3 p-4 text-body-sm md:rounded-2xl md:border md:border-border md:bg-subtle md:px-5 md:py-3"
        >
          {n.warn ? (
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          ) : (
            <Info className="mt-0.5 size-4 shrink-0 text-ash" />
          )}
          <div className="min-w-0">
            <p className="font-medium">{n.title}</p>
            {n.body && <p className="text-muted-foreground">{n.body}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

// Everything above the list in one row: tabs, search, filters, timing and
// actions. Phones stack it: search + actions, then scrolling chips.
function Bar({
  tabs,
  tab,
  refresh,
  filters,
}: {
  tabs: { value: Tab; label: string }[]
  tab: Tab
  refresh: ReactNode
  filters: boolean
}) {
  const { phone } = useServerPage()
  const a = useCronActions()
  const { setFilters } = useCronFilters()

  const tabSwitch = tabs.length > 1 && (
    <Segmented
      label="Show"
      items={tabs}
      value={tab}
      onChange={(t) => setFilters({ tab: t === "jobs" ? null : t })}
    />
  )
  const add = targets(a.overview).length > 0 && (
    <Button
      size={phone ? "icon-lg" : "default"}
      className="md:h-9"
      aria-label="New job"
      onClick={() => a.newJob()}
    >
      <Plus />
      {!phone && "New job"}
    </Button>
  )

  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          {filters ? <SearchBox /> : <Timing named className="flex-1" />}
          {refresh}
          {add}
        </div>
        {(tabSwitch || filters) && (
          <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
            {tabSwitch}
            {filters && <JobFilters />}
          </div>
        )}
        {filters && <Timing named />}
      </div>
    )
  }

  return (
    <div className="@container flex items-center gap-2">
      {tabSwitch}
      {tabSwitch && filters && <span className="mx-1 h-5 w-px bg-border" />}
      {filters && (
        <>
          <SearchBox />
          <JobFilters />
        </>
      )}
      <div className="ms-auto flex shrink-0 items-center gap-2">
        <Timing className="me-2 hidden @5xl:flex" />
        {refresh}
        {add}
      </div>
    </div>
  )
}

function SearchBox() {
  const { filters, setFilters } = useCronFilters()
  return (
    <div className="relative min-w-0 flex-1 md:max-w-72 md:min-w-36">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ash" />
      <input
        type="search"
        value={filters.q}
        onChange={(e) => setFilters({ q: e.target.value || null })}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setFilters({ q: null })
            e.currentTarget.blur()
          }
        }}
        placeholder="Name, command or schedule"
        aria-label="Search jobs"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        className="h-11 w-full rounded-lg border border-input bg-card ps-9 pe-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {filters.q && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setFilters({ q: null })}
          className="absolute end-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-ash hover:text-foreground md:size-7"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

// Status (with counts) and, when there's more than one, the table.
function JobFilters() {
  const { phone } = useServerPage()
  const { overview: o } = useCronActions()
  const { filters, setFilters } = useCronFilters()
  const all = rows(o)
  const on = all.filter((r) => r.enabled).length
  const tables = o.tables.filter((t) => t.jobs.length > 0)
  const items = [
    { value: "all", label: "Every table" },
    ...tables.map((t) => ({ value: t.id, label: tableLabel(t) })),
  ]
  const table = filters.table ?? "all"
  const setTable = (v: string) => setFilters({ table: v === "all" ? null : v })

  return (
    <>
      <Segmented
        label="Status"
        items={[
          { value: "all", label: `All · ${all.length}` },
          { value: "enabled", label: `On · ${on}` },
          { value: "disabled", label: `Off · ${all.length - on}` },
        ]}
        value={filters.status ?? "all"}
        onChange={(v) => setFilters({ status: v === "all" ? null : v })}
      />
      {tables.length > 1 &&
        (phone ? (
          <select
            aria-label="Table"
            value={table}
            onChange={(e) => setTable(e.target.value)}
            className="h-11 max-w-56 shrink-0 rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {items.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        ) : (
          <Select
            items={items}
            value={table}
            onValueChange={(v) => v !== null && setTable(v)}
          >
            <SelectTrigger aria-label="Table" className="h-9 w-44 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
    </>
  )
}

function Segmented<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string
  items: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="flex shrink-0 rounded-lg bg-muted p-0.5">
      <legend className="sr-only">{label}</legend>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
          className="h-10 rounded-md px-3 text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-sm md:h-8"
        >
          {item.label}
        </button>
      ))}
    </fieldset>
  )
}

function Empty({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof Info
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center md:rounded-2xl md:border md:border-border">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 text-body font-medium">{title}</h3>
      <p className="mt-1 max-w-md text-body-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

function Loading({ phone }: { phone: boolean }) {
  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        <Skeleton className="h-11 rounded-lg" />
        {Array.from({ length: 6 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }
  return (
    <>
      <Skeleton className="h-9 rounded-lg" />
      <Skeleton className="h-80 rounded-2xl" />
    </>
  )
}
