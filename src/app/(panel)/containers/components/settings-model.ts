import type { DockerSettings, DockerSettingsOverrides } from "@/lib/services"

// The settings a workspace keeps, and that an environment can set for
// itself (the same keys; a missing one follows the workspace).
export type Settings = Omit<DockerSettings, "$schema" | "updated_at">
export type SettingKey = keyof Settings
export type Overrides = Partial<Settings>

// What the backend uses for a workspace that never saved its settings
// (defaultDockerSettings in the backend).
export const defaults: Settings = {
  projects_dir: "/opt/morcheh/projects",
  remove_orphans: true,
  versions_keep: 50,
  default_restart: "",
  default_memory_mb: 0,
  default_cpus: 0,
  default_log_max_mb: 0,
  default_log_files: 0,
  update_check: true,
  update_check_hours: 24,
  scanner_image: "aquasec/trivy:latest",
  scan_ignore_unfixed: false,
  notify_updates: false,
  notify_vulns: "off",
  notify_channels: [],
  prune_auto: false,
  prune_hours: 168,
  prune_images: "dangling",
  prune_containers: false,
  prune_networks: true,
  prune_build_cache: true,
  prune_older_hours: 24,
  backup_storage_id: "",
  backup_folder: "",
  backup_stop: false,
  backup_keep: 0,
  events_hours: 24,
  stats_days: 30,
}

export const settingKeys = Object.keys(defaults) as SettingKey[]

export function settingsOf(s: DockerSettings): Settings {
  const out = {} as Record<SettingKey, unknown>
  for (const k of settingKeys) out[k] = s[k] ?? defaults[k]
  return out as Settings
}

export function overridesOf(o: DockerSettingsOverrides | undefined) {
  const out: Record<string, unknown> = {}
  for (const k of settingKeys) {
    const v = o?.[k]
    if (v !== undefined && v !== null) out[k] = v
  }
  return out as Overrides
}

export const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b)

// Overrides are equal when they set the same keys to the same values.
export function sameOverrides(a: Overrides, b: Overrides) {
  const ka = Object.keys(a) as SettingKey[]
  const kb = Object.keys(b)
  return ka.length === kb.length && ka.every((k) => same(a[k], b[k]))
}

// --- Choices ----------------------------------------------------------------

export type Choice = { value: string; label: string }

// The periods the event log offers; the setting picks its starting one.
export const eventPeriods = ["1", "6", "24", "72", "168"] as const
export const eventPeriodLabels: Record<(typeof eventPeriods)[number], string> =
  {
    "1": "Last hour",
    "6": "6 hours",
    "24": "24 hours",
    "72": "3 days",
    "168": "7 days",
  }

export const periods: Choice[] = eventPeriods.map((v) => ({
  value: v,
  label: eventPeriodLabels[v],
}))

// How long project numbers are kept for the Overview's charts (0 = off).
export const statsKeep: Choice[] = [
  { value: "0", label: "Off" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
]

export const updateEvery: Choice[] = [
  { value: "6", label: "Every 6 hours" },
  { value: "12", label: "Every 12 hours" },
  { value: "24", label: "Once a day" },
  { value: "72", label: "Every 3 days" },
  { value: "168", label: "Once a week" },
]

export const versionsKeep: Choice[] = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
  { value: "200", label: "200" },
]

export const restartChoices: {
  value: Settings["default_restart"]
  label: string
  hint: string
}[] = [
  {
    value: "",
    label: "As written",
    hint: "Nothing is added; a service without a policy is never restarted.",
  },
  {
    value: "unless-stopped",
    label: "Unless stopped",
    hint: "Restarts after a crash and a reboot, but stays down once you stop it. The usual pick for servers.",
  },
  {
    value: "always",
    label: "Always",
    hint: "Restarts after a crash and a reboot, even one you stopped by hand.",
  },
  {
    value: "on-failure",
    label: "On failure",
    hint: "Restarts only after it exits with an error; not after a reboot.",
  },
  {
    value: "no",
    label: "Never",
    hint: 'Writes restart: "no" into each service.',
  },
]

// Log rotation presets: size of one file × files kept (0 = Docker's own,
// which never rotates).
export const logPresets = [
  { size: 0, files: 0, label: "Docker's own (no limit)" },
  { size: 10, files: 3, label: "10 MB × 3 files" },
  { size: 20, files: 5, label: "20 MB × 5 files" },
  { size: 50, files: 5, label: "50 MB × 5 files" },
  { size: 100, files: 10, label: "100 MB × 10 files" },
] as const

export const logKey = (size: number, files: number) => `${size}x${files}`

export const pruneEvery: Choice[] = [
  { value: "24", label: "Once a day" },
  { value: "72", label: "Every 3 days" },
  { value: "168", label: "Once a week" },
  { value: "720", label: "Once a month" },
]

export const pruneImages: {
  value: Settings["prune_images"]
  label: string
  hint: string
}[] = [
  { value: "none", label: "Leave them", hint: "Images are never removed." },
  {
    value: "dangling",
    label: "Untagged only",
    hint: "Only the leftovers of builds and pulls that no tag names any more.",
  },
  {
    value: "all",
    label: "Every unused one",
    hint: "Also tagged images no container uses: they're pulled again when needed.",
  },
]

export const pruneOlder: Choice[] = [
  { value: "0", label: "Any age" },
  { value: "24", label: "Older than a day" },
  { value: "72", label: "Older than 3 days" },
  { value: "168", label: "Older than a week" },
  { value: "720", label: "Older than a month" },
]

export const vulnLevels: {
  value: Settings["notify_vulns"]
  label: string
}[] = [
  { value: "off", label: "Off" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High or critical" },
]

export const backupKeep: Choice[] = [
  { value: "0", label: "All of them" },
  { value: "3", label: "Last 3" },
  { value: "7", label: "Last 7" },
  { value: "14", label: "Last 14" },
  { value: "30", label: "Last 30" },
]

// The choice for a stored number, or the list's own value nearest to it.
export function pick(options: Choice[], n: number) {
  const exact = options.find((o) => Number(o.value) === n)
  if (exact) return exact.value
  return options.reduce((a, b) =>
    Math.abs(Number(b.value) - n) < Math.abs(Number(a.value) - n) ? b : a,
  ).value
}

// --- Checks (the backend's checkDockerSettings, as you type) ----------------

export function dirProblem(v: string) {
  const t = v.trim()
  if (!t.startsWith("/") || t === "/") {
    return "Use a full folder path like /opt/projects."
  }
  if (/\s/.test(t)) return "Leave spaces out of the folder path."
  return undefined
}

export function imageProblem(v: string) {
  const t = v.trim()
  if (!t) return "Name an image, like aquasec/trivy:latest."
  if (/\s/.test(t)) return "An image name has no spaces."
  return undefined
}

export function folderProblem(v: string) {
  const t = v.trim()
  if (t && !t.startsWith("/")) return "Start the folder with /."
  return undefined
}

export function channelProblem(s: Settings) {
  if (
    (s.notify_updates || s.notify_vulns !== "off") &&
    !s.notify_channels.length
  )
    return "Pick a channel for these messages."
  return undefined
}

export const limitProblem = (n: number, max: number) =>
  Number.isNaN(n) || n < 0
    ? "Use 0 or more."
    : n > max
      ? `Use at most ${max}.`
      : undefined

// Every problem in a full set of settings, by key.
export function problemsOf(s: Settings) {
  const out: Partial<Record<SettingKey, string>> = {}
  const add = (k: SettingKey, p: string | undefined) => {
    if (p) out[k] = p
  }
  add("projects_dir", dirProblem(s.projects_dir))
  add("scanner_image", imageProblem(s.scanner_image))
  add("backup_folder", folderProblem(s.backup_folder))
  add("notify_channels", channelProblem(s))
  add("default_memory_mb", limitProblem(s.default_memory_mb, 1048576))
  add("default_cpus", limitProblem(s.default_cpus, 512))
  return out
}

// What's sent: text trimmed, folders without a trailing slash.
export function tidy<T extends Overrides>(s: T): T {
  const out = { ...s }
  if (out.projects_dir !== undefined)
    out.projects_dir = out.projects_dir.trim().replace(/\/+$/, "")
  if (out.scanner_image !== undefined)
    out.scanner_image = out.scanner_image.trim()
  if (out.backup_folder !== undefined)
    out.backup_folder = out.backup_folder.trim().replace(/\/+$/, "")
  return out
}

// --- Export and import -------------------------------------------------------

export const exportKind = "morcheh.docker-settings"

export type SettingsFile = {
  kind: typeof exportKind
  version: 1
  exported_at: string
  workspace: Settings
  environments: {
    server_id: string
    server_name: string
    overrides: Overrides
  }[]
}

export function buildExport(
  workspace: Settings,
  environments: SettingsFile["environments"],
): SettingsFile {
  return {
    kind: exportKind,
    version: 1,
    exported_at: new Date().toISOString(),
    workspace,
    environments: environments.filter((e) => Object.keys(e.overrides).length),
  }
}

// The values a key may hold, for the ones limited to a list.
const allowed: Partial<Record<SettingKey, readonly unknown[]>> = {
  default_restart: restartChoices.map((c) => c.value),
  update_check_hours: [6, 12, 24, 72, 168],
  prune_hours: [24, 72, 168, 720],
  prune_images: ["none", "dangling", "all"],
  prune_older_hours: [0, 24, 72, 168, 720],
  notify_vulns: ["off", "critical", "high"],
}

export type ImportContext = {
  servers: { id: string; name: string }[]
  channels: string[]
  storages: string[]
}

export type ImportPlan = {
  exportedAt?: string
  workspace?: Overrides
  environments: {
    server_id: string
    server_name: string
    from: string
    overrides: Overrides
  }[]
  // Environments in the file with no match here, by name.
  unmatched: string[]
  // What was left out, in plain words.
  dropped: string[]
}

// Reads a settings file: only known keys with the right kind of value are
// taken; channels and storages of another workspace are left out, and
// environments are matched by id, then by name.
export function readImport(
  text: string,
  ctx: ImportContext,
): ImportPlan | { error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { error: "That isn't a JSON file." }
  }
  if (!raw || typeof raw !== "object")
    return { error: "That isn't a settings file." }
  const file = raw as Partial<SettingsFile> & { kind?: unknown }
  if (file.kind !== exportKind)
    return {
      error: "That file wasn't exported from Container settings.",
    }
  if (file.version !== 1)
    return { error: "That file was made by a newer version of Morche." }
  const dropped = new Set<string>()
  const clean = (o: unknown): Overrides => {
    const out: Record<string, unknown> = {}
    if (!o || typeof o !== "object") return out
    for (const [k, v] of Object.entries(o)) {
      if (!(k in defaults)) continue
      const key = k as SettingKey
      const want = defaults[key]
      if (Array.isArray(want)) {
        if (!Array.isArray(v)) continue
        const ids = v.filter((x): x is string => typeof x === "string")
        const kept = ids.filter((x) => ctx.channels.includes(x))
        if (kept.length < ids.length)
          dropped.add("alert channels of another workspace")
        out[key] = kept
        continue
      }
      if (typeof v !== typeof want) continue
      if (allowed[key] && !allowed[key].includes(v)) continue
      if (
        key === "backup_storage_id" &&
        v &&
        !ctx.storages.includes(v as string)
      ) {
        dropped.add("a backup storage of another workspace")
        out[key] = ""
        continue
      }
      out[key] = v
    }
    // Notifications without a channel left can't be saved: turn them off.
    const nc = out.notify_channels as string[] | undefined
    if (nc && nc.length === 0) {
      if (out.notify_updates === true) out.notify_updates = false
      if (out.notify_vulns && out.notify_vulns !== "off")
        out.notify_vulns = "off"
    }
    return out as Overrides
  }
  const plan: ImportPlan = {
    exportedAt:
      typeof file.exported_at === "string" ? file.exported_at : undefined,
    workspace: file.workspace ? clean(file.workspace) : undefined,
    environments: [],
    unmatched: [],
    dropped: [],
  }
  for (const e of Array.isArray(file.environments) ? file.environments : []) {
    if (!e || typeof e !== "object") continue
    const name = typeof e.server_name === "string" ? e.server_name : "?"
    const match =
      ctx.servers.find((s) => s.id === e.server_id) ??
      ctx.servers.find((s) => s.name.toLowerCase() === name.toLowerCase())
    if (!match) {
      plan.unmatched.push(name)
      continue
    }
    if (plan.environments.some((x) => x.server_id === match.id)) continue
    plan.environments.push({
      server_id: match.id,
      server_name: match.name,
      from: name,
      overrides: clean(e.overrides),
    })
  }
  plan.dropped = [...dropped]
  return plan
}
