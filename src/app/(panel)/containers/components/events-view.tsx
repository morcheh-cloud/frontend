"use client"

import {
  Box,
  Container,
  HardDrive,
  History,
  Network,
  Server,
  SquareTerminal,
} from "lucide-react"
import Link from "next/link"
import {
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"
import type { ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import type { DockerEvent, DockerFleetServer } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty, SearchBox } from "../../servers/[id]/components/parts"
import { type EventQuery, useDockerEvents, useDockerSettings } from "../api"
import { EnvPage } from "./env-page"
import { ChoiceChip, NoMatch, PageBar } from "./kit"
import { containerHref, Dot, type Tone } from "./meta"
import { projectHref } from "./project-actions"
import { eventPeriodLabels, eventPeriods } from "./settings-model"

type Period = (typeof eventPeriods)[number]

function isPeriod(n: number | null | undefined): n is number {
  return eventPeriods.includes(String(n) as never)
}

const types = ["", "container", "image", "volume", "network"] as const

const filterParsers = {
  hours: parseAsInteger,
  type: parseAsStringLiteral(types).withDefault(""),
  exec: parseAsBoolean.withDefault(false),
  q: parseAsString.withDefault(""),
}

const typeLabels: Record<(typeof types)[number], string> = {
  "": "Everything",
  container: "Containers",
  image: "Images",
  volume: "Volumes",
  network: "Networks",
}

const typeIcons: Partial<Record<DockerEvent["type"], typeof Box>> = {
  container: Container,
  image: Box,
  volume: HardDrive,
  network: Network,
  daemon: Server,
}

// What happened, in words, and how much it matters.
export function describeEvent(e: DockerEvent): { text: string; tone: Tone } {
  const a = e.action.split(":")[0]
  if (e.type === "container") {
    switch (a) {
      case "create":
        return { text: "Created", tone: "muted" }
      case "start":
        return { text: "Started", tone: "success" }
      case "restart":
        return { text: "Restarted", tone: "warning" }
      case "stop":
        return { text: "Stopped", tone: "muted" }
      case "die":
        return e.exit_code && e.exit_code !== "0"
          ? { text: `Exited with code ${e.exit_code}`, tone: "warning" }
          : { text: "Exited", tone: "muted" }
      case "kill":
        return {
          text: e.signal ? `Sent ${signalName(e.signal)}` : "Killed",
          tone: "muted",
        }
      case "oom":
        return { text: "Ran out of memory", tone: "destructive" }
      case "destroy":
        return { text: "Removed", tone: "muted" }
      case "pause":
        return { text: "Paused", tone: "muted" }
      case "unpause":
        return { text: "Resumed", tone: "success" }
      case "rename":
        return { text: "Renamed", tone: "muted" }
      case "update":
        return { text: "Limits changed", tone: "muted" }
      case "health_status": {
        const h = e.detail ?? e.action.split(":")[1]?.trim() ?? ""
        return {
          text: `Health: ${h}`,
          tone:
            h === "unhealthy"
              ? "destructive"
              : h === "healthy"
                ? "success"
                : "muted",
        }
      }
      case "exec_create":
      case "exec_start":
        return { text: "Ran a command in it", tone: "muted" }
      case "exec_die":
        return { text: "A command in it ended", tone: "muted" }
      case "attach":
        return { text: "Attached", tone: "muted" }
      case "detach":
        return { text: "Detached", tone: "muted" }
      case "resize":
        return { text: "Terminal resized", tone: "muted" }
      case "commit":
        return { text: "Saved as an image", tone: "muted" }
      case "copy":
      case "archive-path":
      case "extract-to-dir":
        return { text: "Files copied", tone: "muted" }
      case "export":
        return { text: "Exported", tone: "muted" }
    }
  }
  if (e.type === "image") {
    const words: Record<string, string> = {
      pull: "Pulled",
      push: "Pushed",
      tag: "Tagged",
      untag: "Untagged",
      delete: "Deleted",
      import: "Imported",
      load: "Loaded",
      save: "Saved",
    }
    if (words[a]) return { text: words[a], tone: "muted" }
  }
  if (e.type === "volume" || e.type === "network") {
    const words: Record<string, string> = {
      create: "Created",
      destroy: "Removed",
      remove: "Removed",
      mount: "Mounted",
      unmount: "Unmounted",
      connect: "Connected",
      disconnect: "Disconnected",
      prune: "Pruned",
    }
    if (words[a]) return { text: words[a], tone: "muted" }
  }
  const text = e.action.replaceAll("_", " ")
  return { text: text.charAt(0).toUpperCase() + text.slice(1), tone: "muted" }
}

const signals: Record<string, string> = {
  "1": "SIGHUP",
  "2": "SIGINT",
  "9": "SIGKILL",
  "15": "SIGTERM",
}

function signalName(s: string) {
  return signals[s] ?? (s.startsWith("SIG") ? s : `signal ${s}`)
}

// Docker repeats an id for every event of one object, and several can share
// a second: number the repeats so each row keeps a stable key.
export function keyed(items: DockerEvent[]) {
  const seen = new Map<string, number>()
  return items.map((e) => {
    const base = `${e.time}-${e.id}-${e.action}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return { e, key: n ? `${base}-${n}` : base }
  })
}

function subject(e: DockerEvent) {
  return e.name || e.image || e.id.slice(0, 12)
}

const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
})
const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

function dayLabel(d: Date) {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return dayFormat.format(d)
}

export function EventsPage() {
  return (
    <EnvPage title="Event log" bleed anyState>
      {(ctx) => <EventsView {...ctx} />}
    </EnvPage>
  )
}

// /containers/events: what the engine reports happened (Docker's own
// events), newest first, grouped by day.
export function EventsView({
  env,
  phone,
}: {
  env: DockerFleetServer
  phone: boolean
}) {
  const id = env.server_id
  const [f, setF] = useQueryStates(filterParsers, { history: "replace" })
  // The workspace's setting says where the log starts.
  const start = useDockerSettings(env.workspace_id).data?.events_hours
  const fallback = isPeriod(start) ? start : 24
  const hours = isPeriod(f.hours) ? f.hours : fallback
  const q: EventQuery = { hours, type: f.type, exec: f.exec }
  const query = useDockerEvents(id, q)
  const items = query.data?.items ?? []
  const needle = f.q.trim().toLowerCase()
  const shown = needle
    ? items.filter((e) =>
        [e.name, e.image, e.project, e.action, describeEvent(e).text]
          .filter(Boolean)
          .some((s) => s?.toLowerCase().includes(needle)),
      )
    : items

  const days: { label: string; items: DockerEvent[] }[] = []
  for (const e of shown) {
    const label = dayLabel(new Date(e.time))
    const last = days.at(-1)
    if (last?.label === label) last.items.push(e)
    else days.push({ label, items: [e] })
  }

  let body: ReactNode
  if (query.isPending) {
    body = <Skeleton className="h-96 rounded-2xl max-md:mx-4" />
  } else if (query.isError && !query.data) {
    body = (
      <Empty
        icon={History}
        title="Couldn't read the events"
        body={query.error.message}
        className="max-md:mt-4"
      />
    )
  } else if (items.length === 0) {
    body = (
      <Empty
        icon={History}
        title="Nothing happened"
        body={`The engine reported no ${f.type ? typeLabels[f.type].toLowerCase() : ""} events in this period. Try a longer one.`}
        className="max-md:mt-4"
      />
    )
  } else if (shown.length === 0) {
    body = <NoMatch onReset={() => setF({ q: null })} />
  } else {
    body = (
      <div className="flex flex-col gap-6 max-md:gap-0">
        {days.map((d) => (
          <section key={d.label} aria-label={d.label}>
            <h2
              className={cn(
                "font-label text-caption tracking-label text-ash uppercase",
                phone
                  ? "sticky top-[calc(3.5rem+1px+env(safe-area-inset-top))] z-10 border-b border-border bg-subtle px-4 py-2"
                  : "mb-2",
              )}
            >
              {d.label} · {d.items.length}
            </h2>
            <ul
              className={cn(
                "divide-y divide-border",
                !phone && "rounded-2xl border border-border",
              )}
            >
              {keyed(d.items).map(({ e, key }) => (
                <EventRow key={key} e={e} serverId={id} phone={phone} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    )
  }

  const note = query.data?.note
  return (
    <>
      <PageBar
        phone={phone}
        search={
          <SearchBox
            value={f.q}
            onChange={(v) => setF({ q: v || null })}
            placeholder="Search names, images, projects"
            label="Search events"
            className="md:max-w-64"
          />
        }
        filters={
          <>
            <ChoiceChip
              phone={phone}
              label="Period"
              value={String(hours) as Period}
              options={eventPeriods.map((p) => ({
                value: p,
                label: eventPeriodLabels[p],
              }))}
              onChange={(v) =>
                setF({ hours: Number(v) === fallback ? null : Number(v) })
              }
            />
            <ChoiceChip
              phone={phone}
              label="Show"
              value={f.type}
              options={types.map((t) => ({ value: t, label: typeLabels[t] }))}
              onChange={(v) => setF({ type: v || null })}
            />
            <button
              type="button"
              aria-pressed={f.exec}
              onClick={() => setF({ exec: f.exec ? null : true })}
              title="Commands run inside containers (docker exec): many, so hidden by default"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-input px-3 text-body-sm text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand-strong max-md:rounded-full max-md:px-3.5"
            >
              <SquareTerminal className="size-4" />
              Exec
            </button>
          </>
        }
        caption={
          query.data &&
          `${shown.length} event${shown.length === 1 ? "" : "s"} · refreshes every 15 s`
        }
        refresh={{ busy: query.isFetching, run: () => query.refetch() }}
      />
      {note && (
        <p
          className={cn(
            "text-caption text-muted-foreground",
            phone ? "px-4 pt-3" : "mt-3",
          )}
        >
          {note}
        </p>
      )}
      <div className={cn(phone ? "pt-3 pb-24" : "mt-4")}>{body}</div>
    </>
  )
}

function EventRow({
  e,
  serverId,
  phone,
}: {
  e: DockerEvent
  serverId: string
  phone: boolean
}) {
  const d = describeEvent(e)
  const Icon = typeIcons[e.type] ?? History
  const gone =
    e.type === "container" && e.action === "destroy"
      ? true
      : e.type !== "container"
  const name = subject(e)
  return (
    <li
      className={cn(
        "flex items-center gap-3",
        phone ? "min-h-14 px-4 py-2.5" : "px-4 py-2.5",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:flex-row md:items-center md:gap-3">
        <span className="min-w-0 truncate text-body-sm font-medium md:w-64 md:shrink-0">
          {!gone && e.name ? (
            <Link
              href={containerHref(serverId, e.name)}
              className="outline-none hover:text-brand focus-visible:text-brand"
            >
              {name}
            </Link>
          ) : (
            name
          )}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-body-sm text-muted-foreground">
          <Dot tone={d.tone} />
          <span
            className={cn(
              "truncate",
              d.tone === "destructive" && "text-destructive",
              d.tone === "warning" && "text-warning",
            )}
          >
            {d.text}
          </span>
          {e.project && (
            <Link
              href={projectHref(serverId, e.project)}
              className="truncate text-ash outline-none hover:text-brand"
            >
              · {e.project}
            </Link>
          )}
        </span>
      </div>
      <time
        dateTime={e.time}
        className="shrink-0 text-caption text-ash tabular-nums"
      >
        {timeFormat.format(new Date(e.time))}
      </time>
    </li>
  )
}
