"use client"

import {
  CircleCheck,
  CircleX,
  Clock,
  Copy,
  Loader2,
  Play,
  RotateCw,
} from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import { toast } from "sonner"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { CronRunResult } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Segmented } from "../../../components/fields"
import { useServerPage } from "../../components/server-page"
import { useRunCommand } from "../api"

export type RunRequest = {
  title: string
  command: string
  user: string
  table?: string
}

const timeouts = [
  { value: "60", label: "1 min" },
  { value: "300", label: "5 min" },
  { value: "600", label: "10 min" },
]

// Runs a command once, as the job's user, and shows what it printed. Nothing
// starts until Run is pressed: a job can be destructive.
export function RunDialog({
  open,
  onOpenChange,
  request,
  round,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: RunRequest | null
  round: number
}) {
  const { phone } = useServerPage()
  const title = request ? `Run “${request.title}”` : "Run"
  const body = request && <RunBody key={round} request={request} />

  if (phone) {
    return (
      <BottomSheet
        full
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        className="px-4 pb-[calc(--spacing(8)+env(safe-area-inset-bottom))]"
      >
        {body}
      </BottomSheet>
    )
  }
  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent className="gap-5 p-6 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate pe-8">{title}</DialogTitle>
          <DialogDescription>
            Runs once now, outside cron, with your session's environment.
          </DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  )
}

function RunBody({ request }: { request: RunRequest }) {
  const { server, phone } = useServerPage()
  const runner = useRunCommand(server.id)
  const [timeout, setTimeoutValue] = useState("60")
  const result = runner.data

  function start() {
    runner.mutate(
      {
        command: request.command,
        user: request.user,
        table: request.table,
        timeout: Number(timeout),
      },
      { onError: (e) => toast.error(e.message) },
    )
  }

  function copy() {
    if (!result) return
    navigator.clipboard
      .writeText(result.output)
      .then(() => toast.success("Output copied"))
      .catch(() => toast.error("Couldn't access the clipboard"))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body-sm">
        <dt className="text-muted-foreground">As</dt>
        <dd className="font-medium">{request.user}</dd>
        <dt className="text-muted-foreground">Command</dt>
        <dd className="min-w-0">
          <code className="block rounded-lg bg-muted px-2 py-1 font-mono text-caption break-all whitespace-pre-wrap">
            {request.command}
          </code>
        </dd>
      </dl>

      {result || runner.isPending ? (
        <Output result={result} pending={runner.isPending} phone={phone} />
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium">Stop after</span>
          <Segmented
            label="Stop after"
            value={timeout}
            onChange={setTimeoutValue}
            options={timeouts}
          />
          <p className="text-caption text-muted-foreground">
            It runs on the server, so it really happens: files it changes stay
            changed.
          </p>
        </div>
      )}

      <div className="flex gap-2 max-md:mt-auto max-md:flex-col-reverse md:justify-end">
        {result && (
          <Button
            variant="outline"
            size={phone ? "lg" : "default"}
            onClick={copy}
          >
            <Copy />
            Copy output
          </Button>
        )}
        <Button
          size={phone ? "lg" : "default"}
          disabled={runner.isPending}
          onClick={start}
        >
          {runner.isPending ? (
            <Loader2 className="animate-spin" />
          ) : result ? (
            <RotateCw />
          ) : (
            <Play />
          )}
          {runner.isPending ? "Running…" : result ? "Run again" : "Run now"}
        </Button>
      </div>
    </div>
  )
}

function took(ms: number) {
  if (ms < 1000) return `${ms} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`
}

function Output({
  result,
  pending,
  phone,
}: {
  result?: CronRunResult
  pending: boolean
  phone: boolean
}) {
  let status: ReactNode = (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Running…
    </span>
  )
  if (result && !pending) {
    const ok = result.exit_code === 0 && !result.timed_out
    status = (
      <span
        className={cn(
          "flex items-center gap-1.5 font-medium",
          ok ? "text-success" : "text-destructive",
        )}
      >
        {result.timed_out ? (
          <Clock className="size-4" />
        ) : ok ? (
          <CircleCheck className="size-4" />
        ) : (
          <CircleX className="size-4" />
        )}
        {result.timed_out
          ? "Stopped: took too long"
          : ok
            ? "Finished"
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
