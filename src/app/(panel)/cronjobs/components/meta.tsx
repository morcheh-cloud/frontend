import {
  Archive,
  Ban,
  Camera,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Cog,
  Container,
  Download,
  FileCode,
  FolderSync,
  HardDrive,
  HardDriveUpload,
  Loader2,
  type LucideIcon,
  MonitorCog,
  OctagonX,
  Package,
  PackageCheck,
  Play,
  Power,
  Server,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import {
  createSerializer,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import { describe } from "@/app/(panel)/servers/[id]/cron/components/schedule"
import type {
  Schedule,
  ScheduleEnd,
  ScheduleEndView,
  ScheduleOptions,
  SchedulePVE,
  ScheduleRef,
  ScheduleRun,
  ScheduleRunDest,
} from "@/lib/services"
import { cn } from "@/lib/utils"

export type RunState = ScheduleRun["state"] | ScheduleRunDest["state"]

export const runStateLabels: Record<RunState, string> = {
  queued: "Queued",
  pending: "Waiting",
  running: "Running",
  succeeded: "Succeeded",
  partial: "Partly done",
  failed: "Failed",
  canceled: "Stopped",
  interrupted: "Interrupted",
  skipped: "Skipped",
}

const stateIcons: Record<RunState, typeof Clock> = {
  queued: Clock,
  pending: CircleDashed,
  running: Loader2,
  succeeded: CircleCheck,
  partial: CircleAlert,
  failed: CircleX,
  canceled: Ban,
  interrupted: OctagonX,
  skipped: CircleDashed,
}

// A run's state as icon + text: the color only backs the word up.
export function RunStateBadge({
  state,
  dryRun,
  className,
}: {
  state: string
  dryRun?: boolean
  className?: string
}) {
  const s = (state in runStateLabels ? state : "queued") as RunState
  const Icon = stateIcons[s]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-body-sm whitespace-nowrap",
        s === "succeeded" && "text-success",
        s === "failed" && "text-destructive",
        (s === "partial" || s === "interrupted") && "text-warning",
        (s === "canceled" ||
          s === "queued" ||
          s === "skipped" ||
          s === "pending") &&
          "text-muted-foreground",
        s === "running" && "text-brand",
        className,
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", s === "running" && "animate-spin")}
      />
      {runStateLabels[s]}
      {dryRun && <span className="text-ash">· test</span>}
    </span>
  )
}

export const failedStates: readonly string[] = [
  "failed",
  "partial",
  "interrupted",
]

// Needs a look: it can't run, or its last run didn't fully work. Paused jobs
// don't count. Shared with the menu's red count.
export { cronjobBroken as needsAttention } from "@/components/panel/problems"

// ---- Modes ----

export type SyncMode = ScheduleOptions["mode"]

export const modeMeta: Record<
  SyncMode,
  { label: string; short: string; hint: string }
> = {
  update: {
    label: "Copy new and changed",
    short: "Update",
    hint: "Copies files that are new or changed since last time. Nothing is ever deleted at the destination.",
  },
  mirror: {
    label: "Mirror",
    short: "Mirror",
    hint: "Makes the destination an exact copy: files the source no longer has are deleted there too.",
  },
  snapshot: {
    label: "Snapshot",
    short: "Snapshot",
    hint: "A full copy into a new dated folder each run (e.g. 2026-11-04_03-00-00). Older snapshots can be cleaned up.",
  },
}

export const modes = (Object.keys(modeMeta) as SyncMode[]).map((m) => ({
  value: m,
  label: modeMeta[m].short,
}))

// ---- Ends ----

export const endKind = (e: ScheduleEnd) =>
  e.server_id ? ("server" as const) : ("storage" as const)

export const endId = (e: ScheduleEnd) => e.server_id ?? e.storage_id ?? ""

export const EndIcon = ({
  end,
  className,
}: {
  end: ScheduleEnd
  className?: string
}) =>
  end.server_id ? (
    <Server className={className} />
  ) : (
    <HardDrive className={className} />
  )

export function endName(e: ScheduleEndView) {
  if (e.missing || !e.name) {
    return e.server_id ? "Deleted server" : "Deleted storage"
  }
  return e.name
}

// "web-1 : /var/www"
export const endText = (e: ScheduleEndView) => `${endName(e)}:${e.path}`

// An end on one line: icon, name and path.
export function EndLabel({
  end,
  className,
}: {
  end: ScheduleEndView
  className?: string
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <EndIcon end={end} className="size-3.5 shrink-0 text-ash" />
      <span
        className={cn(
          "shrink-0 font-medium",
          end.missing && "text-destructive",
        )}
      >
        {endName(end)}
      </span>
      <span className="truncate font-mono text-caption text-muted-foreground">
        {end.path}
      </span>
    </span>
  )
}

// "web-1 → 2 places"
export function flowText(s: Pick<Schedule, "source" | "destinations">) {
  const to =
    s.destinations.length === 1
      ? endName(s.destinations[0])
      : `${s.destinations.length} places`
  return s.source ? `${endName(s.source)} → ${to}` : `→ ${to}`
}

// ---- Actions ----

export type Action = Schedule["action"]

export const actionMeta: Record<
  Action,
  { label: string; icon: LucideIcon; hint: string; short: string }
> = {
  sync: {
    label: "Copy files",
    icon: FolderSync,
    hint: "Copy a folder from a server or storage to other servers and storages.",
    short: "From a server or storage to others",
  },
  archive: {
    label: "Archive a folder",
    icon: Archive,
    hint: "Pack a server folder into a .tar.gz, send it to servers and storages and keep the newest few.",
    short: "Pack into .tar.gz, keep the newest",
  },
  fetch: {
    label: "Download a file",
    icon: Download,
    hint: "Servers download a file from an address into a folder.",
    short: "Servers download from an address",
  },
  script: {
    label: "Run a script",
    icon: FileCode,
    hint: "A saved script or a command, on one or more servers.",
    short: "A saved script or a command",
  },
  ansible: {
    label: "Run a playbook",
    icon: Play,
    hint: "A saved Ansible playbook on servers picked by name, tag or folder.",
    short: "A saved Ansible playbook",
  },
  service: {
    label: "Service action",
    icon: Cog,
    hint: "Start, stop, restart or reload a systemd service on servers.",
    short: "Start, stop, restart or reload",
  },
  reboot: {
    label: "Reboot servers",
    icon: Power,
    hint: "Reboot servers one at a time, optionally only when they need it.",
    short: "One at a time, only when needed",
  },
  "verify-backup": {
    label: "Verify backups",
    icon: ShieldCheck,
    hint: "Check that a database's latest backups can be read and restored.",
    short: "Check that backups restore",
  },
  "software-update": {
    label: "Update applications",
    icon: PackageCheck,
    hint: "Update the applications installed from the catalog, and optionally the system packages.",
    short: "Catalog apps and system packages",
  },
  "package-upgrade": {
    label: "Upgrade packages",
    icon: Package,
    hint: "Upgrade the system packages on servers, then clean up and restart the ones that need it.",
    short: "System updates, then restart if needed",
  },
  "docker-update": {
    label: "Update containers",
    icon: Container,
    hint: "Pull newer images and recreate the containers using them, putting the old image back if one breaks.",
    short: "Newer images, rolled back if they fail",
  },
  "docker-prune": {
    label: "Clean up Docker",
    icon: Trash2,
    hint: "Remove unused images, build cache, stopped containers and networks to free disk space.",
    short: "Free space taken by unused images",
  },
  "docker-volume-backup": {
    label: "Back up volumes",
    icon: HardDriveUpload,
    hint: "Copy Docker volumes from a server to a storage as .tar.gz files and keep the newest few.",
    short: "Docker volumes to a storage",
  },
  "pve-backup": {
    label: "Back up machines",
    icon: MonitorCog,
    hint: "Back up Proxmox virtual machines and containers with vzdump, to a backup storage or a Proxmox Backup Server.",
    short: "Proxmox VMs and containers (vzdump)",
  },
  "pve-snapshot": {
    label: "Snapshot machines",
    icon: Camera,
    hint: "Take snapshots of Proxmox machines and keep the newest few, deleting older ones.",
    short: "Rolling Proxmox snapshots",
  },
}

export const packageModes: Record<"all" | "security" | "full", string> = {
  all: "Every update",
  security: "Security updates only",
  full: "Full upgrade (apt)",
}

export const pveModes: Record<"snapshot" | "suspend" | "stop", string> = {
  snapshot: "Live (no downtime)",
  suspend: "Paused briefly",
  stop: "Shut down meanwhile",
}

export const pveCompress: Record<"zstd" | "lzo" | "gzip" | "0", string> = {
  zstd: "zstd (fast, small)",
  lzo: "lzo (fastest)",
  gzip: "gzip",
  "0": "None",
}

// The picker's groups, in order.
export const actionGroups: { label: string; actions: Action[] }[] = [
  { label: "Files", actions: ["sync", "archive", "fetch"] },
  { label: "Run", actions: ["script", "ansible"] },
  {
    label: "Servers",
    actions: ["service", "reboot", "package-upgrade", "software-update"],
  },
  {
    label: "Containers",
    actions: ["docker-update", "docker-prune", "docker-volume-backup"],
  },
  { label: "Virtual machines", actions: ["pve-backup", "pve-snapshot"] },
  { label: "Databases", actions: ["verify-backup"] },
]

export function ActionIcon({
  action,
  className,
}: {
  action: Action
  className?: string
}) {
  const Icon = actionMeta[action]?.icon ?? FolderSync
  return <Icon className={className} />
}

// sync and archive read a source; these three write files to destinations.
export const usesSource = (a: Action) => a === "sync" || a === "archive"
export const usesDestinations = (a: Action) =>
  a === "sync" || a === "archive" || a === "fetch"

// Only a sync has a Test run (counted, nothing changed).
export const canTest = (a: Action) => a === "sync"

const refWords: Record<ScheduleRef["kind"], string> = {
  server: "server",
  storage: "storage",
  script: "script",
  playbook: "playbook",
  database: "database",
  cluster: "cluster",
}

export function refName(
  refs: ScheduleRef[],
  kind: ScheduleRef["kind"],
  id: string | undefined,
) {
  const r = refs.find((x) => x.kind === kind && x.id === id)
  if (!r || r.missing || !r.name) return `Deleted ${refWords[kind]}`
  return r.name
}

// "web-1", or "3 servers".
export function serversText(refs: ScheduleRef[], ids: string[] | undefined) {
  const list = ids ?? []
  if (list.length === 1) return refName(refs, "server", list[0])
  return `${list.length} servers`
}

export const serviceVerbs = {
  start: "Start",
  stop: "Stop",
  restart: "Restart",
  reload: "Reload",
} as const

type Summarised = Pick<
  Schedule,
  "action" | "source" | "destinations" | "task" | "refs"
>

// What the job does, on one line: "Restart nginx on 3 servers".
export function jobSummary(s: Summarised): string {
  const t = s.task ?? {}
  switch (s.action) {
    case "archive":
      return `Archive ${flowText(s)}`
    case "fetch":
      return `${hostOf(t.fetch?.url)} → ${
        s.destinations.length === 1
          ? endName(s.destinations[0])
          : `${s.destinations.length} folders`
      }`
    case "script": {
      const name = t.script?.script_id
        ? refName(s.refs, "script", t.script.script_id)
        : t.script?.name || "Command"
      return `${name} on ${serversText(s.refs, t.script?.server_ids)}`
    }
    case "ansible": {
      const sel = t.ansible?.selection
      const where = sel?.all
        ? "every server"
        : [
            sel?.server_ids?.length ? serversText(s.refs, sel.server_ids) : "",
            sel?.tags?.length ? `tag ${sel.tags.join(", ")}` : "",
            sel?.folder_ids?.length
              ? `${sel.folder_ids.length} ${sel.folder_ids.length === 1 ? "folder" : "folders"}`
              : "",
          ]
            .filter(Boolean)
            .join(" + ") || "no servers"
      return `${refName(s.refs, "playbook", t.ansible?.playbook_id)} on ${where}`
    }
    case "service":
      return `${serviceVerbs[t.service?.action ?? "restart"]} ${
        t.service?.unit ?? ""
      } on ${serversText(s.refs, t.service?.server_ids)}`
    case "reboot":
      return `Reboot ${serversText(s.refs, t.reboot?.server_ids)}`
    case "verify-backup":
      return `Backups of ${refName(s.refs, "database", t.verify?.database_id)}`
    case "software-update": {
      const n = t.software?.recipes?.length ?? 0
      const what = n
        ? `Update ${n} ${n === 1 ? "application" : "applications"}`
        : "Update applications"
      return `${what}${t.software?.system ? " + system" : ""} on ${serversText(s.refs, t.software?.server_ids)}`
    }
    case "docker-update": {
      const n = t.docker?.only?.length ?? 0
      const what = n
        ? `Update ${n === 1 ? t.docker?.only?.[0] : `${n} projects`}`
        : "Update containers"
      return `${what} on ${serversText(s.refs, t.docker?.server_ids)}`
    }
    case "docker-prune":
      return `Clean up Docker on ${serversText(s.refs, t.prune?.server_ids)}`
    case "docker-volume-backup": {
      const v = t.volumes
      const n = v?.volumes?.length ?? 0
      const what = n === 1 ? v?.volumes?.[0] : n ? `${n} volumes` : "Volumes"
      return `${what} of ${refName(s.refs, "server", v?.server_id)} → ${refName(s.refs, "storage", v?.storage_id)}`
    }
    case "pve-backup":
    case "pve-snapshot": {
      const v = t.pve
      const verb = s.action === "pve-backup" ? "Back up" : "Snapshot"
      return `${verb} ${machinesText(v)} on ${refName(s.refs, "cluster", v?.cluster_id)}`
    }
    case "package-upgrade": {
      const p = t.packages
      const what = p?.mode === "security" ? "Security updates" : "Upgrade"
      const restart = p?.reboot === "if-required" ? ", restart if needed" : ""
      return `${what} on ${serversText(s.refs, p?.server_ids)}${restart}`
    }
    default:
      return flowText(s)
  }
}

// "every machine", "every machine but 2", "machine 101", "3 machines".
export function machinesText(v: SchedulePVE | undefined) {
  if (v?.all) {
    const n = v.skip?.length ?? 0
    return n ? `every machine but ${n}` : "every machine"
  }
  const n = v?.vmids?.length ?? 0
  return n === 1 ? `machine ${v?.vmids?.[0]}` : `${n} machines`
}

export function hostOf(url: string | undefined) {
  if (!url) return "Address"
  try {
    return new URL(url).host || url
  } catch {
    return url
  }
}

// ---- Times ----

// "0 3 * * *" → "At 03:00"; "@every 6h" → "Every 6h".
export function cronText(cron: string) {
  const c = cron.trim()
  const every = c.match(/^@every\s+(.+)$/i)
  if (every) return `Every ${every[1]}`
  return describe(c) ?? c
}

// A time as it reads in the job's zone.
export function formatInZone(iso: string | null | undefined, zone: string) {
  if (!iso) return "—"
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: zone || "UTC",
    }).format(new Date(iso))
  } catch {
    return new Date(iso).toLocaleString()
  }
}

export const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

export function zones(): string[] {
  try {
    const all = Intl.supportedValuesOf("timeZone")
    return all.includes("UTC") ? all : ["UTC", ...all]
  } catch {
    return ["UTC"]
  }
}

export function duration(from?: string | null, to?: string | null) {
  if (!from) return ""
  const ms =
    (to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime()
  if (ms < 1000) return "<1s"
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

// ---- URL state of /cronjobs ----

const shows = ["all", "active", "paused", "attention"] as const
export type Show = (typeof shows)[number]

const filters = {
  q: parseAsString.withDefault(""),
  show: parseAsStringLiteral(shows).withDefault("all"),
}

export function useCronjobFilters() {
  return useQueryStates(filters, { history: "replace" })
}

export const cronjobsHref = createSerializer(filters)

// ?run= on a job's page opens that run.
export const runParam = { run: parseAsString }
const runSerializer = createSerializer(runParam)
export const runHref = (scheduleId: string, runId: string) =>
  runSerializer(`/cronjobs/${scheduleId}`, { run: runId })

// /cronjobs/new?action=…&server=…&serverName=… starts a job with that action
// and server picked (e.g. Schedule upgrades on a server's Packages page).
export const newCronjobParams = {
  action: parseAsStringLiteral(
    Object.keys(actionMeta) as (keyof typeof actionMeta)[],
  ),
  server: parseAsString,
  serverName: parseAsString,
  // pve-backup / pve-snapshot: the cluster and, optionally, one machine.
  cluster: parseAsString,
  vmid: parseAsInteger,
}
const newSerializer = createSerializer(newCronjobParams)
export const newCronjobHref = (p: {
  action: Action
  server?: string
  serverName?: string
  cluster?: string
  vmid?: number
}) => newSerializer("/cronjobs/new", p)

const yesNo = (b: boolean | undefined) => (b ? "Yes" : "No")

const names = (refs: ScheduleRef[], ids: string[] | undefined) =>
  (ids ?? []).map((id) => refName(refs, "server", id)).join("\n") || "—"

const endsText = (ends: ScheduleEndView[]) =>
  ends.map((d) => `${endName(d)}:${d.path}`).join("\n") || "—"

export type TaskFact = { label: string; value: string }

// What the job does, as label/value rows (the job page, the phone sheet).
export function taskFacts(
  s: Summarised & Pick<Schedule, "options">,
  planName?: string,
): TaskFact[] {
  const t = s.task ?? {}
  switch (s.action) {
    case "sync":
      return [
        {
          label: "From",
          value: s.source ? `${endName(s.source)}:${s.source.path}` : "—",
        },
        { label: "To", value: endsText(s.destinations) },
        {
          label: "Mode",
          value: modeMeta[s.options.mode]?.label ?? s.options.mode,
        },
      ]
    case "archive":
      return [
        {
          label: "Folder",
          value: s.source ? `${endName(s.source)}:${s.source.path}` : "—",
        },
        { label: "To", value: endsText(s.destinations) },
        {
          label: "Keep",
          value: s.options.keep
            ? `The newest ${s.options.keep} archives`
            : "Every archive",
        },
      ]
    case "fetch":
      return [
        { label: "Address", value: t.fetch?.url ?? "—" },
        { label: "Save as", value: t.fetch?.name || "The address's file name" },
        { label: "Into", value: endsText(s.destinations) },
        { label: "Replace the file", value: yesNo(t.fetch?.overwrite) },
      ]
    case "script": {
      const sc = t.script
      return [
        {
          label: "Script",
          value: sc?.script_id
            ? refName(s.refs, "script", sc.script_id)
            : `${sc?.name || "Command"} (${sc?.interpreter ?? "bash"}, as ${
                sc?.run_as === "root" ? "root" : "the login user"
              })`,
        },
        { label: "Servers", value: names(s.refs, sc?.server_ids) },
        ...(sc?.env && Object.keys(sc.env).length > 0
          ? [
              {
                label: "Values",
                value: Object.entries(sc.env)
                  .map(([k, v]) => `${k}=${v}`)
                  .join("\n"),
              },
            ]
          : []),
      ]
    }
    case "ansible": {
      const a = t.ansible
      const sel = a?.selection
      return [
        {
          label: "Playbook",
          value: refName(s.refs, "playbook", a?.playbook_id),
        },
        {
          label: "Servers",
          value: sel?.all
            ? "Every server in the workspace"
            : [
                sel?.server_ids?.length ? names(s.refs, sel.server_ids) : "",
                sel?.tags?.length ? `Tagged ${sel.tags.join(", ")}` : "",
                sel?.folder_ids?.length
                  ? `${sel.folder_ids.length} ${sel.folder_ids.length === 1 ? "folder" : "folders"}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n") || "—",
        },
        ...(a?.options?.check
          ? [{ label: "Check mode", value: "Yes: reports, changes nothing" }]
          : []),
      ]
    }
    case "service":
      return [
        { label: "Service", value: t.service?.unit ?? "—" },
        {
          label: "Action",
          value: serviceVerbs[t.service?.action ?? "restart"],
        },
        { label: "Servers", value: names(s.refs, t.service?.server_ids) },
        ...(t.service?.force
          ? [{ label: "Even if protected", value: "Yes" }]
          : []),
      ]
    case "reboot":
      return [
        {
          label: "Servers",
          value: names(s.refs, t.reboot?.server_ids),
        },
        {
          label: "Only when needed",
          value: yesNo(t.reboot?.only_if_required),
        },
        {
          label: "Skip if someone is logged in",
          value: yesNo(t.reboot?.skip_if_logged_in),
        },
        ...(t.reboot?.message
          ? [{ label: "Message", value: t.reboot.message }]
          : []),
      ]
    case "verify-backup":
      return [
        {
          label: "Database",
          value: refName(s.refs, "database", t.verify?.database_id),
        },
        {
          label: "Backups",
          value: t.verify?.plan_id
            ? `The latest of ${planName ?? "one plan"}`
            : "The latest of every plan",
        },
      ]
    case "software-update": {
      const sw = t.software
      return [
        { label: "Servers", value: names(s.refs, sw?.server_ids) },
        {
          label: "Applications",
          value: sw?.recipes?.length
            ? sw.recipes.join(", ")
            : "Every one with an update",
        },
        {
          label: "System packages",
          value: sw?.system
            ? sw.security_only
              ? "Security updates only"
              : "Every update"
            : "No",
        },
        { label: "Servers at a time", value: String(sw?.parallel || 1) },
        { label: "Carry on after a failure", value: yesNo(sw?.keep_going) },
      ]
    }
    case "docker-update": {
      const d = t.docker
      return [
        { label: "Servers", value: names(s.refs, d?.server_ids) },
        {
          label: "Containers",
          value: d?.only?.length
            ? d.only.join("\n")
            : "Every running one with an update",
        },
        {
          label: "Ask the registries first",
          value: yesNo(d?.check),
        },
        {
          label: "Roll back if it fails",
          value: d?.rollback
            ? `Yes, watched for ${d.wait_seconds || 60} s`
            : "No",
        },
        { label: "Carry on after a failure", value: yesNo(d?.keep_going) },
      ]
    }
    case "docker-prune": {
      const p = t.prune
      const what = [
        p?.images === "all"
          ? "Every unused image"
          : p?.images === "dangling"
            ? "Untagged images"
            : "",
        p?.build_cache ? "Build cache" : "",
        p?.containers ? "Stopped containers" : "",
        p?.networks ? "Unused networks" : "",
        p?.volumes === "all"
          ? "Every unused volume"
          : p?.volumes === "anonymous"
            ? "Unnamed unused volumes"
            : "",
      ].filter(Boolean)
      return [
        { label: "Servers", value: names(s.refs, p?.server_ids) },
        { label: "Removes", value: what.join("\n") || "Nothing" },
        {
          label: "Only older than",
          value: p?.older_than_hours
            ? `${p.older_than_hours} hours`
            : "No limit",
        },
        { label: "Carry on after a failure", value: yesNo(p?.keep_going) },
      ]
    }
    case "docker-volume-backup": {
      const v = t.volumes
      return [
        { label: "Server", value: refName(s.refs, "server", v?.server_id) },
        {
          label: "Volumes",
          value: v?.volumes?.length ? v.volumes.join("\n") : "Every volume",
        },
        {
          label: "Storage",
          value: `${refName(s.refs, "storage", v?.storage_id)}\n${v?.folder || "/backups/docker-volumes"}`,
        },
        {
          label: "Copies kept",
          value: v?.keep ? String(v.keep) : "All",
        },
        { label: "Stop containers meanwhile", value: yesNo(v?.stop) },
        { label: "Carry on after a failure", value: yesNo(v?.keep_going) },
      ]
    }
    case "pve-backup":
    case "pve-snapshot": {
      const v = t.pve
      const machines = v?.all
        ? v.skip?.length
          ? `Every machine except ${v.skip.join(", ")}`
          : "Every machine on the cluster"
        : (v?.vmids ?? []).join(", ") || "—"
      const common = [
        { label: "Cluster", value: refName(s.refs, "cluster", v?.cluster_id) },
        { label: "Machines", value: machines },
      ]
      if (s.action === "pve-snapshot") {
        return [
          ...common,
          { label: "Names", value: `${v?.prefix || "auto"}_<date>_<time>` },
          {
            label: "Keep",
            value: v?.keep ? `The newest ${v.keep} per machine` : "Every one",
          },
          { label: "With memory", value: yesNo(v?.vmstate) },
          { label: "Carry on after a failure", value: yesNo(v?.keep_going) },
        ]
      }
      return [
        ...common,
        { label: "Storage", value: v?.storage || "—" },
        { label: "Mode", value: pveModes[v?.mode || "snapshot"] },
        { label: "Compression", value: pveCompress[v?.compress || "zstd"] },
        ...(v?.notes ? [{ label: "Note", value: v.notes }] : []),
        { label: "Protected", value: yesNo(v?.protected) },
        { label: "Carry on after a failure", value: yesNo(v?.keep_going) },
      ]
    }
    case "package-upgrade": {
      const p = t.packages
      const restart = p?.reboot === "if-required"
      return [
        { label: "Servers", value: names(s.refs, p?.server_ids) },
        { label: "Updates", value: packageModes[p?.mode ?? "all"] },
        {
          label: "Afterwards",
          value:
            [
              p?.autoremove ? "Remove unneeded packages" : "",
              p?.clean ? "Empty the package cache" : "",
            ]
              .filter(Boolean)
              .join("\n") || "Nothing",
        },
        {
          label: "Restart",
          value: restart
            ? p?.skip_if_logged_in
              ? "When needed, not while someone is logged in"
              : "When needed"
            : "Never",
        },
        ...(restart && p?.message
          ? [{ label: "Message", value: p.message }]
          : []),
        { label: "Servers at a time", value: String(p?.parallel || 1) },
        { label: "Carry on after a failure", value: yesNo(p?.keep_going) },
      ]
    }
  }
  return []
}
