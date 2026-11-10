"use client"

import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Download,
  Ellipsis,
  History,
  Square,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useLayoutEffect, useRef, useState } from "react"

import { AnsiText, stripAnsi } from "@/app/(panel)/ansible/components/ansi"
import { duration, RunStateBadge } from "@/app/(panel)/ansible/components/meta"
import { Callout } from "@/app/(panel)/ansible/components/run-layer"
import {
  Empty,
  type Item,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useNow } from "@/hooks/useNow"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type { SoftwareRunDetail, SoftwareRunTarget } from "@/lib/services"
import { cn } from "@/lib/utils"
import { runFinished, useSoftwareRun } from "../api"
import { runTitle } from "./activity"
import { applicationsHref } from "./meta"
import { useSoftwareCan } from "./permissions"
import { useSoftwareActions } from "./software-actions"

const ACTIVITY = applicationsHref("/applications", { tab: "activity" })

export function SoftwareRunFromRoute() {
  const { id } = useParams<{ id: string }>()
  const phone = useIsPhone()
  if (phone === null) return null
  return <RunPage key={id} id={id} phone={phone} />
}

function RunPage({ id, phone }: { id: string; phone: boolean }) {
  const query = useSoftwareRun(id)
  const run = query.data
  usePageCrumbs([
    { href: ACTIVITY, label: "Activity" },
    { href: `/applications/runs/${id}`, label: run ? runTitle(run) : "Run" },
  ])
  if (query.isPending) return <Loading phone={phone} />
  if (!run) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={History}
          title={gone ? "This run isn't here" : "Couldn't load the run"}
          body={
            gone
              ? "It was deleted, or you don't have access to it."
              : query.error?.message
          }
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href={ACTIVITY} />}
              nativeButton={false}
            >
              Back to activity
            </Button>
          }
        />
      </div>
    )
  }
  return <Run run={run} phone={phone} />
}

function Loading({ phone }: { phone: boolean }) {
  return (
    <div className={cn("flex flex-col gap-3", phone ? "p-4" : "px-6 pt-5")}>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  )
}

const stepName = (t: SoftwareRunTarget) =>
  `${t.recipe_name} on ${t.server_name}`

function download(run: SoftwareRunDetail) {
  const text = run.steps
    .map(
      (t) =>
        `===== ${stepName(t)} (${t.state}) =====\n${stripAnsi(t.output)}${t.error ? `\n${t.error}` : ""}\n`,
    )
    .join("\n")
  const blob = new Blob([text], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${runTitle(run).replace(/[^\w.-]+/g, "-")}-${run.id.slice(0, 8)}.log`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function useRunItems(run: SoftwareRunDetail) {
  const can = useSoftwareCan(run.workspace_id)
  const a = useSoftwareActions()
  const router = useRouter()
  const active = !runFinished(run.state)
  const stop = active && can.recipes ? () => a.cancelRun(run.id) : undefined
  const menu: Item[][] = [
    [
      {
        key: "download",
        label: "Download output",
        icon: <Download />,
        onSelect: () => download(run),
      },
    ],
    can.recipes && !active
      ? [
          {
            key: "delete",
            label: "Delete run",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => a.removeRun(run.id, () => router.replace(ACTIVITY)),
          },
        ]
      : [],
  ]
  return { menu, stop }
}

// The step to show first: one that failed, else one still going.
function firstPick(steps: SoftwareRunTarget[]) {
  return (
    steps.find((t) => t.state === "failed") ??
    steps.find((t) => t.state === "running") ??
    steps[0]
  )?.position
}

// Steps grouped by server, in the order they ran (a dependency such as Docker
// comes before the app that needs it).
function byServer(steps: SoftwareRunTarget[]) {
  const groups: { server: string; steps: SoftwareRunTarget[] }[] = []
  for (const t of steps) {
    const g = groups.find((x) => x.server === t.server_name)
    if (g) g.steps.push(t)
    else groups.push({ server: t.server_name, steps: [t] })
  }
  return groups
}

function StepState({
  t,
  className,
}: {
  t: SoftwareRunTarget
  className?: string
}) {
  if (t.state === "skipped") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-body-sm whitespace-nowrap text-muted-foreground",
          className,
        )}
      >
        <CircleSlash className="size-4" />
        Skipped
      </span>
    )
  }
  return <RunStateBadge state={t.state} className={className} />
}

function Versions({ t }: { t: SoftwareRunTarget }) {
  const before = t.version_before
  const after = t.version_after
  if (!before && !after) return null
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-caption text-ash">
      <span className="truncate">{before || "none"}</span>
      {after && after !== before && (
        <>
          <ArrowRight className="size-3 shrink-0" />
          <span className="truncate text-foreground">{after}</span>
        </>
      )}
    </span>
  )
}

function ResultLine({ run }: { run: SoftwareRunDetail }) {
  const waiting = run.targets - run.succeeded - run.failed
  return (
    <span className="text-caption text-muted-foreground">
      {run.succeeded} of {run.targets} done
      {run.failed > 0 && (
        <span className="text-destructive"> · {run.failed} failed</span>
      )}
      {waiting > 0 && runFinished(run.state) && ` · ${waiting} not done`}
    </span>
  )
}

function Run({ run, phone }: { run: SoftwareRunDetail; phone: boolean }) {
  const active = !runFinished(run.state)
  useNow(1000, active)
  const { menu, stop } = useRunItems(run)
  const back = useBack(ACTIVITY)
  const [picked, setPicked] = useState(() => firstPick(run.steps))
  const step = run.steps.find((t) => t.position === picked) ?? run.steps[0]
  const groups = byServer(run.steps)

  const meta = [
    run.created_by_name || "Schedule",
    timeAgo(run.created_at),
    run.started_at
      ? duration(run.started_at, run.finished_at ?? undefined)
      : "",
  ].filter(Boolean)

  const status = run.error && (
    <Callout warn title={run.state === "failed" ? "The run failed" : "Note"}>
      <span className="whitespace-pre-wrap">{run.error}</span>
    </Callout>
  )

  if (phone) {
    return (
      <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
        <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={back}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {runTitle(run)}
          </h1>
          <PhoneMenu groups={menu} />
        </header>
        <div className="flex shrink-0 flex-col gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <RunStateBadge state={run.state} />
            <span className="ms-auto">
              <ResultLine run={run} />
            </span>
          </div>
          <p className="truncate text-caption text-ash">{meta.join(" · ")}</p>
          {status}
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <PhoneSteps groups={groups} />
        </div>
        {stop && (
          <div className="flex shrink-0 gap-2 border-t border-border p-3">
            <Button variant="outline" className="h-11 flex-1" onClick={stop}>
              <Square />
              Stop
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-3rem-1px)] flex-col gap-4 px-6 pt-5 pb-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-subheading font-medium">
              {runTitle(run)}
            </h1>
            <RunStateBadge state={run.state} />
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-ash">
            <span>{meta.join(" · ")}</span>
            <ResultLine run={run} />
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {stop && (
            <Button variant="outline" onClick={stop}>
              <Square />
              Stop
            </Button>
          )}
          <ItemMenu groups={menu} label="Run actions" />
        </div>
      </div>
      {status}
      <div className="flex min-h-0 flex-1 gap-4">
        {run.steps.length > 1 && (
          <nav
            aria-label="Steps"
            className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto"
          >
            {groups.map((g) => (
              <div key={g.server} className="flex flex-col gap-0.5">
                <span className="px-3 font-label text-[11px] tracking-label text-ash uppercase">
                  {g.server}
                </span>
                {g.steps.map((t) => (
                  <button
                    key={t.position}
                    type="button"
                    aria-current={t.position === step?.position}
                    onClick={() => setPicked(t.position)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-start outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                      t.position === step?.position && "bg-muted",
                    )}
                  >
                    <span className="truncate text-body-sm font-medium">
                      {t.recipe_name}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <StepState t={t} className="text-caption" />
                      <Versions t={t} />
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        )}
        {step && <StepOutput t={step} phone={false} />}
      </div>
    </div>
  )
}

function StepOutput({ t, phone }: { t: SoftwareRunTarget; phone: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const [follow, setFollow] = useState(true)
  const active = !runFinished(t.state) && t.state !== "skipped"

  // Stay at the end while new lines come, unless scrolled up to read.
  // biome-ignore lint/correctness/useExhaustiveDependencies: on new output
  useLayoutEffect(() => {
    const el = box.current
    if (el && follow) el.scrollTop = el.scrollHeight
  }, [t.output, follow])

  const onScroll = useCallback(() => {
    const el = box.current
    if (!el) return
    setFollow(el.scrollHeight - el.scrollTop - el.clientHeight < 24)
  }, [])

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-2 contain-inline-size">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 md:px-0">
        {!phone && (
          <span className="text-body-sm font-medium">{stepName(t)}</span>
        )}
        <StepState t={t} />
        <Versions t={t} />
        {t.started_at && (
          <span className="text-caption text-ash">
            {duration(t.started_at, t.finished_at ?? undefined)}
          </span>
        )}
      </div>
      {t.error && (
        <p
          role="alert"
          className="px-4 text-body-sm whitespace-pre-wrap text-destructive md:px-0"
        >
          {t.error}
        </p>
      )}
      {t.truncated && (
        <p className="px-4 text-caption text-ash md:px-0">
          Only the first part of the output was kept; the step itself ran to the
          end.
        </p>
      )}
      <div
        ref={box}
        onScroll={onScroll}
        className={cn(
          "min-h-0 flex-1 overflow-auto bg-[var(--term-background,#1c2024)] p-4 font-mono text-[12.5px] leading-5 whitespace-pre text-[var(--term-foreground,#e8e8ec)]",
          !phone && "rounded-2xl",
        )}
      >
        {t.output ? (
          <AnsiText text={t.output} />
        ) : (
          <span className="opacity-60">
            {t.state === "skipped"
              ? "Skipped: an earlier step on this server failed, or it was already done."
              : active
                ? t.state === "queued"
                  ? "Waiting for its turn…"
                  : "Waiting for output…"
                : t.state === "canceled" && !t.started_at
                  ? "Stopped before it started here."
                  : "No output."}
          </span>
        )}
      </div>
      {!follow && active && (
        <Button
          size="sm"
          className="absolute end-4 bottom-4 shadow-md"
          onClick={() => setFollow(true)}
        >
          <ChevronDown />
          Follow
        </Button>
      )}
    </div>
  )
}

// Phones: steps grouped by server; a tap opens the step's output full screen.
function PhoneSteps({
  groups,
}: {
  groups: { server: string; steps: SoftwareRunTarget[] }[]
}) {
  const [open, setOpen] = useOpen("software-run-step")
  const [picked, setPicked] = useState<number>()
  const step = groups.flatMap((g) => g.steps).find((t) => t.position === picked)
  return (
    <>
      {groups.map((g) => (
        <section key={g.server}>
          <h2 className="px-4 pt-4 pb-2 font-label text-[11px] tracking-label text-ash uppercase">
            {g.server}
          </h2>
          <ul className="divide-y divide-border border-y border-border">
            {g.steps.map((t) => (
              <li key={t.position}>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(t.position)
                    setOpen(true)
                  }}
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start outline-none active:bg-muted"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-body font-medium">
                      {t.recipe_name}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <StepState t={t} className="text-caption" />
                      <Versions t={t} />
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-ash" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <BottomSheet
        full
        open={open}
        onOpenChange={setOpen}
        title={step ? stepName(step) : "Output"}
        className="pb-[env(safe-area-inset-bottom)]"
      >
        {step && (
          <div className="flex min-h-0 flex-1 flex-col pb-2">
            <StepOutput t={step} phone />
          </div>
        )}
      </BottomSheet>
    </>
  )
}

function PhoneMenu({ groups }: { groups: Item[][] }) {
  const [open, setOpen] = useOpen("software-run-menu")
  if (groups.flat().length === 0) return null
  return (
    <>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="Run actions"
        onClick={() => setOpen(true)}
      >
        <Ellipsis className="size-5" />
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title="Run">
        <SheetItems groups={groups} onOpenChange={setOpen} />
      </BottomSheet>
    </>
  )
}
