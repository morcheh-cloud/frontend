"use client"

import { CircleCheck, CircleX, Loader2 } from "lucide-react"
import type { ReactNode } from "react"

import type { Fail2BanTask } from "@/lib/services"
import { cn } from "@/lib/utils"

export function took(ms: number) {
  if (ms < 1000) return `${ms} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`
}

// A command's result: status line, duration and what it printed.
export function TaskOutput({
  result,
  pending,
  pendingLabel,
  phone,
}: {
  result?: Fail2BanTask
  pending: boolean
  pendingLabel: string
  phone: boolean
}) {
  let status: ReactNode = (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      {pendingLabel}
    </span>
  )
  if (result && !pending) {
    status = (
      <span
        className={cn(
          "flex items-center gap-1.5 font-medium",
          result.ok ? "text-success" : "text-destructive",
        )}
      >
        {result.ok ? (
          <CircleCheck className="size-4" />
        ) : (
          <CircleX className="size-4" />
        )}
        {result.ok
          ? "Done"
          : result.exit_code === -1
            ? "Stopped: took too long"
            : `Failed with exit code ${result.exit_code}`}
      </span>
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between gap-3 text-body-sm">
        {status}
        {result && !pending && (
          <span className="text-caption text-ash tabular-nums">
            {took(result.duration_ms)}
          </span>
        )}
      </div>
      <pre
        className={cn(
          "min-h-24 overflow-auto rounded-2xl border border-border bg-subtle p-3 font-mono text-caption break-all whitespace-pre-wrap",
          phone ? "min-h-0 flex-1" : "max-h-[50vh]",
          pending && "opacity-60",
        )}
      >
        {result?.output || (pending ? "" : "(no output)")}
      </pre>
      {result?.truncated && !pending && (
        <p className="text-caption text-muted-foreground">
          The output was too long; only its start is shown.
        </p>
      )}
    </div>
  )
}
