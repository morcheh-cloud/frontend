"use client"

import {
  ArchiveRestore,
  CircleAlert,
  CircleCheck,
  Copy,
  Download,
  Link2,
  LoaderCircle,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Callout } from "@/app/(panel)/ansible/components/run-layer"
import {
  backupActive,
  downloadBackup,
  useBackup,
} from "@/app/(panel)/databases/api"
import {
  afterClose,
  Facts,
  StateDot,
} from "@/app/(panel)/servers/[id]/components/parts"
import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { AccessLayer as Layer } from "@/components/access/grants"
import { useJobList } from "@/components/jobs/api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatSize } from "@/lib/format"
import type { Backup, BackupCopy } from "@/lib/services"
import { useDashboard } from "../parts"
import { useBackupActions, useBackupCan } from "./backup-actions"
import { formatLabels, stateLabel, stateTone, whatText, when } from "./meta"

function took(b: Backup) {
  if (!b.started_at || !b.finished_at) return ""
  const s = Math.round(
    (new Date(b.finished_at).getTime() - new Date(b.started_at).getTime()) /
      1000,
  )
  if (s < 60) return `${Math.max(s, 1)} s`
  const m = Math.floor(s / 60)
  return m < 60
    ? `${m} min ${s % 60} s`
    : `${Math.floor(m / 60)} h ${m % 60} min`
}

// How far a running backup has got, from its job.
function useProgress(b: Backup | undefined) {
  const jobs = useJobList()
  if (!b || !backupActive(b)) return ""
  const p = jobs.data?.find((j) => j.id === b.job_id)?.progress
  if (!p?.phase) return ""
  return p.done ? `${p.phase}, ${formatSize(p.done)}` : p.phase
}

function copy(text: string) {
  if (!navigator.clipboard) {
    toast.error("This address can't use the clipboard: select the text instead")
    return
  }
  void navigator.clipboard.writeText(text).then(
    () => toast.success("Commands copied"),
    () => toast.error("Couldn't copy"),
  )
}

// One run: what it made, whether the file is still good, how to put it back.
export function BackupDetails({
  id,
  open,
  onOpenChange,
}: {
  id?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { database: d } = useDashboard()
  const a = useBackupActions()
  const query = useBackup(open ? id : undefined)
  const b = query.data
  const can = useBackupCan(b)
  const progress = useProgress(b)

  const first = can.download[0]
  const footer = b &&
    (can.check || first || can.cancel || can.remove || can.restore) && (
      <div className="flex w-full items-center gap-2 max-md:flex-wrap">
        {can.restore && (
          <Button
            className="max-md:h-11 max-md:w-full"
            onClick={() => afterClose(onOpenChange, () => a.restore(b))}
          >
            <ArchiveRestore />
            Restore…
          </Button>
        )}
        {can.cancel && (
          <Button
            variant="outline"
            className="max-md:h-11 max-md:flex-1"
            onClick={() => a.cancel(b)}
          >
            Stop
          </Button>
        )}
        {first && can.download.length === 1 && (
          <Button
            variant="outline"
            className="max-md:h-11 max-md:flex-1"
            onClick={() => downloadBackup(b.id, first.storage_id)}
          >
            <Download />
            Download
          </Button>
        )}
        {can.check && (
          <Button
            variant="outline"
            className="max-md:h-11 max-md:flex-1"
            onClick={() => a.check(b)}
          >
            Check
          </Button>
        )}
        {can.remove && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete"
            className="ms-auto text-destructive max-md:size-11"
            onClick={() => afterClose(onOpenChange, () => a.remove(b))}
          >
            <Trash2 />
          </Button>
        )}
      </div>
    )

  return (
    <Layer
      open={open}
      onOpenChange={onOpenChange}
      title={b?.plan_name || "Backup"}
      description={b ? when.format(new Date(b.created_at)) : undefined}
      footer={footer || undefined}
    >
      {!b ? (
        query.isError ? (
          <p className="text-body-sm text-muted-foreground">
            {query.error.message}
          </p>
        ) : (
          <Skeleton className="h-64 rounded-2xl" />
        )
      ) : (
        <div className="flex flex-col gap-4">
          {b.error && (
            <Callout
              warn
              title={
                b.state === "interrupted"
                  ? "It was cut off"
                  : b.state === "failed"
                    ? "It failed"
                    : "What happened"
              }
            >
              <span className="break-words whitespace-pre-wrap">{b.error}</span>
            </Callout>
          )}
          {b.verify_error && (
            <Callout warn title="This file failed its check">
              {b.verify_error} It can't be trusted: make a new backup.
            </Callout>
          )}
          {b.state === "succeeded" && !b.restorable && b.restore_problem && (
            <Callout title="Morcheh can't restore this one">
              {b.restore_problem}
            </Callout>
          )}
          <div className="-mx-2">
            <Facts
              items={[
                {
                  label: "State",
                  value: (
                    <StateDot
                      tone={stateTone(b.state)}
                      label={progress || stateLabel(b.state)}
                    />
                  ),
                },
                { label: "Size", value: b.bytes ? formatSize(b.bytes) : "—" },
                { label: "What", value: whatText(b.target, d.engine) },
                {
                  label: "Type",
                  value: b.kind === "incremental" ? "Incremental" : "Full",
                },
                { label: "Took", value: took(b) || "—" },
                {
                  label: "Started by",
                  value:
                    b.trigger === "schedule"
                      ? "Schedule"
                      : b.created_by_name || "Someone",
                },
                {
                  label: "Checked",
                  value: b.verified_at
                    ? `OK · ${timeAgo(b.verified_at)}`
                    : b.verify_error
                      ? "Failed"
                      : b.state === "succeeded"
                        ? "Not yet"
                        : "—",
                },
                {
                  label: "Format",
                  value: formatLabels[b.format] ?? b.format,
                  wide: true,
                },
                ...(b.path && b.state === "succeeded"
                  ? [{ label: "File", value: b.path, wide: true, mono: true }]
                  : []),
                ...(b.sha256
                  ? [
                      {
                        label: "SHA-256",
                        value: b.sha256,
                        wide: true,
                        mono: true,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
          {(b.parent_id || b.dependents > 0) && (
            <section className="flex flex-col gap-2">
              <h3 className="text-body-sm font-medium">Chain</h3>
              <div className="flex flex-col gap-1 rounded-lg bg-subtle px-3 py-2.5 text-caption text-muted-foreground">
                {b.parent_id && (
                  <p className="flex items-start gap-2">
                    <Link2 className="mt-px size-4 shrink-0" />
                    <span>
                      Holds only the changes since the backup before it, so a
                      restore loads the full backup and every step up to this
                      one.{" "}
                      <button
                        type="button"
                        className="text-brand hover:underline"
                        onClick={() => a.show({ id: b.parent_id ?? "" })}
                      >
                        Open the one before
                      </button>
                    </span>
                  </p>
                )}
                {b.dependents > 0 && (
                  <p className="flex items-start gap-2">
                    <Link2 className="mt-px size-4 shrink-0" />
                    <span>
                      {b.dependents} incremental backup
                      {b.dependents === 1 ? " builds" : "s build"} on this one.
                      Deleting it deletes {b.dependents === 1 ? "it" : "them"}{" "}
                      too.
                    </span>
                  </p>
                )}
              </div>
            </section>
          )}
          {b.copies.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-body-sm font-medium">Stored on</h3>
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {b.copies.map((c) => (
                  <CopyRow
                    key={c.storage_id ?? c.storage_name}
                    copy={c}
                    download={
                      can.download.length > 1 &&
                      can.download.some((r) => r.storage_id === c.storage_id)
                        ? () => downloadBackup(b.id, c.storage_id ?? undefined)
                        : undefined
                    }
                  />
                ))}
              </ul>
            </section>
          )}
          {b.state === "succeeded" && b.restore && (
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-body-sm font-medium">Restore by hand</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="max-md:h-11"
                  onClick={() => copy(b.restore)}
                >
                  <Copy />
                  Copy
                </Button>
              </div>
              <pre className="rounded-lg bg-subtle p-3 font-mono text-caption wrap-anywhere whitespace-pre-wrap">
                {b.restore}
              </pre>
              <p className="text-caption text-muted-foreground">
                {can.restore
                  ? "Restore… above does this for you. These are the same steps, for a machine Morcheh can't reach: download the file, then run them where the database is."
                  : "Download the file, then run this where the database can be reached."}
              </p>
            </section>
          )}
        </div>
      )}
    </Layer>
  )
}

function CopyRow({
  copy: c,
  download,
}: {
  copy: BackupCopy
  download?: () => void
}) {
  const Icon =
    c.state === "stored"
      ? CircleCheck
      : c.state === "failed"
        ? CircleAlert
        : LoaderCircle
  return (
    <li className="flex min-h-11 items-center gap-3 px-3 py-2">
      <Icon
        className={
          c.state === "stored"
            ? "size-4 shrink-0 text-success"
            : c.state === "failed"
              ? "size-4 shrink-0 text-warning"
              : "size-4 shrink-0 animate-spin text-ash"
        }
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm">
          {c.storage_id ? c.storage_name : `${c.storage_name} (removed)`}
        </p>
        {c.error ? (
          <p className="text-caption break-words text-muted-foreground">
            {c.error}
          </p>
        ) : (
          c.state !== "stored" && (
            <p className="text-caption text-muted-foreground">
              {c.state === "pending" ? "Uploading" : "Not stored"}
            </p>
          )
        )}
      </div>
      {download && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Download from ${c.storage_name}`}
          title={`Download from ${c.storage_name}`}
          className="max-md:size-11"
          onClick={download}
        >
          <Download />
        </Button>
      )}
    </li>
  )
}
