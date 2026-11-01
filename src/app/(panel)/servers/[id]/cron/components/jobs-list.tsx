"use client"

import {
  CalendarClock,
  ChevronRight,
  Copy,
  CopyPlus,
  Ellipsis,
  FileCode,
  Pencil,
  Play,
  Plus,
  Power,
  PowerOff,
  Trash2,
  X,
} from "lucide-react"
import { type ReactNode, useState } from "react"

import { BottomSheet, SheetAction } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import type { CronOverview, CronTable } from "@/lib/services"
import { cn } from "@/lib/utils"
import { timeAgo } from "../../../components/meta"
import { useCronActions } from "./cron-actions"
import { envValue, type JobRow, jobTitle, lastRunOf, tableLabel } from "./meta"
import { describe, formatAt, nextRuns, type ServerClock } from "./schedule"

export type JobGroup = { table: CronTable; jobs: JobRow[] }

type Item = {
  key: string
  icon: ReactNode
  label: string
  onSelect: () => void
  destructive?: boolean
}

// Who may run a job: privileged access runs as anyone, else only as yourself.
export function canRun(o: CronOverview, user: string) {
  return o.access !== "user" || user === o.login_user
}

// One list of job actions, for the desktop dropdown and the phone sheet.
function useJobMenu(row: JobRow): Item[][] {
  const a = useCronActions()
  const editable = row.table.editable
  const groups: Item[][] = []
  const first: Item[] = []
  if (canRun(a.overview, row.user)) {
    first.push({
      key: "run",
      icon: <Play />,
      label: "Run now…",
      onSelect: () => a.runJob(row),
    })
  }
  if (editable) {
    first.push(
      {
        key: "edit",
        icon: <Pencil />,
        label: "Edit",
        onSelect: () => a.editJob(row),
      },
      {
        key: "toggle",
        icon: row.enabled ? <PowerOff /> : <Power />,
        label: row.enabled ? "Turn off" : "Turn on",
        onSelect: () => a.setEnabled([row], !row.enabled),
      },
    )
  }
  if (first.length) groups.push(first)
  const second: Item[] = [
    {
      key: "copy",
      icon: <Copy />,
      label: "Copy command",
      onSelect: () => a.copyCommand(row),
    },
  ]
  if (a.overview.tables.some((t) => t.editable)) {
    second.push({
      key: "duplicate",
      icon: <CopyPlus />,
      label: "Duplicate",
      onSelect: () => a.duplicateJob(row),
    })
  }
  if (editable) {
    second.push({
      key: "text",
      icon: <FileCode />,
      label: "Edit table as text",
      onSelect: () => a.editTable(row.table),
    })
  }
  groups.push(second)
  if (editable) {
    groups.push([
      {
        key: "delete",
        icon: <Trash2 />,
        label: "Delete…",
        destructive: true,
        onSelect: () => a.deleteJobs([row]),
      },
    ])
  }
  return groups
}

// When a job runs next, as text. `cronTz` comes from the table's CRON_TZ.
export function nextText(row: JobRow, clock: ServerClock) {
  if (!row.enabled) return { text: "Off", title: undefined }
  if (row.schedule.toLowerCase() === "@reboot") {
    return { text: "At boot", title: undefined }
  }
  const [next] = nextRuns(
    row.schedule,
    clock,
    1,
    envValue(row.table, "CRON_TZ"),
  )
  if (!next) return { text: "—", title: undefined }
  return { text: timeAgo(next.toISOString()), title: formatAt(next, clock) }
}

// "Every 5 minutes" in sentence case; the raw expression when unreadable.
function scheduleText(schedule: string) {
  return describe(schedule) ?? schedule
}

function envSummary(t: CronTable) {
  const shown = t.env.filter((e) =>
    ["MAILTO", "SHELL", "CRON_TZ", "PATH"].includes(e.name),
  )
  return shown.map((e) => `${e.name}=${e.value || '""'}`).join("  ")
}

// ---- Desktop ----

export function JobsTable({
  groups,
  lastRuns,
}: {
  groups: JobGroup[]
  lastRuns: Map<string, string> | null
}) {
  const a = useCronActions()
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const all = groups.flatMap((g) => g.jobs)
  const editable = all.filter((r) => r.table.editable)
  const selected = editable.filter((r) => picked.has(r.key))
  const allPicked = editable.length > 0 && selected.length === editable.length
  const clear = () => setPicked(new Set())

  function toggle(key: string, on: boolean) {
    setPicked((s) => {
      const next = new Set(s)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })
  }

  return (
    <>
      <div className="@container overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-body-sm">
          <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
            <tr className="h-10">
              <th scope="col" className="w-11 ps-4 text-start">
                <Checkbox
                  aria-label="Select every job"
                  checked={allPicked}
                  indeterminate={selected.length > 0 && !allPicked}
                  disabled={editable.length === 0}
                  onCheckedChange={(on) =>
                    setPicked(
                      on ? new Set(editable.map((r) => r.key)) : new Set(),
                    )
                  }
                />
              </th>
              <th scope="col" className="px-3 text-start font-medium">
                Job
              </th>
              <th scope="col" className="px-3 text-start font-medium">
                Schedule
              </th>
              <th
                scope="col"
                className="hidden w-32 px-3 text-start font-medium @xl:table-cell"
              >
                Next run
              </th>
              {lastRuns && (
                <th
                  scope="col"
                  className="hidden w-32 px-3 text-start font-medium @4xl:table-cell"
                >
                  Last run
                </th>
              )}
              <th
                scope="col"
                className="hidden w-28 px-3 text-start font-medium @3xl:table-cell"
              >
                User
              </th>
              <th scope="col" className="w-14 px-3 text-start font-medium">
                On
              </th>
              <th scope="col" className="w-12">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.table.id} className="divide-y divide-border">
              <GroupHeader group={g} lastRuns={lastRuns} />
              {g.jobs.map((row) => (
                <JobRowView
                  key={row.key}
                  row={row}
                  lastRun={lastRuns && lastRunOf(lastRuns, row)}
                  showLastRun={Boolean(lastRuns)}
                  picked={picked.has(row.key)}
                  onPick={(on) => toggle(row.key, on)}
                />
              ))}
              {g.jobs.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="h-14 px-4 text-body-sm text-muted-foreground"
                  >
                    No jobs yet.{" "}
                    <button
                      type="button"
                      onClick={() => a.newJob(g.table.id)}
                      className="font-medium text-brand outline-none hover:text-brand-strong focus-visible:underline"
                    >
                      Add one
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          ))}
        </table>
      </div>
      {selected.length > 0 && <BulkBar rows={selected} onClear={clear} />}
    </>
  )
}

function GroupHeader({
  group: { table },
  lastRuns,
}: {
  group: JobGroup
  lastRuns: Map<string, string> | null
}) {
  const a = useCronActions()
  const env = envSummary(table)
  return (
    <tr className="h-11 border-t border-border bg-subtle/60 first:border-t-0">
      <td colSpan={lastRuns ? 8 : 7} className="px-4">
        <div className="flex items-center gap-3">
          <span className="font-label text-caption tracking-label text-muted-foreground uppercase">
            {tableLabel(table)}
          </span>
          {table.kind === "user" && (
            <span className="font-mono text-caption text-ash">
              {table.path}
            </span>
          )}
          {env && (
            <span className="hidden truncate font-mono text-caption text-ash @3xl:inline">
              {env}
            </span>
          )}
          {!table.editable && (
            <span className="text-caption text-ash">Read-only</span>
          )}
          <span className="flex-1" />
          {table.editable && (
            <span className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => a.editTable(table)}
              >
                <FileCode />
                Edit as text
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => a.newJob(table.id)}
              >
                <Plus />
                Add here
              </Button>
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}

function JobRowView({
  row,
  lastRun,
  showLastRun,
  picked,
  onPick,
}: {
  row: JobRow
  lastRun: string | null | undefined
  showLastRun: boolean
  picked: boolean
  onPick: (on: boolean) => void
}) {
  const a = useCronActions()
  const menu = useJobMenu(row)
  const next = nextText(row, a.clock)
  const title = jobTitle(row)
  const editable = row.table.editable

  return (
    <tr
      className={cn(
        "group/row h-16 hover:bg-subtle",
        picked && "bg-brand-soft/50 hover:bg-brand-soft/70",
      )}
    >
      <td className="ps-4">
        <Checkbox
          aria-label={`Select ${title}`}
          checked={picked}
          disabled={!editable}
          onCheckedChange={(on) => onPick(on)}
        />
      </td>
      <td className="max-w-0 px-3">
        <button
          type="button"
          disabled={!editable}
          onClick={() => a.editJob(row)}
          className="block w-full min-w-0 text-start outline-none focus-visible:underline disabled:cursor-default"
        >
          {row.name ? (
            <>
              <span
                className={cn(
                  "block truncate font-medium",
                  !row.enabled && "text-muted-foreground",
                )}
              >
                {row.name}
              </span>
              <span className="block truncate font-mono text-caption text-ash">
                {row.command}
              </span>
            </>
          ) : (
            <span
              className={cn(
                "block truncate font-mono text-caption",
                row.enabled ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {row.command}
            </span>
          )}
        </button>
      </td>
      <td className="max-w-0 px-3">
        <span className="block truncate">{scheduleText(row.schedule)}</span>
        <span className="block truncate font-mono text-caption text-ash">
          {row.schedule}
        </span>
      </td>
      <td
        className="hidden px-3 whitespace-nowrap text-muted-foreground @xl:table-cell"
        title={next.title}
      >
        {next.text}
      </td>
      {showLastRun && (
        <td
          className="hidden px-3 whitespace-nowrap text-muted-foreground @4xl:table-cell"
          title={lastRun ? formatAt(lastRun, a.clock) : undefined}
        >
          {lastRun ? timeAgo(lastRun) : <span className="text-ash">—</span>}
        </td>
      )}
      <td className="hidden max-w-0 px-3 @3xl:table-cell">
        <span className="block truncate">{row.user}</span>
      </td>
      <td className="px-3">
        <Switch
          size="sm"
          aria-label={row.enabled ? `Turn off ${title}` : `Turn on ${title}`}
          checked={row.enabled}
          disabled={!editable || a.pending}
          onCheckedChange={(on) => a.setEnabled([row], on)}
        />
      </td>
      <td className="pe-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${title}`}
              />
            }
          >
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {menu.map((group, i) => (
              <div key={group[0].key}>
                {i > 0 && <DropdownMenuSeparator />}
                {group.map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    variant={item.destructive ? "destructive" : "default"}
                    onClick={item.onSelect}
                  >
                    {item.icon}
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}

function BulkBar({ rows, onClear }: { rows: JobRow[]; onClear: () => void }) {
  const a = useCronActions()
  return (
    <div
      role="toolbar"
      aria-label="Selected jobs"
      className="sticky bottom-6 z-30 mx-auto mt-3 flex w-fit items-center gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-md"
    >
      <span className="px-3 text-body-sm font-medium tabular-nums">
        {rows.length} selected
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={a.pending}
        onClick={() => a.setEnabled(rows, true, onClear)}
      >
        <Power />
        Turn on
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={a.pending}
        onClick={() => a.setEnabled(rows, false, onClear)}
      >
        <PowerOff />
        Turn off
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => a.deleteJobs(rows, onClear)}
      >
        <Trash2 />
        Delete
      </Button>
      <span aria-hidden className="mx-1 h-5 w-px bg-border" />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Clear selection"
        onClick={onClear}
      >
        <X />
      </Button>
    </div>
  )
}

// ---- Phone ----

export function JobsList({
  groups,
  lastRuns,
}: {
  groups: JobGroup[]
  lastRuns: Map<string, string> | null
}) {
  const a = useCronActions()
  const [open, setOpen] = useOpen("cron-job-sheet")
  const [current, setCurrent] = useState<JobRow | null>(null)
  // Keep the sheet's job in step with edits made from it.
  const row =
    (current &&
      groups.flatMap((g) => g.jobs).find((r) => r.key === current.key)) ??
    current

  return (
    <div className="flex flex-col">
      {groups.map((g) => (
        <section key={g.table.id} className="mt-6 first:mt-4">
          <div className="flex min-h-9 items-end justify-between gap-3 px-4 pb-1.5">
            <h3 className="truncate font-label text-caption tracking-label text-muted-foreground uppercase">
              {tableLabel(g.table)}
              {!g.table.editable && (
                <span className="ms-2 tracking-normal text-ash normal-case">
                  Read-only
                </span>
              )}
            </h3>
            {g.table.editable && (
              <button
                type="button"
                onClick={() => a.newJob(g.table.id)}
                className="-me-2 flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-body-sm font-medium text-brand active:bg-muted"
              >
                <Plus className="size-4" />
                Add
              </button>
            )}
          </div>
          {g.jobs.length === 0 ? (
            <p className="border-y border-border p-4 text-body-sm text-muted-foreground">
              No jobs yet.
            </p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {g.jobs.map((r) => (
                <li key={r.key}>
                  <MobileRow
                    row={r}
                    clock={a.clock}
                    onOpen={() => {
                      setCurrent(r)
                      setOpen(true)
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {row && (
        <JobSheet
          row={row}
          lastRun={lastRuns && lastRunOf(lastRuns, row)}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </div>
  )
}

function MobileRow({
  row,
  clock,
  onOpen,
}: {
  row: JobRow
  clock: ServerClock
  onOpen: () => void
}) {
  const next = nextText(row, clock)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start outline-none active:bg-muted"
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-lg",
          row.enabled ? "bg-brand-soft text-brand-strong" : "bg-muted text-ash",
        )}
      >
        <CalendarClock className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-body font-medium",
            !row.name && "font-mono text-body-sm",
            !row.enabled && "text-muted-foreground",
          )}
        >
          {jobTitle(row)}
        </span>
        <span className="block truncate text-body-sm text-muted-foreground">
          {scheduleText(row.schedule)}
          {row.enabled && next.text !== "—" && (
            <span className="text-ash"> · {next.text}</span>
          )}
          {!row.enabled && <span className="text-ash"> · Off</span>}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-ash" />
    </button>
  )
}

function JobSheet({
  row,
  lastRun,
  open,
  onOpenChange,
}: {
  row: JobRow
  lastRun: string | null | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const a = useCronActions()
  const menu = useJobMenu(row)
  const next = nextText(row, a.clock)

  // Close first, then act once the sheet's history entry is gone, so a layer
  // the action opens gets its own Back entry. Toggling stays in the sheet.
  function select(item: Item) {
    if (item.key === "toggle") return item.onSelect()
    window.addEventListener("popstate", () => item.onSelect(), { once: true })
    onOpenChange(false)
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={jobTitle(row)}
      header={
        <div className="px-6 pt-1 pb-3">
          <p className="truncate text-subheading font-medium">
            {jobTitle(row)}
          </p>
          <p className="text-body-sm text-muted-foreground">
            {scheduleText(row.schedule)}
          </p>
        </div>
      }
    >
      <dl className="mx-2 mb-3 grid grid-cols-2 gap-3 rounded-2xl bg-subtle p-4 text-body-sm">
        <div className="col-span-2">
          <dt className="text-caption text-ash">Command</dt>
          <dd className="mt-0.5 font-mono text-caption break-all">
            {row.command}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-ash">Next run</dt>
          <dd className="mt-0.5 font-medium">{next.title ?? next.text}</dd>
        </div>
        <div>
          <dt className="text-caption text-ash">Runs as</dt>
          <dd className="mt-0.5 truncate font-medium">{row.user}</dd>
        </div>
        {lastRun !== null && (
          <div>
            <dt className="text-caption text-ash">Last run</dt>
            <dd className="mt-0.5 font-medium">
              {lastRun ? formatAt(lastRun, a.clock) : "Not in the log"}
            </dd>
          </div>
        )}
        <div className={cn(lastRun === null && "col-span-2")}>
          <dt className="text-caption text-ash">Schedule</dt>
          <dd className="mt-0.5 font-mono text-caption">{row.schedule}</dd>
        </div>
      </dl>
      {menu.map((group) => (
        <ul
          key={group[0].key}
          className="mb-2 divide-y divide-border border-b border-border last:border-b-0"
        >
          {group.map((item) => (
            <li key={item.key}>
              <SheetAction
                icon={item.icon}
                label={item.key === "toggle" ? "Turned on" : item.label}
                destructive={item.destructive}
                disabled={item.key === "toggle" && a.pending}
                trailing={
                  item.key === "toggle" && (
                    <Switch
                      checked={row.enabled}
                      aria-hidden
                      tabIndex={-1}
                      className="pointer-events-none"
                    />
                  )
                }
                onClick={() => select(item)}
              />
            </li>
          ))}
        </ul>
      ))}
    </BottomSheet>
  )
}
