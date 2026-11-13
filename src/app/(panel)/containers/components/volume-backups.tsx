"use client"

import { useQuery } from "@tanstack/react-query"
import {
  ArchiveRestore,
  CircleAlert,
  Download,
  HardDriveUpload,
  Loader2,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { type FormEvent, useId, useState } from "react"
import { toast } from "sonner"

import { Choice } from "@/components/access/choice"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { Field } from "@/components/field"
import { storagesQuery } from "@/components/panel/problems"
import { ConfirmDialog, ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpen } from "@/hooks/useOpen"
import { fieldErrors } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type { DockerVolumeBackup } from "@/lib/services"
import { cn } from "@/lib/utils"
import { newCronjobHref } from "../../cronjobs/components/meta"
import { Segmented } from "../../servers/[id]/components/parts"
import { timeAgo } from "../../servers/components/meta"
import {
  useBackupVolume,
  useDeleteVolumeBackup,
  useDockerFleet,
  useEffectiveDockerSettings,
  useRestoreVolumeBackup,
  useVolumeBackups,
} from "../api"
import { Tick } from "./dialogs"
import { Dot, shortId, type Tone } from "./meta"
import { Layer, Quiet } from "./parts"
import type { DockerCan } from "./permissions"

export const VOLUME_FOLDER = "/backups/docker-volumes"
const NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/
const text = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

type Open = { open: boolean; onOpenChange: (open: boolean) => void }

export function useFleetServer(server: string) {
  const fleet = useDockerFleet()
  return fleet.data?.servers.find((s) => s.server_id === server)
}

// The storages this person may write a copy into: the server's workspace,
// not read-only, Engineer on the storage (the backend's rule).
export function useBackupTargets(server: string) {
  const ws = useFleetServer(server)?.workspace_id
  const { storageLevel } = useAccess()
  const list = useQuery(storagesQuery)
  const items = (list.data?.items ?? []).filter(
    (s) =>
      (!ws || s.workspace_id === ws) &&
      !s.read_only &&
      atLeast(storageLevel(s.id, s.workspace_id), "engineer"),
  )
  return { items, pending: list.isPending }
}

const backupState: Record<
  DockerVolumeBackup["state"],
  { label: string; tone: Tone }
> = {
  running: { label: "Copying", tone: "brand" },
  stored: { label: "Stored", tone: "success" },
  failed: { label: "Failed", tone: "destructive" },
}

// --- Back up -----------------------------------------------------------------

// Packs the volume (tar.gz, as root) into a storage, as a background task.
export function BackupVolumeDialog({
  server,
  volume,
  users,
  open,
  onOpenChange,
}: Open & { server: string; volume: string; users: number }) {
  const form = useId()
  const targets = useBackupTargets(server)
  // The workspace's (or this environment's) backup defaults fill the form
  // until something is typed or picked.
  const defaults = useEffectiveDockerSettings(server).data
  const [storage, setStorage] = useState("")
  const [typedFolder, setFolder] = useState<string>()
  const [pickedStop, setStop] = useState<boolean>()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const backup = useBackupVolume()
  const preferred = targets.items.find(
    (s) => s.id === defaults?.backup_storage_id,
  )?.id
  const picked = storage || preferred || targets.items[0]?.id || ""
  const folder = typedFolder ?? (defaults?.backup_folder || VOLUME_FOLDER)
  const stop = pickedStop ?? !!defaults?.backup_stop
  const keep = defaults?.backup_keep ?? 0
  const serverName = useFleetServer(server)?.name
  const name = shortName(volume)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!picked) return setErrors({ storage_id: "Pick a storage." })
    const f = folder.trim()
    if (f && !f.startsWith("/"))
      return setErrors({ folder: "Start the folder with /." })
    backup.mutate(
      { server, volume, storage: picked, folder: f, stop },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => {
          const fields = fieldErrors(err)
          if (Object.keys(fields).length > 0) setErrors(fields)
          else toast.error(err.message)
        },
      },
    )
  }

  const empty = !targets.pending && targets.items.length === 0
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Back up ${name}`}
      description="Its files are packed into one .tar.gz on a storage. The copy runs as a background task."
      className="sm:max-w-lg"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={form}
            disabled={backup.isPending || empty}
            className="max-md:h-11"
          >
            {backup.isPending && <Loader2 className="animate-spin" />}
            Back up
          </Button>
        </div>
      }
    >
      {empty ? (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-border p-4">
          <p className="text-body-sm font-medium">No storage to write to</p>
          <p className="text-body-sm text-muted-foreground">
            Add an S3, SFTP, FTP or WebDAV storage in this workspace (or get
            Engineer access to one) and come back.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="max-md:h-11"
            nativeButton={false}
            render={<Link href="/storage?tab=storages" />}
          >
            Open Storage
          </Button>
        </div>
      ) : (
        <form id={form} onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Storage" error={errors.storage_id}>
            {(p) =>
              targets.pending ? (
                <Skeleton className="h-9 rounded-lg max-md:h-11" />
              ) : (
                <Choice
                  id={p.id}
                  label="Storage"
                  value={picked}
                  items={targets.items.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                  onChange={setStorage}
                />
              )
            }
          </Field>
          <Field
            label="Folder on the storage"
            hint={
              <>
                The file lands in{" "}
                <span className="font-mono">
                  {(folder.trim() || VOLUME_FOLDER).replace(/\/+$/, "")}
                  /&lt;server&gt;/{name}/
                </span>
              </>
            }
            error={errors.folder}
          >
            {(p) => (
              <Input
                {...p}
                {...text}
                value={folder}
                placeholder={VOLUME_FOLDER}
                onChange={(e) => setFolder(e.target.value)}
                className="font-mono"
              />
            )}
          </Field>
          <Tick
            checked={stop}
            onChange={setStop}
            label="Stop the containers using it while it's copied"
            hint={
              users > 0
                ? `${users} container${users === 1 ? " uses" : "s use"} it. A database's files are only safe to copy while it's stopped; they start again afterwards.`
                : "No container uses it now, so nothing would be stopped."
            }
          />
          <p className="text-caption text-muted-foreground">
            {keep > 0
              ? `Keeps the newest ${keep} cop${keep === 1 ? "y" : "ies"} of this volume made by hand; older ones are removed (Docker settings). `
              : ""}
            Want this every night?{" "}
            <Link
              href={newCronjobHref({
                action: "docker-volume-backup",
                server,
                serverName,
              })}
              className="text-brand hover:underline"
            >
              Schedule it as a cron job
            </Link>
            {keep > 0 ? "." : ", which also keeps only the newest few."}
          </p>
        </form>
      )}
    </ResponsiveDialog>
  )
}

// --- Restore -----------------------------------------------------------------

type Into = "same" | "other"

export function RestoreVolumeDialog({
  server,
  backup,
  open,
  onOpenChange,
}: Open & { server: string; backup: DockerVolumeBackup }) {
  const form = useId()
  const [into, setInto] = useState<Into>("same")
  const [other, setOther] = useState(`${backup.volume}-restored`)
  const [confirm, setConfirm] = useState("")
  const [stop, setStop] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const restore = useRestoreVolumeBackup()
  const name = shortName(backup.volume)
  const same = into === "same"
  const ready = same
    ? confirm.trim() === backup.volume
    : NAME.test(other.trim())

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!same && !NAME.test(other.trim()))
      return setErrors({
        volume: "Letters, digits, _ . - only, starting with a letter or digit.",
      })
    if (!ready) return
    restore.mutate(
      {
        server,
        backup: backup.id,
        volume: same ? "" : other.trim(),
        replace: same,
        stop: same && stop,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => {
          const fields = fieldErrors(err)
          if (Object.keys(fields).length > 0) setErrors(fields)
          else toast.error(err.message)
        },
      },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Restore a copy"
      description={`${name} as it was ${timeAgo(backup.created_at).toLowerCase()}, from ${backup.storage_name}.`}
      className="sm:max-w-lg"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="max-md:h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={form}
            variant={same ? "destructive" : "default"}
            disabled={restore.isPending || !ready}
            className="max-md:h-11"
          >
            {restore.isPending && <Loader2 className="animate-spin" />}
            {same ? "Replace and restore" : "Restore"}
          </Button>
        </div>
      }
    >
      <form id={form} onSubmit={submit} className="flex flex-col gap-4">
        <Segmented
          label="Restore into"
          value={into}
          onChange={(v) => {
            setInto(v as Into)
            setErrors({})
          }}
          items={[
            { value: "same", label: "The same volume" },
            { value: "other", label: "Another volume" },
          ]}
        />
        {same ? (
          <>
            <div className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-body-sm">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p>
                What's in <span className="font-mono">{name}</span> now is
                deleted first, then the copy is written in. Back it up first if
                you may want it.
              </p>
            </div>
            <Tick
              checked={stop}
              onChange={setStop}
              label="Stop the containers using it meanwhile"
              hint="Recommended: an app writing while its files are swapped can break them. They start again afterwards."
            />
            <Field
              label={`Type ${backup.volume} to go on`}
              error={errors.volume}
            >
              {(p) => (
                <Input
                  {...p}
                  {...text}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="font-mono"
                />
              )}
            </Field>
          </>
        ) : (
          <Field
            label="Volume name"
            hint="Made when missing; an existing one must be empty. Nothing else changes, so you can look through it first."
            error={errors.volume}
          >
            {(p) => (
              <Input
                {...p}
                {...text}
                value={other}
                onChange={(e) => setOther(e.target.value)}
                className="font-mono"
              />
            )}
          </Field>
        )}
      </form>
    </ResponsiveDialog>
  )
}

// --- List ----------------------------------------------------------------------

function shortName(volume: string) {
  return /^[0-9a-f]{64}$/.test(volume) ? shortId(volume) : volume
}

// A volume's copies (or every volume's, without `volume`), newest first,
// each with Restore (server Owner) and Delete (Engineer).
export function VolumeBackups({
  server,
  volume,
  can,
  enabled = true,
  onBackup,
}: {
  server: string
  volume?: string
  can: DockerCan
  enabled?: boolean
  onBackup?: () => void
}) {
  const query = useVolumeBackups(server, volume, enabled)
  const [restoring, setRestoring] = useState<DockerVolumeBackup | null>(null)
  const [restoreOpen, setRestoreOpen] = useOpen("docker-volume-restore")
  const [removing, setRemoving] = useState<DockerVolumeBackup | null>(null)
  const [removeOpen, setRemoveOpen] = useOpen("docker-volume-backup-remove")
  const remove = useDeleteVolumeBackup()
  const owner = atLeast(can.level, "owner")

  if (query.isPending) return <Skeleton className="h-16 rounded-xl" />
  if (query.isError)
    return <Quiet>Couldn't read the copies: {query.error.message}</Quiet>
  const items = query.data.items
  if (items.length === 0)
    return (
      <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-border p-4">
        <p className="text-body-sm text-muted-foreground">
          No copies yet. Back it up to a storage, or schedule it from Cron jobs.
        </p>
        {onBackup && can.manage && (
          <Button
            variant="outline"
            size="sm"
            className="max-md:h-11"
            onClick={onBackup}
          >
            <HardDriveUpload />
            Back up now
          </Button>
        )}
      </div>
    )

  return (
    <>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {items.map((b) => {
          const st = backupState[b.state]
          const gone = !b.storage_id
          return (
            <li
              key={b.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="flex items-center gap-2 text-body-sm">
                  <Dot tone={st.tone} />
                  {!volume && (
                    <span className="truncate font-mono font-medium">
                      {shortName(b.volume)}
                    </span>
                  )}
                  <span className={cn(volume && "font-medium")}>
                    {timeAgo(b.created_at)}
                  </span>
                  {b.state !== "stored" && (
                    <span
                      className={cn(
                        "text-caption",
                        b.state === "failed"
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {st.label}
                      {b.state === "running" && "…"}
                    </span>
                  )}
                </p>
                <p className="truncate text-caption text-muted-foreground">
                  {b.state === "stored" && `${formatSize(b.size)} · `}
                  {gone ? `${b.storage_name} (removed)` : b.storage_name}
                  {b.by && ` · ${b.by}`}
                  {b.schedule_id && " · scheduled"}
                  {b.stopped > 0 &&
                    ` · stopped ${b.stopped} container${b.stopped === 1 ? "" : "s"}`}
                </p>
                {b.error && (
                  <p className="text-caption text-destructive">{b.error}</p>
                )}
                {b.note && !b.error && (
                  <p className="text-caption text-ash">{b.note}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {b.state === "stored" && !gone && b.storage_id && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="max-md:size-11"
                    aria-label="Open its folder on the storage"
                    title="Open its folder on the storage"
                    nativeButton={false}
                    render={
                      <Link
                        href={`/storage/${b.storage_id}?path=${encodeURIComponent(b.path.replace(/\/[^/]*$/, "") || "/")}`}
                      />
                    }
                  >
                    <Download />
                  </Button>
                )}
                {owner && b.state === "stored" && !gone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="max-md:h-11"
                    onClick={() => {
                      setRestoring(b)
                      setRestoreOpen(true)
                    }}
                  >
                    <ArchiveRestore />
                    Restore
                  </Button>
                )}
                {can.manage && b.state !== "running" && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive max-md:size-11"
                    aria-label="Delete this copy"
                    title="Delete this copy"
                    onClick={() => {
                      setRemoving(b)
                      setRemoveOpen(true)
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {restoring && (
        <RestoreVolumeDialog
          key={restoring.id}
          server={server}
          backup={restoring}
          open={restoreOpen}
          onOpenChange={setRestoreOpen}
        />
      )}
      {removing && (
        <ConfirmDialog
          open={removeOpen}
          onOpenChange={setRemoveOpen}
          title="Delete this copy?"
          description={
            removing.state === "stored" && removing.storage_id
              ? `The file on ${removing.storage_name} is deleted too.`
              : "Only the record goes; there is no file to delete."
          }
          confirmLabel="Delete"
          pending={remove.isPending}
          onConfirm={() =>
            remove.mutate(
              { server, backup: removing.id },
              {
                onSuccess: () => {
                  toast.success("Copy deleted")
                  setRemoveOpen(false)
                },
                onError: (err) => toast.error(err.message),
              },
            )
          }
        />
      )}
    </>
  )
}

// The Volumes tab's button: every copy of this server's volumes in one layer.
export function VolumeCopiesButton({
  server,
  serverName,
  can,
  phone,
}: {
  server: string
  serverName: string
  can: DockerCan
  phone: boolean
}) {
  const [open, setOpen] = useOpen("docker-volume-copies")
  return (
    <>
      <Button
        variant="outline"
        size={phone ? "icon-lg" : "sm"}
        className="md:h-9"
        aria-label="Copies on storages"
        title="Every copy of this server's volumes kept on storages"
        onClick={() => setOpen(true)}
      >
        <HardDriveUpload />
        {!phone && "Copies"}
      </Button>
      <Layer
        open={open}
        onOpenChange={setOpen}
        title="Volume copies"
        subtitle={`On storages, from ${serverName}`}
      >
        <VolumeBackups server={server} can={can} enabled={open} />
        <p className="text-caption text-ash">
          Make one from a volume's menu (Back up…), or keep them coming with a
          cron job (Containers › Back up volumes).
        </p>
      </Layer>
    </>
  )
}
