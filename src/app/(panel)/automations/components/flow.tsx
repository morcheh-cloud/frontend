"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { timeAgo } from "@/app/(panel)/servers/components/meta"
import { useEventCatalog } from "@/components/events/catalog"
import type {
  AutomationAction,
  AutomationRunBrief,
  AutomationTrigger,
} from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  automationHref,
  StepIcon,
  type StepKind,
  statusMeta,
  stepMeta,
  triggerMeta,
  triggerText,
} from "./meta"

// The trigger as a pill: "⚡ When Alert fired · 1 filter".
export function TriggerChip({
  trigger,
  className,
}: {
  trigger: AutomationTrigger
  className?: string
}) {
  const catalog = useEventCatalog()
  const Icon = triggerMeta[trigger.kind].icon
  return (
    <span
      className={cn(
        "inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-full bg-brand-soft px-2.5 text-caption font-medium text-brand-strong",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{triggerText(trigger, catalog.data)}</span>
    </span>
  )
}

// Trigger → steps as a strip of tiles joined by a line, for cards and the
// page's hero.
export function FlowStrip({
  trigger,
  actions,
  size = "md",
  max = 7,
  className,
}: {
  trigger: AutomationTrigger
  actions: Pick<AutomationAction, "kind" | "label">[]
  size?: "md" | "lg"
  max?: number
  className?: string
}) {
  const TriggerIcon = triggerMeta[trigger.kind].icon
  const shown = actions.slice(0, max)
  const more = actions.length - shown.length
  const tile = size === "lg" ? "size-10 rounded-xl" : "size-8 rounded-lg"
  const icon = size === "lg" ? "size-5" : "size-4"
  return (
    <ol
      className={cn("flex min-w-0 items-center", className)}
      aria-label="What it does"
    >
      <li className="flex shrink-0 items-center">
        <span
          title={triggerMeta[trigger.kind].label}
          className={cn(
            "flex items-center justify-center bg-brand text-primary-foreground",
            tile,
          )}
        >
          <TriggerIcon className={icon} />
        </span>
      </li>
      {shown.map((a, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: steps in order, by place
          key={i}
          className="flex min-w-0 shrink items-center"
        >
          <span
            aria-hidden
            className={cn(
              "h-px shrink bg-mist",
              size === "lg" ? "w-6 min-w-3" : "w-4 min-w-2",
            )}
          />
          <span
            title={a.label || stepMeta[a.kind as StepKind]?.label}
            className={cn(
              "flex shrink-0 items-center justify-center border border-border bg-card text-muted-foreground",
              tile,
            )}
          >
            <StepIcon kind={a.kind} className={icon} />
            <span className="sr-only">
              {a.label || stepMeta[a.kind as StepKind]?.label}
            </span>
          </span>
        </li>
      ))}
      {more > 0 && (
        <li className="ms-2 shrink-0 text-caption text-ash tabular-nums">
          +{more}
        </li>
      )}
    </ol>
  )
}

// "Service → Notify".
export const stepsText = (
  actions: Pick<AutomationAction, "kind" | "label">[],
) =>
  actions
    .map((a) => a.label || stepMeta[a.kind as StepKind]?.short || a.kind)
    .join(" → ")

// The last runs as bars, oldest first, empty places for runs not had yet.
export function RecentStrip({
  automationId,
  recent,
  slots = 10,
  className,
}: {
  automationId: string
  recent: AutomationRunBrief[]
  slots?: number
  className?: string
}) {
  const runs = [...recent].slice(0, slots).reverse()
  const empty = slots - runs.length
  return (
    <div
      className={cn("flex h-6 items-end gap-0.5", className)}
      role="img"
      aria-label={
        runs.length
          ? `Last ${runs.length} runs: ${runs.map((r) => statusMeta[r.status]?.label ?? r.status).join(", ")}`
          : "No runs yet"
      }
    >
      {Array.from({ length: empty }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders
          key={`e${i}`}
          className="h-2 w-1.5 rounded-full bg-muted"
        />
      ))}
      {runs.map((r) => (
        <Link
          key={r.id}
          href={automationHref(automationId, r.id)}
          title={`${statusMeta[r.status]?.label ?? r.status} · ${timeAgo(r.created_at)}`}
          className={cn(
            "w-1.5 rounded-full outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/50",
            statusMeta[r.status]?.bg ?? "bg-mist",
            r.status === "failed"
              ? "h-6"
              : r.status === "skipped"
                ? "h-3"
                : "h-5",
          )}
        />
      ))}
    </div>
  )
}

export function FlowArrow({ className }: { className?: string }) {
  return <ArrowRight className={cn("size-3.5 shrink-0 text-ash", className)} />
}
