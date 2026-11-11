"use client"

import Link from "next/link"

import {
  count,
  errorTone,
  rate,
  Sparkline,
} from "@/app/(panel)/proxy/components/live"
import { hostHref } from "@/app/(panel)/proxy/components/meta"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { HomeLive } from "../live"
import { Card, CardLink } from "./card"

// Requests through the reverse proxies over the last 30 minutes.
export function TrafficCard({
  live,
  className,
}: {
  live: HomeLive
  className?: string
}) {
  const t = live.traffic
  const tone = t ? errorTone(t.errors, t.total) : "muted"
  const top = live.trafficSites
  const most = top[0]?.requests ?? 1
  return (
    <Card
      title="Web traffic"
      caption="Last 30 min"
      className={className}
      action={<CardLink href="/proxy">Sites</CardLink>}
    >
      {!t ? (
        <div className="flex flex-col gap-3 p-5">
          <Skeleton className="h-12" />
          <Skeleton className="h-6" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-end gap-4">
            <div className="flex flex-col">
              <span className="text-heading leading-none font-light tabular-nums">
                {count(t.now)}
              </span>
              <span className="mt-1 text-caption text-ash">requests / min</span>
            </div>
            <Sparkline
              values={t.requests}
              tone={tone === "destructive" ? "destructive" : "brand"}
              className="h-12 min-w-0 flex-1"
            />
          </div>
          <dl className="grid grid-cols-3 gap-2 text-caption">
            <Fact label="Requests" value={count(t.total)} />
            <Fact
              label="Server errors"
              value={rate(t.errors, t.total)}
              className={cn(
                tone === "destructive" && "text-destructive",
                tone === "warning" && "text-warning",
              )}
            />
            <Fact label="Sent" value={formatSize(t.bytes)} />
          </dl>
          {top.length > 0 && (
            <ul className="flex flex-col gap-1 border-t border-border pt-3">
              {top.map((s) => (
                <li key={s.id}>
                  <Link
                    href={hostHref(s.proxyId, s.id)}
                    className="-mx-2 flex flex-col gap-1 rounded-lg px-2 py-1.5 outline-none hover:bg-subtle focus-visible:bg-muted"
                  >
                    <span className="flex items-baseline gap-2 text-body-sm">
                      <span className="min-w-0 flex-1 truncate">{s.name}</span>
                      {s.errors > 0 && (
                        <span className="text-caption text-destructive tabular-nums">
                          {count(s.errors)} 5xx
                        </span>
                      )}
                      <span className="text-caption text-muted-foreground tabular-nums">
                        {count(s.requests)}
                      </span>
                    </span>
                    <span className="h-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{ width: `${(100 * s.requests) / most}%` }}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}

function Fact({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="flex flex-col rounded-lg bg-subtle px-3 py-2">
      <dt className="text-ash">{label}</dt>
      <dd
        className={cn(
          "text-body-sm font-medium text-foreground tabular-nums",
          className,
        )}
      >
        {value}
      </dd>
    </div>
  )
}
