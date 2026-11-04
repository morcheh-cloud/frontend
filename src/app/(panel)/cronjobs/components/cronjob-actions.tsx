"use client"

import { useRouter } from "next/navigation"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { useJobActions } from "@/components/jobs/jobs-provider"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import type { Schedule, ScheduleRun } from "@/lib/services"
import {
  useCancelCronjobRun,
  useDeleteCronjob,
  useDeleteCronjobRun,
  useRunCronjob,
  useSetCronjobEnabled,
} from "../api"
import { runHref } from "./meta"

type Job = Pick<Schedule, "id" | "name" | "workspace_id">

type Actions = {
  // Starts a run. A test run opens its result; a real one is followed in
  // Tasks and on the job's page.
  run: (s: Job, opts?: { dryRun?: boolean }) => void
  running: boolean
  setEnabled: (s: Job, enabled: boolean) => void
  remove: (s: Job, after?: () => void) => void
  cancelRun: (r: Pick<ScheduleRun, "id">) => void
  removeRun: (r: Pick<ScheduleRun, "id">, after?: () => void) => void
}

const ActionsContext = createContext<Actions | null>(null)

export function useCronjobActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useCronjobActions outside CronjobActionsProvider")
  return ctx
}

const errorToast = (error: Error) => toast.error(error.message)

// Every confirmation of the cron job pages, shared by the list, the job page
// and the editor.
export function CronjobActionsProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const jobs = useJobActions()
  const runMutation = useRunCronjob()
  const enable = useSetCronjobEnabled()
  const del = useDeleteCronjob()
  const cancel = useCancelCronjobRun()
  const delRun = useDeleteCronjobRun()

  const [rmOpen, setRmOpen] = useOpen("cronjob-remove")
  const [toRemove, setToRemove] = useState<{ s: Job; after?: () => void }>()
  const [cancelOpen, setCancelOpen] = useOpen("cronjob-run-cancel")
  const [toCancel, setToCancel] = useState<string>()
  const [runRmOpen, setRunRmOpen] = useOpen("cronjob-run-remove")
  const [runRm, setRunRm] = useState<{ id: string; after?: () => void }>()

  const actions: Actions = {
    run: (s, opts) => {
      const dryRun = !!opts?.dryRun
      runMutation.mutate(
        { id: s.id, dryRun },
        {
          onSuccess: (out) => {
            if (out.job) jobs.track(out.job)
            if (dryRun) router.push(runHref(s.id, out.run.id))
          },
          onError: errorToast,
        },
      )
    },
    running: runMutation.isPending,
    setEnabled: (s, enabled) =>
      enable.mutate(
        { id: s.id, enabled },
        {
          onSuccess: () =>
            toast.success(
              enabled ? `${s.name} is on again` : `${s.name} is paused`,
            ),
          onError: errorToast,
        },
      ),
    remove: (s, after) => {
      setToRemove({ s, after })
      setRmOpen(true)
    },
    cancelRun: (r) => {
      setToCancel(r.id)
      setCancelOpen(true)
    },
    removeRun: (r, after) => {
      setRunRm({ id: r.id, after })
      setRunRmOpen(true)
    },
  }

  return (
    <ActionsContext.Provider value={actions}>
      {children}
      <ConfirmDialog
        open={rmOpen}
        onOpenChange={setRmOpen}
        title={`Delete ${toRemove?.s.name ?? "this cron job"}?`}
        description="It stops running and its run history goes with it. Files it already copied stay where they are."
        confirmLabel="Delete"
        pending={del.isPending}
        onConfirm={() => {
          if (!toRemove) return
          del.mutate(toRemove.s, {
            onSuccess: () => {
              setRmOpen(false)
              toast.success(`${toRemove.s.name} deleted`)
              toRemove.after?.()
            },
            onError: errorToast,
          })
        }}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Stop this run?"
        description="It stops after the file it's on. Files already copied stay; the rest are copied next time."
        confirmLabel="Stop"
        pending={cancel.isPending}
        onConfirm={() => {
          if (!toCancel) return
          cancel.mutate(toCancel, {
            onSuccess: () => setCancelOpen(false),
            onError: errorToast,
          })
        }}
      />
      <ConfirmDialog
        open={runRmOpen}
        onOpenChange={setRunRmOpen}
        title="Delete this run from the history?"
        description="Only the record goes. Nothing is changed on the servers or storages."
        confirmLabel="Delete"
        pending={delRun.isPending}
        onConfirm={() => {
          if (!runRm) return
          delRun.mutate(runRm, {
            onSuccess: () => {
              setRunRmOpen(false)
              runRm.after?.()
            },
            onError: errorToast,
          })
        }}
      />
    </ActionsContext.Provider>
  )
}
