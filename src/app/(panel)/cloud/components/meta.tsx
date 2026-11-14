import { Loader2 } from "lucide-react"

import type { CloudAccount, CloudServer } from "@/lib/services"
import { cn } from "@/lib/utils"

export type AccountStatus = CloudAccount["status"]
export type ServerState = CloudServer["state"]

export const accountStatusMeta: Record<
  AccountStatus,
  { label: string; dot: string }
> = {
  online: { label: "Connected", dot: "bg-success" },
  unreachable: { label: "Unreachable", dot: "bg-destructive" },
  auth_failed: { label: "Key refused", dot: "bg-warning" },
  tls_error: { label: "TLS error", dot: "bg-destructive" },
  blocked: { label: "Address not allowed", dot: "bg-warning" },
  error: { label: "Error", dot: "bg-destructive" },
  unknown: { label: "Not checked", dot: "bg-mist" },
}

export const statusOf = (s: string): AccountStatus =>
  s in accountStatusMeta ? (s as AccountStatus) : "error"

export const serverStateMeta: Record<
  ServerState,
  { label: string; dot: string; tone: string }
> = {
  running: { label: "Running", dot: "bg-success", tone: "text-success" },
  stopped: { label: "Off", dot: "bg-mist", tone: "text-muted-foreground" },
  archived: {
    label: "Archived",
    dot: "bg-mist",
    tone: "text-muted-foreground",
  },
  building: { label: "Building", dot: "bg-brand", tone: "text-brand" },
  deleting: { label: "Deleting", dot: "bg-warning", tone: "text-warning" },
  error: { label: "Error", dot: "bg-destructive", tone: "text-destructive" },
  unknown: { label: "Unknown", dot: "bg-mist", tone: "text-muted-foreground" },
}

// The provider's task in words ("powering-on" → "Powering on").
export function taskLabel(task: string) {
  const words = task.replace(/[_-]+/g, " ").trim().toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function StatusDot({
  className,
  dot,
  busy = false,
}: {
  className?: string
  dot: string
  busy?: boolean
}) {
  if (busy) {
    return (
      <Loader2
        aria-hidden
        className={cn("size-3 shrink-0 animate-spin text-ash", className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        dot,
        className,
      )}
    />
  )
}

// A server's state as the dot + word lists show, with the provider's task
// when one is running.
export function ServerStateLabel({
  server,
  className,
}: {
  server: Pick<CloudServer, "state" | "task">
  className?: string
}) {
  const meta = serverStateMeta[server.state]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap",
        className,
      )}
    >
      <StatusDot dot={meta.dot} busy={!!server.task} />
      {server.task ? taskLabel(server.task) : meta.label}
    </span>
  )
}

export const providers = [
  {
    value: "arvan",
    label: "ArvanCloud",
    keyHint:
      "In the ArvanCloud panel: Profile › Access management › API keys. Give it read access to Cloud Server, plus actions if you'll power servers from here.",
  },
] as const

export type Provider = (typeof providers)[number]["value"]

export const providerLabel = (p: string) =>
  providers.find((x) => x.value === p)?.label ?? p

// "4 vCPU · 8 GB · 50 GB disk", leaving out what the provider didn't say.
export function sizeText(
  s: Pick<CloudServer, "cpu" | "memory_mb" | "disk_gb">,
) {
  const parts: string[] = []
  if (s.cpu) parts.push(`${s.cpu} vCPU`)
  if (s.memory_mb) parts.push(`${formatMemory(s.memory_mb)} RAM`)
  if (s.disk_gb) parts.push(`${s.disk_gb} GB disk`)
  return parts.join(" · ")
}

export function formatMemory(mb: number) {
  if (mb < 1024) return `${mb} MB`
  const gb = mb / 1024
  return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`
}

export const osText = (s: Pick<CloudServer, "os" | "os_version" | "image">) =>
  [s.os, s.os_version].filter(Boolean).join(" ") || s.image || ""

// The address to reach a server by: a public IPv4 first.
export function mainAddress(s: Pick<CloudServer, "addresses">) {
  const ranked = [...s.addresses].sort(
    (a, b) =>
      Number(b.public) - Number(a.public) ||
      (a.version ?? 4) - (b.version ?? 4),
  )
  return ranked[0]?.ip ?? ""
}

// The login user most images ship with, for "Add to Morche".
export function defaultUser(s: Pick<CloudServer, "os" | "image">) {
  const name = `${s.os} ${s.image}`.toLowerCase()
  if (name.includes("ubuntu")) return "ubuntu"
  if (name.includes("debian")) return "debian"
  return "root"
}

// Names the provider accepts (checked again by the backend).
export const serverNamePattern = /^[A-Za-z0-9][A-Za-z0-9.-]*$/
