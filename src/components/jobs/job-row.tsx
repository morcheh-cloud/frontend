"use client"

import { Ban, Loader2, RotateCw } from "lucide-react"

import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { Button } from "@/components/ui/button"
import type { Job } from "@/lib/services"
import { cn } from "@/lib/utils"
import { isActive } from "./api"
import { useJobActions } from "./jobs-provider"
import {
  canRetry,
  JobBar,
  JobIcon,
  progressText,
  resultText,
  StateText,
  tookText,
} from "./meta"

// One task in a list: opens its details; the one action that matters right
// now (Cancel, or Try again) sits at the end on desktop.
export function JobRow({
  job,
  onOpen,
  className,
}: {
  job: Job
  onOpen?: () => void
  className?: string
}) {
  const actions = useJobActions()
  const active = isActive(job)
  const failed = job.state === "failed" || job.state === "interrupted"
  const canceling = job.progress.phase === "Canceling"
  const done = [
    resultText(job),
    tookText(job) && `took ${tookText(job)}`,
    job.finished_at && timeAgo(job.finished_at),
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className={cn("flex items-center", className)}>
      <button
        type="button"
        onClick={() => {
          onOpen?.()
          actions.show(job.id)
        }}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-start outline-none hover:bg-subtle focus-visible:bg-muted active:bg-muted max-md:min-h-16"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <JobIcon kind={job.kind} className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-body-sm font-medium">{job.title}</span>
          {active ? (
            <>
              <JobBar job={job} />
              <span className="truncate text-caption text-muted-foreground tabular-nums">
                {progressText(job)}
              </span>
            </>
          ) : (
            <span className="flex min-w-0 gap-1.5 text-caption">
              <StateText job={job} />
              <span
                className={cn(
                  "truncate",
                  failed ? "text-destructive" : "text-ash",
                )}
              >
                {failed ? job.error : done}
              </span>
            </span>
          )}
        </span>
      </button>
      {active ? (
        <Button
          variant="ghost"
          size="icon-sm"
          className="me-3 text-muted-foreground max-md:hidden"
          aria-label={`Cancel ${job.title}`}
          title={
            job.progress.locked ? "Can't be stopped safely right now" : "Cancel"
          }
          disabled={canceling || job.progress.locked}
          onClick={() => actions.cancel(job)}
        >
          {canceling ? <Loader2 className="animate-spin" /> : <Ban />}
        </Button>
      ) : (
        canRetry(job) && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="me-3 text-muted-foreground max-md:hidden"
            aria-label={`Try ${job.title} again`}
            title="Try again"
            onClick={() => actions.retry(job)}
          >
            <RotateCw />
          </Button>
        )
      )}
    </div>
  )
}
