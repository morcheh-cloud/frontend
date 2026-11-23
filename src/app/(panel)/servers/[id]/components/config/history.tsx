"use client"

import { ChevronLeft, History, RotateCcw, ShieldAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { DiffLines, lineDiff } from "@/components/diff"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { useNow } from "@/hooks/useNow"
import { useOpen } from "@/hooks/useOpen"
import type { ConfigChange, ConfigPending } from "@/lib/services"
import { cn } from "@/lib/utils"
import { useServerPage } from "../server-page"
import {
  type ConfigArea,
  useConfigChange,
  useConfigHistory,
  useConfigWrite,
} from "./api"

const statusText: Record<string, string> = {
  applied: "Applied",
  pending: "Waiting for Keep it",
  undone: "Undone",
}

function when(at: string) {
  return new Date(at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

// History of one area: the changes Morche made, each with its files before
// and after and a Go back. Operator reads it, Engineer goes back.
export function HistoryButton({
  area,
  label = "History",
}: {
  area: ConfigArea
  label?: string
}) {
  const { server, can, phone } = useServerPage()
  const [open, setOpen] = useOpen(`config-history-${area}`)
  if (!can("operator")) return null
  return (
    <>
      <Button
        variant="outline"
        size={phone ? "icon-lg" : "icon"}
        className="md:size-9"
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        <History />
      </Button>
      <HistoryLayer
        serverId={server.id}
        area={area}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

function HistoryLayer({
  serverId,
  area,
  open,
  onOpenChange,
}: {
  serverId: string
  area: ConfigArea
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const list = useConfigHistory(serverId, area, open)
  const [picked, setPicked] = useState<ConfigChange | null>(null)
  const items = list.data?.items ?? []
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setPicked(null)
      }}
      title={picked ? picked.summary : "Changes made from Morche"}
      className="md:max-w-3xl"
    >
      {picked ? (
        <ChangeDetails
          serverId={serverId}
          change={picked}
          onBack={() => setPicked(null)}
          onDone={() => {
            setPicked(null)
            onOpenChange(false)
          }}
        />
      ) : list.isPending ? (
        <p className="py-6 text-body-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-body-sm text-muted-foreground">
          Nothing changed from Morche yet. Changes made here show up in this
          list, and each one can be compared and taken back.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full min-w-0 flex-col gap-0.5 rounded-lg px-2 py-3 text-start hover:bg-muted max-md:min-h-11"
                onClick={() => setPicked(c)}
              >
                <span className="truncate text-body-sm font-medium">
                  {c.summary}
                </span>
                <span className="truncate text-caption text-muted-foreground">
                  {when(c.created_at)} · {c.user || "Someone"} ·{" "}
                  <span className={cn(c.status === "undone" && "text-ash")}>
                    {statusText[c.status] ?? c.status}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </ResponsiveDialog>
  )
}

function ChangeDetails({
  serverId,
  change,
  onBack,
  onDone,
}: {
  serverId: string
  change: ConfigChange
  onBack: () => void
  onDone: () => void
}) {
  const { can } = useServerPage()
  const detail = useConfigChange(serverId, change.id)
  const write = useConfigWrite(serverId)
  const files = detail.data?.files ?? []
  const cut = files.some((f) => f.cut)
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft />
          All changes
        </Button>
        <span className="text-caption text-muted-foreground">
          {when(change.created_at)} · {change.user || "Someone"}
        </span>
        {can("engineer") && (
          <Button
            variant="outline"
            size="sm"
            className="ms-auto"
            disabled={write.isPending || cut || files.length === 0}
            title={cut ? "A file was too big to keep or holds secrets" : ""}
            onClick={() =>
              write.mutate(
                { kind: "restore", change: change.id },
                {
                  onSuccess: () => {
                    toast.success("The files are back as they were")
                    onDone()
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            <RotateCcw />
            Go back to before this
          </Button>
        )}
      </div>
      {detail.isPending && (
        <p className="text-body-sm text-muted-foreground">Loading…</p>
      )}
      {files.map((f) => (
        <div key={f.path} className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate font-mono text-caption text-muted-foreground">
            {f.path}
            {!f.existed && " (new)"}
            {!f.exists && " (removed)"}
          </span>
          {f.cut ? (
            <p className="rounded-lg bg-muted p-3 text-caption text-muted-foreground">
              Too big to keep, or it holds secrets: shown without them and can't
              be put back.
            </p>
          ) : (
            <DiffLines
              lines={lineDiff(f.before, f.after)}
              className="[contain:inline-size]"
            />
          )}
        </div>
      ))}
    </div>
  )
}

// A network change waiting for Keep it: the countdown and both answers.
export function PendingBanner({
  area,
  pending,
}: {
  area: ConfigArea
  pending: ConfigPending
}) {
  const { server, can } = useServerPage()
  const now = useNow(1000)
  const write = useConfigWrite(server.id)
  const left = Math.max(
    0,
    Math.round((new Date(pending.expires_at).getTime() - now) / 1000),
  )
  const act = (kind: "keep" | "undo") =>
    write.mutate(
      { kind, area },
      {
        onSuccess: () =>
          toast.success(kind === "keep" ? "Kept" : "Put back as it was"),
        onError: (e) => toast.error(e.message),
      },
    )
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-warning/40 bg-warning/5 p-4 max-md:mx-4 max-md:mt-4"
    >
      <ShieldAlert className="size-5 shrink-0 text-warning" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-body-sm font-medium">
          Keep this change? It undoes itself in {left} s
        </span>
        <span className="truncate text-caption text-muted-foreground">
          {pending.summary}. If Morche still reaches the server, press Keep it.
        </span>
      </div>
      {can("engineer") && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={write.isPending}
            onClick={() => act("undo")}
          >
            Undo now
          </Button>
          <Button disabled={write.isPending} onClick={() => act("keep")}>
            Keep it
          </Button>
        </div>
      )}
    </div>
  )
}
