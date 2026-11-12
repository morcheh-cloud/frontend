"use client"

import {
  createSerializer,
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import type {
  DockerContainer,
  DockerFleetServer,
  DockerPort,
} from "@/lib/services"
import { cn } from "@/lib/utils"

export type Tone = "success" | "warning" | "destructive" | "muted" | "brand"

// --- Container states ------------------------------------------------------

export const stateMeta: Record<string, { label: string; tone: Tone }> = {
  running: { label: "Running", tone: "success" },
  restarting: { label: "Restarting", tone: "warning" },
  paused: { label: "Paused", tone: "muted" },
  created: { label: "Created", tone: "muted" },
  removing: { label: "Removing", tone: "warning" },
  exited: { label: "Stopped", tone: "muted" },
  dead: { label: "Dead", tone: "destructive" },
}

export function stateOf(c: Pick<DockerContainer, "state">) {
  return stateMeta[c.state] ?? { label: c.state || "Unknown", tone: "muted" }
}

// "Exited (137) 2 hours ago" → 137.
export function exitCode(status: string) {
  const m = status.match(/^Exited \((-?\d+)\)/)
  return m ? Number(m[1]) : null
}

// Stopped with an error, dead, restarting over and over or unhealthy: what
// someone should look at.
export function isProblem(c: DockerContainer) {
  if (c.state === "dead" || c.state === "restarting") return true
  if (c.health === "unhealthy") return true
  const code = exitCode(c.status)
  return c.state === "exited" && code !== null && code !== 0
}

export const healthMeta = {
  healthy: { label: "Healthy", tone: "success" },
  unhealthy: { label: "Unhealthy", tone: "destructive" },
  starting: { label: "Starting", tone: "warning" },
} as const satisfies Record<string, { label: string; tone: Tone }>

const dotTone: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-mist",
  brand: "bg-brand",
}

export function Dot({ tone, className }: { tone: Tone; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-2 shrink-0 rounded-full", dotTone[tone], className)}
    />
  )
}

// The state as a dot and a word, with the exit code or health when they
// matter.
export function ContainerState({
  c,
  className,
}: {
  c: Pick<DockerContainer, "state" | "status" | "health">
  className?: string
}) {
  const s = stateOf(c)
  const code = c.state === "exited" ? exitCode(c.status) : null
  const health = c.health ? healthMeta[c.health] : null
  const tone: Tone =
    health?.tone === "destructive"
      ? "destructive"
      : code
        ? "destructive"
        : health?.tone === "warning"
          ? "warning"
          : s.tone
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        className,
      )}
    >
      <Dot tone={tone} />
      {s.label}
      {code ? (
        <span className="text-destructive">· exit {code}</span>
      ) : health && c.state === "running" ? (
        <span
          className={cn(
            health.tone === "success" ? "text-muted-foreground" : "",
            health.tone === "destructive" && "text-destructive",
            health.tone === "warning" && "text-warning",
          )}
        >
          · {health.label.toLowerCase()}
        </span>
      ) : null}
    </span>
  )
}

// --- Engines ---------------------------------------------------------------

export const engineStateMeta: Record<
  DockerFleetServer["state"],
  { label: string; tone: Tone; hint: string }
> = {
  ready: { label: "Ready", tone: "success", hint: "" },
  "not-installed": {
    label: "No Docker",
    tone: "muted",
    hint: "Neither Docker nor Podman is installed.",
  },
  stopped: {
    label: "Engine stopped",
    tone: "warning",
    hint: "Docker is installed but its daemon isn't running.",
  },
  "no-access": {
    label: "No access",
    tone: "warning",
    hint: "The login can't reach the Docker socket: add it to the docker group or allow sudo without a password.",
  },
  error: {
    label: "Error",
    tone: "destructive",
    hint: "Morche couldn't talk to the engine.",
  },
  offline: {
    label: "Offline",
    tone: "muted",
    hint: "The server can't be reached over SSH right now.",
  },
}

export const viaLabel: Record<string, string> = {
  socket: "Socket",
  sudo: "Through sudo",
  cli: "Through the CLI",
}

export function engineName(s: { podman: boolean }) {
  return s.podman ? "Podman" : "Docker"
}

// Worst first, then by name: what needs a look sits on top.
const engineRank: Record<DockerFleetServer["state"], number> = {
  error: 0,
  "no-access": 1,
  stopped: 2,
  ready: 3,
  offline: 4,
  "not-installed": 5,
}

// What OsTile needs from a fleet row (only the distro id is known there).
export function fleetOs(s: DockerFleetServer) {
  return {
    id: s.os_id ?? "",
    name: "",
    version: "",
    arch: "",
    family: "",
    kernel: "",
  }
}

export function fleetTrouble(s: DockerFleetServer) {
  return s.unhealthy + s.failed + s.restarting
}

export function byAttention(a: DockerFleetServer, b: DockerFleetServer) {
  return (
    engineRank[a.state] - engineRank[b.state] ||
    fleetTrouble(b) - fleetTrouble(a) ||
    a.name.localeCompare(b.name)
  )
}

// --- Ports and names -------------------------------------------------------

// "0.0.0.0:8080→80/tcp", or "80/tcp" when it isn't published.
export function portText(p: DockerPort) {
  const proto = p.protocol && p.protocol !== "tcp" ? `/${p.protocol}` : ""
  if (!p.public) return `${p.private}${proto}`
  const ip = p.ip && p.ip !== "0.0.0.0" && p.ip !== "::" ? `${p.ip}:` : ""
  return `${ip}${p.public}→${p.private}${proto}`
}

// One entry per published port (Docker lists IPv4 and IPv6 apart).
export function publishedPorts(ports: DockerPort[]) {
  const seen = new Set<string>()
  const out: DockerPort[] = []
  for (const p of ports) {
    if (!p.public) continue
    const ip = p.ip === "::" ? "0.0.0.0" : p.ip
    const key = `${ip}|${p.public}|${p.private}|${p.protocol}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...p, ip })
  }
  return out.sort((a, b) => a.public - b.public)
}

// "sha256:3f5c…" → "3f5c9a1b2c4d".
export function shortId(id: string) {
  return id.replace(/^sha256:/, "").slice(0, 12)
}

// An image reference without a registry's library prefix.
export function imageName(ref: string) {
  if (ref.startsWith("sha256:")) return shortId(ref)
  return ref.replace(/^docker\.io\/(library\/)?/, "")
}

// --- Compose projects ------------------------------------------------------

export type ProjectGroup = {
  key: string
  // Empty for containers outside any compose project.
  project: string
  dir?: string
  containers: DockerContainer[]
  running: number
  problems: number
}

export function groupByProject(list: DockerContainer[]): ProjectGroup[] {
  const groups = new Map<string, ProjectGroup>()
  for (const c of list) {
    const key = c.project || ""
    let g = groups.get(key)
    if (!g) {
      g = {
        key: key || "-",
        project: key,
        dir: c.compose_dir,
        containers: [],
        running: 0,
        problems: 0,
      }
      groups.set(key, g)
    }
    g.containers.push(c)
    if (c.state === "running") g.running++
    if (isProblem(c)) g.problems++
  }
  for (const g of groups.values()) g.containers.sort(byContainer)
  return [...groups.values()].sort((a, b) =>
    !a.project ? 1 : !b.project ? -1 : a.project.localeCompare(b.project),
  )
}

export function byContainer(a: DockerContainer, b: DockerContainer) {
  return (
    Number(isProblem(b)) - Number(isProblem(a)) ||
    (a.service ?? a.name).localeCompare(b.service ?? b.name)
  )
}

// --- URL state -------------------------------------------------------------

export const dockerTabs = [
  "containers",
  "images",
  "volumes",
  "networks",
  "system",
] as const
export type DockerTab = (typeof dockerTabs)[number]

export const showValues = ["all", "running", "stopped", "problems"] as const
export type Show = (typeof showValues)[number]

const dockerParsers = {
  tab: parseAsStringLiteral(dockerTabs).withDefault("containers"),
  q: parseAsString.withDefault(""),
  show: parseAsStringLiteral(showValues).withDefault("all"),
  flat: parseAsBoolean.withDefault(false),
}

export function useDockerFilters() {
  return useQueryStates(dockerParsers, { history: "replace" })
}

// Each section is its own Containers page; `env` picks the server there.
export const sectionPath: Record<DockerTab, string> = {
  containers: "/containers/list",
  images: "/containers/images",
  volumes: "/containers/volumes",
  networks: "/containers/networks",
  system: "/containers",
}

const dockerSerializer = createSerializer({
  env: parseAsString,
  q: dockerParsers.q,
  show: dockerParsers.show,
})

export function dockerHref(
  server: string,
  params: Partial<{ tab: DockerTab; q: string; show: Show }> = {},
) {
  const { tab = "containers", ...rest } = params
  return dockerSerializer(sectionPath[tab], { env: server, ...rest })
}

// Any Containers page on one server.
export function envHref(server: string, path = "/containers") {
  return dockerSerializer(path, { env: server })
}

export const containerTabs = ["overview", "logs", "stats", "inspect"] as const
export type ContainerTab = (typeof containerTabs)[number]

const containerParsers = {
  tab: parseAsStringLiteral(containerTabs).withDefault("overview"),
}

export function useContainerTab() {
  return useQueryStates(containerParsers, { history: "replace" })
}

const containerSerializer = createSerializer(containerParsers)

export function containerHref(
  server: string,
  container: string,
  tab?: ContainerTab,
) {
  return containerSerializer(
    `/containers/${server}/${encodeURIComponent(container)}`,
    { tab },
  )
}

export const fleetViews = ["servers", "containers"] as const

const fleetParsers = {
  view: parseAsStringLiteral(fleetViews).withDefault("servers"),
  q: parseAsString.withDefault(""),
  show: parseAsStringLiteral(showValues).withDefault("all"),
}

export function useFleetFilters() {
  return useQueryStates(fleetParsers, { history: "replace" })
}

export function matches(c: DockerContainer, q: string, show: Show) {
  if (show === "running" && c.state !== "running") return false
  if (show === "stopped" && c.state === "running") return false
  if (show === "problems" && !isProblem(c)) return false
  if (!q) return true
  const t = q.toLowerCase()
  return (
    c.name.toLowerCase().includes(t) ||
    c.image.toLowerCase().includes(t) ||
    (c.project ?? "").toLowerCase().includes(t) ||
    (c.service ?? "").toLowerCase().includes(t) ||
    c.id.startsWith(t) ||
    c.ports.some((p) => String(p.public || p.private).includes(t))
  )
}

export function counts(list: DockerContainer[]) {
  let running = 0
  let problems = 0
  for (const c of list) {
    if (c.state === "running") running++
    if (isProblem(c)) problems++
  }
  return {
    all: list.length,
    running,
    stopped: list.length - running,
    problems,
  }
}

export const showLabels: Record<Show, string> = {
  all: "All",
  running: "Running",
  stopped: "Stopped",
  problems: "Problems",
}

export const signals = [
  { value: "SIGTERM", hint: "Ask it to stop" },
  { value: "SIGKILL", hint: "End it at once" },
  { value: "SIGHUP", hint: "Reload settings (many programs)" },
  { value: "SIGINT", hint: "Like Ctrl+C" },
  { value: "SIGQUIT", hint: "Quit and dump core" },
  { value: "SIGUSR1", hint: "Program-defined" },
  { value: "SIGUSR2", hint: "Program-defined" },
] as const
