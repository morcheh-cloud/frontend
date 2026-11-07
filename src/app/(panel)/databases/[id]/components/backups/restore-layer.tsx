"use client"

import { TriangleAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Choice } from "@/app/(panel)/cronjobs/components/schedule-field"
import { Segmented } from "@/app/(panel)/servers/[id]/components/parts"
import { useServers } from "@/app/(panel)/servers/api"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { Field } from "@/components/field"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { SecretInput } from "@/components/secret-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useIsPhone } from "@/hooks/useIsPhone"
import { fieldErrors } from "@/lib/api"
import type { Backup, LocalTools, RestoreBody } from "@/lib/services"
import { useBackupOptions, useRestoreBackup } from "../../../api"
import { useDashboard } from "../parts"
import { useBackupCan } from "./backup-actions"
import { LOCAL_RUNNER, when } from "./meta"

type Mode = RestoreBody["mode"]
type Errors = Partial<
  Record<"name" | "confirm" | "safety" | "runner" | "login", string>
>

const errorKey: Record<string, keyof Errors> = {
  target_name: "name",
  confirm: "confirm",
  safety_backup: "safety",
  runner_server_id: "runner",
  username: "login",
  password: "login",
}

function localHint(local?: LocalTools) {
  if (local && !local.supported) return local.note
  if (local?.missing.length) {
    return `Morcheh's own machine lacks ${local.missing.join(", ")}. Install them there, or choose a server.`
  }
  return "Morcheh's own machine loads it, the same way it reaches the database to watch it."
}

// Formats that name their database inside the file: they go back only there.
function fixedName(b: Backup) {
  return (
    b.format === "mysql_sql" ||
    (!!b.parent_id && ["mysql_db", "mysql_binlog"].includes(b.format))
  )
}

// Load a backup back into the database server: over a database that exists
// (its name typed again, optionally backed up first) or as a new one.
export function RestoreLayer({
  backup: b,
  open,
  onOpenChange,
}: {
  backup?: Backup
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Restore backup"
      description={
        b
          ? `${b.target || "Everything"} · ${when.format(new Date(b.created_at))}`
          : undefined
      }
      className="sm:max-w-lg"
    >
      {b && <RestoreForm backup={b} onDone={() => onOpenChange(false)} />}
    </ResponsiveDialog>
  )
}

function RestoreForm({
  backup: b,
  onDone,
}: {
  backup: Backup
  onDone: () => void
}) {
  const { database: d } = useDashboard()
  const phone = useIsPhone() ?? false
  const access = useAccess()
  const can = useBackupCan(b)
  const { track } = useJobActions()
  const restore = useRestoreBackup()
  const options = useBackupOptions(d.id, true)
  const direct = !d.server_id
  const servers = useServers({ limit: 500 })

  const names = options.data?.databases ?? []
  const listed = options.isSuccess && !options.data.databases_error
  const fixed = fixedName(b)

  const [name, setName] = useState(b.target)
  const exists = names.includes(name.trim())
  const [mode, setMode] = useState<Mode>("replace")
  // Once the list is in, an untouched mode follows whether the name exists.
  const [modeTouched, setModeTouched] = useState(false)
  const effectiveMode: Mode =
    modeTouched || !listed ? mode : exists ? "replace" : "new"
  const [confirm, setConfirm] = useState("")
  const [safety, setSafety] = useState(true)
  const [storage, setStorage] = useState(can.download[0]?.storage_id ?? "")
  const [runner, setRunner] = useState("")
  const [ownLogin, setOwnLogin] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<Errors>({})

  const replace = effectiveMode === "replace"
  const runners = (servers.data?.items ?? [])
    .filter((s) =>
      atLeast(access.serverLevel(s.id, s.workspace_id), "engineer"),
    )
    .map((s) => ({ value: s.id, label: s.name }))

  function submit() {
    const target = name.trim()
    const e: Errors = {}
    if (!target) e.name = "Name the database"
    if (replace && confirm !== target) e.confirm = "Type the name exactly"
    if (direct && !runner && options.data && !options.data.local.supported) {
      e.runner = "Choose a server"
    }
    if (ownLogin && !username.trim()) e.login = "Enter the login"
    setErrors(e)
    if (Object.keys(e).length) return
    const body: RestoreBody = {
      target_name: target,
      mode: effectiveMode,
      ...(replace ? { confirm, safety_backup: safety } : {}),
      ...(can.download.length > 1 && storage ? { storage_id: storage } : {}),
      ...(direct && runner ? { runner_server_id: runner } : {}),
      ...(ownLogin ? { username: username.trim(), password } : {}),
    }
    restore.mutate(
      { id: b.id, body },
      {
        onSuccess: (job) => {
          track(job)
          onDone()
        },
        onError: (err) => {
          const mapped: Errors = {}
          for (const [k, v] of Object.entries(fieldErrors(err))) {
            const key = errorKey[k]
            if (key && !mapped[key]) mapped[key] = v
          }
          setErrors(mapped)
          toast.error(Object.values(mapped)[0] ?? err.message)
        },
      },
    )
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {b.kind === "incremental" && (
        <p className="rounded-lg bg-subtle px-3 py-2.5 text-caption text-muted-foreground">
          An incremental backup: the full backup it builds on is loaded first,
          then every step up to this one.
        </p>
      )}

      <Field
        label="Restore into"
        error={errors.name}
        hint={
          fixed
            ? `This file names its database, so it can only go back to ${b.target}.`
            : listed
              ? exists
                ? "A database with this name exists."
                : "No database has this name yet."
              : undefined
        }
      >
        {(p) => (
          <Input
            {...p}
            value={name}
            readOnly={fixed}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono"
            onChange={(e) => {
              setName(e.target.value)
              setConfirm("")
              setErrors((x) => ({ ...x, name: undefined }))
            }}
          />
        )}
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-body-sm font-medium">How</span>
        <Segmented
          label="How"
          items={[
            { value: "replace", label: "Replace it" },
            { value: "new", label: "As a new database" },
          ]}
          value={effectiveMode}
          onChange={(m) => {
            setModeTouched(true)
            setMode(m)
          }}
        />
        <p className="text-caption text-muted-foreground">
          {replace
            ? "What's in the database now is overwritten by the backup."
            : "Creates the database, then loads the backup into it. Nothing that exists is touched."}
        </p>
      </div>

      {replace && (
        <>
          <div className="flex gap-2.5 rounded-lg border border-border px-3 py-2.5 text-body-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <p>
              Anything written to <span className="font-mono">{name}</span>{" "}
              since this backup is lost. Apps using it may see errors while it
              loads.
            </p>
          </div>
          <div className="flex min-h-11 items-start justify-between gap-4">
            <label htmlFor="restore-safety">
              <span className="block text-body-sm font-medium">
                Back it up first
              </span>
              <span className="block text-caption text-muted-foreground">
                A full backup of the database as it is now, to the same storage,
                so you can go back.
              </span>
              {errors.safety && (
                <span className="block text-caption text-destructive">
                  {errors.safety}
                </span>
              )}
            </label>
            <Switch
              id="restore-safety"
              checked={safety}
              onCheckedChange={setSafety}
            />
          </div>
        </>
      )}

      {can.download.length > 1 && (
        <Field label="Read it from">
          {(p) => (
            <Choice
              id={p.id}
              phone={phone}
              value={storage}
              onChange={setStorage}
              items={can.download.map((c) => ({
                value: c.storage_id,
                label: c.storage_name,
              }))}
            />
          )}
        </Field>
      )}

      {direct && (
        <Field
          label="Run it from"
          error={errors.runner}
          hint={
            runner === "local" || (!runner && !b.plan_id)
              ? localHint(options.data?.local)
              : "The server that loads it: it needs the database's tools and a way to reach it."
          }
        >
          {(p) => (
            <Choice
              id={p.id}
              phone={phone}
              value={runner}
              onChange={setRunner}
              items={[
                ...(b.plan_id
                  ? [{ value: "", label: "Where the plan runs" }]
                  : []),
                ...(options.data?.local.supported === false
                  ? b.plan_id
                    ? []
                    : [{ value: "", label: "Choose a server" }]
                  : [{ value: b.plan_id ? "local" : "", label: LOCAL_RUNNER }]),
                ...runners,
              ]}
            />
          )}
        </Field>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex min-h-11 items-start justify-between gap-4">
          <label htmlFor="restore-login">
            <span className="block text-body-sm font-medium">
              Use another login
            </span>
            <span className="block text-caption text-muted-foreground">
              Off = the plan's login, or the one Morcheh monitors with. It needs
              the right to create and overwrite databases.
            </span>
          </label>
          <Switch
            id="restore-login"
            checked={ownLogin}
            onCheckedChange={setOwnLogin}
          />
        </div>
        {ownLogin && (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Username" error={errors.login}>
              {(p) => (
                <Input
                  {...p}
                  value={username}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => setUsername(e.target.value)}
                />
              )}
            </Field>
            <Field label="Password">
              {(p) => (
                <SecretInput
                  {...p}
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
          </div>
        )}
      </div>

      {replace && (
        <Field
          label={`Type ${name.trim() || "the name"} to confirm`}
          error={errors.confirm}
        >
          {(p) => (
            <Input
              {...p}
              value={confirm}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              className="font-mono"
              onChange={(e) => {
                setConfirm(e.target.value)
                setErrors((x) => ({ ...x, confirm: undefined }))
              }}
            />
          )}
        </Field>
      )}

      <div className="flex gap-2 max-md:flex-col-reverse md:justify-end">
        <Button
          type="submit"
          variant={replace ? "destructive" : "default"}
          className="max-md:h-11"
          disabled={restore.isPending || (replace && confirm !== name.trim())}
        >
          {restore.isPending
            ? "Starting…"
            : replace
              ? `Replace ${name.trim() || "it"}`
              : "Restore"}
        </Button>
      </div>
    </form>
  )
}
