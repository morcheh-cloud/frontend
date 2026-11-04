"use client"

import { Ban, FolderOpen, Loader2, RotateCw, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { afterClose } from "@/app/(panel)/servers/[id]/components/parts"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import type { Job } from "@/lib/services"
import { isActive, useJobLog } from "./api"
import { useJobActions } from "./jobs-provider"
import {
  canRetry,
  JobBar,
  placeHref,
  placeLabel,
  progressText,
  resultText,
  StateText,
  tookText,
} from "./meta"

// One task: where it stands, what it printed, and what can be done with it.
export function JobDetails({
  id,
  open,
  setOpen,
  job,
}: {
  id: string | null
  open: boolean
  setOpen: (open: boolean) => void
  job: Job | undefined
}) {
  // Removed (here or in another tab) while open.
  const gone = open && id !== null && !job
  useEffect(() => {
    if (gone) setOpen(false)
  }, [gone, setOpen])

  return (
    <ResponsiveDialog
      open={open && !!job}
      onOpenChange={setOpen}
      title={job?.title ?? "Task"}
      className="sm:max-w-xl"
      footer={job && <Actions job={job} close={setOpen} />}
    >
      {job && <Body job={job} />}
    </ResponsiveDialog>
  )
}

function Body({ job }: { job: Job }) {
  const log = useJobLog(job.id, job.state).data?.log
  const active = isActive(job)
  const result = resultText(job)
  const took = tookText(job)
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-2 text-body-sm">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StateText job={job} />
          {!active && (result || took) && (
            <span className="min-w-0 break-words text-muted-foreground">
              {[result, took && `took ${took}`].filter(Boolean).join(" · ")}
            </span>
          )}
          {active && (
            <span className="min-w-0 text-muted-foreground tabular-nums">
              {progressText(job)}
            </span>
          )}
        </div>
        {active && <JobBar job={job} />}
        {active && job.progress.current && (
          <p className="truncate font-mono text-caption text-ash">
            {job.progress.current}
          </p>
        )}
        {active && job.progress.locked && (
          <p className="text-caption text-muted-foreground">
            This step can't be canceled: stopping a package manager half way can
            break the server's packages. It ends on its own.
          </p>
        )}
        {job.error && (
          <p className="break-words text-destructive">{job.error}</p>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
        <dt className="text-muted-foreground">Queued</dt>
        <dd>{new Date(job.created_at).toLocaleString()}</dd>
        {job.target?.name && (
          <>
            <dt className="text-muted-foreground">Where</dt>
            <dd className="min-w-0 break-words">
              {job.target.name}
              <span className="font-mono text-caption text-muted-foreground">
                {" "}
                {job.target.path}
              </span>
            </dd>
          </>
        )}
      </dl>

      {log ? (
        <pre className="max-h-64 overflow-auto overscroll-contain rounded-lg bg-subtle p-3 font-mono text-caption break-words whitespace-pre-wrap text-muted-foreground">
          {log}
        </pre>
      ) : null}
    </div>
  )
}

function Actions({ job, close }: { job: Job; close: (open: boolean) => void }) {
  const router = useRouter()
  const actions = useJobActions()
  const href = placeHref(job)
  const active = isActive(job)
  const canceling = job.progress.phase === "Canceling"
  return (
    <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
      {!active && (
        <Button
          variant="ghost"
          className="max-md:h-11"
          onClick={() => {
            close(false)
            actions.remove(job)
          }}
        >
          <Trash2 /> Remove
        </Button>
      )}
      {href && (
        <Button
          variant="outline"
          className="max-md:h-11"
          onClick={() => afterClose(close, () => router.push(href))}
        >
          <FolderOpen /> {placeLabel(job)}
        </Button>
      )}
      {active ? (
        <Button
          variant="outline"
          className="max-md:h-11"
          disabled={canceling || job.progress.locked}
          onClick={() => actions.cancel(job)}
        >
          {canceling ? <Loader2 className="animate-spin" /> : <Ban />}
          {canceling ? "Canceling…" : "Cancel task"}
        </Button>
      ) : (
        canRetry(job) && (
          <Button
            className="max-md:h-11"
            onClick={() => {
              close(false)
              actions.retry(job)
            }}
          >
            <RotateCw /> Try again
          </Button>
        )
      )}
    </div>
  )
}
