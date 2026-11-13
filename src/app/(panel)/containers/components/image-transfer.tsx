"use client"

import { useQuery } from "@tanstack/react-query"
import { FileArchive, HardDrive, Loader2, Server } from "lucide-react"
import Link from "next/link"
import { type FormEvent, useId, useState } from "react"
import { toast } from "sonner"

import { Choice } from "@/components/access/choice"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { Field } from "@/components/field"
import { fileKeys } from "@/components/files/api"
import { FolderPicker } from "@/components/files/folder-picker"
import { storageLister } from "@/components/files/listers"
import { storagesQuery } from "@/components/panel/problems"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { fieldErrors } from "@/lib/api"
import { formatSize } from "@/lib/format"
import type { DockerImage, Storage } from "@/lib/services"
import { cn } from "@/lib/utils"
import { timeAgo } from "../../servers/components/meta"
import {
  useCopyImage,
  useDockerFleet,
  useExportImage,
  useImportImage,
} from "../api"
import { Tick } from "./dialogs"
import { imageName, shortId } from "./meta"
import { useBackupTargets, useFleetServer } from "./volume-backups"

export const IMAGE_FOLDER = "/backups/docker-images"
const ARCHIVE = /\.(tar|tar\.gz|tgz|tar\.xz|tar\.bz2)$/i

const text = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const

type Open = { open: boolean; onOpenChange: (open: boolean) => void }

// Same as the backend's slugPart: the folder each server's files go in.
export function slugPart(s: string) {
  const out = s
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
  return out || "server"
}

const labelOf = (image: DockerImage) =>
  image.tags[0] ? imageName(image.tags[0]) : shortId(image.id)

function Footer({
  form,
  busy,
  disabled,
  label,
  onCancel,
}: {
  form: string
  busy: boolean
  disabled?: boolean
  label: string
  onCancel: () => void
}) {
  return (
    <div className="flex w-full flex-col-reverse gap-2 md:flex-row md:justify-end">
      <Button
        type="button"
        variant="ghost"
        className="max-md:h-11"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form={form}
        disabled={busy || disabled}
        className="max-md:h-11"
      >
        {busy && <Loader2 className="animate-spin" />}
        {label}
      </Button>
    </div>
  )
}

function NoStorage({ write }: { write: boolean }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-border p-4">
      <p className="text-body-sm font-medium">
        {write ? "No storage to write to" : "No storage to read from"}
      </p>
      <p className="text-body-sm text-muted-foreground">
        Add an S3, SFTP, FTP or WebDAV storage in this workspace (or get{" "}
        {write ? "Engineer" : "Operator"} access to one) and come back.
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
  )
}

function StoragePick({
  items,
  pending,
  value,
  onChange,
  error,
}: {
  items: Storage[]
  pending: boolean
  value: string
  onChange: (id: string) => void
  error?: string
}) {
  return (
    <Field label="Storage" error={error}>
      {(p) =>
        pending ? (
          <Skeleton className="h-9 rounded-lg max-md:h-11" />
        ) : (
          <Choice
            id={p.id}
            label="Storage"
            value={value}
            items={items.map((s) => ({ value: s.id, label: s.name }))}
            onChange={onChange}
          />
        )
      }
    </Field>
  )
}

// --- Save to a storage ---------------------------------------------------------

export function ExportImageDialog({
  server,
  image,
  open,
  onOpenChange,
}: Open & { server: string; image: DockerImage }) {
  const form = useId()
  const targets = useBackupTargets(server)
  const [storage, setStorage] = useState("")
  const [folder, setFolder] = useState(IMAGE_FOLDER)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useExportImage()
  const picked = storage || targets.items[0]?.id || ""
  const store = targets.items.find((s) => s.id === picked)
  const serverName = useFleetServer(server)?.name ?? "server"
  const name = labelOf(image)
  const file = `${image.tags[0] ? slugPart(name.replace(/[/:]/g, "-")) : shortId(image.id)}-<date>.tar.gz`

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!picked) return setErrors({ storage_id: "Pick a storage." })
    const f = folder.trim()
    if (f && !f.startsWith("/"))
      return setErrors({ folder: "Start the folder with /." })
    save.mutate(
      { server, image: image.id, storage: picked, folder: f },
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
      title={`Save ${name} to a storage`}
      description={`Every tag of it goes into one compressed file (about ${formatSize(image.size)} before compression), to load on any server later. It runs as a background task.`}
      className="sm:max-w-lg"
      footer={
        <Footer
          form={form}
          busy={save.isPending}
          disabled={empty}
          label="Save"
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      {empty ? (
        <NoStorage write />
      ) : (
        <form id={form} onSubmit={submit} className="flex flex-col gap-4">
          <StoragePick
            items={targets.items}
            pending={targets.pending}
            value={picked}
            onChange={(id) => {
              setStorage(id)
              setErrors({})
            }}
            error={errors.storage_id}
          />
          {store && (
            <FolderPicker
              key={store.id}
              lister={storageLister(store.id)}
              value={folder}
              onChange={(p) => {
                setFolder(p)
                setErrors({})
              }}
              disabled={(p) => store.capabilities.buckets && p === "/"}
              rootLabel={store.name}
              rootIcon={<HardDrive />}
              className="max-h-56"
            />
          )}
          <Field
            label="Folder"
            hint={
              <>
                Pick one above or type it; missing folders are created. The file
                lands in{" "}
                <span className="font-mono break-all">
                  {(folder.trim() || IMAGE_FOLDER).replace(/\/+$/, "")}/
                  {slugPart(serverName)}/{file}
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
                placeholder={IMAGE_FOLDER}
                enterKeyHint="done"
                onChange={(e) => {
                  setFolder(e.target.value)
                  setErrors({})
                }}
                className="font-mono"
              />
            )}
          </Field>
        </form>
      )}
    </ResponsiveDialog>
  )
}

// --- Load from a storage -------------------------------------------------------

// Storages this person may read: the server's workspace, Operator on it.
function useSourceStorages(server: string) {
  const ws = useFleetServer(server)?.workspace_id
  const { storageLevel } = useAccess()
  const list = useQuery(storagesQuery)
  const items = (list.data?.items ?? []).filter(
    (s) =>
      (!ws || s.workspace_id === ws) &&
      atLeast(storageLevel(s.id, s.workspace_id), "operator"),
  )
  return { items, pending: list.isPending }
}

export function ImportImageDialog({
  server,
  open,
  onOpenChange,
}: Open & { server: string }) {
  const form = useId()
  const sources = useSourceStorages(server)
  const serverName = useFleetServer(server)?.name
  const [storage, setStorage] = useState("")
  const [folder, setFolder] = useState(IMAGE_FOLDER)
  const [file, setFile] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const load = useImportImage()
  const picked = storage || sources.items[0]?.id || ""
  const store = sources.items.find((s) => s.id === picked)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!picked) return setErrors({ storage_id: "Pick a storage." })
    const path = file.trim()
    if (!path) return setErrors({ path: "Pick a file or type its path." })
    if (!path.startsWith("/"))
      return setErrors({ path: "Start the path with /." })
    load.mutate(
      { server, storage: picked, path },
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

  const empty = !sources.pending && sources.items.length === 0
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Load an image${serverName ? ` onto ${serverName}` : ""}`}
      description="From a file made by Save to a storage or by docker save (.tar, .tar.gz). It runs as a background task; the image keeps the tags it was saved with."
      className="sm:max-w-lg"
      footer={
        <Footer
          form={form}
          busy={load.isPending}
          disabled={empty}
          label="Load"
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      {empty ? (
        <NoStorage write={false} />
      ) : (
        <form id={form} onSubmit={submit} className="flex flex-col gap-4">
          <StoragePick
            items={sources.items}
            pending={sources.pending}
            value={picked}
            onChange={(id) => {
              setStorage(id)
              setFile("")
              setErrors({})
            }}
            error={errors.storage_id}
          />
          {store && (
            <>
              <FolderPicker
                key={store.id}
                lister={storageLister(store.id)}
                value={folder}
                onChange={setFolder}
                rootLabel={store.name}
                rootIcon={<HardDrive />}
                className="max-h-48"
              />
              <ArchiveList
                storage={store.id}
                folder={folder}
                value={file}
                onPick={(p) => {
                  setFile(p)
                  setErrors({})
                }}
              />
            </>
          )}
          <Field
            label="File"
            hint="Pick a folder, then a file in it, or type the whole path."
            error={errors.path}
          >
            {(p) => (
              <Input
                {...p}
                {...text}
                value={file}
                placeholder={`${IMAGE_FOLDER}/server/nginx-latest-….tar.gz`}
                enterKeyHint="done"
                onChange={(e) => {
                  setFile(e.target.value)
                  setErrors({})
                }}
                className="font-mono"
              />
            )}
          </Field>
        </form>
      )}
    </ResponsiveDialog>
  )
}

// The image files in one folder, through the folder picker's cache.
function ArchiveList({
  storage,
  folder,
  value,
  onPick,
}: {
  storage: string
  folder: string
  value: string
  onPick: (path: string) => void
}) {
  const lister = storageLister(storage)
  const dir = folder.trim() || "/"
  const list = useQuery({
    queryKey: fileKeys.list(lister, dir),
    queryFn: () => lister.list(dir),
    retry: false,
  })
  const files = (list.data?.entries ?? [])
    .filter((e) => e.type === "file" && ARCHIVE.test(e.name))
    .sort((a, b) => (b.modified ?? "").localeCompare(a.modified ?? ""))

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-body-sm font-medium">
        Image files in <span className="font-mono break-all">{dir}</span>
      </p>
      <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
        {list.isPending ? (
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : list.isError ? (
          <p className="p-3 text-body-sm text-muted-foreground">
            Couldn't open this folder: {list.error.message}
          </p>
        ) : files.length === 0 ? (
          <p className="p-3 text-body-sm text-muted-foreground">
            No .tar or .tar.gz file here. Saved images sit in a folder named
            after their server, under {IMAGE_FOLDER}.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {files.map((f) => (
              <li key={f.path}>
                <button
                  type="button"
                  aria-pressed={value === f.path}
                  onClick={() => onPick(f.path)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 px-3 py-2 text-start outline-none hover:bg-subtle focus-visible:bg-muted max-md:min-h-14",
                    value === f.path && "bg-brand-soft hover:bg-brand-soft",
                  )}
                >
                  <FileArchive
                    className={cn(
                      "size-4 shrink-0",
                      value === f.path ? "text-brand-strong" : "text-ash",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-body-sm">
                      {f.name}
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {formatSize(f.size)}
                      {f.modified ? ` · ${timeAgo(f.modified)}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// --- Copy to other servers -----------------------------------------------------

export function CopyImageDialog({
  server,
  image,
  open,
  onOpenChange,
}: Open & { server: string; image: DockerImage }) {
  const form = useId()
  const fleet = useDockerFleet()
  const { serverLevel } = useAccess()
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [error, setError] = useState("")
  const copy = useCopyImage()
  const name = labelOf(image)
  const here = fleet.data?.servers.find((s) => s.server_id === server)
  const others = (fleet.data?.servers ?? [])
    .filter((s) => s.server_id !== server)
    .sort((a, b) => a.name.localeCompare(b.name))
  const usable = (s: (typeof others)[number]) =>
    s.state === "ready" &&
    atLeast(serverLevel(s.server_id, s.workspace_id), "engineer")

  function toggle(id: string, on: boolean) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
    setError("")
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (picked.size === 0) return setError("Pick at least one server.")
    if (picked.size > 20) return setError("20 servers at most in one go.")
    copy.mutate(
      { server, image: image.id, targets: [...picked] },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => {
          const fields = fieldErrors(err)
          setError(Object.values(fields)[0] ?? "")
          if (Object.keys(fields).length === 0) toast.error(err.message)
        },
      },
    )
  }

  const ready = others.filter(usable)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Copy ${name} to other servers`}
      description={`Streamed from ${here?.name ?? "this server"} straight into each one's engine, one after another: no registry, nothing written to disk on the way. About ${formatSize(image.size)} goes to each.`}
      className="sm:max-w-lg"
      footer={
        <Footer
          form={form}
          busy={copy.isPending}
          disabled={ready.length === 0}
          label={picked.size > 1 ? `Copy to ${picked.size} servers` : "Copy"}
          onCancel={() => onOpenChange(false)}
        />
      }
    >
      <form id={form} onSubmit={submit} className="flex flex-col gap-3">
        {fleet.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : others.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-border p-4">
            <p className="text-body-sm font-medium">No other server</p>
            <p className="text-body-sm text-muted-foreground">
              Only {here?.name ?? "this server"} has a container engine. Install
              Docker or Podman on another server and it shows up here.
            </p>
          </div>
        ) : (
          <>
            {ready.length > 1 && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="max-md:h-11"
                  onClick={() =>
                    setPicked(
                      picked.size === ready.length
                        ? new Set()
                        : new Set(ready.map((s) => s.server_id)),
                    )
                  }
                >
                  {picked.size === ready.length ? "Clear" : "Pick all"}
                </Button>
              </div>
            )}
            <div className="flex flex-col rounded-lg border border-border px-3">
              {others.map((s) => {
                const ok = usable(s)
                return (
                  <Tick
                    key={s.server_id}
                    checked={picked.has(s.server_id)}
                    onChange={(on) => toggle(s.server_id, on)}
                    disabled={!ok}
                    label={
                      <span className="inline-flex items-center gap-2">
                        <Server className="size-4 text-ash" />
                        {s.name}
                      </span>
                    }
                    hint={
                      s.state !== "ready"
                        ? `Engine ${s.state.replace("-", " ")}`
                        : !ok
                          ? "You need Engineer access there"
                          : `${s.address} · ${s.images} image${s.images === 1 ? "" : "s"}`
                    }
                  />
                )
              })}
            </div>
            {error && (
              <p className="text-body-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <p className="text-caption text-muted-foreground">
              A server that already has this image gets it again, unchanged. One
              that fails doesn't stop the others.
            </p>
          </>
        )}
      </form>
    </ResponsiveDialog>
  )
}
