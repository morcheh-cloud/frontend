"use client"

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Ellipsis,
  FileCode,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { duration, RunStateBadge } from "@/app/(panel)/ansible/components/meta"
import { Callout } from "@/app/(panel)/ansible/components/run-layer"
import {
  Empty,
  type Item,
  ItemMenu,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { AnsiText, stripAnsi } from "@/components/ansi"
import { BottomSheet } from "@/components/bottom-sheet"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useNow } from "@/hooks/useNow"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type { ScriptRunDetail, ScriptRunTarget } from "@/lib/services"
import { cn } from "@/lib/utils"
import { runFinished, useScript, useScriptRun } from "../api"
import { CodeEditor } from "./code-editor"
import {
  exitText,
  type Interpreter,
  interpreterLabels,
  type RunAs,
  runAsLabels,
  timeoutText,
} from "./meta"
import { useScriptsCan } from "./permissions"
import { useScriptsActions } from "./scripts-actions"
import { ResultText } from "./scripts-view"

type Tab = "output" | "script" | "values"

export function ScriptRunFromRoute() {
  const { id } = useParams<{ id: string }>()
  const phone = useIsPhone()
  if (phone === null) return null
  return <RunPage key={id} id={id} phone={phone} />
}

function RunPage({ id, phone }: { id: string; phone: boolean }) {
  const query = useScriptRun(id)
  const run = query.data
  usePageCrumbs([
    { href: "/scripts?tab=runs", label: "Runs" },
    { href: `/scripts/runs/${id}`, label: run?.name ?? "Run" },
  ])
  if (query.isPending) return <Loading phone={phone} />
  if (!run) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={FileCode}
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
              render={<Link href="/scripts?tab=runs" />}
              nativeButton={false}
            >
              Back to runs
            </Button>
          }
        />
      </div>
    )
  }
  return <Run run={run} phone={phone} />
}

function download(run: ScriptRunDetail) {
  const text = run.targets
    .map((t) => {
      const end = exitText(t.exit_code, t.timed_out) || t.state
      return `===== ${t.server_name} (${end}) =====\n${stripAnsi(t.output)}${t.error ? `\n${t.error}` : ""}\n`
    })
    .join("\n")
  const blob = new Blob([text], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${run.name.replace(/[^\w.-]+/g, "-")}-${run.id.slice(0, 8)}.log`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function useRunItems(run: ScriptRunDetail) {
  const can = useScriptsCan()
  const a = useScriptsActions()
  const router = useRouter()
  const active = !runFinished(run.state)
  // A saved script still around runs as itself (with today's text and
  // values); otherwise the run's own copy, which can be edited first.
  const script = useScript(run.script_id)
  const servers = run.targets
    .filter((t) => t.server_id)
    .map((t) => ({ id: t.server_id as string, name: t.server_name }))
  const preset = { servers, env: run.env }

  const again = can.run
    ? () => {
        if (script.data) a.runScript(script.data, preset)
        else
          a.run(
            {
              name: run.name,
              adhoc: true,
              content: run.content,
              interpreter: run.interpreter as Interpreter,
              runAs: run.run_as as RunAs,
              timeoutSeconds: run.timeout_seconds,
            },
            preset,
          )
      }
    : undefined
  const stop = active && can.edit ? () => a.cancelRun(run.id) : undefined

  const menu: Item[][] = [
    [
      {
        key: "download",
        label: "Download output",
        icon: <Download />,
        onSelect: () => download(run),
      },
      ...(script.data
        ? [
            {
              key: "script",
              label: "Open the script",
              icon: <FileCode />,
              onSelect: () => router.push(`/scripts/${script.data.id}`),
            },
          ]
        : []),
    ],
    can.edit && !active
      ? [
          {
            key: "delete",
            label: "Delete run",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () =>
              a.removeRun(run.id, () => router.replace("/scripts?tab=runs")),
          },
        ]
      : [],
  ]
  return { menu, again, stop, script: script.data }
}

// The server to show first: one that failed, else one still going.
function firstPick(targets: ScriptRunTarget[]) {
  return (
    targets.find((t) => t.state === "failed") ??
    targets.find((t) => t.state === "running") ??
    targets[0]
  )?.position
}

function Run({ run, phone }: { run: ScriptRunDetail; phone: boolean }) {
  const active = !runFinished(run.state)
  useNow(1000, active)
  const [tab, setTab] = useState<Tab>("output")
  const { menu, again, stop, script } = useRunItems(run)
  const a = useScriptsActions()
  const back = useBack("/scripts")
  const [picked, setPicked] = useState(() => firstPick(run.targets))
  const target =
    run.targets.find((t) => t.position === picked) ?? run.targets[0]

  const meta = [
    run.created_by_name,
    timeAgo(run.created_at),
    run.started_at ? duration(run.started_at, run.finished_at) : "",
    runAsLabels[run.run_as as RunAs] ?? run.run_as,
  ].filter(Boolean)

  const hasValues = Object.keys(run.env ?? {}).length > 0
  const tabs: { value: Tab; label: string }[] = [
    {
      value: "output",
      label: phone ? `Servers · ${run.targets.length}` : "Output",
    },
    { value: "script", label: "Script" },
    ...(hasValues ? [{ value: "values" as const, label: "Values" }] : []),
  ]

  const status = run.error && (
    <Callout warn title={run.state === "failed" ? "The run failed" : "Note"}>
      <span className="whitespace-pre-wrap">{run.error}</span>
    </Callout>
  )

  const name = script ? (
    <Link href={`/scripts/${script.id}`} className="hover:text-brand">
      {run.name}
    </Link>
  ) : (
    run.name
  )

  const other =
    tab === "script" ? (
      <ScriptTab run={run} phone={phone} />
    ) : tab === "values" ? (
      <ValuesTab env={run.env} phone={phone} />
    ) : null

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
            {run.name}
          </h1>
          <PhoneMenu groups={menu} />
        </header>
        <div className="flex shrink-0 flex-col gap-2 px-4 pt-3">
          <div className="flex items-center gap-2">
            <RunStateBadge state={run.state} />
            <ResultText r={run} className="ms-auto" />
          </div>
          <p className="truncate text-caption text-ash">{meta.join(" · ")}</p>
          {status}
        </div>
        <div className="flex shrink-0 [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-3">
          <Segmented label="Show" items={tabs} value={tab} onChange={setTab} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {tab === "output" ? <PhoneTargets run={run} /> : other}
        </div>
        {(stop || again) && (
          <div className="flex shrink-0 gap-2 border-t border-border p-3">
            {stop ? (
              <Button
                variant="outline"
                className="h-11 flex-1"
                disabled={a.canceling}
                onClick={stop}
              >
                <Square />
                Stop
              </Button>
            ) : (
              again && (
                <Button className="h-11 flex-1" onClick={again}>
                  <RefreshCw />
                  Run again
                </Button>
              )
            )}
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
            <h1 className="truncate text-subheading font-medium">{name}</h1>
            <RunStateBadge state={run.state} />
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-ash">
            <span>{meta.join(" · ")}</span>
            <ResultText r={run} />
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {stop && (
            <Button variant="outline" disabled={a.canceling} onClick={stop}>
              <Square />
              Stop
            </Button>
          )}
          {again && !stop && (
            <Button variant="outline" onClick={again}>
              <RefreshCw />
              Run again
            </Button>
          )}
          <ItemMenu groups={menu} label="Run actions" />
        </div>
      </div>
      {status}
      <Segmented label="Show" items={tabs} value={tab} onChange={setTab} />
      {tab === "output" ? (
        <div className="flex min-h-0 flex-1 gap-4">
          {run.targets.length > 1 && (
            <ul
              aria-label="Servers"
              className="flex w-64 shrink-0 flex-col gap-0.5 overflow-y-auto"
            >
              {run.targets.map((t) => (
                <li key={t.position}>
                  <button
                    type="button"
                    aria-current={t.position === target?.position}
                    onClick={() => setPicked(t.position)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-start outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                      t.position === target?.position && "bg-muted",
                    )}
                  >
                    <span className="truncate text-body-sm font-medium">
                      {t.server_name}
                    </span>
                    <TargetLine t={t} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {target && <TargetOutput t={target} phone={false} />}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {other}
        </div>
      )}
    </div>
  )
}

function TargetLine({ t }: { t: ScriptRunTarget }) {
  const end = exitText(t.exit_code, t.timed_out)
  return (
    <span className="flex min-w-0 items-center gap-2">
      <RunStateBadge state={t.state} className="text-caption" />
      <span className="truncate text-caption text-ash">
        {t.state === "running"
          ? duration(t.started_at)
          : t.state === "canceled" && !t.started_at
            ? "Didn't start"
            : end.replace("Exit code ", "exit ")}
      </span>
    </span>
  )
}

function TargetOutput({ t, phone }: { t: ScriptRunTarget; phone: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const [follow, setFollow] = useState(true)
  const active = !runFinished(t.state)

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

  const facts = [
    exitText(t.exit_code, t.timed_out),
    t.started_at ? duration(t.started_at, t.finished_at) : "",
  ].filter(Boolean)

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-2 contain-inline-size">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 md:px-0">
        {!phone && (
          <span className="text-body-sm font-medium">{t.server_name}</span>
        )}
        <RunStateBadge state={t.state} />
        {facts.length > 0 && (
          <span
            className={cn(
              "text-caption",
              t.exit_code || t.timed_out ? "text-destructive" : "text-ash",
            )}
          >
            {facts.join(" · ")}
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
          Only the first 1 MiB of output was kept; the script itself ran to the
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
            {active
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

// Phones: one row per server; a tap opens its output full screen.
function PhoneTargets({ run }: { run: ScriptRunDetail }) {
  const [open, setOpen] = useOpen("script-run-target")
  const [picked, setPicked] = useState<number>()
  const target = run.targets.find((t) => t.position === picked)
  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {run.targets.map((t) => (
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
                  {t.server_name}
                </span>
                <TargetLine t={t} />
              </span>
              <ChevronRight className="size-5 shrink-0 text-ash" />
            </button>
          </li>
        ))}
      </ul>
      <BottomSheet
        full
        open={open}
        onOpenChange={setOpen}
        title={target?.server_name ?? "Output"}
        className="pb-[env(safe-area-inset-bottom)]"
      >
        {target && (
          <div className="flex min-h-0 flex-1 flex-col pb-2">
            <TargetOutput t={target} phone />
          </div>
        )}
      </BottomSheet>
    </>
  )
}

function ScriptTab({ run, phone }: { run: ScriptRunDetail; phone: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="px-4 text-caption text-ash md:px-0">
        What ran:{" "}
        {interpreterLabels[run.interpreter as Interpreter] ?? run.interpreter} ·{" "}
        {runAsLabels[run.run_as as RunAs] ?? run.run_as} · time limit{" "}
        {timeoutText(run.timeout_seconds)}. A copy kept with the run, so later
        edits to the script don't change it.
      </p>
      <div
        className={cn(
          "min-h-64 flex-1 overflow-hidden",
          !phone && "rounded-2xl border border-border",
        )}
      >
        <CodeEditor
          value={run.content}
          interpreter={run.interpreter}
          readOnly
        />
      </div>
    </div>
  )
}

function ValuesTab({
  env,
  phone,
}: {
  env: Record<string, string>
  phone: boolean
}) {
  return (
    <dl
      className={cn(
        "divide-y divide-border border-y border-border",
        !phone && "max-w-2xl rounded-2xl border",
      )}
    >
      {Object.entries(env).map(([k, v]) => (
        <div
          key={k}
          className="flex flex-col gap-0.5 px-4 py-3 md:flex-row md:gap-4"
        >
          <dt className="shrink-0 font-mono text-body-sm text-muted-foreground md:w-48">
            ${k}
          </dt>
          <dd className="min-w-0 font-mono text-body-sm break-all">
            {v || <span className="text-ash">(empty)</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function PhoneMenu({ groups }: { groups: Item[][] }) {
  const [open, setOpen] = useOpen("script-run-menu")
  if (groups.every((g) => g.length === 0)) return null
  return (
    <>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label="More"
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

function Loading({ phone }: { phone: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4 pt-5", phone ? "px-4" : "px-6")}>
      <Skeleton className="h-9 w-64 rounded-lg" />
      <Skeleton className="h-9 w-80 rounded-lg" />
      <Skeleton className="h-[50dvh] rounded-2xl" />
    </div>
  )
}
