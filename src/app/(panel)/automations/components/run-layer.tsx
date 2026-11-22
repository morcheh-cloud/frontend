"use client"

import {
  ArrowUpRight,
  ChevronRight,
  Square,
  TriangleAlert,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { useQueryState } from "nuqs"
import { useRef } from "react"

import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { AnsiText } from "@/components/ansi"
import { BottomSheet } from "@/components/bottom-sheet"
import { CodeBlock } from "@/components/code-block"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import type {
  AutomationRun,
  AutomationStep,
  AutomationStepLink,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { runActive, useAutomationRun } from "../api"
import { useAutomationActions } from "./automation-actions"
import {
  automationHref,
  duration,
  runParam,
  StatusBadge,
  StepIcon,
  type StepKind,
  startedText,
  statusMeta,
  stepMeta,
  triggerKindText,
} from "./meta"
import { useAutomationCan } from "./permissions"

// ?run= holds the open run. Opening pushes a history entry, so Back closes
// it; a run opened by a link (the page loaded with it) is closed in place.
export function useRunParam() {
  const [run, setRun] = useQueryState(
    "run",
    runParam.run.withOptions({ history: "push" }),
  )
  const loadedWith = useRef(run)
  const open = (id: string) => setRun(id)
  const close = () => {
    if (run && run !== loadedWith.current) {
      window.history.back()
    } else {
      loadedWith.current = null
      setRun(null, { history: "replace" })
    }
  }
  return { run, open, close }
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  })

// One run: a side sheet on desktop, a full bottom sheet on phones.
export function RunLayer({
  runId,
  onClose,
  phone,
  showAutomation,
}: {
  runId: string | null
  onClose: () => void
  phone: boolean
  // On the workspace's runs page: link to the automation too.
  showAutomation?: boolean
}) {
  const query = useAutomationRun(runId)
  const run = query.data
  const title = run
    ? run.trigger_kind === "test"
      ? `Test run · ${run.automation_name}`
      : run.automation_name || "Run"
    : query.isError
      ? "Run not found"
      : "Run"
  const change = (next: boolean) => {
    if (!next) onClose()
  }
  const body = query.isPending ? (
    <div className="flex flex-col gap-3 py-2">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </div>
  ) : !run ? (
    <p className="py-2 text-body-sm text-muted-foreground">
      {query.error?.message ?? "It was deleted."}
    </p>
  ) : (
    <RunBody run={run} />
  )
  const footer = run && (
    <RunFooter run={run} phone={phone} showAutomation={showAutomation} />
  )

  if (phone) {
    return (
      <BottomSheet
        open={!!runId}
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
    <Sheet open={!!runId} onOpenChange={change}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="truncate text-body">{title}</SheetTitle>
          {run && (
            <SheetDescription className="text-caption text-ash">
              {when(run.created_at)} · {triggerKindText[run.trigger_kind]}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-5">
          {body}
        </div>
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
  phone,
  showAutomation,
}: {
  run: AutomationRun
  phone: boolean
  showAutomation?: boolean
}) {
  const can = useAutomationCan(run.workspace_id)
  const act = useAutomationActions()
  const active = runActive(run.status)
  if (!(active && can.run) && !showAutomation) return null
  return (
    <div className={cn("flex gap-2", phone && "w-full flex-col")}>
      {showAutomation && (
        <Button
          variant="outline"
          className={phone ? "h-11" : "h-9"}
          render={<Link href={automationHref(run.automation_id)} />}
          nativeButton={false}
        >
          <Zap />
          Open the automation
        </Button>
      )}
      {active && can.run && (
        <Button
          variant="outline"
          className={phone ? "h-11" : "h-9"}
          onClick={() => act.cancelRun(run)}
        >
          <Square />
          Stop
        </Button>
      )}
    </div>
  )
}

function RunBody({ run }: { run: AutomationRun }) {
  const can = useAutomationCan(run.workspace_id)
  const active = runActive(run.status)
  const facts: [string, string][] = [
    ["Started by", startedText(run)],
    [
      "Took",
      run.started_at
        ? duration(run.started_at, run.finished_at)
        : active
          ? "Waiting to start"
          : "—",
    ],
    ["When", timeAgo(run.created_at)],
  ]
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <StatusBadge status={run.status} className="text-body" />
        {run.reason && (
          <p
            className={cn(
              "flex gap-2 rounded-lg px-3 py-2.5 text-body-sm",
              run.status === "failed"
                ? "bg-destructive/5 text-destructive"
                : "bg-subtle text-muted-foreground",
            )}
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 break-words">{run.reason}</span>
          </p>
        )}
        <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-subtle p-4 text-body-sm sm:grid-cols-3">
          {facts.map(([label, value], i) => (
            <div
              key={label}
              className={cn("min-w-0", i === 0 && "max-sm:col-span-2")}
            >
              <dt className="text-caption text-ash">{label}</dt>
              <dd className="mt-0.5 truncate font-medium" title={value}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {run.steps.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-body-sm font-medium">Steps</h3>
          <ol className="flex flex-col">
            {run.steps.map((s, i) => (
              <StepRow
                key={s.action_id || s.index}
                s={s}
                last={i === run.steps.length - 1}
                hidden={
                  !can.run && (s.kind === "script" || s.kind === "service")
                }
              />
            ))}
          </ol>
        </section>
      )}

      {/* A run by hand without an event carries a bare "manual" one. */}
      {run.event?.type && run.event.type !== "manual" && (
        <EventBlock run={run} />
      )}
    </div>
  )
}

function EventBlock({ run }: { run: AutomationRun }) {
  const e = run.event
  return (
    <details className="group rounded-2xl border border-border">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-2 text-body-sm outline-none [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 text-ash transition-transform group-open:rotate-90" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">The event</span>
          <span className="block truncate text-caption text-muted-foreground">
            {e.type} · {e.title}
          </span>
        </span>
      </summary>
      <div className="border-t border-border p-3">
        <CodeBlock code={JSON.stringify(e, null, 2)} label="event JSON" />
      </div>
    </details>
  )
}

function linkOf(l: AutomationStepLink) {
  switch (l.kind) {
    case "script-run":
      return { href: `/scripts/runs/${l.id}`, label: "Open the script run" }
    case "schedule-run":
      return {
        href: `/cronjobs/${l.parent_id}?run=${l.id}`,
        label: "Open the cron job's run",
      }
    case "monitor":
      return { href: `/monitoring/${l.id}`, label: "Open the monitor" }
    case "server":
      return { href: `/servers/${l.id}`, label: "Open the server" }
  }
  return null
}

function StepRow({
  s,
  last,
  hidden,
}: {
  s: AutomationStep
  last: boolean
  // Script and service output is kept from people below Operator.
  hidden: boolean
}) {
  const m = statusMeta[s.status] ?? statusMeta.pending
  const link = s.link && linkOf(s.link)
  // A step's output repeats its servers' when it has some: show theirs.
  const perTarget = s.targets.some((t) => t.output)
  const one = s.targets.length === 1
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!last && (
        <span
          aria-hidden
          className="absolute start-4 top-9 bottom-1 w-px bg-border"
        />
      )}
      <span
        className={cn(
          "relative flex size-8 shrink-0 items-center justify-center rounded-lg border",
          s.status === "succeeded" &&
            "border-success/30 bg-success/10 text-success",
          s.status === "failed" &&
            "border-destructive/30 bg-destructive/10 text-destructive",
          s.status === "running" && "border-brand/30 bg-brand-soft text-brand",
          !["succeeded", "failed", "running"].includes(s.status) &&
            "border-border bg-subtle text-ash",
        )}
        title={m.label}
      >
        <StepIcon kind={s.kind} className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-medium">
              {s.label || stepMeta[s.kind as StepKind]?.label}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 text-caption">
              <StatusBadge
                status={s.status}
                className="text-caption font-normal [&_svg]:size-3.5"
              />
              {s.started_at && (
                <span className="text-ash tabular-nums">
                  {duration(s.started_at, s.finished_at)}
                </span>
              )}
            </p>
          </div>
          {link && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 max-md:h-11"
              render={<Link href={link.href} />}
              nativeButton={false}
            >
              <span className="max-sm:sr-only">{link.label}</span>
              <ArrowUpRight />
            </Button>
          )}
        </div>
        {s.error && (
          <p className="text-caption break-words text-destructive">{s.error}</p>
        )}
        {s.output && !perTarget && <Output text={s.output} />}
        {s.targets.length > 0 && (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {s.targets.map((t) => (
              <li key={t.id} className="flex flex-col gap-1.5 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2 text-body-sm">
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {t.name}
                  </span>
                  {t.exit_code != null && (
                    <span className="shrink-0 font-mono text-caption text-ash">
                      exit {t.exit_code}
                    </span>
                  )}
                  <StatusBadge
                    status={t.status}
                    className="shrink-0 text-caption [&_svg]:size-3.5"
                  />
                </div>
                {t.error && (
                  <p className="text-caption break-words text-destructive">
                    {t.error}
                  </p>
                )}
                {t.output ? (
                  one ? (
                    <Output text={t.output} />
                  ) : (
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-1 text-caption text-muted-foreground outline-none [&::-webkit-details-marker]:hidden">
                        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
                        Output
                      </summary>
                      <Output text={t.output} className="mt-1.5" />
                    </details>
                  )
                ) : hidden && !runActive(t.status) ? (
                  <p className="text-caption text-ash">
                    Output is hidden below Operator access.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

function Output({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        "max-h-72 overflow-y-auto rounded-xl bg-[var(--term-background,#1c2024)] p-3 font-mono text-[12px] leading-5 break-all whitespace-pre-wrap text-[var(--term-foreground,#e8e8ec)]",
        className,
      )}
    >
      <AnsiText text={text} />
    </div>
  )
}
