"use client"

import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { useWorkspace } from "@/components/panel/workspace"
import { ConfirmDialog } from "@/components/responsive-dialog"
import { useIntent } from "@/hooks/useIntent"
import { useOpen } from "@/hooks/useOpen"
import type { Script } from "@/lib/services"
import { useCancelScriptRun, useDeleteScript, useDeleteScriptRun } from "../api"
import { RunLayer, type RunPreset, type RunSource } from "./run-layer"

type Actions = {
  run: (source: RunSource, preset?: RunPreset) => void
  runScript: (s: Script, preset?: RunPreset) => void
  command: (preset?: RunPreset) => void
  removeScript: (s: Pick<Script, "id" | "name">, after?: () => void) => void
  removeRun: (id: string, after?: () => void) => void
  cancelRun: (id: string) => void
  canceling: boolean
}

const ActionsContext = createContext<Actions | null>(null)

export function useScriptsActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error("useScriptsActions outside ScriptsActionsProvider")
  return ctx
}

const errorToast = (error: Error) => toast.error(error.message)

// Leave a page once the dialog's own Back has happened.
const afterBack = (go?: () => void) => {
  if (go) window.addEventListener("popstate", () => go(), { once: true })
}

// Every layer of the script pages (and a server's Scripts tab): the run
// sheet and the confirmations.
export function ScriptsActionsProvider({
  children,
  intents,
}: {
  children: ReactNode
  // Only /scripts answers the palette's "Run a command".
  intents?: boolean
}) {
  const { workspace } = useWorkspace()

  const [runOpen, setRunOpen] = useOpen("script-run")
  const [toRun, setToRun] = useState<{
    source: RunSource
    preset?: RunPreset
  } | null>(null)
  const [rmOpen, setRmOpen] = useOpen("script-remove")
  const [rm, setRm] = useState<{
    s: Pick<Script, "id" | "name">
    after?: () => void
  }>()
  const [runRmOpen, setRunRmOpen] = useOpen("script-run-remove")
  const [runRm, setRunRm] = useState<{ id: string; after?: () => void }>()
  const [cancelOpen, setCancelOpen] = useOpen("script-run-cancel")
  const [toCancel, setToCancel] = useState<string>()

  const deleteScript = useDeleteScript()
  const deleteRun = useDeleteScriptRun()
  const cancel = useCancelScriptRun()

  const run = (source: RunSource, preset?: RunPreset) => {
    setToRun({ source, preset })
    setRunOpen(true)
  }
  const command = (preset?: RunPreset) =>
    run({ name: "Command", adhoc: true, interpreter: "bash" }, preset)
  // A nameless intent never matches, so a hidden server tab can't take it.
  useIntent(intents ? "run-command" : "", () => command())

  const actions: Actions = {
    run,
    runScript: (s, preset) =>
      run({ scriptId: s.id, name: s.name, params: s.params }, preset),
    command,
    removeScript: (s, after) => {
      setRm({ s, after })
      setRmOpen(true)
    },
    removeRun: (id, after) => {
      setRunRm({ id, after })
      setRunRmOpen(true)
    },
    cancelRun: (id) => {
      setToCancel(id)
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
        open={rmOpen}
        onOpenChange={setRmOpen}
        title={`Delete “${rm?.s.name ?? ""}”?`}
        description="The script goes. Its past runs stay, each with its own copy of what ran."
        confirmLabel="Delete script"
        pending={deleteScript.isPending}
        onConfirm={() => {
          if (!rm || !workspace) return
          deleteScript.mutate(
            { id: rm.s.id, ws: workspace.id },
            {
              onSuccess: () => {
                setRmOpen(false)
                toast.success("Script deleted")
                afterBack(rm.after)
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
        description="Its output on every server goes with it."
        confirmLabel="Delete run"
        pending={deleteRun.isPending}
        onConfirm={() => {
          if (!runRm) return
          deleteRun.mutate(runRm.id, {
            onSuccess: () => {
              setRunRmOpen(false)
              toast.success("Run deleted")
              afterBack(runRm.after)
            },
            onError: errorToast,
          })
        }}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Stop this run?"
        description="Servers that haven't started don't run it; on the others the script gets SIGTERM, then is cut off after 5 seconds. What it already did stays done."
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
