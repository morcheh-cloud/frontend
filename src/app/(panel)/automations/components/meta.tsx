import {
  Ban,
  BellRing,
  CalendarClock,
  CircleCheck,
  CircleSlash,
  CircleX,
  Clock3,
  FileCode,
  Hand,
  Hourglass,
  LoaderCircle,
  type LucideIcon,
  RefreshCw,
  ServerCog,
  Webhook,
  Zap,
} from "lucide-react"
import {
  createSerializer,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs"

import { eventLabel } from "@/components/events/catalog"
import type {
  Automation,
  AutomationAction,
  AutomationBody,
  AutomationRun,
  AutomationTrigger,
  EventType,
} from "@/lib/services"
import { cn } from "@/lib/utils"

export const AutomationIcon = Zap
export const LIST = "/automations"
export const RUNS = "/automations/runs"
export const NEW = "/automations/new"
export const MAX_STEPS = 10

// ---- steps ----

export type StepKind = AutomationAction["kind"]

export const stepKinds: StepKind[] = [
  "notify",
  "script",
  "service",
  "check",
  "cronjob",
  "webhook",
  "wait",
]

export const stepMeta: Record<
  StepKind,
  { label: string; short: string; hint: string; icon: LucideIcon }
> = {
  notify: {
    label: "Send a notification",
    short: "Notify",
    hint: "A message to one or more alert channels: email, Telegram, Slack…",
    icon: BellRing,
  },
  script: {
    label: "Run a script",
    short: "Script",
    hint: "A saved script or a command, on the event's server or chosen ones.",
    icon: FileCode,
  },
  service: {
    label: "Act on a service",
    short: "Service",
    hint: "Start, stop, restart or reload a systemd unit.",
    icon: ServerCog,
  },
  check: {
    label: "Check again",
    short: "Check",
    hint: "Re-check the server (or the event's monitor) right away.",
    icon: RefreshCw,
  },
  cronjob: {
    label: "Run a cron job",
    short: "Cron job",
    hint: "Starts one of Morche's cron jobs and waits for it to end.",
    icon: CalendarClock,
  },
  webhook: {
    label: "Call a URL",
    short: "Webhook",
    hint: "An HTTP request to your own tool, with the event in the body.",
    icon: Webhook,
  },
  wait: {
    label: "Wait",
    short: "Wait",
    hint: "Pause before the next step, 1 second to 1 hour.",
    icon: Hourglass,
  },
}

export function StepIcon({
  kind,
  className,
}: {
  kind: string
  className?: string
}) {
  const Icon = stepMeta[kind as StepKind]?.icon ?? Zap
  return <Icon className={className} />
}

// Steps that act on servers: on the event's server or on chosen ones.
export const actsOnServers = (k: string) =>
  k === "script" || k === "service" || k === "check"

// ---- triggers ----

export type TriggerKind = AutomationTrigger["kind"]

export const triggerMeta: Record<
  TriggerKind,
  { label: string; short: string; hint: string; icon: LucideIcon }
> = {
  event: {
    label: "When something happens",
    short: "When",
    hint: "An alert fires, a server goes offline, a backup or deploy fails…",
    icon: Zap,
  },
  webhook: {
    label: "Incoming URL",
    short: "Incoming URL",
    hint: "Your CI or any tool POSTs to a secret address of its own.",
    icon: Webhook,
  },
  manual: {
    label: "By hand",
    short: "By hand",
    hint: "Only when someone presses Run now.",
    icon: Hand,
  },
}

export const filterCount = (t: AutomationTrigger) => {
  const f = t.filter ?? {}
  return (
    (f.servers?.length ? 1 : 0) +
    (f.tags?.length ? 1 : 0) +
    (f.severity?.length ? 1 : 0) +
    (f.subjects?.length ? 1 : 0) +
    (f.match?.trim() ? 1 : 0)
  )
}

// "When Alert fired · 3 filters", "Incoming URL", "By hand".
export function triggerText(t: AutomationTrigger, catalog?: EventType[]) {
  if (t.kind !== "event") return triggerMeta[t.kind].label
  const events = t.events ?? []
  const names =
    events.length === 0
      ? "an event"
      : events.length <= 2
        ? events.map((e) => eventLabel(catalog, e)).join(" or ")
        : `${eventLabel(catalog, events[0])} +${events.length - 1}`
  const n = filterCount(t)
  return `When ${names}${n ? ` · ${n} filter${n === 1 ? "" : "s"}` : ""}`
}

// ---- runs ----

export const runStatuses = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "skipped",
  "canceled",
] as const satisfies AutomationRun["status"][]

export const statusMeta: Record<
  string,
  { label: string; icon: LucideIcon; tone: string; bg: string }
> = {
  queued: {
    label: "Waiting",
    icon: Clock3,
    tone: "text-muted-foreground",
    bg: "bg-mist",
  },
  running: {
    label: "Running",
    icon: LoaderCircle,
    tone: "text-brand",
    bg: "bg-brand",
  },
  pending: {
    label: "Not started",
    icon: Clock3,
    tone: "text-ash",
    bg: "bg-mist",
  },
  succeeded: {
    label: "Worked",
    icon: CircleCheck,
    tone: "text-success",
    bg: "bg-success",
  },
  failed: {
    label: "Failed",
    icon: CircleX,
    tone: "text-destructive",
    bg: "bg-destructive",
  },
  skipped: {
    label: "Skipped",
    icon: CircleSlash,
    tone: "text-ash",
    bg: "bg-ash/50",
  },
  canceled: {
    label: "Stopped",
    icon: Ban,
    tone: "text-muted-foreground",
    bg: "bg-muted-foreground/60",
  },
}

export function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const m = statusMeta[status] ?? statusMeta.queued
  const Icon = m.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-body-sm font-medium whitespace-nowrap",
        m.tone,
        className,
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          status === "running" && "animate-spin",
        )}
      />
      {m.label}
    </span>
  )
}

export const triggerKindText: Record<string, string> = {
  event: "Event",
  webhook: "Incoming URL",
  manual: "Run now",
  test: "Test",
}

// "Run now by Ali", "Event: web-1 is offline".
export function startedText(r: AutomationRun) {
  if (r.trigger_kind === "manual" || r.trigger_kind === "test") {
    return `${triggerKindText[r.trigger_kind]}${r.started_by_name ? ` by ${r.started_by_name}` : ""}`
  }
  if (r.trigger_kind === "webhook") return "Incoming URL"
  return r.event?.title || "Event"
}

// "1 min 12 s", "3.4 s".
export function duration(from: string, to?: string | null) {
  const ms =
    (to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime()
  if (ms < 0) return "—"
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)} s`
  const s = Math.round(ms / 1000)
  if (s < 120) return `${s} s`
  const m = Math.floor(s / 60)
  if (m < 120) return `${m} min ${s % 60 ? `${s % 60} s` : ""}`.trim()
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

export const failing = (a: Automation) =>
  !!a.problem || a.last_status === "failed"

// ---- URL state ----

export const listShows = ["all", "on", "off", "failing"] as const
export type ListShow = (typeof listShows)[number]

export const listParsers = {
  q: parseAsString.withDefault(""),
  show: parseAsStringLiteral(listShows).withDefault("all"),
}

const statusFilter = parseAsStringLiteral(runStatuses)

export const pageParsers = {
  status: statusFilter,
  page: parseAsInteger.withDefault(1),
}

export const runsParsers = {
  automation: parseAsString,
  status: statusFilter,
  page: parseAsInteger.withDefault(1),
}

export const runParam = { run: parseAsString }

const pageHref = createSerializer({ ...runParam })
const runsHrefOf = createSerializer({ ...runsParsers, ...runParam })
const newHref = createSerializer({ template: parseAsString })

export const automationHref = (id: string, run?: string) =>
  pageHref(`${LIST}/${id}`, { run: run ?? null })

export const editHref = (id: string) => `${LIST}/${id}/edit`

export const newAutomationHref = (template?: string) =>
  newHref(NEW, { template: template ?? null })

export const runsHref = (
  values: {
    automation?: string
    status?: AutomationRun["status"]
    run?: string
  } = {},
) =>
  runsHrefOf(RUNS, {
    automation: values.automation ?? null,
    status: values.status ?? null,
    run: values.run ?? null,
  })

// ---- the body a save sends ----

// A saved automation as a body again, every field spelled out: PUT replaces
// the whole thing, and a left-out enabled / cooldown / max per hour would
// fall back to the defaults. Header values come back blank, which keeps the
// saved ones.
export function bodyOf(
  a: Automation,
  patch: Partial<AutomationBody> = {},
): AutomationBody {
  return {
    name: a.name,
    description: a.description,
    enabled: a.enabled,
    trigger: a.trigger,
    actions: a.actions,
    cooldown_seconds: a.cooldown_seconds,
    max_runs_per_hour: a.max_runs_per_hour,
    ...patch,
  }
}

// ---- variables ----

export const templateVars: { key: string; label: string; hint: string }[] = [
  { key: "event.title", label: "Title", hint: "What happened, in a line" },
  { key: "event.text", label: "Text", hint: "The details" },
  { key: "event.severity", label: "Severity", hint: "info, warning, critical" },
  { key: "event.type", label: "Type", hint: "alert.fired, server.offline…" },
  { key: "event.url", label: "Link", hint: "The panel page about it" },
  { key: "event.at", label: "Time", hint: "When, in RFC 3339 (UTC)" },
  { key: "subject.name", label: "Subject", hint: "The monitor, database…" },
  { key: "subject.kind", label: "Subject kind", hint: "server, monitor…" },
  { key: "server.name", label: "Server", hint: "The event's server" },
  { key: "server.host", label: "Host", hint: "Its address" },
  { key: "data.detail", label: "Detail", hint: "data.<key> reads any field" },
  { key: "automation.name", label: "Automation", hint: "This automation" },
  { key: "run.url", label: "Run link", hint: "This run in the panel" },
  { key: "event.json", label: "Event JSON", hint: "The whole event" },
]

export const envVars: { name: string; hint: string }[] = [
  { name: "MORCHE_EVENT_TYPE", hint: "alert.fired, server.offline…" },
  { name: "MORCHE_EVENT_TITLE", hint: "What happened" },
  { name: "MORCHE_EVENT_TEXT", hint: "The details" },
  { name: "MORCHE_EVENT_SEVERITY", hint: "info, warning, critical" },
  { name: "MORCHE_EVENT_URL", hint: "The panel page" },
  { name: "MORCHE_EVENT_AT", hint: "When (UTC)" },
  { name: "MORCHE_EVENT_ID", hint: "The event's id" },
  { name: "MORCHE_EVENT_JSON", hint: "The whole event" },
  { name: "MORCHE_SUBJECT_KIND", hint: "server, monitor…" },
  { name: "MORCHE_SUBJECT_ID", hint: "Its id" },
  { name: "MORCHE_SUBJECT_NAME", hint: "Its name" },
  { name: "MORCHE_SERVER_ID", hint: "The event's server" },
  { name: "MORCHE_SERVER_NAME", hint: "Its name" },
  { name: "MORCHE_SERVER_HOST", hint: "Its address" },
  { name: "MORCHE_AUTOMATION_ID", hint: "This automation" },
  { name: "MORCHE_AUTOMATION_NAME", hint: "Its name" },
  { name: "MORCHE_RUN_ID", hint: "This run" },
]

export const severities = ["info", "warning", "critical"] as const
