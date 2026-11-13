"use client"

import { formatDuration, formatSize } from "@/lib/format"
import type {
  DockerPortOut,
  DockerProjectContainer,
  DockerProjectStats,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import { exitCode, type Tone } from "./meta"

// Shared bits for a compose project's live numbers: the cards on
// /containers/projects and the project page's Overview / Containers tabs.

export function pct(n: number) {
  if (!Number.isFinite(n)) return "—"
  return `${n < 10 ? n.toFixed(1) : Math.round(n)}%`
}

export function rate(n: number) {
  return `${formatSize(Math.max(0, n))}/s`
}

// Since a container (or the oldest one of a project) started: "3 days".
export function upFor(since?: string) {
  if (!since) return ""
  const s = (Date.now() - Date.parse(since)) / 1000
  return s > 0 ? formatDuration(s) : ""
}

// "8080→80", "127.0.0.1:5432→5432", "53→53/udp".
export function portLabel(p: DockerPortOut) {
  const proto = p.proto && p.proto !== "tcp" ? `/${p.proto}` : ""
  const ip =
    p.ip && p.ip !== "0.0.0.0" && p.ip !== "::" && p.ip !== "" ? `${p.ip}:` : ""
  return `${ip}${p.public}→${p.private}${proto}`
}

// One container's tone: what its dot in the bar and the tables shows.
export function containerTone(
  c: Pick<
    DockerProjectContainer,
    "state" | "oom_killed" | "health" | "exit_code" | "status"
  >,
): Tone {
  if (c.state === "dead" || c.oom_killed) return "destructive"
  if (c.health === "unhealthy") return "destructive"
  if (c.state === "restarting" || c.health === "starting") return "warning"
  if (c.state === "exited") {
    const code = c.exit_code || exitCode(c.status)
    return code ? "destructive" : "muted"
  }
  if (c.state === "running") return "success"
  return "muted"
}

// How much a project needs a look: 2 = something is broken, 1 = worth a
// glance, 0 = fine. Used for the sort and the card's ring.
export function attentionOf(s: DockerProjectStats | undefined) {
  if (!s) return 0
  if (s.unhealthy > 0) return 2
  if (s.containers.some((c) => containerTone(c) === "destructive")) return 2
  if (s.running < s.total || s.starting > 0) return 1
  return 0
}

// Memory as a share: of the containers' own limits when every one has a
// limit, else of the server's memory.
export function memoryShare(s: DockerProjectStats) {
  const limits = s.containers.filter((c) => c.state === "running")
  const limited =
    limits.length > 0 && limits.every((c) => c.memory_limit > 0)
      ? limits.reduce((t, c) => t + c.memory_limit, 0)
      : 0
  const of = limited || s.host_memory
  return {
    share: of ? (s.memory_used / of) * 100 : 0,
    of,
    limited: limited > 0,
  }
}

const segTone: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-mist",
  brand: "bg-brand",
}

// One segment per container, coloured by its state: the shape of a project
// at a glance.
export function ContainerBar({
  containers,
  className,
}: {
  containers: DockerProjectContainer[]
  className?: string
}) {
  const sorted = [...containers].sort((a, b) =>
    a.service.localeCompare(b.service),
  )
  if (sorted.length === 0)
    return <div className={cn("h-2 rounded-full bg-muted", className)} />
  return (
    <div className={cn("flex h-2 gap-0.5", className)} aria-hidden>
      {sorted.map((c) => (
        <span
          key={c.id}
          title={`${c.name}: ${c.status || c.state}`}
          className={cn(
            "h-full min-w-1 flex-1 first:rounded-s-full last:rounded-e-full",
            segTone[containerTone(c)],
          )}
        />
      ))}
    </div>
  )
}

// A small line with its area. `slots` fixes how many points fill the width
// (fewer points start further right, so the line grows in from the end).
// CPU charts never scale below 5% of a core, so idle jitter stays flat.
export const CPU_FLOOR = 5

export function Spark({
  values,
  max,
  slots,
  className,
  tone = "brand",
}: {
  values: number[]
  max?: number
  slots?: number
  className?: string
  tone?: "brand" | "warning" | "destructive"
}) {
  const w = 120
  const h = 32
  if (values.length < 2)
    return (
      <div
        className={cn(
          "flex h-8 w-full items-end text-[10px] text-ash",
          className,
        )}
      >
        <span className="w-full border-b border-dashed border-mist pb-0.5">
          Collecting…
        </span>
      </div>
    )
  const top = Math.max(max ?? 0, ...values, 1e-9)
  const n = Math.max(slots ?? values.length, values.length)
  const step = w / (n - 1)
  const start = w - (values.length - 1) * step
  const pts = values.map(
    (v, i) =>
      `${(start + i * step).toFixed(1)},${(h - (Math.min(v, top) / top) * (h - 2) - 1).toFixed(1)}`,
  )
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn(
        "h-8 w-full",
        tone === "brand" && "text-brand",
        tone === "warning" && "text-warning",
        tone === "destructive" && "text-destructive",
        className,
      )}
      aria-hidden
    >
      <polygon
        points={`${start.toFixed(1)},${h} ${pts.join(" ")} ${w},${h}`}
        className={cn(
          tone === "brand" && "fill-brand/10",
          tone === "warning" && "fill-warning/10",
          tone === "destructive" && "fill-destructive/10",
        )}
      />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Tone of a share (0–100) the way Meter shows it.
export function shareTone(v: number): "brand" | "warning" | "destructive" {
  return v >= 90 ? "destructive" : v >= 80 ? "warning" : "brand"
}
