"use client"

import { useQuery } from "@tanstack/react-query"
import {
  ArrowDown,
  ArrowUpRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  FlaskConical,
  Pencil,
  Play,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQueryState } from "nuqs"
import { type ReactNode, useRef, useState } from "react"

import { backupsHref } from "@/app/(panel)/databases/[id]/components/backups/meta"
import { backupKeys } from "@/app/(panel)/databases/api"
import {
  Empty,
  ItemMenu,
  Segmented,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError, api } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type { Schedule, ScheduleRun } from "@/lib/services"
import { cn } from "@/lib/utils"
import { type RunsQuery, runActive, useCronjob, useCronjobRuns } from "../api"
import { useCronjobActions } from "./cronjob-actions"
import { useCronjobMenu } from "./cronjob-menu"
import {
  ActionIcon,
  actionMeta,
  canTest,
  cronText,
  duration,
  EndLabel,
  formatInZone,
  modeMeta,
  RunStateBadge,
  runParam,
  taskFacts,
  usesDestinations,
} from "./meta"
import { useCronjobCan } from "./permissions"
import { RunLayer } from "./run-layer"

export function CronjobFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <CronjobPage id={id} />
}

export function CronjobPage({ id }: { id: string }) {
  const phone = useIsPhone()
  const query = useCronjob(id)
  if (phone === null) return null
  if (query.isPending) return <Loading phone={phone} />
  if (!query.data) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={CalendarClock}
          title={
            gone ? "This cron job isn't here" : "Couldn't load the cron job"
          }
          body={
            gone
              ? "It was deleted, or you don't have access to it."
              : query.error?.message
          }
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href="/cronjobs" />}
              nativeButton={false}
            >
              Back to cron jobs
            </Button>
          }
        />
      </div>
    )
  }
  return <Page s={query.data} phone={phone} />
}

// ?run= holds the open run. Opening pushes a history entry, so Back closes
// it; a run opened by a link (the page loaded with it) is closed in place.
function useRunParam() {
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

function Page({ s, phone }: { s: Schedule; phone: boolean }) {
  const router = useRouter()
  const can = useCronjobCan(s.workspace_id)
  const a = useCronjobActions()
  const back = useBack("/cronjobs")
  const { run, open, close } = useRunParam()
  const [sheet, setSheet] = useOpen("cronjob-page-menu")
  const menu = useCronjobMenu(s, {
    onPage: true,
    after: () => router.replace("/cronjobs"),
  })

  usePageCrumbs([{ href: `/cronjobs/${s.id}`, label: s.name }])

  const busy = !!s.last_run && runActive(s.last_run.state)
  const blocked = !!s.problem || busy || a.running
  const status = !s.enabled
    ? "Paused"
    : s.next_run_at
      ? `Next run ${formatInZone(s.next_run_at, s.timezone)}`
      : "On"

  const runButtons = can.run && (
    <>
      {canTest(s.action) && (
        <Button
          variant="outline"
          className={phone ? "h-11 flex-1" : "h-9"}
          disabled={blocked}
          onClick={() => a.run(s, { dryRun: true })}
        >
          <FlaskConical />
          Test run
        </Button>
      )}
      <Button
        className={phone ? "h-11 flex-1" : "h-9"}
        disabled={blocked}
        onClick={() => a.run(s)}
      >
        <Play />
        {busy ? "Running…" : "Run now"}
      </Button>
    </>
  )

  const problem = s.problem && (
    <div
      className={cn(
        "flex items-start gap-3 bg-destructive/5 px-4 py-3 text-body-sm",
        !phone && "rounded-2xl",
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-destructive">It can't run</p>
        <p className="mt-0.5 break-words text-muted-foreground">{s.problem}</p>
      </div>
      {can.edit && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 max-md:h-11"
          render={<Link href={`/cronjobs/${s.id}/edit`} />}
          nativeButton={false}
        >
          Fix
        </Button>
      )}
    </div>
  )

  const layer = (
    <RunLayer
      runId={run}
      onClose={close}
      phone={phone}
      timezone={s.timezone}
      workspaceId={s.workspace_id}
    />
  )

  if (phone) {
    return (
      <div className="flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-1 border-b border-border bg-background px-1 pt-[env(safe-area-inset-top)]">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Back"
            onClick={back}
          >
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {s.name}
          </h1>
          <HelpButton href={guideHref("cronjobs")} label="Cron jobs guide" />
          {menu.some((g) => g.length > 0) && (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="More"
              onClick={() => setSheet(true)}
            >
              <Ellipsis className="size-5" />
            </Button>
          )}
        </header>
        <div className="flex flex-col gap-1 px-4 pt-4 pb-3">
          <p className="text-body-sm text-muted-foreground">
            {actionMeta[s.action]?.label} · {status}
          </p>
          {s.description && (
            <p className="text-body-sm text-muted-foreground">
              {s.description}
            </p>
          )}
        </div>
        {problem}
        {runButtons && <div className="flex gap-2 px-4 py-3">{runButtons}</div>}
        <Flow s={s} phone />
        <ScheduleFacts s={s} phone />
        <Runs s={s} phone onOpen={open} />
        <BottomSheet open={sheet} onOpenChange={setSheet} title={s.name}>
          <SheetItems groups={menu} onOpenChange={setSheet} />
        </BottomSheet>
        {layer}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 px-6 pt-5 pb-12">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <ActionIcon action={s.action} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-subheading font-medium">{s.name}</h1>
          <p className="truncate text-caption text-ash">
            {actionMeta[s.action]?.label} · {status}
            {s.description && ` · ${s.description}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {runButtons}
          {can.edit && (
            <Button
              variant="outline"
              className="h-9"
              render={<Link href={`/cronjobs/${s.id}/edit`} />}
              nativeButton={false}
            >
              <Pencil />
              Edit
            </Button>
          )}
          <ItemMenu
            groups={menu.slice(1).map((g) => g.filter((i) => i.key !== "edit"))}
            label="Cron job actions"
          />
        </div>
      </div>
      {problem}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <Runs s={s} phone={false} onOpen={open} />
        <div className="flex flex-col gap-5">
          <Flow s={s} phone={false} />
          <ScheduleFacts s={s} phone={false} />
        </div>
      </div>
      {layer}
    </div>
  )
}

// A block: a card on desktop, a plain group with a heading on phones.
function Block({
  title,
  phone,
  action,
  children,
  className,
}: {
  title: string
  phone: boolean
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        phone
          ? "border-t border-border p-4"
          : "rounded-2xl border border-border p-5",
        className,
      )}
    >
      <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-body font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Flow({ s, phone }: { s: Schedule; phone: boolean }) {
  if (s.action === "verify-backup") return <VerifyFlow s={s} phone={phone} />
  if (s.action !== "sync" && s.action !== "archive") {
    return <TaskBlock s={s} phone={phone} facts={taskFacts(s)} />
  }
  const archive = s.action === "archive"
  const mode = modeMeta[s.options.mode]
  return (
    <Block
      title={archive ? "What it archives" : "What it copies"}
      phone={phone}
    >
      <div className="flex flex-col gap-2 text-body-sm">
        {s.source && (
          <>
            <div className="rounded-lg bg-subtle px-3 py-2.5">
              <p className="text-caption text-ash">
                {archive ? "Folder" : "From"}
              </p>
              <EndLabel end={s.source} className="mt-0.5" />
            </div>
            <ArrowDown className="mx-auto size-4 text-ash" aria-hidden />
          </>
        )}
        <div className="rounded-lg bg-subtle px-3 py-2.5">
          <p className="text-caption text-ash">
            To{s.destinations.length > 1 && ` ${s.destinations.length} places`}
          </p>
          <ul className="mt-0.5 flex flex-col gap-1.5">
            {s.destinations.map((d) => (
              <li key={`${d.server_id ?? d.storage_id}:${d.path}`}>
                <EndLabel end={d} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <dl className="mt-4 flex flex-col gap-3 text-body-sm">
        {archive ? (
          <div>
            <dt className="text-caption text-ash">Keeps</dt>
            <dd className="font-medium">
              {s.options.keep
                ? `The newest ${s.options.keep} archives in each place`
                : "Every archive"}
            </dd>
            <dd className="text-caption text-muted-foreground">
              Each run adds one .tar.gz named after the time it ran.
            </dd>
          </div>
        ) : (
          <div>
            <dt className="text-caption text-ash">Mode</dt>
            <dd className="font-medium">
              {mode.label}
              {s.options.mode === "snapshot" &&
                ` · keeps ${s.options.keep ? s.options.keep : "all"}`}
            </dd>
            <dd className="text-caption text-muted-foreground">{mode.hint}</dd>
          </div>
        )}
        {!!s.options.excludes?.length && (
          <div>
            <dt className="text-caption text-ash">Left out</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {s.options.excludes.map((x) => (
                <code
                  key={x}
                  className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-caption"
                >
                  {x}
                </code>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </Block>
  )
}

function VerifyFlow({ s, phone }: { s: Schedule; phone: boolean }) {
  const v = s.task?.verify
  // Only for the plan's name; a person who can't read the plans sees "one
  // plan" instead.
  const plans = useQuery({
    queryKey: backupKeys.plans(v?.database_id ?? ""),
    queryFn: () =>
      api.databaseBackups.listDatabaseBackupPlans(v?.database_id ?? ""),
    enabled: !!v?.plan_id,
    retry: false,
  })
  const plan = plans.data?.items.find((p) => p.id === v?.plan_id)
  return <TaskBlock s={s} phone={phone} facts={taskFacts(s, plan?.name)} />
}

// Where the thing a job runs lives, to open it from the job's page.
function taskLink(s: Schedule) {
  const t = s.task
  const gone = (kind: string, id?: string) =>
    !id || s.refs.some((r) => r.kind === kind && r.id === id && r.missing)
  switch (s.action) {
    case "script":
      return t?.script?.script_id && !gone("script", t.script.script_id)
        ? { href: `/scripts/${t.script.script_id}`, label: "Open the script" }
        : null
    case "ansible":
      return t?.ansible && !gone("playbook", t.ansible.playbook_id)
        ? {
            href: `/ansible/playbooks/${t.ansible.playbook_id}`,
            label: "Open the playbook",
          }
        : null
    case "verify-backup":
      return t?.verify && !gone("database", t.verify.database_id)
        ? {
            href: backupsHref(t.verify.database_id, "backups"),
            label: "Open the backups",
          }
        : null
    case "software-update":
      return { href: "/applications?tab=updates", label: "Open updates" }
  }
  return null
}

function TaskBlock({
  s,
  phone,
  facts,
}: {
  s: Schedule
  phone: boolean
  facts: { label: string; value: string }[]
}) {
  const link = taskLink(s)
  return (
    <Block
      title="What it does"
      phone={phone}
      action={
        link && (
          <Button
            variant="ghost"
            size="sm"
            className="max-md:h-11"
            render={<Link href={link.href} />}
            nativeButton={false}
          >
            {link.label}
            <ArrowUpRight />
          </Button>
        )
      }
    >
      <p className="mb-3 text-caption text-muted-foreground">
        {actionMeta[s.action]?.hint}
      </p>
      <dl className="flex flex-col gap-3 text-body-sm">
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="text-caption text-ash">{f.label}</dt>
            <dd className="font-medium break-words whitespace-pre-line">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </Block>
  )
}

function ScheduleFacts({ s, phone }: { s: Schedule; phone: boolean }) {
  const rows: [string, ReactNode][] = [
    [
      "Repeats",
      <>
        {cronText(s.cron)}{" "}
        <code className="ms-1 font-mono text-caption text-ash">{s.cron}</code>
      </>,
    ],
    ["Time zone", s.timezone],
    [
      "Next run",
      s.enabled ? formatInZone(s.next_run_at, s.timezone) : "Paused",
    ],
    [
      "Runs as",
      s.run_as_name || (
        <span className="text-destructive">Nobody: save it again</span>
      ),
    ],
    ["Changed", timeAgo(s.updated_at)],
  ]
  return (
    <Block title="Schedule" phone={phone}>
      <dl className="flex flex-col gap-3 text-body-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 text-end font-medium break-words">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </Block>
  )
}

const PAGE = 20

type StateFilter = "all" | "failed" | "partial" | "skipped"
const stateFilters: { value: StateFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "failed", label: "Failed" },
  { value: "partial", label: "Partly done" },
  { value: "skipped", label: "Skipped" },
]

function Runs({
  s,
  phone,
  onOpen,
}: {
  s: Schedule
  phone: boolean
  onOpen: (id: string) => void
}) {
  const [state, setState] = useState<StateFilter>("all")
  const [page, setPage] = useState(0)
  const query: RunsQuery = {
    limit: PAGE,
    offset: page * PAGE,
    ...(state === "all" ? {} : { state }),
  }
  const runs = useCronjobRuns(s.id, query)
  const items = runs.data?.items ?? []
  const total = runs.data?.total ?? 0

  const filter = (
    <div className="[scrollbar-width:none] overflow-x-auto">
      <Segmented
        label="Show"
        items={stateFilters}
        value={state}
        onChange={(v) => {
          setState(v)
          setPage(0)
        }}
      />
    </div>
  )

  let body: ReactNode
  if (runs.isPending) {
    body = (
      <div className="flex flex-col gap-3 py-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-5 w-3/5" />
      </div>
    )
  } else if (runs.isError && !runs.data) {
    body = (
      <p className="py-6 text-center text-body-sm text-muted-foreground">
        {runs.error.message}
      </p>
    )
  } else if (items.length === 0) {
    body = (
      <p className="py-8 text-center text-body-sm text-muted-foreground">
        {state === "all"
          ? s.enabled
            ? `No runs yet. The first one is ${formatInZone(s.next_run_at, s.timezone)}.`
            : "No runs yet."
          : "No runs like that."}
      </p>
    )
  } else if (phone) {
    body = (
      <ul className="-mx-4 divide-y divide-border border-y border-border">
        {items.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onOpen(r.id)}
              className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start active:bg-muted"
            >
              <span className="min-w-0 flex-1">
                <RunStateBadge state={r.state} dryRun={r.dry_run} />
                <span className="mt-0.5 block truncate text-caption text-muted-foreground">
                  {formatInZone(r.started_at ?? r.created_at, s.timezone)}
                  {r.trigger === "manual" && " · Run now"}
                  {resultText(r) && ` · ${resultText(r)}`}
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
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-y border-border text-start text-caption text-ash">
              <th className="px-5 py-2 text-start font-normal">Started</th>
              <th className="px-3 py-2 text-start font-normal">State</th>
              <th className="px-3 py-2 text-start font-normal">By</th>
              <th className="px-3 py-2 text-end font-normal">
                {usesDestinations(s.action) ? "Copied" : "Result"}
              </th>
              <th className="px-5 py-2 text-end font-normal">Took</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((r) => (
              <tr
                key={r.id}
                onClick={() => onOpen(r.id)}
                className="cursor-pointer hover:bg-subtle"
              >
                <td className="px-5 py-2.5 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpen(r.id)
                    }}
                    className="text-start outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {formatInZone(r.started_at ?? r.created_at, s.timezone)}
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <RunStateBadge state={r.state} dryRun={r.dry_run} />
                </td>
                <td className="max-w-40 truncate px-3 py-2.5 text-muted-foreground">
                  {r.trigger === "schedule"
                    ? "On time"
                    : r.created_by_name || "Run now"}
                </td>
                <td className="px-3 py-2.5 text-end whitespace-nowrap text-muted-foreground tabular-nums">
                  {resultText(r) || "—"}
                </td>
                <td className="px-5 py-2.5 text-end whitespace-nowrap text-muted-foreground tabular-nums">
                  {r.started_at ? duration(r.started_at, r.finished_at) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const pages = Math.ceil(total / PAGE)
  return (
    <Block
      title="Runs"
      phone={phone}
      action={
        total > 0 && (
          <span className="text-caption text-ash tabular-nums">
            {total.toLocaleString()} in all
          </span>
        )
      }
    >
      <div className="mb-3">{filter}</div>
      {body}
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-between gap-3 text-caption text-muted-foreground">
          <span className="tabular-nums">
            {page * PAGE + 1}–{Math.min(total, (page + 1) * PAGE)} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-11"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Newer
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-11"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Older
            </Button>
          </div>
        </div>
      )}
    </Block>
  )
}

// A run's outcome in a few words: files and bytes for the actions that move
// files, else how many servers or backups went through.
function resultText(r: ScheduleRun) {
  if (r.action === "sync" || r.action === "archive" || r.action === "fetch") {
    return sizeText(r)
  }
  if (runActive(r.state) || r.results.length === 0) return ""
  const done = r.results.filter((d) => d.state === "succeeded").length
  const skipped = r.results.filter((d) => d.state === "skipped").length
  return [
    `${done} of ${r.results.length} done`,
    skipped ? `${skipped} skipped` : "",
  ]
    .filter(Boolean)
    .join(" · ")
}

function sizeText(r: ScheduleRun) {
  if (runActive(r.state) || (!r.files && !r.bytes)) return ""
  const files = r.files === 1 ? "1 file" : `${r.files.toLocaleString()} files`
  return r.bytes ? `${files} · ${formatSize(r.bytes)}` : files
}

function Loading({ phone }: { phone: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4", phone ? "p-4" : "px-6 pt-6")}>
      <Skeleton className="h-8 w-60" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}
