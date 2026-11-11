import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Cpu,
  Gauge,
  HardDrive,
  Hourglass,
  type LucideIcon,
  MemoryStick,
  Repeat,
  Unplug,
} from "lucide-react"
import {
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import type { AlertRule, AlertRuleBody } from "@/lib/services"

// Alert rules on server metrics: what each metric means, its unit, and the
// sensible starting values the editor and the presets use.

export type Metric = AlertRuleBody["metric"]
export type Op = "above" | "below"
export type Severity = "warning" | "critical"
export type Scope = "all" | "servers" | "tags"

type MetricMeta = {
  label: string
  icon: LucideIcon
  // What the threshold field is in (net: Mbit/s, sent as bytes/s).
  unit: string
  hint: string
  threshold: number
  forMinutes: number
  max?: number
  step: number
}

export const metrics: Record<Metric, MetricMeta> = {
  cpu: {
    label: "CPU",
    icon: Cpu,
    unit: "%",
    hint: "Average use of every core.",
    threshold: 90,
    forMinutes: 10,
    max: 100,
    step: 1,
  },
  load: {
    label: "Load per core",
    icon: Gauge,
    unit: "per core",
    hint: "1-minute load divided by the cores; above 1 means work is waiting.",
    threshold: 2,
    forMinutes: 10,
    step: 0.1,
  },
  iowait: {
    label: "I/O wait",
    icon: Hourglass,
    unit: "%",
    hint: "CPU time spent waiting for the disks: slow or overloaded storage.",
    threshold: 30,
    forMinutes: 10,
    max: 100,
    step: 1,
  },
  memory: {
    label: "Memory",
    icon: MemoryStick,
    unit: "%",
    hint: "Used memory, without caches the system can give back.",
    threshold: 90,
    forMinutes: 10,
    max: 100,
    step: 1,
  },
  swap: {
    label: "Swap",
    icon: Repeat,
    unit: "%",
    hint: "Servers without swap are skipped.",
    threshold: 50,
    forMinutes: 15,
    max: 100,
    step: 1,
  },
  disk: {
    label: "Disk",
    icon: HardDrive,
    unit: "%",
    hint: "The fullest filesystem, or the one you name.",
    threshold: 85,
    forMinutes: 0,
    max: 100,
    step: 1,
  },
  net_rx: {
    label: "Download",
    icon: ArrowDownToLine,
    unit: "Mbit/s",
    hint: "Traffic coming in, over every network interface.",
    threshold: 500,
    forMinutes: 5,
    step: 1,
  },
  net_tx: {
    label: "Upload",
    icon: ArrowUpFromLine,
    unit: "Mbit/s",
    hint: "Traffic going out, over every network interface.",
    threshold: 500,
    forMinutes: 5,
    step: 1,
  },
  offline: {
    label: "Unreachable",
    icon: Unplug,
    unit: "",
    hint: "Morcheh can't connect or log in over SSH.",
    threshold: 0,
    forMinutes: 2,
    step: 1,
  },
}

export const metricOrder: Metric[] = [
  "cpu",
  "memory",
  "disk",
  "offline",
  "load",
  "iowait",
  "swap",
  "net_rx",
  "net_tx",
]

export const isMetric = (m: string): m is Metric => m in metrics
export const metricOf = (m: string) => metrics[isMetric(m) ? m : "cpu"]
export const isPercent = (m: string) => metricOf(m).unit === "%"
export const isNet = (m: string) => m === "net_rx" || m === "net_tx"

// The rule's threshold in the editor's unit, and back.
export const toFieldValue = (m: string, v: number) =>
  isNet(m) ? Math.round(((v * 8) / 1e6) * 10) / 10 : v
export const fromFieldValue = (m: string, v: number) =>
  isNet(m) ? (v * 1e6) / 8 : v

// A metric value written the way people read it (net values in bytes/s).
export function formatValue(m: string, v: number) {
  if (isPercent(m)) return `${v.toFixed(v < 10 ? 1 : 0)}%`
  if (m === "load") return `${v.toFixed(2)} per core`
  if (isNet(m)) {
    const mbit = (v * 8) / 1e6
    return `${mbit.toFixed(mbit < 10 ? 1 : 0)} Mbit/s`
  }
  return String(v)
}

export function conditionText(
  r: Pick<AlertRule, "metric" | "op" | "threshold">,
) {
  if (r.metric === "offline") return "unreachable"
  return `${r.op} ${formatValue(r.metric, r.threshold)}`
}

export function forText(minutes: number) {
  if (minutes <= 0) return "at once"
  if (minutes % 60 === 0) {
    const h = minutes / 60
    return `for ${h} ${h === 1 ? "hour" : "hours"}`
  }
  return `for ${minutes} min`
}

export function repeatText(minutes: number) {
  if (minutes <= 0) return "Once"
  if (minutes % 1440 === 0) {
    const d = minutes / 1440
    return d === 1 ? "Every day" : `Every ${d} days`
  }
  if (minutes % 60 === 0) {
    const h = minutes / 60
    return h === 1 ? "Every hour" : `Every ${h} hours`
  }
  return `Every ${minutes} min`
}

// "CPU above 90% for 10 min", "Disk / above 85%".
export function ruleSentence(
  r: Pick<AlertRule, "metric" | "op" | "threshold" | "mount" | "for_minutes">,
) {
  const label =
    r.metric === "disk" && r.mount
      ? `Disk ${r.mount}`
      : r.metric === "offline"
        ? "Server"
        : metricOf(r.metric).label
  const minutes = r.for_minutes
  return `${label} ${conditionText(r)}${minutes > 0 ? ` ${forText(minutes)}` : ""}`
}

export function scopeText(r: Pick<AlertRule, "scope" | "server_ids" | "tags">) {
  if (r.scope === "servers") {
    const n = r.server_ids.length
    return `${n} ${n === 1 ? "server" : "servers"}`
  }
  if (r.scope === "tags") return `Tagged ${r.tags.join(", ")}`
  return "Every server"
}

export const severityMeta: Record<Severity, { label: string; hint: string }> = {
  warning: { label: "Warning", hint: "Worth a look soon." },
  critical: { label: "Critical", hint: "Someone should act now." },
}

export const repeatChoices = [0, 60, 240, 1440] as const
export const forChoices = [0, 2, 5, 10, 15, 30, 60] as const

// Ready-made rules for an empty list and the editor's "Start from".
export type Preset = {
  key: string
  name: string
  metric: Metric
  op: Op
  threshold: number
  forMinutes: number
  severity: Severity
}

export const presets: Preset[] = [
  {
    key: "down",
    name: "Server unreachable",
    metric: "offline",
    op: "above",
    threshold: 0,
    forMinutes: 2,
    severity: "critical",
  },
  {
    key: "disk",
    name: "Disk almost full",
    metric: "disk",
    op: "above",
    threshold: 85,
    forMinutes: 0,
    severity: "warning",
  },
  {
    key: "cpu",
    name: "CPU busy",
    metric: "cpu",
    op: "above",
    threshold: 90,
    forMinutes: 10,
    severity: "warning",
  },
  {
    key: "memory",
    name: "Memory running out",
    metric: "memory",
    op: "above",
    threshold: 90,
    forMinutes: 10,
    severity: "critical",
  },
]

// The state of a rule as a whole: firing on some server beats pending.
export function ruleState(r: AlertRule) {
  if (!r.enabled) return "off" as const
  if (r.states.some((s) => s.state === "firing")) return "firing" as const
  if (r.states.some((s) => s.state === "pending")) return "pending" as const
  return "ok" as const
}

export type RuleState = ReturnType<typeof ruleState>

const stateRank: Record<RuleState, number> = {
  firing: 0,
  pending: 1,
  ok: 2,
  off: 3,
}

export const byRuleState = (a: AlertRule, b: AlertRule) =>
  stateRank[ruleState(a)] - stateRank[ruleState(b)] ||
  a.name.localeCompare(b.name)

export const alertTabs = ["rules", "channels", "activity"] as const
export type AlertTab = (typeof alertTabs)[number]

const filters = {
  tab: parseAsStringLiteral(alertTabs).withDefault("rules"),
  q: parseAsString.withDefault(""),
  // Activity of one rule only.
  rule: parseAsString.withDefault(""),
}

export function useAlertsFilters() {
  return useQueryStates(filters, { history: "replace" })
}

export const alertsHref = createSerializer(filters)
