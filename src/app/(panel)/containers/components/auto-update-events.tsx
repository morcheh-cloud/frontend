"use client"

import { ArrowRight, History, Loader2 } from "lucide-react"
import Link from "next/link"
import { useQueryStates } from "nuqs"
import { Fragment } from "react"

import { useJobActions } from "@/components/jobs/jobs-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { DockerAutoUpdate, DockerAutoUpdateEvent } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Empty } from "../../servers/[id]/components/parts"
import { useAutoUpdateEvents } from "../api"
import { activityParsers, resultMeta, results } from "./auto-update-meta"
import { ChoiceChip, NoMatch } from "./kit"
import { containerHref, Dot, imageName } from "./meta"

// The filters of an activity list, as chips for a page's toolbar. The
// policy chip is left out on a policy's own page.
export function ActivityFilters({
  phone,
  policies,
  fixedPolicy,
}: {
  phone: boolean
  policies: DockerAutoUpdate[]
  fixedPolicy?: string
}) {
  const [f, setF] = useQueryStates(activityParsers, { history: "replace" })
  const servers = new Map<string, string>()
  for (const p of policies) {
    if (fixedPolicy && p.id !== fixedPolicy) continue
    for (const s of p.servers) servers.set(s.id, s.name)
  }
  return (
    <>
      {!fixedPolicy && policies.length > 1 && (
        <ChoiceChip
          phone={phone}
          label="Policy"
          value={f.policy}
          onChange={(policy) => setF({ policy: policy || null })}
          options={[
            { value: "", label: "All" },
            ...policies.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      )}
      {servers.size > 1 && (
        <ChoiceChip
          phone={phone}
          label="Server"
          value={f.server}
          onChange={(server) => setF({ server: server || null })}
          options={[
            { value: "", label: "All" },
            ...[...servers].map(([value, label]) => ({ value, label })),
          ]}
        />
      )}
      <ChoiceChip
        phone={phone}
        label="Result"
        value={f.result ?? ""}
        onChange={(r) =>
          setF({
            result: (r || null) as DockerAutoUpdateEvent["result"] | null,
          })
        }
        options={[
          { value: "", label: "Any" },
          ...results.map((r) => ({ value: r, label: resultMeta[r].label })),
        ]}
      />
    </>
  )
}

// What auto-update did, newest first, by day: updated, found, rolled back,
// failed. Filters come from the URL (see ActivityFilters).
export function AutoUpdateEvents({
  ws,
  phone,
  fixedPolicy,
  limit,
  showPolicy = !fixedPolicy,
}: {
  ws: string
  phone: boolean
  fixedPolicy?: string
  // A short glance (the policy overview): no paging, no filters.
  limit?: number
  showPolicy?: boolean
}) {
  const [f, setF] = useQueryStates(activityParsers, { history: "replace" })
  const filtered =
    !limit && (!!f.server || !!f.result || (!fixedPolicy && !!f.policy))
  const query = useAutoUpdateEvents(ws, {
    policy: fixedPolicy ?? (f.policy || undefined),
    server: limit ? undefined : f.server || undefined,
    result: limit ? undefined : (f.result ?? undefined),
  })
  const items = (query.data?.pages ?? []).flatMap((p) => p.items)
  const shown = limit ? items.slice(0, limit) : items

  if (query.isPending) {
    return <Skeleton className="h-48 rounded-2xl max-md:mx-4" />
  }
  if (query.isError) {
    return (
      <Empty
        icon={History}
        title="Couldn't read the activity"
        body={query.error.message}
        className="max-md:mt-4"
      />
    )
  }
  if (shown.length === 0) {
    if (filtered) {
      return (
        <NoMatch
          onReset={() => setF({ policy: null, server: null, result: null })}
          text="Nothing like that happened yet. Try another filter."
        />
      )
    }
    return (
      <Empty
        icon={History}
        title="Nothing happened yet"
        body="Every container a run updates, finds a new image for, rolls back or fails on shows up here, kept for 180 days."
        className={cn(limit ? "py-10" : "max-md:mt-4")}
      />
    )
  }

  const days: { day: string; items: DockerAutoUpdateEvent[] }[] = []
  for (const e of shown) {
    const day = dayLabel(e.at)
    const last = days.at(-1)
    if (last?.day === day) last.items.push(e)
    else days.push({ day, items: [e] })
  }

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "flex flex-col",
          !phone && "overflow-hidden rounded-2xl border border-border",
        )}
      >
        {days.map((d) => (
          <Fragment key={d.day}>
            <h3
              className={cn(
                "bg-subtle px-4 py-1.5 font-label text-[11px] tracking-label text-muted-foreground uppercase",
                !phone && "border-b border-border not-first:border-t",
                phone &&
                  "sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-[1]",
              )}
            >
              {d.day}
            </h3>
            <ul className="divide-y divide-border">
              {d.items.map((e) => (
                <EventRow
                  key={e.id}
                  e={e}
                  phone={phone}
                  showPolicy={showPolicy}
                />
              ))}
            </ul>
          </Fragment>
        ))}
      </div>
      {!limit && query.hasNextPage && (
        <Button
          variant="outline"
          className="mt-4 h-11 self-center md:h-9"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {query.isFetchingNextPage && <Loader2 className="animate-spin" />}
          Load older
        </Button>
      )}
    </div>
  )
}

function EventRow({
  e,
  phone,
  showPolicy,
}: {
  e: DockerAutoUpdateEvent
  phone: boolean
  showPolicy: boolean
}) {
  const jobs = useJobActions()
  const meta = resultMeta[e.result]
  const time = new Date(e.at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
  return (
    <li className="flex gap-3 px-4 py-3">
      <Dot tone={meta.tone} className="mt-2" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Link
            href={containerHref(e.server_id, e.container)}
            className="truncate text-body-sm font-medium hover:underline"
          >
            {e.container}
          </Link>
          <span className="text-caption text-muted-foreground">
            {meta.label}
          </span>
          {(e.old_image || e.new_image) && (
            <span className="inline-flex items-center gap-1 font-mono text-caption text-ash">
              {e.old_image && <span>{e.old_image}</span>}
              {e.old_image && e.new_image && <ArrowRight className="size-3" />}
              {e.new_image && <span>{e.new_image}</span>}
            </span>
          )}
        </div>
        <p className="truncate font-mono text-caption text-muted-foreground">
          {imageName(e.image)}
        </p>
        {e.message && (
          <p
            className={cn(
              "mt-0.5 text-caption break-words",
              e.result === "failed" || e.result === "rolled_back"
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            {e.message}
          </p>
        )}
        <p className="mt-0.5 text-caption text-ash">
          {time} · {e.server_name}
          {showPolicy && <> · {e.policy_name}</>}
        </p>
      </div>
      {e.job_id && (
        <Button
          variant="ghost"
          size={phone ? "sm" : "xs"}
          className="shrink-0 self-center text-muted-foreground"
          onClick={() => e.job_id && jobs.show(e.job_id)}
        >
          Task
        </Button>
      )}
    </li>
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
    ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  })
}
