"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronRight, HardDrive, Loader2, Server } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Field } from "@/app/(panel)/servers/components/fields"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { type ApiError, api } from "@/lib/api"
import { FolderPicker } from "./folder-picker"
import { listerFor } from "./listers"
import { formatSize } from "./meta"
import { type Endpoint, type FileEntry, useSource } from "./source"

type Target = {
  endpoint: Endpoint
  id: string
  name: string
  detail: string
  kind: "server" | "storage"
  // Where the path field starts.
  path: string
  readOnly: boolean
  // Top-level folders are buckets: nothing can go at "/".
  buckets: boolean
}

const endpointId = (e: Endpoint) =>
  "server_id" in e ? e.server_id : e.storage_id

// Query key of the other end's file lists, to refresh them after a transfer.
const filesKey = (t: Target) =>
  t.kind === "server" ? ["files", t.id] : ["storage-files", t.id]

// Copy (or move) files to another server or storage. The backend streams
// them, so nothing goes through the browser.
export function TransferDialog({
  open,
  setOpen,
  entries,
  move,
  onMoved,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  entries: FileEntry[]
  move: boolean
  onMoved: (paths: string[]) => void
}) {
  const what =
    entries.length === 1 ? `“${entries[0].name}”` : `${entries.length} items`
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      title={`Send ${what}`}
      description="Copy to another server or storage. Folders go with everything inside."
    >
      {entries.length > 0 && (
        <TransferForm
          key={String(open)}
          entries={entries}
          initialMove={move}
          onClose={() => setOpen(false)}
          onMoved={onMoved}
        />
      )}
    </ResponsiveDialog>
  )
}

function useTargets() {
  const source = useSource()
  const self = endpointId(source.endpoint)
  const servers = useQuery({
    queryKey: ["servers", "transfer-targets"],
    queryFn: () => api.servers.listServers({ limit: 500 }),
  })
  const storages = useQuery({
    queryKey: ["storages"],
    queryFn: () => api.storage.listStorages(),
  })
  const targets: Target[] = [
    ...(storages.data?.items ?? []).map((s) => ({
      endpoint: { storage_id: s.id },
      id: s.id,
      name: s.name,
      detail: `${s.protocol.toUpperCase()} · ${s.bucket ? `${s.host || s.provider} / ${s.bucket}` : s.host}`,
      kind: "storage" as const,
      // Every bucket is a top-level folder: let the user pick one.
      path: s.capabilities.buckets ? "" : "/",
      readOnly: s.read_only,
      buckets: s.capabilities.buckets,
    })),
    ...(servers.data?.items ?? []).map((s) => ({
      endpoint: { server_id: s.id },
      id: s.id,
      name: s.name,
      detail: s.host,
      kind: "server" as const,
      path: "/tmp",
      readOnly: false,
      buckets: false,
    })),
  ].filter((t) => t.id !== self)
  return {
    targets,
    loading: servers.isPending || storages.isPending,
    error: servers.error ?? storages.error,
  }
}

function TargetLabel({ target: t }: { target: Target }) {
  const Icon = t.kind === "server" ? Server : HardDrive
  return (
    <>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium">
          {t.name}
        </span>
        <span className="block truncate text-caption text-ash">
          {t.readOnly ? "Read-only" : t.detail}
        </span>
      </span>
    </>
  )
}

function TransferForm({
  entries,
  initialMove,
  onClose,
  onMoved,
}: {
  entries: FileEntry[]
  initialMove: boolean
  onClose: () => void
  onMoved: (paths: string[]) => void
}) {
  const source = useSource()
  const qc = useQueryClient()
  const { targets, loading, error } = useTargets()
  const [picked, setPicked] = useState<Target | null>(null)
  const [path, setPath] = useState("")
  const [move, setMove] = useState(initialMove)
  const [overwrite, setOverwrite] = useState(false)
  const [pathError, setPathError] = useState<string>()
  const canMove = !source.readOnly && !entries.some((e) => e.bucket)
  const paths = entries.map((e) => e.path)

  const send = useMutation<
    { files: number; bytes: number },
    ApiError,
    { target: Target; path: string }
  >({
    mutationFn: ({ target, path }) =>
      api.storageFiles.transferFiles({
        source: { ...source.endpoint, paths },
        destination: { ...target.endpoint, path },
        move: move && canMove,
        overwrite,
      }),
    onSuccess: (r, { target, path }) => {
      qc.invalidateQueries({ queryKey: filesKey(target) })
      if (move && canMove) {
        qc.invalidateQueries({ queryKey: source.key })
        onMoved(paths)
      }
      onClose()
      toast.success(
        `${move && canMove ? "Moved" : "Sent"} ${r.files === 1 ? "1 file" : `${r.files} files`} to ${target.name}`,
        {
          description: r.bytes ? `${path} · ${formatSize(r.bytes)}` : path,
        },
      )
    },
    onError: (err) => {
      if (err.status === 422 || err.status === 404) setPathError(err.message)
    },
  })

  const pick = (t: Target) => {
    setPicked(t)
    setPath(t.path)
    setPathError(undefined)
    send.reset()
  }

  const submit = () => {
    if (!picked) return
    const p = path.trim().replace(/(.)\/+$/, "$1")
    if (!p.startsWith("/")) {
      return setPathError(
        picked.buckets && !p
          ? "Pick a bucket or a folder inside one."
          : "Enter a full path, like /srv.",
      )
    }
    if (picked.buckets && p === "/") {
      return setPathError("Files go inside a bucket: pick one.")
    }
    setPathError(undefined)
    send.mutate({ target: picked, path: p })
  }

  const conflict = send.error?.status === 409

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      {picked ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-lg border border-input px-3 py-2">
            <TargetLabel target={picked} />
            <Button
              variant="ghost"
              size="sm"
              className="max-md:h-11"
              onClick={() => {
                setPicked(null)
                send.reset()
              }}
            >
              Change
            </Button>
          </div>
          <FolderPicker
            key={picked.id}
            lister={listerFor(picked.endpoint)}
            value={path}
            onChange={(p) => {
              setPath(p)
              setPathError(undefined)
            }}
            disabled={(p) => picked.buckets && p === "/"}
            rootLabel={picked.name}
            rootIcon={picked.kind === "server" ? <Server /> : <HardDrive />}
          />
          <Field
            label="Folder"
            error={pathError}
            hint="Pick one above or type a path. Missing folders are created."
          >
            {(p) => (
              <Input
                {...p}
                value={path}
                className="font-mono"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                onChange={(e) => setPath(e.target.value)}
              />
            )}
          </Field>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="text-body-sm font-medium">Destination</p>
          <div
            role="radiogroup"
            aria-label="Destination"
            className="max-h-72 overflow-y-auto rounded-lg border border-input"
          >
            {loading ? (
              <div className="flex flex-col gap-3 p-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : error ? (
              <p className="p-3 text-body-sm text-destructive">
                {error.message}
              </p>
            ) : targets.length === 0 ? (
              <p className="p-3 text-body-sm text-muted-foreground">
                Add another server or a storage first.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {targets.map((t) => (
                  <li key={t.id}>
                    {/* biome-ignore lint/a11y/useSemanticElements: a list of rich options; radio inputs can't hold two lines and an icon */}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={false}
                      disabled={t.readOnly}
                      onClick={() => pick(t)}
                      className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-start outline-none hover:bg-subtle focus-visible:bg-muted disabled:opacity-50 max-md:min-h-14"
                    >
                      <TargetLabel target={t} />
                      <ChevronRight className="size-4 shrink-0 text-ash" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {canMove && (
          // biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox renders the control inside
          <label className="flex items-start gap-2.5 text-body-sm">
            <Checkbox
              checked={move}
              onCheckedChange={(on) => setMove(on)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Move</span>
              <span className="block text-caption text-muted-foreground">
                Delete each item here once it's copied.
              </span>
            </span>
          </label>
        )}
        {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox renders the control inside */}
        <label className="flex items-start gap-2.5 text-body-sm">
          <Checkbox
            checked={overwrite}
            onCheckedChange={(on) => {
              setOverwrite(on)
              send.reset()
            }}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Replace existing files</span>
            <span className="block text-caption text-muted-foreground">
              Otherwise a name that's already there stops the transfer.
            </span>
          </span>
        </label>
      </div>

      {send.error && !pathError && (
        <p className="text-body-sm text-destructive">
          {conflict
            ? "Something with the same name is already there. Tick “Replace existing files” to overwrite it."
            : send.error.message}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button variant="outline" className="max-md:h-11" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="max-md:h-11"
          disabled={!picked || send.isPending}
        >
          {send.isPending && <Loader2 className="animate-spin" />}
          {move && canMove ? "Move" : "Send"}
        </Button>
      </div>
    </form>
  )
}
