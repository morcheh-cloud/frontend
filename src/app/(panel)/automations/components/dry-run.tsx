"use client"

import {
  ChevronRight,
  CircleCheck,
  CircleSlash,
  Server,
  TriangleAlert,
} from "lucide-react"

import type { AutomationDryRun, AutomationDryStep } from "@/lib/services"
import { cn } from "@/lib/utils"
import { StepIcon, type StepKind, stepMeta } from "./meta"

// What an automation would do with an event, step by step (a dry run:
// nothing ran). Used by the editor's live panel and the Test layer.
export function DryRunView({
  d,
  compact,
  manual,
}: {
  d: AutomationDryRun
  // The editor's side column: tighter, without the env lists.
  compact?: boolean
  // Started by hand or by a URL: no "would it start" verdict to give.
  manual?: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      <Verdict d={d} manual={manual} />
      <ol className="flex flex-col">
        {d.steps.map((s, i) => (
          <DryStep
            key={s.index}
            s={s}
            last={i === d.steps.length - 1}
            compact={compact}
          />
        ))}
      </ol>
    </div>
  )
}

function Verdict({ d, manual }: { d: AutomationDryRun; manual?: boolean }) {
  const bad = !!d.problem
  const off = !manual && (!d.matches || !!d.gate)
  const text = bad
    ? d.problem
    : !manual && !d.matches
      ? "This event wouldn't start it: the trigger or its filters don't match."
      : !manual && d.gate
        ? `It would be skipped now: ${d.gate}`
        : manual
          ? "Here's what each step would do."
          : "This event would start it."
  const Icon = bad ? TriangleAlert : off ? CircleSlash : CircleCheck
  return (
    <p
      className={cn(
        "flex gap-2 rounded-lg px-3 py-2.5 text-caption",
        bad
          ? "bg-destructive/5 text-destructive"
          : off
            ? "bg-subtle text-muted-foreground"
            : "bg-success/10 text-success",
      )}
    >
      <Icon className="mt-px size-4 shrink-0" />
      <span className="min-w-0 break-words">{text}</span>
    </p>
  )
}

function DryStep({
  s,
  last,
  compact,
}: {
  s: AutomationDryStep
  last: boolean
  compact?: boolean
}) {
  const rendered = [
    s.title && { label: "Title", value: s.title },
    s.text && { label: "Text", value: s.text },
    s.unit && { label: "Service", value: s.unit },
    s.body && { label: "Body", value: s.body },
  ].filter(Boolean) as { label: string; value: string }[]
  const env = Object.entries(s.env ?? {}).filter(([, v]) => v)
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && (
        <span
          aria-hidden
          className="absolute start-3.5 top-8 bottom-0 w-px bg-border"
        />
      )}
      <span
        className={cn(
          "relative flex size-7 shrink-0 items-center justify-center rounded-lg",
          s.problem
            ? "bg-destructive/10 text-destructive"
            : "bg-brand-soft text-brand-strong",
        )}
      >
        <StepIcon kind={s.kind} className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-body-sm">
          <span className="text-caption text-ash tabular-nums">
            {s.index + 1}.{" "}
          </span>
          <span className="font-medium">
            {s.label || stepMeta[s.kind as StepKind]?.label}
          </span>
        </p>
        {s.summary && (
          <p className="text-caption break-words text-muted-foreground">
            {s.summary}
          </p>
        )}
        {s.servers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {s.servers.map((n) => (
              <span
                key={n}
                className="inline-flex h-6 max-w-full items-center gap-1 rounded-full bg-muted px-2 text-caption"
              >
                <Server className="size-3 shrink-0 text-ash" />
                <span className="truncate">{n}</span>
              </span>
            ))}
          </div>
        )}
        {s.problem && (
          <p className="flex gap-1.5 text-caption text-destructive">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            <span className="min-w-0 break-words">{s.problem}</span>
          </p>
        )}
        {rendered.length > 0 && (
          <dl className="flex flex-col gap-1.5 rounded-lg bg-subtle px-3 py-2">
            {rendered.map((r) => (
              <div key={r.label} className="min-w-0">
                <dt className="text-caption text-ash">{r.label}</dt>
                <dd
                  className={cn(
                    "text-caption break-words whitespace-pre-wrap",
                    r.label === "Body" &&
                      "line-clamp-6 font-mono text-[11px] break-all",
                  )}
                >
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {!compact && env.length > 0 && (
          <details className="group rounded-lg bg-subtle px-3 py-2 text-caption">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-muted-foreground outline-none [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
              The command's environment ({env.length})
            </summary>
            <dl className="mt-2 grid gap-1">
              {env.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="font-mono text-[11px] text-ash">{k}</dt>
                  <dd className="line-clamp-3 font-mono text-[11px] break-all">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </div>
    </li>
  )
}
