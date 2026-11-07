"use client"

import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useState,
} from "react"
import { toast } from "sonner"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { Field } from "@/components/field"
import { useWorkspace } from "@/components/panel/workspace"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import { fieldErrors } from "@/lib/api"
import type { RecordingSettings, TerminalRecording } from "@/lib/services"
import { timeAgo } from "../../servers/components/meta"
import {
  useDeleteRecording,
  useRecordingSettings,
  useSetRecordingSettings,
} from "../api"

type Ws = { id: string; name: string }

type Actions = {
  // The workspace whose recording setting to change.
  settings: (ws: Ws) => void
  remove: (r: Pick<TerminalRecording, "id">, after?: () => void) => void
}

const ActionsContext = createContext<Actions | null>(null)

export function useRecordingsActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx)
    throw new Error("useRecordingsActions outside RecordingsActionsProvider")
  return ctx
}

// Owners of the selected workspace turn recording on and see everyone's.
export function useRecordingsCan(workspaceId?: string) {
  const { workspace } = useWorkspace()
  const access = useAccess()
  const ws = workspaceId ?? workspace?.id ?? ""
  return { manage: !!ws && atLeast(access.workspaceLevel(ws), "owner") }
}

// Leave a page once the dialog's own Back has happened.
const afterBack = (go?: () => void) => {
  if (go) window.addEventListener("popstate", () => go(), { once: true })
}

export function RecordingsActionsProvider({
  children,
}: {
  children: ReactNode
}) {
  const [settingsOpen, setSettingsOpen] = useOpen("recording-settings")
  const [ws, setWs] = useState<Ws>()
  const [rmOpen, setRmOpen] = useOpen("recording-remove")
  const [rm, setRm] = useState<{ id: string; after?: () => void }>()
  const del = useDeleteRecording()

  const actions: Actions = {
    settings: (w) => {
      setWs(w)
      setSettingsOpen(true)
    },
    remove: (r, after) => {
      setRm({ id: r.id, after })
      setRmOpen(true)
    },
  }

  return (
    <ActionsContext.Provider value={actions}>
      {children}
      <SettingsDialog
        ws={ws}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <ConfirmDialog
        open={rmOpen}
        onOpenChange={setRmOpen}
        title="Delete this recording?"
        description="The replay is gone for everyone. The shell's session itself isn't affected."
        confirmLabel="Delete recording"
        pending={del.isPending}
        onConfirm={() => {
          if (!rm) return
          del.mutate(rm.id, {
            onSuccess: () => {
              setRmOpen(false)
              toast.success("Recording deleted")
              afterBack(rm.after)
            },
            onError: (err) => toast.error(err.message),
          })
        }}
      />
    </ActionsContext.Provider>
  )
}

function SettingsDialog({
  ws: workspace,
  open,
  onOpenChange,
}: {
  ws?: Ws
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const settings = useRecordingSettings(workspace?.id)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Terminal recording"
      description={`For every terminal opened on ${workspace?.name ?? "this workspace"}'s servers.`}
    >
      {settings.data && workspace ? (
        <SettingsForm
          // Start from what's saved each time it opens.
          key={`${open}-${settings.data.updated_at ?? ""}`}
          ws={workspace.id}
          saved={settings.data}
          onDone={() => onOpenChange(false)}
        />
      ) : (
        <p className="pb-4 text-body-sm text-muted-foreground">
          {settings.error?.message ?? "Loading…"}
        </p>
      )}
    </ResponsiveDialog>
  )
}

const FORM_ID = "recording-settings-form"

function SettingsForm({
  ws,
  saved,
  onDone,
}: {
  ws: string
  saved: RecordingSettings
  onDone: () => void
}) {
  const [enabled, setEnabled] = useState(saved.enabled)
  const [days, setDays] = useState(String(saved.keep_days))
  const [error, setError] = useState<string>()
  const save = useSetRecordingSettings(ws)

  function submit(e: FormEvent) {
    e.preventDefault()
    const keep = Number(days)
    if (!Number.isInteger(keep) || keep < 1 || keep > 3650)
      return setError("Between 1 and 3650 days.")
    save.mutate(
      { enabled, keep_days: keep },
      {
        onSuccess: (s) => {
          toast.success(
            s.enabled ? "New terminals are recorded" : "Recording is off",
          )
          onDone()
        },
        onError: (err) => {
          const fields = fieldErrors(err)
          if (fields.keep_days) setError(fields.keep_days)
          else toast.error(err.message)
        },
      },
    )
  }

  return (
    <form
      id={FORM_ID}
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-5 pb-1"
    >
      <div className="flex items-start gap-3">
        <label
          htmlFor="recording-enabled"
          className="flex min-w-0 flex-1 flex-col gap-0.5"
        >
          <span className="text-body-sm font-medium">Record terminals</span>
          <span className="text-caption text-muted-foreground">
            Saves what each shell prints, never what's typed. Shells already
            open keep going as they started.
          </span>
        </label>
        <Switch
          id="recording-enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>
      <Field
        label="Keep recordings for"
        error={error}
        hint="Older ones are deleted on their own. Days, 1 to 3650."
      >
        {(p) => (
          <div className="flex items-center gap-2">
            <Input
              {...p}
              value={days}
              inputMode="numeric"
              enterKeyHint="done"
              className="w-28"
              onChange={(e) => {
                setDays(e.target.value.replace(/\D/g, ""))
                setError(undefined)
              }}
            />
            <span className="text-body-sm text-muted-foreground">days</span>
          </div>
        )}
      </Field>
      {saved.updated_by_name && saved.updated_at && (
        <p className="text-caption text-ash">
          Last changed by {saved.updated_by_name}, {timeAgo(saved.updated_at)}
        </p>
      )}
      <div className="flex justify-end gap-2 max-md:flex-col-reverse max-md:pt-2">
        <Button
          type="button"
          variant="outline"
          className="max-md:h-11"
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button type="submit" className="max-md:h-11" disabled={save.isPending}>
          Save
        </Button>
      </div>
    </form>
  )
}
