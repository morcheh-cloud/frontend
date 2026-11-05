import {
  type Document,
  isMap,
  isScalar,
  isSeq,
  parseDocument,
  stringify,
  visit,
} from "yaml"

// The visual builder's view of a playbook. The YAML text stays the source of
// truth: the builder parses it into this, edits this, and writes it back.
// Anything it doesn't understand (blocks, roles, local_action…) is kept as it
// is and shown as YAML, so a round trip never drops work.

export type Args = Record<string, unknown>

export type ModuleStep = {
  id: string
  kind: "module"
  /** As written: ansible.builtin.apt or apt. */
  module: string
  args: Args
  /** The bare argument of command/shell/raw…: `shell: echo hi`. */
  free?: string
  name: string
  /** Task keywords (when, loop, become…) in their written order. */
  keywords: Args
}

export type RawStep = { id: string; kind: "raw"; value: unknown }

export type Step = ModuleStep | RawStep

export type Play = {
  id: string
  kind: "play"
  /** Everything but tasks and handlers, in their written order. */
  fields: Args
  tasks: Step[]
  handlers: Step[]
}

export type RawPlay = { id: string; kind: "raw"; value: unknown }

export type Model = (Play | RawPlay)[]

let seq = 0
export const newId = () => `n${++seq}`

// Ansible reads YAML 1.1: yes/no/on/off are booleans, 0644 is octal.
const yamlOptions = { version: "1.1" as const }

// Task keywords Ansible knows besides the module (playbook keywords, Task).
export const taskKeywords = new Set([
  "name",
  "action",
  "args",
  "any_errors_fatal",
  "async",
  "become",
  "become_exe",
  "become_flags",
  "become_method",
  "become_user",
  "changed_when",
  "check_mode",
  "collections",
  "connection",
  "debugger",
  "delay",
  "delegate_facts",
  "delegate_to",
  "diff",
  "environment",
  "failed_when",
  "ignore_errors",
  "ignore_unreachable",
  "listen",
  "local_action",
  "loop",
  "loop_control",
  "module_defaults",
  "no_log",
  "notify",
  "poll",
  "port",
  "register",
  "remote_user",
  "retries",
  "run_once",
  "tags",
  "throttle",
  "timeout",
  "until",
  "vars",
  "when",
])

const isKeyword = (k: string) => taskKeywords.has(k) || k.startsWith("with_")

// Keys that make a task something other than one module call.
const rawTaskKeys = ["block", "rescue", "always", "action", "local_action"]

// Modules whose bare argument is a command line, never key=value pairs.
const freeFormModules = new Set([
  "command",
  "shell",
  "raw",
  "script",
  "win_command",
  "win_shell",
  "include_tasks",
  "import_tasks",
  "include_vars",
  "include_role",
  "import_role",
  "import_playbook",
  "meta",
])

export const shortName = (module: string) => module.split(".").pop() ?? module

const isObject = (v: unknown): v is Args =>
  typeof v === "object" && v !== null && !Array.isArray(v)

// `name=nginx state=present` → {name: "nginx", state: "present"}, or null
// when it isn't all pairs.
function keyValues(text: string): Args | null {
  const tokens = text.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []
  if (tokens.length === 0) return null
  const out: Args = {}
  for (const t of tokens) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]*)$/.exec(t)
    if (!m) return null
    out[m[1]] = m[2].replace(/^(["'])([\s\S]*)\1$/, "$2")
  }
  return out
}

export function parseStep(value: unknown): Step {
  const raw: RawStep = { id: newId(), kind: "raw", value }
  if (!isObject(value)) return raw
  const keys = Object.keys(value)
  if (keys.some((k) => rawTaskKeys.includes(k))) return raw
  const modules = keys.filter((k) => !isKeyword(k))
  if (modules.length !== 1) return raw
  const module = modules[0]
  const v = value[module]
  let args: Args = {}
  let free: string | undefined
  if (typeof v === "string") {
    const pairs = freeFormModules.has(shortName(module)) ? null : keyValues(v)
    if (pairs) args = pairs
    else free = v
  } else if (isObject(v)) {
    args = { ...v }
  } else if (v != null) {
    return raw
  }
  const keywords: Args = {}
  for (const k of keys) {
    if (k === module || k === "name") continue
    if (k === "args") {
      if (!isObject(value.args)) return raw
      args = { ...args, ...value.args }
      continue
    }
    keywords[k] = value[k]
  }
  const name = value.name
  if (name != null && typeof name !== "string") return raw
  return {
    id: newId(),
    kind: "module",
    module,
    args,
    free,
    name: name ?? "",
    keywords,
  }
}

export function stepValue(s: Step): unknown {
  if (s.kind === "raw") return s.value
  const out: Args = {}
  if (s.name.trim()) out.name = s.name
  const hasArgs = Object.keys(s.args).length > 0
  if (s.free != null && s.free !== "") {
    out[s.module] = s.free
    if (hasArgs) out.args = s.args
  } else {
    out[s.module] = hasArgs ? s.args : {}
  }
  for (const [k, v] of Object.entries(s.keywords)) out[k] = v
  return out
}

// A play always has hosts; Visual has no field for them, so a play that lacks
// them gets `all` here, right after its name.
function withHosts(fields: Args): Args {
  const { name, hosts, ...rest } = fields
  if (hosts != null && hosts !== "") return fields
  return { ...(name === undefined ? {} : { name }), hosts: "all", ...rest }
}

// What a play's hosts narrow the run to, null when it takes every picked server.
export function narrowedTo(hosts: unknown): string | null {
  if (hosts === "all" || hosts === "*") return null
  return Array.isArray(hosts) ? hosts.join(", ") : String(hosts)
}

function parsePlay(value: unknown): Play | RawPlay {
  if (!isObject(value) || "import_playbook" in value) {
    return { id: newId(), kind: "raw", value }
  }
  const { tasks, handlers, ...fields } = value
  if (
    (tasks != null && !Array.isArray(tasks)) ||
    (handlers != null && !Array.isArray(handlers))
  ) {
    return { id: newId(), kind: "raw", value }
  }
  return {
    id: newId(),
    kind: "play",
    fields: withHosts(fields),
    tasks: (tasks ?? []).map(parseStep),
    handlers: (handlers ?? []).map(parseStep),
  }
}

// Keep values YAML 1.1 would rewrite beyond recognition as they were written:
// a mode of 0644 would come back as 420, and a date as a full timestamp.
// Ansible reads "0644" as the same octal mode.
function keepWritten(doc: Document) {
  visit(doc, {
    Scalar(_key, node) {
      const octal = node.format === "OCT" && typeof node.value === "number"
      if ((octal || node.value instanceof Date) && node.source) {
        node.value = node.source
      }
    },
  })
}

export type Parsed =
  | { ok: true; model: Model; comments: boolean }
  | { ok: false; error: string }

export function parsePlaybook(text: string): Parsed {
  if (!text.trim()) return { ok: true, model: [], comments: false }
  const doc = parseDocument(text, { ...yamlOptions, prettyErrors: false })
  if (doc.errors.length > 0) return { ok: false, error: doc.errors[0].message }
  if (doc.contents != null && !isSeq(doc.contents)) {
    return {
      ok: false,
      error: "A playbook is a list of plays, each starting with “- name:”.",
    }
  }
  let comments = !!(doc.commentBefore || doc.comment)
  visit(doc, (_key, node) => {
    if (
      (isScalar(node) || isMap(node) || isSeq(node)) &&
      (node.commentBefore || node.comment)
    ) {
      comments = true
      return visit.BREAK
    }
  })
  keepWritten(doc)
  const value = doc.toJS() as unknown[] | null
  return { ok: true, model: (value ?? []).map(parsePlay), comments }
}

export function playValue(p: Play | RawPlay): unknown {
  if (p.kind === "raw") return p.value
  const { name, ...rest } = p.fields
  const blank = typeof name === "string" && !name.trim()
  const out: Args = blank ? rest : { ...p.fields }
  out.tasks = p.tasks.map(stepValue)
  if (p.handlers.length > 0) out.handlers = p.handlers.map(stepValue)
  return out
}

export function toYaml(value: unknown): string {
  return stringify(value, { ...yamlOptions, lineWidth: 0, indent: 2 })
}

export function printPlaybook(model: Model): string {
  if (model.length === 0) return ""
  return toYaml(model.map(playValue))
}

// A YAML snippet typed into a field: undefined when it's empty.
export function readYaml(
  text: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (!text.trim()) return { ok: true, value: undefined }
  const doc = parseDocument(text, { ...yamlOptions, prettyErrors: false })
  if (doc.errors.length > 0) return { ok: false, error: doc.errors[0].message }
  keepWritten(doc)
  return { ok: true, value: doc.toJS() }
}

export const showYaml = (value: unknown) =>
  value === undefined ? "" : toYaml(value).replace(/\n$/, "")

export function newPlay(): Play {
  return {
    id: newId(),
    kind: "play",
    fields: { name: "", hosts: "all", become: true },
    tasks: [],
    handlers: [],
  }
}

export function newStep(module: string, args: Args = {}): ModuleStep {
  return { id: newId(), kind: "module", module, args, name: "", keywords: {} }
}

// One line saying what a task does: `name=nginx state=present`.
export function argsSummary(s: ModuleStep): string {
  const parts: string[] = []
  if (s.free) parts.push(s.free.split("\n")[0])
  for (const [k, v] of Object.entries(s.args)) {
    const text =
      typeof v === "string" || typeof v === "number" || typeof v === "boolean"
        ? String(v).split("\n")[0]
        : Array.isArray(v)
          ? v.map((x) => (isObject(x) ? "{…}" : String(x))).join(", ")
          : "{…}"
    parts.push(`${k}=${text}`)
  }
  return parts.join("  ")
}
