"use client"

import { CircleAlert, Ellipsis, TriangleAlert } from "lucide-react"
import { useRef, useState } from "react"

import {
  Facts,
  ItemMenu,
  SheetItems,
} from "@/app/(panel)/servers/[id]/components/parts"
import { BottomSheet } from "@/components/bottom-sheet"
import { useOpen } from "@/hooks/useOpen"
import { formatDuration } from "@/lib/format"
import type { AlertRule, AlertRuleState } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useChannels } from "../api"
import { useRuleMenu } from "./rule-actions"
import {
  formatValue,
  forText,
  metricOf,
  type RuleState,
  repeatText,
  ruleSentence,
  ruleState,
  type Severity,
  scopeText,
  severityMeta,
} from "./rules-meta"

// The rules as a table (desktop) or rows + a sheet (phone). With `serverId`
// the states are that one server's and the scope column is left out.

export function RulesList({
  rules,
  phone,
  serverId,
}: {
  rules: AlertRule[]
  phone: boolean
  serverId?: string
}) {
  return phone ? (
    <Rows rules={rules} serverId={serverId} />
  ) : (
    <Table rules={rules} serverId={serverId} />
  )
}

// "for 12 min", or "just now" in the first minute.
const lasting = (iso?: string | null) => {
  if (!iso) return ""
  const secs = (Date.now() - new Date(iso).getTime()) / 1000
  return secs < 60 ? "just now" : `for ${formatDuration(secs)}`
}

const stateMeta: Record<
  RuleState,
  { label: string; dot: string; text: string }
> = {
  firing: { label: "Firing", dot: "bg-destructive", text: "text-destructive" },
  pending: { label: "Waiting", dot: "bg-warning", text: "text-warning" },
  ok: { label: "Normal", dot: "bg-success", text: "text-muted-foreground" },
  off: { label: "Off", dot: "bg-mist", text: "text-ash" },
}

function names(states: AlertRuleState[], max = 2) {
  const n = states.map((s) => s.server_name)
  return n.length <= max
    ? n.join(", ")
    : `${n.slice(0, max).join(", ")} +${n.length - max}`
}

// "Firing on web-1, db-2" / "Firing · 93% for 12 min" on one server.
function stateLine(r: AlertRule, serverId?: string) {
  const st = ruleState(r)
  const firing = r.states.filter((s) => s.state === "firing")
  const pending = r.states.filter((s) => s.state === "pending")
  const value = (s: AlertRuleState) =>
    r.metric === "offline"
      ? s.detail
      : `${formatValue(r.metric, s.value)}${s.detail ? ` on ${s.detail}` : ""}`
  if (st === "firing") {
    if (serverId)
      return [value(firing[0]), lasting(firing[0].firing_since)]
        .filter(Boolean)
        .join(" · ")
    return `on ${names(firing)}`
  }
  if (st === "pending") {
    if (serverId)
      return [
        value(pending[0]),
        `alerts after ${forText(r.for_minutes).replace("for ", "")}`,
      ]
        .filter(Boolean)
        .join(" · ")
    return `on ${names(pending)}`
  }
  return ""
}

export function RuleStateBadge({
  rule,
  serverId,
  className,
}: {
  rule: AlertRule
  serverId?: string
  className?: string
}) {
  const st = ruleState(rule)
  const m = stateMeta[st]
  const line = stateLine(rule, serverId)
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-body-sm",
        m.text,
        className,
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", m.dot)} />
      <span className={cn("shrink-0", st !== "ok" && "font-medium")}>
        {m.label}
      </span>
      {line && (
        <span className="truncate text-caption text-muted-foreground">
          {line}
        </span>
      )}
    </span>
  )
}

export function SeverityTag({ severity }: { severity: string }) {
  const critical = severity === "critical"
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-label text-caption tracking-label uppercase",
        critical
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground",
      )}
    >
      {severityMeta[severity as Severity]?.label ?? severity}
    </span>
  )
}

function useChannelNames(r: AlertRule) {
  const channels = useChannels()
  const byId = new Map((channels.data ?? []).map((c) => [c.id, c]))
  const list = r.channel_ids.map((id) => byId.get(id)).filter((c) => !!c)
  return {
    text:
      list.length === 0
        ? "No channel"
        : list.length <= 2
          ? list.map((c) => c.name).join(", ")
          : `${list[0].name} +${list.length - 1}`,
    none: list.length === 0,
    off: list.length > 0 && list.every((c) => !c.enabled),
  }
}

function ChannelsText({ r }: { r: AlertRule }) {
  const c = useChannelNames(r)
  if (c.none || c.off)
    return (
      <span className="flex items-center gap-1.5 text-warning">
        <TriangleAlert className="size-4 shrink-0" />
        {c.none ? "No channel" : "Channels off"}
      </span>
    )
  return <span className="truncate text-muted-foreground">{c.text}</span>
}

function RuleIcon({ r }: { r: AlertRule }) {
  const Icon = metricOf(r.metric).icon
  const st = ruleState(r)
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        st === "firing"
          ? "bg-destructive/10 text-destructive"
          : st === "pending"
            ? "bg-warning/10 text-warning"
            : st === "off"
              ? "bg-muted text-ash"
              : "bg-brand-soft text-brand-strong",
      )}
    >
      <Icon className="size-4" />
    </span>
  )
}

// ---- Desktop ----

function Table({ rules, serverId }: { rules: AlertRule[]; serverId?: string }) {
  return (
    <div className="@container overflow-hidden rounded-2xl border border-border">
      <table className="w-full table-fixed text-body-sm">
        <thead className="bg-subtle text-muted-foreground">
          <tr>
            <th scope="col" className="h-10 px-3 text-start font-medium">
              Rule
            </th>
            <th
              scope="col"
              className="h-10 w-[30%] px-3 text-start font-medium"
            >
              Now
            </th>
            {!serverId && (
              <th
                scope="col"
                className="hidden h-10 w-[16%] px-3 text-start font-medium @3xl:table-cell"
              >
                On
              </th>
            )}
            <th
              scope="col"
              className="hidden h-10 w-[18%] px-3 text-start font-medium @2xl:table-cell"
            >
              Tells
            </th>
            <th scope="col" className="w-12">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rules.map((r) => (
            <Row key={r.id} r={r} serverId={serverId} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({ r, serverId }: { r: AlertRule; serverId?: string }) {
  const menu = useRuleMenu(r)
  const edit = menu[0][0]
  return (
    <tr className={cn("group hover:bg-subtle", !r.enabled && "text-ash")}>
      <td className="p-3">
        <button
          type="button"
          disabled={!edit}
          onClick={() => edit?.onSelect()}
          className="flex w-full min-w-0 items-center gap-3 text-start outline-none focus-visible:underline disabled:cursor-default"
        >
          <RuleIcon r={r} />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "truncate font-medium",
                  r.enabled && "text-foreground",
                )}
              >
                {r.name}
              </span>
              <SeverityTag severity={r.severity} />
            </span>
            <span className="block truncate text-caption text-muted-foreground">
              {ruleSentence(r)}
            </span>
          </span>
        </button>
      </td>
      <td className="p-3">
        <RuleStateBadge rule={r} serverId={serverId} />
      </td>
      {!serverId && (
        <td className="hidden truncate p-3 text-muted-foreground @3xl:table-cell">
          {scopeText(r)}
        </td>
      )}
      <td className="hidden p-3 @2xl:table-cell">
        <span className="flex min-w-0">
          <ChannelsText r={r} />
        </span>
      </td>
      <td className="px-2 py-3 text-end">
        {menu.some((g) => g.length > 0) && (
          <ItemMenu groups={menu} label={`${r.name} actions`} />
        )}
      </td>
    </tr>
  )
}

// ---- Phone ----

function Rows({ rules, serverId }: { rules: AlertRule[]; serverId?: string }) {
  const [sheetOpen, setSheetOpen] = useOpen("alert-rule-sheet")
  const [id, setId] = useState<string | null>(null)
  const last = useRef<AlertRule | null>(null)
  const current = rules.find((r) => r.id === id) ?? last.current
  if (current) last.current = current

  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {rules.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => {
                setId(r.id)
                setSheetOpen(true)
              }}
              className="flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3 text-start outline-none active:bg-muted"
            >
              <RuleIcon r={r} />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-body font-medium",
                    !r.enabled && "text-ash",
                  )}
                >
                  {r.name}
                </span>
                <span className="block truncate text-caption text-muted-foreground">
                  {ruleSentence(r)}
                </span>
                <RuleStateBadge
                  rule={r}
                  serverId={serverId}
                  className="mt-0.5"
                />
              </span>
              <Ellipsis className="size-5 shrink-0 text-ash" />
            </button>
          </li>
        ))}
      </ul>
      {current && (
        <RuleSheet
          r={current}
          serverId={serverId}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </>
  )
}

function RuleSheet({
  r,
  serverId,
  open,
  onOpenChange,
}: {
  r: AlertRule
  serverId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const menu = useRuleMenu(r)
  const channels = useChannelNames(r)
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={r.name}>
      <Facts
        items={[
          { label: "When", value: ruleSentence(r), wide: true },
          {
            label: "Now",
            value: <RuleStateBadge rule={r} serverId={serverId} />,
            wide: true,
          },
          ...(serverId ? [] : [{ label: "On", value: scopeText(r) }]),
          {
            label: "Severity",
            value: severityMeta[r.severity as Severity]?.label ?? r.severity,
          },
          { label: "Tells", value: channels.text },
          { label: "Remind", value: repeatText(r.repeat_minutes) },
        ]}
      />
      <SheetItems groups={menu} onOpenChange={onOpenChange} />
    </BottomSheet>
  )
}

// ---- Firing now, above a list ----

// One line per server a rule is firing on, worst first.
export function FiringNotice({
  rules,
  serverId,
}: {
  rules: AlertRule[]
  serverId?: string
}) {
  const firing = rules
    .filter((r) => r.enabled)
    .flatMap((r) =>
      r.states.filter((s) => s.state === "firing").map((s) => ({ r, s })),
    )
    .sort(
      (a, b) =>
        Number(b.r.severity === "critical") -
          Number(a.r.severity === "critical") ||
        (a.s.firing_since ?? "").localeCompare(b.s.firing_since ?? ""),
    )
  if (firing.length === 0) return null
  const critical = firing.some(({ r }) => r.severity === "critical")
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-1.5 rounded-2xl border p-4",
        critical
          ? "border-destructive/30 bg-destructive/5"
          : "border-warning/30 bg-warning/5",
      )}
    >
      {firing.slice(0, 5).map(({ r, s }) => (
        <p
          key={`${r.id}-${s.server_id}`}
          className="flex items-start gap-2 text-body-sm"
        >
          <CircleAlert
            className={cn(
              "mt-0.5 size-4 shrink-0",
              r.severity === "critical" ? "text-destructive" : "text-warning",
            )}
          />
          <span className="min-w-0">
            <span className="font-medium">{r.name}</span>
            {!serverId && ` on ${s.server_name}`}
            <span className="text-muted-foreground">
              {" "}
              ·{" "}
              {r.metric === "offline"
                ? s.detail || "unreachable"
                : `${formatValue(r.metric, s.value)}${s.detail ? ` on ${s.detail}` : ""}`}{" "}
              · {lasting(s.firing_since ?? s.updated_at)}
            </span>
          </span>
        </p>
      ))}
      {firing.length > 5 && (
        <p className="ps-6 text-caption text-muted-foreground">
          And {firing.length - 5} more.
        </p>
      )}
    </div>
  )
}
