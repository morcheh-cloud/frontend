"use client"

import { BellOff, CircleAlert, CircleCheck } from "lucide-react"
import Link from "next/link"

import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDuration } from "@/lib/format"
import type { AlertEvent } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAlertEvents } from "../api"
import { formatValue, isPercent, isStateMetric, metricOf } from "./rules-meta"

// What the alert rules sent: fired and back-to-normal, newest first.

export function AlertEventList({
  serverId,
  databaseId,
  ruleId,
  limit = 100,
  phone,
  emptyText = "Nothing has fired yet. When a rule's condition holds long enough, it shows here.",
}: {
  serverId?: string
  databaseId?: string
  ruleId?: string
  limit?: number
  phone: boolean
  emptyText?: string
}) {
  const events = useAlertEvents({
    server_id: serverId,
    database_id: databaseId,
    rule_id: ruleId,
    limit,
  })
  const items = events.data ?? []

  if (events.isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    )
  }
  if (events.isError && !events.data) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-body-sm text-muted-foreground">
          {events.error.message}
        </p>
        <Button
          variant="outline"
          className="h-11 md:h-9"
          onClick={() => events.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  }
  if (items.length === 0) {
    return <Empty icon={BellOff} title="No alerts yet" body={emptyText} />
  }

  // Grouped by day, so a busy night reads as one block.
  const days: { day: string; items: AlertEvent[] }[] = []
  for (const e of items) {
    const day = dayLabel(e.at)
    const last = days.at(-1)
    if (last?.day === day) last.items.push(e)
    else days.push({ day, items: [e] })
  }

  return (
    <div className="flex flex-col gap-4">
      {days.map((d) => (
        <section key={d.day} className="flex flex-col gap-1.5">
          <h3
            className={cn(
              "font-label text-caption tracking-label text-ash uppercase",
              phone && "px-4",
            )}
          >
            {d.day}
          </h3>
          <ul
            className={cn(
              "divide-y divide-border border-border",
              phone ? "border-y" : "overflow-hidden rounded-2xl border",
            )}
          >
            {d.items.map((e) => (
              <EventRow
                key={e.id}
                e={e}
                phone={phone}
                target={!serverId && !databaseId}
              />
            ))}
          </ul>
        </section>
      ))}
      {items.length >= limit && (
        <p className="text-center text-caption text-ash">
          The last {limit} alerts.
        </p>
      )}
    </div>
  )
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  })
}

function EventRow({
  e,
  phone,
  target,
}: {
  e: AlertEvent
  phone: boolean
  // Name the server or database (left out on its own page).
  target: boolean
}) {
  const fired = e.kind === "fired"
  const critical = e.severity === "critical"
  const value = isStateMetric(e.metric)
    ? e.detail
    : `${formatValue(e.metric, e.value)}${
        isPercent(e.metric) || e.metric === "load"
          ? ` (limit ${formatValue(e.metric, e.threshold)})`
          : ""
      }${e.detail ? ` on ${e.detail}` : ""}`
  const time = new Date(e.at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
  return (
    <li
      className={cn(
        "flex items-start gap-3 py-3",
        phone ? "px-4" : "px-4 hover:bg-subtle",
      )}
    >
      {fired ? (
        <CircleAlert
          className={cn(
            "mt-0.5 size-4 shrink-0",
            critical ? "text-destructive" : "text-warning",
          )}
        />
      ) : (
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-body-sm break-words">
          <span className="font-medium">{e.rule_name}</span>
          {target && e.server_name && (
            <>
              {" on "}
              {e.database_id || e.server_id ? (
                <Link
                  href={
                    e.database_id
                      ? `/databases/${e.database_id}`
                      : `/servers/${e.server_id}/${e.metric === "service" ? "services" : "metrics"}`
                  }
                  className="font-medium hover:underline"
                >
                  {e.server_name}
                </Link>
              ) : (
                <span className="font-medium">{e.server_name}</span>
              )}
            </>
          )}
          <span className="text-muted-foreground">
            {fired ? " fired" : " back to normal"}
          </span>
          {e.muted && (
            <span
              title="It happened during a mute: recorded here, not sent"
              className="ms-1.5 inline-flex items-center gap-1 rounded-full bg-muted px-2 align-middle text-caption text-muted-foreground"
            >
              <BellOff className="size-3" />
              Muted
            </span>
          )}
        </p>
        <p className="text-caption text-muted-foreground">
          {fired
            ? value || metricOf(e.metric).label
            : e.lasted_secs > 0
              ? `Lasted ${formatDuration(e.lasted_secs)}`
              : "Cleared"}
        </p>
      </div>
      <time
        dateTime={e.at}
        title={timeAgo(e.at)}
        className="shrink-0 text-caption text-ash tabular-nums"
      >
        {time}
      </time>
    </li>
  )
}
