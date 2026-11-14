import {
  Archive,
  ArchiveRestore,
  ArchiveX,
  ArrowLeftRight,
  BrickWallShield,
  BrushCleaning,
  CalendarClock,
  ChartPie,
  CircleArrowUp,
  CloudDownload,
  Copy,
  DatabaseBackup,
  Download,
  Earth,
  FileArchive,
  FileCode,
  FileKey,
  FolderInput,
  FolderSearch,
  Gauge,
  GitBranch,
  HardDriveDownload,
  HardDriveUpload,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  ListChecks,
  ListRestart,
  type LucideIcon,
  MonitorCog,
  MonitorUp,
  Package,
  PackageOpen,
  Play,
  RefreshCcwDot,
  SearchCheck,
  Send,
  Shield,
  ShieldBan,
  ShieldCheck,
  Shrink,
  Split,
} from "lucide-react"
import { envHref, volumeHref } from "@/app/(panel)/containers/components/meta"
import { backupsHref } from "@/app/(panel)/databases/[id]/components/backups/meta"
import { datasetHref } from "@/app/(panel)/settings/logs/components/meta"
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
  "proxy-geo": Earth,
  "proxy-brotli": Gauge,
  "proxy-waf": BrickWallShield,
  "proxy-image-filter": ImageIcon,
  "proxy-stream-geo": Earth,
  "proxy-certificate": FileKey,
  "software-run": LayoutGrid,
  "software-scan": FolderSearch,
  "package-action": Package,
  "package-refresh": ListRestart,
  "docker-pull": CloudDownload,
  "docker-prune": BrushCleaning,
  "docker-compose": Layers,
  "docker-update-check": SearchCheck,
  "docker-update": CircleArrowUp,
  "docker-scan": ShieldCheck,
  "docker-git-deploy": GitBranch,
  "docker-volume-backup": HardDriveUpload,
  "docker-volume-restore": ArchiveRestore,
  "docker-volume-move": FolderInput,
  "docker-volume-copy": Copy,
  "docker-image-export": HardDriveUpload,
  "docker-image-import": HardDriveDownload,
  "docker-image-copy": Send,
  "docker-auto-update": RefreshCcwDot,
  "log-archive": Archive,
  "log-archive-restore": ArchiveRestore,
  "log-archive-putaway": ArchiveX,
  "log-compact": Shrink,
  "pve-task": MonitorCog,
  "pve-create": MonitorUp,
}

// Which Containers page a Docker job's results are on.
function dockerJobPage(kind: string) {
  switch (kind) {
    case "docker-pull":
    case "docker-image-import":
    case "docker-image-copy":
      return "/containers/images"
    case "docker-compose":
    case "docker-git-deploy":
      return "/containers/projects"
    case "docker-volume-backup":
    case "docker-volume-restore":
      return "/containers/volumes"
    case "docker-update-check":
    case "docker-update":
      return "/containers/updates"
    case "docker-scan":
      return "/containers/security"
    default:
      return "/containers"
  }
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
  if (typeof r.certificate === "string") return r.certificate
  if (r.reboot_required === true) return "Restart the server to finish"
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
  Upgrade: "Upgraded",
  Purge: "Purged",
  Reinstall: "Reinstalled",
  Refresh: "Refreshed",
  Empty: "Emptied",
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
  if (t?.auto_update) return `/containers/auto-update/${t.auto_update}`
  // Proxmox: the machine's page, or the cluster's storage for an ISO.
  if (t?.cluster_id)
    return t.vmid
      ? `/vms/${t.cluster_id}/${t.vmid}`
      : `/vms?tab=storage&cluster=${t.cluster_id}`
  // Log archives: the kind's files, or its tables after a compaction.
  if (t?.dataset)
    return datasetHref(
      t.dataset,
      job.kind === "log-compact" ? "policy" : "archives",
    )
  if (t?.schedule_id) {
    return `/cronjobs/${t.schedule_id}${t.run_id ? `?run=${t.run_id}` : ""}`
  }
  if (job.kind === "software-run" && t?.run_id) {
    return `/applications/runs/${t.run_id}`
  }
  if (job.kind === "software-scan") {
    return t?.server_id
      ? `/servers/${t.server_id}/applications`
      : "/applications?tab=installed"
  }
  if (t?.run_id && job.kind === "script-run") {
    return `/scripts/runs/${t.run_id}`
  }
  if (t?.run_id) return `/ansible/runs/${t.run_id}`
  if (job.kind === "storage-scan") return "/storage?tab=insights"
  if (job.kind.startsWith("package-") && job.refs[0])
    return `/servers/${job.refs[0]}/packages`
  if (job.kind.startsWith("proxy-") && job.refs[0])
    return `/proxy/${job.refs[0]}`
  // Copy/move inside a volume: its file manager at the destination folder.
  if (t?.volume && t.server_id)
    return volumeHref(t.server_id, t.volume, "files", t.path || undefined)
  if (job.kind.startsWith("docker-") && t?.server_id)
    return envHref(t.server_id, dockerJobPage(job.kind))
  if (!t?.path) return null
  const query = filesHref({ path: t.path })
  if (t.server_id) return `/servers/${t.server_id}/files${query}`
  if (t.storage_id) return `/storage/${t.storage_id}${query}`
  return null
}

export function placeLabel(job: Job) {
  if (job.kind === "storage-scan") return "Open Insights"
  if (job.target?.cluster_id)
    return job.target.vmid ? "Open machine" : "Open storage"
  if (job.target?.auto_update) return "Open auto-update"
  if (job.target?.dataset)
    return job.kind === "log-compact" ? "Open logs" : "Open files"
  if (job.kind === "software-scan") return "Open applications"
  if (job.kind.startsWith("proxy-")) return "Open proxy"
  if (job.kind.startsWith("package-")) return "Open packages"
  if (
    job.kind === "docker-pull" ||
    job.kind === "docker-image-import" ||
    job.kind === "docker-image-copy"
  )
    return "Open images"
  if (job.kind === "docker-compose" || job.kind === "docker-git-deploy")
    return "Open projects"
  if (job.kind === "docker-volume-move" || job.kind === "docker-volume-copy")
    return "Open folder"
  if (job.kind.startsWith("docker-volume-")) return "Open volumes"
  if (job.kind === "docker-update-check" || job.kind === "docker-update")
    return "Open updates"
  if (job.kind === "docker-scan") return "Open security"
  if (job.kind === "docker-prune") return "Open Docker"
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
    job.kind !== "software-run" &&
    job.kind !== "schedule-sync" &&
    job.kind !== "schedule-run" &&
    job.kind !== "database-backup" &&
    job.kind !== "database-backup-restore" &&
    !job.kind.startsWith("log-") &&
    // A Proxmox task already ran on the cluster: start it again from there.
    !job.kind.startsWith("pve-")
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
