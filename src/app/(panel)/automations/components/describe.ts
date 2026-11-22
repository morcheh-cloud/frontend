import { eventLabel } from "@/components/events/catalog"
import type {
  AutomationAction,
  AutomationTrigger,
  EventType,
} from "@/lib/services"
import { actsOnServers, type StepKind, stepMeta } from "./meta"

// Automations said in plain words, for the page's flow, the editor's aside
// and the list. `names` resolves ids the caller could look up.
export type Names = {
  scripts?: Map<string, string>
  cronjobs?: Map<string, string>
  servers?: Map<string, string>
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

const where = (a: AutomationAction, names: Names) => {
  if ((a.on || "event") === "event") return "on the event's server"
  const ids = a.server_ids ?? []
  if (ids.length === 1) return `on ${names.servers?.get(ids[0]) ?? "1 server"}`
  return `on ${plural(ids.length, "server", "servers")}`
}

const hostOf = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

// One step: "Restart nginx on the event's server".
export function stepSummary(a: AutomationAction, names: Names = {}): string {
  switch (a.kind as StepKind) {
    case "notify": {
      const n = a.channel_ids?.length ?? 0
      return n
        ? `Notify ${plural(n, "channel", "channels")}${a.title ? `: “${a.title}”` : ""}`
        : "Notify (no channel chosen)"
    }
    case "webhook":
      return a.url
        ? `${a.method || "POST"} ${hostOf(a.url)}`
        : "Call a URL (no address yet)"
    case "script": {
      const what = a.script_id
        ? (names.scripts?.get(a.script_id) ?? "a saved script")
        : (a.command
            ?.split("\n")
            .find((l) => l.trim())
            ?.trim() ?? "a command")
      return `Run ${what}${a.as_root && !a.script_id ? " as root" : ""} ${where(a, names)}`
    }
    case "service": {
      const verb = a.action || "restart"
      return `${verb[0].toUpperCase()}${verb.slice(1)} ${a.unit || "a service"} ${where(a, names)}`
    }
    case "check":
      return `Check again ${where(a, names)}`
    case "cronjob":
      return a.schedule_id
        ? `Run ${names.cronjobs?.get(a.schedule_id) ?? "a cron job"} and wait`
        : "Run a cron job (none chosen)"
    case "wait": {
      const s = a.seconds ?? 0
      return s >= 120 && s % 60 === 0 ? `Wait ${s / 60} min` : `Wait ${s} s`
    }
  }
  return stepMeta[a.kind as StepKind]?.label ?? a.kind
}

// "When an alert fires (title contains “Disk”, on 2 servers)".
export function triggerSentence(
  t: AutomationTrigger,
  catalog: EventType[] | undefined,
  names: Names = {},
) {
  if (t.kind === "webhook") return "When its incoming URL is called"
  if (t.kind === "manual") return "When someone presses Run now"
  const events = t.events ?? []
  const what = events.length
    ? events
        .map((e) => eventLabel(catalog, e).toLowerCase())
        .join(events.length === 2 ? " or " : ", ")
    : "an event (none chosen yet)"
  const f = t.filter ?? {}
  const parts: string[] = []
  if (f.servers?.length)
    parts.push(
      f.servers.length === 1
        ? `on ${names.servers?.get(f.servers[0]) ?? "1 server"}`
        : `on ${f.servers.length} servers`,
    )
  if (f.tags?.length) parts.push(`on servers tagged ${f.tags.join(" or ")}`)
  if (f.severity?.length) parts.push(`${f.severity.join(" or ")} only`)
  if (f.subjects?.length)
    parts.push(
      `about ${plural(f.subjects.length, "chosen thing", "chosen things")}`,
    )
  if (f.match?.trim()) parts.push(`title contains “${f.match.trim()}”`)
  return `When ${what}${parts.length ? ` (${parts.join(", ")})` : ""}`
}

// The whole automation in a few lines.
export function plainWords(
  t: AutomationTrigger,
  actions: AutomationAction[],
  catalog: EventType[] | undefined,
  names: Names = {},
) {
  const steps = actions.map((a, i) => {
    const s = stepSummary(a, names)
    const then = i === 0 ? "" : "then "
    const go =
      a.continue_on_error && i < actions.length - 1
        ? " (and go on if it fails)"
        : ""
    const lower = /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s
    return `${then}${lower}${go}`
  })
  return { when: triggerSentence(t, catalog, names), steps }
}

export const onServers = (a: AutomationAction) =>
  actsOnServers(a.kind) && (a.on || "event") === "event"
