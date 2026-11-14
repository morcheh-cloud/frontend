"use client"

import {
  Check,
  CircleAlert,
  Copy,
  Download,
  History,
  LoaderCircle,
  ScrollText,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { AnsiText } from "@/components/ansi"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import { formatDuration } from "@/lib/format"
import type { PVETask } from "@/lib/services"
import { cn } from "@/lib/utils"

import { Empty, Segmented } from "../../../../servers/[id]/components/parts"
import { timeAgo } from "../../../../servers/components/meta"
import { useGuestTasks, useTaskLog } from "../../../api"
import { copy } from "../../../components/vm-actions"
import { TabLoading, useGuestPage } from "./guest-page"
import { Panel, TabBar, TabBody, Tag } from "./kit"

// Proxmox's task type names (qm* = VMs, vz* = containers) in plain words.
const taskNames: Record<string, string> = {
  start: "Start",
  stop: "Stop (forced)",
  shutdown: "Shut down",
  reboot: "Restart",
  reset: "Reset",
  suspend: "Pause",
  resume: "Resume",
  snapshot: "Snapshot",
  rollback: "Go back to snapshot",
  delsnapshot: "Delete snapshot",
  clone: "Clone",
  migrate: "Move to another node",
  create: "Create",
  destroy: "Delete",
  restore: "Restore",
  config: "Change settings",
  template: "Turn into template",
  move: "Move disk",
  move_volume: "Move disk",
}

export function taskName(type: string) {
  if (type === "vzdump") return "Back up"
  if (type === "resize" || type === "qmresize") return "Grow disk"
  if (type === "vncproxy" || type === "vncshell") return "Console (VNC)"
  if (type === "termproxy") return "Console (terminal)"
  if (type === "imgcopy") return "Copy image"
  if (type === "qmmove" || type === "move_volume") return "Move disk"
  const short = type.replace(/^(qm|vz)/, "")
  return taskNames[short] ?? type
}

const taskTone = (t: PVETask) =>
  t.running ? "brand" : t.ok ? "success" : "destructive"

function took(t: PVETask) {
  const end = t.ended_at ? new Date(t.ended_at).getTime() : Date.now()
  const s = Math.max(0, (end - new Date(t.started_at).getTime()) / 1000)
  return s < 1 ? "under a second" : formatDuration(s)
}

type Show = "all" | "failed" | "noconsole"

export function ActivityTab() {
  const { guest: g, phone } = useGuestPage()
  const q = useGuestTasks(g.cluster_id, g.vmid)
  const [show, setShow] = useState<Show>("noconsole")
  const [picked, setPicked] = useState<PVETask | null>(null)
  const [open, setOpen] = useOpen("vm-task-log")

  if (q.isLoading) return <TabLoading />
  if (q.isError) {
    return (
      <Empty
        icon={History}
        title="Couldn't read the activity"
        body={q.error.message}
        action={
          <Button variant="outline" onClick={() => q.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }

  const all = [...(q.data?.items ?? [])].sort((a, b) =>
    b.started_at.localeCompare(a.started_at),
  )
  const consoles = (t: PVETask) =>
    ["vncproxy", "vncshell", "termproxy"].includes(t.type)
  const failed = all.filter((t) => !t.ok && !t.running)
  const items =
    show === "failed"
      ? failed
      : show === "noconsole"
        ? all.filter((t) => !consoles(t))
        : all
  const running = all.filter((t) => t.running).length

  if (all.length === 0) {
    return (
      <Empty
        icon={History}
        title="Nothing has happened yet"
        body="Every start, stop, snapshot, backup and change Proxmox runs for this machine shows up here, with its log. Tasks started in Proxmox's own UI are listed too."
      />
    )
  }

  const openLog = (t: PVETask) => {
    setPicked(t)
    setOpen(true)
  }

  return (
    <TabBody>
      <TabBar>
        <Segmented<Show>
          label="Show"
          value={show}
          onChange={setShow}
          items={[
            { value: "noconsole", label: "Tasks" },
            { value: "failed", label: `Failed · ${failed.length}` },
            { value: "all", label: "All" },
          ]}
        />
        <span className="text-caption text-muted-foreground md:ms-auto">
          {running > 0 ? `${running} running · ` : ""}last {all.length} on
          Proxmox
        </span>
      </TabBar>

      <Panel flush>
        {items.length === 0 ? (
          <p className="px-5 py-6 text-body-sm text-muted-foreground max-md:px-4">
            {show === "failed" ? "No failed tasks. " : "Nothing to show. "}
            <button
              type="button"
              className="text-brand hover:underline"
              onClick={() => setShow("all")}
            >
              Show all
            </button>
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((t) => (
              <li key={t.upid}>
                <button
                  type="button"
                  onClick={() => openLog(t)}
                  className="flex min-h-14 w-full items-center gap-3 px-5 py-2.5 text-start hover:bg-muted/60 max-md:px-4"
                >
                  <StatusIcon t={t} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-body-sm font-medium">
                      {taskName(t.type)}
                      {!t.ok && !t.running && (
                        <Tag tone="destructive">Failed</Tag>
                      )}
                    </span>
                    <span className="block truncate text-caption text-muted-foreground">
                      {[
                        phone
                          ? timeAgo(t.started_at)
                          : new Date(t.started_at).toLocaleString(),
                        t.running
                          ? `running for ${took(t)}`
                          : `took ${took(t)}`,
                        t.user,
                        `node ${t.node}`,
                      ].join(" · ")}
                    </span>
                    {!t.ok && !t.running && t.status && (
                      <span className="mt-0.5 block truncate text-caption text-destructive">
                        {t.status}
                      </span>
                    )}
                  </span>
                  <ScrollText className="size-4 shrink-0 text-ash" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {picked && (
        <TaskLogLayer
          open={open}
          onOpenChange={setOpen}
          cluster={g.cluster_id}
          task={picked}
        />
      )}
    </TabBody>
  )
}

function StatusIcon({ t }: { t: PVETask }) {
  const tone = taskTone(t)
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        tone === "brand" && "bg-brand-soft text-brand-strong",
        tone === "success" && "bg-muted text-success",
        tone === "destructive" && "bg-destructive/10 text-destructive",
      )}
    >
      {t.running ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : t.ok ? (
        <Check className="size-4" />
      ) : (
        <CircleAlert className="size-4" />
      )}
    </span>
  )
}

// One task's log, re-read every 2 s while it runs; follows the end.
export function TaskLogLayer({
  open,
  onOpenChange,
  cluster,
  task,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cluster: string
  task: PVETask
}) {
  const q = useTaskLog(cluster, task.upid, task.running)
  const live = q.data?.task ?? task
  const lines = q.data?.lines ?? []
  const text = lines.join("\n")
  const box = useRef<HTMLPreElement>(null)
  const atEnd = useRef(true)

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when lines grow
  useEffect(() => {
    const el = box.current
    if (el && atEnd.current) el.scrollTop = el.scrollHeight
  }, [lines.length])

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `${live.type}-${live.started_at.slice(0, 19)}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={taskName(live.type)}
      description={`${new Date(live.started_at).toLocaleString()} · ${live.user} · node ${live.node}`}
      className="sm:max-w-3xl"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={taskTone(live)}>
            {live.running ? "Running" : live.ok ? "Done" : "Failed"}
          </Tag>
          <span className="text-caption text-muted-foreground">
            {live.running ? `for ${took(live)}` : `took ${took(live)}`}
          </span>
          <span className="ms-auto flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Copy the log"
              disabled={!text}
              onClick={() => copy(text, "Log")}
            >
              <Copy />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Download the log"
              disabled={!text}
              onClick={download}
            >
              <Download />
            </Button>
          </span>
        </div>
        {!live.ok && !live.running && live.status && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-body-sm text-destructive">
            {live.status}
          </p>
        )}
        <pre
          ref={box}
          onScroll={(e) => {
            const el = e.currentTarget
            atEnd.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 24
          }}
          className="max-h-[60vh] min-h-40 overflow-auto rounded-lg border border-border bg-subtle p-3 font-mono text-caption leading-relaxed break-all whitespace-pre-wrap max-md:max-h-[55vh]"
        >
          {q.isLoading ? (
            <span className="text-muted-foreground">Reading the log…</span>
          ) : q.isError ? (
            <span className="text-destructive">{q.error.message}</span>
          ) : lines.length === 0 ? (
            <span className="text-muted-foreground">The log is empty.</span>
          ) : (
            <AnsiText text={text} />
          )}
        </pre>
        {q.data && q.data.total > lines.length && (
          <p className="text-caption text-muted-foreground">
            Showing {lines.length} of {q.data.total} lines.
          </p>
        )}
        <span className="sr-only" aria-live="polite">
          {live.running ? "" : live.ok ? "Task finished" : "Task failed"}
        </span>
      </div>
    </ResponsiveDialog>
  )
}
