"use client"

import {
  ArrowDownUp,
  ChevronDown,
  Pause,
  Play,
  RefreshCw,
  SlidersHorizontal,
  SquareCheckBig,
  TriangleAlert,
  User,
} from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useStoredChoice } from "@/hooks/useStoredChoice"
import { formatSize } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  Empty,
  Loading,
  type Note,
  Notices,
  SearchBox,
  Segmented,
} from "../../components/parts"
import { SectionActions } from "../../components/section-actions"
import { useServerPage } from "../../components/server-page"
import { type ProcessesData, useProcesses } from "../api"
import {
  defaultDir,
  inShow,
  type Show,
  type Sort,
  showHints,
  showLabels,
  shows,
  sortLabels,
  sorts,
  useProcessFilters,
  type View,
} from "./meta"
import {
  ProcessesActionsProvider,
  useProcessesActions,
} from "./processes-actions"
import { ProcessesList } from "./processes-list"

const lives = ["5", "2", "10", "off"] as const
type Live = (typeof lives)[number]

const liveLabels: Record<Live, string> = {
  "2": "Every 2 seconds",
  "5": "Every 5 seconds",
  "10": "Every 10 seconds",
  off: "Paused",
}

export function ProcessesView() {
  const { server, phone } = useServerPage()
  const [live, setLive] = useStoredChoice("morcheh.processes.live", lives)
  const query = useProcesses(
    server.id,
    live === "off" ? false : Number(live) * 1000,
  )
  const r = query.data

  const refresh = (
    <Button
      variant="outline"
      size="icon"
      className="max-md:size-11 md:size-9"
      aria-label="Refresh"
      title="Refresh"
      disabled={query.isFetching}
      onClick={() => query.refetch()}
    >
      <RefreshCw className={cn(query.isFetching && "animate-spin")} />
    </Button>
  )

  if (!r) {
    return (
      <>
        <SectionActions>{refresh}</SectionActions>
        <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
          {query.error ? (
            <Empty
              icon={TriangleAlert}
              title="Couldn't read the processes"
              body={query.error.message}
              className="max-md:mt-4"
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
    <ProcessesActionsProvider report={r}>
      <div className="flex flex-col gap-4 max-md:gap-0 max-md:pb-6">
        <Bar
          refresh={refresh}
          live={live}
          setLive={setLive}
          failed={query.isRefetchError ? query.error?.message : undefined}
        />
        <Notes />
        <ProcessesList />
      </div>
    </ProcessesActionsProvider>
  )
}

// Everything above the list in one row: view, search, filters, how the
// server is doing, how often it reads again, Refresh. Phones stack it:
// search + buttons, then scrolling chips.
function Bar({
  refresh,
  live,
  setLive,
  failed,
}: {
  refresh: ReactNode
  live: Live
  setLive: (l: Live) => void
  failed?: string
}) {
  const { phone } = useServerPage()
  const a = useProcessesActions()
  const { filters, setFilters } = useProcessFilters()

  const view = (
    <Segmented
      label="View"
      items={[
        { value: "list", label: "List" },
        { value: "tree", label: "Tree" },
        { value: "program", label: "By program" },
      ]}
      value={filters.view}
      onChange={(v: View) => setFilters({ view: v === "list" ? null : v })}
    />
  )
  const search = (
    <SearchBox
      value={filters.q}
      onChange={(q) => setFilters({ q: q || null })}
      placeholder="Name, command, user or PID"
      label="Search processes"
      className="min-w-0 flex-1 md:w-52 md:flex-none md:shrink"
    />
  )

  if (phone) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          {search}
          <Button
            variant="outline"
            size="icon"
            className="size-11"
            aria-label={live === "off" ? "Read live again" : "Pause live"}
            aria-pressed={live !== "off"}
            onClick={() => setLive(live === "off" ? "5" : "off")}
          >
            {live === "off" ? <Play /> : <Pause />}
          </Button>
          {refresh}
        </div>
        <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4">
          {view}
          <ShowChips />
          <ChipSelect
            label="User"
            value={filters.user}
            onChange={(user) => setFilters({ user: user || null })}
            items={[
              { value: "", label: "All users" },
              ...users(a.report).map((u) => ({
                value: u.name,
                label: `${u.name} · ${u.count}`,
              })),
            ]}
          />
          {filters.view !== "tree" && (
            <ChipSelect
              label="Sort by"
              value={filters.sort}
              onChange={(v) => {
                const sort = v as Sort
                setFilters({
                  sort: sort === "cpu" ? null : sort,
                  dir: defaultDir(sort) === "desc" ? null : "asc",
                })
              }}
              items={sorts.map((s) => ({
                value: s,
                label: `Sort: ${sortLabels[s]}`,
              }))}
            />
          )}
          {a.manage && <SelectChip />}
        </div>
        <Summary failed={failed} live={live} />
      </div>
    )
  }

  return (
    <div className="@container">
      <div className="flex min-w-0 items-center gap-2">
        {view}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        {search}
        <ShowMenu />
        <UserMenu />
        {/* Shrinks first: truncates, then hides on narrow widths. */}
        <div className="flex min-w-0 flex-1 justify-end">
          <Summary
            failed={failed}
            live={live}
            className="ms-2 hidden @4xl:flex"
          />
        </div>
        <LiveMenu live={live} setLive={setLive} />
        {refresh}
      </div>
    </div>
  )
}

// "214 processes · load 0.42 · memory 1.2 GB of 4 GB"
function Summary({
  failed,
  live,
  className,
}: {
  failed?: string
  live: Live
  className?: string
}) {
  const r = useProcessesActions().report
  const load = r.load1.toFixed(2)
  const hot = r.load1 > r.cores * 1.5
  if (failed) {
    return (
      <span
        className={cn(
          "flex min-w-0 items-center gap-1.5 text-caption text-warning",
          className,
        )}
        title={failed}
      >
        <TriangleAlert className="size-3.5 shrink-0" />
        <span className="truncate">Couldn't read again: {failed}</span>
      </span>
    )
  }
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-caption whitespace-nowrap text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          live === "off" ? "bg-mist" : "bg-success",
        )}
      />
      <span className="truncate">
        {r.processes.filter((p) => !p.kernel).length} processes · CPU{" "}
        {Math.round(r.cpu_percent)}% ·{" "}
        <span
          className={cn(hot && "text-warning")}
          title={`Load over 1, 5 and 15 minutes: ${r.load1.toFixed(2)}, ${r.load5.toFixed(2)}, ${r.load15.toFixed(2)} on ${r.cores} cores`}
        >
          load {load}
        </span>{" "}
        · memory {formatSize(r.memory_used)} of {formatSize(r.memory_total)}
      </span>
    </span>
  )
}

function users(r: ProcessesData) {
  const map = new Map<string, number>()
  for (const p of r.processes) {
    if (p.kernel) continue
    map.set(p.user, (map.get(p.user) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

function useShowCount() {
  const a = useProcessesActions()
  const { filters } = useProcessFilters()
  return (s: Show) =>
    a.report.processes.filter(
      (p) => inShow(p, s) && (!filters.user || p.user === filters.user),
    ).length
}

function ShowMenu() {
  const { filters, setFilters } = useProcessFilters()
  const count = useShowCount()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 gap-1.5 px-3",
              filters.show !== "apps" && "border-brand/50 text-brand-strong",
            )}
          />
        }
      >
        <SlidersHorizontal className="size-4" />
        {showLabels[filters.show]} · {count(filters.show)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.show}
            onValueChange={(v) =>
              setFilters({ show: v === "apps" ? null : (v as Show) })
            }
          >
            {shows.map((s) => (
              <DropdownMenuRadioItem key={s} value={s} className="items-start">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span>{showLabels[s]}</span>
                  <span className="text-caption text-ash">{showHints[s]}</span>
                </span>
                <span className="text-caption text-ash tabular-nums">
                  {count(s)}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserMenu() {
  const a = useProcessesActions()
  const { filters, setFilters } = useProcessFilters()
  const list = users(a.report)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 max-w-48 gap-1.5 px-3",
              filters.user && "border-brand/50 text-brand-strong",
            )}
          />
        }
      >
        <User className="size-4" />
        <span className="truncate">{filters.user || "All users"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-96 w-56 overflow-y-auto"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>User</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.user}
            onValueChange={(v) => setFilters({ user: v || null })}
          >
            <DropdownMenuRadioItem value="">All users</DropdownMenuRadioItem>
            {list.map((u) => (
              <DropdownMenuRadioItem key={u.name} value={u.name}>
                <span className="flex-1 truncate">
                  {u.name}
                  {u.name === a.report.login && (
                    <span className="text-ash"> · this login</span>
                  )}
                </span>
                <span className="text-caption text-ash tabular-nums">
                  {u.count}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function LiveMenu({
  live,
  setLive,
}: {
  live: Live
  setLive: (l: Live) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="h-9 gap-1.5 px-3" />}
        aria-label={`Live: ${liveLabels[live]}`}
      >
        {live === "off" ? (
          <Pause className="size-4" />
        ) : (
          <span className="relative flex size-4 items-center justify-center">
            <span className="absolute size-2 animate-ping rounded-full bg-success/50" />
            <span className="size-2 rounded-full bg-success" />
          </span>
        )}
        {live === "off" ? "Paused" : `Live · ${live} s`}
        <ChevronDown className="size-3.5 text-ash" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Read the processes again</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={live}
            onValueChange={(v) => setLive(v as Live)}
          >
            {(["2", "5", "10"] as const).map((l) => (
              <DropdownMenuRadioItem key={l} value={l}>
                {liveLabels[l]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={live}
          onValueChange={(v) => setLive(v as Live)}
        >
          <DropdownMenuRadioItem value="off">
            Pause (Refresh by hand)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---- Phone chips ----

const chip =
  "h-11 shrink-0 rounded-full border border-border px-4 text-body-sm whitespace-nowrap text-muted-foreground aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong"

function ShowChips() {
  const { filters, setFilters } = useProcessFilters()
  const count = useShowCount()
  return shows.map((s) => (
    <button
      key={s}
      type="button"
      aria-pressed={filters.show === s}
      onClick={() => setFilters({ show: s === "apps" ? null : s })}
      className={chip}
    >
      {showLabels[s]} · {count(s)}
    </button>
  ))
}

// A chip that opens the phone's own picker.
function ChipSelect({
  label,
  value,
  items,
  onChange,
}: {
  label: string
  value: string
  items: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const current = items.find((i) => i.value === value) ?? items[0]
  const on = value !== items[0].value
  return (
    <label
      className={cn(
        "relative flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-border px-4 text-body-sm whitespace-nowrap text-muted-foreground",
        on && "border-brand bg-brand-soft text-brand-strong",
      )}
    >
      {label === "Sort by" && <ArrowDownUp className="size-4" />}
      {current.label}
      <ChevronDown className="size-4" />
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0"
      >
        {items.map((i) => (
          <option key={i.value} value={i.value}>
            {i.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function SelectChip() {
  const a = useProcessesActions()
  const on = a.selecting
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        a.setSelecting(!on)
        a.setSelected([])
      }}
      className={cn(chip, "flex items-center gap-1.5")}
    >
      <SquareCheckBig className="size-4" />
      {on ? "Done" : "Select"}
    </button>
  )
}

// ---- Notices ----

function Notes() {
  const a = useProcessesActions()
  const r = a.report
  const { filters, setFilters } = useProcessFilters()
  const out: Note[] = []

  if (r.access === "user" && a.manage) {
    out.push({
      key: "access",
      title: `This login (${r.login}) can only signal its own processes`,
      body: "Every process is listed, but ending or changing other users' needs root, or sudo without a password.",
    })
  }
  if (r.commands_hidden) {
    out.push({
      key: "hidden",
      title: "Other users' commands are hidden",
      body: "The server hides process details from other users (hidepid). Names, memory and CPU still show.",
    })
  }
  const zombies = r.processes.filter((p) => p.state === "zombie")
  const stuck = r.processes.filter((p) => p.state === "disk")
  if (zombies.length >= 5 && filters.show !== "attention") {
    out.push({
      key: "zombies",
      title: `${zombies.length} zombie processes`,
      body: "They use nothing, but many of them mean a program isn't collecting its finished children. Restarting that parent clears them.",
      warn: true,
      action: (
        <Button
          variant="outline"
          size="sm"
          className="max-md:h-11"
          onClick={() => setFilters({ show: "attention", view: "tree" })}
        >
          Show
        </Button>
      ),
    })
  }
  if (stuck.length >= 3 && filters.show !== "attention") {
    out.push({
      key: "disk",
      title: `${stuck.length} processes are waiting on a disk`,
      body: "Many at once usually mean slow or hung storage (a full disk, a network mount that stopped answering).",
      warn: true,
      action: (
        <Button
          variant="outline"
          size="sm"
          className="max-md:h-11"
          onClick={() => setFilters({ show: "attention" })}
        >
          Show
        </Button>
      ),
    })
  }
  if (r.load5 > r.cores * 1.5) {
    out.push({
      key: "load",
      title: `The server is overloaded: load ${r.load5.toFixed(1)} on ${r.cores} ${r.cores === 1 ? "core" : "cores"}`,
      body: "More work is waiting for the CPU (or disk) than it can do. The busiest processes are at the top.",
      warn: true,
      action: filters.sort !== "cpu" && (
        <Button
          variant="outline"
          size="sm"
          className="max-md:h-11"
          onClick={() => setFilters({ sort: null, dir: null, view: null })}
        >
          Sort by CPU
        </Button>
      ),
    })
  }
  const memory = r.memory_total ? r.memory_used / r.memory_total : 0
  if (memory >= 0.9) {
    const swap =
      r.swap_total > 0 && r.swap_used / r.swap_total > 0.5
        ? ` Swap is ${Math.round((r.swap_used / r.swap_total) * 100)}% full too.`
        : ""
    out.push({
      key: "memory",
      title: `Memory is ${Math.round(memory * 100)}% full`,
      body: `When it runs out, the kernel ends the process with the highest out-of-memory score.${swap}`,
      warn: true,
      action: filters.sort !== "memory" && (
        <Button
          variant="outline"
          size="sm"
          className="max-md:h-11"
          onClick={() => setFilters({ sort: "memory", dir: null, view: null })}
        >
          Sort by memory
        </Button>
      ),
    })
  }
  return <Notices notes={out} />
}
