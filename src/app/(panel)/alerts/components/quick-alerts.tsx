"use client"

import {
  ArrowRight,
  BellRing,
  Cable,
  Check,
  ChevronRight,
  Container,
  Database,
  Globe,
  Mail,
  MonitorCog,
  Plug,
  Plus,
  Server,
  ShieldCheck,
  Signpost,
  TriangleAlert,
  Webhook,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { useMonitors } from "@/app/(panel)/monitoring/api"
import { newMonitorHref } from "@/app/(panel)/monitoring/components/meta"
import { useUptimeCan } from "@/app/(panel)/monitoring/components/permissions"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { useStoredChoice } from "@/hooks/useStoredChoice"
import type { AlertRule } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAlertRules, useChannels } from "../api"
import { useRuleActions } from "./rule-actions"
import {
  containerPresets,
  isDatabaseMetric,
  metricOf,
  type Preset,
  presets,
  pvePresets,
  ruleSentence,
  ruleState,
  tunnelPresets,
} from "./rules-meta"

// "Get alerted": one click starts a ready-made alert rule (or a monitor, for
// websites and the like), grouped by what it watches. Shown on /monitoring
// and in /alerts' empty state. Needs a RuleActionsProvider above it.

type Choice = {
  key: string
  name: string
  icon: typeof Server
  detail: string
  // An alert rule…
  preset?: Preset
  // …or a monitor of this kind.
  kind?: string
}

const groups = [
  "servers",
  "databases",
  "websites",
  "containers",
  "machines",
  "tunnels",
] as const
type Group = (typeof groups)[number]

const groupMeta: Record<Group, { label: string; icon: typeof Server }> = {
  servers: { label: "Servers", icon: Server },
  databases: { label: "Databases", icon: Database },
  websites: { label: "Websites", icon: Globe },
  containers: { label: "Containers", icon: Container },
  machines: { label: "Virtual machines", icon: MonitorCog },
  tunnels: { label: "Tunnels", icon: Cable },
}

const ofPreset = (p: Preset): Choice => ({
  key: p.key,
  name: p.name,
  icon: metricOf(p.metric).icon,
  detail: ruleSentence({
    metric: p.metric,
    op: p.op,
    threshold: p.threshold,
    mount: "",
    for_minutes: p.forMinutes,
  }),
  preset: p,
})

const monitorPicks: Choice[] = [
  {
    key: "m-http",
    name: "Website or API down",
    icon: Globe,
    detail: "Doesn't answer, or answers with an error",
    kind: "http",
  },
  {
    key: "m-tls",
    name: "Certificate running out",
    icon: ShieldCheck,
    detail: "Warns days before an HTTPS certificate expires",
    kind: "tls",
  },
  {
    key: "m-push",
    name: "Scheduled job didn't run",
    icon: Webhook,
    detail: "Your job calls in; silence means trouble",
    kind: "push",
  },
  {
    key: "m-tcp",
    name: "Port stopped answering",
    icon: Plug,
    detail: "Any TCP service: SSH, a queue, a game server…",
    kind: "tcp",
  },
  {
    key: "m-dns",
    name: "DNS record changed",
    icon: Signpost,
    detail: "A domain stops pointing where it should",
    kind: "dns",
  },
  {
    key: "m-smtp",
    name: "Mail server down",
    icon: Mail,
    detail: "Your SMTP server stops taking connections",
    kind: "smtp",
  },
]

const picks: Record<Group, Choice[]> = {
  servers: presets
    .filter((p) => metricOf(p.metric).target === "server")
    .map(ofPreset),
  databases: presets.filter((p) => isDatabaseMetric(p.metric)).map(ofPreset),
  websites: monitorPicks,
  containers: containerPresets.map(ofPreset),
  machines: pvePresets.map(ofPreset),
  tunnels: tunnelPresets.map(ofPreset),
}

type Status = { count: number; firing: number }

function useStatuses() {
  const rules = useAlertRules()
  const monitors = useMonitors()
  const byMetric = new Map<string, AlertRule[]>()
  for (const r of rules.data ?? []) {
    byMetric.set(r.metric, [...(byMetric.get(r.metric) ?? []), r])
  }
  return (p: Choice): Status => {
    if (p.preset) {
      const list = (byMetric.get(p.preset.metric) ?? []).filter(
        (r) => r.enabled,
      )
      return {
        count: list.length,
        firing: list.filter((r) => ruleState(r) === "firing").length,
      }
    }
    const list = (monitors.data ?? []).filter(
      (m) => m.kind === p.kind && !m.paused,
    )
    return {
      count: list.length,
      firing: list.filter((m) => m.status === "down").length,
    }
  }
}

export function QuickAlerts({
  phone,
  className,
}: {
  phone: boolean
  className?: string
}) {
  const a = useRuleActions()
  const monitorCan = useUptimeCan()
  const router = useRouter()
  const channels = useChannels()
  const statusOf = useStatuses()
  const [group, setGroup] = useStoredChoice("morche.quick-alerts", groups)

  const canPick = (p: Choice) => (p.preset ? a.can : monitorCan.edit)
  const start = (p: Choice) => {
    if (p.preset) a.create({ preset: p.preset })
    else router.push(newMonitorHref("/monitoring/new", { kind: p.kind }))
  }
  const onIn = (g: Group) =>
    picks[g].filter((p) => statusOf(p).count > 0).length

  const chips = (
    <Segmented
      label="What to watch"
      items={groups.map((g) => {
        const Icon = groupMeta[g].icon
        const on = onIn(g)
        return {
          value: g,
          label: (
            <span className="flex items-center gap-1.5">
              <Icon className="size-4" aria-hidden />
              {groupMeta[g].label}
              {on > 0 && (
                <span className="text-caption text-ash tabular-nums">
                  {on}/{picks[g].length}
                </span>
              )}
            </span>
          ),
        }
      })}
      value={group}
      onChange={setGroup}
    />
  )

  const noChannels =
    a.can && channels.isSuccess && (channels.data?.length ?? 0) === 0
  const notice = noChannels && (
    <p
      className={cn(
        "flex items-start gap-2 text-caption text-muted-foreground",
        phone && "px-4",
      )}
    >
      <TriangleAlert className="mt-px size-3.5 shrink-0 text-warning" />
      <span>
        No alert channels yet: rules will show up but send nothing.{" "}
        <Link
          href="/alerts/channels/new"
          className="font-medium text-foreground underline underline-offset-2"
        >
          Add a channel
        </Link>
      </span>
    </p>
  )
  const readOnly = !a.can && !monitorCan.edit && (
    <p className={cn("text-caption text-ash", phone && "px-4")}>
      Someone with Engineer access to the workspace can turn these on.
    </p>
  )

  if (phone) {
    return (
      <section className={cn("flex flex-col gap-3", className)}>
        <div className="flex items-end gap-2 px-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-body font-medium">Get alerted</h2>
            <p className="text-caption text-muted-foreground">
              Tap one to start it with sensible limits.
            </p>
          </div>
          <Link
            href="/alerts"
            className="flex h-11 items-center gap-1 text-body-sm font-medium text-brand"
          >
            All rules
          </Link>
        </div>
        <div className="flex [scrollbar-width:none] overflow-x-auto px-4">
          {chips}
        </div>
        {notice}
        {readOnly}
        <ul className="divide-y divide-border border-y border-border bg-card">
          {picks[group].map((p) => (
            <li key={p.key}>
              <PhoneRow
                pick={p}
                status={statusOf(p)}
                disabled={!canPick(p)}
                onClick={() => start(p)}
              />
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-card p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
          <BellRing className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-body font-medium">Get alerted</h2>
          <p className="text-body-sm text-muted-foreground">
            Choice what should wake your team. Each one opens with sensible
            limits you can change before saving.
          </p>
        </div>
        <Link
          href="/alerts"
          className="flex h-9 items-center gap-1 rounded-lg px-2 text-body-sm font-medium text-brand hover:bg-brand-soft"
        >
          All alert rules
          <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {chips}
        {notice}
        {readOnly}
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3">
        {picks[group].map((p) => (
          <li key={p.key} className="min-w-0">
            <Tile
              pick={p}
              status={statusOf(p)}
              disabled={!canPick(p)}
              onClick={() => start(p)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

function tone(s: Status) {
  if (s.firing > 0) return "bg-destructive/10 text-destructive"
  if (s.count > 0) return "bg-brand-soft text-brand-strong"
  return "bg-muted text-muted-foreground"
}

function StatusText({ pick, status }: { pick: Choice; status: Status }) {
  const noun = pick.preset ? "rule" : "monitor"
  let body: ReactNode
  if (status.firing > 0) {
    body = (
      <span className="flex items-center gap-1 font-medium text-destructive">
        <span className="size-1.5 rounded-full bg-destructive" />
        {pick.preset ? "Firing" : "Down"}
        {status.count > 1 && ` · ${status.firing} of ${status.count}`}
      </span>
    )
  } else if (status.count > 0) {
    body = (
      <span className="flex items-center gap-1 text-success">
        <Check className="size-3.5" />
        On · {status.count} {status.count === 1 ? noun : `${noun}s`}
      </span>
    )
  } else {
    body = (
      <span className="flex items-center gap-1 text-ash group-hover:text-brand">
        <Plus className="size-3.5" />
        {pick.preset ? "Add rule" : "Add monitor"}
      </span>
    )
  }
  return <span className="text-caption">{body}</span>
}

function Tile({
  pick,
  status,
  disabled,
  onClick,
}: {
  pick: Choice
  status: Status
  disabled: boolean
  onClick: () => void
}) {
  const Icon = pick.icon
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group flex size-full min-w-0 items-start gap-3 rounded-xl border border-border p-3.5 text-start transition-colors outline-none hover:border-mist hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none"
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          tone(status),
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body-sm font-medium">{pick.name}</span>
        <span className="line-clamp-2 text-caption text-muted-foreground">
          {pick.detail}
        </span>
        <span className="mt-1">
          <StatusText pick={pick} status={status} />
        </span>
      </span>
    </button>
  )
}

function PhoneRow({
  pick,
  status,
  disabled,
  onClick,
}: {
  pick: Choice
  status: Status
  disabled: boolean
  onClick: () => void
}) {
  const Icon = pick.icon
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-start active:bg-muted"
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          tone(status),
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-sm font-medium">{pick.name}</span>
        <span className="truncate text-caption text-muted-foreground">
          {pick.detail}
        </span>
        <StatusText pick={pick} status={status} />
      </span>
      {!disabled && <ChevronRight className="size-4 shrink-0 text-ash" />}
    </button>
  )
}
