"use client"

import { ChevronDown, CircleAlert, Loader2, Play, Square } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import {
  afterClose,
  StateDot,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { formatDuration, formatSize } from "@/lib/format"
import type {
  DatabaseSync,
  DatabaseSyncRun,
  Ref,
  TableResult,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  syncRunActive,
  useCancelSyncRun,
  useRunSync,
  useSyncRun,
  useSyncRuns,
} from "../../../api"
import { stateLabel, stateTone } from "../backups/meta"
import { count } from "./meta"

// One run (or compare): progress while it works, then what changed per table.
export function SyncRunLayer({
  id,
  onClose,
}: {
  id?: string
  onClose: () => void
}) {
  const query = useSyncRun(id)
  const r = query.data
  const cancel = useCancelSyncRun()
  const start = useRunSync()
  const { track } = useJobActions()
  const active = syncRunActive(r)

  const apply = () => {
    if (!r) return
    start.mutate(
      { id: r.sync_id, dry: false },
      {
        onSuccess: (res) => {
          track(res.job)
          onClose()
          toast.success("Applying the changes")
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  const footer = r && (
    <div className="flex w-full flex-wrap items-center justify-end gap-2">
      {active && (
        <Button
          variant="outline"
          className="max-md:h-11"
          disabled={cancel.isPending}
          onClick={() =>
            cancel.mutate(r.id, {
              onError: (err) => toast.error(err.message),
            })
          }
        >
          <Square />
          Stop
        </Button>
      )}
      {r.dry_run && r.state === "done" && changes(r) > 0 && (
        <Button
          className="max-md:h-11"
          disabled={start.isPending}
          onClick={apply}
        >
          <Play />
          Apply these changes
        </Button>
      )}
    </div>
  )

  return (
    <ResponsiveDialog
      open={!!id}
      onOpenChange={(open) => !open && onClose()}
      title={r ? (r.dry_run ? "Compare" : "Sync run") : "Sync run"}
      className="sm:max-w-3xl"
      footer={footer}
    >
      {!r ? (
        <div className="flex items-center gap-2 py-10 text-body-sm text-muted-foreground">
          {query.isError ? (
            <>
              <CircleAlert className="size-4" />
              {query.error.message}
            </>
          ) : (
            <>
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </>
          )}
        </div>
      ) : (
        <RunBody r={r} />
      )}
    </ResponsiveDialog>
  )
}

const changes = (r: DatabaseSyncRun) =>
  (r.result?.tables ?? []).reduce(
    (n, t) => n + t.inserted + t.updated + t.deleted,
    0,
  )

function RunBody({ r }: { r: DatabaseSyncRun }) {
  const active = syncRunActive(r)
  const p = r.progress
  const pct =
    p && p.total > 0 ? Math.min(100, Math.round((p.done / p.total) * 100)) : 0
  const tables = r.result?.tables ?? []
  const total = tables.reduce(
    (a, t) => ({
      inserted: a.inserted + t.inserted,
      updated: a.updated + t.updated,
      deleted: a.deleted + t.deleted,
      same: a.same + t.same,
      failed: a.failed + t.failed,
    }),
    { inserted: 0, updated: 0, deleted: 0, same: 0, failed: 0 },
  )
  const took =
    r.started_at && r.finished_at
      ? (new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) /
        1000
      : 0

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
        <StateDot
          tone={active ? "muted" : stateTone(r.state)}
          label={stateLabel(r.state)}
        />
        {r.dry_run && <span>Nothing was written</span>}
        <span>{timeAgo(r.created_at)}</span>
        {r.created_by_name && <span>by {r.created_by_name}</span>}
        {took > 0 && <span>took {formatDuration(took)}</span>}
      </div>

      {active && (
        <div className="grid gap-2 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-3 text-body-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Loader2 className="size-4 shrink-0 animate-spin text-brand" />
              <span className="truncate">
                {p?.phase || r.phase || "Starting"}
                {p?.current ? ` · ${p.current}` : ""}
              </span>
            </span>
            {p && p.items_total > 0 && (
              <span className="shrink-0 text-caption text-muted-foreground">
                {p.items} of {p.items_total} tables
              </span>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-[width]"
              style={{ width: `${p && p.total > 0 ? pct : 8}%` }}
            />
          </div>
        </div>
      )}

      {r.error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-body-sm text-destructive">
          {r.error}
        </p>
      )}

      {tables.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Tile
            label={r.dry_run ? "Would add" : "Added"}
            value={total.inserted}
          />
          <Tile
            label={r.dry_run ? "Would change" : "Changed"}
            value={total.updated}
          />
          <Tile
            label={r.dry_run ? "Would delete" : "Deleted"}
            value={total.deleted}
            tone={total.deleted > 0 ? "warning" : undefined}
          />
          <Tile label="Same" value={total.same} />
          <Tile
            label="Failed"
            value={total.failed}
            tone={total.failed > 0 ? "destructive" : undefined}
          />
        </div>
      )}

      {r.result?.replace && (
        <p className="rounded-xl bg-subtle px-4 py-3 text-body-sm">
          {r.result.replace.existed
            ? "The target was dropped and loaded again"
            : "The target was created and loaded"}
          {r.result.replace.bytes > 0 &&
            ` · ${formatSize(r.result.replace.bytes)} copied`}
        </p>
      )}

      {(r.result?.notes ?? []).length > 0 && (
        <ul className="grid gap-1 rounded-xl bg-subtle px-4 py-3 text-caption text-muted-foreground">
          {r.result?.notes?.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {tables.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {tables.map((t) => (
            <TableRow
              key={`${refText(t.from)}>${refText(t.to)}`}
              t={t}
              dry={r.dry_run}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: "warning" | "destructive"
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border px-3 py-2">
      <p className="truncate text-caption text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-subheading font-light tabular-nums",
          tone === "warning" && "text-warning",
          tone === "destructive" && "text-destructive",
        )}
      >
        {count(value)}
      </p>
    </div>
  )
}

const refText = (r: Ref) => (r.schema ? `${r.schema}.${r.name}` : r.name)

const opText: Record<string, string> = {
  insert: "Add",
  update: "Change",
  delete: "Delete",
  keep: "Kept",
}

function TableRow({ t, dry }: { t: TableResult; dry: boolean }) {
  const [open, setOpen] = useState(false)
  const samples = t.samples ?? []
  const failures = t.failures ?? []
  const more = samples.length > 0 || failures.length > 0 || !!t.error
  const parts = [
    t.inserted > 0 && `+${count(t.inserted)}`,
    t.updated > 0 && `~${count(t.updated)}`,
    t.deleted > 0 && `−${count(t.deleted)}`,
    t.failed > 0 && `${count(t.failed)} failed`,
  ].filter(Boolean)

  return (
    <li className="min-w-0">
      <button
        type="button"
        disabled={!more}
        onClick={() => setOpen(!open)}
        className="flex w-full min-w-0 items-center gap-3 px-4 py-3 text-start enabled:hover:bg-muted/50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-medium">
            {refText(t.from) === refText(t.to)
              ? refText(t.from)
              : `${refText(t.from)} → ${refText(t.to)}`}
          </span>
          <span className="block truncate text-caption text-muted-foreground">
            {t.note ||
              (t.state === "skipped"
                ? "Left out"
                : `${count(t.read)} rows read · ${count(t.same)} the same`)}
            {t.created && " · created on the target"}
            {t.reloaded && " · copied whole"}
          </span>
        </span>
        <span className="shrink-0 text-caption tabular-nums">
          {parts.length > 0 ? (
            parts.join("  ")
          ) : (
            <span className="text-ash">
              {t.state === "done" ? "No changes" : stateLabel(t.state)}
            </span>
          )}
        </span>
        {more && (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-ash transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>
      {open && (
        <div className="grid min-w-0 gap-2 px-4 pb-4">
          {t.error && (
            <p className="text-caption text-destructive">{t.error}</p>
          )}
          {samples.length > 0 && (
            <p className="text-caption text-ash">
              {dry
                ? "Some of the changes it would make"
                : "Some of the changes"}
            </p>
          )}
          {samples.map((c, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: samples have no id
              key={i}
              className="min-w-0 rounded-lg bg-subtle px-3 py-2 text-caption"
            >
              <p className="truncate">
                <span
                  className={cn(
                    "font-medium",
                    c.op === "delete" && "text-destructive",
                  )}
                >
                  {opText[c.op] ?? c.op}
                </span>{" "}
                <span className="font-mono text-muted-foreground">
                  {c.key.join(", ")}
                </span>
              </p>
              {(c.values ?? []).map((v) => (
                <p key={v.name} className="flex min-w-0 gap-2 font-mono">
                  <span className="shrink-0 text-muted-foreground">
                    {v.name}
                  </span>
                  {v.from !== undefined && v.from !== null && (
                    <span className="min-w-0 truncate text-destructive line-through">
                      {String(v.from)}
                    </span>
                  )}
                  {v.to !== undefined && v.to !== null && (
                    <span className="min-w-0 truncate text-success">
                      {String(v.to)}
                    </span>
                  )}
                </p>
              ))}
            </div>
          ))}
          {failures.map((f, i) => (
            <p
              // biome-ignore lint/suspicious/noArrayIndexKey: failures have no id
              key={i}
              className="min-w-0 truncate text-caption text-destructive"
              title={f.error}
            >
              {opText[f.op] ?? f.op}
              {f.key ? ` ${f.key.join(", ")}` : ""}: {f.error}
            </p>
          ))}
        </div>
      )}
    </li>
  )
}

// A sync's past runs; picking one opens it in SyncRunLayer.
export function RunsLayer({
  sync,
  open,
  onOpenChange,
  onPick,
}: {
  sync?: DatabaseSync
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (id: string) => void
}) {
  const runs = useSyncRuns(sync?.id ?? "", open && !!sync)
  const items = runs.data ?? []
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={sync ? `Runs of ${sync.name}` : "Runs"}
      className="sm:max-w-xl"
    >
      {runs.isPending ? (
        <p className="flex items-center gap-2 py-8 text-body-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-body-sm text-muted-foreground">
          It hasn't run yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="flex w-full min-w-0 items-center gap-3 py-3 text-start hover:bg-muted/50 max-md:min-h-11"
                onClick={() => afterClose(onOpenChange, () => onPick(r.id))}
              >
                <StateDot
                  tone={syncRunActive(r) ? "muted" : stateTone(r.state)}
                  label={`${r.dry_run ? "Compare" : "Run"}: ${stateLabel(r.state)}`}
                />
                <span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
                  {r.error ||
                    (r.rows_written > 0
                      ? `${count(r.rows_written)} rows written`
                      : r.trigger)}
                </span>
                <span className="shrink-0 text-caption text-ash">
                  {timeAgo(r.created_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </ResponsiveDialog>
  )
}
