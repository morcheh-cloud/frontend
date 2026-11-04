"use client"

import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { useWorkspace } from "@/components/panel/workspace"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { useOpen } from "@/hooks/useOpen"
import type { AnsibleRun, Playbook } from "@/lib/services"
import { useCancelRun, useDeletePlaybook, useDeleteRun } from "../api"
import { RunLayer, type RunPreset, type RunSource } from "./run-layer"

type Actions = {
  run: (source: RunSource, preset?: RunPreset) => void
  removePlaybook: (p: Pick<Playbook, "id" | "name">, after?: () => void) => void
  removeRun: (r: Pick<AnsibleRun, "id">, after?: () => void) => void
  cancelRun: (r: Pick<AnsibleRun, "id">) => void
  canceling: boolean
}

const ActionsContext = createContext<Actions | null>(null)

export function useAnsibleActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useAnsibleActions outside AnsibleActionsProvider")
  return ctx
}

const errorToast = (error: Error) => toast.error(error.message)

// Every layer of the Ansible pages: the run sheet and the confirmations.
export function AnsibleActionsProvider({ children }: { children: ReactNode }) {
  const { workspace } = useWorkspace()

  const [runOpen, setRunOpen] = useOpen("ansible-run")
  const [toRun, setToRun] = useState<{
    source: RunSource
    preset?: RunPreset
  } | null>(null)

  const [pbOpen, setPbOpen] = useOpen("ansible-playbook-remove")
  const [pb, setPb] = useState<{
    p: Pick<Playbook, "id" | "name">
    after?: () => void
  }>()
  const [runRmOpen, setRunRmOpen] = useOpen("ansible-run-remove")
  const [runRm, setRunRm] = useState<{ id: string; after?: () => void }>()
  const [cancelOpen, setCancelOpen] = useOpen("ansible-run-cancel")
  const [toCancel, setToCancel] = useState<string>()

  const deletePlaybook = useDeletePlaybook()
  const deleteRun = useDeleteRun()
  const cancel = useCancelRun()

  const actions: Actions = {
    run: (source, preset) => {
      setToRun({ source, preset })
      setRunOpen(true)
    },
    removePlaybook: (p, after) => {
      setPb({ p, after })
      setPbOpen(true)
    },
    removeRun: (r, after) => {
      setRunRm({ id: r.id, after })
      setRunRmOpen(true)
    },
    cancelRun: (r) => {
      setToCancel(r.id)
      setCancelOpen(true)
    },
    canceling: cancel.isPending,
  }

  return (
    <ActionsContext.Provider value={actions}>
      {children}
      <RunLayer
        open={runOpen}
        onOpenChange={setRunOpen}
        source={toRun?.source ?? null}
        preset={toRun?.preset}
      />
      <ConfirmDialog
        open={pbOpen}
        onOpenChange={setPbOpen}
        title={`Delete “${pb?.p.name ?? ""}”?`}
        description="The playbook goes. Its past runs stay, each with its own copy of what ran."
        confirmLabel="Delete playbook"
        pending={deletePlaybook.isPending}
        onConfirm={() => {
          if (!pb || !workspace) return
          deletePlaybook.mutate(
            { id: pb.p.id, ws: workspace.id },
            {
              onSuccess: () => {
                setPbOpen(false)
                toast.success("Playbook deleted")
                if (pb.after) {
                  // Leave the page after the dialog's Back.
                  const go = pb.after
                  window.addEventListener("popstate", () => go(), {
                    once: true,
                  })
                }
              },
              onError: errorToast,
            },
          )
        }}
      />
      <ConfirmDialog
        open={runRmOpen}
        onOpenChange={setRunRmOpen}
        title="Delete this run?"
        description="Its output and results go with it."
        confirmLabel="Delete run"
        pending={deleteRun.isPending}
        onConfirm={() => {
          if (!runRm) return
          deleteRun.mutate(runRm.id, {
            onSuccess: () => {
              setRunRmOpen(false)
              toast.success("Run deleted")
              if (runRm.after) {
                const go = runRm.after
                window.addEventListener("popstate", () => go(), { once: true })
              }
            },
            onError: errorToast,
          })
        }}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Stop this run?"
        description="Ansible is stopped where it is. A task half done on a server stays half done."
        confirmLabel="Stop run"
        pending={cancel.isPending}
        onConfirm={() => {
          if (!toCancel) return
          cancel.mutate(toCancel, {
            onSuccess: () => setCancelOpen(false),
            onError: errorToast,
          })
        }}
      />
    </ActionsContext.Provider>
  )
}
