"use client"

import { ChevronRight, MonitorPlay, SquareTerminal } from "lucide-react"
import { Fragment } from "react"

import { Th } from "@/app/(panel)/scripts/components/scripts-view"
import type { CommandLogEntry } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  dayOf,
  duration,
  exactTime,
  kindMeta,
  resultText,
  statusMeta,
  when,
  whoText,
} from "./command-meta"

// Rows grouped under their day, newest first (as the backend sends them).
function byDay(items: CommandLogEntry[]) {
  const groups: { day: string; items: CommandLogEntry[] }[] = []
  for (const c of items) {
    const day = dayOf(c.started_at)
    const last = groups.at(-1)
    if (last?.day === day) last.items.push(c)
    else groups.push({ day, items: [c] })
  }
  return groups
}

export function StatusMark({
  c,
  className,
}: {
  c: Pick<CommandLogEntry, "status">
  className?: string
}) {
  const tone = statusMeta[c.status]?.tone ?? "quiet"
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        tone === "ok" && "bg-success",
        tone === "bad" && "bg-destructive",
        tone === "live" && "animate-pulse bg-brand",
        tone === "quiet" && "bg-mist",
        className,
      )}
    />
  )
}

export function RootTag() {
  return (
    <span
      title="Ran as root"
      className="inline-flex h-5 shrink-0 items-center rounded-md bg-warning/10 px-1.5 font-label text-[10px] tracking-label text-warning uppercase"
    >
      root
    </span>
  )
}

function Repeats({ n }: { n: number }) {
  if (n <= 1) return null
  return (
    <span
      title={`Ran ${n} times in a row; one row keeps them`}
      className="inline-flex h-5 shrink-0 items-center rounded-full bg-muted px-1.5 text-caption text-muted-foreground tabular-nums"
    >
      ×{n}
    </span>
  )
}

// The command itself; a terminal's own row reads as an event, not code.
function CommandText({ c, lines = 1 }: { c: CommandLogEntry; lines?: 1 | 2 }) {
  if (c.entry === "shell")
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        <SquareTerminal className="size-4 shrink-0" />
        <span className="truncate">
          {c.command}
          {c.source && ` · ${c.source}`}
        </span>
      </span>
    )
  return (
    <code
      className={cn(
        "min-w-0 font-mono text-caption break-all text-foreground",
        lines === 1 ? "truncate" : "line-clamp-2",
      )}
    >
      {c.command}
    </code>
  )
}

function ResultCell({ c }: { c: CommandLogEntry }) {
  const text = resultText(c)
  return (
    <span className="flex min-w-0 items-center gap-2">
      <StatusMark c={c} />
      <span
        className={cn(
          "truncate",
          c.status === "failed" && "text-destructive",
          c.status !== "failed" && "text-muted-foreground",
        )}
        title={text}
      >
        {text}
      </span>
      {c.duration_ms !== undefined && c.status !== "running" && (
        <span className="shrink-0 text-caption text-ash tabular-nums">
          {duration(c.duration_ms)}
        </span>
      )}
    </span>
  )
}

export function CommandTable({
  items,
  showServer,
  onOpen,
}: {
  items: CommandLogEntry[]
  showServer: boolean
  onOpen: (c: CommandLogEntry) => void
}) {
  const cols = showServer ? 6 : 5
  return (
    <div className="overflow-x-auto rounded-2xl border border-border [contain:inline-size]">
      <table className="w-full min-w-[56rem] table-fixed text-body-sm">
        <colgroup>
          <col className="w-28" />
          <col />
          {showServer && <col className="w-40" />}
          <col className="w-36" />
          <col className="w-32" />
          <col className="w-48" />
        </colgroup>
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr>
            <Th>Time</Th>
            <Th>Command</Th>
            {showServer && <Th>Server</Th>}
            <Th>Who</Th>
            <Th>Why</Th>
            <Th>Result</Th>
          </tr>
        </thead>
        <tbody>
          {byDay(items).map((g) => (
            <Fragment key={g.day}>
              <tr className="border-b border-border bg-subtle/60">
                <th
                  colSpan={cols}
                  scope="colgroup"
                  className="h-8 px-3 text-start text-caption font-medium text-ash"
                >
                  {g.day}
                </th>
              </tr>
              {g.items.map((c) => {
                const Kind = kindMeta[c.kind]?.icon ?? SquareTerminal
                return (
                  <tr
                    key={c.id}
                    onClick={() => onOpen(c)}
                    className={cn(
                      "cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/50",
                      c.entry === "shell" && "bg-subtle/40",
                    )}
                  >
                    <td
                      className="h-12 px-3 text-caption whitespace-nowrap text-muted-foreground tabular-nums"
                      title={exactTime(c.started_at)}
                    >
                      {when(c.started_at).split(", ").at(-1)}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpen(c)
                        }}
                        className="flex w-full min-w-0 flex-col items-start gap-0.5 rounded-md text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <span className="flex w-full min-w-0 items-center gap-2">
                          {c.as_root && <RootTag />}
                          <CommandText c={c} />
                          <Repeats n={c.repeats} />
                          {c.recording_id && (
                            <MonitorPlay
                              aria-label="In a recording"
                              className="size-3.5 shrink-0 text-ash"
                            />
                          )}
                        </span>
                        {c.entry !== "shell" && (c.cwd || c.source) && (
                          <span className="w-full truncate text-caption text-ash">
                            {[c.source, c.cwd].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </button>
                    </td>
                    {showServer && (
                      <td className="truncate px-3" title={c.server_name}>
                        {c.server_name}
                      </td>
                    )}
                    <td
                      className="truncate px-3"
                      title={c.client_ip ? `From ${c.client_ip}` : undefined}
                    >
                      <span
                        className={cn(!c.user_name && "text-muted-foreground")}
                      >
                        {whoText(c)}
                      </span>
                    </td>
                    <td className="px-3">
                      <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                        <Kind className="size-4 shrink-0" />
                        <span className="truncate">
                          {kindMeta[c.kind]?.short ?? c.kind}
                        </span>
                      </span>
                    </td>
                    <td className="px-3">
                      <ResultCell c={c} />
                    </td>
                  </tr>
                )
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CommandRows({
  items,
  showServer,
  onOpen,
}: {
  items: CommandLogEntry[]
  showServer: boolean
  onOpen: (c: CommandLogEntry) => void
}) {
  return (
    <div className="flex flex-col">
      {byDay(items).map((g) => (
        <section key={g.day}>
          <h2 className="sticky top-0 z-[1] border-b border-border bg-background/95 px-4 py-2 text-caption font-medium text-ash backdrop-blur">
            {g.day}
          </h2>
          <ul>
            {g.items.map((c) => (
              <li key={c.id} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => onOpen(c)}
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start outline-none active:bg-muted"
                >
                  <StatusMark c={c} className="mt-1.5 self-start" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex min-w-0 items-center gap-2">
                      {c.as_root && <RootTag />}
                      <CommandText c={c} lines={2} />
                      <Repeats n={c.repeats} />
                    </span>
                    <span className="truncate text-caption text-ash">
                      {[
                        when(c.started_at).split(", ").at(-1),
                        showServer && c.server_name,
                        whoText(c),
                        kindMeta[c.kind]?.short,
                        c.status === "failed" && resultText(c),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ash" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
