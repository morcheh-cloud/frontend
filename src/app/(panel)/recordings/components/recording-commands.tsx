"use client"

import { Play } from "lucide-react"
import type { ReactNode } from "react"

import type { CommandLogEntry, TerminalRecording } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useRecordingCommands } from "../api"
import { RootTag, StatusMark } from "./command-list"
import { resultText } from "./command-meta"
import { clock } from "./recording-list"

// The commands typed while a recording ran; a click jumps the player there.
export function RecordingCommands({
  r,
  phone,
  onJump,
  className,
}: {
  r: TerminalRecording
  phone: boolean
  onJump: (ms: number) => void
  className?: string
}) {
  const list = useRecordingCommands(r)
  const items = list.data ?? []
  // Nothing to jump to: no column at all (old recordings, other shells).
  if (!r.server_id || (list.isSuccess && items.length === 0)) return null

  let body: ReactNode
  if (list.isPending)
    body = <p className="px-4 py-3 text-body-sm text-ash">Loading…</p>
  else if (list.isError)
    body = (
      <p className="px-4 py-3 text-body-sm text-muted-foreground">
        {list.error.message}
      </p>
    )
  else
    body = (
      <ol className="flex flex-col py-1">
        {items.map((c) => (
          <li key={c.id}>
            <Row c={c} phone={phone} onJump={onJump} />
          </li>
        ))}
      </ol>
    )

  return (
    <section
      aria-label="Commands typed"
      className={cn("flex min-h-0 flex-col", className)}
    >
      <h2 className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-4 text-caption font-medium text-ash">
        Commands
        {items.length > 0 && (
          <span className="tabular-nums">{items.length}</span>
        )}
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
    </section>
  )
}

function Row({
  c,
  phone,
  onJump,
}: {
  c: CommandLogEntry
  phone: boolean
  onJump: (ms: number) => void
}) {
  const at = c.recording_ms ?? 0
  return (
    <button
      type="button"
      onClick={() => onJump(Math.max(0, at - 500))}
      title={`Play from ${clock(at)}`}
      className={cn(
        "group flex w-full items-start gap-3 px-4 text-start outline-none hover:bg-muted/60 focus-visible:bg-muted active:bg-muted",
        phone ? "min-h-12 py-2.5" : "py-2",
      )}
    >
      <span className="w-12 shrink-0 pt-0.5 text-caption text-ash tabular-nums">
        {clock(at)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          {c.as_root && <RootTag />}
          <code className="line-clamp-2 min-w-0 font-mono text-caption break-all">
            {c.command}
          </code>
        </span>
        {(c.status === "failed" || c.cwd) && (
          <span className="flex min-w-0 items-center gap-1.5 text-caption text-ash">
            <StatusMark c={c} />
            <span className="truncate">
              {c.status === "failed" ? resultText(c) : c.cwd}
            </span>
          </span>
        )}
      </span>
      <Play className="mt-0.5 size-3.5 shrink-0 text-ash opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 max-md:hidden" />
    </button>
  )
}
