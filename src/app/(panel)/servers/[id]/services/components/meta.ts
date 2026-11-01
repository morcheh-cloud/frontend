"use client"

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"

import { formatDuration } from "@/lib/format"
import type { Service } from "@/lib/services"

const states = ["running", "failed", "stopped", "all"] as const
export type StateFilter = (typeof states)[number]

export function useServicesFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      state: parseAsStringLiteral(states).withDefault("running"),
      q: parseAsString.withDefault(""),
    },
    { history: "replace" },
  )
  return { filters, setFilters }
}

// ---- State ----

export type State =
  | "running"
  | "exited"
  | "failed"
  | "restarting"
  | "changing"
  | "stopped"

// One word for where the service is, from systemd's active + sub states.
export function serviceState(s: Service): State {
  if (s.active === "failed") return "failed"
  if (s.active === "activating" && s.sub === "auto-restart") return "restarting"
  if (["activating", "deactivating", "reloading"].includes(s.active))
    return "changing"
  if (s.active === "active") return s.sub === "exited" ? "exited" : "running"
  return "stopped"
}

export const stateMeta: Record<
  State,
  { label: string; tone: "success" | "warning" | "muted"; hint: string }
> = {
  running: { label: "Running", tone: "success", hint: "Its process is up." },
  exited: {
    label: "Done",
    tone: "success",
    hint: "It ran once, finished fine and stays active (a oneshot).",
  },
  failed: {
    label: "Failed",
    tone: "warning",
    hint: "Its last run ended badly. Read its logs, fix it, then start it.",
  },
  restarting: {
    label: "Restarting",
    tone: "warning",
    hint: "It stopped and systemd is about to start it again.",
  },
  changing: {
    label: "Changing",
    tone: "muted",
    hint: "Starting, stopping or reloading right now.",
  },
  stopped: { label: "Stopped", tone: "muted", hint: "Not running." },
}

// Labels the transitional states properly ("Starting", "Stopping"…).
export function stateLabel(s: Service) {
  const st = serviceState(s)
  if (st !== "changing") return stateMeta[st].label
  if (s.active === "activating") return "Starting"
  if (s.active === "deactivating") return "Stopping"
  return "Reloading"
}

export function inFilter(s: Service, f: StateFilter) {
  const st = serviceState(s)
  if (f === "running") return st !== "failed" && st !== "stopped"
  if (f === "failed") return st === "failed"
  if (f === "stopped") return st === "stopped"
  return true
}

export function filterServices(list: Service[], f: StateFilter, q: string) {
  const needle = q.trim().toLowerCase()
  return list.filter(
    (s) =>
      inFilter(s, f) &&
      (!needle ||
        s.name.toLowerCase().includes(needle) ||
        s.description.toLowerCase().includes(needle)),
  )
}

// ---- Boot ----

const bootLabels: Record<string, string> = {
  enabled: "At boot",
  "enabled-runtime": "This boot only",
  disabled: "Manual",
  static: "Static",
  indirect: "Indirect",
  masked: "Masked",
  "masked-runtime": "Masked",
  generated: "Generated",
  transient: "Transient",
  alias: "Alias",
  linked: "Linked",
  "linked-runtime": "Linked",
}

export const bootHints: Record<string, string> = {
  enabled: "Starts when the server boots.",
  "enabled-runtime": "Enabled until the next reboot only.",
  disabled: "Doesn't start at boot; start it by hand or from another unit.",
  static:
    "Has no [Install] section: other units or sockets start it, so it can't be enabled.",
  indirect: "Started at boot through another unit (Also=).",
  masked: "Blocked: nothing can start it until it's unmasked.",
  generated: "Made at boot by a generator (e.g. from /etc/fstab or init.d).",
  transient: "Made on the fly, gone at the next reboot.",
  alias: "Another name for a different unit.",
}

export function bootLabel(s: Service) {
  if (!s.enabled) return "—"
  return bootLabels[s.enabled] ?? s.enabled
}

export const canEnable = (s: Service) =>
  ["disabled", "enabled-runtime", "linked", "linked-runtime"].includes(
    s.enabled,
  )
export const canDisable = (s: Service) =>
  ["enabled", "enabled-runtime", "indirect"].includes(s.enabled)
export const isMasked = (s: Service) =>
  s.enabled === "masked" ||
  s.enabled === "masked-runtime" ||
  s.load === "masked"

// ---- Numbers ----

// "3h 34m" since it entered its current state, when it's running.
export function upFor(s: Service, now: number) {
  if (!s.since || serviceState(s) !== "running") return null
  return formatDuration(Math.max(0, (now - Date.parse(s.since)) / 1000))
}

export function cpuTime(ns: number) {
  const s = ns / 1e9
  if (s < 1) return `${Math.round(s * 1000)} ms`
  if (s < 60) return `${s.toFixed(1)} s`
  return formatDuration(s)
}

// What the unit is called without .service, for headings.
export const shortName = (name: string) => name.replace(/\.service$/, "")

export const UNIT_NAME_RE = /^[A-Za-z0-9:_.-]+$/

export const signals = ["TERM", "HUP", "INT", "KILL", "USR1", "USR2"] as const
export type Signal = (typeof signals)[number]

// ---- Journal ----

export const priorities = [
  { value: "7", label: "All" },
  { value: "4", label: "Warnings" },
  { value: "3", label: "Errors" },
] as const

export const sinces = [
  { value: "", label: "Latest" },
  { value: "15m", label: "15 min" },
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "boot", label: "This boot" },
] as const

// ---- New service ----

export const restartPolicies = [
  { value: "on-failure", label: "When it fails" },
  { value: "always", label: "Always" },
  { value: "no", label: "Never" },
] as const
export type RestartPolicy = (typeof restartPolicies)[number]["value"]

export type NewService = {
  description: string
  command: string
  user: string
  directory: string
  restart: RestartPolicy
  environment: string
}

// A plain unit file for a long-running program.
export function unitText(n: NewService) {
  const env = n.environment
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.includes("="))
    .map((l) => `Environment=${/\s/.test(l) ? `"${l}"` : l}`)
  return [
    "[Unit]",
    `Description=${n.description || "My service"}`,
    "After=network-online.target",
    "Wants=network-online.target",
    "",
    "[Service]",
    "Type=simple",
    `ExecStart=${n.command}`,
    ...(n.user ? [`User=${n.user}`] : []),
    ...(n.directory ? [`WorkingDirectory=${n.directory}`] : []),
    ...env,
    `Restart=${n.restart}`,
    ...(n.restart === "no" ? [] : ["RestartSec=5"]),
    "",
    "[Install]",
    "WantedBy=multi-user.target",
    "",
  ].join("\n")
}

export const overrideTemplate = (unit: string) =>
  `# Changes to ${unit}: only what you set here replaces the packaged file.\n# A list setting (ExecStart=, Environment=…) is cleared by an empty line\n# first, e.g.\n#   ExecStart=\n#   ExecStart=/usr/bin/new-command\n[Service]\n`
