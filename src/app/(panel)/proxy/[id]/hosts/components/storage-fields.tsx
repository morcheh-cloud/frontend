"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Check,
  FolderOpen,
  FolderSearch,
  Globe,
  Loader2,
  Package,
  Route,
  ShieldAlert,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { Callout } from "@/app/(panel)/cronjobs/components/editor-parts"
import { useBucket, useBucketChange } from "@/app/(panel)/storage/api"
import { useAccess } from "@/components/auth/auth"
import { atLeast } from "@/components/auth/level"
import { Field } from "@/components/field"
import { fileKeys } from "@/components/files/api"
import { FolderPicker } from "@/components/files/folder-picker"
import { storageLister } from "@/components/files/listers"
import { storagesQuery } from "@/components/panel/problems"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOpen } from "@/hooks/useOpen"
import { api } from "@/lib/api"
import type { Proxy as ReverseProxy, Storage } from "@/lib/services"
import type { Draft, Errors } from "./draft"
import { IconInput, Option, Options, typing } from "./what-it-does"

// The site's files come from a bucket of an S3 storage: pick the storage,
// its bucket and, optionally, a folder inside it.
export function StorageFields({
  draft,
  set,
  errors,
  proxy: p,
  readOnly,
  phone,
}: {
  draft: Draft
  set: (patch: Partial<Draft>) => void
  errors: Errors
  proxy: ReverseProxy
  readOnly: boolean
  phone: boolean
}) {
  const list = useQuery(storagesQuery)
  const storages = (list.data?.items ?? [])
    .filter((s) => s.protocol === "s3")
    .sort(
      (a, b) =>
        Number(b.workspace_id === p.workspace_id) -
          Number(a.workspace_id === p.workspace_id) ||
        a.name.localeCompare(b.name),
    )
  const storage = storages.find((s) => s.id === draft.storageId)
  // A storage set to one bucket serves only that one.
  const fixed = storage?.bucket || ""
  const bucket = fixed || draft.bucket.trim()

  const pickStorage = (id: string) => {
    const s = storages.find((x) => x.id === id)
    set({ storageId: id, bucket: s?.bucket ?? "", folder: "" })
  }

  return (
    <>
      <Field
        label="Storage"
        hint="An S3 storage from the Storage section. The files are read over its own address."
        error={errors["storage.storage_id"]}
      >
        {(f) =>
          list.isPending ? (
            <div className="flex h-11 items-center gap-2 text-body-sm text-muted-foreground md:h-10">
              <Loader2 className="size-4 animate-spin" />
              Loading storages…
            </div>
          ) : storages.length === 0 ? (
            <Callout icon={<Package />}>
              No S3 storage yet.{" "}
              <Link href="/storage" className="text-brand hover:underline">
                Add one in Storage
              </Link>{" "}
              (MinIO, AWS, R2…), then come back.
            </Callout>
          ) : (
            <Select
              items={storages.map((s) => ({ value: s.id, label: s.name }))}
              value={draft.storageId || null}
              onValueChange={(v) => v && pickStorage(v)}
              disabled={readOnly}
            >
              <SelectTrigger id={f.id} className="h-11 w-full md:h-10">
                <SelectValue placeholder="Choose a storage">
                  {storage ? (
                    <StorageLabel s={storage} />
                  ) : draft.storageId ? (
                    "A storage you can't see"
                  ) : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {storages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <StorageLabel s={s} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      </Field>

      {storage && (
        <>
          {fixed ? (
            <Field
              label="Bucket"
              hint={`${storage.name} is set to this one bucket.`}
              error={errors["storage.bucket"]}
            >
              {(f) => (
                <IconInput
                  {...f}
                  icon={Package}
                  value={fixed}
                  readOnly
                  className="font-mono"
                />
              )}
            </Field>
          ) : (
            <BucketSelect
              storage={storage}
              value={draft.bucket}
              onChange={(b) => set({ bucket: b, folder: "" })}
              error={errors["storage.bucket"]}
              readOnly={readOnly}
            />
          )}
          {bucket && (
            <FolderField
              storage={storage}
              bucket={bucket}
              fixed={!!fixed}
              value={draft.folder}
              onChange={(folder) => set({ folder })}
              error={errors["storage.folder"]}
              readOnly={readOnly}
            />
          )}
          {bucket && (
            <BucketAccess
              storage={storage}
              bucket={bucket}
              readOnly={readOnly}
            />
          )}
        </>
      )}

      <Options phone={phone}>
        <Option
          id="host-storage-spa"
          icon={Route}
          label="Single-page app"
          hint="Paths that aren't files get the folder's index.html: React, Vue, Angular builds."
          checked={draft.spa}
          onChange={(spa) => set({ spa })}
          phone={phone}
        />
      </Options>
    </>
  )
}

function StorageLabel({ s }: { s: Storage }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate">{s.name}</span>
      <span className="truncate text-caption text-ash">
        {s.bucket ? `${s.bucket} · ` : ""}
        {s.host.replace(/^https?:\/\//, "")}
      </span>
    </span>
  )
}

// The storage's buckets (its top-level folders in the file manager, so
// the listing is shared with it and with the folder picker).
function BucketSelect({
  storage,
  value,
  onChange,
  error,
  readOnly,
}: {
  storage: Storage
  value: string
  onChange: (bucket: string) => void
  error?: string
  readOnly: boolean
}) {
  const lister = storageLister(storage.id)
  const buckets = useQuery({
    queryKey: fileKeys.list(lister, "/"),
    queryFn: () => lister.list("/"),
    retry: false,
  })
  const names = (buckets.data?.entries ?? [])
    .filter((e) => e.type === "dir")
    .map((e) => e.name)
  // Can't list them (no permission for ListBuckets): type the name.
  const typed = buckets.isError || (buckets.isSuccess && !names.length)
  return (
    <Field
      label="Bucket"
      hint={
        buckets.isError
          ? `Couldn't list the buckets of ${storage.name}: type its name.`
          : undefined
      }
      error={error}
    >
      {(f) =>
        typed ? (
          <IconInput
            {...f}
            {...typing}
            icon={Package}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="my-site"
            className="font-mono"
            readOnly={readOnly}
          />
        ) : (
          <Select
            items={names.map((n) => ({ value: n, label: n }))}
            value={value || null}
            onValueChange={(v) => v && onChange(v)}
            disabled={readOnly || buckets.isPending}
          >
            <SelectTrigger id={f.id} className="h-11 w-full md:h-10">
              <SelectValue
                placeholder={
                  buckets.isPending ? "Loading buckets…" : "Choose a bucket"
                }
              >
                {value ? <span className="font-mono">{value}</span> : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {names.map((n) => (
                <SelectItem key={n} value={n}>
                  <Package className="text-ash" />
                  <span className="truncate font-mono">{n}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }
    </Field>
  )
}

// A folder inside the bucket, typed or picked from a tree of it.
function FolderField({
  storage,
  bucket,
  fixed,
  value,
  onChange,
  error,
  readOnly,
}: {
  storage: Storage
  bucket: string
  // The storage is set to this bucket: its root is the bucket's root.
  fixed: boolean
  value: string
  onChange: (folder: string) => void
  error?: string
  readOnly: boolean
}) {
  const [browse, setBrowse] = useOpen("proxy-host-bucket-folder")
  // The picker's paths are the storage's: "/bucket/…" unless it's fixed.
  const base = fixed ? "" : `/${bucket}`
  const [picked, setPicked] = useState("/")
  const toPicker = (folder: string) =>
    `${base}/${folder.trim().replace(/^\/+|\/+$/g, "")}`.replace(/\/+$/, "") ||
    "/"
  const fromPicker = (path: string) =>
    path.slice(base.length).replace(/^\/+|\/+$/g, "")
  return (
    <>
      <Field
        label="Folder"
        hint="Optional: serve one folder of the bucket, like site or dist. Empty = the whole bucket."
        error={error}
      >
        {(f) => (
          <div className="flex gap-2">
            <IconInput
              {...f}
              {...typing}
              icon={FolderOpen}
              enterKeyHint="done"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="The whole bucket"
              className="font-mono"
              readOnly={readOnly}
            />
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0 md:h-9"
                onClick={() => {
                  setPicked(toPicker(value))
                  setBrowse(true)
                }}
              >
                <FolderSearch />
                Browse
              </Button>
            )}
          </div>
        )}
      </Field>
      <ResponsiveDialog
        open={browse}
        onOpenChange={setBrowse}
        title="Pick the folder"
        description={`Folders in ${bucket}.`}
        className="sm:max-w-lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setBrowse(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onChange(fromPicker(picked))
                setBrowse(false)
              }}
            >
              Use this folder
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <FolderPicker
            lister={storageLister(storage.id)}
            value={picked}
            onChange={setPicked}
            // Only this bucket and what's inside it.
            disabled={(path) =>
              !!base && path !== base && !path.startsWith(`${base}/`)
            }
            rootLabel={storage.name}
            rootIcon={<Package />}
            className="max-h-80"
          />
          <p className="truncate text-caption text-muted-foreground">
            Serves:{" "}
            <span className="font-mono text-foreground">
              {bucket}/{fromPicker(picked)}
            </span>
          </p>
        </div>
      </ResponsiveDialog>
    </>
  )
}

// Visitors read the files without keys: the bucket must let anyone
// download them. Says whether it does and lets an Owner turn it on.
function BucketAccess({
  storage,
  bucket,
  readOnly,
}: {
  storage: Storage
  bucket: string
  readOnly: boolean
}) {
  const access = useAccess()
  const b = useBucket(storage.id, bucket)
  const change = useBucketChange(storage.id, bucket)
  const owner =
    !storage.read_only &&
    atLeast(access.storageLevel(storage.id, storage.workspace_id), "owner")
  if (!b.data) return null
  const a = b.data.access
  if (a === "download" || a === "public")
    return (
      <Callout icon={<Check className="text-success" />}>
        Anyone can download files from{" "}
        <span className="font-mono">{bucket}</span>
        {a === "public" ? ", and list them too" : ""}: visitors will see them.
      </Callout>
    )
  if (a === "custom")
    return (
      <Callout icon={<Globe />}>
        <span className="font-mono">{bucket}</span> has its own access policy.
        Make sure it lets anyone read files (s3:GetObject), or visitors get 404.
      </Callout>
    )
  const open = () =>
    change.mutate(
      () =>
        api.storageBuckets.setStorageBucketAccess(storage.id, bucket, {
          access: "download",
        }),
      {
        onSuccess: () => toast.success(`Anyone can download from ${bucket}`),
        onError: (err) => toast.error(err.message),
      },
    )
  return (
    <Callout icon={<ShieldAlert />} tone="warning">
      <p>
        <span className="font-mono">{bucket}</span> is private: the proxy reads
        it without keys, so visitors would get 404 on every file.
      </p>
      {owner && !readOnly ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2 max-md:h-11"
          disabled={change.isPending}
          onClick={open}
        >
          {change.isPending && <Loader2 className="animate-spin" />}
          Let anyone download files
        </Button>
      ) : (
        <p className="mt-1">
          An Owner of {storage.name} can let anyone download its files (bucket
          settings › Access).
        </p>
      )}
    </Callout>
  )
}
