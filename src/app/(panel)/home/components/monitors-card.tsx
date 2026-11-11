"use client"

import { HeartPulse } from "lucide-react"
import Link from "next/link"
import {
  BeatBar,
  byState,
  stateMeta,
  stateOf,
  uptimeText,
} from "@/app/(panel)/uptime/components/meta"
import { monitorHref } from "@/app/(panel)/uptime/components/monitor-menu"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { HomeLive } from "../live"
import { Blank, Card, CardLink } from "./card"

// Websites and services watched by Uptime, worst first, with their last
// checks as bars.
export function MonitorsCard({
  live,
  className,
}: {
  live: HomeLive
  className?: string
}) {
  const all = [...(live.monitors ?? [])].sort(byState)
  const up = all.filter((m) => stateOf(m) === "up").length
  return (
    <Card
      title="Uptime"
      caption={all.length ? `${up} of ${all.length} up` : undefined}
      className={className}
      action={<CardLink href="/uptime">View all</CardLink>}
    >
      {live.monitorsPending ? (
        <div className="flex flex-col gap-3 p-5">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      ) : all.length === 0 ? (
        <Blank
          icon={<HeartPulse className="size-5" strokeWidth={1.75} />}
          text="Watch a website, port or service and hear about it when it goes down."
          action={
            <Link
              href="/uptime/new"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              New monitor
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col py-1.5">
          {all.slice(0, 6).map((m) => {
            const state = stateMeta[stateOf(m)]
            return (
              <li key={m.id}>
                <Link
                  href={monitorHref(m.id)}
                  className="flex items-center gap-3 px-5 py-2 outline-none hover:bg-subtle focus-visible:bg-muted"
                >
                  <span
                    aria-hidden
                    className={cn("size-2 shrink-0 rounded-full", state.dot)}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body-sm font-medium">
                      {m.name}
                    </span>
                    <span className={cn("truncate text-caption", state.text)}>
                      {state.label}
                      {m.last_latency_ms != null && stateOf(m) !== "paused" && (
                        <span className="text-ash">
                          {" "}
                          · {m.last_latency_ms} ms
                        </span>
                      )}
                    </span>
                  </span>
                  <BeatBar
                    beats={m.recent}
                    size={16}
                    className="h-5 shrink-0 max-xl:hidden"
                  />
                  <span className="w-14 shrink-0 text-end text-caption text-muted-foreground tabular-nums">
                    {uptimeText(m.uptime_24h)}
                  </span>
                </Link>
              </li>
            )
          })}
          {all.length > 6 && (
            <li className="px-5 pt-1 pb-2 text-caption text-ash">
              And {all.length - 6} more
            </li>
          )}
        </ul>
      )}
    </Card>
  )
}
