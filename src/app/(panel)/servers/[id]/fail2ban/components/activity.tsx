"use client"

import { Ban, Copy, History, Search, TriangleAlert } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import type { Event } from "@/lib/services"
import { cn } from "@/lib/utils"
import { BarSlot } from "../../components/bar-slots"
import {
  Empty,
  type Item,
  ItemMenu,
  SearchBox,
  Segmented,
  SheetItems,
} from "../../components/parts"
import { useServerPage } from "../../components/server-page"
import { useFail2banLog } from "../api"
import { useF2bActions } from "./fail2ban-actions"
import { useF2bFilters } from "./meta"

type Kind = "all" | "bans" | "failures"
type View = "events" | "raw"

const PAGE = 200

const actionMeta: Record<Event["action"], { label: string; strong?: boolean }> =
  {
    found: { label: "Failed login" },
    ban: { label: "Banned", strong: true },
    unban: { label: "Unbanned" },
    restore: { label: "Ban restored", strong: true },
    increase: { label: "Ban extended", strong: true },
    ignore: { label: "Ignored (never ban)" },
  }

const isBan = (e: Event) =>
  e.action === "ban" ||
  e.action === "unban" ||
  e.action === "restore" ||
  e.action === "increase"

const when = (t: string) => t.replace(/[,.]\d+$/, "")

// What fail2ban did lately, read from its own log.
export function ActivityTab() {
  const { server, phone } = useServerPage()
  const { filters, setFilters } = useF2bFilters()
  const query = useFail2banLog(server.id, true)
  const [kind, setKind] = useState<Kind>("all")
  const [view, setView] = useState<View>("events")
  const [shown, setShown] = useState(PAGE)
  const log = query.data

  const toolbar = (
    <>
      {view === "events" && (
        <BarSlot slot="search">
          <SearchBox
            value={filters.q}
            onChange={(q) => setFilters({ q: q || null })}
            placeholder="Search address or jail"
            label="Search activity"
            className="w-full md:w-full"
          />
        </BarSlot>
      )}
      <BarSlot slot="filters">
        {view === "events" && (
          <Segmented
            label="Events to show"
            items={[
              { value: "all", label: "All" },
              { value: "bans", label: "Bans" },
              { value: "failures", label: "Failures" },
            ]}
            value={kind}
            onChange={(k) => {
              setKind(k)
              setShown(PAGE)
            }}
          />
        )}
        <Segmented
          label="View"
          items={[
            { value: "events", label: "Events" },
            { value: "raw", label: "Raw log" },
          ]}
          value={view}
          onChange={setView}
        />
      </BarSlot>
    </>
  )

  if (!log) {
    return (
      <>
        {toolbar}
        {query.error ? (
          <Empty
            icon={TriangleAlert}
            title="Couldn't read the log"
            body={query.error.message}
            className="max-md:mt-4"
            action={
              <Button variant="outline" onClick={() => query.refetch()}>
                Try again
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2 max-md:px-4 max-md:pt-4">
            {Array.from({ length: 6 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        )}
      </>
    )
  }

  if (!log.source) {
    return (
      <>
        {toolbar}
        <Empty
          icon={History}
          title="No log to read"
          body="Fail2ban's log file wasn't found and the journal has nothing from it. Check logtarget in fail2ban.conf."
          className="max-md:mt-4"
        />
      </>
    )
  }

  const source = (
    <p className="text-caption text-ash max-md:px-4 max-md:pt-3">
      From <span className="font-mono">{log.source}</span> · last{" "}
      {log.lines.length} lines · times are the server's
    </p>
  )

  if (view === "raw") {
    return (
      <>
        {toolbar}
        {source}
        <RawLog lines={log.lines} phone={phone} />
      </>
    )
  }

  const needle = filters.q.trim().toLowerCase()
  const events = log.events.filter((e) => {
    if (kind === "bans" && !isBan(e)) return false
    if (kind === "failures" && e.action !== "found") return false
    if (!needle) return true
    return e.ip.toLowerCase().includes(needle) || e.jail.includes(needle)
  })

  let body: React.ReactNode
  if (log.events.length === 0) {
    body = (
      <Empty
        icon={History}
        title="Nothing happened lately"
        body="No failed logins or bans in the last lines of the log."
        className="max-md:mt-4"
      />
    )
  } else if (events.length === 0) {
    body = (
      <Empty
        icon={Search}
        title="No matching events"
        body="Try another search or filter."
        className="max-md:mt-4"
      />
    )
  } else {
    const page = events.slice(0, shown)
    body = (
      <>
        {phone ? <EventsList events={page} /> : <EventsTable events={page} />}
        {events.length > shown && (
          <Button
            variant="outline"
            className="self-center max-md:mx-4 max-md:mt-4 max-md:h-11 max-md:self-stretch"
            onClick={() => setShown((n) => n + PAGE)}
          >
            Show more ({events.length - shown} left)
          </Button>
        )}
      </>
    )
  }

  return (
    <>
      {toolbar}
      {source}
      {body}
    </>
  )
}

function useEventMenu(e: Event): Item[][] {
  const a = useF2bActions()
  const o = a.overview
  const jail = o.jails.find((j) => j.name === e.jail)
  const banned = jail?.bans.some((b) => b.ip === e.ip)
  return [
    banned
      ? [
          {
            key: "unban",
            label: `Unban from ${e.jail}`,
            icon: <Ban />,
            onSelect: () => a.unban(e.ip, e.jail),
          },
        ]
      : jail?.active && o.access !== "user"
        ? [
            {
              key: "ban",
              label: `Ban in ${e.jail}…`,
              icon: <Ban />,
              onSelect: () => a.ban({ ip: e.ip, jail: e.jail }),
            },
          ]
        : [],
    [
      {
        key: "copy",
        label: "Copy address",
        icon: <Copy />,
        onSelect: () => a.copy(e.ip, "Address"),
      },
    ],
  ]
}

function EventsTable({ events }: { events: Event[] }) {
  return (
    <div className="@container overflow-hidden rounded-2xl border border-border">
      <table className="w-full table-fixed text-body-sm">
        <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
          <tr className="h-10">
            <th className="w-44 ps-4 text-start font-medium">Time</th>
            <th className="w-44 px-3 text-start font-medium">Event</th>
            <th className="px-3 text-start font-medium">Address</th>
            <th className="hidden w-40 px-3 text-start font-medium @xl:table-cell">
              Jail
            </th>
            <th className="w-12 pe-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {events.map((e, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: log lines repeat; order is stable
            <EventRow key={i} event={e} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EventRow({ event: e }: { event: Event }) {
  const menu = useEventMenu(e)
  const m = actionMeta[e.action]
  return (
    <tr className="h-12 hover:bg-subtle">
      <td className="ps-4 whitespace-nowrap text-muted-foreground tabular-nums">
        {when(e.time)}
      </td>
      <td className={cn("truncate px-3", m.strong && "font-medium")}>
        {m.label}
      </td>
      <td className="max-w-0 truncate px-3 font-mono">{e.ip}</td>
      <td className="hidden max-w-0 truncate px-3 @xl:table-cell">{e.jail}</td>
      <td className="pe-3">
        <ItemMenu groups={menu} label={`Actions for ${e.ip}`} />
      </td>
    </tr>
  )
}

function EventsList({ events }: { events: Event[] }) {
  const [open, setOpen] = useOpen("f2b-event-sheet")
  const [current, setCurrent] = useState<Event | null>(null)

  return (
    <>
      <ul className="mt-3 divide-y divide-border border-y border-border">
        {events.map((e, i) => {
          const m = actionMeta[e.action]
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: log lines repeat; order is stable
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  setCurrent(e)
                  setOpen(true)
                }}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-start outline-none active:bg-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-body-sm">
                    {e.ip}
                  </span>
                  <span className="block truncate text-caption text-muted-foreground">
                    <span
                      className={cn(m.strong && "font-medium text-foreground")}
                    >
                      {m.label}
                    </span>
                    <span className="text-ash"> · {e.jail}</span>
                  </span>
                </span>
                <span className="shrink-0 text-caption text-ash tabular-nums">
                  {when(e.time).slice(5)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {current && (
        <EventSheet event={current} open={open} onOpenChange={setOpen} />
      )}
    </>
  )
}

function EventSheet({
  event: e,
  open,
  onOpenChange,
}: {
  event: Event
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useEventMenu(e)
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={e.ip}
      header={
        <div className="px-6 pt-1 pb-3">
          <p className="truncate font-mono text-subheading">{e.ip}</p>
          <p className="text-body-sm text-muted-foreground">
            {actionMeta[e.action].label} in {e.jail} · {when(e.time)}
          </p>
        </div>
      }
    >
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}

// The log as is, scrolled to its newest line.
function RawLog({ lines, phone }: { lines: string[]; phone: boolean }) {
  const ref = useRef<HTMLPreElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])
  return (
    <pre
      ref={ref}
      className={cn(
        "overflow-auto bg-subtle p-3 font-mono text-caption break-all whitespace-pre-wrap",
        phone
          ? "mt-3 max-h-[70dvh] border-y border-border"
          : "max-h-[70vh] rounded-2xl border border-border",
      )}
    >
      {lines.join("\n") || "(empty)"}
    </pre>
  )
}
