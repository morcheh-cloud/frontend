import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Box,
  Cog,
  Container,
  Cpu,
  DatabaseZap,
  Gauge,
  HardDrive,
  HardDriveDownload,
  HeartCrack,
  Hourglass,
  type LucideIcon,
  MemoryStick,
  MonitorStop,
  Repeat,
  RotateCcw,
  ServerOff,
  ShieldAlert,
  Unplug,
} from "lucide-react"
import {
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs"

import { vmsHref } from "@/app/(panel)/vms/components/meta"
import type { AlertRule, AlertRuleBody, AlertRuleState } from "@/lib/services"

// Alert rules on server metrics, services and databases: what each metric
// means, its unit, and the sensible starting values the editor and the
// presets use.

export type Metric = AlertRuleBody["metric"]
export type Op = "above" | "below"
export type Severity = "warning" | "critical"
export type Scope = "all" | "servers" | "tags" | "databases" | "clusters"
export type Target = "server" | "database" | "cluster"

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
  // What it watches; database metrics cover databases, not servers.
  target: Target
  // Up or down, no number to compare (the backend keeps threshold 0).
  state?: boolean
  // Watches Docker/Podman containers on the covered servers (project and
  // container filters apply, except to docker_engine).
  docker?: boolean
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
    target: "server",
  },
  load: {
    label: "Load per core",
    icon: Gauge,
    unit: "per core",
    hint: "1-minute load divided by the cores; above 1 means work is waiting.",
    threshold: 2,
    forMinutes: 10,
    step: 0.1,
    target: "server",
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
    target: "server",
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
    target: "server",
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
    target: "server",
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
    target: "server",
  },
  net_rx: {
    label: "Download",
    icon: ArrowDownToLine,
    unit: "Mbit/s",
    hint: "Traffic coming in, over every network interface.",
    threshold: 500,
    forMinutes: 5,
    step: 1,
    target: "server",
  },
  net_tx: {
    label: "Upload",
    icon: ArrowUpFromLine,
    unit: "Mbit/s",
    hint: "Traffic going out, over every network interface.",
    threshold: 500,
    forMinutes: 5,
    step: 1,
    target: "server",
  },
  offline: {
    label: "Unreachable",
    icon: Unplug,
    unit: "",
    hint: "Morche can't connect or log in over SSH.",
    threshold: 0,
    forMinutes: 2,
    step: 1,
    target: "server",
    state: true,
  },
  service: {
    label: "Service",
    icon: Cog,
    unit: "",
    hint: "A systemd service that failed, or one you name that stopped.",
    threshold: 0,
    forMinutes: 2,
    step: 1,
    target: "server",
    state: true,
  },
  pve_node_down: {
    label: "Node down",
    icon: ServerOff,
    unit: "",
    hint: "A node of the Proxmox cluster is offline, or the cluster can't be reached at all.",
    threshold: 0,
    forMinutes: 2,
    step: 1,
    target: "cluster",
    state: true,
  },
  pve_vm_stopped: {
    label: "Machine stopped",
    icon: MonitorStop,
    unit: "",
    hint: "A VM or container that was running stopped without anyone stopping it from Morche or Proxmox (a crash, an out-of-memory kill, a guest that shut itself down).",
    threshold: 0,
    forMinutes: 0,
    step: 1,
    target: "cluster",
    state: true,
  },
  pve_storage_full: {
    label: "Storage used",
    icon: HardDriveDownload,
    unit: "%",
    hint: "The fullest storage of the cluster (disks, backups, ISOs). A full storage stops VMs that write to it.",
    threshold: 85,
    forMinutes: 10,
    max: 100,
    step: 1,
    target: "cluster",
  },
  db_down: {
    label: "Unreachable",
    icon: DatabaseZap,
    unit: "",
    hint: "Morche can't connect to the database.",
    threshold: 0,
    forMinutes: 2,
    step: 1,
    target: "database",
    state: true,
  },
  db_health: {
    label: "Health",
    icon: ShieldAlert,
    unit: "",
    hint: "One of its health checks turned critical (connections, replication lag, disk…).",
    threshold: 0,
    forMinutes: 5,
    step: 1,
    target: "database",
    state: true,
  },
  container_down: {
    label: "Container down",
    icon: Box,
    unit: "",
    hint: "With a project or container named: any of them not running. Without: only crashes (an error exit) and restart loops, so containers stopped on purpose stay quiet.",
    threshold: 0,
    forMinutes: 2,
    step: 1,
    target: "server",
    state: true,
    docker: true,
  },
  container_unhealthy: {
    label: "Container unhealthy",
    icon: HeartCrack,
    unit: "",
    hint: "Its healthcheck fails. Containers without a healthcheck never count.",
    threshold: 0,
    forMinutes: 2,
    step: 1,
    target: "server",
    state: true,
    docker: true,
  },
  container_restarts: {
    label: "Container restarts",
    icon: RotateCcw,
    unit: "stops in 10 min",
    hint: "How often a container stopped or crashed in the last 10 minutes: a restart loop.",
    threshold: 3,
    forMinutes: 0,
    step: 1,
    target: "server",
    docker: true,
  },
  container_cpu: {
    label: "Container CPU",
    icon: Cpu,
    unit: "% of a core",
    hint: "Docker counts 100% per core: 200% = two cores fully busy.",
    threshold: 90,
    forMinutes: 10,
    step: 5,
    target: "server",
    docker: true,
  },
  container_memory: {
    label: "Container memory",
    icon: MemoryStick,
    unit: "% of its limit",
    hint: "Only containers with a memory limit: near it, the kernel kills the container (out of memory).",
    threshold: 90,
    forMinutes: 5,
    max: 100,
    step: 1,
    target: "server",
    docker: true,
  },
  container_vulns_critical: {
    label: "Critical vulnerabilities",
    icon: ShieldAlert,
    unit: "critical",
    hint: "Known critical vulnerabilities in the image of a running container, from its last security scan. Images never scanned don't count: scan them on the Security page.",
    threshold: 0,
    forMinutes: 0,
    step: 1,
    target: "server",
    docker: true,
  },
  container_vulns_high: {
    label: "High vulnerabilities",
    icon: ShieldAlert,
    unit: "high or critical",
    hint: "Known high or critical vulnerabilities in the image of a running container, from its last security scan.",
    threshold: 5,
    forMinutes: 0,
    step: 1,
    target: "server",
    docker: true,
  },
  docker_engine: {
    label: "Docker engine",
    icon: Container,
    unit: "",
    hint: "The Docker or Podman engine of a server doesn't answer (stopped, crashed, socket gone). Servers without one are skipped.",
    threshold: 0,
    forMinutes: 2,
    step: 1,
    target: "server",
    state: true,
    docker: true,
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
  "service",
]

// Proxmox metrics, listed apart in the editor.
export const pveMetricOrder: Metric[] = [
  "pve_node_down",
  "pve_vm_stopped",
  "pve_storage_full",
]

// Database metrics, listed apart in the editor.
export const databaseMetricOrder: Metric[] = ["db_down", "db_health"]

// Container metrics, listed apart too.
export const containerMetricOrder: Metric[] = [
  "container_down",
  "container_unhealthy",
  "container_restarts",
  "container_cpu",
  "container_memory",
  "container_vulns_critical",
  "container_vulns_high",
  "docker_engine",
]

export const isMetric = (m: string): m is Metric => m in metrics
export const metricOf = (m: string) => metrics[isMetric(m) ? m : "cpu"]
export const isPercent = (m: string) => metricOf(m).unit === "%"
export const isContainerMetric = (m: string) => !!metricOf(m).docker
// Metrics that take the project / container filters.
export const takesContainerFilter = (m: string) =>
  isContainerMetric(m) && m !== "docker_engine"
export const isNet = (m: string) => m === "net_rx" || m === "net_tx"
export const isStateMetric = (m: string) => !!metricOf(m).state
export const targetOf = (m: string): Target => metricOf(m).target
export const isDatabaseMetric = (m: string) => targetOf(m) === "database"
export const isPveMetric = (m: string) => targetOf(m) === "cluster"

// The rule's threshold in the editor's unit, and back.
export const toFieldValue = (m: string, v: number) =>
  isNet(m) ? Math.round(((v * 8) / 1e6) * 10) / 10 : v
export const fromFieldValue = (m: string, v: number) =>
  isNet(m) ? (v * 1e6) / 8 : v

// A metric value written the way people read it (net values in bytes/s).
export function formatValue(m: string, v: number) {
  if (isPercent(m)) return `${v.toFixed(v < 10 ? 1 : 0)}%`
  if (m === "load") return `${v.toFixed(2)} per core`
  if (m === "container_cpu") return `${v.toFixed(v < 10 ? 1 : 0)}% of a core`
  if (m === "container_memory")
    return `${v.toFixed(v < 10 ? 1 : 0)}% of its limit`
  if (m === "container_restarts")
    return `${v} ${v === 1 ? "stop" : "stops"} in 10 min`
  if (m === "container_vulns_critical") return `${v} critical`
  if (m === "container_vulns_high") return `${v} high or critical`
  if (isNet(m)) {
    const mbit = (v * 8) / 1e6
    return `${mbit.toFixed(mbit < 10 ? 1 : 0)} Mbit/s`
  }
  return String(v)
}

export function conditionText(
  r: Pick<AlertRule, "metric" | "op" | "threshold"> & { unit?: string },
) {
  if (r.metric === "offline" || r.metric === "db_down") return "unreachable"
  if (r.metric === "db_health") return "critical"
  if (r.metric === "pve_node_down") return "has a node offline"
  if (r.metric === "pve_vm_stopped") return "stopped on its own"
  if (r.metric === "service") return r.unit ? "stopped or failed" : "failed"
  if (r.metric === "container_down") return "down"
  if (r.metric === "container_unhealthy") return "unhealthy"
  if (r.metric === "docker_engine") return "not answering"
  if (r.metric === "container_vulns_critical")
    return r.threshold > 0
      ? `has more than ${r.threshold} critical vulnerabilities`
      : "has a critical vulnerability"
  if (r.metric === "container_vulns_high")
    return `has more than ${r.threshold} high or critical vulnerabilities`
  if (r.metric === "container_restarts")
    return `stopped more than ${r.threshold} ${r.threshold === 1 ? "time" : "times"} in 10 min`
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

// "CPU above 90% for 10 min", "Disk / above 85%", "Service nginx stopped or
// failed", "Database unreachable for 2 min".
export function ruleSentence(
  r: Pick<
    AlertRule,
    "metric" | "op" | "threshold" | "mount" | "for_minutes"
  > & {
    unit?: string
    project?: string
    container?: string
  },
) {
  const label = takesContainerFilter(r.metric)
    ? containerWhich(r)
    : r.metric === "disk" && r.mount
      ? `Disk ${r.mount}`
      : r.metric === "offline"
        ? "Server"
        : r.metric === "service"
          ? r.unit
            ? `Service ${r.unit}`
            : "A service"
          : isDatabaseMetric(r.metric)
            ? "Database"
            : r.metric === "pve_node_down"
              ? "Cluster"
              : r.metric === "pve_vm_stopped"
                ? "A machine"
                : r.metric === "pve_storage_full"
                  ? "Cluster storage"
                  : metricOf(r.metric).label
  const minutes = r.for_minutes
  return `${label} ${conditionText(r)}${minutes > 0 ? ` ${forText(minutes)}` : ""}`
}

// What a container rule watches, like the backend's messages: "web in
// shop", "a container of shop", "web", "a container".
export function containerWhich(r: { project?: string; container?: string }) {
  const p = r.project?.trim()
  const c = r.container?.trim()
  const which =
    p && c ? `${c} in ${p}` : p ? `a container of ${p}` : c || "a container"
  return which.charAt(0).toUpperCase() + which.slice(1)
}

// A glob like the backend's (case-insensitive, * and ?); empty = any.
export function globMatch(pattern: string, name: string) {
  const p = pattern.trim()
  if (!p) return true
  const re = p
    .split("")
    .map((ch) =>
      ch === "*"
        ? ".*"
        : ch === "?"
          ? "."
          : ch.replace(/[.\\^$+()|{}[\]-]/g, "\\$&"),
    )
    .join("")
  return new RegExp(`^${re}$`, "i").test(name)
}

// Does a container rule watch (some of) this compose project? Engine rules
// watch every project on the server.
export function ruleCoversProject(
  r: Pick<AlertRule, "metric"> & { project?: string },
  project: string,
) {
  if (!isContainerMetric(r.metric)) return false
  if (r.metric === "docker_engine") return true
  return globMatch(r.project ?? "", project)
}

export function scopeText(
  r: Pick<AlertRule, "scope" | "server_ids" | "tags" | "metric"> & {
    database_ids?: string[]
    cluster_ids?: string[]
  },
) {
  if (r.scope === "clusters") {
    const n = r.cluster_ids?.length ?? 0
    return `${n} Proxmox ${n === 1 ? "cluster" : "clusters"}`
  }
  if (isPveMetric(r.metric)) return "Every Proxmox cluster"
  if (r.scope === "databases") {
    const n = r.database_ids?.length ?? 0
    return `${n} ${n === 1 ? "database" : "databases"}`
  }
  if (isDatabaseMetric(r.metric)) return "Every database"
  if (r.scope === "servers") {
    const n = r.server_ids.length
    return `${n} ${n === 1 ? "server" : "servers"}`
  }
  if (r.scope === "tags") return `Tagged ${r.tags.join(", ")}`
  return "Every server"
}

// What a pending/firing state reads: "93% on /var", "nginx.service, cron",
// "connection refused".
export function stateValue(
  r: Pick<AlertRule, "metric" | "op" | "threshold"> & { unit?: string },
  s: Pick<AlertRuleState, "value" | "detail">,
) {
  if (isStateMetric(r.metric)) return s.detail || conditionText(r)
  return `${formatValue(r.metric, s.value)}${s.detail ? ` on ${s.detail}` : ""}`
}

// Where a state's server or database lives in the panel.
export function targetHref(
  s: Pick<AlertRuleState, "target_id" | "target_kind">,
  metric: string,
  project?: string,
) {
  if (s.target_kind === "database") return `/databases/${s.target_id}`
  if (s.target_kind === "pve") {
    const tab =
      metric === "pve_node_down"
        ? "nodes"
        : metric === "pve_storage_full"
          ? "storage"
          : undefined
    return vmsHref("/vms", { tab, cluster: s.target_id })
  }
  if (metric === "service") return `/servers/${s.target_id}/services`
  if (isContainerMetric(metric)) {
    const env = `?env=${encodeURIComponent(s.target_id)}`
    const p = project?.trim()
    return p && !/[*?]/.test(p) && metric !== "docker_engine"
      ? `/containers/projects/${encodeURIComponent(p)}${env}`
      : metric === "docker_engine"
        ? `/containers${env}`
        : `/containers/list${env}`
  }
  return `/servers/${s.target_id}/metrics`
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
  {
    key: "service",
    name: "A service failed",
    metric: "service",
    op: "above",
    threshold: 0,
    forMinutes: 2,
    severity: "warning",
  },
  {
    key: "db-down",
    name: "Database unreachable",
    metric: "db_down",
    op: "above",
    threshold: 0,
    forMinutes: 2,
    severity: "critical",
  },
  {
    key: "db-health",
    name: "Database critical",
    metric: "db_health",
    op: "above",
    threshold: 0,
    forMinutes: 5,
    severity: "warning",
  },
]

// Ready-made container rules: the project page and the containers sidebar's
// Alerts page start from these.
export const containerPresets: Preset[] = [
  {
    key: "container-down",
    name: "Container crashed",
    metric: "container_down",
    op: "above",
    threshold: 0,
    forMinutes: 2,
    severity: "critical",
  },
  {
    key: "container-unhealthy",
    name: "Container unhealthy",
    metric: "container_unhealthy",
    op: "above",
    threshold: 0,
    forMinutes: 2,
    severity: "warning",
  },
  {
    key: "container-restarts",
    name: "Restart loop",
    metric: "container_restarts",
    op: "above",
    threshold: 3,
    forMinutes: 0,
    severity: "critical",
  },
  {
    key: "container-memory",
    name: "Near its memory limit",
    metric: "container_memory",
    op: "above",
    threshold: 90,
    forMinutes: 5,
    severity: "warning",
  },
  {
    key: "container-cpu",
    name: "Container CPU busy",
    metric: "container_cpu",
    op: "above",
    threshold: 90,
    forMinutes: 10,
    severity: "warning",
  },
  {
    key: "container-vulns",
    name: "Critical vulnerability",
    metric: "container_vulns_critical",
    op: "above",
    threshold: 0,
    forMinutes: 0,
    severity: "warning",
  },
  {
    key: "docker-engine",
    name: "Docker engine down",
    metric: "docker_engine",
    op: "above",
    threshold: 0,
    forMinutes: 2,
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

// Ready-made Proxmox rules: the Virtual machines pages start from these.
export const pvePresets: Preset[] = [
  {
    key: "pve-node-down",
    name: "Proxmox node down",
    metric: "pve_node_down",
    op: "above",
    threshold: 0,
    forMinutes: 2,
    severity: "critical",
  },
  {
    key: "pve-vm-stopped",
    name: "Machine stopped on its own",
    metric: "pve_vm_stopped",
    op: "above",
    threshold: 0,
    forMinutes: 0,
    severity: "warning",
  },
  {
    key: "pve-storage-full",
    name: "Proxmox storage filling up",
    metric: "pve_storage_full",
    op: "above",
    threshold: 85,
    forMinutes: 10,
    severity: "warning",
  },
]
