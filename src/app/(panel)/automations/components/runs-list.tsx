"use client"

import { ChevronRight, ListX } from "lucide-react"
import type { ReactNode } from "react"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { AutomationRun } from "@/lib/services"
import { cn } from "@/lib/utils"
import { type RunStatus, useAutomationRuns } from "../api"
import {
  duration,
  StatusBadge,
  StepIcon,
  startedText,
  statusMeta,
} from "./meta"

export const RUNS_PAGE = 25

type Show = "all" | "failed" | "succeeded" | "skipped" | "running"
const shows: { value: Show; label: string }[] = [
  { value: "all", label: "All" },
  { value: "failed", label: "Failed" },
  { value: "succeeded", label: "Worked" },
  { value: "skipped", label: "Skipped" },
  { value: "running", label: "Running" },
]

export function StatusFilter({
  value,
  onChange,
}: {
  value: RunStatus | null
  onChange: (v: RunStatus | null) => void
}) {
  const v: Show =
    value && shows.some((s) => s.value === value) ? (value as Show) : "all"
  return (
    <Segmented
      label="Show"
      items={shows}
      value={v}
      onChange={(s) => onChange(s === "all" ? null : s)}
    />
  )
}

// A page of runs: one automation's, or the workspace's (with their names).
export function RunsList({
  ws,
  automation,
  status,
  page,
  setPage,
  onOpen,
  phone,
  showAutomation,
  empty,
}: {
  ws: string | undefined
  automation?: string
  status: RunStatus | null
  page: number
  setPage: (page: number) => void
  onOpen: (id: string) => void
  phone: boolean
  showAutomation?: boolean
  empty: ReactNode
}) {
  const runs = useAutomationRuns(ws, {
    automation,
    status: status ?? undefined,
    limit: RUNS_PAGE,
    offset: (page - 1) * RUNS_PAGE,
  })
  const items = runs.data?.items ?? []
  const total = runs.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / RUNS_PAGE))

  let body: ReactNode
  if (runs.isPending) {
    body = (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-5 w-3/5" />
      </div>
    )
  } else if (runs.isError && !runs.data) {
    body = (
      <p className="px-4 py-8 text-center text-body-sm text-muted-foreground">
        {runs.error.message}
      </p>
    )
  } else if (items.length === 0) {
    body = status ? (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-body-sm text-muted-foreground">
        <ListX className="size-5 text-ash" />
        No runs like that.
      </div>
    ) : (
      empty
    )
  } else if (phone) {
    body = (
      <ul className="divide-y divide-border">
        {items.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onOpen(r.id)}
              className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start active:bg-muted"
            >
              <StatusDot status={r.status} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm font-medium">
                  {showAutomation ? r.automation_name : startedText(r)}
                </span>
                <span className="block truncate text-caption text-muted-foreground">
                  {statusMeta[r.status]?.label} · {timeAgo(r.created_at)}
                  {showAutomation && ` · ${startedText(r)}`}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ash" />
            </button>
          </li>
        ))}
      </ul>
    )
  } else {
    body = (
      <div className="@container">
        <table className="w-full table-fixed text-body-sm">
          <thead>
            <tr className="border-b border-border text-caption text-ash">
              <th className="w-44 px-5 py-2 text-start font-normal">When</th>
              {showAutomation && (
                <th className="px-3 py-2 text-start font-normal">Automation</th>
              )}
              <th className="w-32 px-3 py-2 text-start font-normal">Result</th>
              <th className="px-3 py-2 text-start font-normal">Started by</th>
              <th className="hidden w-40 px-3 py-2 text-start font-normal @2xl:table-cell">
                Steps
              </th>
              <th className="w-24 px-5 py-2 text-end font-normal">Took</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((r) => (
              <Row
                key={r.id}
                r={r}
                onOpen={onOpen}
                showAutomation={showAutomation}
              />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <>
      {body}
      {pages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-caption text-muted-foreground md:px-5">
          <span className="tabular-nums">
            {(page - 1) * RUNS_PAGE + 1}–{Math.min(total, page * RUNS_PAGE)} of{" "}
            {total.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-11"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Newer
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-11"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Older
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

function StatusDot({ status }: { status: string }) {
  const m = statusMeta[status] ?? statusMeta.queued
  const Icon = m.icon
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg bg-subtle",
        m.tone,
      )}
    >
      <Icon className={cn("size-4", status === "running" && "animate-spin")} />
    </span>
  )
}

function Row({
  r,
  onOpen,
  showAutomation,
}: {
  r: AutomationRun
  onOpen: (id: string) => void
  showAutomation?: boolean
}) {
  return (
    <tr onClick={() => onOpen(r.id)} className="cursor-pointer hover:bg-subtle">
      <td className="px-5 py-2.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onOpen(r.id)
          }}
          className="block w-full truncate text-start outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          title={new Date(r.created_at).toLocaleString()}
        >
          {timeAgo(r.created_at)}
        </button>
      </td>
      {showAutomation && (
        <td className="truncate px-3 py-2.5 font-medium">
          {r.automation_name}
        </td>
      )}
      <td className="px-3 py-2.5">
        <StatusBadge status={r.status} />
      </td>
      <td className="px-3 py-2.5">
        <span className="block truncate text-muted-foreground">
          {startedText(r)}
        </span>
        {r.reason && r.status !== "succeeded" && (
          <span
            className="block truncate text-caption text-ash"
            title={r.reason}
          >
            {r.reason}
          </span>
        )}
      </td>
      <td className="hidden px-3 py-2.5 @2xl:table-cell">
        <span className="flex items-center gap-1">
          {r.steps.slice(0, 8).map((s) => (
            <span
              key={s.action_id || s.index}
              title={`${s.label}: ${statusMeta[s.status]?.label ?? s.status}`}
              className={cn(
                "flex size-6 items-center justify-center rounded-md",
                s.status === "succeeded" && "bg-success/10 text-success",
                s.status === "failed" && "bg-destructive/10 text-destructive",
                s.status === "running" && "bg-brand-soft text-brand",
                !["succeeded", "failed", "running"].includes(s.status) &&
                  "bg-muted text-ash",
              )}
            >
              <StepIcon kind={s.kind} className="size-3.5" />
            </span>
          ))}
        </span>
      </td>
      <td className="px-5 py-2.5 text-end whitespace-nowrap text-muted-foreground tabular-nums">
        {r.started_at ? duration(r.started_at, r.finished_at) : "—"}
      </td>
    </tr>
  )
}
