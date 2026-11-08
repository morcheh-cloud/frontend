"use client"

import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"

import { afterClose } from "@/app/(panel)/servers/[id]/components/parts"
import { Field } from "@/components/field"
import type { BucketHooks, BucketTab } from "@/components/files/source"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useIsPhone } from "@/hooks/useIsPhone"
import { useOpen } from "@/hooks/useOpen"
import { api, fieldErrors } from "@/lib/api"
import type { Storage } from "@/lib/services"
import { bucketKeys, useCreateBucket, useEmptyBucket } from "../../../api"
import { useStorageCan } from "../../../components/permissions"
import { BucketSettingsLayer } from "./bucket-settings"
import type { BucketCan } from "./parts"
import { plural } from "./parts"

type BucketActions = BucketHooks & {
  can: BucketCan
}

const Context = createContext<BucketActions | null>(null)

// Bucket hooks for this storage, or null when it isn't S3.
export function useBucketActions() {
  return useContext(Context)
}

// Every bucket layer of an S3 storage page: settings, new, empty, delete.
export function BucketActionsProvider({
  storage: s,
  children,
}: {
  storage: Storage
  children: ReactNode
}) {
  if (s.protocol !== "s3") return children
  return <Provider storage={s}>{children}</Provider>
}

function Provider({
  storage: s,
  children,
}: {
  storage: Storage
  children: ReactNode
}) {
  const phone = useIsPhone() === true
  const level = useStorageCan()
  const edit = !s.read_only && level(s, "engineer")
  const own = !s.read_only && level(s, "owner")
  const can = useMemo(() => ({ edit, own }), [edit, own])

  const [settingsOpen, setSettingsOpen] = useOpen("bucket-settings")
  const [createOpen, setCreateOpen] = useOpen("bucket-create")
  const [emptyOpen, setEmptyOpen] = useOpen("bucket-empty")
  const [deleteOpen, setDeleteOpen] = useOpen("bucket-delete")
  const [bucket, setBucket] = useState("")
  const [tab, setTab] = useState<BucketTab>("overview")
  const [target, setTarget] = useState("")
  // Bumped per open so each dialog starts blank.
  const [nonce, setNonce] = useState(0)

  // The hooks are handed to the file source: keep them stable.
  const open = useRef({ setSettingsOpen, setCreateOpen, setEmptyOpen })
  open.current = { setSettingsOpen, setCreateOpen, setEmptyOpen }

  const fixed = s.bucket !== ""
  const creatable = edit && !fixed && s.capabilities.buckets
  const hooks = useMemo<BucketActions>(
    () => ({
      can,
      settings: (name, t = "overview") => {
        setBucket(name)
        setTab(t)
        open.current.setSettingsOpen(true)
      },
      ...(edit && {
        empty: (name: string) => {
          setTarget(name)
          setNonce((n) => n + 1)
          open.current.setEmptyOpen(true)
        },
      }),
      ...(creatable && {
        create: () => {
          setNonce((n) => n + 1)
          open.current.setCreateOpen(true)
        },
      }),
    }),
    [can, edit, creatable],
  )

  // From inside the settings: a phone closes its sheet first.
  const fromSettings = (fn: () => void) =>
    phone ? afterClose(setSettingsOpen, fn) : fn()

  return (
    <Context.Provider value={hooks}>
      {children}
      {bucket && (
        <BucketSettingsLayer
          storage={s}
          bucket={bucket}
          tab={tab}
          onTab={setTab}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          phone={phone}
          can={can}
          onEmpty={
            hooks.empty && (() => fromSettings(() => hooks.empty?.(bucket)))
          }
          onDelete={
            edit && !fixed
              ? () =>
                  fromSettings(() => {
                    setTarget(bucket)
                    setNonce((n) => n + 1)
                    setDeleteOpen(true)
                  })
              : undefined
          }
        />
      )}
      {creatable && (
        <CreateBucketDialog
          key={`create-${nonce}`}
          storage={s}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(name) => hooks.settings(name)}
        />
      )}
      {edit && (
        <TypeToConfirm
          key={`empty-${nonce}`}
          storage={s}
          bucket={target}
          kind="empty"
          open={emptyOpen}
          onOpenChange={setEmptyOpen}
        />
      )}
      {edit && !fixed && (
        <TypeToConfirm
          key={`delete-${nonce}`}
          storage={s}
          bucket={target}
          kind="delete"
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDone={() => setSettingsOpen(false)}
        />
      )}
    </Context.Provider>
  )
}

// S3's naming rules, said plainly.
export function bucketNameProblem(name: string) {
  if (name.length < 3) return "At least 3 characters."
  if (name.length > 63) return "At most 63 characters."
  if (!/^[a-z0-9.-]+$/.test(name))
    return "Only lowercase letters, digits, dots and hyphens."
  if (!/^[a-z0-9]/.test(name) || !/[a-z0-9]$/.test(name))
    return "Start and end with a letter or a digit."
  if (name.includes("..")) return "No two dots in a row."
  if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) return "Can't look like an IP address."
  return null
}

function CreateBucketDialog({
  storage: s,
  open,
  onOpenChange,
  onCreated,
}: {
  storage: Storage
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (name: string) => void
}) {
  const create = useCreateBucket(s.id)
  const [name, setName] = useState("")
  const [region, setRegion] = useState("")
  const [versioning, setVersioning] = useState(false)
  const [lock, setLock] = useState(false)
  const [touched, setTouched] = useState(false)
  const errors = create.error ? fieldErrors(create.error) : {}
  const problem = bucketNameProblem(name)

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    setTouched(true)
    if (problem) return
    create.mutate(
      {
        name,
        ...(region.trim() && { region: region.trim() }),
        versioning: versioning || lock,
        object_lock: lock,
      },
      {
        onSuccess: (b) => {
          toast.success(`Bucket ${b.name} created`)
          afterClose(onOpenChange, () => onCreated(b.name))
        },
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New bucket"
      description="A bucket is a top-level container with its own access, versioning and rules."
      footer={
        <div className="flex w-full flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button
            variant="ghost"
            size="lg"
            className="md:h-9"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="lg"
            className="md:h-9"
            disabled={create.isPending}
            onClick={() => submit()}
          >
            {create.isPending && <Loader2 className="animate-spin" />}
            Create bucket
          </Button>
        </div>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label="Name"
          hint="Lowercase letters, digits, dots and hyphens; 3–63 characters. Unique across the whole provider on AWS."
          error={
            (touched && name && problem) ||
            errors.name ||
            (create.error && !errors.name && !errors.region
              ? create.error.message
              : undefined)
          }
        >
          {(p) => (
            <Input
              {...p}
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase())}
              onBlur={() => setTouched(true)}
              placeholder="team-backups"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="done"
              className="font-mono max-md:text-base"
            />
          )}
        </Field>
        <Field
          label="Region"
          hint={`Empty = the storage's (${s.region || "the provider's default"}).`}
          error={errors.region}
        >
          {(p) => (
            <Input
              {...p}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={s.region || "us-east-1"}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="font-mono max-md:text-base"
            />
          )}
        </Field>
        <Toggle
          label="Versioning"
          hint="Keep old versions on overwrite and delete."
          checked={versioning || lock}
          disabled={lock}
          onChange={setVersioning}
        />
        <Toggle
          label="Object lock"
          hint="Lets objects be protected from deletion for a set time. Only possible now: it can't be turned on later. Turns versioning on."
          checked={lock}
          onChange={setLock}
        />
        <button type="submit" hidden />
      </form>
    </ResponsiveDialog>
  )
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  disabled?: boolean
  onChange: (on: boolean) => void
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the Switch is the control
    <label className="flex min-h-11 items-center justify-between gap-3 text-body-sm">
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-muted-foreground">{hint}</span>
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </label>
  )
}

// Empty or delete a bucket: type its name to go on.
function TypeToConfirm({
  storage: s,
  bucket,
  kind,
  open,
  onOpenChange,
  onDone,
}: {
  storage: Storage
  bucket: string
  kind: "empty" | "delete"
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}) {
  const queryClient = useQueryClient()
  const empty = useEmptyBucket(s.id)
  const [typed, setTyped] = useState("")
  const [removing, setRemoving] = useState(false)
  const pending = empty.isPending || removing
  const ready = typed === bucket && !pending

  const go = () => {
    if (!ready) return
    if (kind === "empty") {
      empty.mutate(bucket, {
        onSuccess: (r) => {
          toast.success(
            r.affected
              ? `Deleted ${plural(r.affected, "object")} from ${bucket}`
              : `${bucket} was already empty`,
          )
          onOpenChange(false)
        },
        onError: (err) => toast.error(err.message),
      })
      return
    }
    setRemoving(true)
    api.storageFiles
      .storageDelete(s.id, { paths: [`/${bucket}`] })
      .then(() => {
        toast.success(`Bucket ${bucket} deleted`)
        queryClient.removeQueries({ queryKey: bucketKeys.one(s.id, bucket) })
        onOpenChange(false)
        onDone?.()
      })
      .catch((err: Error) => toast.error(err.message))
      .finally(() => {
        setRemoving(false)
        queryClient.invalidateQueries({ queryKey: ["storage-files", s.id] })
      })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={kind === "empty" ? `Empty ${bucket}?` : `Delete ${bucket}?`}
      description={
        kind === "empty"
          ? "Every object in it is deleted, old versions included. The bucket and its settings stay. This can't be undone."
          : "Every object in it is deleted, then the bucket itself. This can't be undone."
      }
      footer={
        <div className="flex w-full flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button
            variant="ghost"
            size="lg"
            className="md:h-9"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="md:h-9"
            disabled={!ready}
            onClick={go}
          >
            {pending && <Loader2 className="animate-spin" />}
            {kind === "empty" ? "Empty bucket" : "Delete bucket"}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          go()
        }}
      >
        <Field label={`Type ${bucket} to confirm`}>
          {(p) => (
            <Input
              {...p}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="font-mono max-md:text-base"
            />
          )}
        </Field>
      </form>
    </ResponsiveDialog>
  )
}
