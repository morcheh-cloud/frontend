import type {
  Automation,
  AutomationAction,
  AutomationBody,
} from "@/lib/services"
import {
  actsOnServers,
  MAX_STEPS,
  type StepKind,
  type TriggerKind,
} from "./meta"
import type { Template } from "./templates"

// The editor's form: an automation as its fields, and back to the body the
// API takes (only the fields of each step's kind; Huma refuses the rest).

export type Header = {
  key: string
  name: string
  value: string
  saved: boolean
}

export type StepDraft = {
  // The form's own key; `id` is the saved step's, kept across edits (saved
  // webhook headers stay only with the same id, kind and address).
  key: string
  id?: string
  kind: StepKind
  label: string
  continueOnError: boolean
  channelIds: string[]
  title: string
  text: string
  url: string
  // The address the saved header values belong to.
  savedUrl?: string
  method: "POST" | "PUT" | "GET"
  headers: Header[]
  body: string
  allowInternal: boolean
  on: "event" | "servers"
  serverIds: string[]
  scriptMode: "saved" | "command"
  scriptId: string
  command: string
  interpreter: "bash" | "sh" | "python3"
  asRoot: boolean
  timeout: string
  unit: string
  action: "start" | "stop" | "restart" | "reload"
  scheduleId: string
  seconds: string
}

export type Draft = {
  name: string
  description: string
  enabled: boolean
  kind: TriggerKind
  events: string[]
  servers: string[]
  tags: string[]
  severity: string[]
  subjects: string[]
  match: string
  includeMuted: boolean
  steps: StepDraft[]
  cooldown: string
  maxPerHour: string
}

// Problems by place: "name", "trigger.events", "steps.<key>.<field>"…
export type Errors = Record<string, string>

let seq = 0
export const newKey = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`

const newHeader = (name = "", value = "", saved = false): Header => ({
  key: newKey(),
  name,
  value,
  saved,
})

export function blankStep(kind: StepKind, trigger: TriggerKind): StepDraft {
  return {
    key: newKey(),
    kind,
    label: "",
    continueOnError: false,
    channelIds: [],
    title: "",
    text: "",
    url: "",
    method: "POST",
    headers: [],
    body: "",
    allowInternal: false,
    // Without an event there's no event server to act on.
    on: trigger === "event" ? "event" : "servers",
    serverIds: [],
    scriptMode: "command",
    scriptId: "",
    command: "",
    interpreter: "bash",
    asRoot: false,
    timeout: "",
    unit: "",
    action: "restart",
    scheduleId: "",
    seconds: kind === "wait" ? "60" : "",
  }
}

export function stepFromAction(
  a: AutomationAction,
  trigger: TriggerKind,
): StepDraft {
  const s = blankStep(a.kind, trigger)
  return {
    ...s,
    id: a.id || undefined,
    label: a.label ?? "",
    continueOnError: !!a.continue_on_error,
    channelIds: a.channel_ids ?? [],
    title: a.title ?? "",
    text: a.text ?? "",
    url: a.url ?? "",
    savedUrl: a.id ? a.url : undefined,
    method: a.method || "POST",
    headers: Object.keys(a.headers ?? {}).map((name) =>
      newHeader(name, a.headers?.[name] ?? "", !!a.id),
    ),
    body: a.body ?? "",
    allowInternal: !!a.allow_internal,
    on: a.on === "servers" ? "servers" : a.on === "event" ? "event" : s.on,
    serverIds: a.server_ids ?? [],
    scriptMode: a.script_id ? "saved" : "command",
    scriptId: a.script_id ?? "",
    command: a.command ?? "",
    interpreter: a.interpreter || "bash",
    asRoot: !!a.as_root,
    timeout: a.timeout_seconds ? String(a.timeout_seconds) : "",
    unit: a.unit ?? "",
    action: a.action || "restart",
    scheduleId: a.schedule_id ?? "",
    seconds: a.seconds ? String(a.seconds) : s.seconds,
  }
}

export function draftFromSaved(a: Automation): Draft {
  const t = a.trigger
  return {
    name: a.name,
    description: a.description,
    enabled: a.enabled,
    kind: t.kind,
    events: t.events ?? [],
    servers: t.filter?.servers ?? [],
    tags: t.filter?.tags ?? [],
    severity: t.filter?.severity ?? [],
    subjects: t.filter?.subjects ?? [],
    match: t.filter?.match ?? "",
    includeMuted: !!t.include_muted,
    steps: a.actions.map((x) => stepFromAction(x, t.kind)),
    cooldown: String(a.cooldown_seconds),
    maxPerHour: String(a.max_runs_per_hour),
  }
}

export function freshDraft(): Draft {
  return {
    name: "",
    description: "",
    enabled: true,
    kind: "event",
    events: [],
    servers: [],
    tags: [],
    severity: [],
    subjects: [],
    match: "",
    includeMuted: false,
    steps: [],
    cooldown: "300",
    maxPerHour: "20",
  }
}

// A template as a new draft. Notify steps take the default channels.
export function draftFromTemplate(t: Template, defaultChannels: string[]) {
  const d = freshDraft()
  return {
    ...d,
    name: t.name,
    description: t.description,
    kind: t.trigger.kind,
    events: t.trigger.events ?? [],
    match: t.trigger.filter?.match ?? "",
    steps: t.actions.map((a) => {
      const s = stepFromAction(a, t.trigger.kind)
      return s.kind === "notify" && s.channelIds.length === 0
        ? { ...s, channelIds: defaultChannels }
        : s
    }),
    cooldown: String(t.cooldown ?? 300),
  }
}

const num = (v: string, fallback: number) => {
  const n = Number(v.trim())
  return v.trim() === "" || !Number.isFinite(n) ? fallback : Math.round(n)
}

// One step as the API takes it. `preview`: leave out header values that are
// blank (a dry run has no saved values to keep them with).
export function toAction(s: StepDraft, preview = false): AutomationAction {
  const base: AutomationAction = {
    kind: s.kind,
    ...(s.id ? { id: s.id } : {}),
    ...(s.label.trim() ? { label: s.label.trim() } : {}),
    ...(s.continueOnError ? { continue_on_error: true } : {}),
  }
  const on = actsOnServers(s.kind)
    ? {
        on: s.on,
        ...(s.on === "servers" ? { server_ids: s.serverIds } : {}),
      }
    : {}
  switch (s.kind) {
    case "notify":
      return {
        ...base,
        channel_ids: s.channelIds,
        title: s.title,
        text: s.text,
      }
    case "webhook": {
      // fromEntries defines own properties: a header typed as "__proto__"
      // can't reach the object's prototype.
      const headers: Record<string, string> = Object.fromEntries(
        s.headers
          .map((h) => [h.name.trim(), h.value] as const)
          .filter(([name, value]) => name && !(preview && !value)),
      )
      return {
        ...base,
        url: s.url.trim(),
        method: s.method,
        headers,
        body: s.method === "GET" ? "" : s.body,
        ...(s.allowInternal ? { allow_internal: true } : {}),
      }
    }
    case "script":
      return s.scriptMode === "saved"
        ? { ...base, ...on, script_id: s.scriptId }
        : {
            ...base,
            ...on,
            command: s.command,
            interpreter: s.interpreter,
            as_root: s.asRoot,
            timeout_seconds: num(s.timeout, 0),
          }
    case "service":
      return { ...base, ...on, unit: s.unit.trim(), action: s.action }
    case "check":
      return { ...base, ...on }
    case "cronjob":
      return { ...base, schedule_id: s.scheduleId }
    case "wait":
      return { ...base, seconds: num(s.seconds, 0) }
  }
  return base
}

export function toBody(d: Draft, preview = false): AutomationBody {
  const event = d.kind === "event"
  return {
    name: d.name.trim() || (preview ? "Untitled" : ""),
    description: d.description.trim(),
    enabled: d.enabled,
    trigger: {
      kind: d.kind,
      events: event ? d.events : [],
      filter: event
        ? {
            servers: d.servers,
            tags: d.tags,
            severity: d.severity,
            subjects: d.subjects,
            match: d.match.trim(),
          }
        : {},
      include_muted: event && d.includeMuted,
    },
    actions: d.steps.map((s) => toAction(s, preview)),
    cooldown_seconds: num(d.cooldown, 300),
    max_runs_per_hour: num(d.maxPerHour, 20),
  }
}

export const sameDraft = (a: Draft, b: Draft) =>
  JSON.stringify(toBody(a)) === JSON.stringify(toBody(b))

const unitRe = /^[A-Za-z0-9:_.@\\][A-Za-z0-9:_.@\\-]*$/
const hasTemplate = (s: string) => /\{\{\s*[A-Za-z0-9_.-]+\s*\}\}/.test(s)
const headerRe = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/
const reserved = ["content-length", "host", "transfer-encoding", "connection"]

const whole = (v: string, min: number, max: number) => {
  const t = v.trim()
  if (t === "") return true
  const n = Number(t)
  return Number.isInteger(n) && n >= min && n <= max
}

export const stepErr = (key: string, field: string) => `steps.${key}.${field}`

// What the backend would refuse, all at once (it answers one at a time).
export function checkDraft(d: Draft): Errors {
  const e: Errors = {}
  if (!d.name.trim()) e.name = "Give it a name."
  if (d.kind === "event" && d.events.length === 0)
    e["trigger.events"] = "Choose at least one event."
  if (d.steps.length === 0) e.actions = "Add at least one step."
  if (d.steps.length > MAX_STEPS) e.actions = `At most ${MAX_STEPS} steps.`
  if (!whole(d.cooldown, 0, 86400))
    e.cooldown_seconds = "Seconds, from 0 to 86400."
  if (!whole(d.maxPerHour, 0, 1000))
    e.max_runs_per_hour = "A whole number from 0 to 1000."
  for (const s of d.steps) {
    const at = (field: string, text: string) => {
      e[stepErr(s.key, field)] ??= text
    }
    if (actsOnServers(s.kind) && s.on === "servers" && !s.serverIds.length)
      at("server_ids", "Choose at least one server.")
    switch (s.kind) {
      case "notify":
        if (!s.channelIds.length)
          at("channel_ids", "Choose at least one channel.")
        break
      case "webhook": {
        const url = s.url.trim()
        let ok = false
        try {
          const u = new URL(url)
          ok = (u.protocol === "http:" || u.protocol === "https:") && !!u.host
          if (ok && (u.username || u.password))
            at("url", "Put credentials in a header, not in the address.")
        } catch {}
        if (!ok) at("url", "Enter an http:// or https:// address.")
        if (url.includes("{{"))
          at(
            "url",
            "The address can't use {{…}}: put values in the body or a header.",
          )
        for (const h of s.headers) {
          const name = h.name.trim()
          if (!name && !h.value) continue
          if (!headerRe.test(name))
            at("headers", `Not a valid header name: ${name || "(empty)"}`)
          else if (
            reserved.includes(name.toLowerCase()) ||
            /^x-morche-/i.test(name)
          )
            at("headers", `${name} is set by Morche.`)
          else if (!h.value && !(h.saved && url === s.savedUrl))
            at(
              "headers",
              h.saved
                ? `The address changed: give ${name} its value again.`
                : `Give ${name} a value.`,
            )
        }
        break
      }
      case "script":
        if (s.scriptMode === "saved" && !s.scriptId)
          at("script_id", "Choose a script.")
        if (s.scriptMode === "command" && !s.command.trim())
          at("command", "Write the command.")
        if (s.scriptMode === "command" && !whole(s.timeout, 0, 86400))
          at("timeout_seconds", "Seconds, up to 86400.")
        break
      case "service":
        if (!s.unit.trim()) at("unit", "Name the service.")
        else if (!hasTemplate(s.unit) && !unitRe.test(s.unit.trim()))
          at("unit", "Not a service name.")
        else if (d.kind === "webhook" && s.unit.includes("{{data."))
          at(
            "unit",
            "With an incoming URL, the service can't come from the request's data: name it here.",
          )
        break
      case "cronjob":
        if (!s.scheduleId) at("schedule_id", "Choose a cron job.")
        break
      case "wait":
        if (!whole(s.seconds, 1, 3600) || !s.seconds.trim())
          at("seconds", "Wait 1 to 3600 seconds.")
        break
    }
  }
  return e
}

// A backend field error ("actions[2].server_ids[0]") in the form's terms,
// by the order the steps were sent in.
export function mapServerError(path: string, keys: string[]): string {
  const step = /^actions\[(\d+)\]\.([a-z_]+)/.exec(path)
  if (step) {
    const key = keys[Number(step[1])]
    return key ? stepErr(key, step[2]) : "actions"
  }
  if (path.startsWith("trigger.filter.")) {
    return path.replace(/\[\d+\]$/, "")
  }
  if (path.startsWith("trigger.events")) return "trigger.events"
  if (path.startsWith("trigger")) return "trigger.kind"
  return path.replace(/\[\d+\]$/, "")
}

// The steps' keys that have a problem.
export const stepsWithErrors = (errors: Errors) =>
  new Set(
    Object.keys(errors)
      .filter((k) => k.startsWith("steps."))
      .map((k) => k.split(".")[1]),
  )

export const stepError = (errors: Errors, key: string) =>
  Object.entries(errors).find(([k]) => k.startsWith(`steps.${key}.`))?.[1]

export { newHeader }
