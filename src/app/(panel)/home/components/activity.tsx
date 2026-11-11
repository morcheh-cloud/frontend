"use client"

import {
  Bell,
  BellOff,
  CircleCheck,
  CircleX,
  HeartPulse,
  History,
  ListChecks,
  type LucideIcon,
  Server,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { statusMeta, timeAgo } from "@/app/(panel)/servers/components/meta"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { monitorHref } from "@/app/(panel)/uptime/components/monitor-menu"
import { isActive, useJobList } from "@/components/jobs/api"
import { doneTitle, placeHref } from "@/components/jobs/meta"
import { Button } from "@/components/ui/button"
import { formatDuration } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { HomeLive } from "../live"
import { Blank, Card, type Tone, toneTile } from "./card"

// One timeline of what happened lately across the workspace: servers going
// down and coming back, alerts firing and clearing, monitors' incidents and
// finished background tasks. Newest first.

export type ActivityItem = {
  key: string
  at: string
  icon: LucideIcon
  tone: Tone
  title: string
  detail: string
  href: string
  problem: boolean
}

type ServerStatus = keyof typeof statusMeta

// formatDuration says "Just now" under a minute; here it's a length.
const lasted = (s: number) =>
  s < 60 ? `${Math.max(1, Math.round(s))}s` : formatDuration(s)

export function useActivity(live: HomeLive): ActivityItem[] {
  const jobs = useJobList()
  const names = new Map((live.model?.servers ?? []).map((s) => [s.id, s.name]))
  const items: ActivityItem[] = []

  for (const e of live.serverEvents) {
    const name = names.get(e.server_id) ?? "A server"
    const back = e.status === "online"
    const meta = statusMeta[e.status as ServerStatus]
    items.push({
      key: `srv:${e.server_id}:${e.at}`,
      at: e.at,
      icon: Server,
      tone: back
        ? "success"
        : e.status === "unknown"
          ? "muted"
          : e.status === "unreachable" || e.status === "error"
            ? "destructive"
            : "warning",
      title: back
        ? `${name} is back online`
        : `${name}: ${meta?.label ?? e.status}`,
      detail: e.message,
      href: `/servers/${e.server_id}`,
      problem: !back,
    })
  }

  for (const e of live.alertEvents) {
    const fired = e.kind === "fired"
    const who = e.server_name || "the workspace"
    items.push({
      key: `alert:${e.id}`,
      at: e.at,
      icon: e.muted ? BellOff : Bell,
      tone: fired
        ? e.severity === "critical"
          ? "destructive"
          : "warning"
        : "success",
      title: fired
        ? `${e.rule_name} on ${who}`
        : `${e.rule_name} cleared on ${who}`,
      detail: fired
        ? [e.detail, e.muted && "muted"].filter(Boolean).join(" · ")
        : e.lasted_secs
          ? `Lasted ${lasted(e.lasted_secs)}`
          : "",
      href: e.server_id
        ? `/servers/${e.server_id}/metrics`
        : e.database_id
          ? `/databases/${e.database_id}?tab=alerts`
          : "/alerts?tab=activity",
      problem: fired,
    })
  }

  for (const i of live.incidents) {
    const name = i.monitor_name || "A monitor"
    items.push({
      key: `inc:${i.id}`,
      at: i.started_at,
      icon: HeartPulse,
      tone: "destructive",
      title: `${name} went down`,
      detail: i.cause,
      href: monitorHref(i.monitor_id),
      problem: true,
    })
    if (i.resolved_at) {
      items.push({
        key: `inc:${i.id}:end`,
        at: i.resolved_at,
        icon: HeartPulse,
        tone: "success",
        title: `${name} is back up`,
        detail: `Down for ${lasted(i.seconds)}`,
        href: monitorHref(i.monitor_id),
        problem: false,
      })
    }
  }

  for (const j of jobs.data ?? []) {
    if (isActive(j) || !j.finished_at) continue
    const failed = j.state === "failed" || j.state === "interrupted"
    items.push({
      key: `job:${j.id}`,
      at: j.finished_at,
      icon: failed ? CircleX : j.state === "canceled" ? ListChecks : CircleCheck,
      tone: failed ? "destructive" : "muted",
      title: failed
        ? `Failed: ${j.title}`
        : j.state === "canceled"
          ? `Canceled: ${j.title}`
          : doneTitle(j.title),
      detail: failed ? (j.error ?? "") : "",
      href: placeHref(j) ?? "/tasks",
      problem: failed,
    })
  }

  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 60)
}

const filters = [
  { value: "all", label: "All" },
  { value: "problems", label: "Problems" },
] as const

export function ActivityCard({
  live,
  className,
}: {
  live: HomeLive
  className?: string
}) {
  const all = useActivity(live)
  const [show, setShow] = useState<"all" | "problems">("all")
  const [limit, setLimit] = useState(8)
  const list = show === "all" ? all : all.filter((i) => i.problem)
  return (
    <Card
      title="Activity"
      className={className}
      action={
        <Segmented
          label="Show"
          items={filters}
          value={show}
          onChange={(v) => {
            setShow(v)
            setLimit(8)
          }}
        />
      }
    >
      {list.length === 0 ? (
        <Blank
          icon={<History className="size-5" strokeWidth={1.75} />}
          text={
            show === "problems"
              ? "No problems lately."
              : "Status changes, alerts, incidents and finished tasks show here."
          }
        />
      ) : (
        <>
          <ol className="flex flex-col py-2">
            {list.slice(0, limit).map((item, i, shown) => (
              <li key={item.key}>
                <ActivityRow item={item} last={i === shown.length - 1} />
              </li>
            ))}
          </ol>
          {list.length > limit && limit < 30 && (
            <div className="border-t border-border px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setLimit((n) => n + 10)}
              >
                Show more
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

// A timeline row: the icon tile sits on a thin line joining the events.
function ActivityRow({ item, last }: { item: ActivityItem; last: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className="group relative flex gap-3 px-5 py-2 outline-none hover:bg-subtle focus-visible:bg-muted"
    >
      {!last && (
        <span
          aria-hidden
          className="absolute start-[calc(1.25rem+0.9375rem)] top-10 bottom-0 w-px bg-border"
        />
      )}
      <span
        className={cn(
          "relative flex size-8 shrink-0 items-center justify-center rounded-lg",
          toneTile[item.tone],
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col pt-0.5">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
            {item.title}
          </span>
          <time
            dateTime={item.at}
            title={new Date(item.at).toLocaleString()}
            className="shrink-0 text-caption text-ash"
          >
            {timeAgo(item.at)}
          </time>
        </span>
        {item.detail && (
          <span className="line-clamp-2 text-caption text-muted-foreground">
            {item.detail}
          </span>
        )}
      </span>
    </Link>
  )
}
