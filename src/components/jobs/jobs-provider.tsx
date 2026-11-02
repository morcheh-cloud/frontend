"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"

import { useOpen } from "@/hooks/useOpen"
import { type ApiError, api } from "@/lib/api"
import type { Job } from "@/lib/services"
import {
  dropJob,
  isActive,
  jobKeys,
  jobStreamUrl,
  putJob,
  refreshAfterJob,
  useJobList,
} from "./api"
import { JobDetails } from "./job-details"
import { doneTitle, placeHref, resultText } from "./meta"

type JobActions = {
  // Follow a job this tab just started: toast now and when it ends.
  track: (job: Job) => void
  show: (id: string) => void
  cancel: (job: Job) => void
  retry: (job: Job) => void
  remove: (job: Job) => void
}

const JobsContext = createContext<JobActions | null>(null)

export function useJobActions() {
  const ctx = useContext(JobsContext)
  if (!ctx) throw new Error("useJobActions needs JobsProvider")
  return ctx
}

const failure = (err: unknown) => toast.error((err as ApiError).message)

// Background jobs, panel-wide: one live stream into the query cache, the
// toasts for jobs started here, refreshing the files they changed, and the
// details layer.
export function JobsProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const router = useRouter()
  const { data: jobs } = useJobList()
  const tracked = useRef(new Set<string>())
  const seen = useRef(new Map<string, Job["state"]>())
  const [shown, setShown] = useState<string | null>(null)
  const [open, setOpen] = useOpen("job-details")

  useEffect(() => watchJobs(qc), [qc])

  const show = useCallback(
    (id: string) => {
      setShown(id)
      setOpen(true)
    },
    [setOpen],
  )

  const conclude = useCallback(
    (job: Job) => {
      refreshAfterJob(qc, job)
      announce(job, {
        details: () => show(job.id),
        open: (href) => router.push(href),
      })
    },
    [qc, router, show],
  )

  // Runs for events and refetches alike, so a job that ended while the tab
  // was hidden is noticed when it comes back.
  useEffect(() => {
    for (const job of jobs ?? []) {
      const was = seen.current.get(job.id)
      seen.current.set(job.id, job.state)
      if (isActive(job)) continue
      if (tracked.current.delete(job.id)) conclude(job)
      else if (was && isActive({ state: was })) refreshAfterJob(qc, job)
    }
  }, [jobs, qc, conclude])

  const actions = useMemo<JobActions>(() => {
    const track = (job: Job) => {
      putJob(qc, job)
      // The stream may already have told us how it ended.
      const latest = qc
        .getQueryData<Job[]>(jobKeys.list)
        ?.find((j) => j.id === job.id)
      if (latest && !isActive(latest)) return conclude(latest)
      tracked.current.add(job.id)
      seen.current.set(job.id, job.state)
      toast(job.title, {
        id: job.id,
        description: "Running in the background.",
        duration: 4000,
        action: { label: "View", onClick: () => show(job.id) },
      })
    }
    return {
      track,
      show,
      cancel: (job) => {
        api.jobs
          .cancelJob(job.id)
          .then((j) => putJob(qc, j))
          .catch(failure)
      },
      retry: (job) => {
        api.jobs.retryJob(job.id).then(track).catch(failure)
      },
      remove: (job) => {
        api.jobs
          .deleteJob(job.id)
          .then(() => dropJob(qc, job.id))
          .catch(failure)
      },
    }
  }, [qc, show, conclude])

  return (
    <JobsContext.Provider value={actions}>
      {children}
      <JobDetails
        id={shown}
        open={open}
        setOpen={setOpen}
        job={jobs?.find((j) => j.id === shown)}
      />
    </JobsContext.Provider>
  )
}

function announce(
  job: Job,
  go: { details: () => void; open: (href: string) => void },
) {
  const options = { id: job.id, duration: 8000 }
  if (job.state === "succeeded") {
    const href = placeHref(job)
    const here = href === window.location.pathname + window.location.search
    toast.success(doneTitle(job.title), {
      ...options,
      description: resultText(job) || undefined,
      action:
        href && !here
          ? { label: "Open folder", onClick: () => go.open(href) }
          : undefined,
    })
  } else if (job.state === "canceled") {
    toast(`Canceled: ${job.title}`, {
      ...options,
      description: undefined,
      action: undefined,
    })
  } else {
    toast.error(job.title, {
      ...options,
      description: job.error,
      action: { label: "Details", onClick: go.details },
    })
  }
}

// Keeps the stream open while the tab is visible (browsers allow few
// connections per site), and reloads the list each time it (re)connects, since
// events sent while it was closed are gone.
function watchJobs(qc: ReturnType<typeof useQueryClient>) {
  let source: EventSource | null = null
  let retry: number | undefined
  const reload = () => qc.invalidateQueries({ queryKey: jobKeys.list })

  function open() {
    if (source || document.hidden) return
    const es = new EventSource(jobStreamUrl(), { withCredentials: true })
    source = es
    es.onopen = reload
    es.addEventListener("job", (e) => {
      putJob(qc, JSON.parse(e.data) as Job)
    })
    es.addEventListener("removed", (e) => {
      const { id } = JSON.parse(e.data) as { id: string }
      if (id) dropJob(qc, id)
      else reload()
    })
    es.onerror = () => {
      if (es.readyState !== EventSource.CLOSED) return
      source = null
      retry = window.setTimeout(open, 5000)
    }
  }

  function close() {
    source?.close()
    source = null
    window.clearTimeout(retry)
  }

  const onVisibility = () => (document.hidden ? close() : open())
  document.addEventListener("visibilitychange", onVisibility)
  open()
  return () => {
    document.removeEventListener("visibilitychange", onVisibility)
    close()
  }
}
