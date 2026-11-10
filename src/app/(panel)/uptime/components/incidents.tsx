"use client"

import type { UseQueryResult } from "@tanstack/react-query"
import { CircleCheck, Hand } from "lucide-react"
import Link from "next/link"

import { Empty } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { UptimeIncident } from "@/lib/services"
import { cn } from "@/lib/utils"
import { durationText, KindIcon } from "./meta"
import { monitorHref } from "./monitor-menu"
import { useUptimeCan } from "./permissions"
import { useUptimeActions } from "./uptime-actions"

// Incidents as a list: going on first, each with how long it lasted, its
// cause and who's on it. Used by /uptime's Incidents tab and a monitor page.
export function IncidentList({
  phone,
  query,
  empty,
  showMonitor = true,
}: {
  phone: boolean
  query: UseQueryResult<UptimeIncident[]>
  empty: string
  showMonitor?: boolean
}) {
  if (query.isPending) {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 border-border p-4",
          phone ? "border-y" : "rounded-2xl border",
        )}
      >
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
    )
  }
  if (query.isError && !query.data) {
    return (
      <p className="px-4 py-8 text-center text-body-sm text-muted-foreground">
        {query.error.message}
      </p>
    )
  }
  const items = query.data ?? []
  if (items.length === 0) {
    return <Empty icon={CircleCheck} title={empty} body="" />
  }
  return (
    <ul
      className={cn(
        "divide-y divide-border border-border",
        phone ? "border-y" : "rounded-2xl border",
      )}
    >
      {items.map((i) => (
        <IncidentRow key={i.id} i={i} phone={phone} showMonitor={showMonitor} />
      ))}
    </ul>
  )
}

function IncidentRow({
  i,
  phone,
  showMonitor,
}: {
  i: UptimeIncident
  phone: boolean
  showMonitor: boolean
}) {
  const can = useUptimeCan(i.workspace_id)
  const a = useUptimeActions()
  const open = !i.resolved_at
  const started = new Date(i.started_at)
  return (
    <li
      className={cn(
        "flex gap-3 py-3",
        phone ? "px-4" : "items-center px-4",
        phone && "flex-col",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
            open
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
          )}
        >
          <KindIcon kind={i.monitor_kind ?? ""} className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-body-sm">
            {showMonitor && (
              <Link
                href={monitorHref(i.monitor_id)}
                className="font-medium hover:text-brand"
              >
                {i.monitor_name || "Deleted monitor"}
              </Link>
            )}
            <span
              className={cn(
                "font-medium",
                open ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {open
                ? `Down for ${durationText(i.seconds)}`
                : `Down ${durationText(i.seconds)}`}
            </span>
          </p>
          {i.cause && (
            <p className="mt-0.5 line-clamp-2 text-body-sm break-words text-muted-foreground">
              {i.cause}
            </p>
          )}
          <p className="mt-0.5 text-caption text-ash">
            <time dateTime={i.started_at} title={started.toLocaleString()}>
              Started {timeAgo(i.started_at)}
            </time>
            {i.resolved_at && (
              <>
                {" · "}
                <time
                  dateTime={i.resolved_at}
                  title={new Date(i.resolved_at).toLocaleString()}
                >
                  back {timeAgo(i.resolved_at)}
                </time>
              </>
            )}
          </p>
          {i.acknowledged_at && (
            <p className="mt-1 flex items-start gap-1.5 text-caption text-muted-foreground">
              <Hand className="mt-px size-3.5 shrink-0" />
              <span>
                {i.acknowledged_by_name || "Someone"} is on it
                {i.note ? `: ${i.note}` : ""}
              </span>
            </p>
          )}
        </div>
      </div>
      {open && !i.acknowledged_at && can.operate && (
        <Button
          variant="outline"
          className={cn("shrink-0", phone ? "h-11 w-full" : "h-9")}
          onClick={() => a.acknowledge(i)}
        >
          <Hand />
          I'm on it
        </Button>
      )}
    </li>
  )
}
