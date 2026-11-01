"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  RotateCcw,
  Upload as UploadIcon,
  X,
} from "lucide-react"
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import { BottomSheet } from "@/components/bottom-sheet"
import { Button } from "@/components/ui/button"
import { useOpen } from "@/hooks/useOpen"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { fileKeys, uploadFile } from "../api"
import { formatSize, joinPath } from "./meta"

const CONCURRENCY = 3

type Status = "queued" | "uploading" | "done" | "failed" | "conflict"

export type Upload = {
  id: number
  file: File
  // Full destination path on the server.
  dest: string
  // What to call it in the list: the path under the folder it went to.
  label: string
  loaded: number
  status: Status
  error?: string
  overwrite: boolean
}

export type PickedFile = { file: File; relPath: string }

type Uploads = {
  items: Upload[]
  add: (files: PickedFile[], dir: string) => void
  pickFiles: (dir: string) => void
  pickFolder: (dir: string) => void
  cancel: (id: number) => void
  retry: (id: number, overwrite?: boolean) => void
  replaceAll: () => void
  skipAll: () => void
  clear: () => void
}

const UploadsContext = createContext<Uploads | null>(null)

export function useUploads() {
  const ctx = useContext(UploadsContext)
  if (!ctx) throw new Error("useUploads outside UploadsProvider")
  return ctx
}

let seq = 0

// The upload queue for one server: a few files at a time, each written to a
// temp name and renamed into place by the backend, so a cancel never leaves
// half a file.
export function UploadsProvider({
  serverId,
  children,
}: {
  serverId: string
  children: ReactNode
}) {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<Upload[]>([])
  const itemsRef = useRef<Upload[]>([])
  const aborts = useRef(new Map<number, AbortController>())
  const fileInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)
  const pickDir = useRef("")
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const commit = useCallback((next: Upload[]) => {
    itemsRef.current = next
    setItems(next)
  }, [])

  const patch = useCallback(
    (id: number, change: Partial<Upload>) =>
      commit(
        itemsRef.current.map((u) => (u.id === id ? { ...u, ...change } : u)),
      ),
    [commit],
  )

  // Many small files finish close together: refresh the listings once.
  const refresh = useCallback(() => {
    clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(
      () =>
        queryClient.invalidateQueries({
          queryKey: [...fileKeys.all(serverId), "list"],
        }),
      300,
    )
  }, [queryClient, serverId])

  const pump = useCallback(() => {
    const running = itemsRef.current.filter(
      (u) => u.status === "uploading",
    ).length
    const next = itemsRef.current
      .filter((u) => u.status === "queued")
      .slice(0, Math.max(0, CONCURRENCY - running))
    for (const upload of next) {
      const abort = new AbortController()
      aborts.current.set(upload.id, abort)
      patch(upload.id, { status: "uploading", loaded: 0, error: undefined })
      uploadFile(serverId, upload.dest, upload.file, {
        overwrite: upload.overwrite,
        signal: abort.signal,
        onProgress: (loaded) => patch(upload.id, { loaded }),
      })
        .then(() => {
          patch(upload.id, { status: "done", loaded: upload.file.size })
          refresh()
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return
          const conflict = err instanceof ApiError && err.status === 409
          patch(upload.id, {
            status: conflict ? "conflict" : "failed",
            error: err instanceof Error ? err.message : "Upload failed.",
          })
        })
        .finally(() => {
          aborts.current.delete(upload.id)
          pump()
        })
    }
  }, [serverId, patch, refresh])

  const add = useCallback(
    (files: PickedFile[], dir: string) => {
      if (files.length === 0) return
      commit([
        ...itemsRef.current,
        ...files.map(({ file, relPath }) => ({
          id: ++seq,
          file,
          dest: joinPath(dir, relPath),
          label: relPath,
          loaded: 0,
          status: "queued" as const,
          overwrite: false,
        })),
      ])
      pump()
    },
    [commit, pump],
  )

  const cancel = useCallback(
    (id: number) => {
      aborts.current.get(id)?.abort()
      commit(itemsRef.current.filter((u) => u.id !== id))
      pump()
    },
    [commit, pump],
  )

  const retry = useCallback(
    (id: number, overwrite?: boolean) => {
      const upload = itemsRef.current.find((u) => u.id === id)
      if (!upload) return
      patch(id, {
        status: "queued",
        overwrite: overwrite ?? upload.overwrite,
      })
      pump()
    },
    [patch, pump],
  )

  const replaceAll = useCallback(() => {
    commit(
      itemsRef.current.map((u) =>
        u.status === "conflict"
          ? { ...u, status: "queued", overwrite: true }
          : u,
      ),
    )
    pump()
  }, [commit, pump])

  const skipAll = useCallback(
    () => commit(itemsRef.current.filter((u) => u.status !== "conflict")),
    [commit],
  )

  const clear = useCallback(() => {
    for (const abort of aborts.current.values()) abort.abort()
    commit([])
  }, [commit])

  // Leaving the server's files cancels what's still going.
  useEffect(() => {
    const running = aborts.current
    return () => {
      for (const abort of running.values()) abort.abort()
    }
  }, [])

  // Closing the tab mid-upload would lose it: ask first.
  const busy = items.some(
    (u) => u.status === "uploading" || u.status === "queued",
  )
  useEffect(() => {
    if (!busy) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [busy])

  const fromInput = (input: HTMLInputElement) => {
    const files = [...(input.files ?? [])].map((file) => ({
      file,
      relPath: file.webkitRelativePath || file.name,
    }))
    input.value = ""
    add(files, pickDir.current)
  }

  const value: Uploads = {
    items,
    add,
    pickFiles: (dir) => {
      pickDir.current = dir
      fileInput.current?.click()
    },
    pickFolder: (dir) => {
      pickDir.current = dir
      folderInput.current?.click()
    },
    cancel,
    retry,
    replaceAll,
    skipAll,
    clear,
  }

  return (
    <UploadsContext.Provider value={value}>
      {children}
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => fromInput(e.currentTarget)}
      />
      <input
        ref={(el) => {
          folderInput.current = el
          // Not a React prop yet.
          el?.setAttribute("webkitdirectory", "")
        }}
        type="file"
        hidden
        onChange={(e) => fromInput(e.currentTarget)}
      />
    </UploadsContext.Provider>
  )
}

// Files (and whole folders) dropped on the page, with their paths under the
// drop so folders upload as folders.
export async function readDrop(data: DataTransfer): Promise<PickedFile[]> {
  const entries = [...data.items]
    .map((item) => item.webkitGetAsEntry?.())
    .filter((e): e is FileSystemEntry => !!e)
  if (entries.length === 0) {
    return [...data.files].map((file) => ({ file, relPath: file.name }))
  }
  const out: PickedFile[] = []
  const walk = async (entry: FileSystemEntry, prefix: string) => {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject),
      )
      out.push({ file, relPath })
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      // readEntries returns at most ~100 at a time: read until empty.
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
          reader.readEntries(resolve, reject),
        )
        if (batch.length === 0) break
        for (const child of batch) await walk(child, relPath)
      }
    }
  }
  for (const entry of entries) await walk(entry, "")
  return out
}

export const hasFiles = (e: React.DragEvent) =>
  e.dataTransfer.types.includes("Files")

function summary(items: Upload[]) {
  const active = items.filter(
    (u) => u.status === "uploading" || u.status === "queued",
  )
  const conflicts = items.filter((u) => u.status === "conflict").length
  const failed = items.filter((u) => u.status === "failed").length
  const total = items.reduce((n, u) => n + u.file.size, 0)
  const loaded = items.reduce(
    (n, u) => n + (u.status === "done" ? u.file.size : u.loaded),
    0,
  )
  const percent = total ? Math.round((loaded / total) * 100) : 100
  const title = active.length
    ? `Uploading ${active.length} ${active.length === 1 ? "file" : "files"}`
    : conflicts
      ? `${conflicts} ${conflicts === 1 ? "file already exists" : "files already exist"}`
      : failed
        ? `${failed} ${failed === 1 ? "upload" : "uploads"} failed`
        : `${items.length} ${items.length === 1 ? "upload" : "uploads"} complete`
  return { active: active.length, conflicts, failed, percent, title }
}

// Desktop: a card in the corner. Phone: a pill above the tab bar that opens
// the list in a sheet.
export function UploadsPanel({ phone }: { phone: boolean }) {
  const uploads = useUploads()
  const [collapsed, setCollapsed] = useState(false)
  const [sheetOpen, setSheetOpen] = useOpen("file-uploads")
  const { items } = uploads
  if (items.length === 0) return null
  const s = summary(items)

  if (phone) {
    return (
      <>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="fixed inset-x-4 bottom-[calc(4rem+1px+env(safe-area-inset-bottom)+--spacing(3))] z-30 flex h-12 items-center gap-3 rounded-full border border-border bg-card px-4 text-start shadow-md outline-none active:bg-muted"
        >
          <StatusIcon s={s} />
          <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
            {s.title}
          </span>
          {s.active > 0 && (
            <span className="text-body-sm text-muted-foreground tabular-nums">
              {s.percent}%
            </span>
          )}
        </button>
        <BottomSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="Uploads"
          footer={<Footer s={s} />}
        >
          <List />
        </BottomSheet>
      </>
    )
  }

  return (
    <section
      aria-label="Uploads"
      className="fixed end-6 bottom-6 z-40 flex w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-md"
    >
      <header className="flex h-12 items-center gap-2 ps-4 pe-2">
        <StatusIcon s={s} />
        <h2 className="min-w-0 flex-1 truncate text-body-sm font-medium">
          {s.title}
          {s.active > 0 && (
            <span className="ms-2 font-normal text-muted-foreground tabular-nums">
              {s.percent}%
            </span>
          )}
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={collapsed ? "Show uploads" : "Hide uploads"}
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronDown className={cn(collapsed && "rotate-180")} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={s.active ? "Cancel all uploads" : "Close"}
          onClick={uploads.clear}
        >
          <X />
        </Button>
      </header>
      {!collapsed && (
        <>
          <div className="max-h-72 overflow-y-auto border-t border-border px-2 py-1">
            <List />
          </div>
          {s.conflicts > 0 && (
            <div className="border-t border-border p-2">
              <Footer s={s} />
            </div>
          )}
        </>
      )}
    </section>
  )
}

function StatusIcon({ s }: { s: ReturnType<typeof summary> }) {
  if (s.active)
    return <LoaderCircle className="size-4 shrink-0 animate-spin text-brand" />
  if (s.conflicts || s.failed)
    return <CircleAlert className="size-4 shrink-0 text-warning" />
  return <CircleCheck className="size-4 shrink-0 text-success" />
}

function Footer({ s }: { s: ReturnType<typeof summary> }) {
  const uploads = useUploads()
  if (!s.conflicts) {
    return (
      <Button
        variant="outline"
        className="w-full max-md:h-11"
        onClick={uploads.clear}
      >
        {s.active ? "Cancel all" : "Clear list"}
      </Button>
    )
  }
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="flex-1 max-md:h-11"
        onClick={uploads.skipAll}
      >
        Skip {s.conflicts > 1 ? "all" : ""}
      </Button>
      <Button className="flex-1 max-md:h-11" onClick={uploads.replaceAll}>
        Replace {s.conflicts > 1 ? "all" : ""}
      </Button>
    </div>
  )
}

function List() {
  const { items, cancel, retry } = useUploads()
  return (
    <ul className="flex flex-col">
      {items.map((u) => {
        const percent = u.file.size
          ? Math.round((u.loaded / u.file.size) * 100)
          : 100
        return (
          <li
            key={u.id}
            className="flex min-h-12 items-center gap-3 p-2 max-md:min-h-14"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body-sm">{u.label}</span>
              {u.status === "uploading" ? (
                <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-brand transition-[width]"
                    style={{ width: `${percent}%` }}
                  />
                </span>
              ) : (
                <span
                  className={cn(
                    "block truncate text-caption text-ash",
                    u.status === "failed" && "text-destructive",
                  )}
                >
                  {u.status === "queued" &&
                    `Waiting · ${formatSize(u.file.size)}`}
                  {u.status === "done" && formatSize(u.file.size)}
                  {u.status === "conflict" && "Already exists"}
                  {u.status === "failed" && u.error}
                </span>
              )}
            </span>
            {u.status === "conflict" && (
              <Button
                variant="outline"
                size="sm"
                className="max-md:h-9"
                onClick={() => retry(u.id, true)}
              >
                Replace
              </Button>
            )}
            {u.status === "failed" && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Retry ${u.label}`}
                className="max-md:size-11"
                onClick={() => retry(u.id)}
              >
                <RotateCcw />
              </Button>
            )}
            {u.status === "done" ? (
              <CircleCheck className="m-1.5 size-4 shrink-0 text-success max-md:m-3.5" />
            ) : (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={
                  u.status === "conflict"
                    ? `Skip ${u.label}`
                    : `Cancel ${u.label}`
                }
                className="max-md:size-11"
                onClick={() => cancel(u.id)}
              >
                <X />
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// The overlay while files are dragged over a drop target.
export function DropHint({ folder }: { folder: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand bg-brand-soft/80">
      <p className="flex items-center gap-2 text-body font-medium text-brand-strong">
        <UploadIcon className="size-5" />
        Drop to upload to {folder}
      </p>
    </div>
  )
}
