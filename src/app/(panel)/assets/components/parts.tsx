"use client"

import { CircleAlert, Users } from "lucide-react"
import type { ReactNode } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Asset } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useAssetPeople } from "../api"
import {
  criticalities,
  dueDates,
  type IssueKey,
  inDays,
  initials,
  issueMeta,
  issuesOf,
} from "./meta"

// A plain select over a list of options ("" = none).
export function Choose({
  id,
  value,
  onChange,
  options,
  placeholder = "Not set",
  className,
  allowNone = true,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string; hint?: string }[]
  placeholder?: string
  className?: string
  allowNone?: boolean
}) {
  const items = [
    ...(allowNone ? [{ value: "", label: placeholder }] : []),
    ...options.map((o) => ({ value: o.value, label: o.label })),
  ]
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => onChange((v as string | null) ?? "")}
    >
      <SelectTrigger id={id} className={cn("w-full", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-80">
        {allowNone && (
          <SelectItem value="">
            <span className="text-muted-foreground">{placeholder}</span>
          </SelectItem>
        )}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="truncate">{o.label}</span>
            {o.hint && (
              <span className="ms-auto ps-4 text-caption text-ash">
                {o.hint}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// A person, or (with groups) a person or a group: "u:<id>" / "g:<id>".
export function PersonPicker({
  id,
  value,
  onChange,
  groups = false,
  placeholder = "Nobody",
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  groups?: boolean
  placeholder?: string
}) {
  const people = useAssetPeople()
  const users = (people.data?.users ?? []).filter(
    (u) => u.status === "active" || `u:${u.id}` === value,
  )
  const gs = groups ? (people.data?.groups ?? []) : []
  const items = [
    { value: "", label: placeholder },
    ...users.map((u) => ({ value: `u:${u.id}`, label: u.name })),
    ...gs.map((g) => ({ value: `g:${g.id}`, label: `${g.name} (group)` })),
  ]
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => onChange((v as string | null) ?? "")}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-80">
        <SelectItem value="">
          <span className="text-muted-foreground">{placeholder}</span>
        </SelectItem>
        {users.map((u) => (
          <SelectItem key={u.id} value={`u:${u.id}`}>
            <Avatar name={u.name} className="size-5 text-[9px]" />
            <span className="truncate">{u.name}</span>
            <span className="ms-auto ps-4 text-caption text-ash">
              {u.status === "blocked" ? "Blocked" : u.username}
            </span>
          </SelectItem>
        ))}
        {gs.length > 0 && <SelectSeparator />}
        {gs.map((g) => (
          <SelectItem key={g.id} value={`g:${g.id}`}>
            <Users className="size-4 text-ash" />
            <span className="truncate">{g.name}</span>
            <span className="ms-auto ps-4 text-caption text-ash">
              {g.members} {g.members === 1 ? "member" : "members"}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function Avatar({
  name,
  group,
  className,
}: {
  name: string
  group?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-medium text-brand-strong",
        className,
      )}
    >
      {group ? <Users className="size-[55%]" /> : initials(name) || "?"}
    </span>
  )
}

// Who answers for an asset: avatar + name, or a quiet "No owner".
export function OwnerChip({
  asset,
  compact,
}: {
  asset: Asset
  compact?: boolean
}) {
  const o = asset.owner
  if (o.from === "none")
    return (
      <span className="inline-flex items-center gap-1.5 text-caption text-warning">
        <CircleAlert className="size-3.5" />
        No owner
      </span>
    )
  const name = o.user_name || o.group_name || "Someone"
  return (
    <span
      className="inline-flex min-w-0 items-center gap-2"
      title={
        o.from === "rule" ? `From the owner rule “${o.rule_name}”` : undefined
      }
    >
      <Avatar
        name={name}
        group={!o.user_name}
        className={compact ? "size-5 text-[9px]" : undefined}
      />
      <span className="truncate text-body-sm">
        {name}
        {o.user_name && o.group_name && (
          <span className="text-muted-foreground"> · {o.group_name}</span>
        )}
      </span>
      {o.user_status === "blocked" && (
        <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 text-[11px] text-destructive">
          Left
        </span>
      )}
      {o.from === "rule" && !compact && (
        <span className="shrink-0 text-caption text-ash">by rule</span>
      )}
    </span>
  )
}

// Four pips: how critical it is (1 = all four lit).
export function CriticalityPips({ value }: { value: number }) {
  if (!value) return null
  const lit = 5 - value
  const c = criticalities.find((x) => x.value === value)
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={c?.label}
      role="img"
      aria-label={c?.label}
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 w-1 rounded-full",
            i < lit
              ? value === 1
                ? "bg-destructive"
                : value === 2
                  ? "bg-warning"
                  : "bg-brand"
              : "bg-mist",
          )}
        />
      ))}
    </span>
  )
}

export function Pill({
  children,
  tone,
  className,
}: {
  children: ReactNode
  tone?: "warning" | "danger" | "brand" | "success"
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium whitespace-nowrap",
        tone === "danger"
          ? "bg-destructive/10 text-destructive"
          : tone === "warning"
            ? "bg-warning/12 text-warning"
            : tone === "success"
              ? "bg-success/12 text-success"
              : tone === "brand"
                ? "bg-brand-soft text-brand-strong"
                : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  )
}

export function IssuePills({
  asset,
  max = 2,
  skip = [],
}: {
  asset: Asset
  max?: number
  skip?: IssueKey[]
}) {
  const issues = issuesOf(asset).filter((k) => !skip.includes(k))
  if (issues.length === 0) return null
  return (
    <span className="flex min-w-0 flex-wrap gap-1">
      {issues.slice(0, max).map((k) => (
        <IssuePill key={k} issue={k} />
      ))}
      {issues.length > max && <Pill>+{issues.length - max}</Pill>}
    </span>
  )
}

export function IssuePill({ issue }: { issue: IssueKey }) {
  const m = issueMeta[issue]
  return (
    <Pill
      tone={
        m.severity === 2 ? "danger" : m.severity === 1 ? "warning" : undefined
      }
    >
      {m.label}
    </Pill>
  )
}

// The soonest date that needs someone, as a small line.
export function NextDate({ asset }: { asset: Asset }) {
  const d = dueDates(asset)[0]
  if (!d || d.days > 365) return null
  return (
    <span
      className={cn(
        "text-caption whitespace-nowrap",
        d.days < 0
          ? "text-destructive"
          : d.days <= 30
            ? "text-warning"
            : "text-muted-foreground",
      )}
    >
      {d.label} {inDays(d.days)}
    </span>
  )
}

// A thin capacity bar (seats used of bought).
export function Meter({
  value,
  max,
  className,
}: {
  value: number
  max: number
  className?: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <span
      className={cn(
        "block h-1.5 overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <span
        className={cn(
          "block h-full rounded-full",
          value > max
            ? "bg-destructive"
            : pct >= 90
              ? "bg-warning"
              : "bg-brand",
        )}
        style={{ width: `${pct}%` }}
      />
    </span>
  )
}

export function splitOwner(v: string) {
  return {
    user: v.startsWith("u:") ? v.slice(2) : "",
    group: v.startsWith("g:") ? v.slice(2) : "",
  }
}

export function joinOwner(user?: string, group?: string) {
  return user ? `u:${user}` : group ? `g:${group}` : ""
}
