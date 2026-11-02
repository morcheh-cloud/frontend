"use client"

import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useState } from "react"

import { Field } from "@/app/(panel)/servers/components/fields"
import { useJobActions } from "@/components/jobs/jobs-provider"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { type ApiError, api } from "@/lib/api"
import type { Job } from "@/lib/services"
import { type Target, TargetIcon, TargetLabel, TargetList } from "./endpoints"
import { FolderPicker } from "./folder-picker"
import { listerFor } from "./listers"
import { type FileEntry, useSource } from "./source"

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
  const jobs = useJobActions()
  const [picked, setPicked] = useState<Target | null>(null)
  const [path, setPath] = useState("")
  const [move, setMove] = useState(initialMove)
  const [overwrite, setOverwrite] = useState(false)
  const [pathError, setPathError] = useState<string>()
  const canMove = !source.readOnly && !entries.some((e) => e.bucket)
  const paths = entries.map((e) => e.path)

  const send = useMutation<Job, ApiError, { target: Target; path: string }>({
    mutationFn: ({ target, path }) =>
      api.storageFiles.transferFiles({
        source: { ...source.endpoint, paths },
        destination: { ...target.endpoint, path },
        move: move && canMove,
        overwrite,
      }),
    onSuccess: (job) => {
      if (move && canMove) onMoved(paths)
      onClose()
      jobs.track(job)
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
            rootIcon={<TargetIcon target={picked} />}
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
        <TargetList
          label="Destination"
          disabled={(t) => t.readOnly}
          onPick={pick}
        />
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
