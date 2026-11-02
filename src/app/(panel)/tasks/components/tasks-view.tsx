"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ListChecks, Trash2 } from "lucide-react"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { toast } from "sonner"

import {
  Empty,
  SearchBox,
  Segmented,
} from "@/app/(panel)/servers/[id]/components/parts"
import { isActive, jobKeys, useJobList } from "@/components/jobs/api"
import { JobRow } from "@/components/jobs/job-row"
import { PageHeader } from "@/components/panel/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { type ApiError, api } from "@/lib/api"

const shows = ["all", "active", "finished"] as const

// Everything Morcheh has been doing in the background. The list is live (see
// JobsProvider), so filters only narrow what's already here.
export function TasksView() {
  const list = useJobList()
  const qc = useQueryClient()
  const [{ show, q }, setUrl] = useQueryStates(
    {
      show: parseAsStringLiteral(shows).withDefault("all"),
      q: parseAsString.withDefault(""),
    },
    { history: "replace" },
  )

  const jobs = list.data ?? []
  const active = jobs.filter(isActive)
  const finished = jobs.length - active.length
  const needle = q.trim().toLowerCase()
  const shown = jobs
    .filter((j) => show === "all" || (show === "active") === isActive(j))
    .filter((j) => !needle || j.title.toLowerCase().includes(needle))

  const clear = () =>
    api.jobs
      .clearJobs()
      .then(() => qc.invalidateQueries({ queryKey: jobKeys.list }))
      .catch((err: ApiError) => toast.error(err.message))

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Copies, archives, downloads and installs running in the background."
        guide="tasks"
      />
      <div className="flex flex-col gap-3 px-4 pt-4 md:flex-row md:items-center md:px-6">
        <div className="flex items-center gap-2">
          <SearchBox
            value={q}
            onChange={(v) => setUrl({ q: v || null })}
            placeholder="Search tasks"
            label="Search tasks"
            className="min-w-0 flex-1 md:flex-none"
          />
          {finished > 0 && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear finished"
              className="size-11 text-muted-foreground md:hidden"
              onClick={clear}
            >
              <Trash2 />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Segmented
            label="Show"
            value={show}
            onChange={(v) => setUrl({ show: v === "all" ? null : v })}
            items={[
              { value: "all", label: "All" },
              { value: "active", label: `Running ${active.length}` },
              { value: "finished", label: `Finished ${finished}` },
            ]}
          />
          {finished > 0 && (
            <Button
              variant="ghost"
              className="text-muted-foreground max-md:hidden"
              onClick={clear}
            >
              <Trash2 /> Clear finished
            </Button>
          )}
        </div>
      </div>

      <div className="py-4 md:px-6">
        {list.isPending ? (
          <div className="flex flex-col gap-4 px-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : list.error ? (
          <Empty
            icon={ListChecks}
            title="Couldn't load tasks"
            body={list.error.message}
            action={
              <Button variant="outline" onClick={() => list.refetch()}>
                Retry
              </Button>
            }
          />
        ) : shown.length === 0 ? (
          <Empty
            icon={ListChecks}
            title={jobs.length ? "No tasks match" : "No tasks yet"}
            body={
              jobs.length
                ? "Try another filter."
                : "Send files to another server, compress a folder or download from a URL, and it shows up here."
            }
          />
        ) : (
          <ul className="divide-y divide-border border-y border-border md:rounded-2xl md:border">
            {shown.map((job) => (
              <li key={job.id}>
                <JobRow job={job} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
