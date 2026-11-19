"use client"

import type { UseQueryResult } from "@tanstack/react-query"
import {
  ArrowRight,
  Ellipsis,
  GitCompareArrows,
  History,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryStates } from "nuqs"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { cronText } from "@/app/(panel)/cronjobs/components/meta"
import {
  type Item,
  ItemMenu,
  SheetItems,
  StateDot,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { BottomSheet } from "@/components/bottom-sheet"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import type { DatabaseSync } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  syncRunActive,
  useDeleteSync,
  usePauseSync,
  useRunSync,
} from "../../../api"
import { stateLabel, stateTone } from "../backups/meta"
import { Blank, useDashboard } from "../parts"
import {
  endText,
  modeMeta,
  newSyncHref,
  syncHref,
  syncsParsers,
  triggerText,
} from "./meta"
import { RunsLayer, SyncRunLayer } from "./run-layer"

export function NewSyncButton({
  size,
  className,
  outline,
}: {
  size?: "sm"
  className?: string
  outline?: boolean
}) {
  const { database: d } = useDashboard()
  return (
    <Button
      size={size}
      variant={outline ? "outline" : "default"}
      className={cn("max-md:h-11", className)}
      render={<Link href={newSyncHref(d.id)} />}
      nativeButton={false}
    >
      <Plus />
      New sync
    </Button>
  )
}

export function SyncList({ query }: { query: UseQueryResult<DatabaseSync[]> }) {
  const { database: d, phone, operator } = useDashboard()
  const [{ run }, setView] = useQueryStates(syncsParsers)
  const [historyOf, setHistoryOf] = useState<DatabaseSync>()
  const [historyOpen, setHistoryOpen] = useOpen("database-sync-runs")
  const syncs = query.data ?? []

  const openRun = (id: string) => void setView({ run: id })
  const showHistory = (s: DatabaseSync) => {
    setHistoryOf(s)
    setHistoryOpen(true)
  }

  return (
    <>
      {phone && operator && (
        <div className="px-4">
          <NewSyncButton outline className="w-full" />
        </div>
      )}
      {syncs.length === 0 ? (
        <div className={cn(phone && "px-4")}>
          <Blank
            title="No syncs yet"
            body="Copy this database into another one, by hand or every few minutes: chosen tables, a full mirror, only new rows, or a fresh dump. Compare first to see what would change."
            action={operator && !phone ? <NewSyncButton /> : undefined}
          />
        </div>
      ) : (
        <ul
          className={cn(
            "grid gap-3",
            phone
              ? "grid-cols-[minmax(0,1fr)] gap-0 divide-y divide-border border-y border-border"
              : "grid-cols-[repeat(auto-fill,minmax(min(100%,30rem),1fr))]",
          )}
        >
          {syncs.map((s) => (
            <SyncCard
              key={s.id}
              s={s}
              here={d.id}
              onRun={openRun}
              onHistory={() => showHistory(s)}
            />
          ))}
        </ul>
      )}
      <SyncRunLayer
        id={run ?? undefined}
        onClose={() => void setView({ run: null })}
      />
      <RunsLayer
        sync={historyOf}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onPick={openRun}
      />
    </>
  )
}

function SyncCard({
  s,
  here,
  onRun,
  onHistory,
}: {
  s: DatabaseSync
  here: string
  onRun: (id: string) => void
  onHistory: () => void
}) {
  const { phone } = useDashboard()
  const meta = modeMeta[s.mode]
  const Icon = meta.icon
  const last = s.last_run
  const busy = syncRunActive(last)
  const { items: menu, dialog } = useSyncMenu(s, here, { onRun, onHistory })
  const [sheetOpen, setSheetOpen] = useOpen(`database-sync-${s.id}`)
  const outgoing = s.source.database_id === here

  const body = (
    <>
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium">{s.name}</p>
          <p className="truncate text-caption text-muted-foreground">
            {meta.label} · {s.paused ? "Paused" : triggerText(s, cronText)}
          </p>
        </div>
        {!phone && <SyncButtons s={s} menu={menu} onRun={onRun} />}
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-2 rounded-lg bg-subtle px-3 py-2 text-caption">
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            outgoing ? "font-medium" : "text-muted-foreground",
          )}
          title={endText(s.source)}
        >
          {endText(s.source)}
        </span>
        <ArrowRight className="size-3.5 shrink-0 text-ash" />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-end",
            !outgoing ? "font-medium" : "text-muted-foreground",
          )}
          title={endText(s.target)}
        >
          {endText(s.target)}
        </span>
      </div>
      <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
        {s.problem ? (
          <span className="text-warning">{s.problem}</span>
        ) : last?.id ? (
          <>
            <StateDot
              tone={busy ? "muted" : stateTone(last.state)}
              label={`${last.dry_run ? "Compare" : "Run"}: ${stateLabel(last.state)}`}
            />
            <span>{timeAgo(last.at)}</span>
            {last.error && (
              <span className="min-w-0 truncate text-warning">
                {last.error}
              </span>
            )}
          </>
        ) : (
          <span>Never run</span>
        )}
        {s.next_run_at && !s.paused && (
          <span className="ms-auto text-ash">
            Next {timeAgo(s.next_run_at)}
          </span>
        )}
      </div>
    </>
  )

  if (phone) {
    return (
      <li>
        <button
          type="button"
          className="block w-full px-4 py-3 text-start active:bg-muted"
          onClick={() => setSheetOpen(true)}
        >
          {body}
        </button>
        <BottomSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={s.name}
        >
          <SheetItems groups={menu} onOpenChange={setSheetOpen} />
        </BottomSheet>
        {dialog}
      </li>
    )
  }
  return (
    <li className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm">
      {body}
      {dialog}
    </li>
  )
}

function SyncButtons({
  s,
  menu,
  onRun,
}: {
  s: DatabaseSync
  menu: Item[][]
  onRun: (id: string) => void
}) {
  const { operator } = useDashboard()
  const start = useStart(onRun)
  const busy = syncRunActive(s.last_run) || start.isPending
  return (
    <span className="flex shrink-0 items-center gap-1">
      {operator && (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Compare: see what would change, nothing is written"
            aria-label={`Compare: ${s.name}`}
            disabled={busy || !!s.problem}
            onClick={() => start.mutate(s, true)}
          >
            <GitCompareArrows />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Run now"
            aria-label={`Run now: ${s.name}`}
            disabled={busy || !!s.problem}
            onClick={() => start.mutate(s, false)}
          >
            <Play />
          </Button>
        </>
      )}
      <ItemMenu
        groups={menu}
        label="Sync actions"
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Sync actions">
            <Ellipsis />
          </Button>
        }
      />
    </span>
  )
}

// Starts a run or a compare; opens its layer once it's queued.
function useStart(onRun: (id: string) => void) {
  const run = useRunSync()
  const { track } = useJobActions()
  return {
    isPending: run.isPending,
    mutate: (s: DatabaseSync, dry: boolean) =>
      run.mutate(
        { id: s.id, dry },
        {
          onSuccess: (r) => {
            track(r.job)
            onRun(r.run.id)
          },
          onError: (err) => toast.error(err.message),
        },
      ),
  }
}

function useSyncMenu(
  s: DatabaseSync,
  here: string,
  { onRun, onHistory }: { onRun: (id: string) => void; onHistory: () => void },
): { items: Item[][]; dialog: ReactNode } {
  const { operator } = useDashboard()
  const router = useRouter()
  const start = useStart(onRun)
  const pause = usePauseSync()
  const remove = useDeleteSync()
  const [confirm, setConfirm] = useState(false)
  const busy = syncRunActive(s.last_run)
  const blocked = busy || !!s.problem

  const items: Item[][] = [
    operator
      ? [
          {
            key: "compare",
            label: "Compare",
            icon: <GitCompareArrows />,
            disabled: blocked,
            onSelect: () => start.mutate(s, true),
          },
          {
            key: "run",
            label: "Run now",
            icon: <Play />,
            disabled: blocked,
            onSelect: () => start.mutate(s, false),
          },
        ]
      : [],
    [
      {
        key: "history",
        label: "Runs",
        icon: <History />,
        onSelect: onHistory,
      },
      ...(operator
        ? [
            {
              key: "edit",
              label: "Edit",
              icon: <Pencil />,
              onSelect: () => router.push(syncHref(here, s.id)),
            },
            {
              key: "pause",
              label: s.paused ? "Resume" : "Pause",
              icon: s.paused ? <Play /> : <Pause />,
              disabled: s.trigger === "manual" && !s.paused,
              onSelect: () =>
                pause.mutate(
                  { id: s.id, paused: !s.paused },
                  {
                    onSuccess: () =>
                      toast.success(s.paused ? "Resumed" : "Paused"),
                    onError: (err) => toast.error(err.message),
                  },
                ),
            },
          ]
        : []),
    ],
    operator
      ? [
          {
            key: "delete",
            label: "Delete",
            icon: <Trash2 />,
            destructive: true,
            onSelect: () => setConfirm(true),
          },
        ]
      : [],
  ]
  const dialog = (
    <ConfirmDialog
      open={confirm}
      onOpenChange={setConfirm}
      title={`Delete ${s.name}?`}
      description="Its runs go too. Nothing on either database changes."
      confirmLabel="Delete"
      destructive
      pending={remove.isPending}
      onConfirm={() =>
        remove.mutate(s.id, {
          onSuccess: () => {
            setConfirm(false)
            toast.success(`${s.name} deleted`)
          },
          onError: (err) => toast.error(err.message),
        })
      }
    />
  )
  return { items, dialog }
}
