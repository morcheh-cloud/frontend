"use client"

import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/field"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useOpen } from "@/hooks/useOpen"
import type { UptimeIncident, UptimeMonitor } from "@/lib/services"
import {
  useAcknowledge,
  useCheckMonitor,
  useDeleteMonitor,
  usePauseMonitor,
} from "../api"
import { stateMeta } from "./meta"

type Monitor = Pick<UptimeMonitor, "id" | "name" | "workspace_id">

type Actions = {
  // Runs the check now and says what came back.
  check: (m: Monitor) => void
  checking: string | null
  setPaused: (m: Monitor, paused: boolean) => void
  remove: (m: Monitor, after?: () => void) => void
  // "I'm on it", with an optional note for the team.
  acknowledge: (i: Pick<UptimeIncident, "id" | "monitor_name">) => void
}

const ActionsContext = createContext<Actions | null>(null)

export function useUptimeActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useUptimeActions outside UptimeActionsProvider")
  return ctx
}

const errorToast = (error: Error) => toast.error(error.message)

// Every confirmation and small layer of the uptime pages, shared by the list,
// a monitor's page, the editor and a server's Uptime tab.
export function UptimeActionsProvider({ children }: { children: ReactNode }) {
  const check = useCheckMonitor()
  const pause = usePauseMonitor()
  const del = useDeleteMonitor()
  const ack = useAcknowledge()

  const [rmOpen, setRmOpen] = useOpen("monitor-remove")
  const [toRemove, setToRemove] = useState<{ m: Monitor; after?: () => void }>()
  const [ackOpen, setAckOpen] = useOpen("monitor-acknowledge")
  const [toAck, setToAck] =
    useState<Pick<UptimeIncident, "id" | "monitor_name">>()
  const [note, setNote] = useState("")

  const actions: Actions = {
    check: (m) =>
      check.mutate(m.id, {
        onSuccess: ({ result }) => {
          const label = stateMeta[result.status as "up"]?.label ?? "Checked"
          const text = `${m.name}: ${label}${
            result.latency_ms != null ? ` · ${result.latency_ms} ms` : ""
          }`
          const opts = { description: result.message || undefined }
          if (result.status === "up") toast.success(text, opts)
          else if (result.status === "degraded") toast.warning(text, opts)
          else toast.error(text, opts)
        },
        onError: errorToast,
      }),
    checking: check.isPending ? (check.variables ?? null) : null,
    setPaused: (m, paused) =>
      pause.mutate(
        { id: m.id, paused },
        {
          onSuccess: () =>
            toast.success(
              paused
                ? `${m.name} is paused: no checks, no alerts`
                : `${m.name} is watched again`,
            ),
          onError: errorToast,
        },
      ),
    remove: (m, after) => {
      setToRemove({ m, after })
      setRmOpen(true)
    },
    acknowledge: (i) => {
      setToAck(i)
      setNote("")
      setAckOpen(true)
    },
  }

  const sendAck = () => {
    if (!toAck) return
    ack.mutate(
      { id: toAck.id, note: note.trim() },
      {
        onSuccess: () => {
          setAckOpen(false)
          toast.success("Acknowledged: the team sees you're on it")
        },
        onError: errorToast,
      },
    )
  }

  return (
    <ActionsContext.Provider value={actions}>
      {children}
      <ConfirmDialog
        open={rmOpen}
        onOpenChange={setRmOpen}
        title={`Delete ${toRemove?.m.name ?? "this monitor"}?`}
        description="Its checks stop and its history, incidents and reports go with it. To stop it for a while, pause it instead."
        confirmLabel="Delete"
        destructive
        pending={del.isPending}
        onConfirm={() => {
          if (!toRemove) return
          del.mutate(toRemove.m, {
            onSuccess: () => {
              setRmOpen(false)
              toast.success(`${toRemove.m.name} deleted`)
              toRemove.after?.()
            },
            onError: errorToast,
          })
        }}
      />
      <ResponsiveDialog
        open={ackOpen}
        onOpenChange={setAckOpen}
        title="Acknowledge the incident"
        description={`Tells everyone watching ${
          toAck?.monitor_name || "this monitor"
        } that someone is on it. Reminders stop until it's back up.`}
        footer={
          <>
            <Button
              variant="outline"
              className="h-11 md:h-9"
              onClick={() => setAckOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-11 md:h-9"
              disabled={ack.isPending}
              onClick={sendAck}
            >
              Acknowledge
            </Button>
          </>
        }
      >
        <Field label="Note" hint="Optional. Shown on the incident.">
          {(p) => (
            <Textarea
              {...p}
              value={note}
              maxLength={2000}
              rows={3}
              placeholder="Restarting the app server, back in 5 minutes"
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendAck()
              }}
            />
          )}
        </Field>
      </ResponsiveDialog>
    </ActionsContext.Provider>
  )
}
