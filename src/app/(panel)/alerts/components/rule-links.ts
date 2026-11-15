import {
  containerPresets,
  isMetric,
  type Metric,
  type Preset,
  presets,
  pvePresets,
} from "./rules-meta"

// Where a new rule starts: a preset, a server (the Metrics tab), a mount, a
// service, a container, a database or a Proxmox cluster (their pages).
export type RuleStart = {
  preset?: Preset
  metric?: Metric
  // In the backend's unit (bytes/s for the network), like a saved rule.
  threshold?: number
  mount?: string
  unit?: string
  project?: string
  container?: string
  server?: { id: string; name: string }
  database?: string
  cluster?: string
}

export const allPresets = [...presets, ...containerPresets, ...pvePresets]

const textKeys = [
  "mount",
  "unit",
  "project",
  "container",
  "database",
  "cluster",
] as const

// /alerts/rules/new with where it starts in the query.
export function newRuleHref(s?: RuleStart) {
  const q = new URLSearchParams()
  if (s?.preset) q.set("preset", s.preset.key)
  if (s?.metric) q.set("metric", s.metric)
  if (s?.threshold !== undefined) q.set("threshold", String(s.threshold))
  for (const k of textKeys) {
    const v = s?.[k]
    if (v) q.set(k, v)
  }
  if (s?.server) {
    q.set("server", s.server.id)
    q.set("serverName", s.server.name)
  }
  const text = q.toString()
  return text ? `/alerts/rules/new?${text}` : "/alerts/rules/new"
}

export const editRuleHref = (id: string) => `/alerts/rules/${id}/edit`

// The query of /alerts/rules/new back into a start; undefined = a blank rule.
export function ruleStartOf(q: URLSearchParams): RuleStart | undefined {
  const s: RuleStart = {}
  const preset = allPresets.find((p) => p.key === q.get("preset"))
  if (preset) s.preset = preset
  const metric = q.get("metric")
  if (metric && isMetric(metric)) s.metric = metric
  const threshold = Number(q.get("threshold") ?? "")
  if (q.get("threshold") && Number.isFinite(threshold)) s.threshold = threshold
  for (const k of textKeys) {
    const v = q.get(k)
    if (v) s[k] = v
  }
  const server = q.get("server")
  if (server) s.server = { id: server, name: q.get("serverName") ?? "" }
  return Object.keys(s).length > 0 ? s : undefined
}
