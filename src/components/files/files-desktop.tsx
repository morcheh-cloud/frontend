"use client"

import {
  Archive,
  ArrowDown,
  ArrowUp,
  ChartPie,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  Copy,
  Download,
  Ellipsis,
  Eye,
  EyeOff,
  FilePlus,
  FolderInput,
  FolderPlus,
  FolderUp,
  HardDriveDownload,
  House,
  Link2,
  Loader2,
  RefreshCw,
  Scissors,
  Search,
  Send,
  ShieldCheck,
  SquareTerminal,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react"
import {
  Fragment,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"

import { useJobActions } from "@/components/jobs/jobs-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useFileOps, useLoginUsers } from "./api"
import { useFileActions } from "./file-actions"
import { useFiles } from "./file-manager"
import { type MenuItem, useEntryMenu } from "./file-menu"
import {
  BucketIcon,
  crumbs,
  dirname,
  FileIcon,
  FolderSize,
  formatDate,
  formatModified,
  formatSize,
  isDir,
  type SortField,
  shortcut,
} from "./meta"
import type { FileEntry } from "./source"
import {
  DropHint,
  hasFiles,
  readDrop,
  UploadsPanel,
  useUploads,
} from "./uploads"

const DRAG_TYPE = "application/x-morcheh-files"

// Desktop: a framed browser (toolbar, sortable table, status bar) with a
// context menu on every row, keyboard shortcuts, drag-and-drop uploads and
// drag-to-move onto folders.
export function FilesDesktop() {
  const files = useFiles()
  const uploads = useUploads()
  const dir = files.listing?.path ?? ""
  const [dropping, setDropping] = useState(false)
  const depth = useRef(0)
  const droppable = !!files.listing && !files.source.readOnly

  useShortcuts()

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a drop zone for files dragged in from the desktop */}
      <div
        className="@container relative flex min-h-0 flex-1 flex-col"
        onDragEnter={(e) => {
          if (!hasFiles(e) || !droppable) return
          depth.current++
          setDropping(true)
        }}
        onDragLeave={(e) => {
          if (!hasFiles(e)) return
          depth.current = Math.max(0, depth.current - 1)
          if (depth.current === 0) setDropping(false)
        }}
        onDragOver={(e) => {
          if (hasFiles(e) && droppable) e.preventDefault()
        }}
        onDrop={async (e) => {
          if (!hasFiles(e) || !droppable) return
          e.preventDefault()
          depth.current = 0
          setDropping(false)
          const picked = await readDrop(e.dataTransfer)
          if (picked.length) uploads.add(picked, dir)
        }}
      >
        <Toolbar />
        {/* The list scrolls on its own; toolbar and status bar stay put. Room
          at the end so the floating bar never hides the last row. */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-auto",
            (files.selected.size > 0 || files.clipboard) && "pb-16",
          )}
        >
          <Body />
        </div>
        <StatusBar />
        <BulkBar />
        {dropping && (
          <DropHint
            folder={
              dir === "/" ? "/" : (dir.split("/").filter(Boolean).pop() ?? dir)
            }
          />
        )}
      </div>
      {/* Outside the @container: it would anchor this fixed panel. */}
      <UploadsPanel phone={false} />
    </>
  )
}

function UploadMenu() {
  const files = useFiles()
  const actions = useFileActions()
  const uploads = useUploads()
  const dir = files.listing?.path ?? ""
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" disabled={!files.listing} />}
      >
        <Upload /> Upload <ChevronDown className="text-ash" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuItem onClick={() => uploads.pickFiles(dir)}>
          <FilePlus /> Files…
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => uploads.pickFolder(dir)}>
          <FolderUp /> Folder…
        </DropdownMenuItem>
        {(actions.importFrom || actions.fetchUrl) && <DropdownMenuSeparator />}
        {actions.importFrom && (
          <DropdownMenuItem onClick={actions.importFrom}>
            <HardDriveDownload /> From a server or storage…
          </DropdownMenuItem>
        )}
        {actions.fetchUrl && (
          <DropdownMenuItem onClick={actions.fetchUrl}>
            <Link2 /> From a URL…
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NewMenu() {
  const files = useFiles()
  const actions = useFileActions()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button disabled={!files.listing} />}>
        <FolderPlus /> New <ChevronDown className="opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={actions.newFolder}>
          {actions.bucketRoot ? (
            <>
              <BucketIcon /> Bucket
            </>
          ) : (
            <>
              <FolderPlus /> Folder
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={actions.newFile}>
          <FilePlus /> Text file
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Toolbar() {
  const files = useFiles()
  const { listing } = files
  const filterRef = useRef<HTMLInputElement>(null)

  // "/" jumps to the filter, as in most file managers and web apps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || isTyping(e)) return
      if (layerOpen()) return
      e.preventDefault()
      filterRef.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-1 border-b border-border px-4 py-2">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Up one folder"
        title="Up one folder (Alt+↑)"
        disabled={!listing || listing.path === "/"}
        onClick={files.up}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Home folder"
        title={listing ? `Home (${listing.home})` : "Home"}
        disabled={!listing}
        onClick={() => listing && files.go(listing.home)}
      >
        <House />
      </Button>
      <UsersMenu />
      <PathBar />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Refresh"
        title="Refresh"
        onClick={files.refetch}
      >
        <RefreshCw className={cn(files.fetching && "animate-spin")} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={
          files.showHidden ? "Hide hidden files" : "Show hidden files"
        }
        aria-pressed={files.showHidden}
        title={files.showHidden ? "Hide hidden files" : "Show hidden files"}
        onClick={() => files.setShowHidden(!files.showHidden)}
        className={cn(files.showHidden && "bg-muted")}
      >
        {files.showHidden ? <Eye /> : <EyeOff />}
      </Button>
      {files.analyse && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Disk usage"
          title="Disk usage: what takes the space here"
          disabled={!listing}
          onClick={() => listing && files.analyse?.(listing.path)}
        >
          <ChartPie />
        </Button>
      )}
      {files.openTerminal && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open a terminal here"
          title="Open a terminal here"
          disabled={!listing}
          onClick={() => listing && files.openTerminal?.(listing.path)}
        >
          <SquareTerminal />
        </Button>
      )}
      <div className="relative order-last basis-full @xl:order-0 @xl:ms-1 @xl:w-48 @xl:basis-auto @3xl:w-64">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-ash" />
        <Input
          ref={filterRef}
          value={files.filter}
          placeholder="Filter (/)"
          title="Type to filter this folder; Enter searches subfolders"
          aria-label="Filter this folder; Enter searches subfolders"
          className="h-9 px-8"
          onChange={(e) => {
            files.setFilter(e.target.value)
            if (!e.target.value && files.search) files.setSearch(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") files.setSearch(files.filter)
            else if (e.key === "Escape") {
              files.setFilter("")
              files.setSearch(null)
              e.currentTarget.blur()
            }
          }}
        />
        {files.filter && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => {
              files.setFilter("")
              files.setSearch(null)
            }}
            className="absolute end-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-ash hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {!files.source.readOnly && (
        <div className="ms-2 flex gap-2">
          <UploadMenu />
          <NewMenu />
        </div>
      )}
    </div>
  )
}

// Jump to the home folder of any account that can log in. Hidden when the
// login user is the only one.
function UsersMenu() {
  const files = useFiles()
  const { listing } = files
  const users = useLoginUsers(files.source).data ?? []
  if (!listing || !users.some((u) => u.home !== listing.home)) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Users' home folders"
            title="Users' home folders"
          />
        }
      >
        <Users />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Home folders</DropdownMenuLabel>
          {users.map((u) => (
            <DropdownMenuItem key={u.name} onClick={() => files.go(u.home)}>
              <UserRound />
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  {u.name}
                  {u.home === listing.home && (
                    <span className="text-ash"> (you)</span>
                  )}
                </span>
                <span className="block truncate font-mono text-caption text-ash">
                  {u.home}
                </span>
              </span>
              {listing.path === u.home && <Check className="text-brand" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Breadcrumbs that turn into a path field on click (or ⌘L).
function PathBar() {
  const files = useFiles()
  const path = files.listing?.path ?? files.path
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(path)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "l") {
        if (layerOpen()) return
        e.preventDefault()
        setValue(path)
        setEditing(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [path])

  if (editing) {
    return (
      <form
        className="min-w-0 flex-1"
        onSubmit={(e) => {
          e.preventDefault()
          const next = value.trim().replace(/(.)\/+$/, "$1")
          setEditing(false)
          if (next.startsWith("/")) files.go(next)
          else if (next) toast.error("Enter a full path, like /etc/nginx.")
        }}
      >
        <Input
          autoFocus
          value={value}
          aria-label="Folder path"
          spellCheck={false}
          autoComplete="off"
          className="h-9 font-mono text-body-sm"
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        />
      </form>
    )
  }

  const parts = crumbs(path)
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the crumbs are buttons; the gap around them is a mouse shortcut to the path field (⌘L for keyboards)
    <div
      ref={scroller}
      title="Click to type a path (Ctrl+L)"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        setValue(path)
        setEditing(true)
      }}
      className="flex h-9 min-w-0 flex-1 cursor-text [scrollbar-width:none] items-center overflow-x-auto rounded-lg px-1 hover:bg-subtle"
    >
      {files.listing &&
        parts.map((c, i) => (
          <Fragment key={c.path}>
            {i > 1 && (
              <ChevronRight className="size-3.5 shrink-0 text-ash rtl:rotate-180" />
            )}
            <button
              type="button"
              onClick={() => files.go(c.path)}
              aria-current={i === parts.length - 1 ? "location" : undefined}
              className={cn(
                "shrink-0 rounded-md px-1.5 py-1 text-body-sm whitespace-nowrap hover:bg-muted",
                i === parts.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
                i === 0 && "font-mono",
              )}
            >
              {c.name}
            </button>
          </Fragment>
        ))}
    </div>
  )
}

function Body() {
  const files = useFiles()
  const actions = useFileActions()
  const uploads = useUploads()

  if (files.search !== null) return <SearchResults />

  if (files.error && !files.listing) {
    const denied = files.error.status === 403
    return (
      <State
        title={
          files.error.status === 404
            ? "This folder doesn't exist"
            : denied
              ? "You can't open this folder"
              : "Couldn't open this folder"
        }
        description={
          denied
            ? `The ${files.source.noun} refused to list it.`
            : files.error.message
        }
      >
        <Button variant="outline" onClick={files.refetch}>
          Try again
        </Button>
        <Button onClick={() => files.go("")}>
          <House /> Home folder
        </Button>
      </State>
    )
  }

  if (files.loading) return <SkeletonTable />

  if (files.entries.length === 0) {
    if (files.filter) {
      return (
        <State
          title={`Nothing here matches “${files.filter}”`}
          description="Search the folders inside this one instead."
        >
          <Button onClick={() => files.setSearch(files.filter)}>
            <Search /> Search subfolders
          </Button>
        </State>
      )
    }
    const write = !files.source.readOnly
    const hidden = files.hiddenCount
      ? `${files.hiddenCount} hidden ${files.hiddenCount === 1 ? "item" : "items"}.`
      : ""
    return (
      <ContextMenu>
        <ContextMenuTrigger render={<div />} className="flex flex-1 flex-col">
          <State
            title="This folder is empty"
            description={
              write
                ? `${hidden} Drop files here to upload them.`.trim()
                : hidden || undefined
            }
          >
            {files.hiddenCount > 0 && (
              <Button
                variant="outline"
                onClick={() => files.setShowHidden(true)}
              >
                <Eye /> Show hidden
              </Button>
            )}
            {write && (
              <>
                <Button
                  variant="outline"
                  onClick={() => uploads.pickFiles(files.listing?.path ?? "")}
                >
                  <Upload /> Upload
                </Button>
                <Button onClick={actions.newFolder}>
                  {actions.bucketRoot ? <BucketIcon /> : <FolderPlus />}
                  {actions.bucketRoot ? "New bucket" : "New folder"}
                </Button>
              </>
            )}
          </State>
        </ContextMenuTrigger>
        <BackgroundMenu />
      </ContextMenu>
    )
  }

  return <Table entries={files.entries} />
}

function Table({
  entries,
  location = false,
}: {
  entries: FileEntry[]
  location?: boolean
}) {
  const files = useFiles()
  const { source } = files
  const ops = useFileOps(source)
  const jobs = useJobActions()
  const write = !source.readOnly
  const uploads = useUploads()
  const anchor = useRef<string | null>(null)
  const [target, setTarget] = useState<FileEntry | null>(null)
  const [dropOn, setDropOn] = useState<string | null>(null)

  const all =
    entries.length > 0 && entries.every((e) => files.selected.has(e.path))
  const some = entries.some((e) => files.selected.has(e.path))

  const select = (e: React.MouseEvent, entry: FileEntry) => {
    const next = new Set(files.selected)
    if (e.shiftKey && anchor.current) {
      const a = entries.findIndex((x) => x.path === anchor.current)
      const b = entries.findIndex((x) => x.path === entry.path)
      if (a >= 0 && b >= 0) {
        if (!(e.metaKey || e.ctrlKey)) next.clear()
        for (const x of entries.slice(Math.min(a, b), Math.max(a, b) + 1))
          next.add(x.path)
        return files.setSelected(next)
      }
    }
    if (e.metaKey || e.ctrlKey) {
      if (next.has(entry.path)) next.delete(entry.path)
      else next.add(entry.path)
    } else {
      next.clear()
      next.add(entry.path)
    }
    anchor.current = entry.path
    files.setSelected(next)
  }

  const toggle = (entry: FileEntry, on: boolean) => {
    const next = new Set(files.selected)
    if (on) next.add(entry.path)
    else next.delete(entry.path)
    anchor.current = entry.path
    files.setSelected(next)
  }

  const header = (
    field: SortField | null,
    label: string,
    className?: string,
  ) => (
    <th
      scope="col"
      className={cn("h-10 px-3 text-start font-medium", className)}
    >
      {field ? (
        <button
          type="button"
          onClick={() =>
            files.setSort({
              field,
              order:
                files.sort.field === field && files.sort.order === "asc"
                  ? "desc"
                  : "asc",
            })
          }
          className="-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-foreground"
        >
          {label}
          {files.sort.field === field &&
            (files.sort.order === "asc" ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            ))}
        </button>
      ) : (
        label
      )}
    </th>
  )

  // Rows dragged onto a folder move there; files from the desktop upload
  // into it.
  const dropProps = (entry: FileEntry) =>
    write && isDir(entry)
      ? {
          onDragOver: (e: React.DragEvent) => {
            const internal = e.dataTransfer.types.includes(DRAG_TYPE)
            if (!internal && !hasFiles(e)) return
            if (internal && files.selected.has(entry.path)) return
            e.preventDefault()
            e.stopPropagation()
            e.dataTransfer.dropEffect = internal ? "move" : "copy"
            setDropOn(entry.path)
          },
          onDragLeave: () => setDropOn((p) => (p === entry.path ? null : p)),
          onDrop: async (e: React.DragEvent) => {
            const internal = e.dataTransfer.getData(DRAG_TYPE)
            if (!internal && !hasFiles(e)) return
            e.preventDefault()
            e.stopPropagation()
            setDropOn(null)
            if (internal) {
              const paths = (JSON.parse(internal) as string[]).filter(
                (p) => p !== entry.path && dirname(p) !== entry.path,
              )
              if (!paths.length) return
              ops.move.mutate(
                { paths, destination: entry.path },
                {
                  onSuccess: (job) => {
                    files.setSelected(new Set())
                    jobs.track(job)
                  },
                  onError: (err) =>
                    toast.error(
                      err.status === 409
                        ? `Something with the same name is already in ${entry.name}.`
                        : err.message,
                    ),
                },
              )
            } else {
              const picked = await readDrop(e.dataTransfer)
              if (picked.length) uploads.add(picked, entry.path)
            }
          },
        }
      : {}

  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={<div />}
        className="flex-1"
        onContextMenu={(e) => {
          const row = (e.target as HTMLElement).closest<HTMLElement>(
            "[data-path]",
          )
          const entry = row
            ? (entries.find((x) => x.path === row.dataset.path) ?? null)
            : null
          setTarget(entry)
          // Right-clicking outside the selection selects that row alone.
          if (entry && !files.selected.has(entry.path))
            files.setSelected(new Set([entry.path]))
          if (!entry) files.setSelected(new Set())
        }}
      >
        <table className="w-full text-body-sm">
          <thead className="sticky top-0 z-10 bg-subtle text-caption text-muted-foreground shadow-[inset_0_-1px_0_var(--color-border)]">
            <tr>
              <th scope="col" className="w-10 ps-5">
                <Checkbox
                  aria-label="Select all"
                  checked={all}
                  indeterminate={some && !all}
                  onCheckedChange={(on) =>
                    files.setSelected(
                      on ? new Set(entries.map((e) => e.path)) : new Set(),
                    )
                  }
                />
              </th>
              {header(location ? null : "name", "Name", "ps-1")}
              {location && header(null, "Folder", "hidden @2xl:table-cell")}
              {header(location ? null : "size", "Size", "w-24 text-end")}
              {header(
                location ? null : "modified",
                "Modified",
                "hidden w-40 @lg:table-cell",
              )}
              {source.posix &&
                header(null, "Permissions", "hidden w-32 @3xl:table-cell")}
              {source.posix &&
                header(null, "Owner", "hidden w-36 @4xl:table-cell")}
              <th scope="col" className="w-12">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry) => {
              const selected = files.selected.has(entry.path)
              const cut =
                files.clipboard?.mode === "cut" &&
                files.clipboard.entries.some((e) => e.path === entry.path)
              return (
                <tr
                  key={entry.path}
                  data-path={entry.path}
                  aria-selected={selected}
                  draggable={write && !entry.bucket}
                  onDragStart={(e) => {
                    const paths =
                      selected && files.selected.size > 1
                        ? [...files.selected]
                        : [entry.path]
                    if (!selected) files.setSelected(new Set([entry.path]))
                    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(paths))
                    e.dataTransfer.effectAllowed = "move"
                  }}
                  onClick={(e) => select(e, entry)}
                  onDoubleClick={() => files.open(entry)}
                  {...dropProps(entry)}
                  className={cn(
                    // scroll-m: arrow keys scroll rows into view clear of
                    // the sticky table header and the floating bar.
                    "group/row h-12 cursor-default scroll-mt-10 scroll-mb-16 select-none hover:bg-subtle aria-selected:bg-brand-soft/60",
                    cut && "opacity-50",
                    dropOn === entry.path &&
                      "bg-brand-soft outline-2 -outline-offset-2 outline-brand",
                  )}
                >
                  <td className="ps-5">
                    <Checkbox
                      aria-label={`Select ${entry.name}`}
                      checked={selected}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={(on) => toggle(entry, on)}
                    />
                  </td>
                  <td className="max-w-0 ps-1 pe-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <FileIcon entry={entry} className="size-5" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (e.metaKey || e.ctrlKey || e.shiftKey)
                            return select(e, entry)
                          files.open(entry)
                        }}
                        className="min-w-0 truncate text-start font-medium hover:text-brand hover:underline"
                      >
                        {entry.name}
                      </button>
                      {entry.bucket && <BucketTag />}
                      {entry.type === "symlink" && (
                        <span
                          title={entry.link_target}
                          className="shrink-0 truncate text-caption text-ash"
                        >
                          → {entry.link_target}
                        </span>
                      )}
                    </span>
                  </td>
                  {location && (
                    <td className="hidden max-w-0 px-3 @2xl:table-cell">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          files.setSearch(null)
                          files.go(dirname(entry.path))
                        }}
                        className="block max-w-full truncate font-mono text-caption text-muted-foreground hover:text-foreground"
                      >
                        {dirname(entry.path)}
                      </button>
                    </td>
                  )}
                  <td className="px-3 text-end whitespace-nowrap text-muted-foreground tabular-nums">
                    {isDir(entry) ? (
                      <FolderSize entry={entry} />
                    ) : (
                      formatSize(entry.size)
                    )}
                  </td>
                  <td
                    className="hidden px-3 whitespace-nowrap text-muted-foreground @lg:table-cell"
                    title={formatDate(entry.modified)}
                  >
                    {formatModified(entry.modified)}
                  </td>
                  {source.posix && (
                    <td className="hidden px-3 font-mono text-caption whitespace-nowrap text-muted-foreground @3xl:table-cell">
                      {entry.perm}
                    </td>
                  )}
                  {source.posix && (
                    <td className="hidden max-w-0 truncate px-3 text-muted-foreground @4xl:table-cell">
                      {entry.owner}
                      {entry.group !== entry.owner && (
                        <span className="text-ash">:{entry.group}</span>
                      )}
                    </td>
                  )}
                  <td className="pe-4">
                    <RowMenu entry={entry} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </ContextMenuTrigger>
      {target ? <EntryContextMenu entry={target} /> : <BackgroundMenu />}
    </ContextMenu>
  )
}

function MenuGroups({
  groups,
  Item,
  Separator,
  Shortcut,
}: {
  groups: MenuItem[][]
  Item: typeof DropdownMenuItem | typeof ContextMenuItem
  Separator: typeof DropdownMenuSeparator | typeof ContextMenuSeparator
  Shortcut: typeof DropdownMenuShortcut | typeof ContextMenuShortcut
}) {
  return groups
    .filter((g) => g.length)
    .map((group, i) => (
      <Fragment key={group[0].key}>
        {i > 0 && <Separator />}
        {group.map((item) => (
          <Item
            key={item.key}
            variant={item.destructive ? "destructive" : "default"}
            onClick={item.onSelect}
          >
            <item.icon />
            {item.label}
            {item.shortcut && <Shortcut>{item.shortcut}</Shortcut>}
          </Item>
        ))}
      </Fragment>
    ))
}

function RowMenu({ entry }: { entry: FileEntry }) {
  const menu = useEntryMenu()
  const [open, setOpen] = useState(false)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${entry.name} actions`}
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      {open && (
        <DropdownMenuContent align="end" className="min-w-56">
          <MenuGroups
            groups={menu(entry).groups}
            Item={DropdownMenuItem}
            Separator={DropdownMenuSeparator}
            Shortcut={DropdownMenuShortcut}
          />
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}

function EntryContextMenu({ entry }: { entry: FileEntry }) {
  const menu = useEntryMenu()
  return (
    <ContextMenuContent className="min-w-56">
      <MenuGroups
        groups={menu(entry).groups}
        Item={ContextMenuItem}
        Separator={ContextMenuSeparator}
        Shortcut={ContextMenuShortcut}
      />
    </ContextMenuContent>
  )
}

// Right-click on the empty part of the list.
function BackgroundMenu() {
  const files = useFiles()
  const actions = useFileActions()
  const uploads = useUploads()
  const dir = files.listing?.path ?? ""
  const write = !files.source.readOnly
  const { openTerminal } = files
  return (
    <ContextMenuContent className="min-w-56">
      {write && (
        <>
          <ContextMenuItem onClick={actions.newFolder}>
            {actions.bucketRoot ? <BucketIcon /> : <FolderPlus />}
            {actions.bucketRoot ? "New bucket" : "New folder"}
          </ContextMenuItem>
          <ContextMenuItem onClick={actions.newFile}>
            <FilePlus /> New text file
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => uploads.pickFiles(dir)}>
            <Upload /> Upload files…
          </ContextMenuItem>
          <ContextMenuItem onClick={() => uploads.pickFolder(dir)}>
            <FolderUp /> Upload folder…
          </ContextMenuItem>
          {actions.importFrom && (
            <ContextMenuItem onClick={actions.importFrom}>
              <HardDriveDownload /> Copy from a server or storage…
            </ContextMenuItem>
          )}
          {actions.fetchUrl && (
            <ContextMenuItem onClick={actions.fetchUrl}>
              <Link2 /> Download from a URL…
            </ContextMenuItem>
          )}
          {files.clipboard && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={files.paste}>
                <ClipboardPaste /> Paste {clipLabel(files.clipboard.entries)}
                <ContextMenuShortcut>{shortcut("V")}</ContextMenuShortcut>
              </ContextMenuItem>
            </>
          )}
          <ContextMenuSeparator />
        </>
      )}
      {openTerminal && (
        <ContextMenuItem onClick={() => openTerminal(dir)}>
          <SquareTerminal /> Open terminal here
        </ContextMenuItem>
      )}
      <ContextMenuItem onClick={() => files.setShowHidden(!files.showHidden)}>
        {files.showHidden ? <EyeOff /> : <Eye />}
        {files.showHidden ? "Hide hidden files" : "Show hidden files"}
      </ContextMenuItem>
      <ContextMenuItem onClick={files.refetch}>
        <RefreshCw /> Refresh
      </ContextMenuItem>
    </ContextMenuContent>
  )
}

const clipLabel = (entries: FileEntry[]) =>
  entries.length === 1 ? `“${entries[0].name}”` : `${entries.length} items`

function SearchResults() {
  const files = useFiles()
  const { results } = files
  const items = results.data?.items ?? []
  const where = files.listing?.path ?? files.path

  return (
    <>
      <div className="flex min-h-11 items-center gap-2 border-b border-border bg-subtle px-4 text-body-sm">
        <Search className="size-4 text-ash" />
        <p className="min-w-0 flex-1 truncate text-muted-foreground">
          {results.isPending ? (
            "Searching…"
          ) : (
            <>
              <span className="font-medium text-foreground">
                {items.length}
                {results.data?.truncated && "+"}{" "}
                {items.length === 1 ? "result" : "results"}
              </span>{" "}
              for “{files.search}” in <span className="font-mono">{where}</span>
              {results.data?.truncated && " · showing the first 200"}
            </>
          )}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            files.setSearch(null)
            files.setFilter("")
          }}
        >
          <X /> Close search
        </Button>
      </div>
      {results.isPending ? (
        <div className="flex min-h-64 items-center justify-center text-ash">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : results.error ? (
        <State title="The search failed" description={results.error.message}>
          <Button variant="outline" onClick={() => results.refetch()}>
            Try again
          </Button>
        </State>
      ) : items.length === 0 ? (
        <State
          title="Nothing found"
          description="No file or folder under here has that in its name."
        />
      ) : (
        <Table entries={items} location />
      )}
    </>
  )
}

function StatusBar() {
  const files = useFiles()
  if (!files.listing || files.search !== null) return null
  const sel = files.selectedEntries
  const size = sel.reduce((n, e) => n + (isDir(e) ? 0 : e.size), 0)
  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-t border-border bg-subtle px-5 text-caption text-ash">
      <span>
        {files.entries.length} {files.entries.length === 1 ? "item" : "items"}
        {files.hiddenCount > 0 &&
          !files.showHidden &&
          ` · ${files.hiddenCount} hidden`}
      </span>
      {sel.length > 0 && (
        <span className="text-muted-foreground">
          {sel.length} selected{size > 0 && ` · ${formatSize(size)}`}
        </span>
      )}
      {!files.source.readOnly && (
        <span className="ms-auto hidden @2xl:inline">
          Drop files to upload · Drag rows onto a folder to move them
        </span>
      )}
    </div>
  )
}

const barButton = "h-9 gap-1.5 px-2.5"

function BulkBar() {
  const files = useFiles()
  const actions = useFileActions()
  const sel = files.selectedEntries

  if (sel.length === 0 && files.clipboard && !files.source.readOnly) {
    const { clipboard } = files
    return (
      <div className="absolute inset-x-0 bottom-12 z-30 mx-auto flex w-fit items-center gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-md">
        <span className="px-2 text-body-sm text-muted-foreground">
          {clipboard.mode === "cut" ? "Moving" : "Copying"}{" "}
          <span className="font-medium text-foreground">
            {clipLabel(clipboard.entries)}
          </span>
        </span>
        <Button
          className={barButton}
          disabled={files.pasting}
          onClick={files.paste}
        >
          {files.pasting ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ClipboardPaste />
          )}
          Paste here
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Cancel"
          onClick={files.clearClipboard}
        >
          <X />
        </Button>
      </div>
    )
  }

  if (sel.length === 0) return null

  const { source } = files
  const write = !source.readOnly
  // Buckets can't be copied or moved, only emptied or deleted.
  const movable = write && !sel.some((e) => e.bucket)

  const item = (label: string, icon: ReactNode, onClick: () => void) => (
    <Button variant="ghost" className={barButton} onClick={onClick}>
      {icon}
      <span className="max-[1180px]:sr-only">{label}</span>
    </Button>
  )

  return (
    <div className="absolute inset-x-0 bottom-12 z-30 mx-auto flex w-fit items-center gap-0.5 rounded-2xl border border-border bg-card p-1.5 shadow-md">
      <span className="px-2 text-body-sm font-medium whitespace-nowrap">
        {sel.length} selected
      </span>
      {!source.listOnly &&
        item("Download", <Download />, () => actions.download(sel))}
      {movable && item("Copy", <Copy />, () => files.copy(sel))}
      {movable && item("Cut", <Scissors />, () => files.cut(sel))}
      {movable && item("Move to", <FolderInput />, () => actions.moveTo(sel))}
      {!source.listOnly &&
        actions.transfer &&
        item("Send to", <Send />, () => actions.transfer?.(sel))}
      {write &&
        source.compress &&
        item("Compress", <Archive />, () => actions.compress(sel))}
      {write &&
        source.chmod &&
        item("Permissions", <ShieldCheck />, () => actions.permissions(sel))}
      {write && (
        <Button
          variant="ghost"
          className={cn(barButton, "text-destructive hover:text-destructive")}
          onClick={() => actions.remove(sel)}
        >
          <Trash2 />
          <span className="max-[1180px]:sr-only">Delete</span>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Clear selection"
        onClick={() => files.setSelected(new Set())}
      >
        <X />
      </Button>
    </div>
  )
}

function State({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="flex min-h-64 flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div>
        <p className="font-medium">{title}</p>
        {description && (
          <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap justify-center gap-2">{children}</div>
      )}
    </div>
  )
}

function SkeletonTable() {
  return (
    <div className="min-h-64 divide-y divide-border">
      <div className="h-10 bg-subtle" />
      {Array.from({ length: 8 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <div key={i} className="flex h-12 items-center gap-3 px-4">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="ms-auto h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

// Typing in a field, or a dialog/menu on top: leave the keys alone.
function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  return (
    !!el &&
    (el.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))
  )
}

const layerOpen = () =>
  !!document.querySelector(
    '[role="dialog"]:not([hidden]), [role="alertdialog"], [role="menu"]',
  )

function useShortcuts() {
  const files = useFiles()
  const actions = useFileActions()

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (isTyping(e) || layerOpen() || (files.search === null && !files.listing))
      return
    const mod = e.metaKey || e.ctrlKey
    const sel = files.selectedEntries
    const list =
      files.search !== null ? (files.results.data?.items ?? []) : files.entries
    const key = e.key.toLowerCase()
    const write = !files.source.readOnly && !sel.some((x) => x.bucket)

    if (mod && key === "a") {
      e.preventDefault()
      files.setSelected(new Set(list.map((x) => x.path)))
    } else if (mod && key === "c" && sel.length && write) {
      if (window.getSelection()?.toString()) return
      files.copy(sel)
      toast(`Copied ${clipLabel(sel)}`, {
        description: "Paste it in any folder.",
      })
    } else if (mod && key === "x" && sel.length && write) {
      files.cut(sel)
      toast(`Cut ${clipLabel(sel)}`, {
        description: "Paste it in another folder to move it.",
      })
    } else if (
      mod &&
      key === "v" &&
      files.clipboard &&
      !files.source.readOnly
    ) {
      e.preventDefault()
      files.paste()
    } else if (e.key === "Delete" || (e.metaKey && e.key === "Backspace")) {
      if (sel.length && !files.source.readOnly) actions.remove(sel)
    } else if (e.key === "F2" && sel.length === 1 && write) {
      e.preventDefault()
      actions.rename(sel[0])
    } else if (e.key === "Enter" && sel.length === 1) {
      files.open(sel[0])
    } else if (e.altKey && e.key === "ArrowUp") {
      e.preventDefault()
      files.up()
    } else if (e.key === "Escape" && sel.length) {
      files.setSelected(new Set())
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !e.altKey) {
      if (!list.length) return
      e.preventDefault()
      const last = sel.at(-1)
      const i = last ? list.findIndex((x) => x.path === last.path) : -1
      const next =
        e.key === "ArrowDown"
          ? Math.min(list.length - 1, i + 1)
          : Math.max(0, i < 0 ? list.length - 1 : i - 1)
      files.setSelected(new Set([list[next].path]))
      document
        .querySelector(`[data-path="${CSS.escape(list[next].path)}"]`)
        ?.scrollIntoView({ block: "nearest" })
    }
  })

  useEffect(() => {
    const fn = (e: KeyboardEvent) => onKey(e)
    window.addEventListener("keydown", fn)
    return () => window.removeEventListener("keydown", fn)
  }, [])
}

function BucketTag() {
  return (
    <span className="shrink-0 rounded-full border border-border px-2 font-label text-caption tracking-label text-ash uppercase">
      Bucket
    </span>
  )
}
