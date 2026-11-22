"use client"

import { Copy, Eye, TriangleAlert } from "lucide-react"
import { createContext, type ReactNode, useContext, useState } from "react"
import { toast } from "sonner"

import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useOpen } from "@/hooks/useOpen"
import { fieldErrors } from "@/lib/api"
import type { Database, PitrRun, PitrStatus } from "@/lib/services"
import { cn } from "@/lib/utils"
import {
  useCancelPitrRestart,
  usePitrBackup,
  usePitrCheck,
  usePitrRemove,
  usePitrRestore,
  usePitrTeardown,
  useResetupPitr,
  useRestartPitr,
  useRevealPitrPassphrase,
} from "../../../api"

// Every layer of the Point in time tab, opened by name.
type Actions = {
  restore: (at?: Date) => void
  restart: () => void
  remove: () => void
  passphrase: () => void
  teardown: (copy: PitrRun) => void
  backup: (type: "full" | "diff" | "incr") => void
  check: () => void
  resetup: () => void
  cancelRestart: () => void
  busy: boolean
}

const Ctx = createContext<Actions | null>(null)

export function usePitrActions() {
  const a = useContext(Ctx)
  if (!a) throw new Error("usePitrActions outside PitrActionsProvider")
  return a
}

export function PitrActionsProvider({
  database: d,
  status,
  children,
}: {
  database: Database
  status: PitrStatus
  children: ReactNode
}) {
  const { track } = useJobActions()
  const [restoreOpen, setRestoreOpen] = useOpen("pitr-restore")
  const [restoreAt, setRestoreAt] = useState<Date | undefined>()
  const [restartOpen, setRestartOpen] = useOpen("pitr-restart")
  const [removeOpen, setRemoveOpen] = useOpen("pitr-remove")
  const [passOpen, setPassOpen] = useOpen("pitr-passphrase")
  const [copy, setCopy] = useState<PitrRun | null>(null)
  const [copyOpen, setCopyOpen] = useOpen("pitr-teardown")

  const backup = usePitrBackup(d.id)
  const check = usePitrCheck(d.id)
  const resetup = useResetupPitr(d.id)
  const cancelRestart = useCancelPitrRestart(d.id)
  const teardown = usePitrTeardown(d.id)
  const busy = !!status.active

  const job = {
    onSuccess: track,
    onError: (e: Error) => toast.error(e.message),
  }

  const value: Actions = {
    busy,
    restore: (at) => {
      setRestoreAt(at)
      setRestoreOpen(true)
    },
    restart: () => setRestartOpen(true),
    remove: () => setRemoveOpen(true),
    passphrase: () => setPassOpen(true),
    teardown: (c) => {
      setCopy(c)
      setCopyOpen(true)
    },
    backup: (type) => backup.mutate(type, job),
    check: () => check.mutate(undefined, job),
    resetup: () =>
      resetup.mutate(false, {
        onSuccess: (out) => out.job && track(out.job),
        onError: (e) => toast.error(e.message),
      }),
    cancelRestart: () =>
      cancelRestart.mutate(undefined, {
        onSuccess: () => toast.success("The restart is called off"),
        onError: (e) => toast.error(e.message),
      }),
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      <RestoreLayer
        key={
          restoreOpen ? `open-${restoreAt?.getTime() ?? "latest"}` : "closed"
        }
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        database={d}
        status={status}
        initial={restoreAt}
      />
      <RestartLayer
        key={restartOpen ? "open" : "closed"}
        open={restartOpen}
        onOpenChange={setRestartOpen}
        database={d}
        status={status}
      />
      <RemoveLayer
        key={removeOpen ? "open" : "closed"}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        database={d}
      />
      <PassphraseLayer
        open={passOpen}
        onOpenChange={setPassOpen}
        database={d}
      />
      <ConfirmDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        title="Take this copy down?"
        description={
          copy
            ? `PostgreSQL on port ${copy.restore_port} stops and ${copy.restore_dir} is deleted from the server. Anything you changed in the copy goes with it.`
            : undefined
        }
        confirmLabel="Take it down"
        destructive
        pending={teardown.isPending}
        onConfirm={() =>
          copy &&
          teardown.mutate(copy.id, {
            onSuccess: (j) => {
              track(j)
              setCopyOpen(false)
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </Ctx.Provider>
  )
}

// <input type="datetime-local"> works in the browser's zone.
const toLocalInput = (t: Date) => {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`
}

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

export const fmtTime = (iso: string | Date) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  })

function RestoreLayer({
  open,
  onOpenChange,
  database: d,
  status,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  database: Database
  status: PitrStatus
  initial?: Date
}) {
  const { track } = useJobActions()
  const restore = usePitrRestore(d.id)
  const from = status.window_from ? new Date(status.window_from) : null
  const [when, setWhen] = useState<"latest" | "time">(
    initial ? "time" : "latest",
  )
  // 15 minutes ago, or the window's start when it's younger than that.
  const [at, setAt] = useState(() =>
    toLocalInput(
      initial ??
        new Date(
          Math.max(Date.now() - 15 * 60_000, (from?.getTime() ?? 0) + 1000),
        ),
    ),
  )
  const [mode, setMode] = useState<"new" | "replace">("new")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<{ at?: string; confirm?: string }>({})
  const atDate = new Date(at)
  const quick = [
    { label: "5 min ago", ms: 5 * 60_000 },
    { label: "15 min ago", ms: 15 * 60_000 },
    { label: "1 hour ago", ms: 3_600_000 },
    { label: "Yesterday, same time", ms: 86_400_000 },
  ].filter((q) => !from || Date.now() - q.ms >= from.getTime())

  function submit() {
    const e: typeof errors = {}
    if (when === "time") {
      if (Number.isNaN(atDate.getTime())) e.at = "Pick a date and time"
      else if (from && atDate < from)
        e.at = `The oldest point is ${fmtTime(from)}`
      else if (atDate.getTime() > Date.now()) e.at = "That's in the future"
    }
    if (mode === "replace" && confirm.trim() !== d.name)
      e.confirm = "Type the name exactly"
    setErrors(e)
    if (Object.keys(e).length) return
    restore.mutate(
      {
        mode,
        ...(when === "time" ? { at: atDate.toISOString() } : {}),
        ...(mode === "replace" ? { confirm: confirm.trim() } : {}),
      },
      {
        onSuccess: (j) => {
          track(j)
          onOpenChange(false)
        },
        onError: (err) => {
          const f = fieldErrors(err)
          setErrors({ at: f.at, confirm: f.confirm })
          if (!f.at && !f.confirm) toast.error(err.message)
        },
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Restore to a point in time"
      description={
        from
          ? `Any second from ${fmtTime(from)} until now.`
          : "There's no backup to start from yet."
      }
      className="sm:max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={mode === "replace" ? "destructive" : "default"}
            disabled={restore.isPending || !from}
            onClick={submit}
          >
            {restore.isPending
              ? "Starting…"
              : mode === "replace"
                ? "Restore over it"
                : "Make the copy"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium">To</span>
          <Segmented
            label="Point"
            value={when}
            onChange={setWhen}
            items={[
              { value: "latest", label: "The newest point" },
              { value: "time", label: "A moment in time" },
            ]}
          />
          {when === "time" && (
            <div className="mt-1 flex flex-col gap-2">
              <Input
                type="datetime-local"
                step={1}
                value={at}
                min={from ? toLocalInput(from) : undefined}
                max={toLocalInput(new Date())}
                onChange={(e) => {
                  setAt(e.target.value)
                  setErrors((x) => ({ ...x, at: undefined }))
                }}
                aria-invalid={!!errors.at}
                className="w-full md:w-72"
              />
              <div className="flex flex-wrap gap-1.5">
                {quick.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() =>
                      setAt(toLocalInput(new Date(Date.now() - q.ms)))
                    }
                    className="h-8 rounded-full border border-border px-3 text-caption text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <p
                className={cn(
                  "text-caption",
                  errors.at ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {errors.at ??
                  `Your time zone (${zone()}). Everything committed up to this moment comes back; nothing after it.`}
              </p>
            </div>
          )}
          {when === "latest" && (
            <p className="text-caption text-muted-foreground">
              As far as the WAL in the storage goes: the moment just before the
              restore starts.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium">Where</span>
          <div className="grid gap-2">
            <ModeCard
              on={mode === "new"}
              onSelect={() => setMode("new")}
              title="A copy beside it (recommended)"
              body={`A second PostgreSQL on ${status.server_name || "the server"}, on its own port, reachable from localhost only. It shows up in Morche as a database: look around, copy what you need back, then take it down. The live one isn't touched.`}
            />
            <ModeCard
              on={mode === "replace"}
              onSelect={() => setMode("replace")}
              title="Over the server's own PostgreSQL"
              body="The whole PostgreSQL (every database on it) stops, goes back to that moment and starts again. Changes after it are left behind (the current point stays in the storage first, so you could come back to it)."
              danger
            />
          </div>
        </div>

        {mode === "replace" && (
          <div className="flex flex-col gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
            <p className="flex gap-2 text-body-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              <span>
                Every app using this PostgreSQL loses it while it restores (a
                big database takes a while), and comes back to older data.
              </span>
            </p>
            <Field label={`Type ${d.name} to confirm`} error={errors.confirm}>
              {(p) => (
                <Input
                  {...p}
                  value={confirm}
                  autoComplete="off"
                  onChange={(e) => {
                    setConfirm(e.target.value)
                    setErrors((x) => ({ ...x, confirm: undefined }))
                  }}
                />
              )}
            </Field>
          </div>
        )}
      </form>
    </ResponsiveDialog>
  )
}

function ModeCard({
  on,
  onSelect,
  title,
  body,
  danger,
}: {
  on: boolean
  onSelect: () => void
  title: string
  body: string
  danger?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 gap-3 rounded-2xl border border-border p-4 text-start transition-colors outline-none hover:bg-subtle focus-visible:ring-3 focus-visible:ring-ring/50",
        on &&
          (danger
            ? "border-destructive bg-destructive/5 hover:bg-destructive/5"
            : "border-primary bg-brand-soft hover:bg-brand-soft"),
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
          on
            ? danger
              ? "border-destructive"
              : "border-primary"
            : "border-mist",
        )}
      >
        {on && (
          <span
            className={cn(
              "size-2 rounded-full",
              danger ? "bg-destructive" : "bg-primary",
            )}
          />
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-body-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-caption text-muted-foreground">
          {body}
        </span>
      </span>
    </button>
  )
}

function RestartLayer({
  open,
  onOpenChange,
  database: d,
  status,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  database: Database
  status: PitrStatus
}) {
  const { track } = useJobActions()
  const restart = useRestartPitr(d.id)
  const [when, setWhen] = useState<"now" | "later">("now")
  const tonight = new Date()
  tonight.setHours(3, 0, 0, 0)
  if (tonight.getTime() < Date.now()) tonight.setDate(tonight.getDate() + 1)
  const [at, setAt] = useState(toLocalInput(tonight).slice(0, 16))
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string>()

  function submit() {
    if (confirm.trim() !== d.name) {
      setError("Type the name exactly")
      return
    }
    const later = when === "later" ? new Date(at) : undefined
    if (
      later &&
      (Number.isNaN(later.getTime()) || later.getTime() < Date.now())
    ) {
      setError(undefined)
      toast.error("Pick a time in the future")
      return
    }
    restart.mutate(
      {
        confirm: confirm.trim(),
        ...(later ? { at: later.toISOString() } : {}),
      },
      {
        onSuccess: (out) => {
          if (out.job) track(out.job)
          else toast.success(`PostgreSQL restarts at ${fmtTime(at)}`)
          onOpenChange(false)
        },
        onError: (e) => {
          const f = fieldErrors(e)
          setError(f.confirm)
          if (!f.confirm) toast.error(e.message)
        },
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Restart PostgreSQL"
      description={`archive_mode only takes effect after a restart of the PostgreSQL on ${status.server_name || "the server"}. Every database on it is unavailable for a few seconds; open connections drop.`}
      className="sm:max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={restart.isPending} onClick={submit}>
            {restart.isPending
              ? "Starting…"
              : when === "now"
                ? "Restart now"
                : "Set the time"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Segmented
          label="When"
          value={when}
          onChange={setWhen}
          items={[
            { value: "now", label: "Now" },
            { value: "later", label: "At a quiet time" },
          ]}
        />
        {when === "later" && (
          <Field
            label="At"
            hint={`Your time zone (${zone()}). Morche restarts it then, and takes the first backup right after.`}
          >
            {(p) => (
              <Input
                {...p}
                type="datetime-local"
                value={at}
                onChange={(e) => setAt(e.target.value)}
                className="md:w-64"
              />
            )}
          </Field>
        )}
        <Field label={`Type ${d.name} to confirm`} error={error}>
          {(p) => (
            <Input
              {...p}
              value={confirm}
              autoComplete="off"
              onChange={(e) => {
                setConfirm(e.target.value)
                setError(undefined)
              }}
            />
          )}
        </Field>
      </form>
    </ResponsiveDialog>
  )
}

function RemoveLayer({
  open,
  onOpenChange,
  database: d,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  database: Database
}) {
  const { track } = useJobActions()
  const remove = usePitrRemove(d.id)
  const [purge, setPurge] = useState(false)
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string>()
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Turn continuous backup off"
      description="PostgreSQL stops sending its WAL to the storage and scheduled backups stop. archive_mode goes back to off at its next restart (nothing breaks until then)."
      className="sm:max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => {
              if (confirm.trim() !== d.name) {
                setError("Type the name exactly")
                return
              }
              remove.mutate(
                { confirm: confirm.trim(), purge },
                {
                  onSuccess: (j) => {
                    track(j)
                    onOpenChange(false)
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }}
          >
            {remove.isPending ? "Starting…" : "Turn it off"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex min-h-11 items-start justify-between gap-4">
          <label htmlFor="pitr-purge">
            <span className="block text-body-sm font-medium">
              Delete the backups too
            </span>
            <span className="block text-caption text-muted-foreground">
              Off keeps them in the storage: pgBackRest can still restore them
              by hand. On deletes every backup and WAL file of this database.
            </span>
          </label>
          <Switch id="pitr-purge" checked={purge} onCheckedChange={setPurge} />
        </div>
        <Field label={`Type ${d.name} to confirm`} error={error}>
          {(p) => (
            <Input
              {...p}
              value={confirm}
              autoComplete="off"
              onChange={(e) => {
                setConfirm(e.target.value)
                setError(undefined)
              }}
            />
          )}
        </Field>
      </div>
    </ResponsiveDialog>
  )
}

function PassphraseLayer({
  open,
  onOpenChange,
  database: d,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  database: Database
}) {
  const reveal = useRevealPitrPassphrase(d.id)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reveal.reset()
        onOpenChange(v)
      }}
      title="Encryption passphrase"
      description="The backups in the storage can't be read without it. Keep a copy somewhere safe, away from Morche: if Morche's own server is lost, you'll need it to restore by hand."
      className="sm:max-w-lg"
      footer={
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      {reveal.data ? (
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 rounded-lg bg-muted px-3 py-2.5 font-mono text-caption break-all">
            {reveal.data.passphrase}
          </code>
          <Button
            variant="outline"
            size="icon"
            aria-label="Copy"
            onClick={() =>
              navigator.clipboard
                ?.writeText(reveal.data.passphrase)
                .then(() => toast.success("Copied"))
            }
          >
            <Copy />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          disabled={reveal.isPending}
          onClick={() =>
            reveal.mutate(undefined, { onError: (e) => toast.error(e.message) })
          }
        >
          <Eye />
          {reveal.isPending ? "Reading…" : "Show the passphrase"}
        </Button>
      )}
    </ResponsiveDialog>
  )
}
