import {
  ArchiveRestore,
  ArrowLeftRight,
  CalendarClock,
  ChartPie,
  Copy,
  DatabaseBackup,
  Download,
  FileArchive,
  FileCode,
  FolderInput,
  ListChecks,
  type LucideIcon,
  PackageOpen,
  Play,
  Shield,
  ShieldBan,
  ShieldCheck,
  Split,
} from "lucide-react"

import { backupsHref } from "@/app/(panel)/databases/[id]/components/backups/meta"
import { filesHref } from "@/components/files/file-manager"
import { formatSize } from "@/lib/format"
import type { Job } from "@/lib/services"
import { cn } from "@/lib/utils"
import { isActive } from "./api"

const icons: Record<string, LucideIcon> = {
  transfer: ArrowLeftRight,
  copy: Copy,
  move: FolderInput,
  "storage-copy": Copy,
  "storage-move": FolderInput,
  "fail2ban-install": ShieldBan,
  "fail2ban-uninstall": ShieldBan,
  "firewall-install": Shield,
  "firewall-apply": Shield,
  compress: FileArchive,
  extract: PackageOpen,
  fetch: Download,
  "ansible-run": Play,
  "script-run": FileCode,
  "schedule-sync": CalendarClock,
  "schedule-run": CalendarClock,
  "storage-scan": ChartPie,
  "database-backup": DatabaseBackup,
  "database-backup-verify": ShieldCheck,
  "database-backup-restore": ArchiveRestore,
  "proxy-setup": Split,
}

export function JobIcon({
  kind,
  className,
}: {
  kind: string
  className?: string
}) {
  const Icon = icons[kind] ?? ListChecks
  return <Icon className={className} />
}

export const stateLabels: Record<Job["state"], string> = {
  queued: "Waiting",
  running: "Running",
  succeeded: "Done",
  failed: "Failed",
  canceled: "Canceled",
  interrupted: "Interrupted",
}

// Bytes when the total is known, otherwise items; null = no way to tell.
export function percent({ progress: p }: Job) {
  const share =
    p.total > 0
      ? p.done / p.total
      : p.items_total > 0
        ? p.items / p.items_total
        : null
  return share === null ? null : Math.min(100, Math.floor(share * 100))
}

function eta(seconds: number) {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s left`
  const m = Math.round(seconds / 60)
  return m < 60 ? `${m}m left` : `${Math.floor(m / 60)}h ${m % 60}m left`
}

// "Copying · 40% · 12 MB of 30 MB · 3 MB/s · 6s left"
export function progressText(job: Job) {
  const p = job.progress
  if (job.state === "queued") return "Waiting for a free slot"
  const parts: string[] = [p.phase || "Starting"]
  const share = percent(job)
  if (share !== null) parts.push(`${share}%`)
  if (p.total > 0) {
    parts.push(`${formatSize(p.done)} of ${formatSize(p.total)}`)
  } else if (p.done > 0) {
    parts.push(formatSize(p.done))
  } else if (p.items_total > 0) {
    parts.push(`${p.items} of ${p.items_total}`)
  } else if (p.items > 0) {
    parts.push(`${p.items} ${p.items === 1 ? "item" : "items"}`)
  }
  if (p.rate > 0) {
    parts.push(`${formatSize(p.rate)}/s`)
    if (p.total > p.done) parts.push(eta((p.total - p.done) / p.rate))
  }
  return parts.join(" · ")
}

// What it produced, for the toast and the row: "3 files · 1.2 MB".
export function resultText(job: Job) {
  const r = job.result
  if (!r) return ""
  if (typeof r.files === "number") {
    const files = r.files === 1 ? "1 file" : `${r.files} files`
    return r.bytes ? `${files} · ${formatSize(r.bytes)}` : files
  }
  if (typeof r.size === "number") return formatSize(r.size)
  if (typeof r.destination === "string") return r.destination
  return ""
}

const past: Record<string, string> = {
  Copy: "Copied",
  Move: "Moved",
  Compress: "Compressed",
  Extract: "Extracted",
  Download: "Downloaded",
  Install: "Installed",
  Remove: "Removed",
}

// "Copy x from A to B" → "Copied x from A to B".
export function doneTitle(title: string) {
  const [verb, ...rest] = title.split(" ")
  return past[verb] ? [past[verb], ...rest].join(" ") : `Finished: ${title}`
}

// Seconds between two times, for "Took 12s".
export function tookText(job: Job) {
  if (!job.started_at || !job.finished_at) return ""
  const s = (Date.parse(job.finished_at) - Date.parse(job.started_at)) / 1000
  if (s < 1) return "under a second"
  if (s < 60) return `${Math.round(s)}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${Math.round(s % 60)}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

// Where a job's work can be seen: the file manager at its folder, or the
// Ansible or cron job run it belongs to.
export function placeHref(job: Job) {
  const t = job.target
  if (t?.database_id) {
    return backupsHref(
      t.database_id,
      job.kind === "database-backup-restore" ? "restores" : "backups",
    )
  }
  if (t?.schedule_id) {
    return `/cronjobs/${t.schedule_id}${t.run_id ? `?run=${t.run_id}` : ""}`
  }
  if (t?.run_id && job.kind === "script-run") {
    return `/scripts/runs/${t.run_id}`
  }
  if (t?.run_id) return `/ansible/runs/${t.run_id}`
  if (job.kind === "storage-scan") return "/storage?tab=insights"
  if (job.kind === "proxy-setup" && job.refs[0]) return `/proxy/${job.refs[0]}`
  if (!t?.path) return null
  const query = filesHref({ path: t.path })
  if (t.server_id) return `/servers/${t.server_id}/files${query}`
  if (t.storage_id) return `/storage/${t.storage_id}${query}`
  return null
}

export function placeLabel(job: Job) {
  if (job.kind === "storage-scan") return "Open Insights"
  if (job.kind === "proxy-setup") return "Open proxy"
  if (job.target?.database_id) return "Open backups"
  return job.target?.run_id ? "Open run" : "Open folder"
}

// A run is started again from its page, through its checks (Owner on every
// server; a cron job's access; a backup's plan), not by replaying the job.
export function canRetry(job: Job) {
  return (
    job.state !== "succeeded" &&
    job.kind !== "ansible-run" &&
    job.kind !== "script-run" &&
    job.kind !== "schedule-sync" &&
    job.kind !== "schedule-run" &&
    job.kind !== "database-backup" &&
    job.kind !== "database-backup-restore"
  )
}

export function JobBar({ job, className }: { job: Job; className?: string }) {
  const share = percent(job)
  const known = job.state === "running" && share !== null
  return (
    <div
      role="progressbar"
      aria-label={job.title}
      aria-valuenow={known ? (share ?? undefined) : undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1 overflow-hidden rounded-full bg-muted", className)}
    >
      {job.state === "running" && (
        <div
          className={cn(
            "h-full rounded-full bg-brand transition-[width] duration-500",
            !known && "w-full animate-pulse",
          )}
          style={known ? { width: `${share}%` } : undefined}
        />
      )}
    </div>
  )
}

export function StateText({ job }: { job: Job }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap",
        job.state === "succeeded" && "text-success",
        (job.state === "failed" || job.state === "interrupted") &&
          "text-destructive",
        (isActive(job) || job.state === "canceled") && "text-muted-foreground",
      )}
    >
      {stateLabels[job.state]}
    </span>
  )
}
