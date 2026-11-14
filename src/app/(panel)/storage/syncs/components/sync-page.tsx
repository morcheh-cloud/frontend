"use client"

import {
  ArrowDownUp,
  ChevronLeft,
  CircleCheck,
  CloudOff,
  Ellipsis,
  FlaskConical,
  Hourglass,
  Pencil,
  Play,
  RotateCcw,
  ShieldCheck,
  Square,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { parseAsString, useQueryState } from "nuqs"
import { type ReactNode, useRef } from "react"

import {
  duration,
  formatInZone,
  RunStateBadge,
} from "@/app/(panel)/cronjobs/components/meta"
import {
  Empty,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { guideHref } from "@/components/help/guides"
import { HelpButton } from "@/components/help/help-link"
import { usePageCrumbs } from "@/components/panel/breadcrumbs"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useBack } from "@/hooks/useBack"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type {
  ReplicationState,
  StorageSync,
  StorageSyncRun,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  runActive,
  useReplication,
  useStorageSync,
  useSyncRun,
  useSyncRuns,
} from "../api"
import { Bar, Flow, LiveProgress, progressShare, progressText } from "./flow"
import {
  editSyncHref,
  engineMeta,
  existingMeta,
  isReplication,
  isRunning,
  kindMeta,
  modeMeta,
  nextRunText,
  runSummary,
  StateLabel,
  syncState,
  timingText,
  triggerMeta,
  triggerText,
} from "./meta"
import { useSyncCan } from "./permissions"
import { useSyncActions, useSyncMenu } from "./sync-actions"

const listHref = (s: Pick<StorageSync, "kind">) =>
  `/storage?tab=${s.kind === "migrate" ? "migrations" : "syncs"}`

// /storage/syncs/[id] reads its id from the route.
export function SyncPageFromRoute() {
  const { id } = useParams<{ id: string }>()
  return <SyncPage id={id} />
}

export function SyncPage({ id }: { id: string }) {
  const phone = useIsPhone()
  const query = useStorageSync(id)
  if (phone === null) return null
  if (query.isPending) return <Loading phone={phone} />
  if (!query.data) {
    const gone =
      query.error instanceof ApiError && [403, 404].includes(query.error.status)
    return (
      <div className="px-4 pt-10 md:px-6">
        <Empty
          icon={ArrowDownUp}
          title={gone ? "This sync isn't here" : "Couldn't load the sync"}
          body={
            gone
              ? "It was deleted, or you don't have access to it."
              : query.error?.message
          }
          action={
            <Button
              variant="outline"
              className="h-11 w-full md:h-9 md:w-auto"
              render={<Link href="/storage?tab=syncs" />}
              nativeButton={false}
            >
              Back to syncs
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
    parseAsString.withOptions({ history: "push" }),
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

function Page({ s, phone }: { s: StorageSync; phone: boolean }) {
  const router = useRouter()
  const can = useSyncCan(s.workspace_id)
  const a = useSyncActions()
  const back = useBack(listHref(s))
  const { run, open, close } = useRunParam()
  const [sheet, setSheet] = useOpen("sync-page-menu")
  const menu = useSyncMenu(s, {
    onPage: true,
    after: () => router.replace(listHref(s)),
  })
  const replication = isReplication(s)

  usePageCrumbs([
    { href: listHref(s), label: kindMeta[s.kind].plural },
    { href: `/storage/syncs/${s.id}`, label: s.name },
  ])

  const busy = isRunning(s)
  const blocked = !!s.problem || busy || a.running
  const KindIcon = kindMeta[s.kind].icon

  const buttons =
    can.run &&
    (replication ? (
      <Button
        variant="outline"
        className={phone ? "h-11 flex-1" : "h-9"}
        disabled={s.paused || !!s.problem || a.resyncing}
        onClick={() => a.resync(s)}
      >
        <RotateCcw />
        Copy everything again
      </Button>
    ) : (
      <>
        <Button
          variant="outline"
          className={phone ? "h-11 flex-1" : "h-9"}
          disabled={blocked}
          onClick={() => a.run(s, { dryRun: true })}
        >
          <FlaskConical />
          Test run
        </Button>
        <Button
          className={phone ? "h-11 flex-1" : "h-9"}
          disabled={blocked}
          onClick={() => a.run(s)}
        >
          <Play />
          {busy
            ? "Running…"
            : s.kind === "migrate"
              ? s.last_run?.id
                ? "Run again"
                : "Start"
              : "Run now"}
        </Button>
      </>
    ))

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
          render={<Link href={editSyncHref(s.id)} />}
          nativeButton={false}
        >
          Fix
        </Button>
      )}
    </div>
  )

  const live = busy && s.last_run?.id && (
    <LiveRun s={s} phone={phone} onOpen={open} />
  )

  const layer = <RunLayer runId={run} onClose={close} phone={phone} s={s} />

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
          <HelpButton
            href={guideHref(
              "storage",
              replication
                ? "replication"
                : s.kind === "migrate"
                  ? "migrate"
                  : "sync",
            )}
            label="Storage guide"
          />
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
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-label text-caption tracking-label text-ash uppercase">
              {kindMeta[s.kind].label} · {engineMeta[s.engine].short}
            </span>
            <StateLabel sync={s} />
          </div>
          <Flow sync={s} />
          <p className="text-caption text-muted-foreground">{timingText(s)}</p>
        </div>
        {problem}
        {buttons && <div className="flex gap-2 px-4 pb-4">{buttons}</div>}
        {live}
        {replication ? (
          <ReplicationPanel s={s} phone />
        ) : (
          <>
            <LastRun s={s} phone onOpen={open} />
            <Held s={s} phone />
            <Runs s={s} phone onOpen={open} />
          </>
        )}
        <Settings s={s} phone />
        <BottomSheet open={sheet} onOpenChange={setSheet} title={s.name}>
          <SheetItems groups={menu} onOpenChange={setSheet} />
        </BottomSheet>
        {layer}
      </div>
    )
  }

  const st = syncState(s)
  return (
    <div className="flex flex-col gap-5 px-6 pt-5 pb-12">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-linear-to-br from-brand-soft/70 via-card to-card p-6 lg:p-8">
        <div className="flex flex-wrap items-start gap-4">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl",
              replication
                ? "bg-brand text-primary-foreground"
                : "bg-card text-brand shadow-sm",
            )}
          >
            <KindIcon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-label text-caption tracking-label text-ash uppercase">
              {kindMeta[s.kind].label} · {engineMeta[s.engine].label}
            </p>
            <h1 className="mt-1 truncate text-heading font-light">{s.name}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {buttons}
            {can.edit && (
              <Button
                variant="outline"
                size="icon"
                className="size-9"
                aria-label="Edit"
                title="Edit"
                render={<Link href={editSyncHref(s.id)} />}
                nativeButton={false}
              >
                <Pencil />
              </Button>
            )}
            <ItemMenu
              groups={menu
                .slice(1)
                .map((g) => g.filter((i) => i.key !== "edit"))}
              label="Sync actions"
            />
          </div>
        </div>
        <Flow sync={s} size="lg" className="mt-8 max-w-3xl" />
        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
          <HeroFact label="State">
            <StateLabel sync={s} className="text-body" />
          </HeroFact>
          {!replication && s.kind === "sync" && (
            <HeroFact label="Mode">{modeMeta[s.mode].label}</HeroFact>
          )}
          {!replication && s.kind === "sync" && (
            <HeroFact label="When">
              {triggerText(s)}
              {s.paused && st.tone !== "problem" && (
                <span className="text-ash"> · paused</span>
              )}
            </HeroFact>
          )}
          {replication && (
            <HeroFact label="Copies">
              {s.options.replication?.sync
                ? "Before writes finish"
                : "Right after each write"}
            </HeroFact>
          )}
          {!replication && s.last_run?.id && (
            <HeroFact label="Last run">
              {timeAgo(s.last_run.finished_at ?? s.last_run.at)}
            </HeroFact>
          )}
          {!replication && !s.paused && s.next_run_at && (
            <HeroFact label="Next run">{timeAgo(s.next_run_at)}</HeroFact>
          )}
          {s.held_count > 0 && (
            <HeroFact label="Deletions waiting">{s.held_count}</HeroFact>
          )}
        </dl>
      </section>
      {problem}
      {live}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {replication ? (
            <ReplicationPanel s={s} phone={false} />
          ) : (
            <>
              <LastRun s={s} phone={false} onOpen={open} />
              <Runs s={s} phone={false} onOpen={open} />
            </>
          )}
        </div>
        <div className="flex flex-col gap-5">
          {!replication && <Held s={s} phone={false} />}
          <Settings s={s} phone={false} />
        </div>
      </div>
      {layer}
    </div>
  )
}

function HeroFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-ash">{label}</dt>
      <dd className="mt-0.5 text-body">{children}</dd>
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
          : "rounded-2xl border border-border bg-card p-5",
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

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: "problem" | "warning" | "ok"
}) {
  return (
    <div className="min-w-0 rounded-xl bg-subtle p-3">
      <p className="truncate text-caption text-ash">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-subheading font-light tabular-nums",
          tone === "problem" && "text-destructive",
          tone === "warning" && "text-warning",
          tone === "ok" && "text-success",
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 truncate text-caption text-muted-foreground tabular-nums">
          {sub}
        </p>
      )}
    </div>
  )
}

// The run going now, with its progress.
function LiveRun({
  s,
  phone,
  onOpen,
}: {
  s: StorageSync
  phone: boolean
  onOpen: (id: string) => void
}) {
  const a = useSyncActions()
  const can = useSyncCan(s.workspace_id)
  const id = s.last_run.id
  return (
    <section
      className={cn(
        "flex flex-col gap-3",
        phone
          ? "border-t border-border p-4"
          : "rounded-2xl border border-brand/30 bg-brand-soft/40 p-5",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="size-2 shrink-0 animate-pulse rounded-full bg-brand" />
        <h2 className="min-w-0 flex-1 truncate text-body font-medium">
          {s.last_run.dry_run ? "Test run going" : "Running now"}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="max-md:h-11"
          onClick={() => onOpen(id)}
        >
          Details
        </Button>
        {can.run && (
          <Button
            variant="outline"
            size="sm"
            className="max-md:h-11"
            onClick={() => a.cancelRun(id)}
          >
            <Square />
            Stop
          </Button>
        )}
      </div>
      <LiveProgress runId={id} />
    </section>
  )
}

// The last finished real run, in numbers.
function LastRun({
  s,
  phone,
  onOpen,
}: {
  s: StorageSync
  phone: boolean
  onOpen: (id: string) => void
}) {
  const runs = useSyncRuns(s.id, 30)
  const last = runs.data?.find((r) => !r.dry_run && !runActive(r.state))
  if (!last) return null
  const x = last.result
  const verify = x?.verify
  return (
    <Block
      title={s.kind === "migrate" ? "Last migration" : "Last run"}
      phone={phone}
      action={
        <button
          type="button"
          onClick={() => onOpen(last.id)}
          className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-body-sm text-muted-foreground hover:bg-muted md:min-h-8"
        >
          <RunStateBadge state={last.state} />
          <span className="text-ash">
            {timeAgo(last.finished_at ?? last.created_at)}
          </span>
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile
          label="Copied"
          value={x?.copied ?? 0}
          sub={formatSize(x?.bytes ?? 0)}
        />
        <Tile label="Already there" value={x?.skipped ?? 0} />
        {s.kind === "sync" && s.mode === "mirror" ? (
          <Tile
            label="Deleted"
            value={x?.deleted ?? 0}
            sub={x?.held ? `${x.held} waiting` : undefined}
          />
        ) : s.kind === "migrate" && s.options.delete_source ? (
          <Tile
            label="Removed from source"
            value={x?.removed ?? 0}
            sub={x?.remove_failed ? `${x.remove_failed} couldn't` : undefined}
            tone={x?.remove_failed ? "warning" : undefined}
          />
        ) : (
          <Tile
            label="Took"
            value={duration(last.started_at, last.finished_at) || "—"}
          />
        )}
        <Tile
          label="Failed"
          value={x?.failed ?? 0}
          tone={x?.failed ? "problem" : undefined}
          sub={x?.waiting ? `${x.waiting} still settling` : undefined}
        />
      </div>
      {verify && (
        <div
          className={cn(
            "mt-3 flex items-start gap-3 rounded-xl px-3 py-2.5 text-body-sm",
            verify.missing || verify.different
              ? "bg-warning/10"
              : "bg-success/10",
          )}
        >
          {verify.missing || verify.different ? (
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          ) : (
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
          )}
          <p className="min-w-0">
            {verify.missing || verify.different
              ? `${verify.missing} missing and ${verify.different} different out of ${verify.checked} checked.`
              : `All ${verify.checked} files checked: they're on the destination with the same size.`}
          </p>
        </div>
      )}
      {last.error && (
        <p className="mt-3 text-body-sm break-words text-destructive">
          {last.error}
        </p>
      )}
    </Block>
  )
}

function Runs({
  s,
  phone,
  onOpen,
}: {
  s: StorageSync
  phone: boolean
  onOpen: (id: string) => void
}) {
  const runs = useSyncRuns(s.id, 30)
  const items = runs.data ?? []
  return (
    <Block title="Runs" phone={phone}>
      {runs.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : runs.isError ? (
        <p className="text-body-sm text-destructive">{runs.error.message}</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-subtle px-4 py-8 text-center">
          <Hourglass className="size-5 text-ash" />
          <p className="text-body-sm text-muted-foreground">
            {s.kind === "migrate"
              ? "Not started yet. Try a test run to see what it would copy."
              : s.trigger === "manual"
                ? "No runs yet. It runs when you press Run now."
                : `No runs yet. ${s.next_run_at ? `The first one is ${timeAgo(s.next_run_at)}.` : ""}`}
          </p>
        </div>
      ) : (
        <ul className={cn("flex flex-col", phone ? "-mx-4" : "-mx-2")}>
          {items.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onOpen(r.id)}
                className={cn(
                  "flex w-full items-center gap-3 text-start hover:bg-muted",
                  phone ? "min-h-14 px-4 py-2" : "rounded-lg p-2",
                )}
              >
                <div className="min-w-0 flex-1">
                  <RunStateBadge state={r.state} dryRun={r.dry_run} />
                  <p className="mt-0.5 truncate text-caption text-muted-foreground tabular-nums">
                    {runActive(r.state)
                      ? progressText(r)
                      : runSummary(r) || r.error}
                  </p>
                </div>
                <div className="shrink-0 text-end text-caption text-ash tabular-nums">
                  <p>{timeAgo(r.created_at)}</p>
                  <p>
                    {r.trigger === "manual"
                      ? r.created_by_name || "By hand"
                      : triggerMeta[r.trigger].label}
                    {r.started_at &&
                      ` · ${duration(r.started_at, r.finished_at)}`}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Block>
  )
}

// A mirror with a delete delay: what it will delete, and when.
function Held({ s, phone }: { s: StorageSync; phone: boolean }) {
  if (s.held_count === 0) return null
  const shown = s.held ?? []
  return (
    <Block title={`Deletions waiting · ${s.held_count}`} phone={phone}>
      <p className="mb-3 text-caption text-muted-foreground">
        Gone from the source, still on the destination. Each goes on the first
        run after its time, unless it comes back to the source first.
      </p>
      <ul className="flex flex-col divide-y divide-border">
        {shown.map((h) => (
          <li key={h.path} className="flex items-center gap-3 py-2">
            <Trash2 className="size-4 shrink-0 text-ash" />
            <span className="min-w-0 flex-1 truncate font-mono text-caption">
              {h.path}
            </span>
            <span className="shrink-0 text-caption text-ash">
              {timeAgo(h.due)}
            </span>
          </li>
        ))}
      </ul>
      {s.held_count > shown.length && (
        <p className="mt-2 text-caption text-ash">
          And {s.held_count - shown.length} more.
        </p>
      )}
    </Block>
  )
}

// MinIO's own numbers for the replication rule.
function ReplicationPanel({ s, phone }: { s: StorageSync; phone: boolean }) {
  const q = useReplication(s.id, !s.paused)
  const r = q.data?.state
  const n = s.native
  return (
    <>
      <Block
        title="Replication"
        phone={phone}
        action={
          s.paused ? (
            <span className="text-body-sm text-muted-foreground">
              Turned off
            </span>
          ) : r ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-body-sm",
                r.online ? "text-success" : "text-destructive",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  r.online ? "bg-success" : "bg-destructive",
                )}
              />
              {r.online ? "Destination reachable" : "Destination unreachable"}
            </span>
          ) : null
        }
      >
        {s.paused ? (
          <Quiet icon={CloudOff}>
            The rule stays on {s.source.name}, but MinIO copies nothing until
            it's turned on again. Changes made meanwhile are copied once it's
            back on, if “Copy what's already there” is on.
          </Quiet>
        ) : q.isPending ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : q.isError || q.data?.error ? (
          <Quiet icon={TriangleAlert} tone="problem">
            Couldn't ask {s.source.name}: {q.data?.error || q.error?.message}
          </Quiet>
        ) : r ? (
          <ReplicationNumbers r={r} />
        ) : null}
      </Block>
      {r?.resync?.status && (
        <Block title="Copying everything again" phone={phone}>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3 text-body-sm">
              <span className="font-medium capitalize">{r.resync.status}</span>
              <span className="text-caption text-ash">
                {r.resync.started && `Started ${timeAgo(r.resync.started)}`}
                {r.resync.ended && ` · ended ${timeAgo(r.resync.ended)}`}
              </span>
            </div>
            {!r.resync.ended && <Bar done={null} />}
            <p className="text-caption text-muted-foreground tabular-nums">
              {r.resync.replicated} copied · {formatSize(r.resync.bytes)}
              {r.resync.failed > 0 && ` · ${r.resync.failed} failed`}
            </p>
            {r.resync.object && !r.resync.ended && (
              <p className="truncate font-mono text-caption text-ash">
                {r.resync.object}
              </p>
            )}
          </div>
        </Block>
      )}
      {n?.bucket && (
        <Block title="On MinIO" phone={phone}>
          <Rows
            items={[
              { label: "Rule on bucket", value: n.bucket, mono: true },
              { label: "Copies into", value: n.target_bucket, mono: true },
              {
                label: "Objects under",
                value: n.prefix ? `${n.prefix}/` : "The whole bucket",
                mono: !!n.prefix,
              },
              ...(n.endpoint
                ? [{ label: "Reaches it at", value: n.endpoint, mono: true }]
                : []),
            ]}
          />
        </Block>
      )}
    </>
  )
}

function ReplicationNumbers({ r }: { r: ReplicationState }) {
  return (
    <div className="flex flex-col gap-3">
      {!r.rule_found && (
        <div className="flex items-start gap-3 rounded-xl bg-warning/10 px-3 py-2.5 text-body-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            The rule isn't on the source bucket any more (someone removed it in
            MinIO). Save the sync again to put it back.
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile
          label="Waiting"
          value={r.pending}
          sub={formatSize(r.pending_bytes)}
          tone={r.pending > 0 ? "warning" : undefined}
        />
        <Tile
          label="Copied"
          value={r.replicated}
          sub={formatSize(r.bytes)}
          tone={
            r.replicated > 0 && r.pending === 0 && r.failed === 0
              ? "ok"
              : undefined
          }
        />
        <Tile
          label="Failed"
          value={r.failed}
          sub={
            r.failed_last_hour
              ? `${r.failed_last_hour} in the last hour`
              : formatSize(r.failed_bytes)
          }
          tone={r.failed > 0 ? "problem" : undefined}
        />
        <Tile
          label="Speed"
          value={`${formatSize(r.bandwidth)}/s`}
          sub={
            r.bandwidth_limit
              ? `Limit ${formatSize(r.bandwidth_limit)}/s`
              : r.latency_ms !== undefined
                ? `${Math.round(r.latency_ms)} ms away`
                : undefined
          }
        />
      </div>
      {r.pending === 0 && r.failed === 0 && r.rule_found && (
        <p className="flex items-center gap-2 text-caption text-muted-foreground">
          <CircleCheck className="size-4 text-success" />
          Nothing waiting: the destination is caught up.
        </p>
      )}
    </div>
  )
}

function Quiet({
  icon: Icon,
  tone,
  children,
}: {
  icon: typeof CloudOff
  tone?: "problem"
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-subtle px-4 py-3 text-body-sm text-muted-foreground">
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "problem" ? "text-destructive" : "text-ash",
        )}
      />
      <p className="min-w-0 break-words">{children}</p>
    </div>
  )
}

function Rows({
  items,
}: {
  items: { label: string; value: ReactNode; mono?: boolean }[]
}) {
  return (
    <dl className="flex flex-col divide-y divide-border">
      {items.map((f) => (
        <div
          key={f.label}
          className="flex items-baseline justify-between gap-4 py-2 text-body-sm"
        >
          <dt className="shrink-0 text-muted-foreground">{f.label}</dt>
          <dd
            className={cn(
              "min-w-0 text-end break-words",
              f.mono && "font-mono text-caption",
            )}
          >
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

const yes = (on?: boolean) => (on ? "Yes" : "No")

function Settings({ s, phone }: { s: StorageSync; phone: boolean }) {
  const o = s.options
  const r = o.replication
  const excludes = o.excludes ?? []
  const items: { label: string; value: ReactNode; mono?: boolean }[] = []
  if (isReplication(s)) {
    items.push(
      { label: "Copy what's already there", value: yes(r?.existing) },
      { label: "Copy deletions", value: yes(r?.deletes) },
      { label: "Wait for the copy", value: yes(r?.sync) },
      {
        label: "Speed limit",
        value: r?.bandwidth_mbps ? `${r.bandwidth_mbps} Mbit/s` : "None",
      },
    )
  } else {
    if (s.kind === "sync") {
      items.push(
        { label: "Mode", value: modeMeta[s.mode].label },
        { label: "When", value: triggerText(s) },
      )
      if (s.trigger === "schedule")
        items.push({ label: "Time zone", value: s.timezone })
      if (!s.paused && s.next_run_at)
        items.push({ label: "Next run", value: nextRunText(s) })
    }
    items.push({
      label: "Already there",
      value:
        existingMeta[(o.existing as keyof typeof existingMeta) || "changed"]
          ?.label,
    })
    if (s.kind === "sync") {
      items.push({
        label: "Settle time",
        value: o.settle_minutes ? `${o.settle_minutes} min` : "None",
      })
      if (s.mode === "mirror")
        items.push({
          label: "Wait before deleting",
          value: o.delete_delay_hours ? `${o.delete_delay_hours} h` : "None",
        })
    } else {
      items.push(
        { label: "Check every file", value: yes(o.verify) },
        { label: "Empty the source", value: yes(o.delete_source) },
      )
    }
    items.push({
      label: "Leave out",
      value: excludes.length ? excludes.join(", ") : "Nothing",
      mono: excludes.length > 0,
    })
  }
  return (
    <Block
      title="Settings"
      phone={phone}
      action={
        !phone && (
          <Link
            href={editSyncHref(s.id)}
            className="text-body-sm text-brand hover:underline"
          >
            Edit
          </Link>
        )
      }
    >
      <Rows items={items} />
      {!isReplication(s) && s.runs_as && (
        <p className="mt-3 flex items-start gap-2 text-caption text-muted-foreground">
          <ShieldCheck className="mt-px size-4 shrink-0 text-ash" />
          Runs with {s.runs_as}'s access, who saved it last.
        </p>
      )}
    </Block>
  )
}

// One run: a side sheet on desktop, a full bottom sheet on phones.
function RunLayer({
  runId,
  onClose,
  phone,
  s,
}: {
  runId: string | null
  onClose: () => void
  phone: boolean
  s: StorageSync
}) {
  const query = useSyncRun(runId)
  const run = query.data
  const can = useSyncCan(s.workspace_id)
  const a = useSyncActions()
  const title = run
    ? run.dry_run
      ? "Test run"
      : "Run"
    : query.isError
      ? "Run not found"
      : "Run"
  const change = (next: boolean) => {
    if (!next) onClose()
  }
  const body = query.isPending ? (
    <div className="flex flex-col gap-3 py-2">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  ) : !run ? (
    <p className="py-2 text-body-sm text-muted-foreground">
      {query.error?.message ?? "It was deleted."}
    </p>
  ) : (
    <RunBody run={run} s={s} />
  )
  const footer =
    run && runActive(run.state) && can.run ? (
      <Button
        variant="outline"
        className="h-11 md:h-9"
        onClick={() => a.cancelRun(run.id)}
      >
        <Square />
        Stop
      </Button>
    ) : undefined

  if (phone) {
    return (
      <BottomSheet
        open={!!runId}
        onOpenChange={change}
        title={title}
        full
        footer={footer}
      >
        <div className="px-2">{body}</div>
      </BottomSheet>
    )
  }
  return (
    <Sheet open={!!runId} onOpenChange={change}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-body">{title}</SheetTitle>
          {run && (
            <SheetDescription className="text-caption text-ash">
              {formatInZone(
                run.started_at ?? run.created_at,
                s.timezone || "UTC",
              )}{" "}
              · {s.timezone || "UTC"}
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

function RunBody({ run, s }: { run: StorageSyncRun; s: StorageSync }) {
  const x = run.result
  const active = runActive(run.state)
  const share = progressShare(run)
  const numbers: {
    label: string
    value: ReactNode
    tone?: "problem" | "warning"
  }[] = x
    ? [
        {
          label: run.dry_run ? "Would copy" : "Copied",
          value: `${x.copied} · ${formatSize(x.bytes)}`,
        },
        { label: "Already there", value: x.skipped },
        ...(x.deleted || (s.kind === "sync" && s.mode === "mirror")
          ? [
              {
                label: run.dry_run ? "Would delete" : "Deleted",
                value: x.deleted,
              },
            ]
          : []),
        ...(x.held ? [{ label: "Deletions waiting", value: x.held }] : []),
        ...(x.waiting ? [{ label: "Still settling", value: x.waiting }] : []),
        ...(x.removed !== undefined && s.options.delete_source
          ? [{ label: "Removed from source", value: x.removed }]
          : []),
        ...(x.remove_failed
          ? [
              {
                label: "Couldn't remove",
                value: x.remove_failed,
                tone: "warning" as const,
              },
            ]
          : []),
        {
          label: "Failed",
          value: x.failed,
          tone: x.failed ? ("problem" as const) : undefined,
        },
      ]
    : []
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <RunStateBadge state={run.state} dryRun={run.dry_run} />
        <span className="text-caption text-ash">
          {run.trigger === "manual"
            ? `Started by ${run.created_by_name || "hand"}`
            : triggerMeta[run.trigger].label}
          {run.started_at && ` · ${duration(run.started_at, run.finished_at)}`}
        </span>
      </div>
      {run.dry_run && (
        <div className="flex items-start gap-3 rounded-xl bg-brand-soft/60 px-3 py-2.5 text-body-sm">
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-brand" />
          <p>A test run only looks: nothing was copied or deleted.</p>
        </div>
      )}
      {active && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-caption">
            <span className="truncate font-medium">
              {run.progress?.phase || run.phase || "Working"}
            </span>
            {share !== null && (
              <span className="text-ash tabular-nums">
                {Math.round(share * 100)}%
              </span>
            )}
          </div>
          <Bar done={share} />
          <span className="text-caption text-muted-foreground tabular-nums">
            {progressText(run)}
          </span>
          {run.progress?.current && (
            <span className="truncate font-mono text-caption text-ash">
              {run.progress.current}
            </span>
          )}
        </div>
      )}
      {run.error && (
        <p className="rounded-xl bg-destructive/5 px-3 py-2.5 text-body-sm break-words text-destructive">
          {run.error}
        </p>
      )}
      {numbers.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {numbers.map((n) => (
            <Tile key={n.label} label={n.label} value={n.value} tone={n.tone} />
          ))}
        </div>
      )}
      {x?.verify && (
        <section className="flex flex-col gap-2">
          <h3 className="text-body-sm font-medium">Check</h3>
          <p className="text-body-sm text-muted-foreground">
            {x.verify.checked} checked · {x.verify.missing} missing ·{" "}
            {x.verify.different} different size
          </p>
          <Problems items={x.verify.problems} />
        </section>
      )}
      {x?.kept_source && (
        <p className="text-body-sm text-muted-foreground">{x.kept_source}</p>
      )}
      {x?.problems && x.problems.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-body-sm font-medium">Problems</h3>
          <Problems items={x.problems} />
        </section>
      )}
    </div>
  )
}

function Problems({ items }: { items?: string[] }) {
  if (!items?.length) return null
  return (
    <ul className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto rounded-xl border border-border">
      {items.map((p, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: lines can repeat
          key={i}
          className="px-3 py-2 font-mono text-caption break-words"
        >
          {p}
        </li>
      ))}
    </ul>
  )
}

function Loading({ phone }: { phone: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4", phone ? "p-4" : "px-6 pt-5")}>
      <Skeleton className="h-64 w-full rounded-3xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}
