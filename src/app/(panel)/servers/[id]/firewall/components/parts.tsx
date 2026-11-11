"use client"

import { Lock } from "lucide-react"

import type { FilterRule } from "@/lib/services"
import { cn } from "@/lib/utils"
import { ACTION_LABELS, lets, stops } from "./meta"

export function ActionTag({ action }: { action: FilterRule["action"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-body-sm whitespace-nowrap">
      <span
        className={cn(
          "size-1.5 rounded-full",
          lets({ action }) && "bg-success",
          stops({ action }) && "bg-destructive",
          action === "other" && "bg-ash",
        )}
      />
      {ACTION_LABELS[action]}
    </span>
  )
}

export function SshLock() {
  return (
    <span
      title="This rule keeps SSH open for Morche"
      className="text-ash"
      role="img"
      aria-label="Keeps SSH open"
    >
      <Lock className="size-3.5" />
    </span>
  )
}

// What the rule form and lists need to say beyond port and address.
export function ruleBadges(r: FilterRule) {
  const out: string[] = []
  if (r.direction === "out") out.push("Outgoing")
  if (r.direction === "routed") out.push("Routed")
  if (r.family === "v6") out.push("IPv6")
  if (r.interface) out.push(`on ${r.interface}`)
  if (r.zone) out.push(r.zone)
  if (r.log) out.push("Logged")
  return out
}

export function Badges({ rule }: { rule: FilterRule }) {
  const badges = ruleBadges(rule)
  if (badges.length === 0) return null
  return (
    <span className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <span
          key={b}
          className="rounded-full bg-muted px-2 text-caption text-muted-foreground"
        >
          {b}
        </span>
      ))}
    </span>
  )
}

// A filter that isn't tabs: small pills with their count inside.
export function Chips<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { value: T | null; label: string }[]
  value: T | null
  onChange: (value: T | null) => void
}) {
  return (
    <>
      {items.map((item) => (
        <button
          key={item.value ?? "all"}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
          className="h-10 shrink-0 rounded-full border border-border px-3 text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-transparent aria-pressed:bg-brand-soft aria-pressed:font-medium aria-pressed:text-brand-strong md:h-8"
        >
          {item.label}
        </button>
      ))}
    </>
  )
}
