"use client"

import { ListChecks } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Job } from "@/lib/services"
import { isActive, useJobList } from "./api"
import { JobRow } from "./job-row"
import { percent } from "./meta"

const MAX_SHOWN = 6

// Whatever is running first, then the most recent.
function recent(jobs: Job[]) {
  return [...jobs.filter(isActive), ...jobs.filter((j) => !isActive(j))].slice(
    0,
    MAX_SHOWN,
  )
}

export function useActiveJobs() {
  return (useJobList().data ?? []).filter(isActive)
}

// Desktop header: how many tasks are running, and a look at them.
export function TasksButton() {
  const { data: jobs = [] } = useJobList()
  const [open, setOpen] = useState(false)
  const active = jobs.filter(isActive).length
  const label = active ? `Tasks: ${active} running` : "Tasks: nothing running"
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            title={label}
            className="relative text-muted-foreground"
          />
        }
      >
        <ListChecks />
        {active > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-brand text-[10px] leading-none font-medium text-primary-foreground tabular-nums">
            {active > 9 ? "9+" : active}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 gap-0 overflow-hidden p-0">
        <div className="flex h-11 items-center justify-between border-b border-border px-4">
          <h2 className="text-body-sm font-medium">Tasks</h2>
          <Link
            href="/tasks"
            onClick={() => setOpen(false)}
            className="text-caption text-brand hover:underline"
          >
            View all
          </Link>
        </div>
        {jobs.length ? (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto overscroll-contain">
            {recent(jobs).map((job) => (
              <li key={job.id}>
                <JobRow job={job} onOpen={() => setOpen(false)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-body-sm text-muted-foreground">
            Copies, archives and downloads show up here while they run.
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

// Phone: a thin line along the top of the tab bar while something runs. It
// sits above nothing and hides nothing; the numbers are under More › Tasks.
export function TasksStrip() {
  const active = useActiveJobs()
  if (!active.length) return null
  const running = active.find((j) => j.state === "running") ?? active[0]
  const share = active.length === 1 ? percent(running) : null
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 -top-px h-0.5 overflow-hidden bg-muted"
    >
      <div
        className={
          share === null
            ? "size-full animate-pulse bg-brand"
            : "h-full bg-brand transition-[width] duration-500"
        }
        style={share === null ? undefined : { width: `${share}%` }}
      />
    </div>
  )
}
