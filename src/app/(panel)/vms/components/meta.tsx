import { Box, Copy, Loader2, Monitor } from "lucide-react"
import {
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import type { PVECluster, PVEGuest, PVENode, PVEStorage } from "@/lib/services"
import { cn } from "@/lib/utils"

// ---- clusters

export type ClusterStatus = PVECluster["status"]

export const clusterStatusMeta: Record<
  ClusterStatus,
  { label: string; dot: string }
> = {
  online: { label: "Online", dot: "bg-success" },
  unreachable: { label: "Unreachable", dot: "bg-destructive" },
  auth_failed: { label: "Token refused", dot: "bg-warning" },
  tls_error: { label: "Certificate not trusted", dot: "bg-destructive" },
  blocked: { label: "Address not allowed", dot: "bg-warning" },
  error: { label: "Error", dot: "bg-destructive" },
  unknown: { label: "Not checked", dot: "bg-mist" },
}

export function StatusDot({
  tone,
  checking = false,
  className,
}: {
  tone: string
  checking?: boolean
  className?: string
}) {
  if (checking) {
    return (
      <Loader2
        aria-label="Checking"
        className={cn("size-3 shrink-0 animate-spin text-ash", className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        tone,
        className,
      )}
    />
  )
}

// "3 of 3 nodes" when it answers.
export function clusterSummary(c: PVECluster) {
  if (c.status !== "online") return clusterStatusMeta[c.status].label
  const nodes =
    c.nodes_online < c.node_count
      ? `${c.nodes_online} of ${c.node_count} nodes up`
      : `${c.node_count} ${c.node_count === 1 ? "node" : "nodes"}`
  return `${nodes} · ${c.running_count} of ${c.guest_count} running`
}

// ---- machines

export type GuestState =
  | "running"
  | "stopped"
  | "paused"
  | "template"
  | "unknown"

export function guestState(
  g: Pick<PVEGuest, "status" | "template">,
): GuestState {
  if (g.template) return "template"
  if (g.status === "running") return "running"
  if (g.status === "paused" || g.status === "suspended") return "paused"
  if (g.status === "stopped") return "stopped"
  return "unknown"
}

export const guestStateMeta: Record<
  GuestState,
  { label: string; dot: string }
> = {
  running: { label: "Running", dot: "bg-success" },
  paused: { label: "Paused", dot: "bg-warning" },
  stopped: { label: "Stopped", dot: "bg-mist" },
  template: { label: "Template", dot: "bg-brand" },
  unknown: { label: "Unknown", dot: "bg-mist" },
}

// What Proxmox's lock names mean, for the "Busy" tag.
export const lockLabels: Record<string, string> = {
  backup: "Backing up",
  clone: "Cloning",
  create: "Being created",
  migrate: "Migrating",
  rollback: "Rolling back",
  snapshot: "Taking a snapshot",
  "snapshot-delete": "Deleting a snapshot",
  suspending: "Suspending",
  suspended: "Suspended to disk",
  disk: "Moving a disk",
  mounted: "Disk mounted",
}

export const lockLabel = (lock: string) =>
  lockLabels[lock] ?? `Locked (${lock})`

export const kindLabel = (kind: string) => (kind === "lxc" ? "Container" : "VM")
export const kindNoun = (kind: string) => (kind === "lxc" ? "container" : "VM")

export function GuestIcon({
  guest,
  className,
}: {
  guest: Pick<PVEGuest, "kind" | "template">
  className?: string
}) {
  const Icon = guest.template ? Copy : guest.kind === "lxc" ? Box : Monitor
  return <Icon className={className} />
}

export function GuestTile({
  guest,
  className,
}: {
  guest: Pick<PVEGuest, "kind" | "template" | "status">
  className?: string
}) {
  const on = guestState(guest) === "running"
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg",
        on
          ? "bg-brand-soft text-brand-strong"
          : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <GuestIcon guest={guest} className="size-1/2" />
    </span>
  )
}

export const guestName = (g: Pick<PVEGuest, "name" | "vmid">) =>
  g.name || `Machine ${g.vmid}`

// A stable key for a machine across clusters.
export const guestKey = (g: Pick<PVEGuest, "cluster_id" | "vmid">) =>
  `${g.cluster_id}/${g.vmid}`

// 0–100 of what it has; null when there is no limit to compare with.
export const share = (used: number, total: number) =>
  total > 0 ? Math.min(100, (used / total) * 100) : null

// ---- links

export const vmTabs = [
  "overview",
  "console",
  "hardware",
  "snapshots",
  "backups",
  "cloud-init",
  "firewall",
  "activity",
] as const
export type VmTab = (typeof vmTabs)[number]

export const vmHref = (cluster: string, vmid: number, tab?: VmTab) =>
  `/vms/${cluster}/${vmid}${tab && tab !== "overview" ? `/${tab}` : ""}`

export const pageTabs = ["machines", "nodes", "storage", "clusters"] as const
export const showChoices = [
  "all",
  "running",
  "stopped",
  "templates",
  "problems",
] as const
export const kindChoices = ["all", "qemu", "lxc"] as const

export const vmsParsers = {
  tab: parseAsStringLiteral(pageTabs).withDefault("machines"),
  q: parseAsString.withDefault(""),
  show: parseAsStringLiteral(showChoices).withDefault("all"),
  kind: parseAsStringLiteral(kindChoices).withDefault("all"),
  cluster: parseAsString.withDefault(""),
  node: parseAsString.withDefault(""),
}

export function useVmsFilters() {
  return useQueryStates(vmsParsers, { history: "replace" })
}

export const vmsHref = createSerializer(vmsParsers)

const newParsers = {
  cluster: parseAsString,
  kind: parseAsStringLiteral(["qemu", "lxc"] as const),
  template: parseAsString,
  node: parseAsString,
}
export const newVmHref = (
  p: {
    cluster?: string
    kind?: "qemu" | "lxc"
    template?: number
    node?: string
  } = {},
) =>
  createSerializer(newParsers)("/vms/new", {
    cluster: p.cluster ?? null,
    kind: p.kind ?? null,
    template: p.template ? String(p.template) : null,
    node: p.node ?? null,
  })
export { newParsers as newVmParsers }

// ---- matching

export function matchGuest(g: PVEGuest, q: string) {
  if (!q) return true
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const hay = [
    g.name,
    String(g.vmid),
    g.node,
    g.cluster_name,
    g.pool,
    ...g.tags,
    ...g.ips,
    g.link?.server_name ?? "",
  ]
    .join(" ")
    .toLowerCase()
  return words.every((w) => hay.includes(w))
}

// A machine that wants a look: locked a long time is normal, but a stopped
// machine with HA asking it to run, or a broken HA state, is not.
export function guestProblem(g: PVEGuest) {
  if (g.ha_state === "error" || g.ha_state === "fence")
    return `HA: ${g.ha_state}`
  if (g.ha_state === "started" && g.status === "stopped")
    return "HA wants it running"
  if (g.link && g.link.server_status !== "online" && g.status === "running")
    return `Server ${g.link.server_status.replace("_", " ")}`
  return null
}

export const nodeStatusMeta: Record<
  PVENode["status"],
  { label: string; dot: string }
> = {
  online: { label: "Online", dot: "bg-success" },
  offline: { label: "Offline", dot: "bg-destructive" },
  unknown: { label: "Unknown", dot: "bg-mist" },
}

export const storageActive = (s: Pick<PVEStorage, "status">) =>
  s.status === "available" || s.status === "active"

export const contentLabels: Record<string, string> = {
  images: "Disks",
  rootdir: "Container disks",
  iso: "ISO images",
  vztmpl: "Container templates",
  backup: "Backups",
  snippets: "Snippets",
  import: "Import",
}

// Proxmox times are Unix seconds.
export const fromUnix = (s?: number | null) =>
  s ? new Date(s * 1000).toISOString() : null
