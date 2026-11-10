"use client"

import {
  ArrowUpRight,
  DatabaseBackup,
  FlaskConical,
  Server,
  Square,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { backupsHref } from "@/app/(panel)/databases/[id]/components/backups/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type {
  ScheduleRun,
  ScheduleRunDest,
  ScheduleRunLink,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { runActive, useCronjobRun } from "../api"
import { useCronjobActions } from "./cronjob-actions"
import {
  actionMeta,
  duration,
  EndLabel,
  endName,
  formatInZone,
  modeMeta,
  RunStateBadge,
  usesDestinations,
} from "./meta"
import { useCronjobCan } from "./permissions"

// One run of a cron job: a side sheet on desktop, a full bottom sheet on
// phones. Open while `runId` is set; the page keeps it in ?run=.
export function RunLayer({
  runId,
  onClose,
  phone,
  timezone,
  workspaceId,
}: {
  runId: string | null
  onClose: () => void
  phone: boolean
  timezone: string
  workspaceId: string
}) {
  const query = useCronjobRun(runId)
  const run = query.data
  const title = run
    ? run.dry_run
      ? "Test run"
      : `Run · ${actionMeta[run.action]?.label ?? "Cron job"}`
    : query.isError
      ? "Run not found"
      : "Run"
  const open = !!runId
  const change = (next: boolean) => {
    if (!next) onClose()
  }

  const body = query.isPending ? (
    <div className="flex flex-col gap-3 py-2">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  ) : !run ? (
    <p className="py-2 text-body-sm text-muted-foreground">
      {query.error?.message ?? "It was deleted."}
    </p>
  ) : (
    <RunBody run={run} timezone={timezone} />
  )
  const footer = run && (
    <RunFooter
      run={run}
      workspaceId={workspaceId}
      phone={phone}
      after={onClose}
    />
  )

  if (phone) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={change}
        title={title}
        full
        footer={footer || undefined}
      >
        <div className="px-2">{body}</div>
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={change}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          {run && (
            <SheetDescription className="text-caption text-ash">
              {formatInZone(run.started_at ?? run.created_at, timezone)} ·{" "}
              {timezone}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{body}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border px-6 py-3">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function RunFooter({
  run,
  workspaceId,
  phone,
  after,
}: {
  run: ScheduleRun
  workspaceId: string
  phone: boolean
  after: () => void
}) {
  const can = useCronjobCan(workspaceId)
  const a = useCronjobActions()
  const active = runActive(run.state)
  if (active && can.run) {
    return (
      <Button
        variant="outline"
        className={cn(phone ? "h-11 w-full" : "h-9")}
        disabled={run.progress?.locked}
        onClick={() => a.cancelRun(run)}
      >
        <Square />
        Stop
      </Button>
    )
  }
  if (!active && can.edit) {
    return (
      <Button
        variant="outline"
        className={cn(
          "text-destructive hover:text-destructive",
          phone ? "h-11 w-full" : "h-9",
        )}
        onClick={() => a.removeRun(run, after)}
      >
        <Trash2 />
        Delete from history
      </Button>
    )
  }
  return null
}

const triggerText = (r: ScheduleRun) =>
  r.trigger === "schedule"
    ? "On time"
    : r.created_by_name
      ? `Run now by ${r.created_by_name}`
      : "Run now"

function RunBody({ run, timezone }: { run: ScheduleRun; timezone: string }) {
  const active = runActive(run.state)
  const p = run.progress
  const files = usesDestinations(run.action)
  const sync = run.action === "sync"
  const link = run.link && linkOf(run.link)
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <RunStateBadge state={run.state} className="text-body font-medium" />
        {run.dry_run && (
          <span className="inline-flex items-center gap-1 text-caption text-muted-foreground">
            <FlaskConical className="size-3.5" />
            Test: nothing was changed
          </span>
        )}
      </div>

      {run.error && (
        <p className="rounded-lg bg-destructive/5 px-3 py-2.5 text-body-sm break-words text-destructive">
          {run.error}
        </p>
      )}

      {active && p && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border p-4">
          <div className="flex items-baseline justify-between gap-3 text-body-sm">
            <span className="font-medium">{p.phase || "Working"}</span>
            {p.rate > 0 && (
              <span className="text-caption text-ash tabular-nums">
                {formatSize(p.rate)}/s
              </span>
            )}
          </div>
          <Bar done={p.total ? p.done / p.total : null} />
          {files ? (
            <p className="text-caption text-muted-foreground tabular-nums">
              {p.items_total
                ? `${p.items} of ${p.items_total} files`
                : `${p.items} files`}
              {p.done > 0 &&
                ` · ${formatSize(p.done)}${p.total ? ` of ${formatSize(p.total)}` : ""}`}
            </p>
          ) : (
            p.items_total > 0 && (
              <p className="text-caption text-muted-foreground tabular-nums">
                {p.items} of {p.items_total}
              </p>
            )
          )}
          {p.current && (
            <p className="truncate font-mono text-caption text-ash">
              {p.current}
            </p>
          )}
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body-sm">
        <Fact label="Started">
          {run.started_at ? formatInZone(run.started_at, timezone) : "Waiting"}
        </Fact>
        <Fact label="Took">
          {run.started_at ? duration(run.started_at, run.finished_at) : "—"}
          {active && run.started_at && " so far"}
        </Fact>
        <Fact label="Started by">{triggerText(run)}</Fact>
        {sync && <Fact label="Mode">{modeMeta[run.options.mode]?.short}</Fact>}
        {run.source && (
          <Fact label={sync ? "From" : "Folder"} wide>
            <EndLabel end={run.source} />
          </Fact>
        )}
        {!!run.options.excludes?.length && (
          <Fact label="Left out" wide>
            <span className="font-mono text-caption">
              {run.options.excludes.join("  ")}
            </span>
          </Fact>
        )}
      </dl>

      {link && (
        <Link
          href={link.href}
          className="flex min-h-12 items-center gap-3 rounded-2xl border border-border px-4 py-3 text-body-sm outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{link.label}</span>
            <span className="block text-caption text-muted-foreground">
              {link.hint}
            </span>
          </span>
          <ArrowUpRight className="size-4 shrink-0 text-ash" />
        </Link>
      )}

      {run.results.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-body-sm font-medium">
            {resultsTitle(run.action, run.results.length)}
          </h3>
          <ul className="flex flex-col gap-2">
            {run.results.map((d, i) => (
              <li key={`${d.server_id ?? d.storage_id ?? i}:${d.path}`}>
                {sync ? (
                  <DestResult d={d} dryRun={run.dry_run} />
                ) : (
                  <ResultRow d={d} kind={files ? "end" : run.action} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function resultsTitle(action: ScheduleRun["action"], n: number) {
  const one = n === 1
  switch (action) {
    case "sync":
    case "archive":
    case "fetch":
      return one ? "Destination" : `${n} destinations`
    case "verify-backup":
      return one ? "Backup checked" : `${n} backups checked`
    default:
      return one ? "Server" : `${n} servers`
  }
}

// Where a run's own record lives: the script or Ansible run it started, or
// the database's backups.
function linkOf(link: ScheduleRunLink) {
  switch (link.kind) {
    case "script-run":
      return {
        href: `/scripts/runs/${link.id}`,
        label: "Open the script run",
        hint: "Each server's output and exit code.",
      }
    case "ansible-run":
      return {
        href: `/ansible/runs/${link.id}`,
        label: "Open the Ansible run",
        hint: "Tasks, output and the recap per server.",
      }
    case "software-run":
      return {
        href: `/applications/runs/${link.id}`,
        label: "Open the applications run",
        hint: "Each server's steps, output and versions.",
      }
    case "database":
      return {
        href: backupsHref(link.id, "backups"),
        label: "Open the database's backups",
        hint: "Every backup and when it was last checked.",
      }
  }
  return null
}

// One server, folder or backup of a run that isn't a sync: what happened.
function ResultRow({
  d,
  kind,
}: {
  d: ScheduleRunDest
  kind: "end" | ScheduleRun["action"]
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        {kind === "end" ? (
          <EndLabel end={d} className="text-body-sm" />
        ) : (
          <span className="flex min-w-0 items-center gap-1.5 text-body-sm">
            {kind === "verify-backup" ? (
              <DatabaseBackup className="size-3.5 shrink-0 text-ash" />
            ) : (
              <Server className="size-3.5 shrink-0 text-ash" />
            )}
            <span
              className={cn(
                "truncate font-medium",
                d.missing && "text-destructive",
              )}
            >
              {kind === "verify-backup" ? d.name : endName(d)}
            </span>
          </span>
        )}
        <RunStateBadge state={d.state} />
      </div>
      {d.note && (
        <p className="text-caption break-words text-muted-foreground">
          {d.note}
        </p>
      )}
      {d.error && (
        <p className="text-caption break-words text-destructive">{d.error}</p>
      )}
    </div>
  )
}

function DestResult({ d, dryRun }: { d: ScheduleRunDest; dryRun: boolean }) {
  const counts: [string, number, string?][] = [
    [dryRun ? "Would copy" : "Copied", d.copied, formatSize(d.bytes)],
    ["Up to date", d.skipped],
    [dryRun ? "Would delete" : "Deleted", d.deleted],
    ["Couldn't copy", d.failed],
  ]
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <EndLabel end={d} className="text-body-sm" />
        <RunStateBadge state={d.state} />
      </div>
      {d.folder && (
        <p className="text-caption text-muted-foreground">
          Into{" "}
          <span className="font-mono break-all text-foreground">
            {d.folder}
          </span>
        </p>
      )}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {counts.map(([label, n, extra]) => (
          <div key={label} className="min-w-0">
            <dt className="text-caption text-ash">{label}</dt>
            <dd
              className={cn(
                "text-body-sm font-medium tabular-nums",
                label === "Couldn't copy" && n > 0 && "text-destructive",
              )}
            >
              {n.toLocaleString()}
              {extra && n > 0 && (
                <span className="ms-1 text-caption font-normal text-muted-foreground">
                  {extra}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {d.error && (
        <p className="text-caption break-words text-destructive">{d.error}</p>
      )}
      {!!d.problems?.length && (
        <details className="text-caption">
          <summary className="cursor-pointer py-1 text-muted-foreground">
            {d.problems.length === 1
              ? "1 problem"
              : `${d.problems.length} problems`}
          </summary>
          <ul className="mt-1 flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg bg-subtle p-2 font-mono break-all">
            {d.problems.map((p, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: the same message can repeat
              <li key={i}>{p}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function Fact({
  label,
  wide,
  children,
}: {
  label: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2")}>
      <dt className="text-caption text-ash">{label}</dt>
      <dd className="mt-0.5 min-w-0">{children}</dd>
    </div>
  )
}

// A progress bar; null = not known yet (pulses).
export function Bar({ done }: { done: number | null }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={done === null ? undefined : Math.round(done * 100)}
      className="h-1.5 overflow-hidden rounded-full bg-muted"
    >
      <div
        className={cn(
          "h-full rounded-full bg-brand transition-[width]",
          done === null && "w-1/3 animate-pulse",
        )}
        style={done === null ? undefined : { width: `${done * 100}%` }}
      />
    </div>
  )
}
