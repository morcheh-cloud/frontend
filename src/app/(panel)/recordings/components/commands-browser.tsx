"use client"

import {
  Clock,
  Download,
  Ellipsis,
  History,
  ListFilter,
  RefreshCw,
  Server,
  Settings2,
  ShieldAlert,
  User,
  X,
} from "lucide-react"
import { type ReactNode, useDeferredValue, useState } from "react"
import { toast } from "sonner"

import {
  Failed,
  Placeholder,
} from "@/app/(panel)/scripts/components/scripts-view"
import {
  afterClose,
  Empty,
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useOpen } from "@/hooks/useOpen"
import type { CommandLogEntry } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  downloadCommandLog,
  useCommandFacets,
  useCommandLog,
  useCommandLogSettings,
} from "../api"
import { CommandDetailsLayer, type Narrow } from "./command-details"
import {
  chipClass,
  FilterChip,
  FilterMenu,
  type FilterSpec,
} from "./command-filters"
import { CommandRows, CommandTable } from "./command-list"
import {
  activeFilters,
  clearedFilters,
  kindMeta,
  kinds,
  periodLabels,
  periods,
  statuses,
  statusMeta,
  toCommandFilters,
  useCommandFilters,
} from "./command-meta"
import { useRecordingsActions, useRecordingsCan } from "./recordings-actions"

const entryLabels = {
  all: "Everything",
  command: "Commands only",
  shell: "Terminals opened only",
} as const

// Every command Morche ran on a workspace's servers (/recordings) or on one
// server (its tab): one toolbar row, then the list by day.
export function CommandsBrowser({
  workspace,
  serverId,
  serverName,
  phone,
  leading,
}: {
  workspace: { id: string; name: string }
  // Only this server's.
  serverId?: string
  // A server's name, for the export's file.
  serverName?: string
  phone: boolean
  // The tabs, at the start of the bar.
  leading?: ReactNode
}) {
  const a = useRecordingsActions()
  const can = useRecordingsCan(workspace.id)
  const [v, setFilters] = useCommandFilters()
  const q = useDeferredValue(v.q.trim())
  const scope = serverId ? { server: serverId } : { workspace: workspace.id }
  const filters = toCommandFilters(v, q)
  const list = useCommandLog(scope, filters)
  const facets = useCommandFacets(scope, v.who === "mine").data
  const settings = useCommandLogSettings(workspace.id).data
  const everyone = list.data?.pages[0]?.everyone ?? false
  const items = list.data?.pages.flatMap((p) => p.items) ?? []
  const filtered = !!v.q || activeFilters(v) > 0

  const [entry, setEntry] = useState<CommandLogEntry | null>(null)
  const [detailsOpen, setDetailsOpen] = useOpen("command-details")
  const [moreOpen, setMoreOpen] = useOpen("command-log-more")

  function narrow(n: Narrow) {
    afterClose(setDetailsOpen, () => setFilters(n))
  }

  async function exportCsv() {
    try {
      await downloadCommandLog(
        scope,
        filters,
        serverId ? (serverName ?? "server") : workspace.name,
      )
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  // ---- filters ----
  const specs: FilterSpec[] = [
    {
      key: "kind",
      label: "Why",
      title: "Why it ran",
      icon: ListFilter,
      multi: true,
      options: kinds.map((k) => ({
        value: k,
        label: kindMeta[k].label,
        hint: kindMeta[k].hint,
        icon: kindMeta[k].icon,
      })),
      value: v.kind,
      onChange: (k) =>
        setFilters({ kind: k.length ? (k as typeof v.kind) : null }),
    },
    {
      key: "status",
      label: "Any result",
      title: "Result",
      allLabel: "Any result",
      options: statuses.map((s) => ({ value: s, label: statusMeta[s].label })),
      value: v.status ? [v.status] : [],
      onChange: ([s]) => setFilters({ status: (s as typeof v.status) ?? null }),
    },
  ]
  if (!serverId)
    specs.push({
      key: "server",
      label: "Any server",
      title: "Server",
      allLabel: "Any server",
      icon: Server,
      options: (facets?.servers ?? [])
        .filter((f) => f.id)
        .map((f) => ({ value: f.id ?? "", label: f.name, count: f.count })),
      value: v.server ? [v.server] : [],
      onChange: ([s]) => setFilters({ server: s ?? null }),
    })
  if (everyone && v.who === "everyone")
    specs.push({
      key: "user",
      label: "Anyone",
      title: "Person",
      allLabel: "Anyone",
      icon: User,
      options: (facets?.people ?? [])
        .filter((f) => f.id)
        .map((f) => ({ value: f.id ?? "", label: f.name, count: f.count })),
      value: v.user ? [v.user] : [],
      onChange: ([u]) => setFilters({ user: u ?? null }),
    })
  specs.push({
    key: "period",
    label: periodLabels.any,
    title: "When",
    allLabel: periodLabels.any,
    icon: Clock,
    options: periods.map((p) => ({ value: p, label: periodLabels[p] })),
    value: v.period ? [v.period] : [],
    onChange: ([p]) => setFilters({ period: (p as typeof v.period) ?? null }),
  })
  const entrySpec: FilterSpec = {
    key: "entry",
    label: "Rows",
    title: "Show",
    allLabel: entryLabels.all,
    options: [
      { value: "command", label: entryLabels.command },
      {
        value: "shell",
        label: entryLabels.shell,
        hint: "Who opened a terminal on which server, and for how long",
      },
    ],
    value: v.entry ? [v.entry] : [],
    onChange: ([e]) => setFilters({ entry: (e as typeof v.entry) ?? null }),
  }

  // ---- bar pieces ----
  const search = (
    <SearchBox
      value={v.q}
      onChange={(q) => setFilters({ q: q || null })}
      placeholder="Search commands"
      label="Search commands, folders and notes"
      className={phone ? "min-w-0 flex-1" : undefined}
    />
  )
  const whoSwitch = everyone && (
    <Segmented
      label="Whose"
      items={[
        { value: "everyone" as const, label: "Everyone" },
        { value: "mine" as const, label: "Mine" },
      ]}
      value={v.who}
      onChange={(w) =>
        setFilters({ who: w === "everyone" ? null : w, user: null })
      }
    />
  )
  const refChip = v.ref && (
    <button
      type="button"
      aria-pressed
      onClick={() => setFilters({ ref: null })}
      className={cn(chipClass, "md:h-9 md:px-3")}
      title="Show every row again"
    >
      <History className="size-4" />
      {items[0]?.kind === "terminal" ? "One terminal" : "One task"}
      <X className="size-4" />
    </button>
  )
  const status = settings && (
    <span className="text-caption whitespace-nowrap text-ash">
      {settings.enabled
        ? `Kept ${settings.keep_days} days`
        : "Command log is off"}
    </span>
  )
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

  const bar = phone ? (
    <div className="flex flex-col gap-3 pb-3">
      {leading && <div className="px-4">{leading}</div>}
      <div className="flex items-center gap-2 px-4">
        {search}
        {refresh}
        <Button
          variant="outline"
          size="icon-lg"
          aria-label="More"
          onClick={() => setMoreOpen(true)}
        >
          <Ellipsis />
        </Button>
      </div>
      <div className="flex [scrollbar-width:none] items-center gap-2 overflow-x-auto px-4">
        {whoSwitch}
        {refChip}
        {specs.map((f) => (
          <FilterChip key={f.key} f={f} />
        ))}
        <button
          type="button"
          aria-pressed={v.root}
          onClick={() => setFilters({ root: v.root ? null : true })}
          className={chipClass}
        >
          <ShieldAlert className="size-4" />
          As root
        </button>
        <FilterChip f={entrySpec} />
        {filtered && (
          <button
            type="button"
            onClick={() => setFilters(clearedFilters)}
            className="h-11 shrink-0 px-2 text-body-sm text-brand"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  ) : (
    <div className="@container flex flex-wrap items-center gap-2">
      {leading}
      {leading && <span className="mx-1 h-5 w-px bg-border" />}
      {search}
      {whoSwitch}
      {specs.map((f) => (
        <FilterMenu key={f.key} f={f} />
      ))}
      <MoreFilters
        root={v.root}
        entry={v.entry}
        onRoot={(on) => setFilters({ root: on || null })}
        onEntry={(e) => setFilters({ entry: e })}
      />
      {refChip}
      {filtered && (
        <Button
          variant="ghost"
          className="h-9 px-2 text-brand"
          onClick={() => setFilters(clearedFilters)}
        >
          Clear
        </Button>
      )}
      <span className="ms-auto hidden @5xl:inline">{status}</span>
      {refresh}
      <Button
        variant="outline"
        size="icon"
        className="size-9"
        aria-label="Export CSV"
        title="Export these rows as CSV"
        onClick={exportCsv}
      >
        <Download />
      </Button>
      {can.manage && (
        <Button
          variant="outline"
          className="h-9"
          onClick={() => a.commandSettings(workspace)}
        >
          <Settings2 />
          Settings
        </Button>
      )}
    </div>
  )

  // ---- body ----
  let body: ReactNode
  if (list.isPending) body = <Placeholder phone={phone} />
  else if (list.isError && !list.data)
    body = <Failed error={list.error} onRetry={() => list.refetch()} />
  else if (items.length === 0 && filtered)
    body = (
      <Empty
        icon={History}
        title="No matching commands"
        body="Try another search, or fewer filters."
        action={
          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={() => setFilters(clearedFilters)}
          >
            Clear filters
          </Button>
        }
      />
    )
  else if (items.length === 0)
    body = (
      <Empty
        icon={History}
        title={
          settings && !settings.enabled
            ? "The command log is off"
            : "No commands yet"
        }
        body={
          settings && !settings.enabled
            ? can.manage
              ? "Turn it on and every command Morche runs on this workspace's servers is kept here: who ran it, why, and how it ended."
              : "An Owner of this workspace can turn it on."
            : everyone
              ? "Commands run on these servers from now on show up here: typed in a terminal, from a button, a task or a cron job."
              : "Commands you run from now on show up here. Owners of the workspace see everyone's."
        }
        action={
          can.manage &&
          settings &&
          !settings.enabled && (
            <Button
              className="h-11 w-full md:h-9 md:w-auto"
              onClick={() => a.commandSettings(workspace)}
            >
              <Settings2 />
              Turn on the command log
            </Button>
          )
        }
      />
    )
  else
    body = (
      <>
        {phone ? (
          <CommandRows
            items={items}
            showServer={!serverId}
            onOpen={(c) => {
              setEntry(c)
              setDetailsOpen(true)
            }}
          />
        ) : (
          <CommandTable
            items={items}
            showServer={!serverId}
            onOpen={(c) => {
              setEntry(c)
              setDetailsOpen(true)
            }}
          />
        )}
        {list.hasNextPage && (
          <div className={cn("flex justify-center", phone ? "py-4" : "pt-2")}>
            <Button
              variant="outline"
              className="h-11 md:h-9"
              disabled={list.isFetchingNextPage}
              onClick={() => list.fetchNextPage()}
            >
              {list.isFetchingNextPage ? "Loading…" : "Show older"}
            </Button>
          </div>
        )}
      </>
    )

  return (
    <>
      {bar}
      {body}
      <CommandDetailsLayer
        entry={entry}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        phone={phone}
        serverScoped={!!serverId}
        onNarrow={narrow}
      />
      {phone && (
        <BottomSheet
          open={moreOpen}
          onOpenChange={setMoreOpen}
          title="Commands"
        >
          <div className="flex flex-col pb-2">
            {status && <p className="px-2 pb-2">{status}</p>}
            <SheetAction
              icon={<Download />}
              label="Export CSV"
              description="The rows these filters show"
              onClick={() => afterClose(setMoreOpen, exportCsv)}
            />
            {can.manage && (
              <SheetAction
                icon={<Settings2 />}
                label="Command log settings"
                description="On or off, and how long it's kept"
                onClick={() =>
                  afterClose(setMoreOpen, () => a.commandSettings(workspace))
                }
              />
            )}
          </div>
        </BottomSheet>
      )}
    </>
  )
}

// Rarely used filters, out of the bar's way.
function MoreFilters({
  root,
  entry,
  onRoot,
  onEntry,
}: {
  root: boolean
  entry: "command" | "shell" | null
  onRoot: (on: boolean) => void
  onEntry: (e: "command" | "shell" | null) => void
}) {
  const on = root || !!entry
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 gap-1.5 px-3",
              on && "border-brand/50 text-brand-strong",
            )}
          />
        }
      >
        <ListFilter className="size-4" />
        More
        {on && (
          <span className="text-caption tabular-nums">
            {Number(root) + Number(!!entry)}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem checked={root} onCheckedChange={onRoot}>
            <ShieldAlert />
            Only as root
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={entry ?? "all"}
            onValueChange={(e) =>
              onEntry(e === "all" ? null : (e as "command" | "shell"))
            }
          >
            {(["all", "command", "shell"] as const).map((e) => (
              <DropdownMenuRadioItem key={e} value={e}>
                {entryLabels[e]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
