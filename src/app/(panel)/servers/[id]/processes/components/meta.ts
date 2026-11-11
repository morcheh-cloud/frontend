"use client"

import {
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import { formatDuration } from "@/lib/format"
import type { Process } from "@/lib/services"
import type { Signal } from "../api"

// ---- Filters (in the URL) ----

export const views = ["list", "tree", "program"] as const
export type View = (typeof views)[number]

export const shows = ["apps", "busy", "attention", "all"] as const
export type Show = (typeof shows)[number]

export const sorts = [
  "cpu",
  "memory",
  "name",
  "pid",
  "user",
  "threads",
  "started",
] as const
export type Sort = (typeof sorts)[number]

const dirs = ["desc", "asc"] as const
export type Dir = (typeof dirs)[number]

const parsers = {
  view: parseAsStringLiteral(views).withDefault("list"),
  show: parseAsStringLiteral(shows).withDefault("apps"),
  user: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(sorts).withDefault("cpu"),
  dir: parseAsStringLiteral(dirs).withDefault("desc"),
  q: parseAsString.withDefault(""),
}

export function useProcessFilters() {
  const [filters, setFilters] = useQueryStates(parsers, { history: "replace" })
  return { filters, setFilters }
}
export type Filters = ReturnType<typeof useProcessFilters>["filters"]

const serialize = createSerializer(parsers)

// A link into a server's process list, e.g. from the ports page.
export function processesHref(
  serverId: string,
  state: Partial<{ q: string; view: View; show: Show }> = {},
) {
  return serialize(`/servers/${serverId}/processes`, state)
}

export const showLabels: Record<Show, string> = {
  apps: "Programs",
  busy: "Busy",
  attention: "Need a look",
  all: "Everything",
}

export const showHints: Record<Show, string> = {
  apps: "Every process but the kernel's own threads.",
  busy: "Using at least 1% of a core or 1% of memory right now.",
  attention: "Zombies, paused ones and ones stuck waiting on a disk.",
  all: "Kernel threads too.",
}

export const sortLabels: Record<Sort, string> = {
  cpu: "CPU",
  memory: "Memory",
  name: "Name",
  pid: "PID",
  user: "User",
  threads: "Threads",
  started: "Started",
}

// Numbers read best biggest first, words A to Z.
export const defaultDir = (s: Sort): Dir =>
  s === "name" || s === "user" ? "asc" : "desc"

// ---- State ----

export type Tone = "success" | "warning" | "muted"

export const stateMeta: Record<
  Process["state"],
  { label: string; tone: Tone; hint: string }
> = {
  running: {
    label: "Running",
    tone: "success",
    hint: "Using the CPU right now, or waiting for its turn.",
  },
  sleeping: {
    label: "Sleeping",
    tone: "muted",
    hint: "Waiting for something to do (a request, a timer, input). Normal.",
  },
  idle: {
    label: "Idle",
    tone: "muted",
    hint: "A kernel thread with nothing to do.",
  },
  disk: {
    label: "Waiting on disk",
    tone: "warning",
    hint: "Stuck in the kernel waiting for a disk or network storage. It can't be stopped until that answers; many of these mean slow or hung storage.",
  },
  stopped: {
    label: "Paused",
    tone: "warning",
    hint: "Paused by a STOP signal or Ctrl+Z. Resume it to let it carry on.",
  },
  zombie: {
    label: "Zombie",
    tone: "warning",
    hint: "It has ended, but its parent hasn't collected its exit code yet. It uses no CPU or memory; only its parent can clear it (restarting the parent does).",
  },
  other: { label: "Other", tone: "muted", hint: "" },
}

export const needsLook = (p: Process) =>
  p.state === "zombie" || p.state === "disk" || p.state === "stopped"

export const isBusy = (p: Process) => p.cpu >= 1 || p.memory_percent >= 1

// ---- Signals ----

export const signalMeta: Record<
  Signal,
  { label: string; verb: string; hint: string }
> = {
  TERM: {
    label: "Terminate (TERM)",
    verb: "Terminate",
    hint: "Asks it to end. Well-behaved programs save their work and exit.",
  },
  KILL: {
    label: "Kill (KILL)",
    verb: "Kill",
    hint: "Ends it at once. It can't clean up: unsaved work and temporary files stay behind.",
  },
  INT: {
    label: "Interrupt (INT)",
    verb: "Interrupt",
    hint: "Like pressing Ctrl+C in its terminal.",
  },
  QUIT: {
    label: "Quit (QUIT)",
    verb: "Quit",
    hint: "Ends it and, where enabled, writes a core dump for debugging.",
  },
  HUP: {
    label: "Hang up (HUP)",
    verb: "Send HUP to",
    hint: "Many daemons (nginx, sshd…) reload their configuration on it; programs started from a terminal usually end.",
  },
  STOP: {
    label: "Pause (STOP)",
    verb: "Pause",
    hint: "Freezes it where it is. It keeps its memory; Resume carries on.",
  },
  CONT: {
    label: "Resume (CONT)",
    verb: "Resume",
    hint: "Lets a paused process carry on.",
  },
  USR1: {
    label: "User signal 1 (USR1)",
    verb: "Send USR1 to",
    hint: "Means whatever the program says: e.g. reopen logs (nginx), print stats (dd).",
  },
  USR2: {
    label: "User signal 2 (USR2)",
    verb: "Send USR2 to",
    hint: "Means whatever the program says: e.g. upgrade the binary in place (nginx).",
  },
}

export const signalOrder: Signal[] = [
  "TERM",
  "KILL",
  "HUP",
  "INT",
  "QUIT",
  "STOP",
  "CONT",
  "USR1",
  "USR2",
]

// Signals that end a process: confirmed first.
export const ending: Signal[] = ["TERM", "KILL", "INT", "QUIT"]

// ---- Priority ----

export const nicePresets = [
  { value: 19, label: "Lowest", hint: "Only gets the CPU nobody else wants." },
  { value: 10, label: "Low", hint: "Yields to normal work. Good for backups." },
  { value: 0, label: "Normal", hint: "Where most programs start." },
  { value: -5, label: "High", hint: "Ahead of normal work." },
  {
    value: -20,
    label: "Highest",
    hint: "Ahead of everything. Can starve the rest of the system.",
  },
]

export function niceLabel(n: number) {
  if (n === 0) return "Normal"
  if (n >= 15) return `Lowest (${n})`
  if (n > 0) return `Low (${n})`
  if (n <= -15) return `Highest (${n})`
  return `High (${n})`
}

// ---- Matching, sorting ----

// A number finds that PID or its children; words search name, command,
// user, service and container.
export function matches(p: Process, q: string) {
  const t = q.trim().toLowerCase()
  if (!t) return true
  if (/^\d+$/.test(t)) {
    const n = Number(t)
    return p.pid === n || p.ppid === n
  }
  return t
    .split(/\s+/)
    .every((w) =>
      [p.name, p.command, p.user, p.unit, p.container].some((f) =>
        f?.toLowerCase().includes(w),
      ),
    )
}

export function inShow(p: Process, show: Show) {
  if (show === "all") return true
  if (p.kernel) return false
  if (show === "busy") return isBusy(p)
  if (show === "attention") return needsLook(p)
  return true
}

export function filterProcesses(list: Process[], f: Filters) {
  return list.filter(
    (p) =>
      inShow(p, f.show) && (!f.user || p.user === f.user) && matches(p, f.q),
  )
}

type Sortable = {
  cpu: number
  memory: number
  name: string
  pid: number
  user: string
  threads: number
  start: number
}

export function compare(sort: Sort, dir: Dir) {
  const sign = dir === "asc" ? 1 : -1
  return (a: Sortable, b: Sortable) => {
    let d = 0
    switch (sort) {
      case "cpu":
        d = a.cpu - b.cpu || a.memory - b.memory
        break
      case "memory":
        d = a.memory - b.memory || a.cpu - b.cpu
        break
      case "name":
        d = a.name.localeCompare(b.name)
        break
      case "user":
        d = a.user.localeCompare(b.user) || a.name.localeCompare(b.name)
        break
      case "threads":
        d = a.threads - b.threads
        break
      case "started":
        d = a.start - b.start
        break
      default:
        d = a.pid - b.pid
    }
    return d * sign || a.pid - b.pid
  }
}

// ---- Tree ----

export type TreeRow = {
  p: Process
  depth: number
  // How many processes sit under it (all levels).
  below: number
  // Shown only as the path to a match.
  context: boolean
}

// Parents above children, siblings in the chosen order. With a search or
// filter, the parents of every match stay (dimmed) so the path shows.
export function buildTree(
  all: Process[],
  shown: Process[],
  sort: Sort,
  dir: Dir,
  collapsed: Set<string>,
): TreeRow[] {
  const byPid = new Map(all.map((p) => [p.pid, p]))
  const keep = new Map(shown.map((p) => [p.pid, false]))
  for (const p of shown) {
    let up = byPid.get(p.ppid)
    while (up && !keep.has(up.pid)) {
      keep.set(up.pid, true)
      up = byPid.get(up.ppid)
    }
  }
  const children = new Map<number, Process[]>()
  const roots: Process[] = []
  for (const [pid] of keep) {
    const p = byPid.get(pid)
    if (!p) continue
    if (keep.has(p.ppid) && p.ppid !== p.pid) {
      const list = children.get(p.ppid) ?? []
      list.push(p)
      children.set(p.ppid, list)
    } else roots.push(p)
  }
  const order = compare(sort, dir)
  const count = new Map<number, number>()
  const size = (pid: number): number => {
    const known = count.get(pid)
    if (known !== undefined) return known
    let n = 0
    for (const c of children.get(pid) ?? []) n += 1 + size(c.pid)
    count.set(pid, n)
    return n
  }
  const out: TreeRow[] = []
  const walk = (list: Process[], depth: number) => {
    for (const p of [...list].sort(order)) {
      out.push({
        p,
        depth,
        below: size(p.pid),
        context: keep.get(p.pid) === true,
      })
      if (!collapsed.has(`${p.pid}:${p.start}`)) {
        walk(children.get(p.pid) ?? [], depth + 1)
      }
    }
  }
  walk(roots, 0)
  return out
}

// ---- By program ----

export type Program = {
  name: string
  processes: Process[]
  cpu: number
  memory: number
  memory_percent: number
  threads: number
  users: string[]
  // For sorting next to processes.
  pid: number
  user: string
  start: number
}

export function groupPrograms(list: Process[], sort: Sort, dir: Dir) {
  const map = new Map<string, Process[]>()
  for (const p of list) {
    const g = map.get(p.name) ?? []
    g.push(p)
    map.set(p.name, g)
  }
  const order = compare(sort, dir)
  return [...map.entries()]
    .map(([name, ps]): Program => {
      const users = [...new Set(ps.map((p) => p.user))].sort()
      return {
        name,
        processes: [...ps].sort(order),
        cpu: ps.reduce((s, p) => s + p.cpu, 0),
        memory: ps.reduce((s, p) => s + p.memory, 0),
        memory_percent: ps.reduce((s, p) => s + p.memory_percent, 0),
        threads: ps.reduce((s, p) => s + p.threads, 0),
        users,
        pid: Math.min(...ps.map((p) => p.pid)),
        user: users[0] ?? "",
        start: Math.min(...ps.map((p) => p.start)),
      }
    })
    .sort(order)
}

// ---- Formatting ----

export function cpuText(n: number) {
  if (n <= 0) return "0%"
  if (n < 0.1) return "<0.1%"
  if (n < 10) return `${n.toFixed(1)}%`
  return `${Math.round(n)}%`
}

export function memPercent(n: number) {
  if (n < 0.1) return n > 0 ? "<0.1%" : "0%"
  return n < 10 ? `${n.toFixed(1)}%` : `${Math.round(n)}%`
}

// "3h 12m" since it started.
export function runningFor(startedAt: string, now: number) {
  const t = Date.parse(startedAt)
  if (Number.isNaN(t)) return null
  return formatDuration(Math.max(0, Math.round((now - t) / 1000)))
}

// CPU seconds as "1h 4m", "12.4 s".
export function cpuTimeText(s: number) {
  if (s < 60) return `${s.toFixed(s < 10 ? 2 : 1)} s`
  return formatDuration(Math.round(s))
}

// "nginx: worker process" → keep it; "/usr/bin/python3 app.py" → as is.
export function commandOf(p: Process) {
  return p.command || `[${p.name}]`
}
