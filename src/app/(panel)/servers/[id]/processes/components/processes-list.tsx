"use client"

import {
  ArrowDown,
  ArrowUp,
  Box,
  ChevronRight,
  Cog,
  Cpu,
  Ellipsis,
  Gauge,
  Loader2,
  OctagonX,
  Pause,
  Play,
  Search,
  Send,
  ShieldCheck,
  SquareX,
  X,
} from "lucide-react"
import { type ReactNode, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useNow } from "@/hooks/useNow"
import { formatSize } from "@/lib/format"
import type { Process } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty, type Item, ItemMenu, StateDot } from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { keyOf } from "../api"
import {
  buildTree,
  compare,
  cpuText,
  defaultDir,
  filterProcesses,
  groupPrograms,
  memPercent,
  needsLook,
  type Program,
  runningFor,
  type Sort,
  stateMeta,
  type TreeRow,
  useProcessFilters,
} from "./meta"
import { useProcessesActions, useProcessMenu } from "./processes-actions"

// Rows drawn at first; more on request (a busy server has hundreds).
const PAGE = 150

export function ProcessesList() {
  const { phone } = useServerPage()
  const a = useProcessesActions()
  const { filters, setFilters } = useProcessFilters()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [limit, setLimit] = useState(PAGE)
  const all = a.report.processes
  const shown = filterProcesses(all, filters)

  if (shown.length === 0) {
    const narrowed = filters.show !== "all" || !!filters.user
    const quiet = filters.show === "attention" && !filters.q
    return (
      <Empty
        icon={Search}
        title={quiet ? "Nothing needs a look" : "No matching processes"}
        body={
          quiet
            ? "No zombies, paused processes or ones stuck waiting on a disk."
            : narrowed
              ? "Try Everything, another user, or another search."
              : "Try another search."
        }
        action={
          narrowed && (
            <button
              type="button"
              className="text-body-sm font-medium text-brand hover:underline max-md:py-2"
              onClick={() => setFilters({ show: "all", user: null })}
            >
              Show every process
            </button>
          )
        }
        className="max-md:mt-4"
      />
    )
  }

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  }

  let rows: TreeRow[] = []
  let programs: Program[] = []
  let total = 0
  if (filters.view === "program") {
    programs = groupPrograms(shown, filters.sort, filters.dir)
    total = programs.length
    programs = programs.slice(0, limit)
  } else if (filters.view === "tree") {
    rows = buildTree(all, shown, filters.sort, filters.dir, collapsed)
    total = rows.length
    rows = rows.slice(0, limit)
  } else {
    rows = [...shown]
      .sort(compare(filters.sort, filters.dir))
      .map((p) => ({ p, depth: 0, below: 0, context: false }))
    total = rows.length
    rows = rows.slice(0, limit)
  }

  const chosen = all.filter((p) => a.selected.includes(keyOf(p)))
  const more = total > limit && (
    <div className="flex items-center justify-center gap-3 py-4 text-caption text-muted-foreground">
      Showing {limit} of {total}
      <Button
        variant="outline"
        size="sm"
        className="max-md:h-11"
        onClick={() => setLimit((n) => n + PAGE * 2)}
      >
        Show more
      </Button>
    </div>
  )
  const tree = {
    collapsed,
    onToggle: (key: string) => setCollapsed((c) => toggle(c, key)),
  }
  const groups = {
    open,
    onToggle: (name: string) => setOpen((o) => toggle(o, name)),
  }

  return (
    <>
      {phone ? (
        <PhoneList
          rows={rows}
          programs={filters.view === "program" ? programs : null}
          tree={filters.view === "tree" ? tree : null}
          groups={groups}
        />
      ) : (
        <ProcessTable
          rows={rows}
          programs={filters.view === "program" ? programs : null}
          tree={filters.view === "tree" ? tree : null}
          groups={groups}
        />
      )}
      {more}
      {chosen.length > 0 && <BulkBar chosen={chosen} />}
    </>
  )
}

type TreeState = { collapsed: Set<string>; onToggle: (key: string) => void }
type GroupState = { open: Set<string>; onToggle: (name: string) => void }

// Keeps the rows where they were while the pointer is over the list, so a
// live re-sort never moves the row being clicked. New ones go last.
function useHeld<T>(items: T[], id: (t: T) => string, enabled: boolean) {
  const [held, setHeld] = useState<string[] | null>(null)
  const order = enabled && held ? new Map(held.map((k, i) => [k, i])) : null
  const shown = order
    ? [...items].sort(
        (a, b) =>
          (order.get(id(a)) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(id(b)) ?? Number.MAX_SAFE_INTEGER),
      )
    : items
  return {
    shown,
    holding: !!order,
    handlers: {
      onPointerEnter: (e: React.PointerEvent) => {
        if (enabled && e.pointerType === "mouse") setHeld(items.map(id))
      },
      onPointerLeave: () => setHeld(null),
    },
  }
}

// ---- Desktop ----

function SortHeader({
  sort,
  className,
  end,
  children,
}: {
  sort: Sort
  className?: string
  end?: boolean
  children: ReactNode
}) {
  const { filters, setFilters } = useProcessFilters()
  const active = filters.sort === sort
  const Arrow = filters.dir === "asc" ? ArrowUp : ArrowDown
  return (
    <th
      className={cn(
        "px-3 font-medium",
        end ? "text-end" : "text-start",
        className,
      )}
      aria-sort={
        active ? (filters.dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => {
          const dir = active
            ? filters.dir === "asc"
              ? "desc"
              : "asc"
            : defaultDir(sort)
          setFilters({
            sort: sort === "cpu" ? null : sort,
            dir: dir === "desc" ? null : dir,
          })
        }}
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-md outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          end && "flex-row-reverse",
          active && "text-foreground",
        )}
      >
        {children}
        {active && <Arrow className="size-3.5" />}
      </button>
    </th>
  )
}

function ProcessTable({
  rows,
  programs,
  tree,
  groups,
}: {
  rows: TreeRow[]
  programs: Program[] | null
  tree: TreeState | null
  groups: GroupState
}) {
  const a = useProcessesActions()
  const now = useNow(30_000)
  const held = useHeld(rows, (r) => keyOf(r.p), !tree && !programs)
  const heldPrograms = useHeld(programs ?? [], (g) => g.name, !!programs)

  // Ticks: what's on screen and may be signalled.
  const pickable = (
    programs ? programs.flatMap((g) => g.processes) : rows.map((r) => r.p)
  ).filter((p) => a.reach(p) && !(tree && rowIsContext(rows, p)))
  const keys = pickable.map(keyOf)
  const picked = keys.filter((k) => a.selected.includes(k))
  const allOn = keys.length > 0 && picked.length === keys.length

  return (
    <div
      className="@container overflow-hidden rounded-2xl border border-border"
      {...(programs ? heldPrograms.handlers : held.handlers)}
    >
      <table className="w-full table-fixed text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr className="h-10">
            {a.manage && (
              <th className="w-11 ps-4">
                <Checkbox
                  aria-label="Select all shown"
                  checked={allOn}
                  indeterminate={picked.length > 0 && !allOn}
                  disabled={keys.length === 0}
                  onCheckedChange={(on) =>
                    a.setSelected(
                      on
                        ? [...new Set([...a.selected, ...keys])]
                        : a.selected.filter((k) => !keys.includes(k)),
                    )
                  }
                />
              </th>
            )}
            <SortHeader sort="name" className={cn(!a.manage && "ps-4")}>
              {programs ? "Program" : "Process"}
            </SortHeader>
            <SortHeader sort="user" className="hidden w-32 @2xl:table-cell">
              User
            </SortHeader>
            <SortHeader sort="cpu" className="w-36">
              CPU
            </SortHeader>
            <SortHeader sort="memory" className="w-28" end>
              Memory
            </SortHeader>
            <SortHeader
              sort="threads"
              className="hidden w-24 @7xl:table-cell"
              end
            >
              Threads
            </SortHeader>
            <SortHeader
              sort="started"
              className="hidden w-32 @6xl:table-cell"
              end
            >
              Running for
            </SortHeader>
            <SortHeader sort="pid" className="hidden w-24 @5xl:table-cell" end>
              {programs ? "Count" : "PID"}
            </SortHeader>
            <th className="hidden w-36 px-3 text-start font-medium @xl:table-cell">
              State
            </th>
            <th className="w-12 pe-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {programs
            ? heldPrograms.shown.map((g) => (
                <ProgramRows
                  key={g.name}
                  program={g}
                  open={groups.open.has(g.name)}
                  onToggle={() => groups.onToggle(g.name)}
                  now={now}
                />
              ))
            : held.shown.map((r) => (
                <Row key={keyOf(r.p)} row={r} tree={tree} now={now} />
              ))}
        </tbody>
      </table>
    </div>
  )
}

function rowIsContext(rows: TreeRow[], p: Process) {
  return rows.some((r) => r.p === p && r.context)
}

function Tag({
  children,
  warn,
  title,
}: {
  children: ReactNode
  warn?: boolean
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        "min-w-0 truncate rounded-full px-2 text-caption whitespace-nowrap",
        warn ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  )
}

// "nginx.service" next to nginx says nothing new.
function sameName(unit: string, name: string) {
  const u = unit
    .replace(/\.service$/, "")
    .replace(/@.*$/, "")
    .toLowerCase()
  const n = name.toLowerCase()
  return u === n || n.startsWith(u) || u.startsWith(n)
}

function Tags({ p }: { p: Process }) {
  return (
    <>
      {needsLook(p) && (
        <Tag warn title={stateMeta[p.state].hint}>
          {stateMeta[p.state].label.toLowerCase()}
        </Tag>
      )}
      {p.unit && !sameName(p.unit, p.name) && (
        <Tag title={`Part of the service ${p.unit}`}>
          {p.unit.replace(/\.service$/, "")}
        </Tag>
      )}
      {p.container && (
        <Tag title={`In the container ${p.container}`}>
          {p.container.length > 16
            ? `${p.container.slice(0, 12)}…`
            : p.container}
        </Tag>
      )}
      {p.morcheh && <Tag title="Morche's own connection">Morche</Tag>}
      {p.protected && !p.morcheh && (
        <Tag title="The system relies on it: ending it asks to confirm">
          system
        </Tag>
      )}
    </>
  )
}

function CpuCell({ cpu, cores }: { cpu: number; cores: number }) {
  // Scaled to one core; a process using several fills the bar.
  const w = Math.min(100, cpu)
  return (
    <span
      className="flex items-center gap-2"
      title={`${cpuText(cpu)} of one core (${cpuText(cpu / cores)} of the whole server)`}
    >
      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-brand transition-[width] duration-500"
          style={{ width: `${w}%` }}
        />
      </span>
      <span className="w-12 shrink-0 text-end tabular-nums">
        {cpuText(cpu)}
      </span>
    </span>
  )
}

function State({ p }: { p: Process }) {
  const a = useProcessesActions()
  if (a.busy.has(keyOf(p))) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Working…
      </span>
    )
  }
  const meta = stateMeta[p.state]
  return <StateDot tone={meta.tone} label={meta.label} />
}

function Pick({ p }: { p: Process }) {
  const a = useProcessesActions()
  const key = keyOf(p)
  return (
    <Checkbox
      aria-label={`Select ${p.name} (PID ${p.pid})`}
      checked={a.selected.includes(key)}
      disabled={!a.reach(p)}
      onCheckedChange={(on) =>
        a.setSelected(
          on ? [...a.selected, key] : a.selected.filter((k) => k !== key),
        )
      }
    />
  )
}

function Row({
  row,
  tree,
  now,
  inGroup,
}: {
  row: TreeRow
  tree: TreeState | null
  now: number
  inGroup?: boolean
}) {
  const a = useProcessesActions()
  const { can } = useServerPage()
  const { p, depth, below, context } = row
  const menu = useProcessMenu(p)
  const key = keyOf(p)
  const folded = tree?.collapsed.has(key)
  const indent = tree ? Math.min(depth, 12) * 16 : inGroup ? 28 : 0
  return (
    <tr
      className={cn(
        "h-14 hover:bg-subtle",
        context && "text-muted-foreground",
        a.selected.includes(key) && "bg-brand-soft/50 hover:bg-brand-soft/70",
      )}
    >
      {a.manage && <td className="ps-4">{!context && <Pick p={p} />}</td>}
      <td className={cn("max-w-0 px-3", !a.manage && "ps-4")}>
        <span
          className="flex min-w-0 items-center gap-1"
          style={{ paddingInlineStart: indent }}
        >
          {tree &&
            (below > 0 ? (
              <button
                type="button"
                aria-label={
                  folded ? `Show what ${p.name} started` : `Fold ${p.name}`
                }
                aria-expanded={!folded}
                onClick={() => tree.onToggle(key)}
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-ash outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <ChevronRight
                  className={cn(
                    "size-4 transition-transform",
                    !folded && "rotate-90",
                  )}
                />
              </button>
            ) : (
              <span className="size-6 shrink-0" />
            ))}
          <button
            type="button"
            disabled={!can("operator") || p.kernel}
            onClick={() => a.details(p)}
            className="block min-w-0 flex-1 text-start outline-none focus-visible:underline disabled:cursor-default"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "max-w-full shrink-0 truncate font-medium",
                  (p.kernel || context) && "font-normal text-muted-foreground",
                )}
              >
                {p.kernel ? `[${p.name}]` : p.name}
              </span>
              <span className="flex min-w-0 items-center gap-1 overflow-hidden">
                {tree && folded && below > 0 && <Tag>+{below}</Tag>}
                {!context && <Tags p={p} />}
              </span>
            </span>
            {p.command && (
              <span
                className="block truncate font-mono text-caption text-ash"
                title={p.command}
              >
                {p.command}
              </span>
            )}
          </button>
        </span>
      </td>
      <td className="hidden truncate px-3 @2xl:table-cell" title={p.user}>
        {p.user}
      </td>
      <td className="px-3">
        <CpuCell cpu={p.cpu} cores={a.report.cores} />
      </td>
      <td
        className="px-3 text-end whitespace-nowrap tabular-nums"
        title={`${memPercent(p.memory_percent)} of the memory`}
      >
        {p.kernel ? <span className="text-ash">—</span> : formatSize(p.memory)}
      </td>
      <td className="hidden px-3 text-end tabular-nums @7xl:table-cell">
        {p.threads}
      </td>
      <td className="hidden px-3 text-end whitespace-nowrap tabular-nums @6xl:table-cell">
        {runningFor(p.started_at, now) ?? <span className="text-ash">—</span>}
      </td>
      <td className="hidden px-3 text-end tabular-nums @5xl:table-cell">
        {p.pid}
      </td>
      <td
        className="hidden px-3 @xl:table-cell"
        title={stateMeta[p.state].hint}
      >
        <State p={p} />
      </td>
      <td className="pe-3">
        <ItemMenu groups={menu} label={`Actions for ${p.name}`} />
      </td>
    </tr>
  )
}

function ProgramRows({
  program: g,
  open,
  onToggle,
  now,
}: {
  program: Program
  open: boolean
  onToggle: () => void
  now: number
}) {
  const a = useProcessesActions()
  const menu = useProgramMenu(g)
  const pickable = g.processes.filter(a.reach).map(keyOf)
  const picked = pickable.filter((k) => a.selected.includes(k))
  const allOn = pickable.length > 0 && picked.length === pickable.length
  const one = g.processes.length === 1
  if (one) {
    const p = g.processes[0]
    return (
      <Row
        row={{ p, depth: 0, below: 0, context: false }}
        tree={null}
        now={now}
      />
    )
  }
  return (
    <>
      <tr className="h-14 hover:bg-subtle">
        {a.manage && (
          <td className="ps-4">
            <Checkbox
              aria-label={`Select every ${g.name}`}
              checked={allOn}
              indeterminate={picked.length > 0 && !allOn}
              disabled={pickable.length === 0}
              onCheckedChange={(on) =>
                a.setSelected(
                  on
                    ? [...new Set([...a.selected, ...pickable])]
                    : a.selected.filter((k) => !pickable.includes(k)),
                )
              }
            />
          </td>
        )}
        <td className={cn("max-w-0 px-3", !a.manage && "ps-4")}>
          <button
            type="button"
            aria-expanded={open}
            onClick={onToggle}
            className="flex w-full min-w-0 items-center gap-1 text-start outline-none focus-visible:underline"
          >
            <ChevronRight
              className={cn(
                "size-4 shrink-0 text-ash transition-transform",
                open && "rotate-90",
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="max-w-full shrink-0 truncate font-medium">
                  {g.name}
                </span>
                <Tag>× {g.processes.length}</Tag>
              </span>
              <span className="block truncate text-caption text-ash">
                {g.users.join(", ")} · {g.threads} threads
              </span>
            </span>
          </button>
        </td>
        <td className="hidden truncate px-3 @2xl:table-cell">
          {g.users.length === 1 ? g.users[0] : `${g.users.length} users`}
        </td>
        <td className="px-3">
          <CpuCell cpu={g.cpu} cores={a.report.cores} />
        </td>
        <td
          className="px-3 text-end whitespace-nowrap tabular-nums"
          title={`${memPercent(g.memory_percent)} of the memory (shared pages count once per process)`}
        >
          {formatSize(g.memory)}
        </td>
        <td className="hidden px-3 text-end tabular-nums @7xl:table-cell">
          {g.threads}
        </td>
        <td className="hidden px-3 @6xl:table-cell" />
        <td className="hidden px-3 text-end tabular-nums @5xl:table-cell">
          {g.processes.length}
        </td>
        <td className="hidden px-3 @xl:table-cell" />
        <td className="pe-3">
          <ItemMenu groups={menu} label={`Actions for every ${g.name}`} />
        </td>
      </tr>
      {open &&
        g.processes.map((p) => (
          <Row
            key={keyOf(p)}
            row={{ p, depth: 0, below: 0, context: false }}
            tree={null}
            now={now}
            inGroup
          />
        ))}
    </>
  )
}

// Actions on every process of one program.
function useProgramMenu(g: Program): Item[][] {
  const a = useProcessesActions()
  const { setFilters } = useProcessFilters()
  const list = g.processes
  const none = !list.some(a.reach)
  const change: Item[] = a.manage
    ? [
        {
          key: "term",
          label: `Terminate all ${list.length}`,
          icon: <SquareX />,
          disabled: none,
          onSelect: () => a.signal(list, "TERM"),
        },
        {
          key: "kill",
          label: `Kill all ${list.length}`,
          icon: <OctagonX />,
          destructive: true,
          disabled: none,
          onSelect: () => a.signal(list, "KILL"),
        },
        {
          key: "signal",
          label: "Send a signal…",
          icon: <Send />,
          disabled: none,
          onSelect: () => a.chooseSignal(list),
        },
        {
          key: "nice",
          label: "Change priority…",
          icon: <Gauge />,
          disabled: none,
          onSelect: () => a.renice(list),
        },
      ]
    : []
  return [
    change,
    [
      {
        key: "only",
        label: `List only ${g.name}`,
        icon: <Search />,
        onSelect: () => setFilters({ q: g.name, view: null }),
      },
    ],
  ]
}

// ---- Selected ----

function BulkBar({ chosen }: { chosen: Process[] }) {
  const a = useProcessesActions()
  const { phone } = useServerPage()
  const paused = chosen.filter((p) => p.state === "stopped")
  const items: Item[][] = [
    [
      paused.length > 0
        ? {
            key: "cont",
            label: `Resume ${paused.length}`,
            icon: <Play />,
            onSelect: () => a.signal(paused, "CONT"),
          }
        : {
            key: "stop",
            label: "Pause",
            icon: <Pause />,
            onSelect: () => a.signal(chosen, "STOP"),
          },
      {
        key: "signal",
        label: "Send a signal…",
        icon: <Send />,
        onSelect: () => a.chooseSignal(chosen),
      },
      {
        key: "nice",
        label: "Change priority…",
        icon: <Gauge />,
        onSelect: () => a.renice(chosen),
      },
    ],
  ]
  return (
    <div
      role="toolbar"
      aria-label="Selected processes"
      className={cn(
        "z-30 mx-auto mt-3 flex w-fit items-center gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-md",
        phone
          ? "sticky bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]"
          : "sticky bottom-6",
      )}
    >
      <span className="px-3 text-body-sm font-medium whitespace-nowrap">
        {chosen.length} selected
      </span>
      <Button
        variant="ghost"
        size={phone ? "lg" : "sm"}
        onClick={() => a.signal(chosen, "TERM")}
      >
        <SquareX />
        Terminate
      </Button>
      <Button
        variant="ghost"
        size={phone ? "lg" : "sm"}
        className="text-destructive hover:text-destructive"
        onClick={() => a.signal(chosen, "KILL")}
      >
        <OctagonX />
        Kill
      </Button>
      <ItemMenu
        groups={items}
        label="More actions for the selected processes"
        trigger={
          <Button
            variant="ghost"
            size={phone ? "icon-lg" : "icon-sm"}
            aria-label="More actions"
          >
            <Ellipsis />
          </Button>
        }
      />
      <Button
        variant="ghost"
        size={phone ? "icon-lg" : "icon-sm"}
        aria-label="Clear the selection"
        onClick={() => a.setSelected([])}
      >
        <X />
      </Button>
    </div>
  )
}

// ---- Phone ----

function Tile({ p }: { p: Process }) {
  const Icon = p.protected
    ? ShieldCheck
    : p.container
      ? Box
      : p.unit
        ? Cog
        : Cpu
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg",
        needsLook(p)
          ? "bg-warning/10 text-warning"
          : p.protected
            ? "bg-brand-soft text-brand-strong"
            : "bg-muted text-ash",
      )}
    >
      <Icon className="size-5" />
    </span>
  )
}

function PhoneList({
  rows,
  programs,
  tree,
  groups,
}: {
  rows: TreeRow[]
  programs: Program[] | null
  tree: TreeState | null
  groups: GroupState
}) {
  if (programs) {
    return (
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {programs.map((g) =>
          g.processes.length === 1 ? (
            <PhoneRow
              key={g.name}
              row={{ p: g.processes[0], depth: 0, below: 0, context: false }}
              tree={null}
            />
          ) : (
            <PhoneProgram
              key={g.name}
              program={g}
              open={groups.open.has(g.name)}
              onToggle={() => groups.onToggle(g.name)}
            />
          ),
        )}
      </ul>
    )
  }
  return (
    <ul className="mt-4 divide-y divide-border border-y border-border">
      {rows.map((r) => (
        <PhoneRow key={keyOf(r.p)} row={r} tree={tree} />
      ))}
    </ul>
  )
}

function PhoneRow({
  row,
  tree,
  inGroup,
}: {
  row: TreeRow
  tree: TreeState | null
  inGroup?: boolean
}) {
  const a = useProcessesActions()
  const { can } = useServerPage()
  const { p, depth, below, context } = row
  const key = keyOf(p)
  const folded = tree?.collapsed.has(key)
  const on = a.selected.includes(key)
  const pickable = a.selecting && a.reach(p) && !context
  const busy = a.busy.has(key)
  const indent = tree ? Math.min(depth, 5) * 14 : inGroup ? 20 : 0
  return (
    <li
      className={cn("flex items-center", on && "bg-brand-soft/60")}
      style={{ paddingInlineStart: indent }}
    >
      {tree && below > 0 && (
        <button
          type="button"
          aria-label={folded ? `Show what ${p.name} started` : `Fold ${p.name}`}
          aria-expanded={!folded}
          onClick={() => tree.onToggle(key)}
          className="flex size-11 shrink-0 items-center justify-center text-ash active:bg-muted"
        >
          <ChevronRight
            className={cn(
              "size-4 transition-transform",
              !folded && "rotate-90",
            )}
          />
        </button>
      )}
      <button
        type="button"
        disabled={a.selecting ? !pickable : !can("operator") || p.kernel}
        aria-pressed={a.selecting ? on : undefined}
        onClick={() =>
          a.selecting
            ? a.setSelected(
                on ? a.selected.filter((k) => k !== key) : [...a.selected, key],
              )
            : a.details(p)
        }
        className={cn(
          "flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2.5 pe-4 text-start outline-none enabled:active:bg-muted",
          tree && below > 0 ? "ps-0" : "ps-4",
          context && "opacity-60",
        )}
      >
        {a.selecting ? (
          <span className="flex size-11 shrink-0 items-center justify-center">
            <Checkbox
              checked={on}
              disabled={!pickable}
              tabIndex={-1}
              aria-hidden
              className="pointer-events-none"
            />
          </span>
        ) : (
          <Tile p={p} />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "truncate text-body font-medium",
                p.kernel && "font-normal text-muted-foreground",
              )}
            >
              {p.kernel ? `[${p.name}]` : p.name}
            </span>
            {tree && folded && below > 0 && <Tag>+{below}</Tag>}
          </span>
          <span className="block truncate text-body-sm text-muted-foreground">
            {busy ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                Working…
              </span>
            ) : (
              [
                needsLook(p) && stateMeta[p.state].label,
                p.user,
                p.unit?.replace(/\.service$/, ""),
                `PID ${p.pid}`,
              ]
                .filter(Boolean)
                .join(" · ")
            )}
          </span>
        </span>
        <span className="shrink-0 text-end tabular-nums">
          <span className="block text-body-sm font-medium">
            {cpuText(p.cpu)}
          </span>
          <span className="block text-caption text-ash">
            {p.kernel ? "" : formatSize(p.memory)}
          </span>
        </span>
        {!a.selecting && <ChevronRight className="size-4 shrink-0 text-ash" />}
      </button>
    </li>
  )
}

function PhoneProgram({
  program: g,
  open,
  onToggle,
}: {
  program: Program
  open: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start outline-none active:bg-muted"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-ash">
          <ChevronRight
            className={cn("size-5 transition-transform", open && "rotate-90")}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-body font-medium">{g.name}</span>
            <Tag>× {g.processes.length}</Tag>
          </span>
          <span className="block truncate text-body-sm text-muted-foreground">
            {g.users.join(", ")}
          </span>
        </span>
        <span className="shrink-0 text-end tabular-nums">
          <span className="block text-body-sm font-medium">
            {cpuText(g.cpu)}
          </span>
          <span className="block text-caption text-ash">
            {formatSize(g.memory)}
          </span>
        </span>
      </button>
      {open && (
        <ul className="divide-y divide-border border-t border-border">
          {g.processes.map((p) => (
            <PhoneRow
              key={keyOf(p)}
              row={{ p, depth: 0, below: 0, context: false }}
              tree={null}
              inGroup
            />
          ))}
        </ul>
      )}
    </li>
  )
}
