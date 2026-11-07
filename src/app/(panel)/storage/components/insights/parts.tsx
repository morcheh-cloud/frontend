"use client"

import { ScanSearch } from "lucide-react"
import { toast } from "sonner"

import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { useJobList } from "@/components/jobs/api"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ApiError } from "@/lib/api"
import { formatSize } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useMeasureUsage } from "../../api"
import type { StorageModel } from "./model"

// Who may start a measurement (Operator on the storage), and which are
// already being measured (a storage-scan job still running).
export function useMeasure() {
  const { storageLevel } = useAccess()
  const jobs = useJobActions()
  const list = useJobList()
  const measure = useMeasureUsage()
  const running = new Set(
    (list.data ?? [])
      .filter(
        (j) =>
          j.kind === "storage-scan" &&
          (j.state === "queued" || j.state === "running"),
      )
      .flatMap((j) => j.refs),
  )
  const can = (s: { id: string; workspace_id: string }) =>
    atLeast(storageLevel(s.id, s.workspace_id), "operator")
  const start = (s: { id: string; name: string }, quiet = false) =>
    measure.mutateAsync(s.id).then(
      (job) => jobs.track(job),
      (err) => {
        if (quiet) return
        toast.error(
          err instanceof ApiError && err.status === 409
            ? `${s.name} is already being measured`
            : `Couldn't measure ${s.name}`,
          { description: err instanceof ApiError ? err.message : undefined },
        )
      },
    )
  return { can, running, start }
}

export function diskNote(s: StorageModel) {
  const u = s.usage
  if (!u || u.total_bytes === null || u.free_bytes === null) return null
  const used = u.total_bytes - u.free_bytes
  return {
    // Percent, as the server resources Meter takes it.
    percent: u.total_bytes ? (used / u.total_bytes) * 100 : 0,
    text: `Disk: ${formatSize(u.free_bytes)} free of ${formatSize(u.total_bytes)}`,
  }
}

export function MeasureButton({
  storage: s,
  phone,
}: {
  storage: StorageModel
  phone?: boolean
}) {
  const measure = useMeasure()
  if (!measure.can(s)) return null
  const busy = measure.running.has(s.id)
  const off = s.status !== "online"
  const label = busy
    ? "Measuring…"
    : off
      ? "Can't measure while it's not online"
      : "Measure now"
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size={phone ? "icon-lg" : "icon-sm"}
            aria-label={`${label}: ${s.name}`}
            disabled={busy || off}
            onClick={() => measure.start(s)}
          />
        }
      >
        <ScanSearch className={cn(busy && "animate-pulse")} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
