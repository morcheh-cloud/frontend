"use client"

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query"
import { ArrowUp, ChevronRight, Loader2, RotateCw } from "lucide-react"
import { Fragment, useState } from "react"

import { useJobActions } from "@/components/jobs/jobs-provider"
import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { type ApiError, api } from "@/lib/api"
import type { Job } from "@/lib/services"
import { cn } from "@/lib/utils"
import { fileKeys } from "./api"
import { type Target, TargetLabel, TargetList } from "./endpoints"
import { listerFor } from "./listers"
import { crumbs, FileIcon, formatSize, isDir, sortEntries } from "./meta"
import { type FileEntry, type Listing, useSource } from "./source"

// Copy (or move) files from another server or storage into `dir`, the
// folder on screen. The backend streams them, so nothing goes through the
// browser: the pull side of "Send to…".
export function ImportDialog({
  open,
  setOpen,
  dir,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  dir: string
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      title="Copy from a server or storage"
      description={`Pick files or folders to put in ${dir}. They go straight from there to here, not through this browser.`}
    >
      <ImportForm key={String(open)} dir={dir} onClose={() => setOpen(false)} />
    </ResponsiveDialog>
  )
}

function ImportForm({ dir, onClose }: { dir: string; onClose: () => void }) {
  const source = useSource()
  const jobs = useJobActions()
  const [from, setFrom] = useState<Target | null>(null)
  const [picked, setPicked] = useState<Map<string, FileEntry>>(new Map())
  const [move, setMove] = useState(false)
  const [overwrite, setOverwrite] = useState(false)
  // Top-level folders are buckets: files can only go inside one.
  const bucketRoot = !!source.buckets && dir === "/"
  const canMove = !!from && !from.readOnly
  const moving = move && canMove

  const send = useMutation<Job, ApiError, { from: Target; paths: string[] }>({
    mutationFn: ({ from, paths }) =>
      api.storageFiles.transferFiles({
        source: { ...from.endpoint, paths },
        destination: { ...source.endpoint, path: dir },
        move: moving,
        overwrite,
      }),
    onSuccess: (job) => {
      onClose()
      jobs.track(job)
    },
  })

  const toggle = (e: FileEntry) => {
    const next = new Map(picked)
    if (next.has(e.path)) next.delete(e.path)
    else next.set(e.path, e)
    setPicked(next)
    send.reset()
  }

  const conflict = send.error?.status === 409
  const entries = [...picked.values()]
  const bytes = entries.reduce((n, e) => n + (isDir(e) ? 0 : e.size), 0)

  if (bucketRoot)
    return (
      <div className="flex flex-col gap-4">
        <p className="text-body-sm text-muted-foreground">
          Files go inside a bucket here. Open one first, then copy into it.
        </p>
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="max-md:h-11 max-md:w-full"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    )

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (from && entries.length)
          send.mutate({ from, paths: entries.map((e) => e.path) })
      }}
    >
      {from ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-lg border border-input px-3 py-2">
            <TargetLabel target={from} />
            <Button
              variant="ghost"
              size="sm"
              className="max-md:h-11"
              onClick={() => {
                setFrom(null)
                setPicked(new Map())
                send.reset()
              }}
            >
              Change
            </Button>
          </div>
          <EntryPicker
            key={from.id}
            target={from}
            picked={picked}
            onToggle={toggle}
          />
          <div className="flex min-h-8 items-center gap-2 text-body-sm">
            <span
              className={cn(
                "flex-1",
                entries.length ? "text-foreground" : "text-ash",
              )}
            >
              {entries.length
                ? `${entries.length} selected${bytes ? ` · ${formatSize(bytes)}` : ""}`
                : "Nothing selected yet."}
            </span>
            {entries.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="max-md:h-11"
                onClick={() => setPicked(new Map())}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      ) : (
        <TargetList label="From" onPick={setFrom} />
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
                Delete each item on {from.name} once it's copied.
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
              Otherwise a name that's already here stops the copy.
            </span>
          </span>
        </label>
      </div>

      {send.error && (
        <p className="text-body-sm text-destructive">
          {conflict
            ? "Something with the same name is already here. Tick “Replace existing files” to overwrite it."
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
          disabled={!entries.length || send.isPending}
        >
          {send.isPending && <Loader2 className="animate-spin" />}
          {moving ? "Move here" : "Copy here"}
        </Button>
      </div>
    </form>
  )
}

// Browse the other end one folder at a time and tick what to bring over.
// The selection survives moving between folders.
function EntryPicker({
  target,
  picked,
  onToggle,
}: {
  target: Target
  picked: Map<string, FileEntry>
  onToggle: (e: FileEntry) => void
}) {
  const lister = listerFor(target.endpoint)
  // "" opens a server's home folder.
  const [path, setPath] = useState(target.kind === "server" ? "" : "/")
  const [q, setQ] = useState("")
  const list = useQuery<Listing, ApiError>({
    queryKey: fileKeys.list(lister, path),
    queryFn: () => lister.list(path),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 30_000,
  })
  const here = list.data?.path ?? path
  const all = list.data
    ? sortEntries(list.data.entries, { field: "name", order: "asc" })
    : []
  const needle = q.trim().toLowerCase()
  const shown = needle
    ? all.filter((e) => e.name.toLowerCase().includes(needle))
    : all

  const open = (p: string) => {
    setPath(p)
    setQ("")
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-input">
      <div className="flex items-center gap-1 border-b border-border p-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Up one folder"
          className="max-md:size-11"
          disabled={!list.data || here === "/"}
          onClick={() => list.data && open(list.data.parent)}
        >
          <ArrowUp />
        </Button>
        <nav
          aria-label="Folder"
          className="flex min-w-0 flex-1 [scrollbar-width:none] items-center overflow-x-auto text-body-sm"
        >
          {here.startsWith("/") &&
            crumbs(here).map((c, i, all) => (
              <Fragment key={c.path}>
                {i > 0 && (
                  <ChevronRight className="size-3.5 shrink-0 text-ash" />
                )}
                <button
                  type="button"
                  onClick={() => open(c.path)}
                  aria-current={i === all.length - 1 ? "location" : undefined}
                  className={cn(
                    "shrink-0 rounded-md px-1.5 py-1 hover:bg-subtle max-md:py-2.5",
                    i === all.length - 1
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {i === 0 ? target.name : c.name}
                </button>
              </Fragment>
            ))}
        </nav>
        {list.isFetching && (
          <Loader2 className="me-2 size-4 shrink-0 animate-spin text-ash" />
        )}
      </div>

      {all.length > 8 && (
        <div className="border-b border-border p-1.5">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter this folder"
            aria-label="Filter this folder"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className="h-8"
          />
        </div>
      )}

      {/* Short laptop screens: the list gives way so the buttons stay on screen. */}
      <div className="max-h-[clamp(8rem,calc(100dvh-35rem),18rem)] overflow-y-auto overscroll-contain max-md:max-h-[38svh]">
        {list.isPending ? (
          <div className="flex flex-col gap-3 p-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-36" />
          </div>
        ) : list.error && !list.data ? (
          <div className="flex items-center gap-2 p-3">
            <p className="flex-1 text-body-sm text-destructive">
              Can't open: {list.error.message}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-11"
              onClick={() => list.refetch()}
            >
              <RotateCw /> Retry
            </Button>
          </div>
        ) : shown.length === 0 ? (
          <p className="p-3 text-body-sm text-muted-foreground">
            {needle ? "Nothing here matches." : "This folder is empty."}
          </p>
        ) : (
          <ul>
            {shown.map((e) => {
              const folder = isDir(e)
              const on = picked.has(e.path)
              return (
                <li
                  key={e.path}
                  className={cn("flex items-center", on && "bg-brand-soft")}
                >
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: the Base UI checkbox renders the control inside */}
                  <label
                    className={cn(
                      "flex size-10 shrink-0 cursor-pointer items-center justify-center max-md:size-12",
                      e.bucket && "invisible",
                    )}
                  >
                    <Checkbox
                      checked={on}
                      disabled={e.bucket}
                      aria-label={`Select ${e.name}`}
                      onCheckedChange={() => onToggle(e)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => (folder ? open(e.path) : onToggle(e))}
                    className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 py-1.5 pe-3 text-start text-body-sm outline-none hover:bg-subtle focus-visible:bg-muted max-md:min-h-12"
                  >
                    <FileIcon entry={e} className="size-4" />
                    <span className="min-w-0 flex-1 truncate">{e.name}</span>
                    {folder ? (
                      <ChevronRight className="size-4 shrink-0 text-ash" />
                    ) : (
                      <span className="shrink-0 text-caption text-ash tabular-nums">
                        {formatSize(e.size)}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
            {list.data?.truncated && (
              <li className="px-3 py-2 text-caption text-ash">
                Some items aren't shown: this folder is too big to list.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
