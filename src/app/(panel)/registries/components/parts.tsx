"use client"

import { Check, CircleX, LoaderCircle } from "lucide-react"

import { isActive, useJobList } from "@/components/jobs/api"
import type { Job, PackageRegistry } from "@/lib/services"
import { cn } from "@/lib/utils"

// The registry's last deploy, HTTPS or remove job, live from the job list.
export function useRegistryJob(
  r: PackageRegistry | undefined,
): Job | undefined {
  const jobs = useJobList()
  if (!r?.job_id) return undefined
  return jobs.data?.find((j) => j.id === r.job_id)
}

type Step = { key: string; label: string; phases: string[] }

// What a deploy goes through, matched against the job's phase.
function stepsOf(r: PackageRegistry): Step[] {
  const steps: Step[] = [
    {
      key: "files",
      label: r.kind === "harbor" ? "Download and configure" : "Write its files",
      phases: [
        "Downloading Harbor",
        "Preparing the configuration",
        "Writing the configuration",
      ],
    },
    {
      key: "pull",
      label: "Pull the images",
      phases: ["Pulling the images", "Pulling the image"],
    },
    {
      key: "start",
      label: "Start it",
      phases: [
        "Starting Harbor",
        "Starting Verdaccio",
        "Waiting for it to start",
      ],
    },
    { key: "setup", label: "Set it up", phases: ["Setting it up"] },
  ]
  if (r.domain)
    steps.push({
      key: "publish",
      label: `Publish ${r.domain}`,
      phases: ["Publishing it on the reverse proxy"],
    })
  if (r.domain)
    steps.push({
      key: "https",
      label: "Get a certificate",
      phases: ["Getting a certificate", "Preparing", "Getting the certificate"],
    })
  return steps
}

// A strip of the deploy's steps: done, now, still to come.
export function DeploySteps({
  r,
  job,
  className,
}: {
  r: PackageRegistry
  job: Job | undefined
  className?: string
}) {
  const steps = stepsOf(r)
  const phase = job?.progress.phase ?? ""
  let at = steps.findIndex((s) => s.phases.includes(phase))
  if (at < 0) at = job && job.state === "queued" ? -1 : 0
  const failed = job?.state === "failed" || r.state === "failed"
  const done = job?.state === "succeeded"
  return (
    <ol className={cn("flex flex-col gap-2.5", className)}>
      {steps.map((s, i) => {
        const state =
          done || i < at
            ? "done"
            : i === at
              ? failed
                ? "failed"
                : "now"
              : "next"
        return (
          <li key={s.key} className="flex items-center gap-2.5 text-body-sm">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border",
                state === "done" &&
                  "border-success bg-success text-primary-foreground",
                state === "now" && "border-brand text-brand",
                state === "failed" && "border-destructive text-destructive",
                state === "next" && "border-mist",
              )}
            >
              {state === "done" && <Check className="size-3" />}
              {state === "now" && (
                <LoaderCircle className="size-3 animate-spin" />
              )}
              {state === "failed" && <CircleX className="size-3" />}
            </span>
            <span
              className={cn(
                state === "next" && "text-ash",
                state === "now" && "font-medium",
                state === "failed" && "font-medium text-destructive",
              )}
            >
              {s.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export const jobRunning = (job: Job | undefined) => !!job && isActive(job)
