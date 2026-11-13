"use client"

import {
  ChevronDown,
  ChevronLeft,
  Download,
  Ellipsis,
  FileCode2,
  History,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

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
import { type DiffLine as Line, lineDiff } from "@/components/diff"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useNow } from "@/hooks/useNow"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import type {
  AnsibleRunDetail,
  HostStats,
  RunPlay,
  RunTask,
  TaskResult,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { runFinished, useLiveRun } from "../api"
import { useAnsibleActions } from "./ansible-actions"
import {
  duration,
  hostOutcome,
  RecapText,
  ResultIcon,
  RunStateBadge,
  resultLabels,
  resultTone,
} from "./meta"
import { useAnsibleCan } from "./permissions"
import { Callout } from "./run-layer"
import { YamlEditor } from "./yaml-editor"

type Tab = "tasks" | "output" | "servers" | "playbook"

export function RunFromRoute() {
  const { id } = useParams<{ id: string }>()
  const phone = useIsPhone()
  if (phone === null) return null
  return <RunPage key={id} id={id} phone={phone} />
}

function RunPage({ id, phone }: { id: string; phone: boolean }) {
  const { run, error, live } = useLiveRun(id)
  usePageCrumbs([
    { href: "/ansible?tab=runs", label: "Runs" },
    { href: `/ansible/runs/${id}`, label: run?.playbook_name ?? "Run" },
  ])
  if (!run) {
    if (!error) return <Loading phone={phone} />
    const gone = error instanceof ApiError && [403, 404].includes(error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={History}
          title={gone ? "This run isn't here" : "Couldn't load the run"}
          body={
            gone
              ? "It was deleted, or you don't have access to it."
              : error.message
          }
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href="/ansible?tab=runs" />}
              nativeButton={false}
            >
              All runs
            </Button>
          }
        />
      </div>
    )
  }
  return <Run run={run} live={live} phone={phone} />
}

function useRunItems(run: AnsibleRunDetail): {
  menu: Item[][]
  again?: () => void
  stop?: () => void
} {
  const can = useAnsibleCan()
  const a = useAnsibleActions()
  const router = useRouter()
  const active = !runFinished(run.state)
  const again = can.run
    ? () =>
        a.run(
          run.playbook_id
            ? { playbookId: run.playbook_id, name: run.playbook_name }
            : { name: run.playbook_name, content: run.content },
          { selection: run.selection, options: run.options },
        )
    : undefined
  const stop = can.manageRuns && active ? () => a.cancelRun(run) : undefined
  const menu: Item[][] = [
    [
      ...(run.playbook_id
        ? [
            {
              key: "playbook",
              label: "Open the playbook",
              icon: <FileCode2 />,
              onSelect: () =>
                router.push(`/ansible/playbooks/${run.playbook_id}`),
            },
          ]
        : []),
      {
        key: "download",
        label: "Download output",
        icon: <Download />,
        onSelect: () => download(run),
      },
    ],
    can.manageRuns && !active
      ? [
          {
            key: "delete",
            label: "Delete run",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () =>
              a.removeRun(run, () => router.replace("/ansible?tab=runs")),
          },
        ]
      : [],
  ]
  return { menu, again, stop }
}

function download(run: AnsibleRunDetail) {
  const blob = new Blob([stripAnsi(run.output)], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${run.playbook_name.replace(/[^\w.-]+/g, "-")}-${run.id.slice(0, 8)}.log`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Run({
  run,
  live,
  phone,
}: {
  run: AnsibleRunDetail
  live: boolean
  phone: boolean
}) {
  const active = !runFinished(run.state)
  const now = useNow(1000, active)
  void now
  const [tab, setTab] = useState<Tab>("tasks")
  const { menu, again, stop } = useRunItems(run)
  const a = useAnsibleActions()
  const back = useBack("/ansible")

  const meta = [
    run.created_by_name,
    timeAgo(run.created_at),
    run.started_at ? duration(run.started_at, run.finished_at) : "",
    run.options.check ? "Dry run" : "",
  ].filter(Boolean)

  const tabs: { value: Tab; label: string }[] = [
    { value: "tasks", label: "Tasks" },
    { value: "output", label: "Output" },
    { value: "servers", label: `Servers · ${run.hosts.length}` },
    { value: "playbook", label: "Playbook" },
  ]

  // "2 hosts failed" only repeats the recap beside the title.
  const recapOnly = /^\d+ hosts? (failed|unreachable)/.test(run.error ?? "")
  const status = (
    <>
      {run.error && !recapOnly && (
        <Callout
          warn
          title={run.state === "failed" ? "The run failed" : "Note"}
        >
          <span className="whitespace-pre-wrap">{run.error}</span>
        </Callout>
      )}
      {active && !live && (
        <p className="text-caption text-ash">Reconnecting…</p>
      )}
    </>
  )

  const content = (
    <>
      {tab === "tasks" && <Tasks run={run} phone={phone} />}
      {tab === "output" && <Output run={run} phone={phone} />}
      {tab === "servers" && <Servers run={run} phone={phone} />}
      {tab === "playbook" && <PlaybookTab run={run} phone={phone} />}
    </>
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
            {run.playbook_name}
          </h1>
          <PhoneMenu groups={menu} />
        </header>
        <div className="flex shrink-0 flex-col gap-2 px-4 pt-3">
          <div className="flex items-center gap-2">
            <RunStateBadge state={run.state} />
            <RecapText recap={run.recap} className="ms-auto" />
          </div>
          <p className="truncate text-caption text-ash">{meta.join(" · ")}</p>
          {status}
        </div>
        <div className="flex shrink-0 [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-3">
          <Segmented label="Show" items={tabs} value={tab} onChange={setTab} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{content}</div>
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
            <h1 className="truncate text-subheading font-medium">
              {run.playbook_id ? (
                <Link
                  href={`/ansible/playbooks/${run.playbook_id}`}
                  className="hover:text-brand"
                >
                  {run.playbook_name}
                </Link>
              ) : (
                run.playbook_name
              )}
            </h1>
            <RunStateBadge state={run.state} />
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-ash">
            <span>{meta.join(" · ")}</span>
            <RecapText recap={run.recap} />
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
      <div className="flex min-h-0 flex-1 flex-col">{content}</div>
    </div>
  )
}

// ---- Output ----

function Output({ run, phone }: { run: AnsibleRunDetail; phone: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const [follow, setFollow] = useState(true)
  const active = !runFinished(run.state)

  // Stay at the end while new lines come, unless scrolled up to read.
  // biome-ignore lint/correctness/useExhaustiveDependencies: on new output
  useLayoutEffect(() => {
    const el = box.current
    if (el && follow) el.scrollTop = el.scrollHeight
  }, [run.output, follow])

  const onScroll = useCallback(() => {
    const el = box.current
    if (!el) return
    setFollow(el.scrollHeight - el.scrollTop - el.clientHeight < 24)
  }, [])

  return (
    <div className="relative flex min-h-0 flex-1 flex-col contain-inline-size">
      {run.output_truncated && (
        <p className="px-4 pb-2 text-caption text-ash md:px-0">
          The beginning was cut: only the end of a long output is kept.
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
        {run.output ? (
          <AnsiText text={run.output} />
        ) : (
          <span className="opacity-60">
            {active ? "Waiting for output…" : "No output."}
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

// ---- Tasks ----

function Tasks({ run, phone }: { run: AnsibleRunDetail; phone: boolean }) {
  const plays = run.plays ?? []
  const names = useMemo(
    () => new Map(run.hosts.map((h) => [h.inventory_name, h.name])),
    [run.hosts],
  )
  if (plays.length === 0) {
    return (
      <p
        className={cn(
          "py-8 text-center text-body-sm text-muted-foreground",
          !phone && "rounded-2xl border border-border",
        )}
      >
        {runFinished(run.state)
          ? "No task ran. The output tells why."
          : "Waiting for the first task…"}
      </p>
    )
  }
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-4 pb-4">
        {plays.map((p) => (
          <Play key={p.id} play={p} names={names} phone={phone} />
        ))}
      </div>
    </div>
  )
}

function Play({
  play,
  names,
  phone,
}: {
  play: RunPlay
  names: Map<string, string>
  phone: boolean
}) {
  return (
    <section>
      <div className="flex items-baseline gap-2 px-4 pb-2 md:px-0">
        <h2 className="font-label text-caption tracking-label text-ash uppercase">
          Play
        </h2>
        <span className="truncate text-body-sm font-medium">
          {play.name || "Unnamed play"}
        </span>
        <span className="truncate font-mono text-caption text-ash">
          {play.hosts}
        </span>
      </div>
      {play.no_hosts && (
        <p className="px-4 pb-2 text-body-sm text-muted-foreground md:px-0">
          {play.no_hosts === "matched"
            ? `No server in this run matched “${play.hosts}”. Check the play's hosts: against the groups on the Servers tab.`
            : "Every server had already failed, so nothing was left to run it on."}
        </p>
      )}
      {play.tasks.length > 0 && (
        <ul
          className={cn(
            "divide-y divide-border border-y border-border",
            !phone && "rounded-2xl border",
          )}
        >
          {play.tasks.map((t) => (
            <Task key={t.id} task={t} names={names} />
          ))}
        </ul>
      )}
    </section>
  )
}

const bad = (s: string) => s === "failed" || s === "unreachable"

function Task({ task, names }: { task: RunTask; names: Map<string, string> }) {
  const results = Object.entries(task.results)
  const failing = results.some(([, r]) => bad(r.status))
  const [open, setOpen] = useState<boolean | null>(null)
  const expanded = open ?? failing
  const counts = new Map<string, number>()
  for (const [, r] of results)
    counts.set(r.status, (counts.get(r.status) ?? 0) + 1)
  const worst =
    results.length === 0
      ? "running"
      : ([
          "running",
          "unreachable",
          "failed",
          "changed",
          "ok",
          "ignored",
          "skipped",
        ].find((s) => counts.has(s)) ?? "ok")

  return (
    <li>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setOpen(!expanded)}
        className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-start hover:bg-subtle active:bg-muted"
      >
        <ResultIcon status={worst} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-body-sm font-medium">
              {task.name || task.action}
            </span>
            {task.handler && (
              <span className="shrink-0 rounded-md bg-muted px-1.5 text-caption text-muted-foreground">
                Handler
              </span>
            )}
          </span>
          <span className="block truncate font-mono text-caption text-ash">
            {task.action}
          </span>
        </span>
        <span className="hidden shrink-0 flex-wrap justify-end gap-x-2 text-caption sm:flex">
          {[...counts].map(([s, n]) => (
            <span key={s} className={resultTone(s)}>
              {n} {resultLabels[s as TaskResult["status"]]?.toLowerCase() ?? s}
            </span>
          ))}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-ash transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded && (
        <ul className="flex flex-col gap-2 bg-subtle px-4 py-3">
          {results.length === 0 && (
            <li className="text-caption text-ash">
              Not started on any server yet.
            </li>
          )}
          {results
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([host, r]) => (
              <HostResult key={host} host={names.get(host) ?? host} r={r} />
            ))}
        </ul>
      )}
    </li>
  )
}

function HostResult({ host, r }: { host: string; r: TaskResult }) {
  const [more, setMore] = useState(false)
  const hasData = r.data && Object.keys(r.data).length > 0
  return (
    <li className="flex flex-col gap-1.5 rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-body-sm">
        <ResultIcon status={r.status} />
        <span className="min-w-0 truncate font-medium">{host}</span>
        <span className={cn("shrink-0", resultTone(r.status))}>
          {resultLabels[r.status] ?? r.status}
        </span>
        {r.attempts ? (
          <span className="text-caption text-ash">attempt {r.attempts}</span>
        ) : null}
        {r.rc != null && (
          <span className="ms-auto font-mono text-caption text-ash">
            rc {r.rc}
          </span>
        )}
      </div>
      {r.msg && (
        <p
          className={cn(
            "text-body-sm break-words whitespace-pre-wrap",
            bad(r.status) ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {r.msg}
        </p>
      )}
      {r.stdout && <Pre label="stdout">{r.stdout}</Pre>}
      {r.stderr && <Pre label="stderr">{r.stderr}</Pre>}
      {r.diff != null && <DiffView diff={r.diff} />}
      {r.items && r.items.length > 0 && (
        <ul className="flex flex-col gap-1">
          {r.items.map((it, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: items keep their order
            <li key={i} className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-caption">
                <ResultIcon status={it.status} className="size-3.5" />
                <span className="truncate font-mono">{itemLabel(it.item)}</span>
                <span className={resultTone(it.status)}>{it.status}</span>
              </span>
              {it.msg && (
                <span className="ps-5 text-caption text-muted-foreground">
                  {it.msg}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {hasData && (
        <div>
          <button
            type="button"
            onClick={() => setMore(!more)}
            className="flex h-8 items-center gap-1 text-caption text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                more && "rotate-180",
              )}
            />
            {more ? "Hide details" : "Show details"}
          </button>
          {more && <Pre>{JSON.stringify(r.data, null, 2)}</Pre>}
        </div>
      )}
    </li>
  )
}

function itemLabel(item: unknown) {
  if (typeof item === "string" || typeof item === "number") return String(item)
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>
    for (const k of ["name", "key", "path", "dest", "item"]) {
      if (typeof o[k] === "string") return o[k] as string
    }
  }
  return JSON.stringify(item)
}

function Pre({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div>
      {label && (
        <p className="pb-0.5 font-mono text-caption text-ash">{label}</p>
      )}
      <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-2 font-mono text-caption break-all whitespace-pre-wrap">
        {children}
      </pre>
    </div>
  )
}

// ---- Diffs ----

type DiffEntry = {
  before?: unknown
  after?: unknown
  before_header?: string
  after_header?: string
  prepared?: string
}

function DiffView({ diff }: { diff: unknown }) {
  const entries = (Array.isArray(diff) ? diff : [diff]).filter(
    (d): d is DiffEntry => !!d && typeof d === "object",
  )
  const blocks = entries
    .map((d) => diffLines(d))
    .filter((b) => b.lines.length > 0)
  if (blocks.length === 0) return null
  return (
    <div className="flex flex-col gap-1">
      {blocks.map((b, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: entries keep their order
        <div key={i}>
          {b.header && (
            <p className="pb-0.5 font-mono text-caption text-ash">{b.header}</p>
          )}
          <pre className="max-h-96 overflow-auto rounded-lg bg-muted py-2 font-mono text-caption">
            {b.lines.map((l, j) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static lines
                key={j}
                className={cn(
                  "px-2 break-all whitespace-pre-wrap",
                  l.kind === "+" && "bg-success/10 text-success",
                  l.kind === "-" && "bg-destructive/10 text-destructive",
                  l.kind === "@" && "text-ash",
                )}
              >
                {l.kind === "@" ? l.text : `${l.kind} ${l.text}`}
              </div>
            ))}
          </pre>
        </div>
      ))}
    </div>
  )
}

const asText = (v: unknown) =>
  v == null ? "" : typeof v === "string" ? v : JSON.stringify(v, null, 2)

function diffLines(d: DiffEntry): { header: string; lines: Line[] } {
  if (typeof d.prepared === "string") {
    return {
      header: "",
      lines: stripAnsi(d.prepared)
        .split("\n")
        .filter((l) => l !== "")
        .map((l) => {
          const k = l[0]
          if (k === "+" || k === "-") return { kind: k, text: l.slice(1) }
          if (k === "@") return { kind: "@", text: l }
          return { kind: " ", text: l.slice(1) }
        }),
    }
  }
  const before = asText(d.before)
  const after = asText(d.after)
  if (before === after) return { header: "", lines: [] }
  const header =
    d.before_header && d.after_header && d.before_header !== d.after_header
      ? `${d.before_header} → ${d.after_header}`
      : (d.after_header ?? d.before_header ?? "")
  return { header, lines: lineDiff(before, after) }
}

// ---- Servers ----

const statKeys: (keyof HostStats)[] = [
  "ok",
  "changed",
  "failed",
  "unreachable",
  "skipped",
  "rescued",
  "ignored",
]

function Servers({ run, phone }: { run: AnsibleRunDetail; phone: boolean }) {
  const active = !runFinished(run.state)
  const rows = run.hosts.map((h) => {
    const stats = run.recap?.[h.inventory_name]
    return {
      h,
      stats,
      outcome: stats ? hostOutcome(stats) : active ? "running" : "skipped",
    }
  })
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {phone ? (
        <ul className="divide-y divide-border border-y border-border">
          {rows.map(({ h, stats, outcome }) => (
            <li key={h.server_id}>
              <Link
                href={`/servers/${h.server_id}`}
                className="flex min-h-16 items-center gap-3 px-4 py-2 active:bg-muted"
              >
                <ResultIcon status={outcome} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium">
                    {h.name}
                  </span>
                  <span className="block truncate text-caption text-ash">
                    {stats
                      ? statKeys
                          .filter((k) => stats[k] > 0)
                          .map((k) => `${stats[k]} ${k}`)
                          .join(" · ") || "Nothing ran"
                      : outcomeLabel(outcome)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-body-sm">
            <thead className="border-b border-border bg-subtle text-caption text-muted-foreground">
              <tr>
                <th scope="col" className="h-10 px-3 text-start font-medium">
                  Server
                </th>
                <th scope="col" className="h-10 px-3 text-start font-medium">
                  Result
                </th>
                {statKeys.map((k) => (
                  <th
                    key={k}
                    scope="col"
                    className="h-10 px-3 text-end font-medium capitalize"
                  >
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ h, stats, outcome }) => (
                <tr key={h.server_id} className="h-12">
                  <td className="max-w-72 px-3">
                    <Link
                      href={`/servers/${h.server_id}`}
                      className="block truncate font-medium hover:text-brand"
                    >
                      {h.name}
                    </Link>
                    <span className="block truncate font-mono text-caption text-ash">
                      {h.inventory_name} · {h.host}
                    </span>
                  </td>
                  <td className="px-3 whitespace-nowrap">
                    <span className="flex items-center gap-2">
                      <ResultIcon status={outcome} />
                      {outcomeLabel(outcome)}
                    </span>
                  </td>
                  {statKeys.map((k) => (
                    <td
                      key={k}
                      className={cn(
                        "px-3 text-end tabular-nums",
                        !stats?.[k] && "text-ash",
                        stats?.[k] && (k === "failed" || k === "unreachable")
                          ? "text-destructive"
                          : undefined,
                        stats?.[k] && k === "changed"
                          ? "text-warning"
                          : undefined,
                      )}
                    >
                      {stats ? stats[k] : "–"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function outcomeLabel(o: string) {
  switch (o) {
    case "ok":
      return "OK"
    case "changed":
      return "Changed"
    case "failed":
      return "Failed"
    case "unreachable":
      return "Unreachable"
    case "running":
      return "Running"
    default:
      return "Didn't run"
  }
}

// ---- What ran ----

function PlaybookTab({
  run,
  phone,
}: {
  run: AnsibleRunDetail
  phone: boolean
}) {
  const o = run.options
  const facts: [string, ReactNode][] = [
    ["Mode", o.check ? "Dry run (check mode)" : "Real run"],
    ["Differences", o.diff ? "Shown" : "Hidden"],
    ...(o.tags?.length
      ? [["Only tags", o.tags.join(", ")] as [string, ReactNode]]
      : []),
    ...(o.skip_tags?.length
      ? [["Skipped tags", o.skip_tags.join(", ")] as [string, ReactNode]]
      : []),
    ...(o.limit ? [["Limit", o.limit] as [string, ReactNode]] : []),
    ...(o.forks
      ? [["Servers at once", String(o.forks)] as [string, ReactNode]]
      : []),
    ...(o.verbosity
      ? [["Verbosity", `-${"v".repeat(o.verbosity)}`] as [string, ReactNode]]
      : []),
    ...(run.exit_code != null
      ? [["Exit code", String(run.exit_code)] as [string, ReactNode]]
      : []),
  ]
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
      <dl className="mx-4 grid grid-cols-2 gap-3 rounded-2xl bg-subtle p-4 text-body-sm md:mx-0 md:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-caption text-ash">{label}</dt>
            <dd className="mt-0.5 truncate font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="px-4 text-caption text-ash md:px-0">
        The playbook as it was when this run started.
      </p>
      <div
        className={cn(
          "min-h-80 overflow-hidden",
          !phone && "rounded-2xl border border-border",
        )}
      >
        <YamlEditor value={run.content} readOnly height="auto" />
      </div>
      {o.extra_vars && (
        <>
          <p className="px-4 text-body-sm font-medium md:px-0">
            Extra variables
          </p>
          <div
            className={cn(
              "overflow-hidden",
              !phone && "rounded-2xl border border-border",
            )}
          >
            <YamlEditor value={o.extra_vars} readOnly height="auto" />
          </div>
        </>
      )}
    </div>
  )
}

// ---- Bits ----

function PhoneMenu({ groups }: { groups: Item[][] }) {
  const [open, setOpen] = useOpen("ansible-run-menu")
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
